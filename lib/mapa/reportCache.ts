// In-memory cache of measured analyses, in the shape of tileCache.ts.
//
// Regenerating the same report for the same recorte, year and layer is the
// common case — someone reloads the tab, or prints after reading — and each
// miss is two Earth Engine reductions.

import type { ReportAnalysis } from '@/types/relatorio'

const TTL_MS = 90 * 60 * 1000

interface Entry {
  analysis:  ReportAnalysis
  expiresAt: number
}

const cache = new Map<string, Entry>()

export function analysisCacheKey(
  recorteId: string,
  feicaoId: string,
  year: string,
  layerId: string,
): string {
  return `${recorteId}|${feicaoId}|${year}|${layerId}`
}

export function getCachedAnalysis(key: string): ReportAnalysis | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return undefined
  }
  return entry.analysis
}

export function setCachedAnalysis(key: string, analysis: ReportAnalysis): void {
  // An unavailable analysis is not cached: the cause is usually transient (a
  // timeout, a rate limit upstream), and caching it would hold a broken
  // section for ninety minutes.
  if (analysis.status === 'unavailable') return
  cache.set(key, { analysis, expiresAt: Date.now() + TTL_MS })
}
