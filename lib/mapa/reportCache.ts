// In-memory cache of measured analyses, in the shape of tileCache.ts.
//
// Regenerating the same report for the same recorte, year and layer is the
// common case — someone reloads the tab, or prints after reading — and each
// miss is two Earth Engine reductions.
//
// Only the measurement is cached: the year's snapshot and the series, which are
// the same numbers in every language. The descriptor and the narrative are
// written per request in the reader's language, from the cached numbers, so a
// second reader in English costs no reduction and an entry serves both locales.

import type { RasterStatsResult, TimeSeriesPoint } from '@/types/mapa'

/** What Earth Engine answered for one analysis. */
export interface ReportMeasurement {
  snapshot: RasterStatsResult
  /** Empty for a static layer or a failed series. */
  series:   TimeSeriesPoint[]
}

const TTL_MS = 90 * 60 * 1000
// Bound memory, as tileCache.ts does. The key space here is recorte x
// feature x year x layer across 3,280 features, and each entry holds a full
// snapshot and series rather than a tile URL, so it is worth capping
// explicitly instead of only relying on the read-time sweep.
const MAX_ENTRIES = 500

interface Entry {
  measurement: ReportMeasurement
  expiresAt:   number
}

const cache = new Map<string, Entry>()

/**
 * `year` is the year measured, null for a static layer: a static layer's
 * snapshot is the same whatever year the report was asked for.
 */
export function measurementCacheKey(
  recorteId: string,
  feicaoId: string,
  year: string | null,
  layerId: string,
): string {
  return `${recorteId}|${feicaoId}|${year ?? 'static'}|${layerId}`
}

export function getCachedMeasurement(key: string): ReportMeasurement | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return undefined
  }
  return entry.measurement
}

/**
 * Only a successful measurement gets here. A failed one is not cached: the
 * cause is usually transient (a timeout, a rate limit upstream), and caching it
 * would hold a broken section for ninety minutes.
 */
export function setCachedMeasurement(key: string, measurement: ReportMeasurement): void {
  cache.set(key, { measurement, expiresAt: Date.now() + TTL_MS })
  // Evict the oldest inserted entry when over capacity, mirroring
  // tileCache.ts's eviction.
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}
