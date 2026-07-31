// Simple in-memory sliding-window rate limiter, keyed by client IP.
// Suitable for a single Node instance (the Render web service). State lives
// in module scope and is NOT shared across instances, for a multi-instance
// deploy, move this to Redis or a shared store.

const WINDOW_MS = 60_000
const MAX_REQUESTS = 60          // per IP per window
const MAX_TRACKED_IPS = 10_000   // safety cap so the map can't grow unbounded

const hits = new Map<string, number[]>()

/**
 * Record a request from `ip` and report whether it is within the limit.
 * `retryAfter` is the seconds to wait before the oldest request in the
 * window expires (only meaningful when `ok` is false).
 */
export function rateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  const recent = (hits.get(ip) ?? []).filter((t) => t > windowStart)

  if (recent.length >= MAX_REQUESTS) {
    hits.set(ip, recent)
    const retryAfter = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000))
    return { ok: false, retryAfter }
  }

  recent.push(now)
  hits.set(ip, recent)

  // Opportunistic pruning: when the map gets large, drop keys whose whole
  // window has expired so memory stays bounded.
  if (hits.size > MAX_TRACKED_IPS) {
    for (const [key, times] of hits) {
      if (times.length === 0 || times[times.length - 1] <= windowStart) {
        hits.delete(key)
      }
    }
  }

  return { ok: true, retryAfter: 0 }
}

/** Best-effort client IP from proxy headers (Render sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
