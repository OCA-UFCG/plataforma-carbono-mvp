// One bar per year, as tall as the year's rainfall and colored by its class
// against the territory's own series, with the highlighted year outlined and its rainfall written above it.
// Adapted from the `Strip` of components/mapa/results/PointSeries.tsx (commit
// c5eab2a, branch feat/resultados-por-camada).

import type { CSSProperties } from 'react'
import { RAIN_COLORS } from '@/config/territorios/palette'
import type { RainChartData, RainYearKind } from '@/types/territorios'
import { ChartFigure, outlineOf } from './ChartFigure'
import '@/app/territorios-graficos.css'

export interface YearStripProps {
  data:        RainChartData
  description: string
  /** The highlighted year's rainfall over its cell; off where the step already prints it. */
  callout?:    boolean
}

const KINDS: { kind: RainYearKind; name: string }[] = [
  { kind: 'seco', name: 'Seco' },
  { kind: 'normal', name: 'Normal' },
  { kind: 'chuvoso', name: 'Chuvoso' },
]

const mm0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const formatMm = (mm: number) => `${mm0.format(mm)} mm`

const round2 = (n: number) => Math.round(n * 100) / 100

function fillOf(kind: RainYearKind): CSSProperties {
  return { background: RAIN_COLORS[kind], boxShadow: outlineOf(RAIN_COLORS[kind]) }
}

// Each bar's height is the year's rainfall against the wettest year of the series.
function barHeight(mm: number, maxMm: number): CSSProperties {
  return { '--h': `${maxMm > 0 ? round2((mm / maxMm) * 100) : 0}%` } as CSSProperties
}

export default function YearStrip({ data, description, callout = true }: YearStripProps) {
  const { years, highlightYear } = data
  const count = years.length
  const at = years.findIndex((y) => y.year === highlightYear)
  const highlighted = at >= 0 ? years[at] : null
  const hasGap = years.some((y) => y.kind === null || y.valueMm === null)
  const maxMm = Math.max(0, ...years.map((y) => y.valueMm ?? 0))

  // The value sits over its cell: from the cell's left edge in the left half,
  // ending at its right edge in the right half.
  const calloutAt: CSSProperties | undefined = at < 0 ? undefined : (at + 0.5) / count <= 0.5
    ? { paddingLeft: `${round2((at / count) * 100)}%` }
    : { paddingRight: `${round2(((count - at - 1) / count) * 100)}%`, textAlign: 'right' }

  return (
    <ChartFigure description={description} className="tg-strip">
      {callout && highlighted && (
        <p className="tg-tag" style={calloutAt}>
          {highlighted.year}:{' '}
          <b className="tg-num">{highlighted.valueMm === null ? 'sem dado' : formatMm(highlighted.valueMm)}</b>
        </p>
      )}
      <div className="tg-strip-box">
        <div className="tg-strip-cells">
          {years.map((y, i) => {
            const kind = y.valueMm === null ? null : y.kind
            const name = KINDS.find((k) => k.kind === kind)?.name.toLowerCase()
            // The balloon opens toward the middle so the end cells keep it inside the chart.
            const side = (i + 0.5) / count < 0.2 ? 'tg-cell--tip-start' : (i + 0.5) / count > 0.8 ? 'tg-cell--tip-end' : ''
            const classes = ['tg-cell', kind ? '' : 'tg-cell--empty', y.year === highlightYear ? 'tg-cell--highlight' : '', side]
            return (
              <span
                key={y.year}
                className={classes.filter(Boolean).join(' ')}
                style={kind && y.valueMm !== null ? { ...fillOf(kind), ...barHeight(y.valueMm, maxMm) } : undefined}
                data-tip={y.valueMm === null || !name ? `${y.year}: sem dado` : `${y.year}: ${formatMm(y.valueMm)}, ${name}`}
              />
            )
          })}
        </div>
        {count > 0 && (
          <div className="tg-strip-ends tg-num">
            <span>{years[0].year}</span>
            {count > 1 && <span>{years[count - 1].year}</span>}
          </div>
        )}
      </div>
      <ul className="tg-legend">
        {KINDS.map((k) => (
          <li key={k.kind}>
            <span className="tg-swatch" style={fillOf(k.kind)} />
            <span>{k.name}</span>
          </li>
        ))}
        {hasGap && (
          <li>
            <span className="tg-swatch tg-swatch--empty" />
            <span>Sem dado</span>
          </li>
        )}
      </ul>
    </ChartFigure>
  )
}
