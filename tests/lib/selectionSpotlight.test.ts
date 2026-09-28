import { describe, expect, it } from 'vitest'
import type { MultiPolygon, Polygon } from 'geojson'
import { outsideMask } from '@/lib/outsideMask'
import {
  SPOTLIGHT_LAYER_IDS,
  addSpotlightLayers,
  clearSpotlight,
  isSameFeature,
  raiseSpotlight,
  showSpotlight,
  spotlightPadding,
  type SpotlightMap,
} from '@/lib/mapa/selectionSpotlight'

/** Records what the spotlight asks of the map, standing in for MapLibre. */
function fakeMap() {
  const sources = new Map<string, { data: unknown; setData: (d: unknown) => void }>()
  const layers: string[] = []
  const moved: string[] = []
  const map: SpotlightMap = {
    getSource: ((id: string) => sources.get(id)) as SpotlightMap['getSource'],
    addSource: ((id: string, spec: { data: unknown }) => {
      const source = { data: spec.data, setData(d: unknown) { source.data = d } }
      sources.set(id, source)
      return map
    }) as unknown as SpotlightMap['addSource'],
    getLayer: ((id: string) => (layers.includes(id) ? { id } : undefined)) as SpotlightMap['getLayer'],
    addLayer: ((layer: { id: string }) => { layers.push(layer.id); return map }) as unknown as SpotlightMap['addLayer'],
    moveLayer: ((id: string) => { moved.push(id); return map }) as unknown as SpotlightMap['moveLayer'],
  }
  const dataOf = (id: string) => sources.get(id)?.data as GeoJSON.FeatureCollection | GeoJSON.Feature
  return { map, sources, layers, moved, dataOf }
}

const square: Polygon = {
  type: 'Polygon',
  coordinates: [[[-36, -7.4], [-35.5, -7.4], [-35.5, -6.9], [-36, -6.9], [-36, -7.4]]],
}

describe('selection spotlight layers', () => {
  it('adds its sources and layers once, empty', () => {
    const f = fakeMap()
    addSpotlightLayers(f.map)
    addSpotlightLayers(f.map)

    expect(f.layers).toEqual([...SPOTLIGHT_LAYER_IDS])
    for (const source of f.sources.values()) {
      expect(source.data).toEqual({ type: 'FeatureCollection', features: [] })
    }
  })

  it('dims the world outside the feature and rings the feature itself', () => {
    const f = fakeMap()
    addSpotlightLayers(f.map)
    showSpotlight(f.map, square)

    const [maskSource, outlineSource] = [...f.sources.keys()]
    expect(f.dataOf(maskSource)).toEqual(outsideMask(square))
    expect(f.dataOf(outlineSource)).toEqual({ type: 'Feature', properties: {}, geometry: square })
  })

  it('takes a MultiPolygon, one hole per part', () => {
    const f = fakeMap()
    addSpotlightLayers(f.map)
    const two: MultiPolygon = { type: 'MultiPolygon', coordinates: [square.coordinates, square.coordinates] }
    showSpotlight(f.map, two)

    const mask = f.dataOf([...f.sources.keys()][0]) as GeoJSON.Feature<Polygon>
    expect(mask.geometry.coordinates).toHaveLength(3)
  })

  it('empties both sources on clear, and tolerates a map without them', () => {
    const f = fakeMap()
    clearSpotlight(f.map)
    addSpotlightLayers(f.map)
    showSpotlight(f.map, square)
    clearSpotlight(f.map)

    for (const source of f.sources.values()) {
      expect(source.data).toEqual({ type: 'FeatureCollection', features: [] })
    }
  })

  it('raises the mask first and the outline last, so the outline sits on top', () => {
    const f = fakeMap()
    raiseSpotlight(f.map)
    expect(f.moved).toEqual([])

    addSpotlightLayers(f.map)
    raiseSpotlight(f.map)
    expect(f.moved).toEqual([...SPOTLIGHT_LAYER_IDS])
  })
})

describe('isSameFeature', () => {
  it('matches the same feature of the same layer only', () => {
    expect(isSameFeature({ source: 'municipios', id: 12 }, { source: 'municipios', id: 12 })).toBe(true)
    expect(isSameFeature({ source: 'municipios', id: 12 }, { source: 'municipios', id: 13 })).toBe(false)
    expect(isSameFeature({ source: 'estados', id: 12 }, { source: 'municipios', id: 12 })).toBe(false)
  })

  it('never matches without a current selection or a feature id', () => {
    expect(isSameFeature(null, { source: 'municipios', id: 12 })).toBe(false)
    expect(isSameFeature({ source: 'municipios', id: 12 }, { source: 'municipios', id: undefined })).toBe(false)
  })
})

describe('spotlightPadding', () => {
  it('frames the feature between the panels', () => {
    expect(spotlightPadding(1440, 900, 360, 396)).toEqual({ top: 80, bottom: 60, left: 384, right: 420 })
  })

  it('falls back to an even margin when the panels leave too little map', () => {
    expect(spotlightPadding(700, 500, 360, 396)).toEqual({ top: 40, bottom: 40, left: 40, right: 40 })
  })
})
