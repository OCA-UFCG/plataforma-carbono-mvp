import 'server-only'

import type { UserRecord } from 'firebase-admin/auth'
import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { sendMail } from '@/lib/mailer'
import { ACCESS_CLAIM_NAMESPACE, approveAccess, buildRequestedClaims, hasApprovedAccess } from '@/lib/access/claims'
import { isWellFormedEmail, normalizeEmail } from '@/lib/access/emailAddress'
import { buildDecisionEmail } from '@/lib/access/emails'
import type { InviteOutcome } from '@/lib/access/inviteList'
import { createAccessRequest, recordInviteApproval, recordPendingInvite } from '@/lib/access/requests'
import { loginUrl } from '@/lib/access/urls'
import { sendInviteEmail } from '@/lib/access/verification'

/**
 * An admin's invite to one address (docs/superpowers/specs/2026-11-16-partner-invites-design.md,
 * §5.1). Access is granted only to an address someone proved to own: a new or unconfirmed account
 * gets the confirmation link, and the confirmation grants it (lib/access/settlement.ts); only an
 * account Firebase already marks confirmed is approved on the spot.
 *
 * Unlike the public signup routes, the outcome tells the truth about the account: the caller is
 * an admin.
 */
export async function inviteAddress(rawEmail: string, invitedBy: string): Promise<InviteOutcome> {
  const email = normalizeEmail(rawEmail)
  if (!isWellFormedEmail(email)) return 'invalid'

  try {
    const user = await findAccount(email)
    if (!user) return await inviteNewAccount(email, invitedBy)

    // A disabled account holding the claim was revoked by hand (docs/signup.md, "Open points"):
    // re-enabling it would restore access behind whoever revoked it.
    if (hasApprovedAccess(user.customClaims)) return user.disabled ? 'disabled' : 'already-active'

    // Without the claim, the only path in the app that disables an account is a rejection, and
    // inviting is a new decision that overrides it.
    if (user.disabled) await getFirebaseAdminAuth().updateUser(user.uid, { disabled: false })

    return user.emailVerified
      ? await approveConfirmedAccount(user, email, invitedBy)
      : await inviteUnconfirmedAccount(user, email, invitedBy)
  } catch (error) {
    console.error('[access] could not invite an address:', error instanceof Error ? error.message : 'unknown error')
    return 'failed'
  }
}

async function findAccount(email: string): Promise<UserRecord | null> {
  try {
    return await getFirebaseAdminAuth().getUserByEmail(email)
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code === 'auth/user-not-found') return null
    throw error
  }
}

const sentOrUnsent = (delivered: boolean): InviteOutcome => (delivered ? 'invited' : 'unsent')

/** Case a: the account signup would create, opened as an invite. */
async function inviteNewAccount(email: string, invitedBy: string): Promise<InviteOutcome> {
  const auth = getFirebaseAdminAuth()
  // No password: whoever reads the mailbox chooses it on the confirmation page.
  const { uid } = await auth.createUser({ email, emailVerified: false })
  try {
    await auth.setCustomUserClaims(uid, buildRequestedClaims())
    await createAccessRequest(uid, { email, tier: 'invited', intention: '', invitedBy })
  } catch (error) {
    // An orphan would make every later invite of this address take the unconfirmed path without a
    // request to read; removing it leaves the address as it was.
    await auth.deleteUser(uid).catch((undoError: unknown) => {
      console.error('[access] could not delete the orphan invited account; remove it by hand:', undoError)
    })
    throw error
  }
  return sentOrUnsent(await sendInviteEmail(email))
}

/**
 * Case e: a signup never confirmed, an invite not yet accepted, a rejection of an address nobody
 * confirmed, an account created by hand. Inviting again is how an invite is resent.
 */
async function inviteUnconfirmedAccount(user: UserRecord, email: string, invitedBy: string): Promise<InviteOutcome> {
  // An account made by hand in the console carries no claim of ours; the marker keeps it out of an
  // environment with the switch off until the confirmation grants access, as signup's accounts are.
  if (user.customClaims?.[ACCESS_CLAIM_NAMESPACE] === undefined) {
    await getFirebaseAdminAuth().setCustomUserClaims(user.uid, { ...user.customClaims, ...buildRequestedClaims() })
  }
  await recordPendingInvite(user.uid, { email, invitedBy })
  return sentOrUnsent(await sendInviteEmail(email))
}

/**
 * Case d: the address is confirmed, so the invite approves it now. As in the approve route, the
 * decision is recorded before access is granted: a failure in between leaves a decided request
 * that settlement grants again on the next login, never access without a record.
 */
async function approveConfirmedAccount(user: UserRecord, email: string, invitedBy: string): Promise<InviteOutcome> {
  const approval = await recordInviteApproval(user.uid, { email, invitedBy })
  await approveAccess(user.uid, approval.tier)
  if (!approval.decided) return 'approved'

  try {
    await sendMail({ ...buildDecisionEmail({ status: 'approved', loginUrl: loginUrl() }), to: email })
  } catch (error) {
    // Access is granted; failing here would make the admin invite again for nothing.
    console.error('[access] invite approved an account, but the email failed:', error instanceof Error ? error.message : 'unknown error')
  }
  return 'approved'
}
