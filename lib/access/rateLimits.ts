import { clientAddress, createRateLimiter } from '@/lib/rateLimit'

const WINDOW_MS = 60_000

/**
 * One budget per action, not one shared: signup happens before there is a session, so the key is
 * the network address, and a whole office often reaches the internet through one. The limits
 * follow each action's cost.
 */
export const accessRateLimits = {
  /** Creates an account and sends mail. A whole training session can sign up from one building. */
  signup: createRateLimiter({ windowMs: WINDOW_MS, max: 20 }),
  /** Sends mail on every call. */
  resend: createRateLimiter({ windowMs: WINDOW_MS, max: 10 }),
  /** The page checks the code as soon as it opens, and mail clients open links on their own to scan them. */
  confirm: createRateLimiter({ windowMs: WINDOW_MS, max: 40 }),
  /** "Esqueci minha senha": sends mail on every call. */
  resetRequest: createRateLimiter({ windowMs: WINDOW_MS, max: 10 }),
  /** Checking and using the reset code; the page checks it as soon as it opens. */
  resetCode: createRateLimiter({ windowMs: WINDOW_MS, max: 40 }),
}

export type AccessAction = keyof typeof accessRateLimits

/**
 * The client key of an unauthenticated request. The last resort is the user agent, never a fixed
 * key: one bucket for the whole world could be spent once a minute to block signup for everyone.
 * Reaching it also means the proxy is not forwarding the address, which is an infrastructure
 * problem and has to show up in the log.
 */
export function accessClientKey(req: Request): string {
  const address = clientAddress(req)
  if (address) return `ip:${address}`

  console.error('[access] no client address header: rate limiting falls back to the user agent. Check that the proxy forwards x-forwarded-for.')
  return `ua:${req.headers.get('user-agent')?.trim() || 'unknown'}`
}
