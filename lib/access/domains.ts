import { normalizeEmail } from '@/lib/access/emailAddress'

/** `allowed` gets in when the address is confirmed; `common` waits for an admin. */
export type SignupTier = 'allowed' | 'common'

function normalizeDomain(entry: string) {
  // People paste the domain off an address, so `@ufcg.edu.br` and `ufcg.edu.br` both count.
  return entry.trim().toLowerCase().replace(/^@/, '')
}

/**
 * Read on every call, so removing a domain from SIGNUP_ALLOWED_DOMAINS applies on the next
 * request. Never give the variable a NEXT_PUBLIC_ prefix: the whole list would ship to the
 * browser.
 */
export function parseAllowedSignupDomains(value = process.env.SIGNUP_ALLOWED_DOMAINS): Set<string> {
  return new Set((value ?? '').split(',').map(normalizeDomain).filter(Boolean))
}

/** The domain of a single well-formed address, or null: a malformed one takes the denying path. */
export function emailDomain(email: unknown): string | null {
  const parts = normalizeEmail(email).split('@')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return parts[1]
}

/**
 * Exact match, never by suffix: with `ufcg.edu.br` listed, neither `ccc.ufcg.edu.br` nor
 * `naoufcg.edu.br` gets in. A subdomain that should is written into the list.
 */
export function resolveSignupTier(email: unknown): SignupTier {
  const domain = emailDomain(email)
  return domain !== null && parseAllowedSignupDomains().has(domain) ? 'allowed' : 'common'
}
