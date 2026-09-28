import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { RESULT_PROFILES } from '@/config/mapa/resultProfiles'
import { analysisScale, binsFromGroups, countsFromGroups, physicalAsset } from '@/lib/mapa/layerResult'
import { getResultLayer, resolveTemporalDate } from '@/lib/mapa/resultsRegistry'
import { nominalSummary, ordinalSummary } from '@/lib/mapa/results/composition'
import { coverageNote, edge, hectares, hectaresShort, layerTitle, percent, percentShort, quantity, sourceNote } from '@/lib/mapa/results/format'
import { layerPeriod } from '@/lib/mapa/results/period'
import { recurrenceSummary } from '@/lib/mapa/results/recurrence'
import type { LayerConfig, RasterLayerConfig } from '@/types/mapa'

const layer = (id: string) =>
  (appConfig.layers as LayerConfig[]).find((l) => l.id === id) as RasterLayerConfig
const profile = (id: string) => RESULT_PROFILES[id]
const ha = (h: number) => h * 10_000

// Campina Grande (PB), measured against Earth Engine on 2026-09-23.
const CG_LULC = { '3': ha(633), '4': ha(15554), '15': ha(27738), '20': ha(56), '21': ha(7328), '24': ha(7714), '25': ha(21), '29': ha(1), '33': ha(253) }
const CG_DEGRADACAO = { '2': ha(21762), '3': ha(5357), '4': ha(330), '6': ha(23452) }

describe('number formatting', () => {
  it('steps a mass in tonnes up to kt and Mt, and leaves other units alone', () => {
    expect(quantity(2_727_845, 't C')).toEqual({ value: '2,7', unit: 'Mt C' })
    expect(quantity(1_500, 't CO2e')).toEqual({ value: '1,5', unit: 'kt CO2e' })
    expect(quantity(950, 't')).toEqual({ value: '950', unit: 't' })
    expect(quantity(904_500, 't C/ano')).toEqual({ value: '904,5', unit: 'kt C/ano' })
    expect(quantity(1669.12, 'g C/m²/ano')).toEqual({ value: '1.669', unit: 'g C/m²/ano' })
  })

  it('never writes a tiny area or share as zero', () => {
    expect(hectares(0.4)).toBe('menos de 1 ha')
    expect(hectares(59298.7)).toBe('59.299 ha')
    expect(percent(0.03)).toBe('menos de 0,1%')
    expect(percent(43.21)).toBe('43,2%')
    expect(edge(30)).toBe('30')
    expect(edge(0.5)).toBe('0,50')
  })

  it('shortens a state-sized area for a narrow column', () => {
    expect(hectaresShort(45_060)).toBe('45.060 ha')
    expect(hectaresShort(123_456)).toBe('123 mil ha')
    expect(hectaresShort(999_600)).toBe('1,0 mi ha')
    expect(hectaresShort(10_127_415)).toBe('10,1 mi ha')
    expect(hectaresShort(0.4)).toBe('< 1 ha')
    expect(percentShort(0.03)).toBe('< 0,1%')
    expect(percentShort(43.21)).toBe('43,2%')
  })

  it('names the source without the grid resolution', () => {
    expect(sourceNote('GEDI L4B, 1 km')).toBe('Fonte: GEDI L4B.')
    expect(sourceNote('OCA, índice v4, 2021, 500 m')).toBe('Fonte: OCA, índice v4.')
    expect(sourceNote('IBGE')).toBe('Fonte: IBGE.')
    expect(sourceNote(undefined)).toBeNull()
  })

  it('titles a layer without the parenthetical the result shows as source and year', () => {
    expect(layerTitle('Índice de Degradação da Terra (2021)')).toBe('Índice de Degradação da Terra')
    expect(layerTitle('Biomassa Aérea, vegetação lenhosa (ESA CCI)')).toBe('Biomassa Aérea, vegetação lenhosa')
    expect(layerTitle('Bioma Caatinga')).toBe('Bioma Caatinga')
  })

  it('notes coverage only when part of the polygon has no data', () => {
    expect(coverageNote(80, 100)).toBe('Dado em 80,0% da área analisada.')
    expect(coverageNote(99.8, 100)).toBeNull()
    expect(coverageNote(50, null)).toBeNull()
  })
})

describe('land cover composition', () => {
  const p = profile('lulc_mapbiomas')
  if (p.archetype !== 'composition' || !p.nominal) throw new Error('lulc profile')
  const classes = layer('lulc_mapbiomas').classes!

  it('reads native vegetation as a share of the area with data', () => {
    const s = nominalSummary(CG_LULC, classes, p.nominal!)
    expect(s.validHa).toBeCloseTo(59_298, 0)
    expect(s.nativeHa).toBeCloseTo(16_187, 0)
    expect(s.nativeShare).toBeCloseTo((16_187 / 59_298) * 100, 6)
    expect(s.dominant?.label).toBe('Pastagem')
    expect(s.groups.reduce((a, g) => a + g.share, 0)).toBeCloseTo(100, 6)
  })

  it('keeps a code no group lists in a remainder, so the groups still add up to 100%', () => {
    const s = nominalSummary({ ...CG_LULC, '99': ha(100) }, classes, p.nominal!)
    expect(s.groups.at(-1)).toMatchObject({ label: 'Não classificada', areaHa: 100 })
    expect(s.groups.reduce((a, g) => a + g.share, 0)).toBeCloseTo(100, 6)
  })
})

