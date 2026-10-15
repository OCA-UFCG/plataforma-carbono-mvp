import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeFirestore } from '@/tests/helpers/fakeFirestore'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  sendMail: vi.fn(),
  approveAccess: vi.fn(),
  db: null as unknown,
}))

vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ getUser: mocks.getUser }),
  getFirebaseAdminDb: () => mocks.db,
}))
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mailer')>(),
  sendMail: mocks.sendMail,
}))
vi.mock('@/lib/access/claims', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/access/claims')>(),
  approveAccess: mocks.approveAccess,
}))

import { settleSignup } from '@/lib/access/settlement'

let fake: ReturnType<typeof createFakeFirestore>
const COLLECTION = 'access-requests-local'

function seed(uid: string, overrides: Record<string, unknown> = {}) {
  fake.store(COLLECTION).set(uid, {
    email: `${uid}@example.org`, tier: 'common', intention: 'Pesquisa', status: 'pending',
    createdAt: '2026-10-15T12:00:00.000Z', decidedAt: null, decidedBy: null, notifiedAt: null,
    ...overrides,
  })
}

const settle = (uid: string, emailVerified = true) => settleSignup({ uid, email: `${uid}@example.org`, emailVerified })

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('FIREBASE_ACCESS_REQUESTS_COLLECTION', '')
  vi.stubEnv('OCA_NOTIFICATION_EMAIL', 'equipe@ufcg.edu.br')
  vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org')
  vi.stubEnv('SIGNUP_ALLOWED_DOMAINS', 'ufcg.edu.br')
  fake = createFakeFirestore()
  mocks.db = fake.db
  mocks.getUser.mockResolvedValue({ customClaims: undefined })
  mocks.sendMail.mockResolvedValue({ delivered: true })
  mocks.approveAccess.mockResolvedValue(undefined)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('settleSignup', () => {
  it('does nothing for an unconfirmed address', async () => {
    expect(await settle('u1', false)).toBe('unconfirmed')
    expect(mocks.getUser).not.toHaveBeenCalled()
  })

  it('answers approved for an account that already holds access, without opening a request or emailing', async () => {
    mocks.getUser.mockResolvedValueOnce({ customClaims: { caativar: { access: 'approved', tier: 'legacy', at: 1 } } })

    expect(await settle('legacy')).toBe('approved')
    expect(fake.store(COLLECTION).size).toBe(0)
    expect(mocks.sendMail).not.toHaveBeenCalled()
  })

  it('grants access on the domain track and records that the rule decided', async () => {
    seed('u1', { tier: 'allowed' })

    expect(await settle('u1')).toBe('approved')
    expect(mocks.approveAccess).toHaveBeenCalledWith('u1', 'allowed')
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ status: 'approved', decidedBy: null })
    expect(mocks.sendMail).not.toHaveBeenCalled()
  })

  it('leaves a common request pending and emails the team once, with the approvals link', async () => {
    seed('u1')

    expect(await settle('u1')).toBe('pending')
    expect(await settle('u1')).toBe('pending')
    expect(mocks.sendMail).toHaveBeenCalledOnce()
    const message = mocks.sendMail.mock.calls[0][0] as { to: string; text: string }
    expect(message.to).toBe('equipe@ufcg.edu.br')
    expect(message.text).toContain('https://caativar.example.org/aprovacoes')
    expect(mocks.approveAccess).not.toHaveBeenCalled()
  })

  it('opens the missing request of a signup that failed midway, tier from the domain', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(await settleSignup({ uid: 'u1', email: 'fulana@gmail.com', emailVerified: true })).toBe('pending')
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ email: 'fulana@gmail.com', tier: 'common', intention: '' })

    expect(await settleSignup({ uid: 'u2', email: 'fulana@ufcg.edu.br', emailVerified: true })).toBe('approved')
    expect(mocks.approveAccess).toHaveBeenCalledWith('u2', 'allowed')
  })

  it('returns a decision already made', async () => {
    seed('u1', { status: 'rejected' })
    expect(await settle('u1')).toBe('rejected')
  })

  it('grants again an approved request whose account lacks the claim', async () => {
    seed('u1', { status: 'approved', tier: 'common' })

    expect(await settle('u1')).toBe('approved')
    expect(mocks.approveAccess).toHaveBeenCalledWith('u1', 'common')
  })

  it('keeps the request pending without a team mailbox, and says so in the log', async () => {
    vi.stubEnv('OCA_NOTIFICATION_EMAIL', '')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    seed('u1')

    expect(await settle('u1')).toBe('pending')
    expect(mocks.sendMail).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledOnce()
    expect(fake.store(COLLECTION).get('u1')?.notifiedAt).toBeNull()
  })
})
