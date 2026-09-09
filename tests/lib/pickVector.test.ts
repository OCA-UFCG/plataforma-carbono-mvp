import { describe, expect, it } from 'vitest'
import { pickMostSpecific, type VectorPickCandidate } from '@/lib/mapa/pickVector'
import appConfig from '@/config/mapa/layers.json'
import type { LayerConfig, VectorLayerConfig } from '@/types/mapa'

function vector(id: string, pickPriority?: number): VectorLayerConfig {
  return {
    id,
    name: id,
    type: 'vector',
    url: `/data/${id}.geojson`,
    visible: true,
    opacity: 80,
    color: '#000',
    theme: 'territorio',
    subtheme: 'limites',
    ...(pickPriority === undefined ? {} : { pickPriority }),
  }
}

function candidate(layer: VectorLayerConfig, storeIndex: number): VectorPickCandidate<string> {
  return { layer, storeIndex, hit: layer.id }
}

describe('pickMostSpecific', () => {
  it('picks the finer recorte even when the coarser one is above it', () => {
    // Reproduces the reported bug: "Bioma Caatinga" is layers[0] and contains
    // every municipality, so plain "topmost wins" made it swallow the click.
    const bioma = vector('bioma', 0)
    const municipios = vector('municipios', 20)

    const best = pickMostSpecific([candidate(bioma, 0), candidate(municipios, 2)])

    expect(best?.layer.id).toBe('municipios')
  })

  it('is independent of the order the hits arrive in', () => {
    const bioma = vector('bioma', 0)
    const municipios = vector('municipios', 20)

    const best = pickMostSpecific([candidate(municipios, 2), candidate(bioma, 0)])

    expect(best?.layer.id).toBe('municipios')
  })

  it('falls back to layer order between recortes of the same granularity', () => {
    const quilombolas = vector('quilombolas', 30)
    const assentamentos = vector('assentamentos', 30)

    const best = pickMostSpecific([candidate(assentamentos, 5), candidate(quilombolas, 4)])

    expect(best?.layer.id).toBe('quilombolas')
  })

  it('treats a layer without pickPriority as the coarsest', () => {
    const undeclared = vector('sem_prioridade')
    const municipios = vector('municipios', 20)

    const best = pickMostSpecific([candidate(undeclared, 0), candidate(municipios, 2)])

    expect(best?.layer.id).toBe('municipios')
  })

  it('returns null when nothing was hit', () => {
    expect(pickMostSpecific([])).toBeNull()
  })
})

describe('layers.json pick priorities', () => {
  const vectors = (appConfig.layers as LayerConfig[]).filter(
    (layer): layer is VectorLayerConfig => layer.type === 'vector',
  )

  it('declares a pickPriority for every recorte', () => {
    const missing = vectors.filter((layer) => layer.pickPriority === undefined)
    expect(missing.map((layer) => layer.id)).toEqual([])
  })

  it('ranks the containment hierarchy from the biome down to the territories', () => {
    const priority = (id: string) => vectors.find((layer) => layer.id === id)?.pickPriority ?? 0

    expect(priority('bioma')).toBeLessThan(priority('estados'))
    expect(priority('estados')).toBeLessThan(priority('municipios'))
    expect(priority('municipios')).toBeLessThan(priority('terras_indigenas'))
    expect(priority('municipios')).toBeLessThan(priority('quilombolas'))
    expect(priority('municipios')).toBeLessThan(priority('assentamentos'))
  })
})
