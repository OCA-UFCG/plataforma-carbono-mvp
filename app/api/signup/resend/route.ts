/**
 * POST /api/signup/resend — a new confirmation email. It has to exist: links expire, sending can
 * fail and mail lands in spam. The answer is the same for every address.
 */

import { after } from 'next/server'
import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { hasApprovedAccess } from '@/lib/access/claims'
import { isWellFormedEmail, normalizeEmail } from '@/lib/access/emailAddress'
import { jsonNoStore, readJsonObject, rejectUntrustedOrLimited, rejectWhenSignupClosed } from '@/lib/access/http'
import { sendVerificationEmail } from '@/lib/access/verification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Only an unconfirmed, enabled account without access gets a link. A legacy account already has a
 * password and access, and a confirmation link would let whoever reads its mailbox replace the
 * password on the confirmation page: that is the reset flow's job. A disabled account was rejected.
 */
async function needsConfirmation(email: string): Promise<boolean> {
  try {
    const user = await getFirebaseAdminAuth().getUserByEmail(email)
    return !user.emailVerified && !user.disabled && !hasApprovedAccess(user.customClaims)
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const refused = rejectWhenSignupClosed() ?? rejectUntrustedOrLimited(req, 'resend')
  if (refused) return refused

  const email = normalizeEmail((await readJsonObject(req)).email)
  if (isWellFormedEmail(email)) {
    // After the response: the lookup and the mail take time only when the account exists, and
    // waiting for them would let the clock tell what the body hides.
    after(async () => {
      if (await needsConfirmation(email)) await sendVerificationEmail(email)
    })
  }

  return jsonNoStore({ status: 'accepted' }, 202)
}
