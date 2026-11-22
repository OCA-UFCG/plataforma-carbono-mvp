// One thin bar per year, as tall as the share of the area that burned that
// year, on a percent axis, with the year of most fire labelled above its bar,
// the Caatinga's yearly mean as a line across the plot and every fifth year
// under it.

import type { CSSProperties } from 'react'
import { REFERENCE_COLOR } from '@/config/territorios/palette'
import { chartMax } from '@/lib/territorios/storyValues'
import { ChartFigure, cssVars, formatShare, outlineOf, scalePct } from './ChartFigure'
import '@/app/territorios-graficos.css'

export interface YearBarsProps {
  years:     { year: number; sharePct: number }[]
  /** Year labelled with its value; null when no year has any. */
  peakYear:  number | null
  /** The Caatinga's mean yearly share; null leaves the line out. */
  reference: number | null
  color:     string
  /** Name of the percent axis, along its left edge. */
  axisLabel: string
  description: string
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Decimals a tick step needs to print exactly; 3 when two are not enough. */
function decimalsOf(step: number): number {
  for (let d = 0; d <= 2; d++) {
    const scaled = step * 10 ** d
    if (Math.abs(Math.round(scaled) - scaled) < 1e-6) return d
  }
  return 3
}

/**
 * Marks on the percent axis, 0 to the scale's top: in quarters, or in the
 * fifths, thirds or halves that print with fewer decimals (a top of 5 in
 * quarters would print 1,25 rounded to "1,3").
 */
function axisTicks(max: number): { values: number[]; digits: number } {
  let best = { parts: 4, digits: decimalsOf(max / 4) }
  for (const parts of [5, 3, 2]) {
    const digits = decimalsOf(max / parts)
    if (digits < best.digits) best = { parts, digits }
  }
  const values = Array.from({ length: best.parts + 1 }, (_, i) => (i * max) / best.parts)
  return { values, digits: Math.min(best.digits, 2) }
}

/**
 * Years named under the plot: every fifth one and the last, but not a fifth
 * year so close to the last that their labels would touch.
 */
function labelledYear(year: number, i: number, count: number): boolean {
  return i === count - 1 || (year % 5 === 0 && count - 1 - i >= 5)
}

export default function YearBars({ years, peakYear, reference, color, axisLabel, description }: YearBarsProps) {
  const count = years.length
  const at = years.findIndex((y) => y.year === peakYear)
  const peak = at >= 0 ? years[at] : null
  const max = chartMax(peak?.sharePct ?? 0, reference)
  const refPct = reference === null ? null : scalePct(reference, max)
  const ticks = axisTicks(max)
  const tickLabel = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: ticks.digits, maximumFractionDigits: ticks.digits })

  // Over its bar: from the bar's left edge in the left half, ending at its right edge in the right half.
  const calloutAt: CSSProperties | undefined = at < 0 ? undefined : (at + 0.5) / count <= 0.5
    ? { paddingLeft: `${round2((at / count) * 100)}%` }
    : { paddingRight: `${round2(((count - at - 1) / count) * 100)}%`, textAlign: 'right' }

  return (
    <ChartFigure description={description} className="tg-yearbars">
      {peak && (
        <p className="tg-tag" style={calloutAt}>
          {peak.year}: <b className="tg-num">{formatShare(peak.sharePct)}</b>
        </p>
      )}
      <div className="tg-yearbars-frame">
      <div className="tg-yearbars-axis tg-num">
        {ticks.values.map((t) => (
          <span key={t} style={{ bottom: `${scalePct(t, max)}%` }}>{tickLabel(t)}</span>
        ))}
      </div>
      <div className="tg-yearbars-plot">
        {years.map((y) => {
          const h = scalePct(y.sharePct, max)
          return (
            <span key={y.year} className="tg-yearbars-col" title={`${y.year}: ${formatShare(y.sharePct)}`}>
              {h > 0 && (
                <span className="tg-yearbars-bar" style={{ height: `${h}%`, background: color, boxShadow: outlineOf(color) }} />
              )}
            </span>
          )
        })}
        {refPct !== null && (
          // High on the plot the label goes under the line, or it would rise into the callout.
          <span className={refPct > 60 ? 'tg-yearbars-ref tg-yearbars-ref--high' : 'tg-yearbars-ref'} style={{ ...cssVars({ '--at': `${refPct}%` }), background: REFERENCE_COLOR }}>
            <span className="tg-yearbars-ref-label">Caatinga</span>
          </span>
        )}
      </div>
      <div className="tg-yearbars-years tg-num">
        {years.map((y, i) => labelledYear(y.year, i, count) && (
          <span key={y.year} style={{ left: `${round2(((i + 0.5) / count) * 100)}%` }}>{y.year}</span>
        ))}
      </div>
      <span className="tg-yearbars-unit">{axisLabel}</span>
      </div>
    </ChartFigure>
  )
}
