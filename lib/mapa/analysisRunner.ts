// The single place that turns a selected geometry into layer results.
//
// Deciding which layers still owe an answer (pendingAnalyses), resolving the
// temporal stop, reading the cache, picking between zonal stats, a time series
// and a point value, and writing the outcome to the store -- used to be copied
// at four points of MapView.tsx, each of which measured only the topmost
// visible raster. Multiplying four copies by N layers was not viable, so it
// lives here and every caller is one line.

import type { LayerResult, RasterLayerConfig, RasterStatsResult, SelectedGeometry } from '@/types/mapa'
import { getRasterPointValue } from '@/lib/mapa/getRasterPointValue'
import { getRasterStats, getTemporalTimeSeries } from '@/lib/mapa/getRasterStats'
import { resolvePixelValue } from '@/lib/mapa/resolvePixelValue'
import { useStore } from '@/lib/mapa/store'

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

/** Fast, collision-resistant-enough hash of the coordinate JSON. */
export function geomHash(geom: GeoJSON.Geometry): string {
  const str = JSON.stringify('coordinates' in geom ? geom.coordinates : geom)
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return String(h >>> 0)
}

export function statsCacheKey(
  layerId: string,
  dateOrStatic: string | undefined,
  geometry: GeoJSON.Geometry,
): string {
  return `${layerId}:${dateOrStatic ?? 'static'}:${geomHash(geometry)}`
}

/** A point series covers every stop at once, so the date is not part of the key. */
export function timeSeriesCacheKey(layerId: string, lon: number, lat: number): string {
  return `timeseries:${layerId}:${lon}:${lat}`
}

// Discards superseded responses. It was a ref inside MapView while one click
// meant one request; a fan-out has no other way to share it.
let analysisSeq = 0
export function bumpAnalysisSeq(): number { return ++analysisSeq }
export function currentAnalysisSeq(): number { return analysisSeq }

/** A result the caches can answer with, without touching the network. */
function cachedResult(
  layer: RasterLayerConfig,
  geom: SelectedGeometry,
  date: string | undefined,
): LayerResult | null {
  const s = useStore.getState()
  const base = { layerId: layer.id, date, stats: null, pixelValue: null, error: null }

  if (geom.geometryType === 'polygon') {
    const hit = s.statsCache[statsCacheKey(layer.id, date, geom.geometry)]
    return hit ? { ...base, status: 'ready', stats: hit } : null
  }

  if (layer.gee?.temporal) {
    const hit = s.statsCache[timeSeriesCacheKey(layer.id, geom.lon!, geom.lat!)]
    return hit ? { ...base, status: 'ready', stats: hit } : null
  }

  // pixelCache stores `null` for a point over nodata, which is a real answer:
  // only `undefined` means the question was never asked.
  const hit = s.pixelCache[statsCacheKey(layer.id, date, geom.geometry)]
  return hit !== undefined ? { ...base, status: 'ready', pixelValue: hit } : null
}

/**
 * Measure one layer over one geometry and write its card.
 *
 * Also the retry entry point: a failed card calls it again for that layer
 * alone, which is why the sequence number is a parameter rather than taken
 * from the module -- a retry joins the current analysis instead of starting one.
 */
export async function runLayerAnalysis(
  layer: RasterLayerConfig,
  geom:  SelectedGeometry,
  date:  string | undefined,
  seq:   number,
): Promise<void> {
  const base = { layerId: layer.id, date, stats: null, pixelValue: null, error: null }

  const land = (result: LayerResult) => {
    if (seq !== analysisSeq) return   // superseded by a newer selection
    useStore.getState().setLayerResult(result)
  }

  const cached = cachedResult(layer, geom, date)
  if (cached) { land(cached); return }

  land({ ...base, status: 'loading' })

  try {
    if (geom.geometryType === 'polygon') {
      const stats = await getRasterStats(layer, {
        type: 'Feature',
        geometry: geom.geometry as
          | { type: 'Polygon';      coordinates: number[][][] }
          | { type: 'MultiPolygon'; coordinates: number[][][][] },
        properties: {},
      }, date)
      const key = statsCacheKey(layer.id, date, geom.geometry)
      useStore.setState((s) => ({ statsCache: { ...s.statsCache, [key]: stats } }))
      land({ ...base, status: 'ready', stats })
      return
    }

    const { lon, lat } = geom
    if (lon === undefined || lat === undefined) return

    if (layer.gee?.temporal) {
      const series = await getTemporalTimeSeries(layer, lon, lat)
      const stats: RasterStatsResult = { kind: 'timeseries', series }
      const key = timeSeriesCacheKey(layer.id, lon, lat)
      useStore.setState((s) => ({ statsCache: { ...s.statsCache, [key]: stats } }))
      land({ ...base, status: 'ready', stats })
      return
    }

    const raw = await getRasterPointValue(layer, lon, lat, date)
    const pixelValue = raw === null ? null : resolvePixelValue(layer, raw)
    const key = statsCacheKey(layer.id, date, geom.geometry)
    useStore.setState((s) => ({ pixelCache: { ...s.pixelCache, [key]: pixelValue } }))
    land({ ...base, status: 'ready', pixelValue })
  } catch (err) {
    console.error(`[analysisRunner] ${layer.id}`, err)
    const pointValue = geom.geometryType === 'point' && !layer.gee?.temporal
    land({
      ...base,
      status: 'error',
      error: pointValue
        ? 'Falha ao obter o valor do pixel. Tente novamente.'
        : 'Falha ao calcular estatísticas. Tente novamente.',
    })
  }
}

/**
 * Measure every visible raster that still owes an answer.
 *
 * No `Promise.all`: a reduction over a large recorte can take tens of seconds,
 * and a slow layer must not hold back a fast one. Each card lands on its own.
 */
export function runVisibleRasterAnalyses(geom: SelectedGeometry, seq: number): void {
  const state = useStore.getState()
  const rasters = state.layers.filter(
    (l): l is RasterLayerConfig => l.type === 'raster' && l.visible,
  )

  for (const { layer, date } of pendingAnalyses({
    rasters,
    temporalDate:     state.temporalDate,
    results:          state.results,
    fetchedTileUrls:  state.fetchedTileUrls,
    temporalTileUrls: state.temporalTileUrls,
  })) {
    void runLayerAnalysis(layer, geom, date, seq)
  }
}
