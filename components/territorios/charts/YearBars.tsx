// One thin bar per year, as tall as the share of the area that burned that
// year, with the year of most fire labelled above its bar and the Caatinga's
// yearly mean as a line across the plot.

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
  description: string
}

const round2 = (n: number) => Math.round(n * 100) / 100

export default function YearBars({ years, peakYear, reference, color, description }: YearBarsProps) {
  const count = years.length
  const at = years.findIndex((y) => y.year === peakYear)
  const peak = at >= 0 ? years[at] : null
  const max = chartMax(peak?.sharePct ?? 0, reference)
  const refPct = reference === null ? null : scalePct(reference, max)

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
      {count > 0 && (
        <div className="tg-strip-ends tg-num">
          <span>{years[0].year}</span>
          {count > 1 && <span>{years[count - 1].year}</span>}
        </div>
      )}
    </ChartFigure>
  )
}
