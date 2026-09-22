// The single place that turns a selected geometry into layer results.
//
// The compute block -- resolve the temporal stop, read the cache, pick between
// zonal stats, a time series and a point value, write the outcome -- used to be
// copied at four points of MapView.tsx, each of which measured only the topmost
// visible raster. Multiplying four copies by N layers was not viable, so it
// lives here and every caller is one line.

import type { LayerResult, RasterLayerConfig } from '@/types/mapa'

export interface PendingAnalysis {
  layer: RasterLayerConfig
  /** Temporal stop to measure; undefined for a static layer. */
  date?: string
}

export interface PendingAnalysesInput {
  /** Visible rasters, topmost first. */
  rasters:          RasterLayerConfig[]
  temporalDate:     Record<string, string>
  results:          Record<string, LayerResult>
  fetchedTileUrls:  Record<string, string>
  temporalTileUrls: Record<string, Record<string, string>>
}

/**
 * Which layers still owe an answer for the current selection.
 *
 * Pure, and the only rule-holder for when a request is sent: a fresh click
 * clears `results` and gets every layer back, while a layer toggled on or a
 * year stepped returns just that one. Both paths call it, so they cannot drift.
 */
export function pendingAnalyses(input: PendingAnalysesInput): PendingAnalysis[] {
  const { rasters, temporalDate, results, fetchedTileUrls, temporalTileUrls } = input
  const out: PendingAnalysis[] = []

  for (const layer of rasters) {
    const temporal = !!layer.gee?.temporal
    const date = temporal ? temporalDate[layer.id] : undefined

    // A temporal layer with no stop selected has nothing to measure. The stop
    // arrives with activateDynamicLayer, and the effect runs again.
    if (temporal && !date) continue

    // A GEE layer cannot be measured before its tile request resolved: the
    // stats route would answer for an asset the map is not showing yet.
    if (layer.source === 'gee') {
      const tileReady = date
        ? !!temporalTileUrls[layer.id]?.[date]
        : !!fetchedTileUrls[layer.id]
      if (!tileReady) continue
    }

    // A result already covering this stop is not recomputed -- and that
    // includes a failed one. Retry belongs to the card's button; retrying here
    // would fire again on every render after the failure.
    const current = results[layer.id]
    if (current && current.date === date) continue

    out.push({ layer, date })
  }

  return out
}
