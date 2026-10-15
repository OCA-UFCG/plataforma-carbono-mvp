import { beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonPost } from '@/tests/helpers/jsonPost'

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  getUserByEmail: vi.fn(),
  createAccessRequest: vi.fn(),
  sendVerificationEmail: vi.fn(),
  afterTasks: [] as Array<() => unknown>,
}))

vi.mock('next/server', async (importOriginal) => ({
  ...await importOriginal<typeof import('next/server')>(),
  after: (task: () => unknown) => {
    mocks.afterTasks.push(task)
  },
}))
vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ createUser: mocks.createUser, deleteUser: mocks.deleteUser, getUserByEmail: mocks.getUserByEmail }),
}))
vi.mock('@/lib/access/requests', () => ({ createAccessRequest: mocks.createAccessRequest }))
vi.mock('@/lib/access/verification', () => ({ sendVerificationEmail: mocks.sendVerificationEmail }))

import { POST as signup } from '@/app/api/signup/route'
import { POST as resend } from '@/app/api/signup/resend/route'
import { accessRateLimits } from '@/lib/access/rateLimits'

const flushAfter = () => Promise.all(mocks.afterTasks.splice(0).map((task) => task()))
const VALID = { email: 'fulana@gmail.com', intention: 'Pesquisa sobre carbono' }

beforeEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
  vi.stubEnv('SIGNUP_ALLOWED_DOMAINS', 'ufcg.edu.br')
  for (const limiter of Object.values(accessRateLimits)) limiter.clear()
  mocks.afterTasks.splice(0)
  mocks.createUser.mockResolvedValue({ uid: 'new-uid' })
  mocks.deleteUser.mockResolvedValue(undefined)
  mocks.createAccessRequest.mockResolvedValue(undefined)
  mocks.sendVerificationEmail.mockResolvedValue(true)
})

describe('POST /api/signup', () => {
  it('answers 404 while signup is closed, before touching anything', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    expect((await signup(jsonPost('/api/signup', VALID))).status).toBe(404)
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('refuses a cross-site request and a client over its budget', async () => {
    expect((await signup(jsonPost('/api/signup', VALID, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403)
    for (let i = 0; i < 20; i++) await signup(jsonPost('/api/signup', VALID))
    const limited = await signup(jsonPost('/api/signup', VALID))
    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBeTruthy()
  })

  it('rejects a malformed email and a blank intention', async () => {
    const badEmail = await signup(jsonPost('/api/signup', { ...VALID, email: 'fulana' }))
    expect(badEmail.status).toBe(400)
    expect(await badEmail.json()).toEqual({ error: 'Informe um e-mail válido.' })

    const blank = await signup(jsonPost('/api/signup', { ...VALID, intention: '   \n ' }))
    expect(blank.status).toBe(400)
    expect(await blank.json()).toEqual({ error: 'Descreva como pretende usar a plataforma.' })
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('creates the account without a password, from the normalized email, and records the request', async () => {
    const res = await signup(jsonPost('/api/signup', { email: '  Fulana@UFCG.edu.br ', intention: '  Ensino\n de  carbono ' }))

    expect(res.status).toBe(201)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.json()).toEqual({ status: 'accepted' })
    expect(mocks.createUser).toHaveBeenCalledWith({ email: 'fulana@ufcg.edu.br', emailVerified: false })
    expect(mocks.createAccessRequest).toHaveBeenCalledWith('new-uid', { email: 'fulana@ufcg.edu.br', tier: 'allowed', intention: 'Ensino de carbono' })
    expect(mocks.sendVerificationEmail).toHaveBeenCalledWith('fulana@ufcg.edu.br')
  })

  it('never takes the tier from the client', async () => {
    await signup(jsonPost('/api/signup', { ...VALID, tier: 'allowed' }))
    expect(mocks.createAccessRequest).toHaveBeenCalledWith('new-uid', expect.objectContaining({ tier: 'common' }))
  })

  it('answers an existing email exactly like a new one, sending nothing', async () => {
    mocks.createUser.mockRejectedValueOnce(Object.assign(new Error('exists'), { code: 'auth/email-already-exists' }))

    const res = await signup(jsonPost('/api/signup', VALID))

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ status: 'accepted' })
    expect(mocks.createAccessRequest).not.toHaveBeenCalled()
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled()
  })

  it('deletes the account when the request cannot be recorded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.createAccessRequest.mockRejectedValueOnce(new Error('firestore down'))

    const res = await signup(jsonPost('/api/signup', VALID))

    expect(res.status).toBe(500)
    expect(mocks.deleteUser).toHaveBeenCalledWith('new-uid')
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled()
  })

  it('keeps the signup when the email fails, and says so in the log', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.sendVerificationEmail.mockResolvedValueOnce(false)

    expect((await signup(jsonPost('/api/signup', VALID))).status).toBe(201)
    expect(error).toHaveBeenCalledOnce()
  })
})

describe('POST /api/signup/resend', () => {
  const account = (overrides: Record<string, unknown> = {}) => ({ uid: 'u1', emailVerified: false, disabled: false, customClaims: undefined, ...overrides })

  it('answers 404 while signup is closed', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    expect((await resend(jsonPost('/api/signup/resend', { email: 'fulana@gmail.com' }))).status).toBe(404)
  })

  it('sends a new link to an unconfirmed account without access, after the response', async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(account())

    const res = await resend(jsonPost('/api/signup/resend', { email: ' Fulana@Gmail.com ' }))
    expect(res.status).toBe(202)
    expect(await res.json()).toEqual({ status: 'accepted' })
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled()

    await flushAfter()
    expect(mocks.getUserByEmail).toHaveBeenCalledWith('fulana@gmail.com')
    expect(mocks.sendVerificationEmail).toHaveBeenCalledWith('fulana@gmail.com')
  })

  it('answers the same and sends nothing for a confirmed, a claimed, a disabled or an unknown account', async () => {
    mocks.getUserByEmail
      .mockResolvedValueOnce(account({ emailVerified: true }))
      .mockResolvedValueOnce(account({ customClaims: { caativar: { access: 'approved', tier: 'legacy', at: 1 } } }))
      .mockResolvedValueOnce(account({ disabled: true }))
      .mockRejectedValueOnce(Object.assign(new Error('none'), { code: 'auth/user-not-found' }))

    for (let i = 0; i < 4; i++) {
      const res = await resend(jsonPost('/api/signup/resend', { email: 'fulana@gmail.com' }))
      expect(res.status).toBe(202)
    }
    await flushAfter()
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled()
  })

  it('does not even look up a malformed address', async () => {
    expect((await resend(jsonPost('/api/signup/resend', { email: 'fulana' }))).status).toBe(202)
    await flushAfter()
    expect(mocks.getUserByEmail).not.toHaveBeenCalled()
  })

  it('stops a client after 10 resends a minute', async () => {
    mocks.getUserByEmail.mockResolvedValue(account({ emailVerified: true }))
    for (let i = 0; i < 10; i++) await resend(jsonPost('/api/signup/resend', { email: 'fulana@gmail.com' }))
    expect((await resend(jsonPost('/api/signup/resend', { email: 'fulana@gmail.com' }))).status).toBe(429)
  })
})
