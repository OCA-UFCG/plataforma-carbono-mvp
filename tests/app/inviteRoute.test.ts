import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeFirestore } from '@/tests/helpers/fakeFirestore'
import { jsonPost } from '@/tests/helpers/jsonPost'

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequest: vi.fn(),
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  setCustomUserClaims: vi.fn(),
  approveAccess: vi.fn(),
  sendInviteEmail: vi.fn(),
  sendMail: vi.fn(),
  db: null as unknown,
}))

vi.mock('@/lib/auth', () => ({
  getAuthenticatedRequest: mocks.getAuthenticatedRequest,
  unauthorizedResponse: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}))
vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({
    getUserByEmail: mocks.getUserByEmail,
    createUser: mocks.createUser,
    updateUser: mocks.updateUser,
    deleteUser: mocks.deleteUser,
    setCustomUserClaims: mocks.setCustomUserClaims,
  }),
  getFirebaseAdminDb: () => mocks.db,
}))
vi.mock('@/lib/access/claims', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/access/claims')>(),
  approveAccess: mocks.approveAccess,
}))
vi.mock('@/lib/access/verification', () => ({ sendInviteEmail: mocks.sendInviteEmail }))
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mailer')>(),
  sendMail: mocks.sendMail,
}))

import { POST } from '@/app/api/signup/invite/route'

let fake: ReturnType<typeof createFakeFirestore>
const COLLECTION = 'access-requests-local'
const ADMIN = 'admin@ufcg.edu.br'
const APPROVED_CLAIM = { caativar: { access: 'approved', tier: 'common', at: 1 } }

const invite = (body: unknown, headers?: Record<string, string>) => POST(jsonPost('/api/signup/invite', body, headers))

async function outcomes(emails: string[]) {
  const res = await invite({ emails })
  expect(res.status).toBe(200)
  return ((await res.json()) as { results: Array<{ email: string; outcome: string }> }).results
}

function account(overrides: Record<string, unknown> = {}) {
  return { uid: 'u1', email: 'parceira@gmail.com', emailVerified: false, disabled: false, customClaims: undefined, ...overrides }
}

function seed(uid: string, overrides: Record<string, unknown> = {}) {
  fake.store(COLLECTION).set(uid, {
    email: 'parceira@gmail.com', tier: 'common', intention: 'Pesquisa', status: 'pending',
    createdAt: '2026-10-15T12:00:00.000Z', decidedAt: null, decidedBy: null, notifiedAt: null,
    ...overrides,
  })
}

const notFound = () => Object.assign(new Error('none'), { code: 'auth/user-not-found' })

beforeEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
  vi.stubEnv('ACCESS_ADMIN_EMAILS', ADMIN)
  vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org')
  vi.stubEnv('FIREBASE_ACCESS_REQUESTS_COLLECTION', '')
  fake = createFakeFirestore()
  mocks.db = fake.db
  mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'admin-uid', email: 'Admin@UFCG.edu.br' })
  mocks.getUserByEmail.mockRejectedValue(notFound())
  mocks.createUser.mockResolvedValue({ uid: 'new-uid' })
  mocks.updateUser.mockResolvedValue({})
  mocks.deleteUser.mockResolvedValue(undefined)
  mocks.setCustomUserClaims.mockResolvedValue(undefined)
  mocks.approveAccess.mockResolvedValue(undefined)
  mocks.sendInviteEmail.mockResolvedValue(true)
  mocks.sendMail.mockResolvedValue({ delivered: true })
})

