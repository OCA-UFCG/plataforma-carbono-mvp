import { describe, expect, it } from 'vitest'
import { MAX_RESULTS, searchTerritories, type SearchSource } from '@/lib/mapa/territorySearch'

const square = (x: number): GeoJSON.Polygon => ({
  type: 'Polygon',
  coordinates: [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 1], [x, 0]]],
})
const feature = (properties: Record<string, unknown>, x = 0): GeoJSON.Feature => ({
  type: 'Feature', properties, geometry: square(x),
})
const source = (layerId: string, unitName: string, features: GeoJSON.Feature[], contextField?: string): SearchSource => ({
  layerId, unitName, features, contextField, contextIdentifies: false,
})

const municipios = source('municipios', 'Município', [
  feature({ name_muni: 'Campina Grande', abbrev_state: 'PB', code_muni: '2504009' }, 0),
  feature({ name_muni: 'Grande Recife', abbrev_state: 'PE', code_muni: '2600000' }, 1),
  feature({ name_muni: 'Areia', abbrev_state: 'PB', code_muni: '2501104' }, 2),
], 'abbrev_state')

describe('searchTerritories', () => {
  it('waits for two letters', () => {
    expect(searchTerritories('c', [municipios])).toEqual([])
    expect(searchTerritories('  ', [municipios])).toEqual([])
  })

  it('finds a feature by any text property, with its bounding box', () => {
    const [first] = searchTerritories('campina', [municipios])
    expect(first).toMatchObject({
      layerId: 'municipios', unitName: 'Município', value: 'Campina Grande', context: 'PB', featureIndex: 0,
    })
    expect(first.bbox).toEqual([0, 0, 1, 1])
  })

  it('puts a match at the start of the name first, then the alphabet', () => {
    const values = searchTerritories('grande', [municipios]).map((r) => r.value)
    expect(values).toEqual(['Grande Recife', 'Campina Grande'])
  })

  it('never answers with the context field nor a register code', () => {
    expect(searchTerritories('PB', [municipios]).map((r) => r.fieldName)).not.toContain('abbrev_state')
    expect(searchTerritories('2504', [municipios])).toEqual([])
  })

  it('matches only the declared searchFields when a layer has them', () => {
    const sites: SearchSource = {
      ...source('areas_monitoramento', 'Área de monitoramento', [
        feature({ nome: 'Caatinga Campina Grande (CCG)', fontes: 'Borges et al. (2019); Moro et al. (2016)', solo: 'Neossolo Litólico' }),
      ]),
      searchFields: ['nome'],
    }
    expect(searchTerritories('moro', [sites])).toEqual([])
    expect(searchTerritories('neossolo', [sites])).toEqual([])
    expect(searchTerritories('campina', [sites]).map((r) => r.value)).toEqual(['Caatinga Campina Grande (CCG)'])
  })

  it('deals the rows across layers, so a layer late in the catalog gets its share', () => {
    const many = source('assentamentos', 'Assentamento', Array.from({ length: 40 }, (_, i) =>
      feature({ nome: `Serra ${String(i).padStart(2, '0')}` }, i)))
    const late = source('ucs', 'Unidade de Conservação', [feature({ nome: 'Serra da Capivara' }, 50)])
    const results = searchTerritories('serra', [many, late])
    expect(results).toHaveLength(MAX_RESULTS)
    expect(results.some((r) => r.layerId === 'ucs')).toBe(true)
  })

  it('skips a feature without a geometry', () => {
    const broken = source('x', 'X', [{ type: 'Feature', properties: { nome: 'Serra Talhada' }, geometry: null as unknown as GeoJSON.Geometry }])
    expect(searchTerritories('serra', [broken])).toEqual([])
  })
})
