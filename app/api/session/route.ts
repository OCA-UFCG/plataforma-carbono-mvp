import { NextResponse } from 'next/server'
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth'
import { settleSignup } from '@/lib/access/settlement'
import type { AccessCode } from '@/lib/access/sessionCodes'

export const runtime = 'nodejs'

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

/** A correct password without a session. The client tells these apart from a wrong password. */
function refused(code: AccessCode) {
  return NextResponse.json({ error: 'Access not granted', code }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * One more chance before refusing a confirmed account: a confirmation that failed midway never
 * settled, and the domain track would otherwise never grant access. A failure here is logged and
 * the person waits, rather than seeing a login error.
 */
async function settleOnLogin(uid: string, email: string) {
  try {
    return await settleSignup({ uid, email, emailVerified: true })
  } catch (error) {
    console.error('[/api/session] could not settle the signup:', error)
    return 'pending' as const
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body.idToken !== 'string') {
    return NextResponse.json({ error: 'idToken is required' }, { status: 400 })
  }

  try {
    const creation = await createSessionCookie(body.idToken)

    if (creation.status === 'unapproved') {
      if (!creation.emailVerified || !creation.email) return refused('email_unconfirmed')
      // Access granted now is not in this ID token, which predates it: the client signs in again.
      const settlement = await settleOnLogin(creation.uid, creation.email)
      return refused(settlement === 'approved' ? 'access_granted' : 'access_pending')
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(SESSION_COOKIE_NAME, creation.sessionCookie, {
      ...cookieOptions,
      maxAge: SESSION_MAX_AGE_SECONDS,
    })
    return response
  } catch (error) {
    console.error('[/api/session] unable to create session:', error)
    return NextResponse.json({ error: 'Unable to create session' }, { status: 401 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 })
  return response
}