describe('POST /api/signup/invite — the door', () => {
  it('answers 404 while signup is closed, before reading the session', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    expect((await invite({ emails: ['parceira@gmail.com'] })).status).toBe(404)
    expect(mocks.getAuthenticatedRequest).not.toHaveBeenCalled()
  })

  it('answers 401 without a session, 403 to a cross-site request and to a non-admin', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)
    expect((await invite({ emails: ['parceira@gmail.com'] })).status).toBe(401)
    expect((await invite({ emails: ['parceira@gmail.com'] }, { 'sec-fetch-site': 'cross-site' })).status).toBe(403)
    mocks.getAuthenticatedRequest.mockResolvedValueOnce({ uid: 'x', email: 'fulana@ufcg.edu.br' })
    expect((await invite({ emails: ['parceira@gmail.com'] })).status).toBe(403)
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('answers 400 to no list, an empty one, and more than 10 distinct addresses', async () => {
    expect((await invite({})).status).toBe(400)
    expect((await invite({ emails: ['  ', ''] })).status).toBe(400)
    const eleven = Array.from({ length: 11 }, (_, i) => `p${i}@gmail.com`)
    const res = await invite({ emails: eleven })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Envie no máximo 10 e-mails por vez.' })
    expect(mocks.getUserByEmail).not.toHaveBeenCalled()
  })

  it('counts repeats once, after normalizing', async () => {
    const tenPlusRepeats = [...Array.from({ length: 10 }, (_, i) => `p${i}@gmail.com`), ' P0@Gmail.com ']
    const results = await outcomes(tenPlusRepeats)
    expect(results).toHaveLength(10)
    expect(results[0]).toEqual({ email: 'p0@gmail.com', outcome: 'invited' })
  })

  it('reports a malformed address without looking it up, and goes on with the others', async () => {
    expect(await outcomes(['parceira', 'outra@gmail.com'])).toEqual([
      { email: 'parceira', outcome: 'invalid' },
      { email: 'outra@gmail.com', outcome: 'invited' },
    ])
    expect(mocks.getUserByEmail).toHaveBeenCalledTimes(1)
  })
})

