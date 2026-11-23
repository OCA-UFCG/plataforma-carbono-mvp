import 'server-only'

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { sendMail } from '@/lib/mailer'
import { buildInviteEmail, buildVerificationEmail, type EmailDraft } from '@/lib/access/emails'
import { extractOobCode } from '@/lib/access/firebaseCodes'
import { signupConfirmationUrl } from '@/lib/access/urls'

/**
 * An error's message with the one-time code cut out. Mail libraries sometimes echo the content
 * they failed to send, and the code is a credential. The code is removed rather than the whole
 * link, because the HTML body writes the link with &amp; and a search for the raw link would miss
 * it.
 */
export function describeWithoutLink(error: unknown, code: string | null): string {
  const message = error instanceof Error ? error.message : 'unknown error'
  return code ? message.split(code).join('[code omitted]') : message
}

/**
 * Sends a message carrying a fresh confirmation link and says honestly whether it went out. A
 * failure is returned, not thrown: by the time a caller gets here the request is recorded, and
 * sending again (resend, or inviting again) exists for exactly this case.
 */
async function sendConfirmationLink(email: string, build: (input: { link: string }) => EmailDraft): Promise<boolean> {
  let code: string | null = null
  try {
    // Only the code leaves Firebase's link, toward our own page; without actionCodeSettings Firebase
    // does not require our domain among its authorized domains either.
    code = extractOobCode(await getFirebaseAdminAuth().generateEmailVerificationLink(email))
    if (!code) throw new Error('Firebase returned a link without a code.')

    const { delivered } = await sendMail({ ...build({ link: signupConfirmationUrl(code, email) }), to: email })
    if (!delivered) console.error('[access] confirmation email not delivered: the mailer is not configured.')
    return delivered
  } catch (error) {
    console.error('[access] could not send the confirmation email:', describeWithoutLink(error, code))
    return false
  }
}

/** The signup's "confirm your address" email. */
export function sendVerificationEmail(email: string): Promise<boolean> {
  return sendConfirmationLink(email, buildVerificationEmail)
}

/**
 * An admin's invite: the same link as the signup's, so accepting goes through the confirmation
 * page, where whoever reads the mailbox chooses the password.
 */
export function sendInviteEmail(email: string): Promise<boolean> {
  return sendConfirmationLink(email, buildInviteEmail)
}
