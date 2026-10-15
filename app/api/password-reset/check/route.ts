/** POST /api/password-reset/check — whether a reset link's code is still valid, without spending it. */

import { checkActionCode } from '@/lib/access/firebaseCodes'
import { codeFailure, jsonNoStore, readJsonObject, rejectUntrustedOrLimited } from '@/lib/access/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = rejectUntrustedOrLimited(req, 'resetCode')
  if (refused) return refused

  const { code } = await readJsonObject(req)
  const email = typeof code === 'string' && code ? await checkActionCode(code, 'PASSWORD_RESET') : null

  return email ? jsonNoStore({ email }) : codeFailure('invalid-code', 410)
}
