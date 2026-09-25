'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol as PMTilesProtocol } from 'pmtiles'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import DrawRectangleMode from '@/lib/mapa/drawRectangleMode'

// mapbox-gl-draw's default styles use `line-dasharray` expressions that
// MapLibre v5 rejects (bare arrays are parsed as expressions, need
// `["literal", [...]]` wrapping). This `MAPBOX_DRAW_STYLES` array is the
// MapLibre-compatible version from the official MapLibre example
// https://maplibre.org/maplibre-gl-js/docs/examples/draw-polygon-with-mapbox-gl-draw/
const MAPBOX_DRAW_STYLES: object[] = [
  { id: 'gl-draw-polygon-fill-inactive',               type: 'fill',   filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']], paint: { 'fill-color': '#3bb2d0', 'fill-outline-color': '#3bb2d0', 'fill-opacity': 0.1 } },
  { id: 'gl-draw-polygon-fill-active',                 type: 'fill',   filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],                              paint: { 'fill-color': '#fbb03b', 'fill-outline-color': '#fbb03b', 'fill-opacity': 0.1 } },
  { id: 'gl-draw-polygon-midpoint',                    type: 'circle', filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],                              paint: { 'circle-radius': 3, 'circle-color': '#fbb03b' } },
  { id: 'gl-draw-polygon-stroke-inactive',             type: 'line',   filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#3bb2d0', 'line-width': 2 } },
  { id: 'gl-draw-polygon-stroke-active',               type: 'line',   filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],                              layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fbb03b', 'line-dasharray': [0.2, 2], 'line-width': 2 } },
  { id: 'gl-draw-line-inactive',                       type: 'line',   filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString'], ['!=', 'mode', 'static']], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#3bb2d0', 'line-width': 2 } },
  { id: 'gl-draw-line-active',                         type: 'line',   filter: ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true']],                            layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fbb03b', 'line-dasharray': [0.2, 2], 'line-width': 2 } },
  { id: 'gl-draw-polygon-and-line-vertex-stroke-inactive', type: 'circle', filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']], paint: { 'circle-radius': 5, 'circle-color': '#fff' } },
  { id: 'gl-draw-polygon-and-line-vertex-inactive',    type: 'circle', filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],       paint: { 'circle-radius': 3, 'circle-color': '#fbb03b' } },
  { id: 'gl-draw-point-point-stroke-inactive',         type: 'circle', filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['!=', 'mode', 'static']], paint: { 'circle-radius': 5, 'circle-opacity': 1, 'circle-color': '#fff' } },
  { id: 'gl-draw-point-inactive',                      type: 'circle', filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['!=', 'mode', 'static']], paint: { 'circle-radius': 3, 'circle-color': '#3bb2d0' } },
  { id: 'gl-draw-point-stroke-active',                 type: 'circle', filter: ['all', ['==', '$type', 'Point'], ['==', 'active', 'true'], ['!=', 'meta', 'midpoint']],     paint: { 'circle-radius': 7, 'circle-color': '#fff' } },
  { id: 'gl-draw-point-active',                        type: 'circle', filter: ['all', ['==', '$type', 'Point'], ['!=', 'meta', 'midpoint'], ['==', 'active', 'true']],     paint: { 'circle-radius': 5, 'circle-color': '#fbb03b' } },
  { id: 'gl-draw-polygon-fill-static',                 type: 'fill',   filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],                               paint: { 'fill-color': '#404040', 'fill-outline-color': '#404040', 'fill-opacity': 0.1 } },
  { id: 'gl-draw-polygon-stroke-static',               type: 'line',   filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],                               layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#404040', 'line-width': 2 } },
  { id: 'gl-draw-line-static',                         type: 'line',   filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'LineString']],                            layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#404040', 'line-width': 2 } },
  { id: 'gl-draw-point-static',                        type: 'circle', filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'Point']],                                 paint: { 'circle-radius': 5, 'circle-color': '#404040' } },
]
import { area as turfArea } from '@turf/area'
import { useStore, mapConfig } from '@/lib/mapa/store'
import {
  bumpAnalysisSeq,
  currentAnalysisSeq,
  runVisibleRasterAnalyses,
} from '@/lib/mapa/analysisRunner'
import { pickMostSpecific, type VectorPickCandidate } from '@/lib/mapa/pickVector'
import { clickableRecortes, topVisibleRasterIndex } from '@/lib/mapa/analysisTargets'
import { vectorDataUrl } from '@/lib/mapa/vectorDataUrl'
import { COORDINATE_ORIGIN } from '@/lib/mapa/parseCoordinates'
import { computeBbox } from '@/lib/mapa/computeBbox'
import { basemaps } from '@/config/mapa/basemaps'
import type {
  LayerConfig,
  VectorLayerConfig,
  RasterLayerConfig,
  PlatformTheme,
  SelectedGeometry,
  DrawMode,
} from '@/types/mapa'
import FloatingLegend from './overlays/FloatingLegend'
import MapControls from './overlays/MapControls'
import DrawToolbar from './overlays/DrawToolbar'
import CursorCoordinates from './overlays/CursorCoordinates'
import TemporalSlider from './overlays/TemporalSlider'
import FloatingSearchBar from './overlays/FloatingSearchBar'

// Full-feature geometry lookup
// map.queryRenderedFeatures returns geometry CLIPPED to the tiles under the
// cursor, so area and zonal stats computed from it would cover only the visible
// fragment of a large feature. We instead fetch the source GeoJSON once (cached)
// and resolve the complete geometry by feature id. With `generateId: true`,
// MapLibre assigns feature.id = index in the source features array.

const vectorFeatureCache = new Map<string, GeoJSON.FeatureCollection>()

async function loadVectorFeatureCollection(url: string): Promise<GeoJSON.FeatureCollection | null> {
  const cached = vectorFeatureCache.get(url)
  if (cached) return cached
  try {
    const res = await fetch(vectorDataUrl(url))
    if (!res.ok) return null
    const fc = (await res.json()) as GeoJSON.FeatureCollection
    vectorFeatureCache.set(url, fc)
    return fc
  } catch {
    return null
  }
}

async function fullFeatureGeometry(
  vec: VectorLayerConfig,
  featureId: number | string | undefined,
): Promise<GeoJSON.Geometry | null> {
  // Only plain GeoJSON sources use index-based ids; pmtiles/wfs would need a
  // promoteId match, but no current recorte layer uses those.
  if (featureId === undefined || featureId === null || vec.source) return null
  const idx = Number(featureId)
  if (!Number.isInteger(idx)) return null
  const fc = await loadVectorFeatureCollection(vec.url)
  return fc?.features?.[idx]?.geometry ?? null
}

