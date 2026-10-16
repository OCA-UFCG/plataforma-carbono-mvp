import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeFirestore } from '@/tests/helpers/fakeFirestore'

const holder = vi.hoisted(() => ({ db: null as unknown, getUsers: vi.fn() }))

vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminDb: () => holder.db,
  getFirebaseAdminAuth: () => ({ getUsers: holder.getUsers }),
}))

import { INTENTION_MAX_LENGTH, normalizeIntention } from '@/lib/access/intention'
import {
  accessRequestsCollectionName, claimPendingDecision, claimTeamNotification, createAccessRequest,
  listPendingAccessRequests, readAccessRequest, recordAccessDecision,
} from '@/lib/access/requests'

let fake: ReturnType<typeof createFakeFirestore>
const COLLECTION = 'access-requests-local'

function seed(uid: string, overrides: Record<string, unknown> = {}) {
  fake.store(COLLECTION).set(uid, {
    email: `${uid}@example.org`, tier: 'common', intention: 'Pesquisa', status: 'pending',
    createdAt: '2026-10-15T12:00:00.000Z', decidedAt: null, decidedBy: null, notifiedAt: null,
    ...overrides,
  })
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('FIREBASE_ACCESS_REQUESTS_COLLECTION', '')
  fake = createFakeFirestore()
  holder.db = fake.db
  holder.getUsers.mockReset()
  holder.getUsers.mockImplementation(async (ids: Array<{ uid: string }>) => ({
    users: ids.map(({ uid }) => ({ uid, emailVerified: true })),
  }))
})

describe('normalizeIntention', () => {
  it('trims, collapses whitespace and cuts at the limit', () => {
    expect(normalizeIntention('  Pesquisa\n\n  sobre   carbono ')).toBe('Pesquisa sobre carbono')
    expect(normalizeIntention('a'.repeat(INTENTION_MAX_LENGTH + 50))).toHaveLength(1000)
    expect(normalizeIntention('   ')).toBe('')
    expect(normalizeIntention(42)).toBe('')
  })
})

describe('the collection name', () => {
  it('defaults to the development collection', () => {
    expect(accessRequestsCollectionName('')).toBe('access-requests-local')
    expect(accessRequestsCollectionName(' access-requests ')).toBe('access-requests')
  })
})

describe('createAccessRequest and readAccessRequest', () => {
  it('records a pending request under the uid, in the configured collection', async () => {
    vi.stubEnv('FIREBASE_ACCESS_REQUESTS_COLLECTION', 'access-requests')

    await createAccessRequest('u1', { email: 'a@ufcg.edu.br', tier: 'allowed', intention: 'Ensino' })

    expect(fake.store('access-requests').get('u1')).toMatchObject({
      email: 'a@ufcg.edu.br', tier: 'allowed', intention: 'Ensino', status: 'pending',
      decidedAt: null, decidedBy: null, notifiedAt: null,
    })
    expect(await readAccessRequest('u1')).toMatchObject({ email: 'a@ufcg.edu.br', status: 'pending' })
    expect(await readAccessRequest('nobody')).toBeNull()
  })
})

describe('listPendingAccessRequests', () => {
  it('lists pending requests whose email is confirmed, oldest first', async () => {
    seed('late', { createdAt: '2026-10-15T15:00:00.000Z' })
    seed('early', { createdAt: '2026-10-14T09:00:00.000Z' })
    seed('decided', { status: 'approved' })
    seed('unconfirmed')
    holder.getUsers.mockImplementation(async (ids: Array<{ uid: string }>) => ({
      users: ids.map(({ uid }) => ({ uid, emailVerified: uid !== 'unconfirmed' })),
    }))

    expect((await listPendingAccessRequests()).map((request) => request.uid)).toEqual(['early', 'late'])
  })

  it('asks Firebase about at most 100 accounts at a time', async () => {
    for (let i = 0; i < 150; i++) seed(`u${String(i).padStart(3, '0')}`)

    expect(await listPendingAccessRequests()).toHaveLength(150)
    expect(holder.getUsers).toHaveBeenCalledTimes(2)
    expect(holder.getUsers.mock.calls[0][0]).toHaveLength(100)
  })
})

describe('claimTeamNotification', () => {
  it('lets exactly one caller email the team', async () => {
    seed('u1')
    expect(await claimTeamNotification('u1')).toBe(true)
    expect(await claimTeamNotification('u1')).toBe(false)
    expect(fake.store(COLLECTION).get('u1')?.notifiedAt).toEqual(expect.any(String))
    expect(await claimTeamNotification('missing')).toBe(false)
  })
})

describe('claimPendingDecision', () => {
  it('lets the first decision through, with the stored tier, and turns the second away', async () => {
    seed('u1', { tier: 'common' })

    expect(await claimPendingDecision('u1', { status: 'approved', decidedBy: 'admin@ufcg.edu.br' }))
      .toEqual({ claimed: true, tier: 'common' })
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ status: 'approved', decidedBy: 'admin@ufcg.edu.br' })
    expect(await claimPendingDecision('u1', { status: 'rejected', decidedBy: 'outra@ufcg.edu.br' }))
      .toEqual({ claimed: false, status: 'approved' })
    expect(await claimPendingDecision('missing', { status: 'approved', decidedBy: 'a@b.co' }))
      .toEqual({ claimed: false, status: 'missing' })
  })
})

describe('recordAccessDecision', () => {
  it('closes a request with the decision and who made it', async () => {
    seed('u1', { tier: 'allowed' })
    await recordAccessDecision('u1', { status: 'approved', decidedBy: null })
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ status: 'approved', decidedBy: null, decidedAt: expect.any(String) })
  })
})
