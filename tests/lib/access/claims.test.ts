import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  setCustomUserClaims: vi.fn(),
  revokeRefreshTokens: vi.fn(),
}))

vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => mocks,
}))

import {
  ACCESS_CLAIM_NAMESPACE,
  approveAccess,
  buildAccessClaims,
  buildRequestedClaims,
  hasApprovedAccess,
  isAccessRequested,
  readAccessClaim,
  REQUESTED_ACCESS,
} from '@/lib/access/claims'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getUser.mockResolvedValue({ customClaims: undefined })
  mocks.setCustomUserClaims.mockResolvedValue(undefined)
  mocks.revokeRefreshTokens.mockResolvedValue(undefined)
})

describe('readAccessClaim', () => {
  it('reads a well-formed approved claim', () => {
    expect(readAccessClaim({ caativar: { access: 'approved', tier: 'allowed', at: 1700000000 } }))
      .toEqual({ access: 'approved', tier: 'allowed', at: 1700000000 })
  })

  it('denies anything else the same way', () => {
    const denied: unknown[] = [
      undefined, null, 'caativar', {}, { caativar: null }, { caativar: 'approved' },
      { caativar: { access: 'pending', tier: 'allowed', at: 1 } },
      { caativar: { access: 'approved', tier: 'admin', at: 1 } },
      { sap: { access: 'approved', tier: 'allowed', at: 1 } },
    ]
    for (const claims of denied) {
      expect(readAccessClaim(claims)).toBeNull()
      expect(hasApprovedAccess(claims)).toBe(false)
    }
  })

  it('tolerates a missing timestamp', () => {
    expect(readAccessClaim({ caativar: { access: 'approved', tier: 'legacy' } })?.at).toBe(0)
  })

  it('denies the signup marker', () => {
    expect(readAccessClaim(buildRequestedClaims())).toBeNull()
    expect(hasApprovedAccess(buildRequestedClaims())).toBe(false)
  })
})

describe('the signup marker', () => {
  it('nests the requested marker under the namespace', () => {
    expect(REQUESTED_ACCESS).toBe('requested')
    expect(buildRequestedClaims()).toEqual({ caativar: { access: 'requested' } })
  })

  it('recognizes the marker and nothing else', () => {
    expect(isAccessRequested(buildRequestedClaims())).toBe(true)
    expect(isAccessRequested({ uid: 'u1', email: 'a@b.co', caativar: { access: 'requested' } })).toBe(true)

    const others: unknown[] = [
      undefined, null, 'requested', {}, { caativar: null }, { caativar: 'requested' },
      { requested: true }, { access: 'requested' },
      buildAccessClaims('common', 1),
    ]
    for (const claims of others) expect(isAccessRequested(claims)).toBe(false)
  })
})

describe('buildAccessClaims', () => {
  it('nests the claim under the namespace', () => {
    expect(ACCESS_CLAIM_NAMESPACE).toBe('caativar')
    expect(buildAccessClaims('common', 42)).toEqual({ caativar: { access: 'approved', tier: 'common', at: 42 } })
  })
})

describe('approveAccess', () => {
  it("merges the claim into the account's other claims, then revokes its tokens", async () => {
    mocks.getUser.mockResolvedValueOnce({ customClaims: { role: 'editor' } })

    await approveAccess('uid-1', 'common', 42)

    expect(mocks.setCustomUserClaims).toHaveBeenCalledWith('uid-1', {
      role: 'editor',
      caativar: { access: 'approved', tier: 'common', at: 42 },
    })
    expect(mocks.revokeRefreshTokens).toHaveBeenCalledWith('uid-1')
    expect(mocks.setCustomUserClaims.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.revokeRefreshTokens.mock.invocationCallOrder[0])
  })
})
