// Spotlight on the recorte selected on the map: the rest of the map dimmed
// under `outsideMask`, and the feature ringed by a light halo under an ink
// line. Same colors as the story map (components/territorios/StoryMap.tsx), so
// a selected territory reads the same way in both modules.
//
// The layers sit above every user layer, rasters included: dimming the raster
// outside the feature is the point. MapView raises them after each z-order
// sync, just below the drawing tools.

import type maplibregl from 'maplibre-gl'
import type { MultiPolygon, Polygon } from 'geojson'
import { outsideMask } from '@/lib/outsideMask'

const MASK_SOURCE = 'selection-mask'
const OUTLINE_SOURCE = 'selection-outline'

/** Bottom to top. */
export const SPOTLIGHT_LAYER_IDS = ['selection-mask', 'selection-halo', 'selection-line'] as const

const MASK_COLOR = '#000f15'
const MASK_OPACITY = 0.45
const HALO = '#fefefb'
const INK = '#001d27'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/** The part of the MapLibre map the spotlight uses, so tests can stand in for it. */
export type SpotlightMap = Pick<maplibregl.Map, 'getSource' | 'addSource' | 'getLayer' | 'addLayer' | 'moveLayer'>

function setData(map: SpotlightMap, id: string, data: GeoJSON.GeoJSON) {
  const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined
  source?.setData(data)
}

/** Adds the (empty) spotlight sources and layers; safe to call again. */
export function addSpotlightLayers(map: SpotlightMap) {
  if (!map.getSource(MASK_SOURCE)) map.addSource(MASK_SOURCE, { type: 'geojson', data: EMPTY })
  if (!map.getSource(OUTLINE_SOURCE)) map.addSource(OUTLINE_SOURCE, { type: 'geojson', data: EMPTY })
  const [mask, halo, line] = SPOTLIGHT_LAYER_IDS
  if (!map.getLayer(mask)) {
    map.addLayer({
      id: mask, type: 'fill', source: MASK_SOURCE,
      paint: { 'fill-color': MASK_COLOR, 'fill-opacity': MASK_OPACITY },
    })
  }
  if (!map.getLayer(halo)) {
    map.addLayer({
      id: halo, type: 'line', source: OUTLINE_SOURCE,
      layout: { 'line-join': 'round' },
      paint: { 'line-color': HALO, 'line-width': 5, 'line-opacity': 0.9 },
    })
  }
  if (!map.getLayer(line)) {
    map.addLayer({
      id: line, type: 'line', source: OUTLINE_SOURCE,
      layout: { 'line-join': 'round' },
      paint: { 'line-color': INK, 'line-width': 2 },
    })
  }
}

export function showSpotlight(map: SpotlightMap, geometry: Polygon | MultiPolygon) {
  setData(map, MASK_SOURCE, outsideMask(geometry))
  setData(map, OUTLINE_SOURCE, { type: 'Feature', properties: {}, geometry })
}

export function clearSpotlight(map: SpotlightMap) {
  setData(map, MASK_SOURCE, EMPTY)
  setData(map, OUTLINE_SOURCE, EMPTY)
}

/** Moves the spotlight to the top of the stack, outline last. */
export function raiseSpotlight(map: SpotlightMap) {
  for (const id of SPOTLIGHT_LAYER_IDS) {
    if (map.getLayer(id)) map.moveLayer(id)
  }
}

type FeatureRef = { source: string; id: number | string | undefined }

/**
 * Whether a click lands on the feature already selected. Clicking it again
 * keeps the camera where the user took it instead of pulling it back.
 */
export function isSameFeature(current: FeatureRef | null, next: FeatureRef): boolean {
  if (!current || next.id === undefined || next.id === null) return false
  return current.source === next.source && current.id === next.id
}

/** Least map, in px, left between the panels before the padding gives up on them. */
const MIN_FRAME = 200
/** Clearance, in px, between the feature and a box floating over the map. */
const GAP = 16

type Padding = { top: number; bottom: number; left: number; right: number }

/** A box floating over the bottom of the map, in px from the map's bottom and right edges. */
export interface MapOverlay { width: number; height: number; bottom: number; right: number }

/**
 * Padding that frames the selected feature in the part of the map the panels
 * and the floating boxes leave free: the Temas panel on the left (`leftEdge`),
 * the results panel on the right (`rightOffset`), the search bar on top.
 *
 * At the bottom, the year slider spans the middle of the map, so only a higher
 * bottom margin clears it. The legend sits in the bottom-right corner and can
 * be cleared either way, over its top or past its left edge; the padding takes
 * whichever leaves more map, so a short legend lifts the bottom and a tall one
 * narrows the right.
 *
 * When clearing the legend would leave too little map, the feature may touch
 * it; when even the panels do, an even margin, since MapLibre refuses a fit
 * whose padding leaves no room.
 */
export function spotlightPadding(
  map: { width: number; height: number },
  panels: { leftEdge: number; rightOffset: number },
  overlays: { legend?: MapOverlay | null; slider?: MapOverlay | null } = {},
): Padding {
  const frame = (p: Padding) => ({ w: map.width - p.left - p.right, h: map.height - p.top - p.bottom })
  const roomy = (p: Padding) => frame(p).w >= MIN_FRAME && frame(p).h >= MIN_FRAME
  const area = (p: Padding) => frame(p).w * frame(p).h

  const base = { top: 80, bottom: 60, left: panels.leftEdge + 24, right: panels.rightOffset + 24 }
  let padding = base

  const { legend, slider } = overlays
  if (slider) {
    padding = { ...padding, bottom: Math.max(padding.bottom, slider.bottom + slider.height + GAP) }
  }
  if (legend && legend.bottom + legend.height + GAP > padding.bottom) {
    const over = { ...padding, bottom: legend.bottom + legend.height + GAP }
    const past = { ...padding, right: Math.max(padding.right, legend.right + legend.width + GAP) }
    const options = [over, past].filter(roomy)
    if (options.length > 0) padding = options.reduce((best, p) => (area(p) > area(best) ? p : best))
  }

  if (roomy(padding)) return padding
  return roomy(base) ? base : { top: 40, bottom: 40, left: 40, right: 40 }
}
