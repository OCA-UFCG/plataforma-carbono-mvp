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

function candidate(layer: VectorLayerConfig, storeIndex: number, area?: number): VectorPickCandidate<string> {
  return { layer, storeIndex, area, hit: layer.id }
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

  it('picks the smaller of two nested recortes of one granularity, whichever layer holds it', () => {
    // An APA (Uso Sustentável) holds whole settlements, and a reserve
    // (Proteção Integral) lies whole inside an indigenous land.
    const apa = vector('uc_uso_sustentavel', 30)
    const assentamentos = vector('assentamentos', 30)
    const tis = vector('terras_indigenas', 30)
    const pi = vector('uc_protecao_integral', 30)

    expect(pickMostSpecific([candidate(assentamentos, 5, 1_200), candidate(apa, 7, 300_000)])?.layer.id).toBe('assentamentos')
    expect(pickMostSpecific([candidate(tis, 3, 25_000), candidate(pi, 6, 11_000)])?.layer.id).toBe('uc_protecao_integral')
  })

  it('picks an RPPN over the APA around it in the same layer', () => {
    const us = vector('uc_uso_sustentavel', 30)
    const apa: VectorPickCandidate<string> = { layer: us, storeIndex: 7, area: 300_000, hit: 'apa' }
    const rppn: VectorPickCandidate<string> = { layer: us, storeIndex: 7, area: 160, hit: 'rppn' }

    expect(pickMostSpecific([apa, rppn])?.hit).toBe('rppn')
  })

  it('never lets area overrule granularity', () => {
    // A small municipality inside a large APA is coarser, not finer.
    const municipios = vector('municipios', 20)
    const apa = vector('uc_uso_sustentavel', 30)

    expect(pickMostSpecific([candidate(municipios, 2, 100), candidate(apa, 7, 300_000)])?.layer.id).toBe('uc_uso_sustentavel')
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

  it('ranks the territories and the conservation units at one level', () => {
    const priority = (id: string) => vectors.find((layer) => layer.id === id)?.pickPriority ?? 0
    const level = ['terras_indigenas', 'quilombolas', 'assentamentos', 'uc_protecao_integral', 'uc_uso_sustentavel']

    expect(new Set(level.map(priority)).size).toBe(1)
    expect(priority('municipios')).toBeLessThan(priority('uc_uso_sustentavel'))
  })
})
