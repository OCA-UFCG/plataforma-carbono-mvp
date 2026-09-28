// Change between two years, one row per region: a hollow dot for the first
// year, a filled one for the last, joined by a line on a 0..max scale. The
// first value is labeled above the line and the last below it, so the two
// labels never collide when the values barely moved.

import { Fragment } from 'react'
import { ChartFigure, anchorAt, cssVars, scalePct } from './ChartFigure'
import '@/app/territorios-graficos.css'

export interface DumbbellProps {
  rows:        { label: string; from: number; to: number }[]
  fromLabel:   string
  toLabel:     string
  /** At 3:1 or more on the surface: the dots and the line take no outline. */
  color:       string
  format:      (n: number) => string
  max?:        number
  description: string
}

export default function Dumbbell({ rows, fromLabel, toLabel, color, format, max = 100, description }: DumbbellProps) {
  const series = cssVars({ '--c': color })

  return (
    <ChartFigure description={description} className="tg-db">
      <ul className="tg-legend tg-db-key">
        <li><span className="tg-dot tg-dot--from" style={series} />{fromLabel}</li>
        <li><span className="tg-dot tg-dot--to" style={series} />{toLabel}</li>
      </ul>
      <div className="tg-db-rows">
        {rows.map((row) => {
          const from = scalePct(row.from, max)
          const to = scalePct(row.to, max)
          return (
            <Fragment key={row.label}>
              <span className="tg-row-name">{row.label}</span>
              <div className="tg-db-plot">
                <p className="tg-tag tg-muted" style={anchorAt(from)}>
                  <span className="tg-num">{format(row.from)}</span>
                </p>
                <div className="tg-db-track" style={series}>
                  <div className="tg-db-line" style={{ left: `${Math.min(from, to)}%`, width: `${Math.round(Math.abs(to - from) * 100) / 100}%` }} />
                  <span
                    className="tg-dot tg-dot--from"
                    style={cssVars({ '--at': `${from}%` })}
                    title={`${fromLabel}: ${format(row.from)}`}
                  />
                  <span
                    className="tg-dot tg-dot--to"
                    style={cssVars({ '--at': `${to}%` })}
                    title={`${toLabel}: ${format(row.to)}`}
                  />
                </div>
                <p className="tg-tag" style={anchorAt(to)}>
                  <b className="tg-num">{format(row.to)}</b>
                </p>
              </div>
            </Fragment>
          )
        })}
        <span />
        <div className="tg-db-axis tg-num">
          <span>{format(0)}</span>
          <span>{format(max)}</span>
        </div>
      </div>
    </ChartFigure>
  )
}
