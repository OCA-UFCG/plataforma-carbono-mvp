import 'server-only'

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { sendMail } from '@/lib/mailer'
import { buildPasswordResetEmail } from '@/lib/access/emails'
import { extractOobCode } from '@/lib/access/firebaseCodes'
import { passwordResetUrl } from '@/lib/access/urls'
import { describeWithoutLink } from '@/lib/access/verification'

/** How Firebase answers when no account has the address. */
function isUnknownAccount(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code
  return code === 'auth/user-not-found' || code === 'auth/email-not-found'
}

/**
 * Sends the reset link and says whether it went out. An address without an account is not an
 * error: the route answers the same either way, and logging every attempt would only fill the log
 * with whatever a stranger typed.
 */
export async function sendPasswordResetEmail(email: string): Promise<boolean> {
  let code: string | null = null
  try {
    const auth = getFirebaseAdminAuth()
    // Look the account up first: with email enumeration protection on, generating a link for an
    // unknown address fails as a generic auth/internal-error, indistinguishable from a real failure.
    await auth.getUserByEmail(email)

    code = extractOobCode(await auth.generatePasswordResetLink(email))
    if (!code) throw new Error('Firebase returned a link without a code.')

    const { delivered } = await sendMail({ ...buildPasswordResetEmail({ link: passwordResetUrl(code) }), to: email })
    if (!delivered) console.error('[access] password reset email not delivered: the mailer is not configured.')
    return delivered
  } catch (error) {
    if (isUnknownAccount(error)) return false
    console.error('[access] could not send the password reset email:', describeWithoutLink(error, code))
    return false
  }
}
