import 'server-only'

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { sendMail } from '@/lib/mailer'
import { approveAccess, hasApprovedAccess } from '@/lib/access/claims'
import { resolveSignupTier } from '@/lib/access/domains'
import { buildNewRequestEmail } from '@/lib/access/emails'
import { claimTeamNotification, createAccessRequest, readAccessRequest, recordAccessDecision } from '@/lib/access/requests'
import { approvalsUrl } from '@/lib/access/urls'

export type SignupSettlement = 'approved' | 'pending' | 'rejected' | 'unconfirmed'

/**
 * Closes a signup whose address is confirmed. Two paths need it: the confirmation route, right
 * after the password is chosen, and the login route, for a confirmation that failed midway.
 * Nothing here trusts the browser: callers read emailVerified from Firebase, and the tier comes
 * from the stored request or, failing that, from the email.
 */
export async function settleSignup({ uid, email, emailVerified }: {
  uid: string
  email: string
  emailVerified: boolean
}): Promise<SignupSettlement> {
  if (!emailVerified) return 'unconfirmed'

  // An account that already holds access (a legacy one, say, whose owner confirmed the address
  // through a resent link) needs no request, and opening one would email the team about it.
  const { customClaims } = await getFirebaseAdminAuth().getUser(uid)
  if (hasApprovedAccess(customClaims)) return 'approved'

  let request = await readAccessRequest(uid)

  // A confirmed account with no request is the dead end of a signup that failed midway: the person
  // can neither sign up again (the email exists) nor move on. Open the request now; the intention
  // was lost, and the common track still goes through an admin, who can ask.
  if (!request) {
    console.warn(`[access] no access request for confirmed account ${uid}; opening one now.`)
    await createAccessRequest(uid, { email, tier: resolveSignupTier(email), intention: '' })
    request = await readAccessRequest(uid)
    if (!request) return 'unconfirmed'
  }

  // Approved but without the claim (step above returned otherwise): a grant that failed after the
  // decision was recorded. Grant it again, so the next login heals it.
  if (request.status === 'approved') {
    await approveAccess(uid, request.tier)
    return 'approved'
  }
  if (request.status === 'rejected') return 'rejected'

  if (request.tier === 'allowed') {
    await approveAccess(uid, 'allowed')
    // The domain rule decided, not an admin, and the record says so.
    await recordAccessDecision(uid, { status: 'approved', decidedBy: null })
    return 'approved'
  }

  await notifyTeam(uid, request.email, request.intention)
  return 'pending'
}

/**
 * Emails the team, once. The claim comes before the send and stays even if sending fails: the
 * request still shows on the approvals page, and repeating the email on every attempt would be
 * worse than losing it once.
 */
async function notifyTeam(uid: string, email: string, intention: string) {
  const to = process.env.OCA_NOTIFICATION_EMAIL
  if (!to) {
    console.error('[access] OCA_NOTIFICATION_EMAIL is not set: access request recorded without an email to the team.')
    return
  }
  if (!(await claimTeamNotification(uid))) return

  try {
    await sendMail({ ...buildNewRequestEmail({ email, intention, approvalUrl: approvalsUrl() }), to })
  } catch (error) {
    console.error('[access] could not email the team about an access request:', error instanceof Error ? error.message : 'unknown error')
  }
}
