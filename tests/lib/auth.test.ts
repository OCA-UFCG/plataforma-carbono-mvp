import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  createSessionCookie: vi.fn(),
  verifySessionCookie: vi.fn(),
}))

vi.mock('@/lib/firebase-admin', () => ({ getFirebaseAdminAuth: () => mocks }))

import { createSessionCookie, verifySessionCookie } from '@/lib/auth'

const CLAIM = { caativar: { access: 'approved', tier: 'legacy', at: 1 } }
const REQUESTED = { caativar: { access: 'requested' } }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.createSessionCookie.mockResolvedValue('minted-cookie')
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('createSessionCookie', () => {
  it('mints a cookie for any valid token while the gate is off', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.co', email_verified: false })

    expect(await createSessionCookie('token')).toEqual({ status: 'created', sessionCookie: 'minted-cookie' })
  })

  it('refuses a token without the claim while the gate is on, telling whether the email is confirmed', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'Fulana@UFCG.edu.br', email_verified: true })

    expect(await createSessionCookie('token')).toEqual({ status: 'unapproved', uid: 'u1', email: 'fulana@ufcg.edu.br', emailVerified: true })
    expect(mocks.createSessionCookie).not.toHaveBeenCalled()
  })

  it('mints a cookie for a token carrying the claim while the gate is on', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.co', email_verified: true, ...CLAIM })

    expect(await createSessionCookie('token')).toEqual({ status: 'created', sessionCookie: 'minted-cookie' })
    expect(mocks.createSessionCookie).toHaveBeenCalledWith('token', { expiresIn: 86_400_000 })
  })

  it('refuses a signup account that is not approved yet, whatever the switch says', async () => {
    for (const gate of ['false', 'true']) {
      vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', gate)
      mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.co', email_verified: true, ...REQUESTED })

      expect(await createSessionCookie('token')).toEqual({ status: 'unapproved', uid: 'u1', email: 'a@b.co', emailVerified: true })
    }
    expect(mocks.createSessionCookie).not.toHaveBeenCalled()
  })
})

describe('verifySessionCookie', () => {
  it('drops a claim-less cookie while the gate is on, and keeps it while off', async () => {
    mocks.verifySessionCookie.mockResolvedValue({ uid: 'u1' })

    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    expect(await verifySessionCookie('cookie')).toBeNull()
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    expect(await verifySessionCookie('cookie')).toEqual({ uid: 'u1' })
    expect(mocks.verifySessionCookie).toHaveBeenCalledWith('cookie', true)
  })

  it('drops the cookie of a signup account that is not approved yet, even while the gate is off', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    mocks.verifySessionCookie.mockResolvedValueOnce({ uid: 'u1', ...REQUESTED })
    expect(await verifySessionCookie('cookie')).toBeNull()
  })

  it('keeps a cookie carrying the claim while the gate is on', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    mocks.verifySessionCookie.mockResolvedValueOnce({ uid: 'u1', ...CLAIM })
    expect(await verifySessionCookie('cookie')).toMatchObject({ uid: 'u1' })
  })

  it('returns null for a missing or invalid cookie', async () => {
    expect(await verifySessionCookie(undefined)).toBeNull()
    mocks.verifySessionCookie.mockRejectedValueOnce(new Error('revoked'))
    expect(await verifySessionCookie('cookie')).toBeNull()
  })
})
