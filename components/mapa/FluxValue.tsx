'use client'

import { describeFlux, fluxInk } from '@/lib/mapa/carbonFlux'
import type { PlatformTheme } from '@/types/mapa'

interface Props {
  /** Signed flux, as the raster stores it: negative where carbon was removed. */
  value: number
  unit?: string
  theme: PlatformTheme
  /** Font size of the magnitude; the rest of the block scales off it. */
  size: number
  /**
   * Formats the magnitude. The digit rules belong to the surface (the pixel
   * card wants four decimals, the statistics grid adapts to the order of
   * magnitude), and it also owns how a non-finite value reads.
   */
  format: (magnitude: number) => string
}

/**
 * A signed carbon flux as the panel shows it: the magnitude with no sign, in
 * the emission red or the removal green, behind an arrow and above the word
 * that names the direction ("emitiu" / "sequestrou").
 *
 * The arrow and the word are not decoration beside the color. Red against
 * green is the worst possible pair for deuteranopia, so for part of the
 * audience the label is the only thing carrying the meaning.
 */
export default function FluxValue({ value, unit, theme, size, format }: Props) {
  const flux = describeFlux(value)
  const ink = fluxInk(flux.direction, theme.colors)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        {/* Hidden from assistive tech: the word right below already says it. */}
        {flux.arrow && (
          <span aria-hidden style={{ fontSize: size * 0.62, fontWeight: 800, color: ink, lineHeight: 1 }}>
            {flux.arrow}
          </span>
        )}
        <span style={{
          fontSize: size, fontWeight: 800, color: ink,
          lineHeight: 1.05, fontVariantNumeric: 'tabular-nums',
        }}>
          {format(flux.magnitude)}
        </span>
        {unit && (
          <span style={{
            fontSize: Math.max(11, Math.round(size * 0.47)),
            fontWeight: 700, color: theme.colors.accent,
          }}>
            {unit}
          </span>
        )}
      </div>
      {flux.label && (
        <span style={{ fontSize: size >= 24 ? 11.5 : 10, fontWeight: 700, color: ink }}>
          {flux.label}
        </span>
      )}
    </div>
  )
}
