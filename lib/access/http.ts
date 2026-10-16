import { NextResponse } from 'next/server'
import { isSignupOpen } from '@/lib/access/flag'
import { accessClientKey, accessRateLimits, type AccessAction } from '@/lib/access/rateLimits'
import { hasTrustedOrigin } from '@/lib/access/trustedOrigin'

export const NO_STORE = { 'Cache-Control': 'no-store' } as const

export function jsonNoStore(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } })
}

/** The request body as an object; broken JSON or anything but an object becomes {}. */
export async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await req.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/**
 * The signup routes answer 404 while signup is closed (lib/access/flag.ts). Hiding the link on the
 * login card is not enough: the route would keep creating accounts for whoever called it.
 *
 *   const refused = rejectWhenSignupClosed() ?? rejectUntrustedOrLimited(req, 'signup')
 *   if (refused) return refused
 */
export function rejectWhenSignupClosed(): NextResponse | null {
  return isSignupOpen() ? null : jsonNoStore({ error: 'Not found.' }, 404)
}

/**
 * The common door of the public access routes: a trusted origin, then the action's rate limit.
 * Returns the refusal, or null to go on.
 */
export function rejectUntrustedOrLimited(req: Request, action: AccessAction): NextResponse | null {
  if (!hasTrustedOrigin(req)) {
    return jsonNoStore({ error: 'Origem da requisição não autorizada.' }, 403)
  }

  const limit = accessRateLimits[action].consume(accessClientKey(req))
  if (!limit.ok) {
    return jsonNoStore(
      { error: 'Muitas tentativas. Tente novamente em instantes.' },
      429,
      { 'Retry-After': String(limit.retryAfter) },
    )
  }

  return null
}

/** Why a one-time code request failed, named in the body so the page picks its own copy. */
export type CodeFailure = 'invalid-code' | 'weak-password' | 'failed'

export function codeFailure(reason: CodeFailure, status: number) {
  return jsonNoStore({ reason }, status)
}
