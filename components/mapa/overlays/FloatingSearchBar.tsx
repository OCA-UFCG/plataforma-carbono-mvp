'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { IcSearch, IcX, IcChevronRight } from '../icons'
import { useStore } from '@/lib/mapa/store'
import { computeBbox } from '@/lib/mapa/computeBbox'
import { normalizeSearch } from '@/lib/mapa/normalizeSearch'
import type { PlatformTheme, VectorLayerConfig } from '@/types/mapa'

// Types

interface SearchResult {
  layerId: string
  layerName: string
  fieldName: string
  value: string
  featureIndex: number
  bbox: [number, number, number, number]
  isPrefix: boolean // true if value starts with query (for sort priority)
}

interface Props {
  theme: PlatformTheme
  onSelectFeature: (
    layerId: string,
    featureId: number,
    bbox: [number, number, number, number],
  ) => void
}

// Helpers

const MAX_RESULTS = 20

// Component

export default function FloatingSearchBar({ theme, onSelectFeature }: Props) {
  const layers = useStore((s) => s.layers)

  // Local state
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const [cacheVersion, setCacheVersion] = useState(0)

  // Refs
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cacheRef = useRef<
    Map<string, { layerName: string; features: GeoJSON.Feature[] }>
  >(new Map())

  // Derived
  const searchableVectors = layers.filter(
    (l): l is VectorLayerConfig => l.type === 'vector',
  )
  const searchableKey = searchableVectors.map((l) => l.id).join(',')

  // Whether any searchable layer's GeoJSON is still downloading/indexing. This
  // recomputes on each cacheVersion bump (setCacheVersion re-renders the
  // component), so the dropdown can show "Carregando..." instead of a false
  // "Nenhum resultado" while data is in flight.
  const loadingData = searchableVectors.some((l) => !cacheRef.current.has(l.id))

  // Click-outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Auto-focus on expand
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Open from the header search button (cc-open-search custom event)
  // The map no longer shows its own collapsed magnifier; the header's search
  // control is the single entry point and dispatches this event.
  useEffect(() => {
    const openSearch = () => setOpen(true)
    window.addEventListener('cc-open-search', openSearch)
    return () => window.removeEventListener('cc-open-search', openSearch)
  }, [])

  // Debounce (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Cache-warming: fetch GeoJSON of all searchable vector layers.
  // Only once the search is actually opened, no point downloading (and
  // re-parsing) the recorte GeoJSONs that MapLibre already fetched unless the
  // user is going to search.
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()

    for (const layer of searchableVectors) {
      if (cacheRef.current.has(layer.id)) continue
      fetch(layer.url, { signal: controller.signal })
        .then((r) => r.json())
        .then((geojson: GeoJSON.FeatureCollection) => {
          cacheRef.current.set(layer.id, {
            layerName: layer.name,
            features: geojson.features,
          })
          // bump version so the search effect re-runs
          setCacheVersion((v) => v + 1)
        })
        .catch(() => {
          /* aborted or network error, skip */
        })
    }

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchableKey, open])

  // Search logic
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q.length < 2) {
      setResults([])
      setHighlightedIdx(-1)
      return
    }

    const normQ = normalizeSearch(q)
    const found: SearchResult[] = []
    const seen = new Set<string>() // dedupe: layerId:featureIndex:fieldName

    for (const layer of searchableVectors) {
      const cached = cacheRef.current.get(layer.id)
      if (!cached) continue

      for (let fi = 0; fi < cached.features.length; fi++) {
        const props = cached.features[fi].properties
        if (!props) continue

        for (const [key, raw] of Object.entries(props)) {
          if (typeof raw !== 'string' || raw === '') continue
          const normVal = normalizeSearch(raw)
          if (!normVal.includes(normQ)) continue

          const dedupeKey = `${layer.id}:${fi}:${key}`
          if (seen.has(dedupeKey)) continue
          seen.add(dedupeKey)

          let bbox: [number, number, number, number]
          try {
            bbox = computeBbox(cached.features[fi])
          } catch {
            continue // skip features without valid geometry
          }

          found.push({
            layerId: layer.id,
            layerName: cached.layerName,
            fieldName: key,
            value: raw,
            featureIndex: fi,
            bbox,
            isPrefix: normVal.startsWith(normQ),
          })

          if (found.length >= MAX_RESULTS * 2) break // collect extra for sorting
        }
        if (found.length >= MAX_RESULTS * 2) break
      }
    }

    // Sort: prefix matches first, then alphabetical
    found.sort((a, b) => {
      if (a.isPrefix !== b.isPrefix) return a.isPrefix ? -1 : 1
      return a.value.localeCompare(b.value, 'pt-BR')
    })

    setResults(found.slice(0, MAX_RESULTS))
    setHighlightedIdx(-1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, searchableKey, cacheVersion])

  // Handlers

  const handleSelect = useCallback(
    (r: SearchResult) => {
      onSelectFeature(r.layerId, r.featureIndex, r.bbox)
      setOpen(false)
      setQuery('')
      setDebouncedQuery('')
      setResults([])
    },
    [onSelectFeature],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
        setResults([])
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIdx((i) => Math.min(i + 1, results.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIdx((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' && highlightedIdx >= 0 && results[highlightedIdx]) {
        e.preventDefault()
        handleSelect(results[highlightedIdx])
      }
    },
    [results, highlightedIdx, handleSelect],
  )

  // Highlight matching portion of value

  const renderHighlighted = (value: string) => {
    const q = query.trim()
    if (!q) return value
    const normVal = normalizeSearch(value)
    const normQ = normalizeSearch(q)
    const idx = normVal.indexOf(normQ)
    if (idx < 0) return value
    // Map normalized index back to original string positions
    const before = value.slice(0, idx)
    const match = value.slice(idx, idx + q.length)
    const after = value.slice(idx + q.length)
    return (
      <>
        {before}
        <strong style={{ color: theme.colors.accent }}>{match}</strong>
        {after}
      </>
    )
  }

  // Render

  // Collapsed: nothing on the map, the header owns the search entry point and
  // opens this component via the cc-open-search event.
  if (!open) return null

  // Expanded: command-palette-style bar centred at the top of the map
  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        fontFamily: 'var(--font-app), sans-serif',
        width: 'min(440px, calc(100vw - 32px))',
      }}
    >
      {/* Input bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: theme.colors.bgCard,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: results.length > 0 ? '8px 8px 0 0' : 8,
          padding: '0 10px',
          height: 36,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}
      >
        <IcSearch size={14} color={theme.colors.textDim} style={{ flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar feição..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: theme.colors.text,
            fontFamily: 'var(--font-app), sans-serif',
          }}
        />
        <button
          onClick={() => {
            setOpen(false)
            setQuery('')
            setResults([])
          }}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            color: theme.colors.textDim,
          }}
          title="Fechar"
        >
          <IcX size={13} />
        </button>
      </div>

      {/* Dropdown results */}
      {query.trim().length >= 2 && (
        <div
          style={{
            background: theme.colors.bgCard,
            border: `1px solid ${theme.colors.border}`,
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            maxHeight: 300,
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          {results.length === 0 ? (
            <div
              style={{
                padding: '10px 12px',
                fontSize: 12,
                color: theme.colors.textDim,
                textAlign: 'center',
              }}
            >
              {loadingData ? 'Carregando dados...' : 'Nenhum resultado encontrado'}
            </div>
          ) : (
            results.map((r, i) => (
              <div
                key={`${r.layerId}-${r.featureIndex}-${r.fieldName}`}
                onClick={() => handleSelect(r)}
                onMouseEnter={() => setHighlightedIdx(i)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background:
                    i === highlightedIdx
                      ? theme.colors.accentBg
                      : 'transparent',
                  borderBottom:
                    i < results.length - 1
                      ? `1px solid ${theme.colors.border}`
                      : 'none',
                  transition: 'background 0.1s',
                }}
              >
                {/* Layer > Field breadcrumb */}
                <div
                  style={{
                    fontSize: 10,
                    color: theme.colors.textDim,
                    marginBottom: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.layerName}
                  <IcChevronRight size={9} style={{ margin: '0 3px', opacity: 0.5, verticalAlign: 'middle', display: 'inline-block' }} />
                  {r.fieldName}
                </div>
                {/* Matched value */}
                <div
                  style={{
                    fontSize: 13,
                    color: theme.colors.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {renderHighlighted(r.value)}
                </div>
              </div>
            ))
          )}
          {/* Search includes every configured territorial vector layer. */}
          <div
            style={{
              padding: '6px 12px',
              fontSize: 10,
              color: theme.colors.textDim,
              borderTop: `1px solid ${theme.colors.border}`,
              fontStyle: 'italic',
            }}
          >
            Busca em todos os recortes territoriais.
          </div>
        </div>
      )}
    </div>
  )
}
