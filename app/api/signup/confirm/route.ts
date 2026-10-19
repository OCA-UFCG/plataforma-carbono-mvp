/**
 * POST /api/signup/confirm — the person chose a password on the confirmation page. Only the holder
 * of a valid verification code, that is, whoever reads the mailbox, gets to set it (spec §15).
 */

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { hasApprovedAccess } from '@/lib/access/claims'
import { applyVerificationCode, checkActionCode } from '@/lib/access/firebaseCodes'
import { codeFailure, jsonNoStore, readJsonObject, rejectUntrustedOrLimited, rejectWhenSignupClosed } from '@/lib/access/http'
import { isAcceptablePassword } from '@/lib/access/passwordRules'
import { settleSignup } from '@/lib/access/settlement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The Admin SDK's refusals of a password: too short for Firebase, or against the password policy. */
function isWeakPasswordError(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code
  return code === 'auth/invalid-password' || code === 'auth/password-does-not-meet-requirements'
}

export async function POST(req: Request) {
  const refused = rejectWhenSignupClosed() ?? rejectUntrustedOrLimited(req, 'confirm')
  if (refused) return refused

  const { code, password } = await readJsonObject(req)
  if (!isAcceptablePassword(password)) return codeFailure('weak-password', 400)
  if (typeof code !== 'string' || !code) return codeFailure('invalid-code', 410)

  // The email comes from the code, never from the request.
  const email = await checkActionCode(code, 'VERIFY_EMAIL')
  if (!email) return codeFailure('invalid-code', 410)

  const auth = getFirebaseAdminAuth()
  try {
    const { uid, emailVerified: alreadyConfirmed, customClaims } = await auth.getUserByEmail(email)

    // A code only ever sets the first password. A confirmed account already chose one, and an
    // account holding access has its own even with an unconfirmed address (the legacy accounts): a
    // still-valid code must not replace it. Changing a password is what "Esqueci minha senha" is for.
    if (alreadyConfirmed || hasApprovedAccess(customClaims)) return codeFailure('invalid-code', 410)

    // The password before the code: applying first and then failing here would leave a confirmed
    // account with no password and a spent code. The other way round, a failure leaves a password
    // set by the mailbox owner, whose login answers email_unconfirmed and offers resend.
    await auth.updateUser(uid, { password })
    if (!(await applyVerificationCode(code))) return codeFailure('invalid-code', 410)

    const { emailVerified } = await auth.getUser(uid)
    const status = await settleSignup({ uid, email, emailVerified })
    return status === 'unconfirmed' ? codeFailure('failed', 502) : jsonNoStore({ status })
  } catch (error) {
    if (isWeakPasswordError(error)) return codeFailure('weak-password', 400)
    console.error('[/api/signup/confirm] could not confirm the signup:', error instanceof Error ? error.message : 'unknown error')
    return codeFailure('failed', 502)
  }
}