describe('land degradation levels', () => {
  const p = profile('degradacao_terra')
  if (p.archetype !== 'composition' || !p.ordinal) throw new Error('degradacao profile')
  const classes = layer('degradacao_terra').classes!

  it('reads the degraded and the Níveis 4 e 5 shares of the area with data', () => {
    const s = ordinalSummary(CG_DEGRADACAO, classes, p.ordinal!)
    expect(s.degradedShare).toBeCloseTo((27_449 / 50_901) * 100, 6)
    expect(s.severeShare).toBeCloseTo((21_762 / 50_901) * 100, 6)
    expect(s.dominantDegraded?.label).toBe('Nível 4')
    expect(s.levels.map((l) => l.value)).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('breaks a tie between degraded levels toward the more severe one', () => {
    const s = ordinalSummary({ '3': ha(100), '2': ha(100) }, classes, p.ordinal!)
    expect(s.dominantDegraded?.value).toBe(2)
  })
})

describe('fire recurrence', () => {
  it('unpacks count and burned-in-year from the grouped key', () => {
    const counts = countsFromGroups([{ k: 0, sum: 10 }, { k: 3, sum: 2 }, { k: 2, sum: 5 }, { k: 11, sum: 1 }])
    expect(counts).toEqual([
      { count: 0, areaHa: 10, burnedInYearHa: 0 },
      { count: 1, areaHa: 7, burnedInYearHa: 2 },
      { count: 5, areaHa: 1, burnedInYearHa: 1 },
    ])
  })

  it('reads the area burned at least once against the whole region', () => {
    const p = profile('fogo_frequencia')
    if (p.archetype !== 'recurrence') throw new Error('fogo profile')
    const r = {
      kind: 'recurrence' as const, year: 2023, regionHa: 100, scaleM: 30,
      byCount: [
        { count: 0, areaHa: 80, burnedInYearHa: 0 },
        { count: 1, areaHa: 12, burnedInYearHa: 2 },
        { count: 6, areaHa: 8, burnedInYearHa: 1 },
      ],
    }
    const s = recurrenceSummary(r, p)
    expect(s.everShare).toBeCloseTo(20, 9)
    expect(s.recurrentShare).toBeCloseTo(8, 9)
    expect(s.yearHa).toBe(3)
    expect(s.bands.map((b) => b.label)).toEqual(['1 ano', '2 a 4 anos', '5 a 10 anos', '11 anos ou mais'])
  })
})

describe('server-side pieces', () => {
  it('turns grouped sums into every band, empty ones included', () => {
    expect(binsFromGroups([0, 10, 20], [{ bin: 0, sum: 5 }, { bin: 2, sum: 1 }])).toEqual([
      { from: 0, to: 10, areaHa: 5 },
      { from: 10, to: 20, areaHa: 0 },
      { from: 20, to: null, areaHa: 1 },
    ])
  })

  it('doubles the scale until the region fits the pixel budget', () => {
    expect(analysisScale(30, 5.9e8)).toBe(30)        // a municipality
    expect(analysisScale(30, 3.5e11)).toBe(60)       // the Caatinga part of Bahia
    expect(analysisScale(928, 8.6e11)).toBe(928)     // the biome at the Embrapa scale
  })

  it('accepts only a year inside the series of a temporal layer', () => {
    expect(resolveTemporalDate(layer('lulc_mapbiomas'), '2024-01-01')).toBe('2024-01-01')
    expect(resolveTemporalDate(layer('lulc_mapbiomas'), '1950-01-01')).toBeNull()
    expect(resolveTemporalDate(layer('lulc_mapbiomas'), 'classification_2024')).toBeNull()
    // ESA CCI has gaps: 2011 is inside the range but not a stop of the series.
    expect(resolveTemporalDate(layer('biomassa_esa_lenhosa'), '2011-01-01')).toBeNull()
    expect(resolveTemporalDate(layer('biomassa_esa_lenhosa'), '2010-01-01')).toBe('2010-01-01')
    // A static layer ignores the date instead of failing.
    expect(resolveTemporalDate(layer('degradacao_terra'), '2024-01-01')).toBeUndefined()
  })

  it('makes the MODIS productivity physical without touching the other layers', () => {
    const gpp = getResultLayer('gpp_modis')!
    expect(physicalAsset(gpp.asset, gpp.profile)).toMatchObject({ reducer: 'sum', multiplier: 0.1 })
    const npp = getResultLayer('npp_modis')!
    expect(physicalAsset(npp.asset, npp.profile)).toMatchObject({ reducer: 'mean', multiplier: 0.1 })
    const lst = getResultLayer('lst_modis')!
    expect(physicalAsset(lst.asset, lst.profile)).toBe(lst.asset)
  })

  it('resolves every raster layer, and the pool layers to the stock report', () => {
    for (const id of Object.keys(RESULT_PROFILES)) expect(getResultLayer(id), id).not.toBeNull()
    expect(getResultLayer('estoque_c_agb')?.stocks?.assetId).toBe(layer('estoque_carbono').gee?.asset.id)
    expect(getResultLayer('bioma')).toBeNull()
  })
})

describe('period in the header', () => {
  it('names the selected year, the static year or the declared period', () => {
    expect(layerPeriod(layer('lulc_mapbiomas'), profile('lulc_mapbiomas'), '2019-01-01')).toBe('2019')
    expect(layerPeriod(layer('lulc_mapbiomas'), profile('lulc_mapbiomas'))).toBe('2024')
    expect(layerPeriod(layer('chirps_precip'), profile('chirps_precip'))).toBe('2023')
    expect(layerPeriod(layer('gfw_netflux'), profile('gfw_netflux'))).toBe('2001 a 2024')
    expect(layerPeriod(layer('estoque_carbono'), profile('estoque_carbono'))).toBeUndefined()
  })
})

