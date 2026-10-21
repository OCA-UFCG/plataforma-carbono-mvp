// Warms the map by feature when the server starts (instrumentation.ts): every
// continuous layer of the panel by every choropleth recorte, one at a time, so
// the first reader after a deploy does not wait ~20 s per layer over the
// municipalities. The cache lives in memory, so every start pays it again in
// the background -- about 10 minutes of Earth Engine time. A request for a
// layer still being warmed joins that computation (computeChoropleth's
// in-flight dedupe).

import 'server-only'

import appConfig from '@/config/mapa/layers.json'
import { initGee } from '@/lib/mapa/geeAuth'
import { choroplethKey, isChoroplethLayer } from '@/lib/mapa/choropleth'
import { computeChoropleth } from '@/lib/mapa/choroplethService'
import type { LayerConfig, RasterLayerConfig } from '@/types/mapa'

export interface PrewarmJob {
  layer:     RasterLayerConfig
  recorteId: string
}

interface PrewarmLog {
  info:  (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/** Every layer the panel can draw by feature, by every recorte, the finest recorte first. */
export function choroplethPrewarmJobs(): PrewarmJob[] {
  const layers = appConfig.layers as LayerConfig[]
  const recortes = layers
    .filter((l) => l.type === 'vector' && !!l.choropleth)
    .sort((a, b) => (b.type === 'vector' ? b.pickPriority ?? 0 : 0) - (a.type === 'vector' ? a.pickPriority ?? 0 : 0))
  const rasters = layers.filter((l): l is RasterLayerConfig => isChoroplethLayer(l) && !l.hidden)
  return recortes.flatMap((recorte) => rasters.map((layer) => ({ layer, recorteId: recorte.id })))
}

/**
 * Compute every job in turn, never two at once: a burst would compete with the
 * readers' own requests for the same Earth Engine quota. A failed job is
 * logged and skipped; the readers' requests retry it on demand.
 */
export async function prewarmChoropleths(
  jobs: PrewarmJob[] = choroplethPrewarmJobs(),
  log: PrewarmLog = console,
): Promise<{ ok: number; failed: number }> {
  const outcome = { ok: 0, failed: 0 }
  try {
    await initGee()
  } catch (err) {
    log.error('[choropleth prewarm] Earth Engine unavailable:', err)
    return outcome
  }

  const t0 = Date.now()
  for (const { layer, recorteId } of jobs) {
    const started = Date.now()
    try {
      await computeChoropleth(choroplethKey(layer.id, recorteId), layer, recorteId)
      outcome.ok++
      // One line per layer: the time against GEE_TIMEOUT_MS shows any drift
      // before readers start getting 500s.
      log.info(`[choropleth prewarm] ${layer.id} by ${recorteId}: ${((Date.now() - started) / 1000).toFixed(1)} s`)
    } catch (err) {
      outcome.failed++
      log.error(`[choropleth prewarm] ${layer.id} by ${recorteId}:`, err)
    }
  }
  log.info(`[choropleth prewarm] ${outcome.ok} warmed, ${outcome.failed} failed in ${Math.round((Date.now() - t0) / 1000)} s`)
  return outcome
}
