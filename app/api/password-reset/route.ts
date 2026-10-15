/**
 * POST /api/password-reset — "Esqueci minha senha". Independent of the access switch: changing a
 * password creates no account, and accounts made by hand forget passwords too. The answer is the
 * same for every address; this is the most obvious door for learning who has an account.
 */

import { after } from 'next/server'
import { isWellFormedEmail, normalizeEmail } from '@/lib/access/emailAddress'
import { jsonNoStore, readJsonObject, rejectUntrustedOrLimited } from '@/lib/access/http'
import { sendPasswordResetEmail } from '@/lib/access/passwordReset'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = rejectUntrustedOrLimited(req, 'resetRequest')
  if (refused) return refused

  const email = normalizeEmail((await readJsonObject(req)).email)
  // After the response, so the time taken does not tell an existing account from a missing one.
  if (isWellFormedEmail(email)) after(() => sendPasswordResetEmail(email))

  return jsonNoStore({ status: 'accepted' }, 202)
}
