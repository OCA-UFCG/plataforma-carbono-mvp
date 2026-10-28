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

interface Hit {
  id: string
  /** Area of the whole feature, as MapView reads it from the source GeoJSON. */
  area?: number
}

function candidate(layer: VectorLayerConfig, storeIndex: number, area?: number): VectorPickCandidate<Hit> {
  return { layer, storeIndex, hit: { id: layer.id, area } }
}

const areaOf = (c: VectorPickCandidate<Hit>) => c.hit.area

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items]
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  )
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

    expect(pickMostSpecific([candidate(assentamentos, 5, 1_200), candidate(apa, 7, 300_000)], areaOf)?.layer.id).toBe('assentamentos')
    expect(pickMostSpecific([candidate(tis, 3, 25_000), candidate(pi, 6, 11_000)], areaOf)?.layer.id).toBe('uc_protecao_integral')
  })

  it('picks an RPPN over the APA around it in the same layer', () => {
    const us = vector('uc_uso_sustentavel', 30)
    const apa: VectorPickCandidate<Hit> = { layer: us, storeIndex: 7, hit: { id: 'apa', area: 300_000 } }
    const rppn: VectorPickCandidate<Hit> = { layer: us, storeIndex: 7, hit: { id: 'rppn', area: 160 } }

    expect(pickMostSpecific([apa, rppn], areaOf)?.hit.id).toBe('rppn')
  })

  it('falls back to layer order between equal areas', () => {
    const tis = vector('terras_indigenas', 30)
    const pi = vector('uc_protecao_integral', 30)

    for (const hits of permutations([candidate(tis, 3, 820_450), candidate(pi, 6, 820_450)])) {
      expect(pickMostSpecific(hits, areaOf)?.layer.id).toBe('terras_indigenas')
    }
  })

  it('falls back to layer order while any area of the finest level is unknown', () => {
    // A source GeoJSON still loading: measuring only the loaded layer would let
    // a large TI beat the reserve inside it just for being known first.
    const tis = vector('terras_indigenas', 30)
    const pi = vector('uc_protecao_integral', 30)

    for (const hits of permutations([candidate(tis, 3, 25_000), candidate(pi, 6)])) {
      expect(pickMostSpecific(hits, areaOf)?.layer.id).toBe('terras_indigenas')
    }
  })

  it('is independent of the order the hits arrive in, a point among polygons', () => {
    // MapView measures a point as 0, the smallest feature there is.
    const towers = vector('areas_monitoramento', 30)
    const quilombolas = vector('quilombolas', 30)
    const assentamentos = vector('assentamentos', 30)
    const hits = [candidate(towers, 6, 0), candidate(quilombolas, 5, 100), candidate(assentamentos, 7, 50)]

    for (const order of permutations(hits)) {
      expect(pickMostSpecific(order, areaOf)?.layer.id).toBe('areas_monitoramento')
    }
  })

  it('measures only the candidates of the finest level, and only when several share it', () => {
    const bioma = vector('bioma', 0)
    const municipios = vector('municipios', 20)
    const tis = vector('terras_indigenas', 30)
    const pi = vector('uc_protecao_integral', 30)
    const measured: string[] = []
    const spy = (c: VectorPickCandidate<Hit>) => {
      measured.push(c.hit.id)
      return c.hit.area
    }

    pickMostSpecific([candidate(bioma, 0, 9e5), candidate(municipios, 2, 900)], spy)
    expect(measured).toEqual([])

    pickMostSpecific([candidate(bioma, 0, 9e5), candidate(tis, 3, 400), candidate(pi, 6, 100)], spy)
    expect(measured.sort()).toEqual(['terras_indigenas', 'uc_protecao_integral'])
  })

  it('never lets area overrule granularity', () => {
    // A small municipality inside a large APA is coarser, not finer.
    const municipios = vector('municipios', 20)
    const apa = vector('uc_uso_sustentavel', 30)

    expect(pickMostSpecific([candidate(municipios, 2, 100), candidate(apa, 7, 300_000)], areaOf)?.layer.id).toBe('uc_uso_sustentavel')
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
