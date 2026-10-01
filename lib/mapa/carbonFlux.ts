// Direction of a signed carbon flux, and how it reads on screen.
//
// The source datasets follow the atmospheric convention: a net flux is
// negative where removals beat emissions. Read straight off the raster, an
// area that sequestered carbon shows up as a minus sign, which is the opposite
// of what it deserves. So the panel drops the sign, keeps the magnitude, and
// carries the meaning in a word, an arrow and a color instead.
//
// The word and the arrow are not decoration next to the color: red and green
// is the worst possible pair for deuteranopia, and WCAG 1.4.1 forbids color as
// the only carrier of meaning. Whoever cannot tell the two apart reads the
// label.
//
// Only layers declaring `signedFlux` in config/mapa/layers.json go through
// here; a stock or a gross flux has no sign to hide.

import { PT_TEXT, type MapaText } from '@/lib/mapa/text'

export type FluxDirection = 'emission' | 'removal' | 'neutral' | 'unknown'

export interface FluxDescription {
  /** Absolute value: never negative, so the panel never renders a minus. */
  magnitude: number
  direction: FluxDirection
  /** UI string for a measured value, e.g. "sequestrou". Empty when unknown. */
  label: string
  /**
   * UI string for a range end, e.g. "sequestro". The legend labels a scale,
   * not an event, so the verb of `label` would read wrong there.
   */
  noun: string
  arrow: string
}

/** The four colors `fluxInk` picks from, the only slice of the theme it needs. */
export type FluxInkColors = {
  emissionInk: string
  removalInk:  string
  text:        string
  dim:         string
}

/**
 * Splits a signed flux into a magnitude and a direction, with no words: what a
 * caller with no `MapaText` at hand (the Territórios story) needs.
 *
 * Nodata arrives here as NaN (and an absent statistic as undefined), which is
 * why it gets its own direction: calling it 'neutral' would print "em
 * equilíbrio" over a measurement that was never made.
 */
export function fluxDirection(value: number): Pick<FluxDescription, 'magnitude' | 'direction'> {
  if (!Number.isFinite(value)) return { magnitude: NaN, direction: 'unknown' }
  if (value > 0) return { magnitude: value, direction: 'emission' }
  if (value < 0) return { magnitude: -value, direction: 'removal' }
  return { magnitude: 0, direction: 'neutral' }
}

/** `fluxDirection` with the words the panel prints for it, in the language of `tx`. */
export function describeFlux(value: number, tx: MapaText = PT_TEXT): FluxDescription {
  const { magnitude, direction } = fluxDirection(value)
  if (direction === 'unknown') return { magnitude, direction, label: '', noun: '', arrow: '' }
  return {
    magnitude,
    direction,
    arrow: direction === 'emission' ? '↑' : direction === 'removal' ? '↓' : '',
    label: tx.t(`MapaResults.flux.${direction}.label`),
    noun:  tx.t(`MapaResults.flux.${direction}.noun`),
  }
}

/** Text color for a flux direction. A value with no direction stays neutral. */
export function fluxInk(direction: FluxDirection, colors: FluxInkColors): string {
  switch (direction) {
    case 'emission': return colors.emissionInk
    case 'removal':  return colors.removalInk
    case 'neutral':  return colors.text
    case 'unknown':  return colors.dim
  }
}

/**
 * Where the value zero sits along a `[min, max]` range, as a 0..1 fraction, or
 * null when the range never crosses zero (or is degenerate, which would divide
 * by zero). The legend uses it to mark the equilibrium on the gradient bar.
 */
export function zeroPosition(min: number, max: number): number | null {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  if (max <= min) return null
  if (min > 0 || max < 0) return null
  return (0 - min) / (max - min)
}
