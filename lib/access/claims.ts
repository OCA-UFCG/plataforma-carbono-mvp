import 'server-only'

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import type { SignupTier } from '@/lib/access/domains'

/**
 * Everything this app writes on an account sits under one namespace: Firebase reserves the
 * token's top-level names (`sub`, `iat`, `exp`…) and refuses a claim that collides with them.
 * scripts/backfill-access-claims.mjs mirrors these three constants, and a test compares them.
 */
export const ACCESS_CLAIM_NAMESPACE = 'caativar'
export const APPROVED_ACCESS = 'approved'
/**
 * The marker POST /api/signup puts on every account it creates, until access is granted. It grants
 * nothing: it makes lib/auth.ts refuse the account whatever the switch says, since beta and
 * production share the accounts and the switch may be off in one of them.
 */
export const REQUESTED_ACCESS = 'requested'

/**
 * How the account got in: `allowed` (a listed domain confirmed its address), `common` (an admin
 * approved it) or `legacy` (the backfill, for accounts that predate signup).
 */
export type AccessTier = SignupTier | 'legacy'

const ACCESS_TIERS: readonly AccessTier[] = ['allowed', 'common', 'legacy']

export interface AccessClaim {
  access: typeof APPROVED_ACCESS
  tier: AccessTier
  at: number
}

function nowInSeconds() {
  return Math.floor(Date.now() / 1000)
}

export function buildAccessClaims(tier: AccessTier, atSeconds = nowInSeconds()) {
  return { [ACCESS_CLAIM_NAMESPACE]: { access: APPROVED_ACCESS, tier, at: atSeconds } }
}

export function buildRequestedClaims() {
  return { [ACCESS_CLAIM_NAMESPACE]: { access: REQUESTED_ACCESS } }
}

function readNamespace(claims: unknown): Record<string, unknown> | null {
  if (!claims || typeof claims !== 'object') return null
  const namespaced = (claims as Record<string, unknown>)[ACCESS_CLAIM_NAMESPACE]
  return namespaced && typeof namespaced === 'object' ? (namespaced as Record<string, unknown>) : null
}

/**
 * The access claim of a decoded token or of an account's custom claims, or null. A missing claim
 * and a malformed one take the same path: the one that denies.
 */
export function readAccessClaim(claims: unknown): AccessClaim | null {
  const namespaced = readNamespace(claims)
  if (!namespaced) return null

  const { access, tier, at } = namespaced
  if (access !== APPROVED_ACCESS) return null
  if (!ACCESS_TIERS.includes(tier as AccessTier)) return null

  return { access: APPROVED_ACCESS, tier: tier as AccessTier, at: typeof at === 'number' ? at : 0 }
}

export function hasApprovedAccess(claims: unknown): boolean {
  return readAccessClaim(claims) !== null
}

/** True when the claims carry the signup marker: an account signup created and nobody approved yet. */
export function isAccessRequested(claims: unknown): boolean {
  return readNamespace(claims)?.access === REQUESTED_ACCESS
}

/**
 * Grants access. The only writer of the approved claim in the app: the domain rule and an admin's
 * approval both come through here. Writing ours over the namespace also replaces the signup
 * marker.
 *
 * setCustomUserClaims replaces the whole set, so the account's other claims are merged back in.
 * The revocation is not optional: a claim is stamped into a session cookie when the cookie is
 * minted, and a cookie minted before it would otherwise stay claim-less for up to 24 h. Sessions
 * are verified with checkRevoked (lib/auth.ts), so the revocation applies on the next request.
 */
export async function approveAccess(uid: string, tier: AccessTier, atSeconds = nowInSeconds()) {
  const auth = getFirebaseAdminAuth()
  const { customClaims } = await auth.getUser(uid)
  await auth.setCustomUserClaims(uid, { ...customClaims, ...buildAccessClaims(tier, atSeconds) })
  await auth.revokeRefreshTokens(uid)
}
