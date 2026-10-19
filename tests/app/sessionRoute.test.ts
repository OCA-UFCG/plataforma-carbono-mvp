import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createSessionCookie: vi.fn(), settleSignup: vi.fn() }))

vi.mock('@/lib/auth', () => ({
  createSessionCookie: mocks.createSessionCookie,
  SESSION_COOKIE_NAME: 'session',
  SESSION_MAX_AGE_SECONDS: 86400,
}))
vi.mock('@/lib/access/settlement', () => ({ settleSignup: mocks.settleSignup }))

import { POST } from '@/app/api/session/route'

const login = (body: unknown) => new Request('http://localhost/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
const unapproved = (emailVerified: boolean) => ({ status: 'unapproved', uid: 'u1', email: 'a@b.co', emailVerified })

beforeEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

describe('POST /api/session', () => {
  it('sets the session cookie when one was minted', async () => {
    mocks.createSessionCookie.mockResolvedValueOnce({ status: 'created', sessionCookie: 'cookie-value' })

    const res = await POST(login({ idToken: 't' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('session=cookie-value')
  })

  it('answers email_unconfirmed without settling an unconfirmed account', async () => {
    mocks.createSessionCookie.mockResolvedValueOnce(unapproved(false))

    const res = await POST(login({ idToken: 't' }))

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'email_unconfirmed' })
    expect(mocks.settleSignup).not.toHaveBeenCalled()
  })

  it('settles a confirmed account and answers access_granted when that grants access', async () => {
    mocks.createSessionCookie.mockResolvedValueOnce(unapproved(true))
    mocks.settleSignup.mockResolvedValueOnce('approved')

    const res = await POST(login({ idToken: 't' }))

    expect(mocks.settleSignup).toHaveBeenCalledWith({ uid: 'u1', email: 'a@b.co', emailVerified: true })
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'access_granted' })
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('answers access_pending while the request waits, and when settling fails', async () => {
    mocks.createSessionCookie.mockResolvedValue(unapproved(true))
    mocks.settleSignup.mockResolvedValueOnce('pending')
    expect(await (await POST(login({ idToken: 't' }))).json()).toMatchObject({ code: 'access_pending' })

    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.settleSignup.mockRejectedValueOnce(new Error('firestore down'))
    const res = await POST(login({ idToken: 't' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'access_pending' })
  })

  it('keeps 400 for a missing token and 401 for an invalid one', async () => {
    expect((await POST(login({}))).status).toBe(400)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.createSessionCookie.mockRejectedValueOnce(new Error('bad token'))
    expect((await POST(login({ idToken: 't' }))).status).toBe(401)
  })
})
