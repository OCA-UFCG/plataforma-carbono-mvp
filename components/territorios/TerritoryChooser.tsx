'use client'

import dynamic from 'next/dynamic'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import '@/app/territorios-escolha.css'
import ConfirmCard from './ConfirmCard'
import TerritorySearch from './TerritorySearch'
import appConfig from '@/config/mapa/layers.json'
import { CHOOSER } from '@/config/territorios/chooserScript'
import { STEP_COLORS } from '@/config/territorios/palette'
import type { TerritoryType } from '@/config/territorios/story'
import { TERRITORY_SCRIPT } from '@/config/territorios/storyScript'
import { vectorDataUrl } from '@/lib/mapa/vectorDataUrl'
import {
  extractPolygonal,
  featureEntries,
  labelFieldOf,
  type FeatureEntry,
  type PolygonalGeometry,
} from '@/lib/territorios/featureIds'
import { containsPoint, findContaining, nearestFeatures } from '@/lib/territorios/geometry'
import type { VectorLayerConfig } from '@/types/mapa'
import type { TerritoryTypeId } from '@/types/territorios'

// MapLibre needs WebGL and window; the region around it shows the loading state.
const ChooserMap = dynamic(() => import('./ChooserMap'), { ssr: false })

export interface TerritoryChooserProps {
  /** An enabled type other than 'bioma'. */
  type:           TerritoryType
  /** Receives the recorteRegistry id /api/territorios/territorio expects. */
  onChoose:       (featureId: string) => void
  onBack:         () => void
  /**
   * For a 401 from any request the chooser makes. Every file it reads today is
   * a public static one, so nothing calls it yet.
   */
  onUnauthorized: () => void
}

/** The simplified boundary, the one the story map outlines and the registry measures the biome by. */
const BIOME_URL = '/data/vector/limite_caatinga_clip.geojson'

/** Types whose territories are small and scattered, so a location usually falls between them. */
const NEAREST_TYPES: TerritoryTypeId[] = ['assentamento', 'terra_indigena', 'territorio_quilombola']
const NEAREST_COUNT = 3

/**
 * How far from the nearest outline a location that falls in none still gets
 * that territory. The biome outline is simplified and does not follow the
 * recorte outlines: on 20 000 random points over the biome's bbox, 34 inside
 * it fell in no municipality and 18 in no state, up to 7.4 km from a vertex of
 * the nearest one, and 20 inside the full boundary fell outside the simplified
 * one (measured on 2026-09-16).
 */
const EDGE_TOLERANCE_KM = 10

const LOCATE_TIMEOUT_MS = 12_000
/**
 * The API's own timeout does not run while the permission prompt is open, and
 * a prompt closed without an answer calls neither callback.
 */
const LOCATE_GIVE_UP_MS = LOCATE_TIMEOUT_MS + 8_000
const LOCATE_CACHE_MS = 300_000
/**
 * Coarser fixes are refused. A network fix on a desktop is often a few km off,
 * which still lands in the right municipality or near the right settlement; one
 * tens of km off still names the state away from its borders. The card asks
 * before anything opens.
 */
const MAX_ACCURACY_M: Partial<Record<TerritoryTypeId, number>> = { estado: 50_000, municipio: 10_000 }
const DEFAULT_MAX_ACCURACY_M = 5_000

interface ChooserData {
  collection: FeatureCollection
  entries:    FeatureEntry[]
  biome:      PolygonalGeometry
}

type DataLoad =
  | { key: string; status: 'ready'; data: ChooserData }
  | { key: string; status: 'error' }

interface LocationOption {
  index:      number
  distanceKm: number
}

/** Territories offered as a list: the nearest ones, or the overlapping ones that all contain the location. */
interface LocationOptions {
  reason: 'nearest' | 'overlap'
  items:  LocationOption[]
}

type LocateState = 'idle' | 'locating' | 'error'

