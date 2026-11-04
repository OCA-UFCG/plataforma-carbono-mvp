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

// The digest reads the coordinates through a reusable buffer of doubles.
// Stringifying the biome's 2 MB of coordinates took 30 to 60 ms a request,
// hits included; walking the arrays takes about 10 ms and builds no string.
const DIGEST_CHUNK = 4096
const digestChunk = new Float64Array(DIGEST_CHUNK)
const digestBytes = new Uint8Array(digestChunk.buffer)

/**
 * SHA-1 of the geometry's type and coordinates. Every array contributes a
 * marker, its length and then its contents, so two nestings of the same
 * numbers differ. The marker is Infinity, which no JSON number can be.
 */
function geometryDigest(geometry: unknown): string {
  const hash = createHash('sha1')
  let used = 0
  const push = (v: number) => {
    if (used === DIGEST_CHUNK) {
      hash.update(digestBytes)
      used = 0
    }
    digestChunk[used++] = v
  }
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      push(Infinity)
      push(node.length)
      for (let i = 0; i < node.length; i++) walk(node[i])
    } else {
      push(typeof node === 'number' ? node : NaN)
    }
  }

  const { type, coordinates } = (geometry ?? {}) as { type?: unknown; coordinates?: unknown }
  hash.update(String(type))
  walk(coordinates)
  hash.update(digestBytes.subarray(0, used * 8))
  return hash.digest('hex')
}

/**
 * The key of one answer. The geometry goes in as a digest: the biome's
 * coordinates are 2 MB of JSON, too much to keep as a key 500 times.
 */
export function resultCacheKey(layerKey: string, temporalDate: string | undefined, geometry: unknown): string {
  return `${layerKey}:${temporalDate ?? 'static'}:${geometryDigest(geometry)}`
}

/**
 * The cached answer under `key`, or `compute()`'s, kept for the next request.
 * A failure is not kept: it reaches every request waiting on it and the next
 * one computes again.
 */
export async function withResultCache<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit) {
    if (Date.now() <= hit.expires) {
      // Re-inserted as the newest entry, so eviction drops the one used least
      // recently; the expiry stays the one of the computation.
      cache.delete(key)
      cache.set(key, hit)
      return hit.value as T
    }
    cache.delete(key)
  }

  const pending = inFlight.get(key)
  if (pending) return pending as Promise<T>

  const request = compute()
    .then((value) => {
      cache.set(key, { value, expires: Date.now() + RESULT_CACHE_TTL_MS })
      // Bound memory: drop the least recently used entry when over capacity.
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
