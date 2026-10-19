/**
 * The local floor for a password, the same on the confirmation and reset pages and in their
 * routes. Firebase's password policy is the rule that holds (docs/signup.md); this one lets the
 * person see the error before the request leaves.
 */
export const MIN_PASSWORD_LENGTH = 8

export type PasswordPairError = 'required' | 'too-short' | 'confirm-required' | 'mismatch'

export function passwordPairError(password: string, confirmation: string): PasswordPairError | null {
  if (!password) return 'required'
  if (password.length < MIN_PASSWORD_LENGTH) return 'too-short'
  if (!confirmation) return 'confirm-required'
  if (password !== confirmation) return 'mismatch'
  return null
}

/** The server's check: a string of at least MIN_PASSWORD_LENGTH characters. */
export function isAcceptablePassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= MIN_PASSWORD_LENGTH
}
