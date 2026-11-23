// The year's rainfall against the three classes of the territory's own mean:
// dry, normal and rainy as three equal bands, each with its limits in mm, and
// a marker under the band the year falls in. Inside a band the marker follows
// the value, between the band's limits and the driest and rainiest years of
// the series at the two open ends.

import { RAIN_COLORS } from '@/config/territorios/palette'
import type { RainYearKind } from '@/types/territorios'
import { ChartFigure, cssVars, outlineOf } from './ChartFigure'
import '@/app/territorios-graficos.css'

export interface RainClassBarProps {
  valueMm:  number
  /** The class limits: below `lowMm` dry, above `highMm` rainy. */
  lowMm:    number
  highMm:   number
  /** The driest and rainiest years of the series, the bar's two ends. */
  minMm:    number
  maxMm:    number
  bands:    Record<RainYearKind, { name: string; range: string }>
  /** Under the marker: "Território", or "Caatinga" on the biome. */
  markerLabel: string
  description: string
}

const KINDS: RainYearKind[] = ['seco', 'normal', 'chuvoso']
const THIRD = 100 / 3

const round2 = (n: number) => Math.round(n * 100) / 100

function within(value: number, from: number, to: number): number {
  if (!(to > from)) return 0.5
  return Math.min(Math.max((value - from) / (to - from), 0), 1)
}

/** Where the value sits on the bar, in percent. */
export function rainClassPct(valueMm: number, lowMm: number, highMm: number, minMm: number, maxMm: number): number {
  if (valueMm < lowMm) return round2(within(valueMm, Math.min(minMm, valueMm), lowMm) * THIRD)
  if (valueMm <= highMm) return round2(THIRD + within(valueMm, lowMm, highMm) * THIRD)
  return round2(2 * THIRD + within(valueMm, highMm, Math.max(maxMm, valueMm)) * THIRD)
}

export default function RainClassBar({
  valueMm, lowMm, highMm, minMm, maxMm, bands, markerLabel, description,
}: RainClassBarProps) {
  const at = rainClassPct(valueMm, lowMm, highMm, minMm, maxMm)

  return (
    <ChartFigure description={description} className="tg-class">
      <div className="tg-class-bands">
        {KINDS.map((kind) => (
          <p key={kind} className={`tg-class-band tg-class-band--${kind}`}>
            <span>{bands[kind].name}</span>
            <span className="tg-muted tg-num">{bands[kind].range}</span>
          </p>
        ))}
      </div>
      <div className="tg-class-track">
        {KINDS.map((kind) => (
          <span
            key={kind}
            className="tg-class-segment"
            style={{ background: RAIN_COLORS[kind], boxShadow: outlineOf(RAIN_COLORS[kind]) }}
          />
        ))}
      </div>
      <div className="tg-class-marker" style={cssVars({ '--at': `${at}%` })}>
        <span className="tg-class-pointer" />
        <span className="tg-class-label">{markerLabel}</span>
      </div>
    </ChartFigure>
  )
}
