/** The intended-use text: shared by the signup form (its maxLength) and the server (the real cut). */
export const INTENTION_MAX_LENGTH = 1000

/**
 * Ready to store and later paste into an email: trimmed, whitespace collapsed, cut at the limit.
 * The textarea's maxLength is a courtesy; this cut is the one that counts.
 */
export function normalizeIntention(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, INTENTION_MAX_LENGTH)
}
