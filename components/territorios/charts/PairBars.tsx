// The territory and the Caatinga as two bars on one scale, each named on its
// left and valued on its right. On the biome itself there is one row.

import { ChartFigure, outlineOf, scalePct } from './ChartFigure'
import '@/app/territorios-graficos.css'

export interface PairBarsRow {
  label: string
  value: number
  color: string
}

export interface PairBarsProps {
  rows:        PairBarsRow[]
  max:         number
  format:      (n: number) => string
  description: string
}

export default function PairBars({ rows, max, format, description }: PairBarsProps) {
  return (
    <ChartFigure description={description} className="tg-pair">
      {rows.map((row) => (
        <div key={row.label} className="tg-pair-row">
          <span className="tg-row-name">{row.label}</span>
          <span className="tg-pair-track">
            <span
              className="tg-pair-fill"
              style={{ width: `${scalePct(row.value, max)}%`, background: row.color, boxShadow: outlineOf(row.color) }}
            />
          </span>
          <b className="tg-tag tg-num">{format(row.value)}</b>
        </div>
      ))}
    </ChartFigure>
  )
}
