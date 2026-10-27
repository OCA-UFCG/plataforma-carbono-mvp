'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { IcSearch, IcX } from '../icons'
import { useStore } from '@/lib/mapa/store'
import { computeBbox } from '@/lib/mapa/computeBbox'
import { vectorDataUrl } from '@/lib/mapa/vectorDataUrl'
import { contextIsUnique, matchTerritory, type LabelMatch } from '@/lib/mapa/searchMatch'
import { centeredInGutters, gutterMaxWidth } from '@/lib/mapa/gutters'
import type { PlatformTheme, VectorLayerConfig } from '@/types/mapa'

// Types

interface SearchResult {
  layerId: string
  /** What one feature of the layer is called: "Município", not "Municípios". */
  unitName: string
  /**
   * Property the match came from. Not shown -- it is a GeoJSON key -- but it
   * keeps two properties of one feature from collapsing into a single row, and
   * gives the row a stable React key.
   */
  fieldName: string
  value: string
  /** The layer's `contextField` value, e.g. the state of a municipality. */
  context?: string
  /** Run of `value` the query matched, for highlighting. */
  match: LabelMatch
  featureIndex: number
  bbox: [number, number, number, number]
}

interface Props {
  theme: PlatformTheme
  /** Free-strip anchors; see lib/mapa/gutters. */
  leftEdge: number
  rightOffset: number
  onSelectFeature: (
    layerId: string,
    featureId: number,
    bbox: [number, number, number, number],
  ) => void
}

// Helpers

const MAX_RESULTS = 20

// Register codes build-recortes.py keeps beside each name (code_muni, cd_sipra,
// cd_cnuc). Nobody searches by them, and as text ("0000.00.0146") they would
// answer any run of digits typed.
const CODE_FIELD = /^(cd|code)_/i

// Matches at the start of the label first, then alphabetical. One collator for
// every comparison: a short query sorts thousands of matches.
const collator = new Intl.Collator('pt-BR')

function byRank(a: Pick<SearchResult, 'value' | 'match'>, b: Pick<SearchResult, 'value' | 'match'>) {
  const aPrefix = a.match.start === 0
  const bPrefix = b.match.start === 0
  if (aPrefix !== bPrefix) return aPrefix ? -1 : 1
  return collator.compare(a.value, b.value)
}

// Component

