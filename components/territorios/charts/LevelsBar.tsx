// Ordered levels as 100% bars, one per row ("Aqui", "Caatinga"), lightest
// level first. The legend below doubles as the table of every share.

import { Fragment } from 'react'
import { ChartFigure, formatShare, inkOn, outlineOf } from './ChartFigure'
import '@/app/territorios-graficos.css'

export interface Level {
  key:   string
  name:  string
  color: string
}

export interface LevelsBarProps {
  levels:      Level[]
  /** Share (0..100) of each level, by key; a missing key is 0. */
  rows:        { label: string; shares: Record<string, number> }[]
  description: string
}

function shareOf(shares: Record<string, number>, key: string): number {
  const pct = shares[key]
  return Number.isFinite(pct) && pct > 0 ? pct : 0
}

export default function LevelsBar({ levels, rows, description }: LevelsBarProps) {
  const table = rows.map((row) => ({ label: row.label, pct: levels.map((l) => shareOf(row.shares, l.key)) }))

  return (
    <ChartFigure description={description} className="tg-levels">
      <div className="tg-levels-rows">
        {table.map((row) => {
          const total = row.pct.reduce((a, b) => a + b, 0)
          return (
            <Fragment key={row.label}>
              <span className="tg-row-name">{row.label}</span>
              <div className={total > 0 ? 'tg-levels-bar' : 'tg-levels-bar tg-levels-bar--empty'}>
                {levels.map((level, i) => row.pct[i] > 0 && (
                  <div
                    key={level.key}
                    className="tg-seg"
                    style={{ background: level.color, boxShadow: outlineOf(level.color), flexGrow: row.pct[i], color: inkOn(level.color) }}
                    title={`${level.name}: ${formatShare(row.pct[i])}`}
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
        {levels.map((level, i) => (
          <Fragment key={level.key}>
            <span className="tg-legend-name">
              <span className="tg-swatch" style={{ background: level.color, boxShadow: outlineOf(level.color) }} />
              {level.name}
            </span>
            {table.map((row) => (
              <span key={row.label} className="tg-levels-value tg-num">{formatShare(row.pct[i])}</span>
            ))}
          </Fragment>
        ))}
      </div>
    </ChartFigure>
  )
}
