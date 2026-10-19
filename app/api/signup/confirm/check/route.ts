/**
 * POST /api/signup/confirm/check — whether a confirmation link's code is still valid, and for which
 * address. It spends nothing, so a mail scanner opening the link burns no code and settles nothing.
 */

import { checkActionCode } from '@/lib/access/firebaseCodes'
import { codeFailure, jsonNoStore, readJsonObject, rejectUntrustedOrLimited, rejectWhenSignupClosed } from '@/lib/access/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = rejectWhenSignupClosed() ?? rejectUntrustedOrLimited(req, 'confirm')
  if (refused) return refused

  const { code } = await readJsonObject(req)
  const email = typeof code === 'string' && code ? await checkActionCode(code, 'VERIFY_EMAIL') : null

  return email ? jsonNoStore({ email }) : codeFailure('invalid-code', 410)
}
