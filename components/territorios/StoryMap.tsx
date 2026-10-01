'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { useTranslations } from 'next-intl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@/app/territorios-mapa.css'
import type { MultiPolygon, Polygon } from 'geojson'
import { STORY_BASEMAP } from '@/config/territorios/basemap'
import { MARK_OUTLINE_COLOR, STEP_COLORS } from '@/config/territorios/palette'
import { LAND_USE_YEARS, STORY_THEMES } from '@/config/territorios/story'
import { mapLocale } from '@/config/territorios/storyScript'
import { vectorDataUrl } from '@/lib/mapa/vectorDataUrl'
import { useStoryFmt } from './useStoryFmt'
import { interiorPoint } from '@/lib/territorios/interiorPoint'
import {
  CAATINGA_BBOX,
  MARKER_BELOW_PX,
  bboxSpanPx,
  frameBbox,
  frameOf,
  themeLegend,
  themeRaster,
  tileRequestKey,
  type Legend,
  type TileRequest,
} from '@/lib/territorios/mapStyle'
import { outsideMask } from '@/lib/outsideMask'
import type { StepId, TerritoryPayload, ThemeId } from '@/types/territorios'

export type LandUseYear = (typeof LAND_USE_YEARS)[number]

export interface StoryMapProps {
  territory: TerritoryPayload
  step:      StepId
  /** Year of the land use map; the switch lives in the step on a computer. */
  landUseYear:   LandUseYear
  onLandUseYear: (year: LandUseYear) => void
  /** The switch over the map, for the phone's sheet, which covers the step. */
  yearSwitch?:   boolean
  /**
   * False where the page does not scroll past the map (the phone's sheet): one
   * finger then pans the map instead of asking for two.
   */
  cooperative?:   boolean
  onUnauthorized: () => void
}

type Bbox = TerritoryPayload['bbox']

const THEME_SOURCE = 'tema'
const THEME_LAYER = 'tema-raster'
const MASK_SOURCE = 'mascara'
const MASK_LAYER = 'mascara-preenchimento'
const BIOME_SOURCE = 'bioma'
const TERRITORY_SOURCE = 'territorio'
const TERRITORY_FILL = 'territorio-preenchimento'
const MARKER_SOURCE = 'territorio-ponto'

/** The pre-simplified boundary: the full file is 2.3 MB for a context line. */
const BIOME_OUTLINE_URL = '/data/vector/limite_caatinga_clip.geojson'

// Tokens of app/globals.css: --bg-texto-primario, --bg-fundo, --bg-fundo-inverso.
const INK = '#001d27'
const HALO = '#fefefb'
const MASK_COLOR = '#000f15'
// --am-400. The biome used to share #ce8b44 with the settlements layer.
const BIOME_LINE = MARK_OUTLINE_COLOR

const MASK_OPACITY = 0.45
/** The rain step shows the surroundings on purpose, so they stay readable. */
const MASK_OPACITY_SURROUNDINGS = 0.25

const FIT = { padding: 32, maxZoom: 13 }
const FLY_MS = 1200

const EMPTY_COLLECTION = { type: 'FeatureCollection' as const, features: [] }

/** Tile URLs survive step changes, so returning to a step costs no request. */
const tileUrlCache = new Map<string, string>()

/** The rate limiter counts a 60 s window and a refused request does not enter it. */
const RATE_LIMITED_RETRY_MS = 10_000

// Earth Engine answered HTTP 429 to 92% of the story's tiles when MapLibre sent
// them 16 at a time (measured 2026-09-28). The tiles go through this protocol,
// which keeps a few in flight and retries a refused one after a growing pause.
const EE_PROTOCOL = 'eetile'
const EE_MAX_IN_FLIGHT = 4
const EE_MAX_ATTEMPTS = 5
const EE_RETRY_BASE_MS = 600

let eeInFlight = 0
const eeWaiting: Array<() => void> = []

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('Aborted', 'AbortError')
}

function takeEeSlot(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(abortReason(signal))
  if (eeInFlight < EE_MAX_IN_FLIGHT) {
    eeInFlight++
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const start = () => {
      signal.removeEventListener('abort', cancel)
      eeInFlight++
      resolve()
    }
    const cancel = () => {
      const i = eeWaiting.indexOf(start)
      if (i >= 0) eeWaiting.splice(i, 1)
      reject(abortReason(signal))
    }
    eeWaiting.push(start)
    signal.addEventListener('abort', cancel, { once: true })
  })
}