// No basemap is baked in, the basemap is added as a separate raster layer
// after 'load' and swapped reactively when the user picks another provider.
// We deliberately omit a background layer so our swap logic (which uses
// beforeId = first layer) doesn't end up inserting the new basemap underneath
// an opaque background.
const EMPTY_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs:  'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {},
  layers:  [],
}

const BASEMAP_SOURCE_ID = 'basemap'
const BASEMAP_LAYER_ID  = 'basemap'

// Toolbar tool -> mapbox-gl-draw mode name.
const MAPBOX_DRAW_MODE: Record<Exclude<DrawMode, null>, string> = {
  polygon:    'draw_polygon',
  rectangle:  'draw_rectangle',
  linestring: 'draw_line_string',
  point:      'draw_point',
}

// Geodesic length in km for a LineString (Haversine over segments)

function lineStringLengthKm(coords: number[][]): number {
  const R = 6371 // km
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1]
    const [lon2, lat2] = coords[i]
    const toRad = Math.PI / 180
    const dLat = (lat2 - lat1) * toRad
    const dLon = (lon2 - lon1) * toRad
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2
    total += 2 * R * Math.asin(Math.sqrt(a))
  }
  return total
}

// Generic: add any layer to the MapLibre map

function addLayerToMap(map: maplibregl.Map, layer: LayerConfig) {
  const vis = layer.visible ? 'visible' : 'none'

  if (layer.type === 'vector') {
    const l = layer as VectorLayerConfig
    const isPMTiles = l.source === 'pmtiles'
    // For PMTiles vector tile sources, sublayers need a `source-layer` reference.
    const sl = isPMTiles && l.sourceLayer ? { 'source-layer': l.sourceLayer } : {}

    const isWfs = l.source === 'wfs'

    if (!map.getSource(l.id)) {
      if (isPMTiles) {
        map.addSource(l.id, {
          type: 'vector',
          url: `pmtiles://${window.location.origin}${l.url}`,
          ...(l.promoteId ? { promoteId: l.promoteId } : {}),
        })
      } else if (isWfs) {
        // WFS layer starts empty. Features are populated on every
        // map `moveend` by the viewport-loading effect below, filtered
        // to the current bbox. Uses `promoteId` (typically a stable
        // feature attribute like `cod_imovel`) so feature-state survives
        // data refreshes.
        map.addSource(l.id, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          ...(l.promoteId ? { promoteId: l.promoteId } : {}),
        })
      } else {
        // generateId enables MapLibre's feature-state API for hover highlighting.
        map.addSource(l.id, { type: 'geojson', data: vectorDataUrl(l.url), generateId: true })
      }
    }

    // Fill, opacity bumps when feature-state.hover OR feature-state.selected
    map.addLayer({
      id: `${l.id}-fill`,
      type: 'fill',
      source: l.id,
      ...sl,
      layout: { visibility: vis },
      paint: {
        'fill-color': l.color,
        'fill-opacity': [
          'case',
          ['any',
            ['boolean', ['feature-state', 'hover'],    false],
            ['boolean', ['feature-state', 'selected'], false],
          ],
          (l.opacity / 100) * 0.7,
          (l.opacity / 100) * 0.35,
        ],
      },
    })

    // Outline, thickens on hover OR selected
    map.addLayer({
      id: `${l.id}-outline`,
      type: 'line',
      source: l.id,
      ...sl,
      layout: { visibility: vis },
      paint: {
        'line-color': l.color,
        'line-width': [
          'case',
          ['any',
            ['boolean', ['feature-state', 'hover'],    false],
            ['boolean', ['feature-state', 'selected'], false],
          ],
          3,
          1.5,
        ],
        'line-opacity': l.opacity / 100,
      },
    })

    // Circle, only for Point features. The filter prevents MapLibre from
    // rendering circles at every vertex of Polygon/LineString features.
    map.addLayer({
      id: `${l.id}-circle`,
      type: 'circle',
      source: l.id,
      ...sl,
      filter: ['==', ['geometry-type'], 'Point'],
      layout: { visibility: vis },
      paint: {
        'circle-radius': 5,
        'circle-color': l.color,
        'circle-opacity': l.opacity / 100,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
        'circle-stroke-opacity': l.opacity / 100,
      },
    })

    // Label, only if the config specifies which field to use
    if (l.labelField) {
      map.addLayer({
        id: `${l.id}-label`,
        type: 'symbol',
        source: l.id,
        ...sl,
        layout: {
          visibility: vis,
          'text-field': ['get', l.labelField],
          'text-size': 11,
          'text-font': ['Noto Sans Regular'],
          'text-anchor': 'center',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#1e293b',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      })
    }

  } else if (layer.type === 'raster') {
    const l = layer as RasterLayerConfig

    // Resolve the tile URL from the store's GEE cache. Until activateDynamicLayer
    // resolves it, return a sentinel (null) so the caller skips and retries.
    if (l.source !== 'gee') return false // only GEE rasters are supported
    let tileUrl: string | null
    {
      const store = useStore.getState()
      // Temporal layers: look up by current date
      const tempDate = store.temporalDate[l.id]
      if (tempDate && store.temporalTileUrls[l.id]) {
        tileUrl = store.temporalTileUrls[l.id][tempDate] ?? null
      } else {
        tileUrl = store.fetchedTileUrls[l.id] ?? null
      }
    }

    if (!tileUrl) {
      // Dynamic layer hasn't been activated yet, abort without marking added.
      return false
    }

    if (!map.getSource(l.id)) {
      map.addSource(l.id, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
      })
    }

    map.addLayer({
      id: `${l.id}-raster`,
      type: 'raster',
      source: l.id,
      paint: {
        // opacity 0 = invisible but keeps tiles cached
        'raster-opacity': l.visible ? l.opacity / 100 : 0,
        // Smooth fade when toggling on/off or changing opacity
        'raster-opacity-transition': { duration: 250 },
      },
    })
  }

  return true
}

// Update visibility / opacity for an existing layer

function updateLayer(map: maplibregl.Map, layer: LayerConfig) {
  if (layer.type === 'vector') {
    const vis = layer.visible ? 'visible' : 'none'
    const l = layer as VectorLayerConfig

    for (const suffix of ['-fill', '-outline', '-circle', '-label']) {
      const lid = `${l.id}${suffix}`
      if (map.getLayer(lid)) {
        map.setLayoutProperty(lid, 'visibility', vis)
      }
    }
    if (map.getLayer(`${l.id}-fill`)) {
      map.setPaintProperty(`${l.id}-fill`, 'fill-opacity', [
        'case',
        ['any',
          ['boolean', ['feature-state', 'hover'],    false],
          ['boolean', ['feature-state', 'selected'], false],
        ],
        (l.opacity / 100) * 0.7,
        (l.opacity / 100) * 0.35,
      ])
      map.setPaintProperty(`${l.id}-outline`, 'line-opacity', l.opacity / 100)
    }
    if (map.getLayer(`${l.id}-circle`)) {
      map.setPaintProperty(`${l.id}-circle`, 'circle-opacity', l.opacity / 100)
      map.setPaintProperty(`${l.id}-circle`, 'circle-stroke-opacity', l.opacity / 100)
    }

  } else if (layer.type === 'raster') {
    const lid = `${layer.id}-raster`
    if (map.getLayer(lid)) {
      map.setPaintProperty(
        lid,
        'raster-opacity',
        layer.visible ? layer.opacity / 100 : 0
      )
    }
  }
}

// MapView component

interface MapViewProps {
  theme: PlatformTheme
  /** left anchor (px) for panel-edge overlays (draw toolbar, scale/attr). */
  leftEdge: number
  /** right offset (px) for the control cluster + legend (Results-aware). */
  rightOffset: number
}

export default function MapView({ theme, leftEdge, rightOffset }: MapViewProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<maplibregl.Map | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawRef       = useRef<any>(null)   // MapboxDraw instance
  const addedLayers   = useRef<Set<string>>(new Set())
  // Currently-selected vector feature for the right-hand ResultsSidebar.
  // Kept as a ref because setFeatureState is imperative and the value
  // doesn't need to trigger React re-renders.
  // sourceLayer is required for vector tile (PMTiles) sources in setFeatureState calls.
  type FeatureStateTarget = { source: string; id: number | string; sourceLayer?: string }
  const selectedFeatureRef = useRef<FeatureStateTarget | null>(null)
  const selectFeatureFromSearchRef = useRef<
    ((layerId: string, featureId: number, bbox: [number, number, number, number]) => void) | null
  >(null)
  const pendingSearchSelectionRef = useRef<{
    layerId: string
    featureId: number
    bbox: [number, number, number, number]
  } | null>(null)
  // Installs a geometry the user typed as coordinates. Assigned inside the map
  // init effect, where the draw instance and the commit handler live, and
  // called by the coordinate form in the draw toolbar.
  const commitCoordinatesRef = useRef<((feature: GeoJSON.Feature) => void) | null>(null)
  const [mapReady, setMapReady] = useState(false)
  // Draw toolbar visibility. It opens with the map at every width: reaching the
  // tools only through the pencil in the control cluster was too discreet a way
  // in. On a narrow screen the five tools wrap onto a second line rather than
  // staying hidden, which is the intended trade. The pencil still toggles it.
  const [drawOpen, setDrawOpen] = useState(true)

  const layers            = useStore((s) => s.layers)
  const drawMode          = useStore((s) => s.drawMode)
  const clearSignal       = useStore((s) => s.clearSignal)
  const basemapId         = useStore((s) => s.basemapId)
  const darkMode          = useStore((s) => s.darkMode)
  const setBasemap        = useStore((s) => s.setBasemap)
  const fetchedTileUrls   = useStore((s) => s.fetchedTileUrls)
  const temporalTileUrls  = useStore((s) => s.temporalTileUrls)
  const temporalDate      = useStore((s) => s.temporalDate)
  const setDrawMode       = useStore((s) => s.setDrawMode)
  const setDrawnArea    = useStore((s) => s.setDrawnArea)
  const setDrawnLength  = useStore((s) => s.setDrawnLength)
  const clearResults        = useStore((s) => s.clearResults)
  const setSelectedGeometry = useStore((s) => s.setSelectedGeometry)
  const setAnalysisLabel = useStore((s) => s.setAnalysisLabel)
  const setAnalysisKind  = useStore((s) => s.setAnalysisKind)

  // Last applied layer-id order, so the expensive z-order resync (moveLayer +
  // getStyle) only runs when the order actually changes, not on every opacity
  // slider tick, which also mutates the layers array.
  const prevLayerOrderRef = useRef<string>('')

  // Initialize map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    // Start worker threads early so tile parsing is ready when the first
    // tiles arrive. This shaves ~200ms off the first meaningful paint.
    maplibregl.prewarm()

    // Register PMTiles protocol for vector tile layers served from .pmtiles files
    const pmProtocol = new PMTilesProtocol()
    maplibregl.addProtocol('pmtiles', pmProtocol.tile)

    // Viewport from the previous session, when there is one; otherwise the biome center.
    const vistaSalva = useStore.getState().view

    const map = new maplibregl.Map({
      container:          containerRef.current,
      style:              EMPTY_STYLE,
      center:             vistaSalva?.center ?? (mapConfig.center as [number, number]),
      zoom:               vistaSalva?.zoom ?? mapConfig.zoom,
      // Disable the default attribution so we can place it at bottom-left,
      // keeping the bottom-right corner clear for the FloatingLegend overlay.
      attributionControl: false,
      // Translate the native control tooltips/aria-labels to pt-BR.
      locale: {
        'NavigationControl.ZoomIn':          'Aproximar',
        'NavigationControl.ZoomOut':         'Afastar',
        'NavigationControl.ResetBearing':    'Orientar para o norte',
        'GeolocateControl.FindMyLocation':   'Minha localização',
        'GeolocateControl.LocationNotAvailable': 'Localização indisponível',
        'FullscreenControl.Enter':           'Tela cheia',
        'FullscreenControl.Exit':            'Sair da tela cheia',
        'ScaleControl.Meters':               'm',
        'ScaleControl.Kilometers':           'km',
        'AttributionControl.ToggleAttribution': 'Alternar atribuição',
        'AttributionControl.MapFeedback':    'Comentários sobre o mapa',
      },
      // Performance optimizations
      validateStyle: false,                        // skip runtime style validation
      fadeDuration:  0,                            // tiles appear instantly (no 300ms fade)
      cancelPendingTileRequestsWhileZooming: true, // cancel stale tile requests during zoom
    })

    mapRef.current = map

    // Stores the viewport. The store debounces before touching localStorage, so
    // a long drag does not become one write per frame.
    const guardarVista = () => {
      const c = map.getCenter()
      useStore.getState().setView({ center: [c.lng, c.lat], zoom: map.getZoom() })
    }
    map.on('moveend', guardarVista)

    // Zoom / geolocate / fullscreen / north are provided by the custom
    // MapControls cluster (glass pills, top-right, dynamic offset) so we skip
    // the native Navigation/Geolocate/Fullscreen controls entirely.
    // ScaleControl and AttributionControl stay bottom-left; their container is
    // shifted right past the Temas panel via the --cc-left-edge CSS var.
    // NOTE: bottom-left containers use `flex-direction: column-reverse`,
    // so the FIRST addControl call ends up at the BOTTOM of the visual stack.
    // We want: scale on top, attribution on the bottom -> attribution first.
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      // Add the initial basemap as a raster layer below everything else
      const initial = basemaps[useStore.getState().basemapId]
      if (initial) {
        map.addSource(BASEMAP_SOURCE_ID, {
          type:        'raster',
          tiles:       [initial.url],
          tileSize:    256,
          attribution: initial.attribution,
          maxzoom:     initial.maxZoom,
        })
        map.addLayer({
          id:     BASEMAP_LAYER_ID,
          type:   'raster',
          source: BASEMAP_SOURCE_ID,
        })
      }

      // mapbox-gl-draw setup with MapLibre-compatible styles + custom
      // rectangle mode. Default mode is 'simple_select' (the library's
      // built-in idle mode); 'static' is NOT a default mode in v1.5.
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: 'simple_select',
        styles: MAPBOX_DRAW_STYLES,
        // Merge default modes with our custom draw_rectangle implementation
        modes: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(MapboxDraw as any).modes,
          draw_rectangle: DrawRectangleMode,
        },
      })
      // mapbox-gl-draw expects a mapbox-gl-compatible map; maplibre-gl v5
      // satisfies enough of the API for draw operations.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addControl(draw as any)
      drawRef.current = draw

      // Clear the persistent "selected" feature-state used by the
      // click-to-stats flow. Does NOT touch the ResultsSidebar content -
      // callers decide whether to clear the store's measurements too. Declared
      // before `handleDrawCommit`, which the saved-drawing restore below calls
      // while this closure is still running.
      const clearSelectedFeature = () => {
        const sel = selectedFeatureRef.current
        if (sel) {
          map.setFeatureState(sel, { selected: false })
          selectedFeatureRef.current = null
        }
      }

      // Unified handler for create/update, computes measurements and raster
      // stats / pixel value for the first (and only) feature currently in
      // the draw buffer. Fires both on initial finish AND when the user
      // drags vertices in direct_select mode.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleDrawCommit = async (e: any) => {
        const feature = e.features?.[0]
        if (!feature) return

        // Enforce single-feature drawing: delete anything else in the buffer.
        const all = draw.getAll()
        const othersIds = all.features
          .filter((f: GeoJSON.Feature) => f.id !== feature.id)
          .map((f: GeoJSON.Feature) => f.id as string)
        if (othersIds.length > 0) draw.delete(othersIds)

        // A fresh draw invalidates any in-flight stats and any previously
        // selected feature (whose reactive recompute must not resurrect it).
        const seq = bumpAnalysisSeq()
        useStore.getState().setDrawing(feature)
        setDrawnArea(null)
        setDrawnLength(null)
        clearResults()
        // A typed geometry is announced as "Coordenadas", with the coordinate
        // itself as the label. Both come off the feature's properties rather
        // than from an argument, so a drawing restored from localStorage --
        // which comes back as a bare GeoJSON feature -- keeps its chip.
        const typed = feature.properties?.ccOrigin === COORDINATE_ORIGIN
        setAnalysisLabel(typed ? (feature.properties?.ccLabel ?? null) : null)
        setAnalysisKind(typed ? 'Coordenadas' : 'Área desenhada')
        clearSelectedFeature()
        setSelectedGeometry(null)

        if (feature.geometry.type === 'Polygon') {
          setDrawnArea(turfArea(feature) / 1_000_000)
          const geom: SelectedGeometry = {
            geometry: feature.geometry,
            geometryType: 'polygon',
          }
          setSelectedGeometry(geom)
          runVisibleRasterAnalyses(geom, seq)
        } else if (feature.geometry.type === 'LineString') {
          const coords = feature.geometry.coordinates as number[][]
          setDrawnLength(lineStringLengthKm(coords))
        } else if (feature.geometry.type === 'Point') {
          const [lon, lat] = feature.geometry.coordinates as [number, number]
          const geom: SelectedGeometry = {
            geometry: feature.geometry,
            geometryType: 'point',
            lon, lat,
          }
          setSelectedGeometry(geom)
          runVisibleRasterAnalyses(geom, seq)
        }
      }

      map.on('draw.create', handleDrawCommit)
      map.on('draw.update', handleDrawCommit)

      // Geometry typed as coordinates instead of drawn. It enters through the
      // same commit as a drawn shape, so the measurements, the statistics,
      // Limpar, the persisted drawing and the recompute on a temporal change
      // all follow without a second code path. The id comes from `draw.add`
      // and has to travel with the feature: `handleDrawCommit` clears every
      // other feature in the buffer by comparing ids, and would wipe this one.
      commitCoordinatesRef.current = (feature) => {
        draw.deleteAll()
        const [id] = draw.add(feature)
        void handleDrawCommit({ features: [{ ...feature, id }] })

        // A typed coordinate is usually outside the current view, so unlike a
        // drawn shape it has to bring the camera with it.
        if (feature.geometry.type === 'Point') {
          const [lon, lat] = feature.geometry.coordinates as [number, number]
          map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 12) })
        } else {
          map.fitBounds(
            computeBbox(feature.geometry) as maplibregl.LngLatBoundsLike,
            { padding: 60 },
          )
        }
      }

      // Drawing from the previous session. `draw.add` does not emit `draw.create`,
      // so the handler is called by hand: restoring and drawing go down the same
      // path, and the statistics are recomputed in GEE instead of coming back from
      // a stale cache.
      const desenhoSalvo = useStore.getState().drawing
      if (desenhoSalvo) {
        try {
          draw.add(desenhoSalvo)
          void handleDrawCommit({ features: [desenhoSalvo] })
        } catch (err) {
          console.error('[draw.restore] falha ao restaurar o desenho', err)
          useStore.getState().setDrawing(null)
        }
      }
      map.on('draw.delete', () => {
        if (draw.getAll().features.length === 0) {
          // A deleted drawing must not be recomputed after a temporal change.
          bumpAnalysisSeq()
          useStore.getState().setDrawing(null)
          setSelectedGeometry(null)
          setDrawnArea(null)
          setDrawnLength(null)
          clearResults()
        }
      })

      // When a shape finishes, mapbox-gl-draw returns to simple_select on its
      // own. The chosen tool stays armed, so the next click starts another
      // shape: the mode is re-entered on the draw instance directly, without
      // touching the store, because the sync effect would wipe the shape that
      // was just committed. `handleDrawCommit` drops the old shape once the
      // new one lands. Every mode fires `draw.create` before this
      // `draw.modechange`; a return to simple_select without one (Esc, Enter,
      // an unfinished shape) is a cancel, and disarms the tool in the store.
      let justCreated = false
      map.on('draw.create', () => { justCreated = true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on('draw.modechange', (ev: any) => {
        const created = justCreated
        justCreated = false
        const mode = useStore.getState().drawMode
        if (ev?.mode !== 'simple_select' || mode === null) return
        if (created) draw.changeMode(MAPBOX_DRAW_MODE[mode])
        else setDrawMode(null)
      })

      // Hover + click-to-stats on vector layers
      //
      // Hover (mousemove):
      //   - Highlights the top-most visible vector feature under the cursor
      //     via feature-state, regardless of whether a raster is visible.
      //   - If that vector layer has `hoverLabelField`, shows a popup with
      //     the value of that property next to the cursor.
      //
      // Click-to-stats:
      //   - When the user clicks a vector feature AND that vector layer is
      //     above a visible raster, computes the same measurements as the
      //     drawing tools (stats chart / pixel value).
      //
      // Both skipped entirely when a drawing tool is active.

      const queryableLayerIds = (vectorId: string): string[] =>
        [`${vectorId}-fill`, `${vectorId}-circle`].filter((lid) => map.getLayer(lid))

      // Find the visible vector feature under the cursor with a SINGLE
      // queryRenderedFeatures call over all visible vector sublayers, then let
      // pickMostSpecific choose between overlapping recortes (the finer one
      // wins; see lib/mapa/pickVector.ts). Avoids one spatial query per layer
      // on every mouse event.
      const pickHoveredVector = (e: maplibregl.MapMouseEvent) => {
        const state = useStore.getState()
        const sublayerToVector = new Map<string, { vector: VectorLayerConfig; storeIndex: number }>()
        const querySublayers: string[] = []
        state.layers.forEach((layer, idx) => {
          if (layer.type !== 'vector' || !layer.visible) return
          const vec = layer as VectorLayerConfig
          for (const sl of queryableLayerIds(vec.id)) {
            sublayerToVector.set(sl, { vector: vec, storeIndex: idx })
            querySublayers.push(sl)
          }
        })
        if (querySublayers.length === 0) return null

        const feats = map.queryRenderedFeatures(e.point, { layers: querySublayers })
        const candidates: VectorPickCandidate<maplibregl.MapGeoJSONFeature>[] = []
        for (const f of feats) {
          const owner = f.layer?.id ? sublayerToVector.get(f.layer.id) : undefined
          if (!owner) continue
          candidates.push({ layer: owner.vector, storeIndex: owner.storeIndex, hit: f })
        }

        const best = pickMostSpecific(candidates)
        return best ? { vector: best.layer, feature: best.hit } : null
      }

      // Track currently hovered feature so we can clear its state when the
      // mouse moves to a different one (or off the map entirely).
      let hovered: FeatureStateTarget | null = null

      // MapLibre popup for hover labels. Kept off-map until needed.
      const hoverPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'hover-label-popup',
        offset: 12,
      })

      const clearHover = () => {
        if (hovered) {
          map.setFeatureState(hovered, { hover: false })
          hovered = null
        }
        hoverPopup.remove()
      }

      // The analysis half of click-to-stats, lifted out so the search can run
      // it too: picking a feature in the search behaves exactly as if the user
      // had clicked it. `properties` and `fallbackGeometry` come from the
      // rendered feature on a click, and from the source GeoJSON on a search,
      // which has no rendered feature and so passes no fallback.
      const runFeatureAnalysis = async (
        vector: VectorLayerConfig,
        featureId: number | string | undefined,
        properties: GeoJSON.GeoJsonProperties,
        fallbackGeometry?: GeoJSON.Geometry,
      ) => {
        // A new selection invalidates any in-flight stats response.
        const seq = bumpAnalysisSeq()

        // A click only measures through a recorte drawn ABOVE a visible
        // raster: that is what lets it reach the raster beneath the feature.
        // The predicate is `clickableRecortes`, the same list the results panel
        // names in its hint, so the instruction and the behavior cannot drift.
        const layersNow = useStore.getState().layers
        const measurable = clickableRecortes(layersNow)
          .some((recorte) => recorte.id === vector.id)

        // `clickableRecortes` is empty in two situations that are not the same
        // click. With no raster on there is simply nothing to measure YET: the
        // selection stands and the reactive recompute fills the cards the
        // moment a raster is switched on. With rasters on but this recorte
        // dragged below them by `reorderLayer`, the click never passed through
        // a raster at all -- rasters are not queryable, so the feature answers
        // a click it is not underneath. That is the rule the deleted
        // `pickStatsTarget` enforced with `vectorIdx >= rasterIdx`.
        const belowRaster = !measurable && topVisibleRasterIndex(layersNow) !== -1

        // Replace any existing drawing / measurement. Only `deleteAll` sits
        // behind the guard: the geometry is committed user work, while the
        // numbers describe the subject the click is replacing, and leaving
        // them would caption the clicked feature with the drawing's length.
        if (measurable) draw.deleteAll()
        setDrawnArea(null)
        setDrawnLength(null)
        clearResults()
        // Dropped until the complete geometry resolves below. Leaving the
        // previous feature in place would let the reactive effect measure it
        // again, and would leave the panel with cards for a selection the user
        // has already replaced.
        setSelectedGeometry(null)

        // Persistently highlight the selected feature (same visual as hover).
        clearSelectedFeature()
        if (featureId !== undefined && featureId !== null) {
          selectedFeatureRef.current = {
            source: vector.id,
            id: featureId,
            ...(vector.sourceLayer ? { sourceLayer: vector.sourceLayer } : {}),
          }
          map.setFeatureState(selectedFeatureRef.current, { selected: true })
        }

        // Name the analysis after the selected feature (from its hover label
        // field) so the results card is never ambiguous about its source.
        const labelField = vector.hoverLabelField
        const featureName = labelField ? properties?.[labelField] : undefined
        setAnalysisLabel(
          featureName != null && featureName !== '' ? String(featureName) : vector.name,
        )
        setAnalysisKind(vector.name)

        // Use the COMPLETE geometry from the source GeoJSON, not the
        // tile-clipped one from queryRenderedFeatures, so area and zonal
        // stats cover the whole feature.
        const geom = (await fullFeatureGeometry(vector, featureId)) ?? fallbackGeometry
        if (seq !== currentAnalysisSeq()) return // superseded while fetching source
        // A click falls back to the rendered geometry when the source lookup
        // fails; a search has no rendered feature, so there is nothing to
        // measure and the zoom + highlight stand on their own.
        if (!geom) return

        // The feature's own size replaces the drawing's in the panel, whether
        // or not there is anything to measure over it.
        if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
          setDrawnArea(turfArea({ type: 'Feature', geometry: geom, properties: {} }) / 1_000_000)
        }

        // A recorte below the rasters names and highlights its feature and
        // stops there. Installing the selection would not merely measure once:
        // the reactive recompute would go on measuring rasters this click never
        // reached, on every layer toggle and every year step.
        if (belowRaster) return

        if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
          const selected: SelectedGeometry = { geometry: geom, geometryType: 'polygon' }
          setSelectedGeometry(selected)
          runVisibleRasterAnalyses(selected, seq)
        } else if (geom.type === 'Point') {
          const [lon, lat] = geom.coordinates as [number, number]
          const selected: SelectedGeometry = {
            geometry: geom, geometryType: 'point', lon, lat,
          }
          setSelectedGeometry(selected)
          runVisibleRasterAnalyses(selected, seq)
        }
      }

      // Exposed to FloatingSearchBar via a ref so it can zoom, highlight and
      // analyse a feature from the search results dropdown.
      selectFeatureFromSearchRef.current = (layerId, featureId, bbox) => {
        const layer = useStore.getState().layers.find((candidate) => candidate.id === layerId)
        if (!layer || layer.type !== 'vector') return

        // Hidden vectors have no MapLibre source yet. Request their display and
        // defer the selection until the layer synchronization effect adds it.
        if (!layer.visible) {
          pendingSearchSelectionRef.current = { layerId, featureId, bbox }
          useStore.getState().showLayer(layerId)
          return
        }
        if (!map.getSource(layerId)) return

        clearSelectedFeature()
        draw.deleteAll()
        // Invalidate in-flight stats and drop the previously selected geometry
        // so the reactive recompute can't resurrect it. runFeatureAnalysis
        // below installs the searched feature in its place.
        bumpAnalysisSeq()
        setSelectedGeometry(null)
        setDrawnArea(null)
        setDrawnLength(null)
        clearResults()
        setAnalysisLabel(null)
        setAnalysisKind(null)
        selectedFeatureRef.current = { source: layerId, id: featureId }
        map.setFeatureState({ source: layerId, id: featureId }, { selected: true })
        map.fitBounds(bbox as maplibregl.LngLatBoundsLike, {
          padding: 60,
          maxZoom: 13,
        })

        // Analyse the searched feature as if the user had clicked it. The
        // properties come from the source GeoJSON rather than from a rendered
        // tile, so this does not have to wait for fitBounds to settle. With no
        // raster visible there is nothing to measure, and the zoom + highlight
        // above are the whole outcome, exactly like a click.
        void (async () => {
          const source = await loadVectorFeatureCollection(layer.url)
          const properties = source?.features?.[featureId]?.properties ?? null
          await runFeatureAnalysis(layer, featureId, properties)
        })()
      }

      const processHover = (e: maplibregl.MapMouseEvent) => {
        if (!mapRef.current) return // map torn down before the frame ran
        const state = useStore.getState()
        if (state.drawMode !== null) {
          map.getCanvas().style.cursor = ''
          clearHover()
          return
        }

        const hit = pickHoveredVector(e)
        if (!hit) {
          map.getCanvas().style.cursor = ''
          clearHover()
          return
        }

        map.getCanvas().style.cursor = 'pointer'

        const top = hit.feature
        if (top.id === undefined || top.id === null) return

        // New feature under cursor -> update highlight
        if (!hovered || hovered.id !== top.id || hovered.source !== hit.vector.id) {
          if (hovered) map.setFeatureState(hovered, { hover: false })
          hovered = {
            source: hit.vector.id,
            id: top.id,
            ...(hit.vector.sourceLayer ? { sourceLayer: hit.vector.sourceLayer } : {}),
          }
          map.setFeatureState(hovered, { hover: true })
        }

        // Hover label popup, only for layers that declare `hoverLabelField`
        const field = hit.vector.hoverLabelField
        if (field) {
          const value = top.properties?.[field]
          if (value !== undefined && value !== null && value !== '') {
            hoverPopup
              .setLngLat(e.lngLat)
              .setHTML(
                `<div style="font-family:var(--font-raleway),sans-serif;font-size:13.5px;font-weight:500;padding:2px 4px;">${String(value)}</div>`,
              )
              .addTo(map)
          } else {
            hoverPopup.remove()
          }
        } else {
          hoverPopup.remove()
        }
      }

      // Throttle hover to one processing pass per animation frame: fast mouse
      // moves fire far more often than 60Hz, and each pass does a spatial query
      // + feature-state writes. We keep only the latest event per frame.
      let hoverRaf: number | null = null
      let lastMoveEvent: maplibregl.MapMouseEvent | null = null
      map.on('mousemove', (e) => {
        lastMoveEvent = e
        if (hoverRaf !== null) return
        hoverRaf = requestAnimationFrame(() => {
          hoverRaf = null
          if (lastMoveEvent) processHover(lastMoveEvent)
        })
      })

      map.on('mouseout', () => {
        map.getCanvas().style.cursor = ''
        clearHover()
      })

      map.on('click', async (e) => {
        const state = useStore.getState()
        if (state.drawMode !== null) return // drawing tool active -> Terra Draw owns the click

        const hit = pickHoveredVector(e)
        if (!hit) {
          // Clicked on empty map. Dismiss the results sidebar + feature
          // highlight *only* if the current content came from a vector
          // selection (not from a drawing tool). Drawings are explicitly
          // cleared via the "Limpar" button in the drawing toolbar.
          const hasDrawing = draw.getAll().features.length > 0
          if (!hasDrawing && selectedFeatureRef.current) {
            bumpAnalysisSeq()
            clearSelectedFeature()
            setSelectedGeometry(null)
            setDrawnArea(null)
            setDrawnLength(null)
            clearResults()
            setAnalysisLabel(null)
            setAnalysisKind(null)
          }
          return
        }

        await runFeatureAnalysis(
          hit.vector,
          hit.feature.id,
          hit.feature.properties,
          hit.feature.geometry,
        )
      })

      setMapReady(true)
    })

    return () => {
      // map.remove() tears down controls too, no explicit removeControl needed
      map.remove()
      mapRef.current  = null
      drawRef.current = null
      addedLayers.current.clear()
    }
  }, [])

  // Add / update layers when store or map readiness changes
