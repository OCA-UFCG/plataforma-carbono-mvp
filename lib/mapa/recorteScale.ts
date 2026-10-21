// The color scale of a continuous raster inside one feature of a recorte: what
// the map recolors with and the legend prints while that feature is selected.
// Pure and shared: the server builds it from one reduction (/api/gee/scale),
// and the client keys its caches with the same `recorteScaleKey`.

import type { DataRange } from '@/lib/mapa/dataRange'
import type { LayerConfig, RasterLayerConfig } from '@/types/mapa'

export interface Stretch { min: number; max: number }

/** Same shape as an entry of config/mapa/dataRanges.json, so `dataRangeFor` reads it. */
export type ScaleRange = DataRange | { byYear: Record<string, DataRange> }

export interface ScaleResponse {
  /** Null keeps the biome scale: no valid pixel, or a degenerate spread. */
  stretch: Stretch | null
  /** Real extremes for the legend's ends; null when no year had a pixel. */
  range:   ScaleRange | null
}

/** One year of the reduction; null where the year had no valid pixel. */
export interface YearStats { min: number | null; max: number | null; p2: number | null; p98: number | null }

export type RecorteScaleEntry =
  | { status: 'loading' }
  | { status: 'ready'; stretch: Stretch | null; range: ScaleRange | null }
  | { status: 'error' }

/** The single "year" of a static layer. */
export const STATIC_KEY = 'static'

export function recorteScaleKey(layerId: string, recorteId: string, feicaoIndex: number): string {
  return `${layerId}|${recorteId}|${feicaoIndex}`
}

/** A continuous GEE raster on screen whose colors can follow `recorteId`. */
export function scalesWithRecorte(layer: LayerConfig, recorteId: string): layer is RasterLayerConfig {
  return layer.type === 'raster'
    && layer.visible
    && layer.source === 'gee'
    && layer.colorType === 'continuous'
    && !!layer.gee?.asset
    // The recorte the layer is clipped to already has its scale: the default one.
    && layer.clipToLayerId !== recorteId
}

/** Band name of a year in the stacked image; a band name cannot start with a digit. */
export function bandOf(key: string): string {
  return `y${key}`
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** The reduction's `<band>_min`, `_max`, `_p2` and `_p98` outputs, per year. */
export function parseYearStats(raw: Record<string, unknown> | null, keys: string[]): Record<string, YearStats> {
  const read = (key: string, output: string) => {
    const v = raw?.[`${bandOf(key)}_${output}`]
    return finite(v) ? v : null
  }
  return Object.fromEntries(keys.map((key) => [key, {
    min: read(key, 'min'), max: read(key, 'max'), p2: read(key, 'p2'), p98: read(key, 'p98'),
  }]))
}

interface ScaleLayer {
  signedFlux?: boolean
  gee?: { visParams?: { min?: number; max?: number } }
}

export function recorteScale(layer: ScaleLayer, byYear: Record<string, YearStats>): ScaleResponse {
  const years = Object.entries(byYear)

  const ranges: Record<string, DataRange> = {}
  for (const [year, s] of years) {
    if (finite(s.min) && finite(s.max)) ranges[year] = { min: s.min, max: s.max }
  }
  const range: ScaleRange | null = STATIC_KEY in byYear
    ? ranges[STATIC_KEY] ?? null
    : Object.keys(ranges).length > 0 ? { byYear: ranges } : null

  const lows = years.map(([, s]) => s.p2).filter(finite)
  const highs = years.map(([, s]) => s.p98).filter(finite)
  if (lows.length === 0 || highs.length === 0) return { stretch: null, range }

  return { stretch: stretchOf(layer, Math.min(...lows), Math.max(...highs)), range }
}

function stretchOf(layer: ScaleLayer, low: number, high: number): Stretch | null {
  if (!(low < high)) return null

  // A signed flux's palette puts its neutral white where zero falls on the
  // biome scale (a quarter of the way on -100..300). Scaling both ends by one
  // factor keeps zero there, and on the bar even when the feature only emits
  // or only removes.
  const min = layer.gee?.visParams?.min
  const max = layer.gee?.visParams?.max
  if (layer.signedFlux && finite(min) && finite(max) && min < 0 && max > 0) {
    const k = Math.max(low / min, high / max)
    return { min: min * k, max: max * k }
  }
  return { min: low, max: high }
}
