import { describe, expect, it } from 'vitest'
import { analysisHint, clickableRecortes, topVisibleRasterIndex } from '@/lib/mapa/analysisTargets'
import appConfig from '@/config/mapa/layers.json'
import type { LayerConfig, RasterLayerConfig, VectorLayerConfig } from '@/types/mapa'

function vector(id: string, visible: boolean): VectorLayerConfig {
  return {
    id,
    name: id,
    type: 'vector',
    url: `/data/${id}.geojson`,
    visible,
    opacity: 80,
    color: '#000',
    theme: 'territorio',
    subtheme: 'limites',
  }
}

function raster(id: string, visible: boolean): RasterLayerConfig {
  return {
    id,
    name: id,
    type: 'raster',
    visible,
    opacity: 80,
    colorType: 'continuous',
    theme: 'carbono',
    subtheme: 'reservatorios',
  }
}

describe('topVisibleRasterIndex', () => {
  it('returns -1 when no raster is on', () => {
    const layers: LayerConfig[] = [vector('bioma', true), raster('agb', false)]

    expect(topVisibleRasterIndex(layers)).toBe(-1)
  })

  it('returns the topmost visible raster, not the first raster declared', () => {
    const layers: LayerConfig[] = [
      vector('bioma', true),
      raster('agb', false),
      raster('gpp', true),
      raster('npp', true),
    ]

    expect(topVisibleRasterIndex(layers)).toBe(2)
  })
})

describe('clickableRecortes', () => {
  it('finds nothing to click when no raster is on', () => {
    // The click computes statistics OF a raster: with none on there is
    // nothing to measure, however many recortes are visible.
    const layers: LayerConfig[] = [vector('bioma', true), raster('agb', false)]

    expect(clickableRecortes(layers)).toEqual([])
  })

  it('finds nothing to click when a raster is on and every recorte is off', () => {
    // The reported case: only "Biomassa acima do solo" active, so a click on
    // the map has no feature to resolve and dies silently.
    const layers: LayerConfig[] = [
      vector('bioma', false),
      vector('municipios', false),
      raster('agb', true),
    ]

    expect(clickableRecortes(layers)).toEqual([])
  })

  it('excludes a visible recorte dragged below the raster', () => {
    // A click on a feature reaches the raster BENEATH it, so a recorte dragged
    // below the raster has nothing under it: MapView refuses to measure such a
    // click and the hint must not offer it either. Both read this list.
    const layers: LayerConfig[] = [raster('agb', true), vector('municipios', true)]

    expect(clickableRecortes(layers)).toEqual([])
  })

  it('returns the visible recortes above the raster, in layer order', () => {
    const layers: LayerConfig[] = [
      vector('bioma', true),
      vector('estados', false),
      vector('municipios', true),
      raster('agb', true),
      vector('assentamentos', true),
    ]

    expect(clickableRecortes(layers).map((layer) => layer.id)).toEqual(['bioma', 'municipios'])
  })
})

describe('analysisHint', () => {
  it('asks for a recorte, and says where to turn one on, when none is clickable', () => {
    const hint = analysisHint([])

    expect(hint).toContain('Nenhum recorte territorial ativo')
    expect(hint).toContain('Território')
    expect(hint).toContain('Limites de referência')
  })

  it('names the single active recorte instead of promising a municipality', () => {
    // The default state: only the biome is on, so the click answers for the
    // whole Caatinga. Naming it is what keeps the number unambiguous.
    const hint = analysisHint([{ ...vector('bioma', true), name: 'Bioma Caatinga' }])

    expect(hint).toContain('Bioma Caatinga')
    expect(hint).not.toContain('Nenhum recorte')
  })

  it('lists every active recorte', () => {
    const bioma = { ...vector('bioma', true), name: 'Bioma Caatinga' }
    const municipios = { ...vector('municipios', true), name: 'Municípios' }

    expect(analysisHint([bioma, municipios])).toContain('Bioma Caatinga ou Municípios')
  })

  it('points at the drawing tools on the left, where the toolbar actually is', () => {
    // DrawToolbar is anchored to the Temas panel (left: leftEdge + 12); the
    // old copy sent people to the right edge, where there is nothing.
    for (const hint of [analysisHint([]), analysisHint([vector('bioma', true)])]) {
      expect(hint).toContain('esquerda')
      expect(hint).not.toContain('direita')
      expect(hint).toContain('Coordenadas')
    }
  })
})

describe('layers.json default state', () => {
  const layers = appConfig.layers as LayerConfig[]

  it('leaves the biome clickable once a raster is turned on', () => {
    // Out of the box the click DOES work, but it resolves to the whole
    // Caatinga -- never to a municipality, as the results hint used to promise.
    const withRaster = layers.map((layer) =>
      layer.id === 'estoque_c_agb' ? { ...layer, visible: true } : layer,
    )

    expect(clickableRecortes(withRaster).map((layer) => layer.id)).toEqual(['bioma'])
  })
})
