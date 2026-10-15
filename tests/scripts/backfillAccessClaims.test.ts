import { describe, expect, it, vi } from 'vitest'
import {
  ACCESS_CLAIM_NAMESPACE as SCRIPT_NAMESPACE,
  APPROVED_ACCESS as SCRIPT_APPROVED,
  backfillUser,
  buildBackfillClaims,
  listSignupUids,
  shouldBackfillUser,
} from '@/scripts/backfill-access-claims.mjs'
import { ACCESS_CLAIM_NAMESPACE, APPROVED_ACCESS, readAccessClaim } from '@/lib/access/claims'
import { createFakeFirestore } from '@/tests/helpers/fakeFirestore'

describe('the backfill script', () => {
  it('writes the claim the gate reads', () => {
    expect(SCRIPT_NAMESPACE).toBe(ACCESS_CLAIM_NAMESPACE)
    expect(SCRIPT_APPROVED).toBe(APPROVED_ACCESS)
    expect(readAccessClaim(buildBackfillClaims({}, 42))).toEqual({ access: 'approved', tier: 'legacy', at: 42 })
  })

  it("keeps the account's other claims", () => {
    expect(buildBackfillClaims({ role: 'editor' }, 42)).toEqual({
      role: 'editor',
      caativar: { access: 'approved', tier: 'legacy', at: 42 },
    })
  })

  it('grants accounts without a valid claim, and skips valid claims and signup accounts', () => {
    expect(shouldBackfillUser({ uid: 'a' })).toBe(true)
    expect(shouldBackfillUser({ uid: 'b', customClaims: { caativar: { access: 'pending' } } })).toBe(true)
    expect(shouldBackfillUser({ uid: 'c', customClaims: { caativar: { access: 'approved', tier: 'admin' } } })).toBe(true)
    expect(shouldBackfillUser({ uid: 'd', customClaims: { caativar: { access: 'approved', tier: 'common', at: 1 } } })).toBe(false)
    expect(shouldBackfillUser({ uid: 'e' }, new Set(['e']))).toBe(false)
  })

  it('sets the claim before revoking the tokens', async () => {
    const auth = { setCustomUserClaims: vi.fn(async () => undefined), revokeRefreshTokens: vi.fn(async () => undefined) }

    await backfillUser(auth, { uid: 'a', customClaims: undefined }, 42)

    expect(auth.setCustomUserClaims).toHaveBeenCalledWith('a', { caativar: { access: 'approved', tier: 'legacy', at: 42 } })
    expect(auth.setCustomUserClaims.mock.invocationCallOrder[0]).toBeLessThan(auth.revokeRefreshTokens.mock.invocationCallOrder[0])
  })

  it('gathers signup accounts from every collection', async () => {
    const { db, store } = createFakeFirestore()
    store('access-requests').set('u1', {})
    store('access-requests-local').set('u2', {})

    expect(await listSignupUids(db, ['access-requests', 'access-requests-local', 'other'])).toEqual(new Set(['u1', 'u2']))
  })
})
