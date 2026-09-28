'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson'
import { STORY_BASEMAP } from '@/config/territorios/basemap'
import { MAP_LOCALE, TERRITORY_SCRIPT } from '@/config/territorios/storyScript'
import { computeBbox } from '@/lib/mapa/computeBbox'
import type { FeatureEntry, PolygonalGeometry } from '@/lib/territorios/featureIds'
import { interiorPoint } from '@/lib/territorios/interiorPoint'

export interface ChooserMapProps {
  /** The type's parsed GeoJSON, handed to MapLibre as it came from the file. */
  collection:    FeatureCollection
  entries:       readonly FeatureEntry[]
  biome:         PolygonalGeometry
  color:         string
  /** A dot on each territory, for the types whose polygons vanish at the zoom that frames them all. */
  markers:       boolean
  selectedIndex: number | null
  onPick:        (index: number) => void
}

const TERRITORY_SOURCE = 'territorios'
const MARKER_SOURCE = 'pontos'
const BIOME_SOURCE = 'bioma'
const FILL_LAYER = 'territorios-preenchimento'
const MARKER_LAYER = 'territorios-pontos'

/** Half the side of the box a click searches, so the pointer does not have to land inside a thin polygon. */
const HIT_RADIUS_PX = 6
/** The same for a finger. At the zoom that frames every territory a dot is 3 px in radius. */
const TOUCH_HIT_RADIUS_PX = 20
/**
 * Past this zoom a polygon of 10 ha spans two pixels, within reach of the hit
 * box, and the dots would only clutter. Five of the 2059 settlements, quilombos
 * and indigenous lands are smaller (measured on 2026-09-16).
 */
const MARKER_MAX_ZOOM = 10
const SELECTED_FIT = { padding: 48, maxZoom: 12 }

/** --bg-texto-primario, the outline of the territory in focus over its fill. */
const SELECTED_LINE = '#001d27'
/**
 * The approved dark terracotta, away from the green of the territories: the
 * old #ce8b44 was the assentamentos layer's own color.
 */
const BIOME_LINE = '#9a5a2a'

const HOVER = ['boolean', ['feature-state', 'hover'], false]
const SELECTED = ['boolean', ['feature-state', 'selected'], false]

