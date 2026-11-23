/**
 * POST /api/signup/invite — an admin invites partners by email (docs/signup.md, "Invites"). Like
 * the approve route, it checks the session, the origin and the admin list itself: the form showing
 * on /aprovacoes authorizes nothing.
 */

import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { isAccessAdmin } from '@/lib/access/admins'
import { normalizeEmail } from '@/lib/access/emailAddress'
import { jsonNoStore, readJsonObject, rejectWhenSignupClosed } from '@/lib/access/http'
import { MAX_INVITES, type InviteResult } from '@/lib/access/inviteList'
import { inviteAddress } from '@/lib/access/invites'
import { hasTrustedOrigin } from '@/lib/access/trustedOrigin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The addresses sent, normalized and without repeats; null when `emails` is not a list. */
function readAddresses(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  return [...new Set(value.map(normalizeEmail).filter(Boolean))]
}

export async function POST(req: Request) {
  // An invite leads to the confirmation routes, which answer 404 while signup is closed.
  const closed = rejectWhenSignupClosed()
  if (closed) return closed

  const session = await getAuthenticatedRequest(req)
  if (!session) return unauthorizedResponse()
  if (!hasTrustedOrigin(req)) return jsonNoStore({ error: 'Origem da requisição não autorizada.' }, 403)
  if (!isAccessAdmin(session.email)) return jsonNoStore({ error: 'Acesso negado.' }, 403)

  const addresses = readAddresses((await readJsonObject(req)).emails)
  if (!addresses?.length) return jsonNoStore({ error: 'Informe ao menos um e-mail.' }, 400)
  if (addresses.length > MAX_INVITES) {
    return jsonNoStore({ error: `Envie no máximo ${MAX_INVITES} e-mails por vez.` }, 400)
  }

  // One after another: concurrent sends would open as many SMTP logins at once, and one address
  // failing never stops the others.
  const invitedBy = normalizeEmail(session.email)
  const results: InviteResult[] = []
  for (const email of addresses) results.push({ email, outcome: await inviteAddress(email, invitedBy) })

  return jsonNoStore({ results })
}
