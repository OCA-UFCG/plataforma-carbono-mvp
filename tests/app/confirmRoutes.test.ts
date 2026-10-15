import { beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonPost } from '@/tests/helpers/jsonPost'

const mocks = vi.hoisted(() => ({
  checkActionCode: vi.fn(),
  applyVerificationCode: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  settleSignup: vi.fn(),
}))

vi.mock('@/lib/access/firebaseCodes', () => ({
  checkActionCode: mocks.checkActionCode,
  applyVerificationCode: mocks.applyVerificationCode,
}))
vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ getUserByEmail: mocks.getUserByEmail, updateUser: mocks.updateUser, getUser: mocks.getUser }),
}))
vi.mock('@/lib/access/settlement', () => ({ settleSignup: mocks.settleSignup }))

import { POST as check } from '@/app/api/signup/confirm/check/route'
import { POST as confirm } from '@/app/api/signup/confirm/route'
import { accessRateLimits } from '@/lib/access/rateLimits'

const EMAIL = 'fulana@ufcg.edu.br'

beforeEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
  for (const limiter of Object.values(accessRateLimits)) limiter.clear()
  mocks.checkActionCode.mockResolvedValue(EMAIL)
  mocks.applyVerificationCode.mockResolvedValue(EMAIL)
  mocks.getUserByEmail.mockResolvedValue({ uid: 'u1' })
  mocks.updateUser.mockResolvedValue({})
  mocks.getUser.mockResolvedValue({ uid: 'u1', emailVerified: true })
  mocks.settleSignup.mockResolvedValue('pending')
})

describe('POST /api/signup/confirm/check', () => {
  it('answers 404 while signup is closed', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    expect((await check(jsonPost('/api/signup/confirm/check', { code: 'C0DE' }))).status).toBe(404)
  })

  it('returns the email of a valid verification code, and spends nothing', async () => {
    const res = await check(jsonPost('/api/signup/confirm/check', { code: 'C0DE' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ email: EMAIL })
    expect(mocks.checkActionCode).toHaveBeenCalledWith('C0DE', 'VERIFY_EMAIL')
    expect(mocks.applyVerificationCode).not.toHaveBeenCalled()
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('answers 410 for an invalid code, and for no code without asking Firebase', async () => {
    mocks.checkActionCode.mockResolvedValueOnce(null)
    const invalid = await check(jsonPost('/api/signup/confirm/check', { code: 'USED' }))
    expect(invalid.status).toBe(410)
    expect(await invalid.json()).toEqual({ reason: 'invalid-code' })

    mocks.checkActionCode.mockClear()
    expect((await check(jsonPost('/api/signup/confirm/check', {}))).status).toBe(410)
    expect((await check(jsonPost('/api/signup/confirm/check', { code: '' }))).status).toBe(410)
    expect(mocks.checkActionCode).not.toHaveBeenCalled()
  })
})

describe('POST /api/signup/confirm', () => {
  it('rejects a short password before touching the code', async () => {
    const res = await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: '1234567' }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ reason: 'weak-password' })
    expect(mocks.checkActionCode).not.toHaveBeenCalled()
  })

  it('answers 410 for an invalid or reused code, without setting a password', async () => {
    mocks.checkActionCode.mockResolvedValueOnce(null)

    const res = await confirm(jsonPost('/api/signup/confirm', { code: 'USED', password: 'senha-forte-1' }))

    expect(res.status).toBe(410)
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('answers 410 for an account already confirmed or holding access, without setting a password', async () => {
    mocks.getUserByEmail
      .mockResolvedValueOnce({ uid: 'u1', emailVerified: true })
      .mockResolvedValueOnce({ uid: 'u1', emailVerified: false, customClaims: { caativar: { access: 'approved', tier: 'legacy', at: 1 } } })

    for (let i = 0; i < 2; i++) {
      const res = await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: 'senha-forte-1' }))
      expect(res.status).toBe(410)
      expect(await res.json()).toEqual({ reason: 'invalid-code' })
    }
    expect(mocks.updateUser).not.toHaveBeenCalled()
    expect(mocks.applyVerificationCode).not.toHaveBeenCalled()
    expect(mocks.settleSignup).not.toHaveBeenCalled()
  })

  it('takes the account from the code, never from the request body', async () => {
    await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: 'senha-forte-1', email: 'outra@evil.co' }))
    expect(mocks.getUserByEmail).toHaveBeenCalledWith(EMAIL)
  })

  it('sets the password, then applies the code, then settles', async () => {
    const res = await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: 'senha-forte-1' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'pending' })
    expect(mocks.updateUser).toHaveBeenCalledWith('u1', { password: 'senha-forte-1' })
    expect(mocks.applyVerificationCode).toHaveBeenCalledWith('C0DE')
    expect(mocks.updateUser.mock.invocationCallOrder[0]).toBeLessThan(mocks.applyVerificationCode.mock.invocationCallOrder[0])
    expect(mocks.settleSignup).toHaveBeenCalledWith({ uid: 'u1', email: EMAIL, emailVerified: true })
  })

  it('answers 410 when the code no longer applies after the password was set', async () => {
    mocks.applyVerificationCode.mockResolvedValueOnce(null)
    const res = await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: 'senha-forte-1' }))
    expect(res.status).toBe(410)
    expect(mocks.settleSignup).not.toHaveBeenCalled()
  })

  it("maps Firebase's password policy refusal to weak-password, before the code is spent", async () => {
    mocks.updateUser.mockRejectedValueOnce(Object.assign(new Error('policy'), { code: 'auth/password-does-not-meet-requirements' }))

    const res = await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: 'senhafraca' }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ reason: 'weak-password' })
    expect(mocks.applyVerificationCode).not.toHaveBeenCalled()
  })

  it('answers 502 when settling fails, without logging the password', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.settleSignup.mockRejectedValueOnce(new Error('firestore down'))

    const res = await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: 'senha-forte-1' }))

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ reason: 'failed' })
    expect(error.mock.calls.flat().join(' ')).not.toContain('senha-forte-1')
  })
})