describe('POST /api/signup/invite — per account', () => {
  it('a: creates the account without a password, marked, with an invited request, and sends the invite', async () => {
    expect(await outcomes(['Parceira@Gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'invited' }])

    expect(mocks.createUser).toHaveBeenCalledWith({ email: 'parceira@gmail.com', emailVerified: false })
    expect(mocks.setCustomUserClaims).toHaveBeenCalledWith('new-uid', { caativar: { access: 'requested' } })
    expect(fake.store(COLLECTION).get('new-uid')).toMatchObject({
      email: 'parceira@gmail.com', tier: 'invited', intention: '', status: 'pending', invitedBy: ADMIN,
    })
    expect(fake.store(COLLECTION).get('new-uid')?.invitedAt).toEqual(expect.any(String))
    expect(mocks.sendInviteEmail).toHaveBeenCalledWith('parceira@gmail.com')
  })

  it('a: deletes the account when the request cannot be recorded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.setCustomUserClaims.mockRejectedValueOnce(new Error('auth down'))

    expect(await outcomes(['parceira@gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'failed' }])
    expect(mocks.deleteUser).toHaveBeenCalledWith('new-uid')
    expect(mocks.sendInviteEmail).not.toHaveBeenCalled()
  })

  it('a: says unsent when the email did not go out, keeping the account and the request', async () => {
    mocks.sendInviteEmail.mockResolvedValueOnce(false)

    expect(await outcomes(['parceira@gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'unsent' }])
    expect(mocks.deleteUser).not.toHaveBeenCalled()
    expect(fake.store(COLLECTION).get('new-uid')?.tier).toBe('invited')
  })

  it('b: leaves a revoked account alone: disabled while holding the claim', async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(account({ disabled: true, emailVerified: true, customClaims: APPROVED_CLAIM }))

    expect(await outcomes(['parceira@gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'disabled' }])
    expect(mocks.updateUser).not.toHaveBeenCalled()
    expect(mocks.approveAccess).not.toHaveBeenCalled()
    expect(mocks.sendInviteEmail).not.toHaveBeenCalled()
  })

  it('c: sends nothing to an account that already holds access', async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(account({ customClaims: APPROVED_CLAIM }))

    expect(await outcomes(['parceira@gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'already-active' }])
    expect(mocks.sendInviteEmail).not.toHaveBeenCalled()
    expect(mocks.sendMail).not.toHaveBeenCalled()
    expect(fake.store(COLLECTION).size).toBe(0)
  })

  it('d: approves a confirmed pending request on the spot, recorded before the grant, and emails the person', async () => {
    seed('u1')
    mocks.getUserByEmail.mockResolvedValueOnce(account({ emailVerified: true }))
    mocks.approveAccess.mockImplementationOnce(async () => {
      expect(fake.store(COLLECTION).get('u1')?.status).toBe('approved')
    })

    expect(await outcomes(['parceira@gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'approved' }])
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({
      status: 'approved', tier: 'invited', decidedBy: ADMIN, invitedBy: ADMIN, intention: 'Pesquisa',
    })
    expect(mocks.approveAccess).toHaveBeenCalledWith('u1', 'invited')
    const message = mocks.sendMail.mock.calls[0][0] as { to: string; subject: string }
    expect(message).toMatchObject({ to: 'parceira@gmail.com', subject: 'Seu acesso à Caativar foi liberado' })
    expect(mocks.sendInviteEmail).not.toHaveBeenCalled()
  })

  it('d: re-enables a rejected, confirmed account before approving it', async () => {
    seed('u1', { status: 'rejected', decidedBy: 'outra-admin@ufcg.edu.br' })
    mocks.getUserByEmail.mockResolvedValueOnce(account({ emailVerified: true, disabled: true }))

    expect(await outcomes(['parceira@gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'approved' }])
    expect(mocks.updateUser).toHaveBeenCalledWith('u1', { disabled: false })
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ status: 'approved', decidedBy: ADMIN })
  })

  it('d: opens the missing request of a confirmed account', async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(account({ emailVerified: true }))

    expect(await outcomes(['parceira@gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'approved' }])
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ status: 'approved', tier: 'invited', intention: '', decidedBy: ADMIN })
  })

  it('d: grants again, without a second email, a request someone already approved', async () => {
    seed('u1', { status: 'approved', decidedBy: 'outra-admin@ufcg.edu.br' })
    mocks.getUserByEmail.mockResolvedValueOnce(account({ emailVerified: true }))

    expect(await outcomes(['parceira@gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'approved' }])
    expect(mocks.approveAccess).toHaveBeenCalledWith('u1', 'common')
    expect(fake.store(COLLECTION).get('u1')?.decidedBy).toBe('outra-admin@ufcg.edu.br')
    expect(mocks.sendMail).not.toHaveBeenCalled()
  })

  it('d: keeps the approval when the email fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    seed('u1')
    mocks.getUserByEmail.mockResolvedValueOnce(account({ emailVerified: true }))
    mocks.sendMail.mockRejectedValueOnce(new Error('smtp down'))

    expect(await outcomes(['parceira@gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'approved' }])
  })

  it('e: turns an unconfirmed signup into an invite, keeping its intention, and sends the invite', async () => {
    seed('u1', { notifiedAt: null })
    mocks.getUserByEmail.mockResolvedValueOnce(account({ customClaims: { caativar: { access: 'requested' } } }))

    expect(await outcomes(['parceira@gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'invited' }])
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({
      tier: 'invited', status: 'pending', intention: 'Pesquisa', invitedBy: ADMIN, createdAt: '2026-10-15T12:00:00.000Z',
    })
    expect(mocks.setCustomUserClaims).not.toHaveBeenCalled()
    expect(mocks.approveAccess).not.toHaveBeenCalled()
    expect(mocks.sendInviteEmail).toHaveBeenCalledWith('parceira@gmail.com')
  })

  it('e: re-enables a rejected, unconfirmed account and clears the old decision', async () => {
    seed('u1', { status: 'rejected', decidedBy: 'outra-admin@ufcg.edu.br', decidedAt: '2026-10-16T12:00:00.000Z' })
    mocks.getUserByEmail.mockResolvedValueOnce(account({ disabled: true, customClaims: { caativar: { access: 'requested' } } }))

    expect(await outcomes(['parceira@gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'invited' }])
    expect(mocks.updateUser).toHaveBeenCalledWith('u1', { disabled: false })
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ status: 'pending', decidedBy: null, decidedAt: null })
  })

  it('e: marks an account created by hand, keeping its other claims, and opens its request', async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(account({ customClaims: { other: true } }))

    expect(await outcomes(['parceira@gmail.com'])).toEqual([{ email: 'parceira@gmail.com', outcome: 'invited' }])
    expect(mocks.setCustomUserClaims).toHaveBeenCalledWith('u1', { other: true, caativar: { access: 'requested' } })
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ tier: 'invited', status: 'pending', intention: '', invitedBy: ADMIN })
  })

  it('reports failed when Firebase cannot be read, without stopping the next address', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getUserByEmail.mockRejectedValueOnce(new Error('auth down'))

    expect(await outcomes(['parceira@gmail.com', 'outra@gmail.com'])).toEqual([
      { email: 'parceira@gmail.com', outcome: 'failed' },
      { email: 'outra@gmail.com', outcome: 'invited' },
    ])
  })
})
