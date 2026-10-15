import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeFirestore } from '@/tests/helpers/fakeFirestore'
import { jsonPost } from '@/tests/helpers/jsonPost'

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequest: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  approveAccess: vi.fn(),
  sendMail: vi.fn(),
  db: null as unknown,
}))

vi.mock('@/lib/auth', () => ({
  getAuthenticatedRequest: mocks.getAuthenticatedRequest,
  unauthorizedResponse: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}))
vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ getUser: mocks.getUser, updateUser: mocks.updateUser }),
  getFirebaseAdminDb: () => mocks.db,
}))
vi.mock('@/lib/access/claims', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/access/claims')>(),
  approveAccess: mocks.approveAccess,
}))
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mailer')>(),
  sendMail: mocks.sendMail,
}))

import { POST } from '@/app/api/signup/approve/route'

let fake: ReturnType<typeof createFakeFirestore>
const COLLECTION = 'access-requests-local'

function seed(uid: string, overrides: Record<string, unknown> = {}) {
  fake.store(COLLECTION).set(uid, {
    email: `${uid}@example.org`, tier: 'common', intention: 'Pesquisa', status: 'pending',
    createdAt: '2026-10-15T12:00:00.000Z', decidedAt: null, decidedBy: null, notifiedAt: null,
    ...overrides,
  })
}

const decide = (body: unknown, headers?: Record<string, string>) => POST(jsonPost('/api/signup/approve', body, headers))

beforeEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('ACCESS_ADMIN_EMAILS', 'admin@ufcg.edu.br')
  vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org')
  vi.stubEnv('FIREBASE_ACCESS_REQUESTS_COLLECTION', '')
  vi.stubEnv('SIGNUP_SEND_REJECTION_EMAIL', '')
  fake = createFakeFirestore()
  mocks.db = fake.db
  mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'admin-uid', email: 'Admin@UFCG.edu.br' })
  mocks.getUser.mockResolvedValue({ emailVerified: true })
  mocks.updateUser.mockResolvedValue({})
  mocks.approveAccess.mockResolvedValue(undefined)
  mocks.sendMail.mockResolvedValue({ delivered: true })
})

describe('POST /api/signup/approve', () => {
  it('answers 401 without a session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)
    expect((await decide({ uid: 'u1', decision: 'approved' })).status).toBe(401)
  })

  it('answers 403 to a cross-site request and to a non-admin', async () => {
    seed('u1')
    expect((await decide({ uid: 'u1', decision: 'approved' }, { 'sec-fetch-site': 'cross-site' })).status).toBe(403)
    mocks.getAuthenticatedRequest.mockResolvedValueOnce({ uid: 'x', email: 'fulana@ufcg.edu.br' })
    expect((await decide({ uid: 'u1', decision: 'approved' })).status).toBe(403)
    expect(fake.store(COLLECTION).get('u1')?.status).toBe('pending')
  })

  it('answers 400 to a missing uid or an unknown decision, and 404 to an unknown request', async () => {
    expect((await decide({ decision: 'approved' })).status).toBe(400)
    expect((await decide({ uid: 'u1', decision: 'maybe' })).status).toBe(400)
    expect((await decide({ uid: 'nobody', decision: 'approved' })).status).toBe(404)
  })

  it('refuses to approve an unconfirmed email', async () => {
    seed('u1')
    mocks.getUser.mockResolvedValueOnce({ emailVerified: false })

    const res = await decide({ uid: 'u1', decision: 'approved' })

    expect(res.status).toBe(409)
    expect(fake.store(COLLECTION).get('u1')?.status).toBe('pending')
    expect(mocks.approveAccess).not.toHaveBeenCalled()
  })

  it('records the approval, grants access with the stored tier and emails the applicant', async () => {
    seed('u1', { tier: 'common' })

    const res = await decide({ uid: 'u1', decision: 'approved', tier: 'legacy' })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'approved' })
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ status: 'approved', decidedBy: 'admin@ufcg.edu.br' })
    expect(mocks.approveAccess).toHaveBeenCalledWith('u1', 'common')
    const message = mocks.sendMail.mock.calls[0][0] as { to: string; subject: string; text: string }
    expect(message.to).toBe('u1@example.org')
    expect(message.subject).toBe('Seu acesso à Caativar foi liberado')
    expect(message.text).toContain('https://caativar.example.org/login')
  })

  it('turns away a second decision with the status already recorded', async () => {
    seed('u1', { status: 'approved' })

    const res = await decide({ uid: 'u1', decision: 'rejected' })

    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ status: 'approved' })
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('disables a rejected account, and emails it only when the team turned that on', async () => {
    seed('u1')
    expect((await decide({ uid: 'u1', decision: 'rejected' })).status).toBe(200)
    expect(mocks.updateUser).toHaveBeenCalledWith('u1', { disabled: true })
    expect(mocks.sendMail).not.toHaveBeenCalled()

    vi.stubEnv('SIGNUP_SEND_REJECTION_EMAIL', 'true')
    seed('u2')
    await decide({ uid: 'u2', decision: 'rejected' })
    expect((mocks.sendMail.mock.calls[0][0] as { subject: string }).subject).toBe('Sobre seu pedido de acesso à Caativar')
  })

  it('rejects an unconfirmed email too', async () => {
    seed('u1')
    mocks.getUser.mockResolvedValueOnce({ emailVerified: false })
    expect((await decide({ uid: 'u1', decision: 'rejected' })).status).toBe(200)
  })

  it('says so when the decision was recorded but access could not be granted', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    seed('u1')
    mocks.approveAccess.mockRejectedValueOnce(new Error('auth down'))

    const res = await decide({ uid: 'u1', decision: 'approved' })

    expect(res.status).toBe(500)
    expect(fake.store(COLLECTION).get('u1')?.status).toBe('approved')
    expect(mocks.sendMail).not.toHaveBeenCalled()
  })

  it('keeps the decision when the email fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    seed('u1')
    mocks.sendMail.mockRejectedValueOnce(new Error('smtp down'))
    expect((await decide({ uid: 'u1', decision: 'approved' })).status).toBe(200)
  })
})
