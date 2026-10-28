'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useStore } from '@/lib/mapa/store'
import { contextIsUnique } from '@/lib/mapa/searchMatch'
import { searchTerritories, type SearchResult, type SearchSource } from '@/lib/mapa/territorySearch'
import { vectorDataUrl } from '@/lib/mapa/vectorDataUrl'
import type { VectorLayerConfig } from '@/types/mapa'
import styles from './Territory.module.css'

const PLACEHOLDER = 'Buscar município, estado ou território'

/**
 * "Buscar município, estado ou território" (Figma 19423:56422;19410:51154):
 * every recorte feature, on the map or not, by any of its names. Picking a
 * result selects the feature as a click on it would (`onSelect`, MapView's
 * `selectFeatureRef`). The recortes' GeoJSON downloads on the field's first
 * focus, not before: MapLibre already fetched those on the map, and only a
 * search needs them parsed here.
 */
export default function TerritorySearch({ onSelect }: {
  onSelect: (layerId: string, featureIndex: number, bbox: [number, number, number, number]) => void
}) {
  const layers = useStore((s) => s.layers)
  const vectorKey = layers.filter((layer) => layer.type === 'vector').map((layer) => layer.id).join(',')

  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [wanted, setWanted] = useState(false)
  const [sources, setSources] = useState<Record<string, SearchSource>>({})
  // The row the keys are on, for the query it was chosen in: a new query's
  // rows start with none.
  const [highlight, setHighlight] = useState({ query: '', index: -1 })
  const requested = useRef(new Set<string>())
  const rootRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const optionId = (index: number) => `${id}-result-${index}`

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!wanted) return
    const controller = new AbortController()
    const vectors = useStore.getState().layers.filter((l): l is VectorLayerConfig => l.type === 'vector')
    for (const layer of vectors) {
      if (requested.current.has(layer.id)) continue
      requested.current.add(layer.id)
      fetch(vectorDataUrl(layer.url), { signal: controller.signal })
        .then((r) => r.json())
        .then((geojson: GeoJSON.FeatureCollection) => {
          const field = layer.contextField
          const source: SearchSource = {
            layerId: layer.id,
            unitName: layer.unitName ?? layer.name,
            contextField: field,
            features: geojson.features,
            // Derived from the file rather than declared: on the states layer
            // the abbreviation is one per feature and typing "RN" should find
            // Rio Grande do Norte, whose name does not contain those letters.
            contextIdentifies: field
              ? contextIsUnique(geojson.features.map((f) => {
                  const value = f.properties?.[field]
                  return typeof value === 'string' && value ? value : undefined
                }))
              : false,
          }
          setSources((prev) => ({ ...prev, [layer.id]: source }))
        })
        .catch(() => {
          // Aborted or a network error: asked again on the next run.
          requested.current.delete(layer.id)
        })
    }
    return () => controller.abort()
  }, [wanted, vectorKey])

  // In catalog order, so the rows dealt per layer do not depend on which
  // download landed first.
  const ready = useMemo(
    () => vectorKey.split(',').map((layerId) => sources[layerId]).filter((s): s is SearchSource => !!s),
    [vectorKey, sources],
  )
  const results = useMemo(() => searchTerritories(debounced, ready), [debounced, ready])
  const loading = wanted && ready.length < vectorKey.split(',').filter(Boolean).length
  const highlighted = highlight.query === debounced ? highlight.index : -1
  const showList = open && query.trim().length >= 2

  // A press anywhere outside closes the list.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const select = (result: SearchResult) => {
    onSelect(result.layerId, result.featureIndex, result.bbox)
    setQuery('')
    setDebounced('')
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setQuery('')
      setOpen(false)
      return
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length > 0) {
      event.preventDefault()
      setOpen(true)
      const next = event.key === 'ArrowDown'
        ? Math.min(highlighted + 1, results.length - 1)
        : Math.max(highlighted - 1, 0)
      setHighlight({ query: debounced, index: next })
      // Rows wrap, so a few presses take the highlight past the bottom of the
      // list; the keys scroll it along. The pointer does not, or hovering a
      // row cut off at the edge would scroll another one under it.
      document.getElementById(optionId(next))?.scrollIntoView({ block: 'nearest' })
      return
    }
    if (event.key === 'Enter' && results[highlighted]) {
      event.preventDefault()
      select(results[highlighted])
    }
  }

  return (
    <div ref={rootRef} className={styles.search}>
      <div className={styles.searchBox}>
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-results`}
          aria-autocomplete="list"
          aria-activedescendant={showList && highlighted >= 0 ? optionId(highlighted) : undefined}
          aria-label={PLACEHOLDER}
          placeholder={PLACEHOLDER}
          className={`${styles.searchInput} text-body`}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setWanted(true)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
        <img className={styles.searchIcon} src="/icons/mapa/search.svg" alt="" width={16} height={16} />
      </div>

      {showList && (
        <ul id={`${id}-results`} role="listbox" aria-label="Recortes encontrados" className={`${styles.popup} ${styles.results}`}>
          {results.map((r, i) => (
            <li
              key={`${r.layerId}-${r.featureIndex}-${r.fieldName}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === highlighted}
              className={styles.result}
              onClick={() => select(r)}
              onPointerMove={() => setHighlight({ query: debounced, index: i })}
            >
              <span className={styles.resultKind}>{r.unitName}</span>
              {/* The value wraps: a conservation unit's name starts with its
                  category, and one line would cut off the name proper. The
                  offsets come from the match, so a query ending in a state
                  ("bom jesus pi") marks only the name part. */}
              <span className={styles.resultName}>
                {r.value.slice(0, r.match.start)}
                <strong>{r.value.slice(r.match.start, r.match.start + r.match.length)}</strong>
                {r.value.slice(r.match.start + r.match.length)}
                {r.context && <span className={styles.resultContext}>{' · '}{r.context}</span>}
              </span>
            </li>
          ))}
          {/* Under rows, the notice says they are only part of the answer: a
              layer still downloading adds its own when it arrives. */}
          {(results.length === 0 || loading) && (
            <li role="presentation" className={styles.resultsNote}>
              {loading ? 'Carregando dados...' : 'Nenhum resultado encontrado'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
