import { normalizeEmail } from '@/lib/access/emailAddress'

/** Read on every call, so removing someone from ACCESS_ADMIN_EMAILS applies on the next request. */
export function parseAccessAdminEmails(value = process.env.ACCESS_ADMIN_EMAILS): Set<string> {
  return new Set((value ?? '').split(',').map(normalizeEmail).filter(Boolean))
}

/** Whether a signed-in email may decide access requests at /aprovacoes. */
export function isAccessAdmin(email: unknown): boolean {
  const normalized = normalizeEmail(email)
  return normalized !== '' && parseAccessAdminEmails().has(normalized)
}
