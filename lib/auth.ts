import 'server-only'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { DecodedIdToken } from 'firebase-admin/auth'
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

export async function createSessionCookie(idToken: string) {
  const auth = getFirebaseAdminAuth()
  await auth.verifyIdToken(idToken)
  return auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_SECONDS * 1000 })
}

export async function verifySessionCookie(sessionCookie: string | undefined): Promise<DecodedIdToken | null> {
  if (!sessionCookie) return null

  try {
    return await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true)
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
