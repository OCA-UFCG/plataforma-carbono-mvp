'use client'

// Building blocks of the per-layer results in the "Resultados" column, after
// Figma 19430:59196. One reading per result: a headline card (the layer's name,
// a single number with its sentence and at most two secondary figures), cards
// of bars, and a short footnote. A figure appears once; the bars carry area and
// share on the same row instead of a legend repeating them.
//
// Grids use `minmax(0, 1fr)` rather than `1fr`: a bare `1fr` floors a column at
// its content's min-content width and overflows the column.

import { createContext, useContext, type ReactNode } from 'react'
import type { PlatformTheme } from '@/types/mapa'
import styles from './blocks.module.css'

/**
 * The layer's heading (its name, period and the card's toggle), drawn by
 * LayerResultCard. The design puts it inside the headline card, which the
 * result views render, so it travels down by context and the first Hero or
 * Empty of a result draws it.
 */
export const LayerHeading = createContext<ReactNode>(null)

export interface Figure {
  label: string
  value: ReactNode
  /** Smaller text after the value: a unit or an area. */
  aside?: string
}

/** One or two secondary figures, side by side under a rule. */
function Figures({ items }: { items: Figure[] }) {
  const shown = items.slice(0, 2)
  if (shown.length === 0) return null
  return (
    <div
      className={styles.figures}
      data-count={shown.length}
      style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}
    >
      {shown.map((it) => (
        <div key={it.label} className={styles.figure}>
          <span className="text-body">{it.label}</span>
          {/* The aside wraps whole to the next line rather than leaving its unit behind. */}
          <span className={styles.figureValue}>
            <span className={styles.figureNumber}>{it.value}</span>
            {it.aside && <span className={`${styles.figureAside} text-body`}>{it.aside}</span>}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * The headline card (Figma 19432:60313): the layer's heading, the number
 * with its unit, `aside` beside it (an area), `caption` completing it as a
 * sentence, and `figures` under a rule. `ink` colors the number, for a signed
 * flux. `children` replaces the value, for a class name.
 */
export function Hero({
  value, unit, aside, caption, ink, figures, children,
}: {
  theme: PlatformTheme; value?: string; unit?: string; aside?: string; caption?: string; ink?: string
  figures?: Figure[]; children?: ReactNode
}) {
  const heading = useContext(LayerHeading)
  return (
    <section className={styles.card} data-card="lead">
      <div className={styles.leadTop}>
        {heading}
        {children ?? (
          <div className={styles.valueRow}>
            <span className={styles.value} style={ink ? { color: ink } : undefined}>{value}</span>
            {unit && <span className={`${styles.unit} text-h4`}>{unit}</span>}
            {aside && <span className={`${styles.aside} text-body`}>{aside}</span>}
          </div>
        )}
        {caption && <p className="text-body">{caption}</p>}
      </div>
      {figures && <Figures items={figures} />}
    </section>
  )
}

/** Secondary figures on their own, as a card (the drawn line's length). */
export function Pair({ items }: { theme: PlatformTheme; items: Figure[] }) {
  if (items.length === 0) return null
  return (
    <section className={styles.card} data-card="figures">
      <Figures items={items} />
    </section>
  )
}

/** A card's title row: the heading in capitals and, right, a hint. */
export function ListHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className={styles.listHead}>
      <h3 className={`${styles.heading} text-p-ui`}>{title}</h3>
      {hint && <span className={`${styles.hint} text-subtle`}>{hint}</span>}
    </div>
  )
}

/** A titled card of what follows the headline: bars, a ring, a year strip, a chart. */
export function ListCard({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className={`${styles.card} ${styles.list}`} data-card="list">
      <ListHead title={title} hint={hint} />
      {children}
    </section>
  )
}

export interface BarRow {
  key: string | number
  label: string
  /** Bar length against the largest row; the bars compare rows, not shares. */
  value: number
  color: string
  /** Middle column, usually the area. */
  amount: string
  /** Right column, usually the share. */
  share: string
}

/** A titled card of bars (Figma 19433:60433): label, bar, amount and share on one row. */
export function BarList({
  title, hint, rows, labelWidth = 92,
}: {
  theme: PlatformTheme; title: string; hint?: string; rows: BarRow[]
  /** Short labels (levels, siglas) give the bar the room. */
  labelWidth?: number
}) {
  if (rows.length === 0) return null
  const max = Math.max(...rows.map((r) => r.value), 0)
  return (
    <ListCard title={title} hint={hint}>
      <div className={styles.rows}>
        {rows.map((r) => {
          const zero = r.value <= 0
          const width = max > 0 && !zero ? Math.max((r.value / max) * 100, 2) : 0
          return (
            <div
              key={r.key}
              className={`${styles.bar} ${zero ? styles.zero : ''} text-ui-badge`}
              style={{ gridTemplateColumns: `${labelWidth}px minmax(0, 1fr) 64px 44px` }}
            >
              <span className={styles.barLabel} title={r.label}>{r.label}</span>
              <div className={styles.track}>
                {width > 0 && <div className={styles.fill} style={{ width: `${width}%`, background: r.color }} />}
              </div>
              <span className={styles.amount}>{r.amount}</span>
              <span className={styles.share}>{r.share}</span>
            </div>
          )
        })}
      </div>
    </ListCard>
  )
}

/** Lines about the data under the result: what the value is, coverage, source. */
export function Footnote({ notes }: { theme: PlatformTheme; notes: (string | null | undefined)[] }) {
  const shown = notes.filter((n): n is string => Boolean(n))
  if (shown.length === 0) return null
  return <p className={`${styles.footnote} text-subtle`}>{shown.join(' ')}</p>
}

/**
 * A result with nothing to show. Under a layer heading it is that layer's
 * headline card, saying so; alone (the panel's hint), a bare line.
 */
export function Empty({ text }: { theme: PlatformTheme; text: string }) {
  const heading = useContext(LayerHeading)
  if (!heading) return <p className={`${styles.emptyText} text-body`}>{text}</p>
  return (
    <section className={styles.card} data-card="lead">
      <div className={styles.leadTop}>
        {heading}
        <p className={`${styles.emptyText} text-body`}>{text}</p>
      </div>
    </section>
  )
}

/** Vertical rhythm of one result: 16px between its cards. */
export function Stack({ children }: { children: ReactNode }) {
  return <div className={styles.stack}>{children}</div>
}

/** The headline card holding a layer heading and anything else: a chart, a
 *  skeleton, an error. For what the views do not draw themselves. */
export function LeadCard({ children }: { children: ReactNode }) {
  const heading = useContext(LayerHeading)
  return (
    <section className={styles.card} data-card="lead">
      <div className={styles.leadTop}>
        {heading}
        {children}
      </div>
    </section>
  )
}

/** The class name the heading row uses, for LayerResultCard's own heading. */
export const headingClass = `${styles.heading} text-p-ui`
