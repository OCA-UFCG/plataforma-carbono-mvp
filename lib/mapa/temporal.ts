// Stops of a time-navigable layer. A single source for the store, which picks
// the opening year, and for the date control, which draws the slider.

import type { LayerConfig } from '@/types/mapa'

export interface TemporalConfig {
  dateRange: [string, string]
  dates?:    string[]
}

/**
 * Available years, in ascending order, as ISO dates of January 1st.
 * Series with gaps declare `dates`; the rest fill the interval.
 */
export function paradas(temporal: TemporalConfig): string[] {
  if (temporal.dates?.length) return [...temporal.dates].sort()
  const ini = Number(temporal.dateRange[0].slice(0, 4))
  const fim = Number(temporal.dateRange[1].slice(0, 4))
  if (!Number.isInteger(ini) || !Number.isInteger(fim) || fim < ini) return []
  return Array.from({ length: fim - ini + 1 }, (_, i) => `${ini + i}-01-01`)
}

/**
 * Year the layer opens on. It is the most recent one, not the first, so that
 * turning a layer on shows the same picture it showed before it gained time.
 */
export function paradaInicial(temporal: TemporalConfig): string | undefined {
  const lista = paradas(temporal)
  return lista[lista.length - 1]
}

/**
 * The time block of a layer: `gee.temporal` for the GEE rasters, `temporal`
 * for the emissions layers, which have no GEE block.
 */
export function layerTemporal(layer: LayerConfig): TemporalConfig | undefined {
  if (layer.type === 'raster') return layer.gee?.temporal
  if (layer.type === 'emissions') return layer.temporal
  return undefined
}

/** Label of a stop. */
export function ano(parada: string): string {
  return parada.slice(0, 4)
}

/** The slider's thumb (Figma 19481:12700), and the gap between it and the year label. */
const THUMB_PX = 20
const LABEL_GAP_PX = 5

/**
 * Which side of the thumb the year label rides on. Figma draws it on the
 * left; near the first years there is no room there, so it moves right, and
 * on a track too short for either side it takes the roomier one. `fraction`
 * is the stop's place along the track, from 0 to 1. Before the track is
 * measured (the server render), it stays where the design puts it.
 */
export function labelSide(fraction: number, trackWidth: number, labelWidth: number): 'left' | 'right' {
  if (trackWidth <= 0) return 'left'
  const thumbLeft = fraction * (trackWidth - THUMB_PX)
  const left = thumbLeft - LABEL_GAP_PX
  const right = trackWidth - thumbLeft - THUMB_PX - LABEL_GAP_PX
  if (left >= labelWidth) return 'left'
  if (right >= labelWidth) return 'right'
  return left >= right ? 'left' : 'right'
}
