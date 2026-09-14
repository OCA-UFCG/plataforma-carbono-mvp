import { describe, expect, it } from 'vitest'
import { getFeicao, listFeicoes, listRecortes } from '@/lib/mapa/recorteRegistry'

describe('listRecortes', () => {
  it('lists the vector layers that can be a report unit, with the field that names a feature', () => {
    // No layer declares `labelField`; all six carry `hoverLabelField`.
    expect(listRecortes()).toEqual(expect.arrayContaining([
      { layerId: 'municipios', layerName: 'Municípios', labelField: 'name_muni' },
      { layerId: 'estados', layerName: 'Estados', labelField: 'name_state' },
      { layerId: 'bioma', layerName: 'Bioma Caatinga', labelField: 'Bioma' },
    ]))
  })

  it('offers no dead option: every listed recorte resolves to at least one feature', () => {
    for (const recorte of listRecortes()) {
      expect(listFeicoes(recorte.layerId).length).toBeGreaterThan(0)
    }
  })
})

describe('listFeicoes', () => {
  it('slugifies the label into the id', () => {
    // The states layer is labelled by the written-out name, so that a search
    // for "Pernambuco" finds it; the abbreviation is its context.
    expect(listFeicoes('estados')).toEqual(expect.arrayContaining([
      { id: 'paraiba', name: 'Paraíba', context: 'PB' },
      { id: 'minas-gerais', name: 'Minas Gerais', context: 'MG' },
    ]))
  })

  it('suffixes homonyms in file order, the first occurrence keeping the bare slug', () => {
    const saoDomingos = listFeicoes('municipios').filter((f) => f.name === 'São Domingos')

    // Three municipalities share this name, at file indices 19, 211 and 791.
    expect(saoDomingos.map((f) => f.id)).toEqual([
      'sao-domingos', 'sao-domingos-2', 'sao-domingos-3',
    ])
  })

  it('carries the state that tells homonyms apart', () => {
    const saoDomingos = listFeicoes('municipios').filter((f) => f.name === 'São Domingos')

    expect(saoDomingos.map((f) => f.context)).toEqual(['SE', 'BA', 'PB'])
  })

  it('leaves the context out for a recorte that declares no contextField', () => {
    // The biome is the one recorte with nothing to disambiguate against.
    expect(listFeicoes('bioma').every((f) => f.context === undefined)).toBe(true)
  })

  it('never repeats an id within a recorte', () => {
    for (const recorte of listRecortes()) {
      const ids = listFeicoes(recorte.layerId).map((f) => f.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('names a single-feature recorte after its layer', () => {
    // The simplified biome file has empty properties, so the label cannot come
    // from the feature; the layer name does, and gives a readable id.
    expect(listFeicoes('bioma')).toEqual([
      { id: 'bioma-caatinga', name: 'Bioma Caatinga' },
    ])
  })

  it('returns an empty list for an unknown recorte', () => {
    expect(listFeicoes('nao-existe')).toEqual([])
  })
})

describe('getFeicao', () => {
  it('resolves a feature to a geometry, a bbox and a geodesic area in hectares', () => {
    const feicao = getFeicao('municipios', 'campina-grande')

    expect(feicao).not.toBeNull()
    expect(feicao!.name).toBe('Campina Grande')
    expect(feicao!.geometry.type).toMatch(/^(Polygon|MultiPolygon)$/)
    expect(feicao!.bbox).toHaveLength(4)
    expect(feicao!.boundary).toBe('full')
    expect(feicao!.context).toBe('PB')
    // Campina Grande covers roughly 59.000 ha. The bound is loose on purpose:
    // it only has to catch a unit slip (m² left as m²) or a broken geometry.
    expect(feicao!.areaHa).toBeGreaterThan(20_000)
    expect(feicao!.areaHa).toBeLessThan(200_000)
  })

  it('reports the simplified boundary when it came from a _clip file', () => {
    const bioma = getFeicao('bioma', 'bioma-caatinga')

    expect(bioma).not.toBeNull()
    expect(bioma!.boundary).toBe('simplified')
    // The Caatinga covers about 84,4 million ha.
    expect(bioma!.areaHa).toBeGreaterThan(60_000_000)
    expect(bioma!.areaHa).toBeLessThan(110_000_000)
  })

  it('keeps a homonym suffix pointing at a distinct geometry', () => {
    const first = getFeicao('municipios', 'sao-domingos')
    const second = getFeicao('municipios', 'sao-domingos-2')

    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    expect(first!.bbox).not.toEqual(second!.bbox)
  })

  it('returns null for an unknown recorte or feature', () => {
    expect(getFeicao('nao-existe', 'campina-grande')).toBeNull()
    expect(getFeicao('municipios', 'nao-existe')).toBeNull()
  })
})