function releaseEeSlot() {
  eeInFlight--
  eeWaiting.shift()?.()
}

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const stop = () => {
      clearTimeout(timer)
      reject(abortReason(signal))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', stop)
      resolve()
    }, ms)
    signal.addEventListener('abort', stop, { once: true })
  })
}

const loadEeTile: maplibregl.AddProtocolAction = async (params, abortController) => {
  const url = `https://${params.url.slice(EE_PROTOCOL.length + 3)}`
  const { signal } = abortController
  for (let attempt = 1; ; attempt++) {
    await takeEeSlot(signal)
    let status: number
    try {
      const res = await fetch(url, { signal })
      if (res.ok) {
        return {
          data:         await res.arrayBuffer(),
          cacheControl: res.headers.get('Cache-Control'),
          expires:      res.headers.get('Expires'),
        }
      }
      status = res.status
    } finally {
      releaseEeSlot()
    }
    // The error event reads status and url, as on MapLibre's own AJAXError.
    if (status !== 429 || attempt === EE_MAX_ATTEMPTS) {
      throw Object.assign(new Error(`HTTP ${status}`), { status, url: params.url })
    }
    // Jittered, so the tiles refused together do not come back together.
    await pause(EE_RETRY_BASE_MS * 2 ** (attempt - 1) * (0.5 + Math.random()), signal)
  }
}

function themeOf(step: StepId): ThemeId | null {
  return STORY_THEMES.some((t) => t.id === step) ? (step as ThemeId) : null
}

/** The tile URL template, or the HTTP status that refused it (0 for a network failure). */
async function resolveTileUrl(request: TileRequest, signal: AbortSignal): Promise<string | number> {
  const key = tileRequestKey(request)
  const cached = tileUrlCache.get(key)
  if (cached) return cached

  try {
    const res = await fetch('/api/gee/tile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
    if (!res.ok) return res.status
    const { tileUrl } = await res.json() as { tileUrl?: string }
    if (typeof tileUrl !== 'string' || !tileUrl.startsWith('https://')) return 0
    const template = `${EE_PROTOCOL}://${tileUrl.slice('https://'.length)}`
    tileUrlCache.set(key, template)
    return template
  } catch {
    return 0
  }
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The open legend's height, left free below the territory so the legend does not cover it. */
function fitOptions(map: maplibregl.Map) {
  const container = map.getContainer()
  const legend = container.parentElement?.querySelector('.territorios-mapa-legenda:not(.territorios-mapa-legenda--fechada)')
  const below = Math.min(legend?.getBoundingClientRect().height ?? 0, container.clientHeight * 0.4)
  const edge = FIT.padding
  return { ...FIT, padding: { top: edge, right: edge, left: edge, bottom: edge + below } }
}

/** False when the container measures zero, as while hidden; the caller retries on resize. */
function moveTo(map: maplibregl.Map, bbox: Bbox, animate: boolean): boolean {
  const container = map.getContainer()
  if (container.clientWidth === 0 || container.clientHeight === 0) return false
  // A container that was hidden can still carry the size MapLibre gave it
  // then (400 x 300). Only on a real change: resize() fires the 'resize' event,
  // whose handler calls this function again.
  const canvas = map.getCanvas()
  if (canvas.clientWidth !== container.clientWidth || canvas.clientHeight !== container.clientHeight) map.resize()
  const bounds: maplibregl.LngLatBoundsLike = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]]
  if (animate && !reducedMotion()) {
    // fitBounds flies (linear: false) unless told otherwise.
    map.fitBounds(bounds, { ...fitOptions(map), duration: FLY_MS })
  } else {
    const camera = map.cameraForBounds(bounds, fitOptions(map))
    if (camera) map.jumpTo(camera)
  }
  return true
}

