// One line per region across the years on a 0-100% axis, each ending in its
// last value: the territory's native vegetation against the Caatinga's. The
// reference line is dashed, so the two differ by more than their color.

import { ChartFigure, cssVars, formatShare } from './ChartFigure'
import type { NativeShareYear } from '@/types/territorios'
import '@/app/territorios-graficos.css'

export interface YearLine {
  label:   string
  /** At 3:1 or more on the surface. */
  color:   string
  points:  NativeShareYear[]
  dashed?: boolean
}

export interface YearLinesProps {
  /** All over the same years. */
  lines:       YearLine[]
  /** Name of the vertical axis, along the left edge: "Vegetação nativa (%)". */
  axisLabel:   string
  description: string
}

const TICKS = [0, 25, 50, 75, 100]
/** The gridlines between the two axis lines. */
const GRID = TICKS.slice(1, -1)
/**
 * Least distance between two end labels, in percent of the plot's height: a
 * 20 px label on the 160 px plot of territorios-graficos.css.
 */
const LABEL_GAP = 13

const round2 = (n: number) => Math.round(n * 100) / 100

/** The line through the years with a value; a year without one breaks it. */
export function linePath(points: NativeShareYear[], first: number, span: number): string {
  const parts: string[] = []
  let pen = false
  for (const p of points) {
    if (p.sharePct === null) { pen = false; continue }
    const x = round2(((p.year - first) / span) * 100)
    const y = round2(100 - Math.min(Math.max(p.sharePct, 0), 100))
    parts.push(`${pen ? 'L' : 'M'}${x} ${y}`)
    pen = true
  }
  return parts.join(' ')
}

function lastValue(points: NativeShareYear[]): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const v = points[i].sharePct
    if (v !== null) return v
  }
  return null
}

/**
 * Heights of the end labels, in percent from the top, at their line's end
 * unless that puts two closer than LABEL_GAP: then the lower one moves down,
 * and back up the whole stack if it left the plot.
 */
export function labelTops(values: (number | null)[]): (number | null)[] {
  const tops = values.map((v) => (v === null ? null : 100 - Math.min(Math.max(v, 0), 100)))
  const order = tops.flatMap((t, i) => (t === null ? [] : [i])).sort((a, b) => tops[a]! - tops[b]!)
  for (let k = 1; k < order.length; k++) {
    tops[order[k]] = Math.max(tops[order[k]]!, tops[order[k - 1]]! + LABEL_GAP)
  }
  for (let k = order.length - 1; k >= 0; k--) {
    const below = k === order.length - 1 ? 100 : tops[order[k + 1]]! - LABEL_GAP
    tops[order[k]] = round2(Math.min(tops[order[k]]!, below))
  }
  return tops
}

export default function YearLines({ lines, axisLabel, description }: YearLinesProps) {
  const years = lines[0]?.points.map((p) => p.year) ?? []
  const first = years[0] ?? 0
  const last = years[years.length - 1] ?? first
  const span = Math.max(last - first, 1)
  const ends = lines.map((l) => lastValue(l.points))
  const tops = labelTops(ends)
  // Every tenth year from the first, and the last: every fifth touches on a 320 px screen.
  const named = years.filter((y) => y === last || ((y - first) % 10 === 0 && last - y >= 5))

  return (
    <ChartFigure description={description} className="tg-lines">
      <div className="tg-lines-frame">
        <div className="tg-lines-axis tg-num">
          {TICKS.map((t) => <span key={t} style={{ bottom: `${t}%` }}>{t}</span>)}
        </div>
        <svg className="tg-lines-plot" viewBox="0 0 100 100" preserveAspectRatio="none">
          {GRID.map((t) => <line key={t} className="tg-lines-grid" x1="0" x2="100" y1={100 - t} y2={100 - t} />)}
          {lines.map((l) => (
            <path
              key={l.label}
              className={l.dashed ? 'tg-lines-path tg-lines-path--dashed' : 'tg-lines-path'}
              d={linePath(l.points, first, span)}
              stroke={l.color}
            />
          ))}
        </svg>
        <div className="tg-lines-ends tg-num">
          {lines.map((l, i) => {
            const end = ends[i]
            return end === null ? null : (
              <b key={l.label} style={{ top: `${tops[i]}%`, color: l.color }}>{formatShare(end)}</b>
            )
          })}
        </div>
        <div className="tg-lines-years tg-num">
          {named.map((y) => <span key={y} style={{ left: `${round2(((y - first) / span) * 100)}%` }}>{y}</span>)}
        </div>
        <span className="tg-lines-unit">{axisLabel}</span>
      </div>
      <ul className="tg-legend">
        {lines.map((l) => (
          <li key={l.label}>
            <span
              className={l.dashed ? 'tg-lines-key tg-lines-key--dashed' : 'tg-lines-key'}
              style={cssVars({ '--c': l.color })}
            />
            {l.label}
          </li>
        ))}
      </ul>
    </ChartFigure>
  )
}