type LocationOutcome =
  | { kind: 'inside'; index: number }
  | { kind: 'options'; options: LocationOptions }
  | { kind: 'outside' }
  | { kind: 'uncovered' }

function vectorLayer(recorteId: string | null): VectorLayerConfig | undefined {
  return (appConfig.layers as VectorLayerConfig[]).find((l) => l.type === 'vector' && l.id === recorteId)
}

// PRIVACY: lon and lat are only read here, against files already in the
// browser. Neither is kept in state, put in a URL or sent anywhere; what
// leaves this function is a file index and a distance.
function resolveLocation(data: ChooserData, typeId: TerritoryTypeId, lon: number, lat: number): LocationOutcome {
  const hits = findContaining(data.entries, lon, lat)
  if (hits.length === 1) return { kind: 'inside', index: hits[0].index }
  if (hits.length > 1) {
    return { kind: 'options', options: { reason: 'overlap', items: hits.map((e) => ({ index: e.index, distanceKm: 0 })) } }
  }

  const scattered = NEAREST_TYPES.includes(typeId)
  const nearest = nearestFeatures(data.entries, lon, lat, scattered ? NEAREST_COUNT : 1)
  const nearEdge = nearest.length > 0 && nearest[0].distanceKm <= EDGE_TOLERANCE_KM
  const inBiome = containsPoint(data.biome, lon, lat)

  if (scattered) {
    if (nearest.length === 0) return inBiome ? { kind: 'uncovered' } : { kind: 'outside' }
    if (!inBiome && !nearEdge) return { kind: 'outside' }
    return {
      kind: 'options',
      options: { reason: 'nearest', items: nearest.map(({ item, distanceKm }) => ({ index: item.index, distanceKm })) },
    }
  }
  // States and municipalities cover the whole biome, so a location in none of
  // them sits in a gap between simplified outlines.
  if (nearEdge) return { kind: 'inside', index: nearest[0].item.index }
  return inBiome ? { kind: 'uncovered' } : { kind: 'outside' }
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(vectorDataUrl(url), { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export default function TerritoryChooser({ type, onChoose, onBack }: TerritoryChooserProps) {
  const layer = useMemo(() => vectorLayer(type.recorteId), [type.recorteId])
  const labelField = layer ? labelFieldOf(layer) : undefined

  const [attempt, setAttempt] = useState(0)
  const [load, setLoad] = useState<DataLoad | null>(null)
  const [candidate, setCandidate] = useState<number | null>(null)
  const [options, setOptions] = useState<LocationOptions | null>(null)
  const [locateState, setLocateState] = useState<LocateState>('idle')
  const [locateMessage, setLocateMessage] = useState<string | null>(null)

  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const mapRegionRef = useRef<HTMLDivElement | null>(null)
  /** The proposal as of the last render, for the location callback that outlives it. */
  const candidateRef = useRef<number | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const restoreFocusRef = useRef(false)
  /** The location request that may still change the state; a callback of any other one is ignored. */
  const locateRef = useRef<{ id: number; timer?: ReturnType<typeof setTimeout> }>({ id: 0 })
  const noteId = useId()

  // Keyed rather than reset, so a retry shows the loading state again without
  // a synchronous state write in the effect.
  const loadKey = `${type.recorteId}|${attempt}`
  const current = load?.key === loadKey ? load : null
  const data = current?.status === 'ready' ? current.data : null
  const status = !labelField || current?.status === 'error' ? 'error' : data ? 'ready' : 'loading'

  // The type card that opened this screen is gone with the previous one.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const pending = locateRef.current
    return () => {
      pending.id += 1
      clearTimeout(pending.timer)
    }
  }, [])

  useEffect(() => {
    if (!layer || !labelField) return
    const controller = new AbortController()

    // One download per file: the parsed collection feeds the map, the ids, the
    // search and the location lookup alike.
    Promise.all([fetchJson(layer.url, controller.signal), fetchJson(BIOME_URL, controller.signal)])
      .then(([typeFile, biomeFile]) => {
        const collection = typeFile as FeatureCollection
        const biome = extractPolygonal((biomeFile as FeatureCollection).features?.[0]?.geometry)
        if (!Array.isArray(collection.features) || !biome) throw new Error('Unexpected vector file')
        const entries = featureEntries(collection.features, {
          labelField,
          // A state's context is its own abbreviation: "Paraíba (PB)".
          contextField: type.id === 'estado' ? undefined : layer.contextField,
          layerName:    layer.name,
        })
        setLoad({ key: loadKey, status: 'ready', data: { collection, entries, biome } })
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoad({ key: loadKey, status: 'error' })
      })

    return () => controller.abort()
  }, [layer, labelField, loadKey, type.id])

  const byIndex = useMemo(() => new Map((data?.entries ?? []).map((e) => [e.index, e])), [data])
  const candidateEntry = candidate === null ? undefined : byIndex.get(candidate)

  useEffect(() => {
    candidateRef.current = candidate
    if (candidate !== null || !restoreFocusRef.current) return
    restoreFocusRef.current = false
    const target = returnFocusRef.current
    returnFocusRef.current = null
    if (target?.isConnected && !target.matches(':disabled')) target.focus()
    else headingRef.current?.focus()
  }, [candidate])

  function propose(index: number) {
    const active = document.activeElement
    if (candidateRef.current === null) {
      returnFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : null
    }
    candidateRef.current = index
    setCandidate(index)
  }

  function chooseAnother() {
    restoreFocusRef.current = true
    candidateRef.current = null
    setCandidate(null)
  }

  function failLocate(message: string) {
    setLocateState('error')
    setLocateMessage(message)
  }

  function locate() {
    if (!data || locateState === 'locating') return
    setOptions(null)
    if (!('geolocation' in navigator)) {
      failLocate(CHOOSER.locateUnsupported)
      return
    }
    setLocateState('locating')
    setLocateMessage(null)

    const pending = locateRef.current
    const id = ++pending.id
    const isCurrent = () => pending.id === id
    const settle = () => {
      pending.id += 1
      clearTimeout(pending.timer)
    }
    clearTimeout(pending.timer)
    pending.timer = setTimeout(() => {
      if (!isCurrent()) return
      settle()
      failLocate(CHOOSER.locateTimeout)
    }, LOCATE_GIVE_UP_MS)

    const maxAccuracy = MAX_ACCURACY_M[type.id] ?? DEFAULT_MAX_ACCURACY_M
    const ask = (maximumAge: number) => {
      const askedAt = Date.now()
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isCurrent()) return
          if (position.coords.accuracy > maxAccuracy) {
            // A coarse fix from the cache would come back on every try for as long as it is kept.
            if (maximumAge > 0 && position.timestamp < askedAt) {
              ask(0)
              return
            }
            settle()
            failLocate(CHOOSER.locateImprecise)
            return
          }
          settle()
          const outcome = resolveLocation(data, type.id, position.coords.longitude, position.coords.latitude)
          if (outcome.kind === 'outside') {
            failLocate(CHOOSER.locateOutside)
            return
          }
          if (outcome.kind === 'uncovered') {
            failLocate(CHOOSER.locateNotCovered)
            return
          }
          setLocateState('idle')
          if (outcome.kind === 'options') {
            setOptions(outcome.options)
            return
          }
          // A territory picked on the map or by name while the browser was
          // locating stays the proposal.
          if (candidateRef.current === null) propose(outcome.index)
        },
        (error) => {
          if (!isCurrent()) return
          settle()
          failLocate(
            error.code === error.PERMISSION_DENIED ? CHOOSER.locateDenied
              : error.code === error.TIMEOUT ? CHOOSER.locateTimeout
                : CHOOSER.locateUnavailable,
          )
        },
        { enableHighAccuracy: false, timeout: LOCATE_TIMEOUT_MS, maximumAge },
      )
    }
    ask(LOCATE_CACHE_MS)
  }

  function showMap() {
    const region = mapRegionRef.current
    if (!region) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    region.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
    region.focus({ preventScroll: true })
  }

  const optionsLead = options
    ? (options.reason === 'overlap' ? CHOOSER.overlapLead : CHOOSER.nearestLead)[type.id]
    : undefined
  const plural = type.plural ?? type.label

  return (
    <section className="territorios-escolha">
      <div className="territorios-escolha-painel">
        <header className="territorios-escolha-topo">
          <button type="button" className="territorios-escolha-voltar" onClick={onBack}>
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {CHOOSER.backToTypes}
          </button>
          <h1 ref={headingRef} tabIndex={-1} className="territorios-pergunta">{type.searchQuestion}</h1>
        </header>

        {candidateEntry && (
          <ConfirmCard
            entry={candidateEntry}
            unitLabel={type.unitLabel}
            // A state's name already says which one it is.
            context={type.id === 'estado' ? undefined : candidateEntry.context}
            onConfirm={() => onChoose(candidateEntry.id)}
            onCancel={chooseAnother}
          />
        )}

        <div className="territorios-escolha-caminhos" hidden={candidateEntry !== undefined}>
          {data && (
            <TerritorySearch
              entries={data.entries}
              plural={type.plural}
              onPropose={propose}
              onShowMap={showMap}
            />
          )}

          <div className="territorios-escolha-local">
            {/* aria-disabled while locating: a disabled button would drop the focus it holds. */}
            <button
              type="button"
              className="territorios-btn territorios-btn--contorno territorios-escolha-localizar"
              onClick={locate}
              disabled={!data}
              aria-disabled={locateState === 'locating' || undefined}
              aria-describedby={noteId}
            >
              {CHOOSER.locate}
            </button>
            <p id={noteId} className="territorios-escolha-nota">{CHOOSER.locateNote}</p>

            <div aria-live="polite">
              {locateState === 'locating' && (
                <p className="territorios-escolha-mensagem">{CHOOSER.locating}</p>
              )}
              {locateState === 'error' && locateMessage && (
                <p className="territorios-escolha-mensagem territorios-escolha-mensagem--aviso">{locateMessage}</p>
              )}
              {options && options.items.length > 0 && optionsLead && (
                <p className="territorios-escolha-mensagem">{optionsLead}</p>
              )}
            </div>

            {options && options.items.length > 0 && (
              <ul className="territorios-escolha-proximos">
                {options.items.map((option) => {
                  const entry = byIndex.get(option.index)
                  if (!entry) return null
                  return (
                    <li key={option.index}>
                      <button type="button" className="territorios-escolha-proximo" onClick={() => propose(option.index)}>
                        <span>{TERRITORY_SCRIPT.title(entry.name, entry.context)}</span>
                        {options.reason === 'nearest' && (
                          <span className="territorios-escolha-distancia">{CHOOSER.distance(option.distanceKm)}</span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div
        ref={mapRegionRef}
        className="territorios-escolha-mapa"
        role="region"
        aria-label={CHOOSER.mapLabel(plural)}
        tabIndex={-1}
      >
        {data && (
          <ChooserMap
            collection={data.collection}
            entries={data.entries}
            biome={data.biome}
            color={STEP_COLORS.territorio}
            markers={NEAREST_TYPES.includes(type.id)}
            selectedIndex={candidateEntry ? candidateEntry.index : null}
            onPick={propose}
          />
        )}
        {status === 'loading' && (
          <p className="territorios-escolha-mapa-estado" role="status">{CHOOSER.loading}</p>
        )}
        {status === 'error' && (
          <div className="territorios-escolha-mapa-estado" role="alert">
            <p>{CHOOSER.loadError}</p>
            <button
              type="button"
              className="territorios-btn territorios-btn--contorno"
              onClick={() => setAttempt((n) => n + 1)}
            >
              {CHOOSER.retry}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
