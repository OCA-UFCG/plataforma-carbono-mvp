/**
 * Why POST /api/session refused a correct password; shared by the route and AuthProvider.
 * - access_pending: the address is confirmed and the request waits for an admin;
 * - access_granted: access was granted just now, but the ID token predates it, so sign in again;
 * - email_unconfirmed: the address is not confirmed yet.
 */
export const ACCESS_CODES = ['access_pending', 'access_granted', 'email_unconfirmed'] as const
export type AccessCode = (typeof ACCESS_CODES)[number]

export function readAccessCode(body: unknown): AccessCode | null {
  const code = body && typeof body === 'object' ? (body as { code?: unknown }).code : undefined
  return ACCESS_CODES.includes(code as AccessCode) ? (code as AccessCode) : null
}
