// In-memory sliding-window rate limiters, keyed by client. Suitable for a single Node instance:
// state lives in module scope and is NOT shared across instances; for a multi-instance deploy,
// move this to Redis or a shared store.

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the oldest request in the window expires; only meaningful when `ok` is false. */
  retryAfter: number
}

export interface RateLimiter {
  consume(key: string): RateLimitResult
  clear(): void
}

export function createRateLimiter({ windowMs, max, maxTrackedKeys = 10_000 }: {
  windowMs: number
  max: number
  /** Safety cap so the map cannot grow unbounded. */
  maxTrackedKeys?: number
}): RateLimiter {
  const hits = new Map<string, number[]>()

  return {
    consume(key) {
      const now = Date.now()
      const windowStart = now - windowMs
      const recent = (hits.get(key) ?? []).filter((t) => t > windowStart)

      if (recent.length >= max) {
        hits.set(key, recent)
        return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) }
      }

      recent.push(now)
      hits.set(key, recent)

      // Opportunistic pruning: when the map gets large, drop keys whose whole window has expired
      // so memory stays bounded.
      if (hits.size > maxTrackedKeys) {
        for (const [trackedKey, times] of hits) {
          if (times.length === 0 || times[times.length - 1] <= windowStart) hits.delete(trackedKey)
        }
      }

      return { ok: true, retryAfter: 0 }
    },
    clear() {
      hits.clear()
    },
  }
}

/** The client address from proxy headers (the deploy's reverse proxy sets x-forwarded-for), or null. */
export function clientAddress(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip')?.trim() || null
}

/** Best-effort client IP for the map's limiter; 'unknown' when no proxy header is present. */
export function clientIp(req: Request): string {
  return clientAddress(req) ?? 'unknown'
}
