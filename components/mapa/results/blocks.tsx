'use client'

// Building blocks of the per-layer results in the "Resultados" panel. One
// reading per result: a context line, a single headline number with its
// sentence, at most two secondary figures, one list of bars and a short
// footnote. A figure appears once; the bars carry area and share on the same
// row instead of a legend repeating them.
//
// Grids use `minmax(0, 1fr)` rather than `1fr`: a bare `1fr` floors a column at
// its content's min-content width and overflows the 328 px the panel leaves.

import type { ReactNode } from 'react'
import type { PlatformTheme } from '@/types/mapa'
import { layerTitle } from '@/lib/mapa/results/format'

const NUMS: React.CSSProperties = { fontVariantNumeric: 'lining-nums tabular-nums' }

/** Layer name and period, on a rule above the numbers. */
export function ContextLine({ theme, title, period }: { theme: PlatformTheme; title: string; period?: string }) {
  const c = theme.colors
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
      paddingTop: 16, borderTop: `1px solid ${c.border}`,
      // With the Stack's 24 px, the headline sits 16 px below: the line and the
      // number read as one block.
      marginBottom: -8,
    }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: c.text, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{layerTitle(title)}</span>
      {period && <span style={{ fontSize: 14, color: c.textDim, whiteSpace: 'nowrap', ...NUMS }}>{period}</span>}
    </div>
  )
}

/**
 * The headline number. `aside` sits on its baseline (an area) and `caption`
 * completes it as a sentence. `ink` colors the number, for a signed flux.
 * `children` replaces the value, for a class name.
 */
export function Hero({
  theme, value, unit, aside, caption, ink, children,
}: {
  theme: PlatformTheme; value?: string; unit?: string; aside?: string; caption?: string; ink?: string; children?: ReactNode
}) {
  const c = theme.colors
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {children ?? (
        <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 10, rowGap: 4 }}>
          <span style={{ fontSize: 56, fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.03em', color: ink ?? c.text, ...NUMS }}>
            {value}
          </span>
          {unit && <span style={{ fontSize: 20, fontWeight: 700, color: c.text, whiteSpace: 'nowrap' }}>{unit}</span>}
          {aside && <span style={{ fontSize: 15, color: c.textDim, whiteSpace: 'nowrap', ...NUMS }}>{aside}</span>}
        </div>
      )}
      {caption && <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.4, color: c.body }}>{caption}</p>}
    </section>
  )
}

export interface Figure {
  label: string
  value: ReactNode
  /** Smaller text after the value: a unit or an area. */
  aside?: string
}

/** One or two secondary figures, side by side in a single ruled box. */
export function Pair({ theme, items }: { theme: PlatformTheme; items: Figure[] }) {
  const c = theme.colors
  const shown = items.slice(0, 2)
  if (shown.length === 0) return null
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))`,
      border: `1px solid ${c.border}`, borderRadius: 12, background: c.bgCard,
    }}>
      {shown.map((it, i) => (
        <div key={it.label} style={{
          padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4, minWidth: 0,
          borderLeft: i > 0 ? `1px solid ${c.border}` : undefined,
        }}>
          <span style={{ fontSize: 13, color: c.textDim, lineHeight: 1.3 }}>{it.label}</span>
          {/* The aside wraps whole to the next line rather than leaving its unit behind. */}
          <span style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 6,
            fontSize: 20, fontWeight: 800, color: c.text, lineHeight: 1.2, overflowWrap: 'anywhere', ...NUMS,
          }}>
            {it.value}
            {it.aside && <span style={{ fontSize: 13, fontWeight: 400, color: c.textDim, whiteSpace: 'nowrap' }}>{it.aside}</span>}
          </span>
        </div>
      ))}
    </div>
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

/** A titled list of bars: label, bar, amount and share on one row. */
export function BarList({
  theme, title, hint, rows, labelWidth = 92,
}: {
  theme: PlatformTheme; title: string; hint?: string; rows: BarRow[]
  /** Short labels (levels, siglas) give the bar the room. */
  labelWidth?: number
}) {
  const c = theme.colors
  if (rows.length === 0) return null
  const max = Math.max(...rows.map((r) => r.value), 0)
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: c.text }}>{title}</h3>
        {hint && <span style={{ fontSize: 12, color: c.textDim, whiteSpace: 'nowrap' }}>{hint}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r) => {
          const zero = r.value <= 0
          const width = max > 0 && !zero ? Math.max((r.value / max) * 100, 2) : 0
          return (
            <div key={r.key} style={{
              display: 'grid', gridTemplateColumns: `${labelWidth}px minmax(0, 1fr) 72px 52px`, gap: 10,
              alignItems: 'center', fontSize: 13.5, color: zero ? c.textDim : c.text, ...NUMS,
            }}>
              <span title={r.label} style={{ lineHeight: 1.25, overflowWrap: 'anywhere' }}>{r.label}</span>
              <div style={{ height: 10, borderRadius: 5, background: c.chip, overflow: 'hidden' }}>
                {width > 0 && <div style={{ width: `${width}%`, height: '100%', borderRadius: 5, background: r.color }} />}
              </div>
              <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.amount}</span>
              <span style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: zero ? 400 : 600 }}>{r.share}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** Lines about the data under the result: what the value is, coverage, source. */
export function Footnote({ theme, notes }: { theme: PlatformTheme; notes: (string | null | undefined)[] }) {
  const shown = notes.filter((n): n is string => Boolean(n))
  if (shown.length === 0) return null
  return (
    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: theme.colors.textDim }}>
      {shown.join(' ')}
    </p>
  )
}

export function Empty({ theme, text }: { theme: PlatformTheme; text: string }) {
  return <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.4, color: theme.colors.body }}>{text}</p>
}

/** Vertical rhythm of one result: 24 px between its parts, tighter after the context line. */
export function Stack({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>{children}</div>
}
