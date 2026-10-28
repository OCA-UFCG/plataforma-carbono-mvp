import 'server-only'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { hasApprovedAccess, isAccessRequested } from '@/lib/access/claims'
import { isAccessGuardEnabled } from '@/lib/access/flag'
import { getFirebaseAdminAuth } from '@/lib/firebase-admin'

export const SESSION_COOKIE_NAME = 'session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24

function getSessionCookieFromHeader(cookieHeader: string | null) {
  if (!cookieHeader) return undefined

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1)
}

export type SessionCreation =
  | { status: 'created'; sessionCookie: string }
  | {
      status: 'unapproved'
      /** Who was refused, so the login route can try to settle a confirmed signup (lib/access/settlement.ts). */
      uid: string
      email: string | null
      emailVerified: boolean
    }

/**
 * Whether a decoded token or session cookie is barred from the platform. An account signup created
 * and nobody approved yet carries the signup marker and is barred whatever the switch says: beta
 * and production share the accounts, and with the switch off in one of them it would otherwise get
 * in there. With the gate on, any account without the access claim is barred too.
 */
function isBarred(decoded: DecodedIdToken) {
  return isAccessRequested(decoded) || (isAccessGuardEnabled() && !hasApprovedAccess(decoded))
}

/**
 * Opens a platform session, and this is where access is barred: an account carrying the signup
 * marker, or, with the gate on, any account without the access claim, gets no cookie, and without
 * a cookie there is no platform. The token is verified once; the claims and email_verified come
 * from the decoded token at no extra cost.
 */
export async function createSessionCookie(idToken: string): Promise<SessionCreation> {
  const auth = getFirebaseAdminAuth()
  const decoded = await auth.verifyIdToken(idToken)

  if (isBarred(decoded)) {
    return {
      status: 'unapproved',
      uid: decoded.uid,
      email: decoded.email?.trim().toLowerCase() || null,
      emailVerified: Boolean(decoded.email_verified),
    }
  }

  return { status: 'created', sessionCookie: await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_SECONDS * 1000 }) }
}

/**
 * A verified, unrevoked session, or null. A cookie carrying the signup marker counts as no
 * session whatever the switch says, and with the gate on so does a cookie without the claim: that
 * covers cookies minted before the gate was turned on, and every layout and API route inherits the
 * rule through here.
 */
export async function verifySessionCookie(sessionCookie: string | undefined): Promise<DecodedIdToken | null> {
  if (!sessionCookie) return null

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true)
    if (isBarred(decoded)) return null
    return decoded
  } catch {
    return null
  }
}

export async function getAuthenticatedSession() {
  const cookieStore = await cookies()
  return verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}

export async function getAuthenticatedRequest(req: Request) {
  return verifySessionCookie(getSessionCookieFromHeader(req.headers.get('cookie')))
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  )
}

/**
 * Post-login destination, restricted to the platform's private routes. The
 * login exists only to reach them, so anything else, a missing value
 * included, lands on the map.
 *
 * An allowlist rather than a "starts with /" check: `//evil.com` is a
 * protocol-relative URL that a naive prefix test lets through. Each entry is
 * matched exactly, or with the separator that has to follow it, so
 * `/relatoriofalso` does not pass as `/relatorio`.
 */
export function safeRedirect(value: string | string[] | undefined): string {
  if (typeof value !== 'string') return '/mapa'
  for (const base of ['/mapa', '/relatorio', '/aprovacoes']) {
    if (value === base || value.startsWith(`${base}/`) || value.startsWith(`${base}?`)) {
      return value
    }
  }
  return '/mapa'
}

/**
 * The login URL for a visitor without a session on `path`, so that logging in
 * returns them to the page they asked for. The destination goes through
 * safeRedirect here, not only on the login page, so a forged path is never
 * even written into the URL.
 */
export function loginRedirect(path: string | null): string {
  return `/login?redirect=${encodeURIComponent(safeRedirect(path ?? undefined))}`
}
