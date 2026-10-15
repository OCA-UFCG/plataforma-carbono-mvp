/**
 * POST /api/password-reset/confirm — changes the password with the link's code. Firebase already
 * invalidates sessions when the password changes; the explicit revocation is there so this does
 * not depend on that detail in the one case where the old password may be in someone else's hands.
 */

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { resetPasswordWithCode } from '@/lib/access/firebaseCodes'
import { codeFailure, jsonNoStore, readJsonObject, rejectUntrustedOrLimited } from '@/lib/access/http'
import { isAcceptablePassword } from '@/lib/access/passwordRules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = rejectUntrustedOrLimited(req, 'resetCode')
  if (refused) return refused

  const { code, password } = await readJsonObject(req)
  if (!isAcceptablePassword(password)) return codeFailure('weak-password', 400)
  if (typeof code !== 'string' || !code) return codeFailure('invalid-code', 410)

  const result = await resetPasswordWithCode(code, password)
  if (result.status === 'invalid-code') return codeFailure('invalid-code', 410)
  if (result.status === 'weak-password') return codeFailure('weak-password', 400)
  if (result.status === 'failed') return codeFailure('failed', 502)

  try {
    const auth = getFirebaseAdminAuth()
    await auth.revokeRefreshTokens((await auth.getUserByEmail(result.email)).uid)
  } catch {
    // The password changed and Firebase invalidated the tokens on its own: this must not turn into
    // "could not change the password".
    console.error('[/api/password-reset/confirm] password changed, but the explicit session revocation failed.')
  }

  return jsonNoStore({ status: 'changed' })
}