/** On the biome view a small territory is a few pixels wide, and a dot marks where it is. */
function needsMarker(map: maplibregl.Map, bbox: Bbox): boolean {
  const container = map.getContainer()
  if (container.clientWidth === 0 || container.clientHeight === 0) return false
  const camera = map.cameraForBounds([[CAATINGA_BBOX[0], CAATINGA_BBOX[1]], [CAATINGA_BBOX[2], CAATINGA_BBOX[3]]], FIT)
  return camera?.zoom !== undefined && bboxSpanPx(bbox, camera.zoom) < MARKER_BELOW_PX
}

function setVisible(map: maplibregl.Map, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}

function paintStep(map: maplibregl.Map, step: StepId, bbox: Bbox) {
  const overview = step === 'territorio'
  setVisible(map, MASK_LAYER, !overview)
  map.setPaintProperty(MASK_LAYER, 'fill-opacity', frameOf(step) === 'entorno' ? MASK_OPACITY_SURROUNDINGS : MASK_OPACITY)
  setVisible(map, TERRITORY_FILL, overview)
  setVisible(map, MARKER_SOURCE, overview && needsMarker(map, bbox))
}

function Swatch({ color, outlined }: { color: string; outlined: boolean }) {
  return (
    <span
      className="territorios-mapa-cor"
      style={{
        background: color,
        boxShadow: outlined ? `inset 0 0 0 1px ${MARK_OUTLINE_COLOR}` : undefined,
      }}
    />
  )
}

