// The map and report routes' per-IP limit: 60 requests per minute. The limiter lives in
// lib/rateLimit.ts, shared with the signup routes (lib/access/rateLimits.ts); the exports here
// stay as they were, so the routes importing them do not change.
import { createRateLimiter, type RateLimitResult } from '@/lib/rateLimit'

export { clientIp } from '@/lib/rateLimit'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 60 // per IP per window

const limiter = createRateLimiter({ windowMs: WINDOW_MS, max: MAX_REQUESTS })

/** Record a request from `ip` and report whether it is within the limit. */
export function rateLimit(ip: string): RateLimitResult {
  return limiter.consume(ip)
}