function markerCollection(entries: readonly FeatureEntry[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: entries.map((entry) => {
      const { lon, lat } = interiorPoint(entry.geometry)
      // The file index, the same id generateId gives the polygon, so one
      // feature-state call per source highlights both.
      return { type: 'Feature', id: entry.index, properties: {}, geometry: { type: 'Point', coordinates: [lon, lat] } }
    }),
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function ChooserMap({ collection, entries, biome, color, markers, selectedIndex, onPick }: ChooserMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onPickRef = useRef(onPick)
  // The instance rather than a flag: when the map is rebuilt (Fast Refresh in
  // development), a flag left true would send feature-state to a style still loading.
  const [loadedMap, setLoadedMap] = useState<maplibregl.Map | null>(null)

  const byIndex = useMemo(() => new Map(entries.map((entry) => [entry.index, entry])), [entries])

  useEffect(() => { onPickRef.current = onPick }, [onPick])

  useEffect(() => {
    const container = containerRef.current
    const basemap = STORY_BASEMAP
    if (!container || !basemap) return
    const bbox = computeBbox(collection)

    const map = new maplibregl.Map({
      container,
      bounds: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
      fitBoundsOptions: { padding: 24 },
      attributionControl: { compact: true },
      locale: MAP_LOCALE,
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
          [BIOME_SOURCE]: {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: biome as Polygon | MultiPolygon },
          },
          [TERRITORY_SOURCE]: { type: 'geojson', data: collection, generateId: true },
          ...(markers ? { [MARKER_SOURCE]: { type: 'geojson' as const, data: markerCollection(entries) } } : {}),
        },
        layers: [
          { id: 'base', type: 'raster', source: 'base' },
          {
            id: FILL_LAYER, type: 'fill', source: TERRITORY_SOURCE,
            paint: {
              'fill-color': color,
              'fill-opacity': ['case', SELECTED, 0.7, HOVER, 0.35, 0.1],
            },
          },
          {
            id: 'bioma-contorno', type: 'line', source: BIOME_SOURCE,
            paint: { 'line-color': BIOME_LINE, 'line-width': 2 },
          },
          {
            id: 'territorios-contorno', type: 'line', source: TERRITORY_SOURCE,
            layout: { 'line-join': 'round' },
            paint: {
              'line-color': ['case', SELECTED, SELECTED_LINE, color],
              'line-width': ['case', SELECTED, 2.5, HOVER, 2, 0.8],
            },
          },
          ...(markers
            ? [{
                id: MARKER_LAYER, type: 'circle' as const, source: MARKER_SOURCE, maxzoom: MARKER_MAX_ZOOM,
                paint: {
                  'circle-color': color,
                  'circle-radius': [
                    'interpolate', ['linear'], ['zoom'],
                    4, ['case', ['any', SELECTED, HOVER], 5, 3],
                    MARKER_MAX_ZOOM, ['case', ['any', SELECTED, HOVER], 8, 5],
                  ],
                  'circle-stroke-color': '#ffffff',
                  'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 4, 0.5, MARKER_MAX_ZOOM, 1],
                },
              }]
            : []),
        ] as maplibregl.LayerSpecification[],
      },
    })
    map.touchZoomRotate.disableRotation()
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    const queryLayers = markers ? [MARKER_LAYER, FILL_LAYER] : [FILL_LAYER]
    const hitRadius = window.matchMedia('(pointer: coarse)').matches ? TOUCH_HIT_RADIUS_PX : HIT_RADIUS_PX

    const pickAt = (point: maplibregl.Point): FeatureEntry | null => {
      const exact = map.queryRenderedFeatures(point, { layers: queryLayers })
      const hits = exact.length > 0 ? exact : map.queryRenderedFeatures(
        [[point.x - hitRadius, point.y - hitRadius], [point.x + hitRadius, point.y + hitRadius]],
        { layers: queryLayers },
      )
      // Where settlements crowd, a finger's box holds several dots and the one
      // nearest the touch wins. Polygons keep the drawing order, topmost first,
      // and give way to any dot.
      let picked: FeatureEntry | null = null
      let pickedDistance = Number.POSITIVE_INFINITY
      for (const hit of hits) {
        const entry = typeof hit.id === 'number' ? byIndex.get(hit.id) : undefined
        if (!entry) continue
        const distance = hit.geometry.type === 'Point'
          ? map.project(hit.geometry.coordinates as [number, number]).dist(point)
          : Number.POSITIVE_INFINITY
        if (picked === null || distance < pickedDistance) {
          picked = entry
          pickedDistance = distance
        }
      }
      return picked
    }

    const popup = new maplibregl.Popup({
      closeButton:  false,
      closeOnClick: false,
      className:    'territorios-escolha-rotulo',
      offset:       14,
      maxWidth:     '260px',
    })
    let hovered: number | null = null
    let hoverRaf: number | null = null
    let lastMove: maplibregl.MapMouseEvent | null = null

    const setHover = (index: number | null) => {
      if (hovered === index) return
      if (hovered !== null) setFeatureFlag(map, markers, hovered, 'hover', false)
      hovered = index
      if (index !== null) setFeatureFlag(map, markers, index, 'hover', true)
    }

    map.once('load', () => {
      map.on('click', (e) => {
        const entry = pickAt(e.point)
        if (entry) onPickRef.current(entry.index)
      })

      // A touch screen fires emulated mouse moves on tap, which would leave a
      // stray label on the phone; only a real pointer gets the hover.
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        map.on('mousemove', (e) => {
          lastMove = e
          if (hoverRaf !== null) return
          hoverRaf = requestAnimationFrame(() => {
            hoverRaf = null
            if (!lastMove) return
            const entry = pickAt(lastMove.point)
            map.getCanvas().style.cursor = entry ? 'pointer' : ''
            if (!entry) {
              setHover(null)
              popup.remove()
              return
            }
            if (entry.index !== hovered || !popup.isOpen()) {
              popup.setText(TERRITORY_SCRIPT.title(entry.name, entry.context))
            }
            setHover(entry.index)
            popup.setLngLat(lastMove.lngLat).addTo(map)
          })
        })
        map.on('mouseout', () => {
          if (hoverRaf !== null) cancelAnimationFrame(hoverRaf)
          hoverRaf = null
          lastMove = null
          map.getCanvas().style.cursor = ''
          setHover(null)
          popup.remove()
        })
      }

      setLoadedMap(map)
    })

    mapRef.current = map
    return () => {
      if (hoverRaf !== null) cancelAnimationFrame(hoverRaf)
      mapRef.current = null
      popup.remove()
      map.remove()
    }
  }, [collection, entries, biome, color, markers, byIndex])

  useEffect(() => {
    const map = loadedMap
    const entry = selectedIndex === null ? undefined : byIndex.get(selectedIndex)
    if (!map || map !== mapRef.current || !entry) return

    setFeatureFlag(map, markers, entry.index, 'selected', true)
    const [west, south, east, north] = computeBbox(entry.geometry)
    map.fitBounds([[west, south], [east, north]], {
      ...SELECTED_FIT,
      duration: prefersReducedMotion() ? 0 : 600,
    })

    return () => {
      // The map may already be gone when the chooser unmounts.
      if (mapRef.current === map) setFeatureFlag(map, markers, entry.index, 'selected', false)
    }
  }, [loadedMap, selectedIndex, byIndex, markers])

  return <div ref={containerRef} className="territorios-escolha-mapa-canvas" />
}

function setFeatureFlag(map: maplibregl.Map, markers: boolean, index: number, flag: 'hover' | 'selected', value: boolean) {
  map.setFeatureState({ source: TERRITORY_SOURCE, id: index }, { [flag]: value })
  if (markers) map.setFeatureState({ source: MARKER_SOURCE, id: index }, { [flag]: value })
}
