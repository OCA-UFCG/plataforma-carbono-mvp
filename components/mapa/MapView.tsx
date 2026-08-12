'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { getRasterStats, getTemporalTimeSeries } from '@/lib/mapa/getRasterStats'
import { getRasterPointValue } from '@/lib/mapa/getRasterPointValue'
import { resolvePixelValue } from '@/lib/mapa/resolvePixelValue'
import { basemaps } from '@/config/mapa/basemaps'
import type {
  LayerConfig,
  VectorLayerConfig,
  RasterLayerConfig,
  PlatformTheme,
} from '@/types/mapa'
import FloatingLegend from './overlays/FloatingLegend'
import MapControls from './overlays/MapControls'
import DrawToolbar from './overlays/DrawToolbar'
import CursorCoordinates from './overlays/CursorCoordinates'
import TemporalSlider from './overlays/TemporalSlider'
import FloatingSearchBar from './overlays/FloatingSearchBar'

// Minimal initial style
// Simple hash for geometry cache keys

function geomHash(geom: GeoJSON.Geometry): string {
  // Fast, collision-resistant-enough hash from the coordinate JSON
  const str = JSON.stringify('coordinates' in geom ? geom.coordinates : geom)
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return String(h >>> 0)
}

function statsCacheKey(
  layerId: string,
  dateOrStatic: string | undefined,
  geometry: GeoJSON.Geometry,
): string {
  return `${layerId}:${dateOrStatic ?? 'static'}:${geomHash(geometry)}`
}

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
    const res = await fetch(url)
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
        map.addSource(l.id, { type: 'geojson', data: l.url, generateId: true })
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
  // Persist the selected feature's geometry + raster context so we can
  // reactively recompute stats when the temporal date or visible raster changes.
  const selectedGeomRef = useRef<{
    vectorLayerId: string
    geometry: GeoJSON.Geometry
    geometryType: 'polygon' | 'point'
    lon?: number
    lat?: number
  } | null>(null)
  const selectFeatureFromSearchRef = useRef<
    ((layerId: string, featureId: number, bbox: [number, number, number, number]) => void) | null
  >(null)
  const [mapReady, setMapReady] = useState(false)
  // Draw toolbar visibility (pencil in the control cluster toggles it).
  const [drawOpen, setDrawOpen] = useState(false)

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
  const setRasterStats  = useStore((s) => s.setRasterStats)
  const setPixelValue   = useStore((s) => s.setPixelValue)
  const setStatsLoading  = useStore((s) => s.setStatsLoading)
  const setStatsError    = useStore((s) => s.setStatsError)
  const setAnalysisLabel = useStore((s) => s.setAnalysisLabel)
  const setAnalysisKind  = useStore((s) => s.setAnalysisKind)

  // Monotonic token to discard stale async stats/pixel responses: each new
  // click / draw / reactive recompute bumps it, and a resolved fetch only
  // writes state if its captured token is still current (fixes out-of-order
  // responses overwriting the latest selection).
  const statsSeqRef = useRef(0)

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

    const map = new maplibregl.Map({
      container:          containerRef.current,
      style:              EMPTY_STYLE,
      center:             mapConfig.center as [number, number],
      zoom:               mapConfig.zoom,
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
        const seq = ++statsSeqRef.current
        setDrawnArea(null)
        setDrawnLength(null)
        setRasterStats(null)
        setPixelValue(null)
        setStatsError(null)
        setAnalysisLabel(null)
        setAnalysisKind('Área desenhada')
        clearSelectedFeature()
        selectedGeomRef.current = null
        prevStatsContextRef.current = null

        if (feature.geometry.type === 'Polygon') {
          setDrawnArea(turfArea(feature) / 1_000_000)

          const activeRaster = useStore
            .getState()
            .layers.find(
              (l): l is RasterLayerConfig => l.type === 'raster' && l.visible,
            )
          if (!activeRaster) return

          const tempDate = useStore.getState().temporalDate[activeRaster.id]
          // Keep drawn areas in the same reactive path as vector selections,
          // so their result is recalculated when the temporal layer changes.
          selectedGeomRef.current = {
            vectorLayerId: 'drawn-area',
            geometry: feature.geometry,
            geometryType: 'polygon',
          }
          prevStatsContextRef.current = `${activeRaster.id}:${tempDate ?? 'static'}`
          setStatsLoading(true)
          try {
            const stats = await getRasterStats(activeRaster, {
              type: 'Feature',
              geometry: feature.geometry as { type: 'Polygon'; coordinates: number[][][] },
              properties: {},
            }, tempDate)
            if (seq !== statsSeqRef.current) return
            setRasterStats(stats)
          } catch (err) {
            console.error('[draw.commit] getRasterStats failed', err)
            if (seq === statsSeqRef.current) {
              setRasterStats(null)
              setStatsError('Falha ao calcular estatísticas. Tente novamente.')
            }
          } finally {
            if (seq === statsSeqRef.current) setStatsLoading(false)
          }
        } else if (feature.geometry.type === 'LineString') {
          const coords = feature.geometry.coordinates as number[][]
          setDrawnLength(lineStringLengthKm(coords))
        } else if (feature.geometry.type === 'Point') {
          const [lon, lat] = feature.geometry.coordinates as [number, number]

          const activeRaster = useStore
            .getState()
            .layers.find(
              (l): l is RasterLayerConfig => l.type === 'raster' && l.visible,
            )
          if (!activeRaster) return

          const isTemporal = !!activeRaster.gee?.temporal
          if (isTemporal) {
            // Temporal: fetch full time series at this point
            const tsCacheKey = `timeseries:${activeRaster.id}:${lon}:${lat}`
            const cachedTs = useStore.getState().statsCache[tsCacheKey]
            if (cachedTs) {
              setRasterStats(cachedTs)
            } else {
              setStatsLoading(true)
              try {
                const series = await getTemporalTimeSeries(activeRaster, lon, lat)
                const result: import('@/types/mapa').RasterStatsResult = { kind: 'timeseries', series }
                useStore.setState((s) => ({
                  statsCache: { ...s.statsCache, [tsCacheKey]: result },
                }))
                if (seq !== statsSeqRef.current) return
                setRasterStats(result)
              } catch (err) {
                console.error('[draw.commit] getTemporalTimeSeries failed', err)
                if (seq === statsSeqRef.current) setStatsError('Falha ao calcular estatísticas. Tente novamente.')
              } finally {
                if (seq === statsSeqRef.current) setStatsLoading(false)
              }
            }
          } else {
            // Non-temporal: single pixel value
            setStatsLoading(true)
            try {
              const tempDate = useStore.getState().temporalDate[activeRaster.id]
              const raw = await getRasterPointValue(activeRaster, lon, lat, tempDate)
              if (seq !== statsSeqRef.current) return
              setPixelValue(raw === null ? null : resolvePixelValue(activeRaster, raw))
            } catch (err) {
              console.error('[draw.commit] getRasterPointValue failed', err)
              if (seq === statsSeqRef.current) {
                setPixelValue(null)
                setStatsError('Falha ao obter o valor do pixel. Tente novamente.')
              }
            } finally {
              if (seq === statsSeqRef.current) setStatsLoading(false)
            }
          }
        }
      }

      map.on('draw.create', handleDrawCommit)
      map.on('draw.update', handleDrawCommit)
      map.on('draw.delete', () => {
        if (draw.getAll().features.length === 0) {
          // A deleted drawing must not be recomputed after a temporal change.
          statsSeqRef.current++
          selectedGeomRef.current = null
          prevStatsContextRef.current = null
          setDrawnArea(null)
          setDrawnLength(null)
          setRasterStats(null)
          setPixelValue(null)
        }
      })

      // When a shape finishes, mapbox-gl-draw returns to simple_select on its
      // own. Mirror that back into the store so the toolbar stops showing the
      // tool as active. (Setting drawMode=null doesn't wipe the drawing, since
      // the sync effect only clears when entering a drawing mode.)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on('draw.modechange', (ev: any) => {
        if (ev?.mode === 'simple_select' && useStore.getState().drawMode !== null) {
          setDrawMode(null)
        }
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

      // Find the top-most visible vector feature under the cursor with a SINGLE
      // queryRenderedFeatures call over all visible vector sublayers, then pick
      // the hit belonging to the highest layer in store order (layers[0] =
      // topmost). Avoids one spatial query per layer on every mouse event.
      const pickHoveredVector = (e: maplibregl.MapMouseEvent) => {
        const state = useStore.getState()
        const sublayerToVector = new Map<string, VectorLayerConfig>()
        const rank = new Map<string, number>()
        const querySublayers: string[] = []
        state.layers.forEach((layer, idx) => {
          if (layer.type !== 'vector' || !layer.visible) return
          const vec = layer as VectorLayerConfig
          rank.set(vec.id, idx)
          for (const sl of queryableLayerIds(vec.id)) {
            sublayerToVector.set(sl, vec)
            querySublayers.push(sl)
          }
        })
        if (querySublayers.length === 0) return null

        const feats = map.queryRenderedFeatures(e.point, { layers: querySublayers })
        let best: { vector: VectorLayerConfig; feature: maplibregl.MapGeoJSONFeature } | null = null
        let bestRank = Infinity
        for (const f of feats) {
          const vec = f.layer?.id ? sublayerToVector.get(f.layer.id) : undefined
          if (!vec) continue
          const r = rank.get(vec.id) ?? Infinity
          if (r < bestRank) {
            bestRank = r
            best = { vector: vec, feature: f }
          }
        }
        return best
      }

      // Click-to-stats needs the vector to be above a visible raster so
      // there's something to compute stats against.
      const pickStatsTarget = (
        hit: { vector: VectorLayerConfig },
      ): RasterLayerConfig | null => {
        const state = useStore.getState()
        const vectorIdx = state.layers.findIndex((l) => l.id === hit.vector.id)
        const rasterIdx = state.layers.findIndex(
          (l) => l.type === 'raster' && l.visible,
        )
        if (rasterIdx === -1 || vectorIdx === -1) return null
        if (vectorIdx >= rasterIdx) return null // vector must be above raster
        return state.layers[rasterIdx] as RasterLayerConfig
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

      // Clear the persistent "selected" feature-state used by the
      // click-to-stats flow. Does NOT touch the ResultsSidebar content -
      // callers decide whether to clear the store's measurements too.
      const clearSelectedFeature = () => {
        const sel = selectedFeatureRef.current
        if (sel) {
          map.setFeatureState(sel, { selected: false })
          selectedFeatureRef.current = null
        }
      }

      // Exposed to FloatingSearchBar via a ref so it can zoom + highlight
      // a feature from the search results dropdown.
      selectFeatureFromSearchRef.current = (layerId, featureId, bbox) => {
        clearSelectedFeature()
        draw.deleteAll()
        // Invalidate in-flight stats and drop any previously selected geometry
        // so the reactive recompute doesn't resurrect it after this search.
        statsSeqRef.current++
        selectedGeomRef.current = null
        setDrawnArea(null)
        setDrawnLength(null)
        setRasterStats(null)
        setPixelValue(null)
        setStatsError(null)
        setAnalysisLabel(null)
        setAnalysisKind(null)
        selectedFeatureRef.current = { source: layerId, id: featureId }
        map.setFeatureState({ source: layerId, id: featureId }, { selected: true })
        map.fitBounds(bbox as maplibregl.LngLatBoundsLike, {
          padding: 60,
          maxZoom: 13,
        })
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
                `<div style="font-family:var(--font-raleway),sans-serif;font-size:12px;font-weight:500;padding:2px 4px;">${String(value)}</div>`,
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
            statsSeqRef.current++
            clearSelectedFeature()
            selectedGeomRef.current = null
            setDrawnArea(null)
            setDrawnLength(null)
            setRasterStats(null)
            setPixelValue(null)
            setStatsError(null)
            setAnalysisLabel(null)
            setAnalysisKind(null)
          }
          return
        }

        const raster = pickStatsTarget(hit)
        if (!raster) return

        const feature = hit.feature

        // A new selection invalidates any in-flight stats response.
        const seq = ++statsSeqRef.current

        // Replace any existing drawing / measurement
        draw.deleteAll()
        setDrawnArea(null)
        setDrawnLength(null)
        setRasterStats(null)
        setPixelValue(null)
        setStatsError(null)

        // Persistently highlight the clicked feature (same visual as hover).
        clearSelectedFeature()
        if (feature.id !== undefined && feature.id !== null) {
          selectedFeatureRef.current = {
            source: hit.vector.id,
            id: feature.id,
            ...(hit.vector.sourceLayer ? { sourceLayer: hit.vector.sourceLayer } : {}),
          }
          map.setFeatureState(selectedFeatureRef.current, { selected: true })
        }

        // Name the analysis after the clicked feature (from its hover label
        // field) so the results card is never ambiguous about its source.
        const labelField = hit.vector.hoverLabelField
        const featureName = labelField ? feature.properties?.[labelField] : undefined
        setAnalysisLabel(
          featureName != null && featureName !== '' ? String(featureName) : hit.vector.name,
        )
        setAnalysisKind(hit.vector.name)

        // Use the COMPLETE geometry from the source GeoJSON, not the
        // tile-clipped one from queryRenderedFeatures, so area and zonal
        // stats cover the whole feature. Falls back to the rendered geometry
        // if the source lookup fails.
        const geom = (await fullFeatureGeometry(hit.vector, feature.id)) ?? feature.geometry
        if (seq !== statsSeqRef.current) return // superseded while fetching source

        // Resolve temporal date for GEE stats
        const tempDate = useStore.getState().temporalDate[raster.id]
        // Set context key so the reactive effect doesn't double-fire
        prevStatsContextRef.current = `${raster.id}:${tempDate ?? 'static'}`

        if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
          selectedGeomRef.current = {
            vectorLayerId: hit.vector.id,
            geometry: geom,
            geometryType: 'polygon',
          }
          setDrawnArea(turfArea({ type: 'Feature', geometry: geom, properties: {} }) / 1_000_000)

          const cacheKey = statsCacheKey(raster.id, tempDate, geom)
          const cached = useStore.getState().statsCache[cacheKey]
          if (cached) {
            setRasterStats(cached)
          } else {
            setStatsLoading(true)
            try {
              const stats = await getRasterStats(raster, {
                type: 'Feature',
                geometry: geom as
                  | { type: 'Polygon';      coordinates: number[][][] }
                  | { type: 'MultiPolygon'; coordinates: number[][][][] },
                properties: {},
              }, tempDate)
              useStore.setState((s) => ({
                statsCache: { ...s.statsCache, [cacheKey]: stats },
              }))
              if (seq !== statsSeqRef.current) return
              setRasterStats(stats)
            } catch (err) {
              console.error('[click-to-stats] getRasterStats failed', err)
              if (seq === statsSeqRef.current) setStatsError('Falha ao calcular estatísticas. Tente novamente.')
            } finally {
              if (seq === statsSeqRef.current) setStatsLoading(false)
            }
          }
        } else if (geom.type === 'Point') {
          const [lon, lat] = geom.coordinates as [number, number]
          selectedGeomRef.current = {
            vectorLayerId: hit.vector.id,
            geometry: geom,
            geometryType: 'point',
            lon, lat,
          }

          const isTemporal = !!raster.gee?.temporal
          if (isTemporal) {
            // Temporal: fetch full time series at this point (single GEE call)
            const tsCacheKey = `timeseries:${raster.id}:${lon}:${lat}`
            const cachedTs = useStore.getState().statsCache[tsCacheKey]
            if (cachedTs) {
              setRasterStats(cachedTs)
              setPixelValue(null)
            } else {
              setStatsLoading(true)
              try {
                const series = await getTemporalTimeSeries(raster, lon, lat)
                const result: import('@/types/mapa').RasterStatsResult = { kind: 'timeseries', series }
                useStore.setState((s) => ({
                  statsCache: { ...s.statsCache, [tsCacheKey]: result },
                }))
                if (seq !== statsSeqRef.current) return
                setRasterStats(result)
                setPixelValue(null)
              } catch (err) {
                console.error('[click-to-stats] getTemporalTimeSeries failed', err)
                if (seq === statsSeqRef.current) setStatsError('Falha ao calcular estatísticas. Tente novamente.')
              } finally {
                if (seq === statsSeqRef.current) setStatsLoading(false)
              }
            }
          } else {
            // Non-temporal: single pixel value
            const cacheKey = statsCacheKey(raster.id, tempDate, geom)
            const cachedPv = useStore.getState().pixelCache[cacheKey]
            if (cachedPv !== undefined) {
              setPixelValue(cachedPv)
            } else {
              setStatsLoading(true)
              try {
                const raw = await getRasterPointValue(raster, lon, lat, tempDate)
                const pv = raw === null ? null : resolvePixelValue(raster, raw)
                useStore.setState((s) => ({
                  pixelCache: { ...s.pixelCache, [cacheKey]: pv },
                }))
                if (seq !== statsSeqRef.current) return
                setPixelValue(pv)
              } catch (err) {
                console.error('[click-to-stats] getRasterPointValue failed', err)
                if (seq === statsSeqRef.current) setStatsError('Falha ao obter o valor do pixel. Tente novamente.')
              } finally {
                if (seq === statsSeqRef.current) setStatsLoading(false)
              }
            }
          }
        }
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

  // 1. Adiciona camadas novas / atualiza visibilidade e opacidade.
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

  // Reactive stats recomputation
  // When the visible raster layer changes (user toggles layers) or the temporal
  // date changes while a vector feature is selected, recompute stats
  // automatically so the sidebar stays in sync.
  const activeRasterId = useMemo(() => {
    const r = layers.find((l) => l.type === 'raster' && l.visible) as RasterLayerConfig | undefined
    return r?.id ?? null
  }, [layers])

  const activeTemporalDateKey = activeRasterId ? temporalDate[activeRasterId] : undefined

  // Track previous values so we only recompute on actual changes
  const prevStatsContextRef = useRef<string | null>(null)

  useEffect(() => {
    const geom = selectedGeomRef.current
    if (!geom || !activeRasterId) return

    // Build a key representing the current stats context
    const contextKey = `${activeRasterId}:${activeTemporalDateKey ?? 'static'}`
    if (contextKey === prevStatsContextRef.current) return

    const raster = layers.find((l) => l.id === activeRasterId) as RasterLayerConfig | undefined
    if (!raster || !raster.visible) return

    // Don't recompute if the raster source hasn't loaded yet
    if (raster.source === 'gee') {
      const store = useStore.getState()
      const hasUrl = activeTemporalDateKey
        ? !!store.temporalTileUrls[raster.id]?.[activeTemporalDateKey]
        : !!store.fetchedTileUrls[raster.id]
      if (!hasUrl) {
        // Do not leave the previous year's result visible while the new tile
        // is loading. Point series cover all years and do not need this reset.
        if (geom.geometryType === 'polygon') {
          statsSeqRef.current++
          setRasterStats(null)
          setStatsError(null)
          setStatsLoading(true)
        }
        return
      }
    }

    // eslint-disable-next-line react-hooks/immutability
    prevStatsContextRef.current = contextKey
    const tempDate = activeTemporalDateKey
    const store = useStore.getState()
    // Switching raster/date supersedes any earlier in-flight stats response.
    const seq = ++statsSeqRef.current

    if (geom.geometryType === 'polygon') {
      const cacheKey = statsCacheKey(raster.id, tempDate, geom.geometry)
      const cached = store.statsCache[cacheKey]
      if (cached) {
        // Cache hit, instant
        setRasterStats(cached)
        return
      }
      // Clear the previous layer's stats so the old numbers aren't shown
      // (under the wrong unit) while the new computation is in flight.
      setRasterStats(null)
      setStatsError(null)
      setStatsLoading(true)
      getRasterStats(raster, {
        type: 'Feature',
        geometry: geom.geometry as
          | { type: 'Polygon';      coordinates: number[][][] }
          | { type: 'MultiPolygon'; coordinates: number[][][][] },
        properties: {},
      }, tempDate).then((stats) => {
        useStore.setState((s) => ({
          statsCache: { ...s.statsCache, [cacheKey]: stats },
        }))
        if (seq !== statsSeqRef.current) return
        setRasterStats(stats)
      }).catch((err) => {
        console.error('[reactive-stats] getRasterStats failed', err)
        if (seq === statsSeqRef.current) setStatsError('Falha ao calcular estatísticas. Tente novamente.')
      }).finally(() => {
        if (seq === statsSeqRef.current) setStatsLoading(false)
      })
    } else if (geom.geometryType === 'point' && geom.lon != null && geom.lat != null) {
      const isTemporal = !!raster.gee?.temporal
      if (isTemporal) {
        // Temporal point: show full time series (already cached from initial click)
        const tsCacheKey = `timeseries:${raster.id}:${geom.lon}:${geom.lat}`
        const cachedTs = store.statsCache[tsCacheKey]
        if (cachedTs) {
          setRasterStats(cachedTs)
          setPixelValue(null)
        }
        // Don't re-fetch, the time series covers all dates already
        return
      }
      const cacheKey = statsCacheKey(raster.id, tempDate, geom.geometry)
      const cached = store.pixelCache[cacheKey]
      if (cached !== undefined) {
        setRasterStats(null)
        setPixelValue(cached)
        return
      }
      setRasterStats(null)
      setStatsError(null)
      setStatsLoading(true)
      getRasterPointValue(raster, geom.lon, geom.lat, tempDate).then((raw) => {
        const pv = raw === null ? null : resolvePixelValue(raster, raw)
        useStore.setState((s) => ({
          pixelCache: { ...s.pixelCache, [cacheKey]: pv },
        }))
        if (seq !== statsSeqRef.current) return
        setPixelValue(pv)
      }).catch((err) => {
        console.error('[reactive-stats] getRasterPointValue failed', err)
        if (seq === statsSeqRef.current) setStatsError('Falha ao obter o valor do pixel. Tente novamente.')
      }).finally(() => {
        if (seq === statsSeqRef.current) setStatsLoading(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRasterId, activeTemporalDateKey, layers, temporalTileUrls])

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
      setRasterStats(null)
      setPixelValue(null)
      // Clear any selected-feature highlight (effect runs outside the
      // map.on('load') closure where `clearSelectedFeature` helper lives,
      // so we inline the logic here).
      const sel = selectedFeatureRef.current
      if (sel) {
        map.setFeatureState(sel, { selected: false })
        selectedFeatureRef.current = null
      }
      // Also drop the selected geometry so the reactive-stats effect can't
      // recompute + repopulate Resultados for the old feature mid draw-mode.
      selectedGeomRef.current = null
    }

    // Map internal DrawMode -> mapbox-gl-draw mode names. `null` falls
    // back to simple_select (the idle mode) because mapbox-gl-draw 1.5
    // doesn't ship a 'static' mode.
    const mapboxMode =
      drawMode === 'polygon'    ? 'draw_polygon'
      : drawMode === 'rectangle'  ? 'draw_rectangle'
      : drawMode === 'linestring' ? 'draw_line_string'
      : drawMode === 'point'      ? 'draw_point'
      : 'simple_select'

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
  }, [drawMode, setDrawnArea, setDrawnLength, setRasterStats, setPixelValue])

  // React to "Clear drawings" button
  useEffect(() => {
    if (clearSignal === 0) return
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
            open={drawOpen}
            onClose={() => setDrawOpen(false)}
          />
          <FloatingLegend theme={theme} rightOffset={rightOffset} />
          <TemporalSlider theme={theme} />
          <CursorCoordinates mapRef={mapRef} theme={theme} />
        </>
      )}
    </div>
  )
}
