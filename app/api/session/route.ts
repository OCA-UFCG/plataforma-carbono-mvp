import { NextResponse } from 'next/server'
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth'

export const runtime = 'nodejs'

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body.idToken !== 'string') {
    return NextResponse.json({ error: 'idToken is required' }, { status: 400 })
  }

  try {
    const sessionCookie = await createSessionCookie(body.idToken)
    const response = NextResponse.json({ ok: true })
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
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
