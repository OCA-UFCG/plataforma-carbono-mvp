// Degradation levels as 100% bars, one per row ("Aqui", "Caatinga"), from
// Conservado through Nível 1 to Nível 5, then the area without data, hatched.
// The legend below doubles as the table of every share.

import { Fragment, type CSSProperties } from 'react'
import { DEGRADATION_COLORS } from '@/config/territorios/palette'
import type { DegradationShare } from '@/types/territorios'
import { ChartFigure, formatShare, inkOn, outlineOf } from './ChartFigure'
import '@/app/territorios-graficos.css'

export interface LevelsBarProps {
  rows:        { label: string; shares: DegradationShare[] }[]
  description: string
}

// Class codes run the other way: code 6 is Conservado, code 1 is Nível 5, code 0 has no data.
const ORDER = [6, 5, 4, 3, 2, 1, 0]
const NO_DATA = 0

const NAMES: Record<number, string> = {
  6: 'Conservado',
  5: 'Nível 1 (leve)',
  4: 'Nível 2',
  3: 'Nível 3',
  2: 'Nível 4',
  1: 'Nível 5 (grave)',
  0: 'Sem dado',
}

function fillOf(code: number): CSSProperties {
  const color = DEGRADATION_COLORS[code]
  if (code === NO_DATA) {
    return {
      background: `repeating-linear-gradient(45deg, ${color} 0 2px, transparent 2px 6px)`,
      boxShadow: outlineOf(color),
    }
  }
  return { background: color, boxShadow: outlineOf(color) }
}

function shareOf(shares: DegradationShare[], code: number): number {
  const pct = shares.filter((s) => s.code === code).reduce((sum, s) => sum + s.pct, 0)
  return Number.isFinite(pct) && pct > 0 ? pct : 0
}

export default function LevelsBar({ rows, description }: LevelsBarProps) {
  const table = rows.map((row) => ({ label: row.label, pct: ORDER.map((code) => shareOf(row.shares, code)) }))
  const noDataShown = table.some((row) => row.pct[ORDER.indexOf(NO_DATA)] > 0)
  const legend = ORDER.filter((code) => code !== NO_DATA || noDataShown)

  return (
    <ChartFigure description={description} className="tg-levels">
      <div className="tg-levels-rows">
        {table.map((row) => {
          const total = row.pct.reduce((a, b) => a + b, 0)
          return (
            <Fragment key={row.label}>
              <span className="tg-row-name">{row.label}</span>
              <div className={total > 0 ? 'tg-levels-bar' : 'tg-levels-bar tg-levels-bar--empty'}>
                {ORDER.map((code, i) => row.pct[i] > 0 && (
                  <div
                    key={code}
                    className="tg-seg"
                    style={{ ...fillOf(code), flexGrow: row.pct[i], color: code === NO_DATA ? undefined : inkOn(DEGRADATION_COLORS[code]) }}
                    title={`${NAMES[code]}: ${formatShare(row.pct[i])}`}
                  >
                    <span className="tg-seg-label tg-num">{formatShare(row.pct[i])}</span>
                  </div>
                ))}
              </div>
            </Fragment>
          )
        })}
      </div>

      <div className="tg-levels-legend" style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${table.length}, max-content)` }}>
        <span />
        {table.map((row) => <span key={row.label} className="tg-levels-head">{row.label}</span>)}
        {legend.map((code) => (
          <Fragment key={code}>
            <span className="tg-legend-name">
              <span className="tg-swatch" style={fillOf(code)} />
              {NAMES[code]}
            </span>
            {table.map((row) => (
              <span key={row.label} className="tg-levels-value tg-num">{formatShare(row.pct[ORDER.indexOf(code)])}</span>
            ))}
          </Fragment>
        ))}
      </div>
    </ChartFigure>
  )
}
