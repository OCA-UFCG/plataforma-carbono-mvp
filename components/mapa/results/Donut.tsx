import { ListHead } from './blocks'
import blocks from './blocks.module.css'
import styles from './Donut.module.css'

export interface Slice {
  nome: string
  tc: number
  cor: string
}

const pct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// The ring of Figma's "rosca" (19432:60357): 132px across, its band the outer
// 36% of the radius, a hair of the card between slices.
const SIZE = 132
const OUTER = SIZE / 2
const INNER = OUTER * 0.64
const RADIUS = (OUTER + INNER) / 2
const BAND = OUTER - INNER
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 1.5

/**
 * A titled donut and its legend (Figma 19432:60432), largest slice first. Drawn
 * in SVG, one stroked circle per slice, rather than with the report's recharts
 * Rosca: the printed report keeps that one, and the panel needs no chart
 * library for a static ring.
 */
export default function Donut({ title, slices, total }: { title: string; slices: Slice[]; total: number }) {
  const shown = slices.filter((s) => s.tc > 0).sort((a, b) => b.tc - a.tc)
  if (shown.length === 0 || total <= 0) return null

  const lengthOf = (s: Slice) => (s.tc / total) * CIRCUMFERENCE
  // Each arc starts where the ones before it end.
  const arcs = shown.map((s, i) => ({
    ...s,
    length: lengthOf(s),
    start: shown.slice(0, i).reduce((sum, before) => sum + lengthOf(before), 0),
  }))

  return (
    <section className={`${blocks.card} ${blocks.list}`} data-card="list">
      <ListHead title={title} />
      <svg className={styles.ring} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={title}>
        {/* Starts at three o'clock and runs counterclockwise, as Figma's ring
            and the report's (recharts' default): a stroke runs clockwise from
            three o'clock, so the group is flipped top to bottom. */}
        <g transform={`matrix(1 0 0 -1 0 ${SIZE})`}>
          {arcs.map((a) => (
            <circle
              key={a.nome}
              cx={OUTER}
              cy={OUTER}
              r={RADIUS}
              fill="none"
              stroke={a.cor}
              strokeWidth={BAND}
              strokeDasharray={`${Math.max(a.length - GAP, 0.5)} ${CIRCUMFERENCE}`}
              strokeDashoffset={-a.start}
            />
          ))}
        </g>
      </svg>
      <ul className={styles.legend}>
        {shown.map((s) => (
          <li key={s.nome} className={`${styles.item} text-ui-badge`}>
            <span className={styles.swatch} style={{ background: s.cor }} />
            <span className={styles.name} title={s.nome}>{s.nome}</span>
            <span className={styles.share}>{pct.format((100 * s.tc) / total)}%</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
