'use client'

import { useEffect, useId, useRef, useState } from 'react'
import appConfig from '@/config/mapa/layers.json'
import { THEMES, TERRITORY_THEME_ID } from '@/config/mapa/groups'
import type { LayerConfig } from '@/types/mapa'
import styles from './Territory.module.css'

const TERRITORY = THEMES.find((theme) => theme.id === TERRITORY_THEME_ID)
const CATALOG_INDEX = new Map((appConfig.layers as LayerConfig[]).map((layer, index) => [layer.id, index]))

export interface RecorteGroup {
  id: string
  label: string
  layers: LayerConfig[]
}

/**
 * The Território layers by subtheme, in groups.ts order, each group in
 * layers.json order: the picker's list, which stays put while the cards of
 * "Recorte em destaque" are dragged. A layer added to the theme shows up here
 * with no change to this code.
 */
export function recorteGroups(layers: LayerConfig[]): RecorteGroup[] {
  const byCatalog = (layer: LayerConfig) => CATALOG_INDEX.get(layer.id) ?? Number.MAX_SAFE_INTEGER
  return (TERRITORY?.subthemes ?? [])
    .map((subtheme) => ({
      id: subtheme.id,
      label: subtheme.label,
      layers: layers
        .filter((layer) => layer.theme === TERRITORY_THEME_ID && layer.subtheme === subtheme.id)
        .sort((a, b) => byCatalog(a) - byCatalog(b)),
    }))
    .filter((group) => group.layers.length > 0)
}

/** What the closed picker says: the recorte chosen, or how many. */
export function pickerLabel(chosen: LayerConfig[]): string {
  if (chosen.length === 0) return 'Escolha o recorte'
  if (chosen.length === 1) return chosen[0].name
  return `${chosen.length} recortes escolhidos`
}

/** The option the arrow keys, Home and End move to; the ends do not wrap. */
export function nextOption(index: number, key: string, count: number): number {
  if (key === 'ArrowDown') return Math.min(index + 1, count - 1)
  if (key === 'ArrowUp') return Math.max(index - 1, 0)
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return index
}

/**
 * "Escolha o recorte" (Figma 19431:60257): a button that opens a list of the
 * recortes with checkboxes, grouped by subtheme, several at once. Ticking one
 * puts it on the map, as the bin of its card in "Recorte em destaque" takes it
 * off. From the keyboard: the button opens it, the arrows move, Space or Enter
 * ticks, Esc closes; a click outside closes it too.
 */
export default function RecortePicker({ layers, onToggle }: {
  layers: LayerConfig[]
  onToggle: (id: string) => void
}) {
  const groups = recorteGroups(layers)
  const options = groups.flatMap((group) => group.layers)
  const chosen = options.filter((layer) => layer.visible)

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const optionId = (index: number) => `${id}-option-${index}`
  const activeId = open && options.length > 0 ? optionId(active) : undefined

  const show = () => {
    // Start on the first recorte chosen, where the reader most likely goes on.
    setActive(Math.max(0, options.findIndex((layer) => layer.visible)))
    setOpen(true)
  }
  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  // Focus moves into the list on opening, so the keys work at once.
  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  // A press anywhere outside closes it.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const onListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      const layer = options[active]
      if (layer) onToggle(layer.id)
    } else if (event.key === 'Tab') {
      close(false)
    } else {
      const next = nextOption(active, event.key, options.length)
      if (next !== active) {
        event.preventDefault()
        setActive(next)
      }
    }
  }

  return (
    <div ref={rootRef} className={styles.picker}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault()
            show()
          }
        }}
      >
        <span className={styles.triggerText}>{pickerLabel(chosen)}</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
        <img className={styles.triggerArrow} src="/icons/mapa/keyboard-arrow-down-small.svg" alt="" width={16} height={16} />
      </button>

      <div
        ref={listRef}
        id={`${id}-list`}
        role="listbox"
        aria-multiselectable="true"
        aria-label="Recortes"
        aria-activedescendant={activeId}
        tabIndex={-1}
        className={styles.popup}
        hidden={!open}
        onKeyDown={onListKeyDown}
      >
        {groups.map((group) => (
          <ul key={group.id} role="group" aria-labelledby={`${id}-${group.id}`} className={styles.group}>
            <li role="presentation" id={`${id}-${group.id}`} className={styles.groupLabel}>{group.label}</li>
            {group.layers.map((layer) => {
              const at = options.indexOf(layer)
              return (
                <li
                  key={layer.id}
                  id={optionId(at)}
                  role="option"
                  aria-selected={layer.visible}
                  data-active={open && at === active ? 'true' : undefined}
                  className={styles.option}
                  onClick={() => {
                    setActive(at)
                    onToggle(layer.id)
                  }}
                  onPointerMove={() => setActive(at)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
                  <img src={layer.visible ? '/icons/mapa/checkbox-checked.svg' : '/icons/mapa/checkbox.svg'} alt="" width={16} height={16} />
                  <span className={styles.optionName}>{layer.name}</span>
                </li>
              )
            })}
          </ul>
        ))}
      </div>
    </div>
  )
}
