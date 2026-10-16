import { beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonPost } from '@/tests/helpers/jsonPost'

const mocks = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(),
  checkActionCode: vi.fn(),
  resetPasswordWithCode: vi.fn(),
  getUserByEmail: vi.fn(),
  revokeRefreshTokens: vi.fn(),
  afterTasks: [] as Array<() => unknown>,
}))

vi.mock('next/server', async (importOriginal) => ({
  ...await importOriginal<typeof import('next/server')>(),
  after: (task: () => unknown) => {
    mocks.afterTasks.push(task)
  },
}))
vi.mock('@/lib/access/passwordReset', () => ({ sendPasswordResetEmail: mocks.sendPasswordResetEmail }))
vi.mock('@/lib/access/firebaseCodes', () => ({
  checkActionCode: mocks.checkActionCode,
  resetPasswordWithCode: mocks.resetPasswordWithCode,
}))
vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ getUserByEmail: mocks.getUserByEmail, revokeRefreshTokens: mocks.revokeRefreshTokens }),
}))

import { POST as requestReset } from '@/app/api/password-reset/route'
import { POST as checkReset } from '@/app/api/password-reset/check/route'
import { POST as confirmReset } from '@/app/api/password-reset/confirm/route'
import { accessRateLimits } from '@/lib/access/rateLimits'

const flushAfter = () => Promise.all(mocks.afterTasks.splice(0).map((task) => task()))

beforeEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
  for (const limiter of Object.values(accessRateLimits)) limiter.clear()
  mocks.afterTasks.splice(0)
  mocks.sendPasswordResetEmail.mockResolvedValue(true)
  mocks.checkActionCode.mockResolvedValue('fulana@ufcg.edu.br')
  mocks.resetPasswordWithCode.mockResolvedValue({ status: 'changed', email: 'fulana@ufcg.edu.br' })
  mocks.getUserByEmail.mockResolvedValue({ uid: 'u1' })
  mocks.revokeRefreshTokens.mockResolvedValue(undefined)
})

describe('POST /api/password-reset', () => {
  it('answers 202 for any address, even with signup closed, and sends after the response', async () => {
    const res = await requestReset(jsonPost('/api/password-reset', { email: ' Fulana@UFCG.edu.br ' }))
    expect(res.status).toBe(202)
    expect(await res.json()).toEqual({ status: 'accepted' })
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled()

    await flushAfter()
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith('fulana@ufcg.edu.br')
  })

  it('answers the same to a malformed address and sends nothing', async () => {
    expect((await requestReset(jsonPost('/api/password-reset', { email: 'fulana' }))).status).toBe(202)
    await flushAfter()
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('refuses a cross-site request and a client over 10 a minute', async () => {
    expect((await requestReset(jsonPost('/api/password-reset', { email: 'a@b.co' }, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403)
    for (let i = 0; i < 10; i++) await requestReset(jsonPost('/api/password-reset', { email: 'a@b.co' }))
    expect((await requestReset(jsonPost('/api/password-reset', { email: 'a@b.co' }))).status).toBe(429)
  })
})

describe('POST /api/password-reset/check', () => {
  it('returns the account email of a valid reset code', async () => {
    const res = await checkReset(jsonPost('/api/password-reset/check', { code: 'R3SET' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ email: 'fulana@ufcg.edu.br' })
    expect(mocks.checkActionCode).toHaveBeenCalledWith('R3SET', 'PASSWORD_RESET')
  })

  it('answers 410 for an invalid code or none', async () => {
    mocks.checkActionCode.mockResolvedValueOnce(null)
    expect((await checkReset(jsonPost('/api/password-reset/check', { code: 'USED' }))).status).toBe(410)
    expect((await checkReset(jsonPost('/api/password-reset/check', {}))).status).toBe(410)
  })
})

describe('POST /api/password-reset/confirm', () => {
  const submit = (body: unknown) => confirmReset(jsonPost('/api/password-reset/confirm', body))

  it('changes the password and signs out every session', async () => {
    const res = await submit({ code: 'R3SET', password: 'nova-senha-1' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'changed' })
    expect(mocks.resetPasswordWithCode).toHaveBeenCalledWith('R3SET', 'nova-senha-1')
    expect(mocks.revokeRefreshTokens).toHaveBeenCalledWith('u1')
  })

  it('answers 410 for a code that is not a valid reset code, before using it', async () => {
    mocks.checkActionCode.mockResolvedValueOnce(null)

    const res = await submit({ code: 'V3RIFY', password: 'nova-senha-1' })

    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ reason: 'invalid-code' })
    expect(mocks.checkActionCode).toHaveBeenCalledWith('V3RIFY', 'PASSWORD_RESET')
    expect(mocks.resetPasswordWithCode).not.toHaveBeenCalled()
  })

  it('maps each failure to its reason', async () => {
    expect((await submit({ code: 'R3SET', password: 'curta' })).status).toBe(400)
    expect((await submit({ password: 'nova-senha-1' })).status).toBe(410)

    mocks.resetPasswordWithCode.mockResolvedValueOnce({ status: 'invalid-code' })
    expect((await submit({ code: 'R3SET', password: 'nova-senha-1' })).status).toBe(410)
    mocks.resetPasswordWithCode.mockResolvedValueOnce({ status: 'weak-password' })
    const weak = await submit({ code: 'R3SET', password: 'nova-senha-1' })
    expect(weak.status).toBe(400)
    expect(await weak.json()).toEqual({ reason: 'weak-password' })
    mocks.resetPasswordWithCode.mockResolvedValueOnce({ status: 'failed' })
    expect((await submit({ code: 'R3SET', password: 'nova-senha-1' })).status).toBe(502)
  })

  it('still answers changed when the explicit revocation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.revokeRefreshTokens.mockRejectedValueOnce(new Error('auth down'))
    expect((await submit({ code: 'R3SET', password: 'nova-senha-1' })).status).toBe(200)
  })
})
