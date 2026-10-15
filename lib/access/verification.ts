import 'server-only'

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { sendMail } from '@/lib/mailer'
import { buildVerificationEmail } from '@/lib/access/emails'
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
 * Sends the confirmation email and says honestly whether it went out. A failure is returned, not
 * thrown: by the time signup calls this the request is recorded, and the resend button exists for
 * exactly this case.
 */
export async function sendVerificationEmail(email: string): Promise<boolean> {
  let code: string | null = null
  try {
    // Only the code leaves Firebase's link, toward our own page; without actionCodeSettings Firebase
    // does not require our domain among its authorized domains either.
    code = extractOobCode(await getFirebaseAdminAuth().generateEmailVerificationLink(email))
    if (!code) throw new Error('Firebase returned a link without a code.')

    const { delivered } = await sendMail({
      ...buildVerificationEmail({ link: signupConfirmationUrl(code, email) }),
      to: email,
    })
    if (!delivered) console.error('[access] confirmation email not delivered: the mailer is not configured.')
    return delivered
  } catch (error) {
    console.error('[access] could not send the confirmation email:', describeWithoutLink(error, code))
    return false
  }
}
