/** Trimmed and lowercased; '' for anything that is not a string. */
export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

/** One `@`, something on both sides, a dot in the domain, no whitespace. */
export function isWellFormedEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
