'use client'

import { useState, type CSSProperties } from 'react'
import styles from './OpacityControl.module.css'

export interface OpacityControlProps {
  /** 0–100. */
  value: number
  onChange: (value: number) => void
  /** The track's accessible name, "Opacidade de <camada>". */
  label: string
}

/**
 * The percent typed into the field: a whole number from 0 to 100, with or
 * without the sign and with either decimal mark; anything past the ends sits
 * on the end, and what is not a number is refused (null).
 */
export function parseOpacity(text: string): number | null {
  const cleaned = text.replace('%', '').trim().replace(',', '.')
  if (cleaned === '') return null
  const value = Number(cleaned)
  if (!Number.isFinite(value)) return null
  return Math.round(Math.min(100, Math.max(0, value)))
}

/**
 * A layer's opacity (Figma "Date-slider" and the field beside it, 19422:55769):
 * the track and the percent, either of which sets it. Shared by the cards of
 * "Camadas ativas" and of the recortes (#140).
 */
export default function OpacityControl({ value, onChange, label }: OpacityControlProps) {
  // What the field shows while the reader types; the committed value otherwise.
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const next = parseOpacity(draft)
    if (next !== null && next !== value) onChange(next)
    setDraft(null)
  }

  return (
    <div className={styles.control}>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label={label}
        className={styles.range}
        style={{ '--fill': `${value}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <label className={`${styles.box} text-ui-regular`}>
        <input
          className={styles.field}
          inputMode="numeric"
          aria-label={`${label}, em porcentagem`}
          value={draft ?? String(value)}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
            if (event.key === 'Escape') setDraft(null)
          }}
        />
        <span aria-hidden="true">%</span>
      </label>
    </div>
  )
}
