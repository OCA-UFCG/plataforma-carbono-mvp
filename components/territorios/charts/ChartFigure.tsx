// Shared frame and helpers of the Territórios charts. Every chart is a
// <figure> whose visually hidden caption is its accessible text; the drawing,
// whose labels only repeat that text, is hidden from screen readers.

import type { CSSProperties, ReactNode } from 'react'
import { contrast } from '@/lib/color'
import { MARK_OUTLINE_COLOR, SURFACE_COLOR } from '@/config/territorios/palette'
import { fixed, type Fmt } from '@/lib/territorios/i18n'
import { formatPercent } from '@/lib/territorios/storyValues'
import '@/app/territorios-graficos.css'

const INK = '#001d27'

export function ChartFigure({ description, className, children }: {
  description: string
  className?:  string
  children:    ReactNode
}) {
  return (
    <figure className={className ? `tg-chart ${className}` : 'tg-chart'}>
      <figcaption className="tg-sr">{description}</figcaption>
      <div className="tg-graphic" aria-hidden="true">{children}</div>
    </figure>
  )
}

/** Inset outline for a fill below 3:1 on the surface (WCAG 1.4.11); none otherwise. */
export function outlineOf(fill: string): string | undefined {
  return contrast(fill, SURFACE_COLOR) < 3 ? `inset 0 0 0 1px ${MARK_OUTLINE_COLOR}` : undefined
}

/**
 * Text over a fill: the page ink or white, whichever reads better, or pure
 * black when neither reaches 4.5:1. Nível 3 (#b85d4b) gives white 4.46:1 and
 * the ink 3.90:1, where black reaches 4.71:1.
 */
export function inkOn(fill: string): string {
  const onInk = contrast(INK, fill)
  const onWhite = contrast('#ffffff', fill)
  if (Math.max(onInk, onWhite) >= 4.5) return onInk >= onWhite ? INK : '#ffffff'
  return contrast('#000000', fill) >= onWhite ? '#000000' : '#ffffff'
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Position of a value on a 0..max scale, in percent; a value past either end sits on it. */
export function scalePct(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0
  return round2(Math.min(Math.max(value / max, 0), 1) * 100)
}

/**
 * Places a block label at a spot of its row: starting there in the left half,
 * ending there in the right half. The label then wraps instead of leaving the
 * row, whatever the value, including 0 and the maximum.
 */
export function anchorAt(pct: number): CSSProperties {
  return pct <= 50
    ? { paddingLeft: `${pct}%` }
    : { paddingRight: `${round2(100 - pct)}%`, textAlign: 'right' }
}

/** Custom properties for the stylesheet, which does the clamping with them. */
export function cssVars(vars: Record<`--${string}`, string>): CSSProperties {
  return vars as CSSProperties
}

/**
 * A share (0..100) as the charts print it, rounded as the sentence beside
 * them: "40%", "2,5%", "< 0,1%" for a positive share below 0,1, "0%". Adapted
 * from `percentShort` in lib/mapa/results/format.ts (commit c5eab2a, branch
 * feat/resultados-por-camada).
 */
export function formatShare(pct: number, fmt: Fmt): string {
  if (!Number.isFinite(pct) || pct <= 0) return '0%'
  if (pct < 0.1) return fmt.t('values.lessThanShare', { value: fixed(0.1, 1, fmt.locale) })
  return formatPercent(Math.min(pct, 100), fmt)
}