export default function FloatingSearchBar({ theme, leftEdge, rightOffset, onSelectFeature }: Props) {
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
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const cacheRef = useRef<
    Map<
      string,
      {
        unitName: string
        features: GeoJSON.Feature[]
        /** Whether a bare context is a legitimate query for this layer. */
        contextIdentifies: boolean
      }
    >
  >(new Map())

  // Derived
  const searchableVectors = layers.filter(
    (l): l is VectorLayerConfig => l.type === 'vector',
  )
  const searchableKey = searchableVectors.map((l) => l.id).join(',')

  // Whether any searchable layer's GeoJSON is still downloading/indexing. This
  // recomputes on each cacheVersion bump (setCacheVersion re-renders the
  // component), so the dropdown can show "Carregando..." while data is in
  // flight: instead of a false "Nenhum resultado", or under rows that are
  // only part of the answer.
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
      fetch(vectorDataUrl(layer.url), { signal: controller.signal })
        .then((r) => r.json())
        .then((geojson: GeoJSON.FeatureCollection) => {
          const field = layer.contextField
          cacheRef.current.set(layer.id, {
            unitName: layer.unitName ?? layer.name,
            features: geojson.features,
            // Derived from the file rather than declared: on the states layer
            // the abbreviation is one per feature and typing "RN" should find
            // Rio Grande do Norte, whose name does not contain those letters.
            contextIdentifies: field
              ? contextIsUnique(
                  geojson.features.map((f) => {
                    const value = f.properties?.[field]
                    return typeof value === 'string' && value ? value : undefined
                  }),
                )
              : false,
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

    // Every match of every layer, ranked within its layer. Stopping at a count
    // would leave the layers late in the catalog unread: the conservation units
    // come after 1,994 settlements.
    const ranked: { features: GeoJSON.Feature[]; matches: Omit<SearchResult, 'bbox'>[] }[] = []
    const seen = new Set<string>() // dedupe: layerId:featureIndex:fieldName

    for (const layer of searchableVectors) {
      const cached = cacheRef.current.get(layer.id)
      if (!cached) continue

      // Property that tells homonymous features apart, shown beside the label
      // and typed as the last word of a query ("bom jesus pi").
      const contextField = layer.contextField
      const matches: Omit<SearchResult, 'bbox'>[] = []

      for (let fi = 0; fi < cached.features.length; fi++) {
        const props = cached.features[fi].properties
        if (!props) continue
        const rawContext = contextField ? props[contextField] : undefined
        const context = typeof rawContext === 'string' ? rawContext : undefined

        for (const [key, raw] of Object.entries(props)) {
          // The context narrows a search, it is never a result of its own:
          // listing it would put one row per municipality of a whole state
          // under the heading "abbrev_state".
          if (key === contextField || CODE_FIELD.test(key)) continue
          if (typeof raw !== 'string' || raw === '') continue
          const match = matchTerritory(q, raw, context, {
            contextIdentifies: cached.contextIdentifies,
          })
          if (!match) continue

          const dedupeKey = `${layer.id}:${fi}:${key}`
          if (seen.has(dedupeKey)) continue
          seen.add(dedupeKey)

          matches.push({
            layerId: layer.id,
            unitName: cached.unitName,
            fieldName: key,
            value: raw,
            context,
            match,
            featureIndex: fi,
          })
        }
      }
      ranked.push({ features: cached.features, matches: matches.sort(byRank) })
    }

    // Dealt one row per layer in turn, so every layer with a match gets a share
    // of the rows; those then take the usual order. Bounding boxes only for the
    // rows dealt, as a two-letter query matches most features.
    const found: SearchResult[] = []
    for (let round = 0; found.length < MAX_RESULTS; round++) {
      const turn = ranked.filter(({ matches }) => round < matches.length)
      if (turn.length === 0) break
      for (const { features, matches } of turn) {
        if (found.length >= MAX_RESULTS) break
        const m = matches[round]
        try {
          found.push({ ...m, bbox: computeBbox(features[m.featureIndex]) })
        } catch {
          // skip features without valid geometry
        }
      }
    }

    setResults(found.sort(byRank))
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
      // Rows wrap, so a few presses take the highlight past the bottom of the
      // list; the keys scroll it along. The mouse does not, or hovering a row
      // cut off at the edge would scroll another one under the pointer.
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const next = e.key === 'ArrowDown'
          ? Math.min(highlightedIdx + 1, results.length - 1)
          : Math.max(highlightedIdx - 1, 0)
        setHighlightedIdx(next)
        rowRefs.current[next]?.scrollIntoView({ block: 'nearest' })
        return
      }
      if (e.key === 'Enter' && highlightedIdx >= 0 && results[highlightedIdx]) {
        e.preventDefault()
        handleSelect(results[highlightedIdx])
      }
    },
    [results, highlightedIdx, handleSelect],
  )

  // Highlight the matching portion of the label. The offsets come from the
  // match itself, so a query that ends in a state ("bom jesus pi") highlights
  // only the name part -- the state filtered the list, it is not text in it.

  const renderHighlighted = (value: string, match: LabelMatch) => (
    <>
      {value.slice(0, match.start)}
      <strong style={{ color: theme.colors.accent }}>
        {value.slice(match.start, match.start + match.length)}
      </strong>
      {value.slice(match.start + match.length)}
    </>
  )

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
        ...centeredInGutters(leftEdge, rightOffset),
        zIndex: 20,
        fontFamily: 'var(--font-app), sans-serif',
        // Shrinks with the strip instead of sliding under a panel.
        width: 440,
        maxWidth: gutterMaxWidth(leftEdge, rightOffset),
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
          placeholder="Buscar território..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14.5,
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
          {results.map((r, i) => (
            <div
              key={`${r.layerId}-${r.featureIndex}-${r.fieldName}`}
              ref={(el) => {
                rowRefs.current[i] = el
              }}
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
              {/* What kind of territory this row is */}
              <div
                style={{
                  fontSize: 11.5,
                  color: theme.colors.textDim,
                  marginBottom: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {r.unitName}
              </div>
              {/* Matched value. It wraps: a conservation unit's name starts with
                  its category ("Reserva Particular do Patrimônio Natural"), and
                  a single line cut off the name proper and the state. */}
              <div
                style={{
                  fontSize: 14.5,
                  color: theme.colors.text,
                  overflowWrap: 'anywhere',
                }}
              >
                {renderHighlighted(r.value, r.match)}
                {r.context && (
                  <span style={{ color: theme.colors.textDim }}>
                    {' \u00b7 '}
                    {r.context}
                  </span>
                )}
              </div>
            </div>
          ))}
          {/* Under rows, the notice says they are only part of the answer: a
              layer still downloading adds its own when it arrives. */}
          {(results.length === 0 || loadingData) && (
            <div
              style={{
                padding: '10px 12px',
                fontSize: 13.5,
                color: theme.colors.textDim,
                textAlign: 'center',
                borderTop: results.length > 0 ? `1px solid ${theme.colors.border}` : 'none',
              }}
            >
              {loadingData ? 'Carregando dados...' : 'Nenhum resultado encontrado'}
            </div>
          )}
          {/* Search includes every configured territorial vector layer. */}
          <div
            style={{
              padding: '6px 12px',
              fontSize: 11.5,
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