useEffect(() => {
  const map = mapRef.current
  if (!map || !mapReady) return

  // 1. Adds new layers / updates visibility and opacity.
  //    addLayerToMap returns false when a dynamic (GEE) layer's tile URL
  //    isn't cached yet, in that case we skip marking it as added so the
  //    next store update (after activateDynamicLayer resolves) retries.
  //    Vector sources are created lazily on first visibility so the browser
  //    doesn't download every recorte GeoJSON at load (only the default-on
  //    biome), and hidden GEE layers are skipped until activated.
  let addedSomething = false
  layers.forEach((layer) => {
    if (!addedLayers.current.has(layer.id)) {
      if (!layer.visible) return
      const added = addLayerToMap(map, layer)
      if (added) {
        addedLayers.current.add(layer.id)
        addedSomething = true
      }
    } else {
      updateLayer(map, layer)
    }
  })

  // A search can select a hidden vector layer. Once it has been added above,
  // replay the request so feature-state is only set after its source exists.
  const pendingSelection = pendingSearchSelectionRef.current
  if (pendingSelection && map.getSource(pendingSelection.layerId)) {
    pendingSearchSelectionRef.current = null
    selectFeatureFromSearchRef.current?.(
      pendingSelection.layerId,
      pendingSelection.featureId,
      pendingSelection.bbox,
    )
  }

  // 2 & 3. Resync z-order when a layer was just added (it lands on top and
  // must be repositioned) OR when the order changed. Skipped on opacity/
  // visibility-only updates, where the moveLayer sweep + getStyle would be
  // pure overhead (dozens of times per second during a slider drag).
  const orderKey = layers.map((l) => l.id).join(',')
  if (addedSomething || orderKey !== prevLayerOrderRef.current) {
    prevLayerOrderRef.current = orderKey

    // layers[0] = top of the list = rendered on top. Iterate last->first so
    // whatever is moved last ends up topmost.
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i]
      const sublayers =
        layer.type === 'vector'
          ? [
              `${layer.id}-fill`,
              `${layer.id}-outline`,
              `${layer.id}-circle`,
              ...((layer as VectorLayerConfig).labelField ? [`${layer.id}-label`] : []),
            ]
          : [`${layer.id}-raster`]
      for (const lid of sublayers) {
        if (map.getLayer(lid)) map.moveLayer(lid)
      }
    }

    // Keep mapbox-gl-draw layers (prefixed "gl-draw-") above everything else.
    const style = map.getStyle()
    for (const l of style?.layers ?? []) {
      if (l.id.startsWith('gl-draw-')) map.moveLayer(l.id)
    }
  }
}, [layers, mapReady, fetchedTileUrls, temporalTileUrls, temporalDate])

  // WFS viewport loading
  // For layers with `source: 'wfs'`, fetch features from the configured
  // GeoServer on every map `moveend`, filtered to the current viewport
  // bbox. Debounced by 400ms; fast pans abort the in-flight request.
  //
  // Design decisions:
  // - When zoom < `minZoomForLoad`, we clear the source (no features shown).
  // - Loading/error state reuses `loadingLayers` / `layerErrors` so the
  //   existing Sidebar LayerRow UI ("Carregando..." / error strip) works
  //   unchanged.
  // - `promoteId` in the source config keeps feature-state stable across
  //   refreshes as long as the same feature is still present.
  const wfsAbortControllersRef = useRef<Record<string, AbortController>>({})
  const wfsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevVisibleWfsIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const fetchVisibleWfsLayers = () => {
      const store = useStore.getState()
      const visibleWfs = store.layers.filter(
        (l): l is VectorLayerConfig =>
          l.type === 'vector' && l.visible && l.source === 'wfs',
      )

      for (const layer of visibleWfs) {
        if (!layer.wfsUrl || !layer.wfsTypeName) continue

        const source = map.getSource(layer.id)
        if (!source || source.type !== 'geojson') continue

        // Below the configured zoom threshold, render empty.
        const zoom = map.getZoom()
        if (layer.minZoomForLoad != null && zoom < layer.minZoomForLoad) {
          (source as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: [],
          })
          continue
        }

        // Cancel any in-flight request for this specific layer.
        wfsAbortControllersRef.current[layer.id]?.abort()
        const ctrl = new AbortController()
        wfsAbortControllersRef.current[layer.id] = ctrl

        const bounds = map.getBounds()
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat},EPSG:4326`

        const url =
          `${layer.wfsUrl}?service=WFS&version=1.0.0&request=GetFeature` +
          `&typeName=${encodeURIComponent(layer.wfsTypeName)}` +
          `&outputFormat=application/json` +
          `&srsName=EPSG:4326` +
          `&bbox=${bbox}` +
          `&maxFeatures=${layer.maxFeatures ?? 5000}`

        // Mark loading, Sidebar LayerRow renders "Carregando..." from this.
        useStore.setState((s) => {
          const nextErrors = { ...s.layerErrors }
          delete nextErrors[layer.id]
          return {
            loadingLayers: { ...s.loadingLayers, [layer.id]: true },
            layerErrors: nextErrors,
          }
        })

        fetch(url, { signal: ctrl.signal })
          .then((res) => {
            if (!res.ok) throw new Error(`WFS ${res.status} ${res.statusText}`)
            return res.json()
          })
          .then((geojson: GeoJSON.FeatureCollection) => {
            const src = map.getSource(layer.id) as maplibregl.GeoJSONSource | undefined
            if (src) src.setData(geojson)
            useStore.setState((s) => {
              const next = { ...s.loadingLayers }
              delete next[layer.id]
              return { loadingLayers: next }
            })
          })
          .catch((err: Error) => {
            if (err.name === 'AbortError') return
            console.error(`[WFS] ${layer.id}:`, err.message)
            useStore.setState((s) => {
              const nextLoading = { ...s.loadingLayers }
              delete nextLoading[layer.id]
              return {
                loadingLayers: nextLoading,
                layerErrors: {
                  ...s.layerErrors,
                  [layer.id]: `Falha ao carregar WFS: ${err.message}`,
                },
              }
            })
          })
      }
    }

    const onMoveEnd = () => {
      if (wfsDebounceRef.current) clearTimeout(wfsDebounceRef.current)
      wfsDebounceRef.current = setTimeout(fetchVisibleWfsLayers, 400)
    }

    // Fire immediately for any WFS layer that transitioned to visible
    // (so users see data right after toggling on, not only after moving).
    const visibleWfsIds = new Set(
      layers
        .filter((l) => l.type === 'vector' && l.visible && l.source === 'wfs')
        .map((l) => l.id),
    )
    const becameVisible = [...visibleWfsIds].some(
      (id) => !prevVisibleWfsIdsRef.current.has(id),
    )
    prevVisibleWfsIdsRef.current = visibleWfsIds
    if (becameVisible) fetchVisibleWfsLayers()

    map.on('moveend', onMoveEnd)

    return () => {
      map.off('moveend', onMoveEnd)
      if (wfsDebounceRef.current) clearTimeout(wfsDebounceRef.current)
      for (const ctrl of Object.values(wfsAbortControllersRef.current)) {
        ctrl.abort()
      }
      wfsAbortControllersRef.current = {}
    }
  }, [layers, mapReady])

  // Swap temporal tile URLs when date changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    for (const [layerId, dateKey] of Object.entries(temporalDate)) {
      const tileUrl = temporalTileUrls[layerId]?.[dateKey]
      if (!tileUrl) continue
      const source = map.getSource(layerId)
      if (source && 'setTiles' in source) {
        (source as maplibregl.RasterTileSource).setTiles([tileUrl])
      }
    }
  }, [temporalDate, temporalTileUrls, mapReady])

  // Reactive recomputation. Switching a layer on, or stepping a year, leaves the
  // selection in place: `pendingAnalyses` inside runVisibleRasterAnalyses returns
  // only the layers whose stop is not already answered, so a layer that did not
  // change is never re-measured.
  const selectedGeometry = useStore((s) => s.selectedGeometry)

  // `results` is deliberately absent from the dependencies: the effect writes
  // into it, so depending on it would re-run on every card that lands. The
  // runner reads it fresh through useStore.getState().
  useEffect(() => {
    if (!selectedGeometry) return
    runVisibleRasterAnalyses(selectedGeometry, currentAnalysisSeq())
  }, [layers, temporalDate, temporalTileUrls, fetchedTileUrls, selectedGeometry])

  // Sync draw mode
  // Switching to a drawing mode clears any previous feature + measurements.
  // Staying in 'select' or toggling off (null -> 'static') keeps the drawing.
  useEffect(() => {
    const draw = drawRef.current
    const map  = mapRef.current
    if (!draw || !map) return

    const isDrawingMode =
      drawMode === 'polygon' ||
      drawMode === 'rectangle' ||
      drawMode === 'linestring' ||
      drawMode === 'point'

    if (isDrawingMode) {
      draw.deleteAll()
      setDrawnArea(null)
      setDrawnLength(null)
      // Bumped with the clear: a response still in flight would otherwise land
      // in `results` with no selection behind it, and the panel would render
      // its header and footer around nothing.
      bumpAnalysisSeq()
      clearResults()
      // Clear any selected-feature highlight (effect runs outside the
      // map.on('load') closure where `clearSelectedFeature` helper lives,
      // so we inline the logic here).
      const sel = selectedFeatureRef.current
      if (sel) {
        map.setFeatureState(sel, { selected: false })
        selectedFeatureRef.current = null
      }
      // Also drop the selected geometry so the reactive recompute can't
      // repopulate Resultados for the old feature mid draw-mode.
      setSelectedGeometry(null)
    }

    // `null` falls back to simple_select (the idle mode) because mapbox-gl-draw 1.5
    // doesn't ship a 'static' mode.
    const mapboxMode = drawMode === null ? 'simple_select' : MAPBOX_DRAW_MODE[drawMode]

    draw.changeMode(mapboxMode)

    // mapbox-gl-draw only applies its queued cursor/mode classes when the
    // next mouse event fires (see src/lib/mode_handler.js). That means the
    // cursor doesn't change until the user moves the mouse. We pre-apply
    // the classes manually on the map container so the cursor updates
    // instantly when the user clicks a drawing tool. Once the mouse moves,
    // mapbox-gl-draw's own updateMapClasses() runs and no-ops on the
    // already-correct classes.
    const container = map.getContainer()
    const MOUSE_CLASSES = ['mouse-add', 'mouse-pointer', 'mouse-move', 'mouse-none', 'mouse-drag']
    const MODE_CLASSES  = [
      'mode-draw_polygon', 'mode-draw_rectangle', 'mode-draw_line_string',
      'mode-draw_point',   'mode-simple_select',  'mode-direct_select',
    ]
    container.classList.remove(...MOUSE_CLASSES, ...MODE_CLASSES)
    container.classList.add(`mode-${mapboxMode}`)
    if (isDrawingMode) container.classList.add('mouse-add')
  }, [drawMode, setDrawnArea, setDrawnLength, clearResults, setSelectedGeometry])

  // React to "Clear drawings" button
  useEffect(() => {
    if (clearSignal === 0) return
    // The store has already emptied `results`; without this bump a reduction
    // still in flight would pass land()'s sequence check and refill the panel
    // for an analysis the user just cleared -- header, footer and a working
    // "Baixar CSV" around numbers that no longer describe anything on screen.
    // It lives here rather than in clearDrawings because the store cannot
    // import the runner: the runner imports the store. And `deleteAll()`
    // cannot stand in for it -- mapbox-gl-draw suppresses events for API
    // deletes (`suppressAPIEvents` defaults to true), so the `draw.delete`
    // handler that does bump the sequence never fires on this path.
    bumpAnalysisSeq()
    drawRef.current?.deleteAll()
  }, [clearSignal])

  // Swap basemap (raster XYZ) without touching user layers
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const basemap = basemaps[basemapId]
    if (!basemap) return

    // Remove old basemap layer + source if present
    if (map.getLayer(BASEMAP_LAYER_ID))  map.removeLayer(BASEMAP_LAYER_ID)
    if (map.getSource(BASEMAP_SOURCE_ID)) map.removeSource(BASEMAP_SOURCE_ID)

    map.addSource(BASEMAP_SOURCE_ID, {
      type:        'raster',
      tiles:       [basemap.url],
      tileSize:    256,
      attribution: basemap.attribution,
      maxzoom:     basemap.maxZoom,
    })

    // Insert as the bottom-most layer so user layers stay on top.
    const firstExistingLayerId = map.getStyle()?.layers?.[0]?.id
    map.addLayer(
      {
        id:     BASEMAP_LAYER_ID,
        type:   'raster',
        source: BASEMAP_SOURCE_ID,
      },
      firstExistingLayerId,
    )
  }, [basemapId, mapReady])

  // Pair basemap with dark mode
  // When the user TOGGLES dark mode and the current basemap is one of the two
  // Carto options, auto-swap to the matching variant so the map reads
  // correctly against the new UI chrome. Depends only on `darkMode` (basemapId
  // is read imperatively) so a manual basemap choice is never reverted, in
  // particular, picking carto-dark in light mode used to be undone instantly.
  useEffect(() => {
    if (!mapReady) return
    const currentBasemap = useStore.getState().basemapId
    if (darkMode && currentBasemap === 'carto-positron') {
      setBasemap('carto-dark')
    } else if (!darkMode && currentBasemap === 'carto-dark') {
      setBasemap('carto-positron')
    }
  }, [darkMode, mapReady, setBasemap])

  // Shift native bottom-left controls (scale + attribution) past the panel
  // The Temas panel floats over the map's top-left; anchoring scale/attribution
  // to `--cc-left-edge` keeps them clear of it and in sync with the panel state.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.getContainer().style.setProperty('--cc-left-edge', `${leftEdge}px`)
  }, [leftEdge, mapReady])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {mapReady && (
        <>
          <FloatingSearchBar
            theme={theme}
            leftEdge={leftEdge}
            rightOffset={rightOffset}
            onSelectFeature={(lid, fid, bbox) =>
              selectFeatureFromSearchRef.current?.(lid, fid, bbox)
            }
          />
          <MapControls
            mapRef={mapRef}
            theme={theme}
            rightOffset={rightOffset}
            drawOpen={drawOpen}
            onToggleDraw={() => {
              setDrawOpen((v) => {
                if (v) setDrawMode(null) // closing the toolbar cancels the tool
                return !v
              })
            }}
          />
          <DrawToolbar
            theme={theme}
            leftEdge={leftEdge}
            rightOffset={rightOffset}
            open={drawOpen}
            onClose={() => setDrawOpen(false)}
            onApplyCoordinates={(feature) => commitCoordinatesRef.current?.(feature)}
          />
          <FloatingLegend theme={theme} rightOffset={rightOffset} />
          <TemporalSlider theme={theme} leftEdge={leftEdge} rightOffset={rightOffset} />
          <CursorCoordinates mapRef={mapRef} theme={theme} />
        </>
      )}
    </div>
  )
}