function MapLegend({ legend }: { legend: Legend }) {
  const t = useTranslations('TerritoriosMap')
  const [open, setOpen] = useState(true)

  return (
    <div className={open ? 'territorios-mapa-legenda' : 'territorios-mapa-legenda territorios-mapa-legenda--fechada'}>
      <button
        type="button"
        className="territorios-mapa-legenda-botao"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {t('legend')}
      </button>
      <div className="territorios-mapa-legenda-corpo">
        {legend.kind === 'classes' ? (
          <ul className="territorios-mapa-classes">
            {legend.items.map((item) => (
              <li key={item.label}>
                <Swatch color={item.color} outlined={item.outlined} />
                {item.label}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="territorios-mapa-rampa-titulo">{legend.title}</p>
            <span
              className="territorios-mapa-rampa"
              style={{ background: `linear-gradient(to right, ${legend.palette.join(', ')})` }}
            />
            <span className="territorios-mapa-rampa-extremos">
              <span>{legend.min}</span>
              <span>{legend.max}</span>
            </span>
          </>
        )}
      </div>
    </div>
  )
}

export default function StoryMap({
  territory, step, landUseYear, onLandUseYear, yearSwitch = false, cooperative = true, onUnauthorized,
}: StoryMapProps) {
  const t = useTranslations('TerritoriosMap')
  const ui = useTranslations('TerritoriosUi')
  const fmt = useStoryFmt()
  // The map is built once, in the language of the first render.
  const controlTextRef = useRef(mapLocale((key, values) => t(key, values)))
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(false)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [tileAttempt, setTileAttempt] = useState(0)

  const territoryRef = useRef(territory)
  const stepRef = useRef(step)
  const onUnauthorizedRef = useRef(onUnauthorized)
  const pendingMoveRef = useRef(false)
  /** `${territory}|${frame}` the camera shows; null before the first framing. */
  const framedRef = useRef<string | null>(null)
  const activeKeyRef = useRef<string | null>(null)
  /** The URL template the theme source shows; null while none is attached. */
  const activeUrlRef = useRef<string | null>(null)
  const tileLoadedRef = useRef(false)
  /** Keys whose dead URL was already replaced once since their last loaded tile. */
  const renewedRef = useRef(new Set<string>())

  useEffect(() => { territoryRef.current = territory }, [territory])
  useEffect(() => { stepRef.current = step }, [step])
  useEffect(() => { onUnauthorizedRef.current = onUnauthorized }, [onUnauthorized])

  // One map for the whole story: created on mount, never rebuilt per step.
  useEffect(() => {
    const container = containerRef.current
    const basemap = STORY_BASEMAP
    if (!container || !basemap) return
    maplibregl.addProtocol(EE_PROTOCOL, loadEeTile)
    const start = frameBbox(frameOf(stepRef.current), territoryRef.current.bbox)

    const map = new maplibregl.Map({
      container,
      // Starting on the step's view rather than on the default world view
      // spares the basemap requests for zoom 0 around null island.
      bounds: [[start[0], start[1]], [start[2], start[3]]],
      fitBoundsOptions: FIT,
      attributionControl: { compact: true },
      locale: controlTextRef.current,
      // The page scrolls past the map; a wheel over it must keep scrolling, and
      // so must one finger on a phone, where the map spans the screen's width.
      scrollZoom:      false,
      cooperativeGestures: true,
      dragRotate:      false,
      pitchWithRotate: false,
      touchPitch:      false,
      fadeDuration:    0,
      style: {
        version: 8,
        sources: {
          base: {
            type: 'raster', tiles: [basemap.url], tileSize: 256,
            attribution: basemap.attribution, maxzoom: basemap.maxZoom,
          },
          [MASK_SOURCE]:      { type: 'geojson', data: EMPTY_COLLECTION },
          [BIOME_SOURCE]:     { type: 'geojson', data: vectorDataUrl(BIOME_OUTLINE_URL) },
          [TERRITORY_SOURCE]: { type: 'geojson', data: EMPTY_COLLECTION },
          [MARKER_SOURCE]:    { type: 'geojson', data: EMPTY_COLLECTION },
        },
        layers: [
          { id: 'base', type: 'raster', source: 'base' },
          {
            id: MASK_LAYER, type: 'fill', source: MASK_SOURCE,
            paint: { 'fill-color': MASK_COLOR, 'fill-opacity': MASK_OPACITY },
          },
          {
            id: 'bioma-contorno', type: 'line', source: BIOME_SOURCE,
            paint: { 'line-color': BIOME_LINE, 'line-width': 1.5 },
          },
          {
            id: TERRITORY_FILL, type: 'fill', source: TERRITORY_SOURCE,
            layout: { visibility: 'none' },
            paint: { 'fill-color': STEP_COLORS.territorio, 'fill-opacity': 0.75 },
          },
          {
            id: 'territorio-halo', type: 'line', source: TERRITORY_SOURCE,
            layout: { 'line-join': 'round' },
            paint: { 'line-color': HALO, 'line-width': 5, 'line-opacity': 0.9 },
          },
          {
            id: 'territorio-contorno', type: 'line', source: TERRITORY_SOURCE,
            layout: { 'line-join': 'round' },
            paint: { 'line-color': INK, 'line-width': 2 },
          },
          {
            id: MARKER_SOURCE, type: 'circle', source: MARKER_SOURCE,
            layout: { visibility: 'none' },
            paint: {
              'circle-radius': 7,
              'circle-color': STEP_COLORS.territorio,
              'circle-stroke-width': 2,
              'circle-stroke-color': INK,
            },
          },
        ],
      },
    })
    map.touchZoomRotate.disableRotation()
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('resize', () => {
      if (!pendingMoveRef.current) return
      const bbox = territoryRef.current.bbox
      if (moveTo(map, frameBbox(frameOf(stepRef.current), bbox), false)) {
        pendingMoveRef.current = false
        paintStep(map, stepRef.current, bbox)
      }
    })
    map.on('sourcedata', (e) => {
      if (e.sourceId !== THEME_SOURCE || !e.tile) return
      tileLoadedRef.current = true
      if (activeKeyRef.current) renewedRef.current.delete(activeKeyRef.current)
    })
    // Failures before any tile loaded mean the URL is dead (an expired Earth
    // Engine token), and the cached URL goes with it. A 429 left after the
    // retries is load, not a dead URL. Neither shows "Mapa indisponível",
    // which is for the tile URL request alone.
    map.on('error', (e) => {
      const { sourceId, error } = e as maplibregl.ErrorEvent & { sourceId?: string }
      const key = activeKeyRef.current
      const template = activeUrlRef.current
      if (sourceId !== THEME_SOURCE || !key || !template || tileLoadedRef.current) return
      const { url, status } = (error ?? {}) as { url?: unknown; status?: unknown }
      if (status === 429) return
      // A late failure from the URL this one replaced says nothing about it.
      if (typeof url === 'string' && !url.startsWith(template.slice(0, template.indexOf('{')))) return

      tileUrlCache.delete(key)
      // The token can run out while the visitor stays on the step, so a dead
      // URL is replaced once; a second one in a row is left as it is.
      if (renewedRef.current.has(key)) return
      renewedRef.current.add(key)
      activeUrlRef.current = null
      setTileAttempt((n) => n + 1)
    })
    map.once('load', () => setReady(true))

    mapRef.current = map
    return () => {
      mapRef.current = null
      map.remove()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (cooperative) map.cooperativeGestures.enable()
    else map.cooperativeGestures.disable()
  }, [cooperative])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    const geometry = territory.geometry as Polygon | MultiPolygon
    const point = interiorPoint(territory.geometry)
    ;(map.getSource(MASK_SOURCE) as maplibregl.GeoJSONSource).setData(outsideMask(territory.geometry))
    ;(map.getSource(TERRITORY_SOURCE) as maplibregl.GeoJSONSource).setData({ type: 'Feature', properties: {}, geometry })
    ;(map.getSource(MARKER_SOURCE) as maplibregl.GeoJSONSource).setData({
      type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [point.lon, point.lat] },
    })
  }, [ready, territory])

  // Territory: the whole Caatinga with the territory filled in. From the stock
  // step on, the territory; on the rain step, its surroundings too.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    paintStep(map, step, territory.bbox)
    const territoryId = `${territory.recorteId}/${territory.featureId}`
    const framed = `${territoryId}|${frameOf(step)}`
    if (framedRef.current === framed) return
    const animate = framedRef.current?.startsWith(`${territoryId}|`) ?? false
    framedRef.current = framed
    pendingMoveRef.current = !moveTo(map, frameBbox(frameOf(step), territory.bbox), animate)
  }, [ready, step, territory])

  const themeId = themeOf(step)
  const year = themeId === 'uso' ? landUseYear : undefined

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    setVisible(map, THEME_LAYER, false)
    activeUrlRef.current = null
    if (!themeId) {
      activeKeyRef.current = null
      return
    }

    const { request, opacity, resampling } = themeRaster(themeId, year)
    const key = tileRequestKey(request)
    activeKeyRef.current = key
    const controller = new AbortController()
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    void resolveTileUrl(request, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      if (typeof result === 'number') {
        if (result === 401) onUnauthorizedRef.current()
        setFailedKey(key)
        if (result === 429) retryTimer = setTimeout(() => setTileAttempt((n) => n + 1), RATE_LIMITED_RETRY_MS)
        return
      }

      activeUrlRef.current = result
      tileLoadedRef.current = false
      // A new source rather than setTiles: setTiles keeps the previous theme's
      // tiles wherever a new tile fails (a 429 from Earth Engine), so the rain
      // map showed patches of the degradation map.
      if (map.getLayer(THEME_LAYER)) map.removeLayer(THEME_LAYER)
      if (map.getSource(THEME_SOURCE)) map.removeSource(THEME_SOURCE)
      map.addSource(THEME_SOURCE, { type: 'raster', tiles: [result], tileSize: 256 })
      // Below the mask, so the outside of the territory reads dimmed.
      map.addLayer({ id: THEME_LAYER, type: 'raster', source: THEME_SOURCE }, MASK_LAYER)
      map.setPaintProperty(THEME_LAYER, 'raster-opacity', opacity)
      map.setPaintProperty(THEME_LAYER, 'raster-resampling', resampling)
      setVisible(map, THEME_LAYER, true)
      setFailedKey((prev) => (prev === key ? null : prev))
    })

    return () => {
      controller.abort()
      clearTimeout(retryTimer)
    }
  }, [ready, themeId, year, tileAttempt])

  const unavailable = themeId !== null && failedKey === tileRequestKey(themeRaster(themeId, year).request)

  return (
    <div className="territorios-mapa">
      <div ref={containerRef} className="territorios-mapa-canvas" />
      {themeId === 'uso' && yearSwitch && (
        <div className="territorios-mapa-anos" role="group" aria-label={ui('mapYear')}>
          {LAND_USE_YEARS.map((y) => (
            <button key={y} type="button" aria-pressed={y === landUseYear} onClick={() => onLandUseYear(y)}>
              {y}
            </button>
          ))}
        </div>
      )}
      {themeId && !unavailable && <MapLegend legend={themeLegend(themeId, fmt)} />}
      {unavailable && <p className="territorios-mapa-aviso" role="status">{t('unavailable')}</p>}
    </div>
  )
}
