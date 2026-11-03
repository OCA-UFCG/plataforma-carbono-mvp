// Server-side cache of the results panel's answers (/api/gee/stats with a
// result profile).
//
// A cold reduction over the whole biome takes 40 to 65 s, and the biome is the
// recorte everyone clicks first. Kept here, that cost is paid once per layer
// and year, and two people asking at the same time share one computation
// instead of running it twice against Earth Engine. A change to layers.json
// ships with a new deploy and an empty cache; an asset updated in place reaches
// the panel within the TTL. Single-instance only (module scope), like
// lib/mapa/tileCache.ts.

import { createHash } from 'node:crypto'

export const RESULT_CACHE_TTL_MS = 12 * 60 * 60 * 1000   // 12 hours
export const RESULT_CACHE_MAX_ENTRIES = 500

interface Entry {
  value:   unknown
  expires: number
}

const cache = new Map<string, Entry>()
const inFlight = new Map<string, Promise<unknown>>()

/**
 * The key of one answer. The geometry goes in as a digest: the biome's
 * coordinates are 2 MB of JSON, too much to keep as a key 500 times.
 */
export function resultCacheKey(layerId: string, temporalDate: string | undefined, geometry: unknown): string {
  const digest = createHash('sha1').update(JSON.stringify(geometry)).digest('hex')
  return `${layerId}:${temporalDate ?? 'static'}:${digest}`
}

/**
 * The cached answer under `key`, or `compute()`'s, kept for the next request.
 * A failure is not kept: it reaches every request waiting on it and the next
 * one computes again.
 */
export async function withResultCache<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit) {
    if (Date.now() <= hit.expires) return hit.value as T
    cache.delete(key)
  }

  const pending = inFlight.get(key)
  if (pending) return pending as Promise<T>

  const request = compute()
    .then((value) => {
      cache.set(key, { value, expires: Date.now() + RESULT_CACHE_TTL_MS })
      // Bound memory: drop the oldest inserted entry when over capacity.
      if (cache.size > RESULT_CACHE_MAX_ENTRIES) {
        const oldest = cache.keys().next().value
        if (oldest !== undefined) cache.delete(oldest)
      }
      return value
    })
    .finally(() => inFlight.delete(key))

  inFlight.set(key, request)
  return request
}

/** Empties the cache; for tests. */
export function clearResultCache(): void {
  cache.clear()
  inFlight.clear()
}
