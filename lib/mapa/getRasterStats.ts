import type { RasterLayerConfig, RasterStatsResult, TimeSeriesPoint } from '@/types/mapa'
import { useStore } from '@/lib/mapa/store'

// GeoJSON Feature with (Multi)Polygon geometry.
type StatsFeature = {
  type: 'Feature'
  geometry:
    | { type: 'Polygon';      coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] }
  properties?: Record<string, unknown>
}

/**
 * Compute raster stats over a (multi)polygon via /api/gee/stats, either
 * continuous stats or Jenks-categorical counts, per the layer config.
 */
export async function getRasterStats(
  layer: RasterLayerConfig,
  feature: StatsFeature,
  temporalDate?: string,
): Promise<RasterStatsResult> {
  return getGeeStats(layer, feature, temporalDate)
}

// GEE path

// Dedupe concurrent identical stats requests (e.g. a double-click fires two
// clicks before the first response fills the store cache). Keyed by the exact
// request body; the entry is cleared when the request settles.
const inFlightStats = new Map<string, Promise<RasterStatsResult>>()

async function getGeeStats(
  layer: RasterLayerConfig,
  feature: StatsFeature,
  temporalDate?: string,
): Promise<RasterStatsResult> {
  if (!layer.gee?.asset) {
    throw new Error(`GEE layer "${layer.id}" is missing gee.asset`)
  }

  const body = JSON.stringify({
    asset:     layer.gee.asset,
    geometry:  feature.geometry,
    temporalDate,
    // The stats route branches on these three fields:
    //   - classify present  -> Jenks + counts per Jenks class
    //   - colorType === 'categorical' -> frequency histogram on raw image
    //   - otherwise -> continuous stats (mean/median/std/...)
    classify:  layer.gee.classify,
    // Biome-wide Jenks breaks from the tile request, so the chart classes
    // match the map colors instead of being recomputed per feature.
    breaks:    useStore.getState().jenksBreaks[layer.id],
    colorType: layer.colorType,
  })

  const existing = inFlightStats.get(body)
  if (existing) return existing

  const request = (async (): Promise<RasterStatsResult> => {
    const res = await fetch('/api/gee/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      throw new Error(payload?.error ?? `GEE stats API error ${res.status}`)
    }

    const payload = await res.json()
    if (payload.kind === 'categorical') {
      return { kind: 'categorical', areas: payload.areas }
    }
    return { kind: 'continuous', stats: payload.stats, unit: layer.unit }
  })()

  inFlightStats.set(body, request)
  try {
    return await request
  } finally {
    inFlightStats.delete(body)
  }
}

// Temporal time series at a point

/**
 * Fetch the full pixel-value time series at a single [lon, lat] for a
 * temporal GEE ImageCollection. Returns one value per date in the series
 * via a single `/api/gee/timeseries` call.
 */
export async function getTemporalTimeSeries(
  layer: RasterLayerConfig,
  lon: number,
  lat: number,
): Promise<TimeSeriesPoint[]> {
  if (!layer.gee?.asset || !layer.gee.temporal) {
    throw new Error(`Layer "${layer.id}" is not a temporal GEE layer`)
  }

  const res = await fetch('/api/gee/timeseries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset:     layer.gee.asset,
      lon,
      lat,
      dateRange: layer.gee.temporal.dateRange,
    }),
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(payload?.error ?? `GEE timeseries API error ${res.status}`)
  }

  const { series } = await res.json() as { series: TimeSeriesPoint[] }
  return series ?? []
}
