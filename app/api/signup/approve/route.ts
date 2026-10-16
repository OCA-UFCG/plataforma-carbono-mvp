/**
 * POST /api/signup/approve — an admin's decision on an access request. The approvals page showing
 * something never authorizes it: this route checks the session, the origin and the admin list
 * itself, and that is where the decider's identity comes from.
 */

import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { sendMail } from '@/lib/mailer'
import { isAccessAdmin } from '@/lib/access/admins'
import { approveAccess } from '@/lib/access/claims'
import { normalizeEmail } from '@/lib/access/emailAddress'
import { buildDecisionEmail } from '@/lib/access/emails'
import { jsonNoStore, readJsonObject } from '@/lib/access/http'
import { claimPendingDecision, readAccessRequest, type AccessDecisionStatus } from '@/lib/access/requests'
import { hasTrustedOrigin } from '@/lib/access/trustedOrigin'
import { loginUrl } from '@/lib/access/urls'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isDecision(value: unknown): value is AccessDecisionStatus {
  return value === 'approved' || value === 'rejected'
}

async function hasConfirmedEmail(uid: string) {
  try {
    return (await getFirebaseAdminAuth().getUser(uid)).emailVerified
  } catch {
    return false
  }
}

/**
 * Closes the loop with the applicant. The rejection email is off by default: the team has not
 * decided to send it, and sending it by mistake is worse than not sending it.
 */
async function notifyApplicant(email: string, decision: AccessDecisionStatus) {
  if (decision === 'rejected' && process.env.SIGNUP_SEND_REJECTION_EMAIL !== 'true') return
  try {
    await sendMail({ ...buildDecisionEmail({ status: decision, loginUrl: loginUrl() }), to: email })
  } catch (error) {
    // The decision is recorded; failing the request would make the admin decide it again.
    console.error('[/api/signup/approve] could not email the decision:', error instanceof Error ? error.message : 'unknown error')
  }
}

export async function POST(req: Request) {
  const session = await getAuthenticatedRequest(req)
  if (!session) return unauthorizedResponse()
  if (!hasTrustedOrigin(req)) return jsonNoStore({ error: 'Origem da requisição não autorizada.' }, 403)
  if (!isAccessAdmin(session.email)) return jsonNoStore({ error: 'Acesso negado.' }, 403)

  const body = await readJsonObject(req)
  const uid = typeof body.uid === 'string' ? body.uid.trim() : ''
  const decision = body.decision
  if (!uid || !isDecision(decision)) {
    return jsonNoStore({ error: 'Informe o usuário e uma decisão válida.' }, 400)
  }

  const request = await readAccessRequest(uid)
  if (!request) return jsonNoStore({ error: 'Pedido de acesso não encontrado.' }, 404)

  // The page lists only confirmed emails, but the route does not trust the page: approving an
  // unconfirmed address would grant access to an address nobody proved to own. Rejecting stays
  // allowed, since closing a suspicious request does not depend on it.
  if (decision === 'approved' && !(await hasConfirmedEmail(uid))) {
    return jsonNoStore({ error: 'Esta pessoa ainda não confirmou o e-mail.' }, 409)
  }

  // The decision is recorded before access is granted: a failure in between leaves a decided
  // request without access (settlement grants it again on the next login) rather than access
  // without a record.
  const claim = await claimPendingDecision(uid, { status: decision, decidedBy: normalizeEmail(session.email) })
  if (!claim.claimed) {
    return jsonNoStore({ error: 'Este pedido já foi decidido.', status: claim.status }, 409)
  }

  if (decision === 'approved') {
    try {
      // The tier the transaction read from the request, never one from the page.
      await approveAccess(uid, claim.tier)
    } catch (error) {
      console.error(`[/api/signup/approve] decision recorded but access not granted for ${uid}:`, error instanceof Error ? error.message : 'unknown error')
      return jsonNoStore({ error: 'A decisão foi registrada, mas o acesso não foi liberado. Avise a equipe técnica.' }, 500)
    }
  } else {
    // Without this a rejected account keeps trying to sign in, and its address stays taken. Reversible
    // from the Firebase console.
    await getFirebaseAdminAuth().updateUser(uid, { disabled: true }).catch((error: unknown) => {
      console.error('[/api/signup/approve] request rejected, but the account is still enabled:', error instanceof Error ? error.message : 'unknown error')
    })
  }

  await notifyApplicant(request.email, decision)
  return jsonNoStore({ status: decision })
}
