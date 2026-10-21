// A continuous raster drawn by feature of the finest recorte on (Municípios
// over Estados): each feature filled with its mean value, on a legend running
// from the lowest to the highest feature value. Pure and shared: the server
// builds the values (/api/gee/choropleth); MapView and the legend read them
// through the same rules here, so the legend never describes colors the map
// is not showing.

import type { ExpressionSpecification } from 'maplibre-gl'
import type { LayerConfig, RasterLayerConfig, VectorLayerConfig } from '@/types/mapa'

/** The single "year" of a static layer. */
export const STATIC_KEY = 'static'

export interface ChoroplethRange { min: number; max: number }

export interface ChoroplethResponse {
  /** Years "YYYY" of a temporal layer, or [STATIC_KEY]. */
  keys:   string[]
  /** values[k][featureIndex]: the feature's mean in keys[k]; null where it had none. */
  values: (number | null)[][]
  /** Lowest to highest value over every key and feature; null keeps the pixels. */
  range:  ChoroplethRange | null
}

export type ChoroplethEntry =
  | { status: 'loading' }
  | ({ status: 'ready' } & ChoroplethResponse)
  | { status: 'error' }

export function choroplethKey(layerId: string, recorteId: string): string {
  return `${layerId}|${recorteId}`
}

/** Band name of a year in the stacked image; a band name cannot start with a digit. */
export function bandOf(key: string): string {
  return `y${key}`
}

/** Four significant digits: plenty for a color, and a fraction of the payload. */
export function roundValue(v: number): number {
  return Number(v.toPrecision(4))
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** A raster that can be drawn by feature: continuous, from Earth Engine, a quantity rather than a rendering. */
export function isChoroplethLayer(layer: LayerConfig): layer is RasterLayerConfig {
  return layer.type === 'raster'
    && layer.colorType === 'continuous'
    && layer.source === 'gee'
    && !!layer.gee?.asset
    && layer.analysis !== false
}

/**
 * The recorte a visible raster is drawn by: the visible vector declaring
 * `choropleth` with the highest pickPriority. Territories declare none: they
 * cover parts of the biome only.
 */
export function choroplethRecorte(layers: LayerConfig[], layer: LayerConfig): VectorLayerConfig | null {
  if (!layer.visible || !isChoroplethLayer(layer)) return null
  let finest: VectorLayerConfig | null = null
  for (const candidate of layers) {
    if (candidate.type !== 'vector' || !candidate.visible || !candidate.choropleth) continue
    if (!finest || (candidate.pickPriority ?? 0) > (finest.pickPriority ?? 0)) finest = candidate
  }
  return finest
}

interface RangeLayer {
  signedFlux?: boolean
  gee?: { visParams?: { min?: number; max?: number } }
}

/**
 * Lowest to highest value over every year and feature, so a color means the
 * same value in every year. A signed flux's palette puts its white where zero
 * falls on the biome scale (a quarter of the way on -100..300): both biome ends
 * scaled by one factor keep zero there, and on the bar even when every feature
 * only emits or only removes.
 */
export function choroplethRange(layer: RangeLayer, values: (number | null)[][]): ChoroplethRange | null {
  let low = Infinity
  let high = -Infinity
  for (const row of values) {
    for (const v of row) {
      if (!finite(v)) continue
      if (v < low) low = v
      if (v > high) high = v
    }
  }
  if (!(low < high)) return null

  const min = layer.gee?.visParams?.min
  const max = layer.gee?.visParams?.max
  if (layer.signedFlux && finite(min) && finite(max) && min < 0 && max > 0) {
    const k = Math.max(low / min, high / max)
    return { min: min * k, max: max * k }
  }
  return { min: low, max: high }
}

/**
 * Fill color for a feature-state value: the palette's colors spread evenly
 * from range.min to range.max, as the raster stretches them. A feature without
 * a value gets no fill rather than the palette's first color.
 */
export function choroplethColor(palette: string[], range: ChoroplethRange, stateKey: string): ExpressionSpecification {
  const value: ExpressionSpecification = ['feature-state', stateKey]
  const step = palette.length > 1 ? (range.max - range.min) / (palette.length - 1) : 0
  const stops = palette.flatMap((color, i) => [range.min + step * i, color])
  return [
    'case',
    ['==', ['typeof', value], 'number'],
    ['interpolate', ['linear'], value, ...stops] as unknown as ExpressionSpecification,
    'rgba(0, 0, 0, 0)',
  ]
}

export interface ChoroplethView {
  recorte: VectorLayerConfig
  caption: string
  palette: string[]
  range:   ChoroplethRange
  /** The year on screen's values, by feature index. */
  values:  (number | null)[]
}

/** What a raster shows by feature right now; null when it shows its pixels. */
export function choroplethView(
  layers: LayerConfig[],
  layer: LayerConfig,
  choropleths: Record<string, ChoroplethEntry>,
  temporalDate?: string,
): ChoroplethView | null {
  const recorte = choroplethRecorte(layers, layer)
  const palette = layer.type === 'raster' ? layer.gee?.visParams?.palette : undefined
  if (!recorte?.choropleth || !palette || palette.length < 2) return null

  const entry = choropleths[choroplethKey(layer.id, recorte.id)]
  if (entry?.status !== 'ready' || !entry.range) return null
  const k = entry.keys.indexOf(temporalDate ? temporalDate.slice(0, 4) : STATIC_KEY)
  if (k < 0) return null

  return { recorte, caption: recorte.choropleth.caption, palette, range: entry.range, values: entry.values[k] }
}

/** The caption of a scale still being computed for this raster, from the moment its recorte is on. */
export function choroplethPending(
  layers: LayerConfig[],
  layer: LayerConfig,
  choropleths: Record<string, ChoroplethEntry>,
): string | null {
  const recorte = choroplethRecorte(layers, layer)
  if (!recorte?.choropleth) return null
  const entry = choropleths[choroplethKey(layer.id, recorte.id)]
  return !entry || entry.status === 'loading' ? recorte.choropleth.caption : null
}

/** Drop one recorte's failures, so turning it on again asks again. */
export function withoutChoroplethErrors(
  choropleths: Record<string, ChoroplethEntry>,
  recorteId: string,
): Record<string, ChoroplethEntry> {
  const suffix = `|${recorteId}`
  return Object.fromEntries(Object.entries(choropleths)
    .filter(([key, entry]) => !(key.endsWith(suffix) && entry.status === 'error')))
}
