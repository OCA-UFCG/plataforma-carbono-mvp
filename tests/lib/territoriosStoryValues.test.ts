import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { LAND_USE_GROUPS, landUseGroupOf } from '@/config/territorios/landUseGroups'
import { LAND_USE_COLORS } from '@/config/territorios/palette'
import {
  chartMax,
  degradationChart,
  degradationLevel,
  degradationSharesPct,
  degradedShareOf,
  fluxChart,
  fluxMetrics,
  formatArea,
  formatPercent,
  formatTonnes,
  landUseChart,
  landUseGroupShares,
  rainChart,
  rainComparison,
  readingOf,
  severeShareOf,
  stockChart,
  tonnesParts,
} from '@/lib/territorios/storyValues'
import { fmtFor } from '../helpers/territoriosI18n'
import type { RasterLayerConfig } from '@/types/mapa'
import type { BiomeReference, DegradationThemeData, TerritoryPayload } from '@/types/territorios'

const NO_BIOME: BiomeReference = {
  stockTotalTc: 4_160_240_473, stockDensityTcHa: null, forestSharePct: null, fluxPerForestHaMg: null,
  nativeSharePct: null, degradedSharePct: 21.4, degradationSharesPct: null, rainMeanMm: null,
}

const territory: TerritoryPayload = {
  recorteId: 'municipios', recorteName: 'Municípios',
  featureId: 'campina-grande-pb', featureName: 'Campina Grande', context: 'PB',
  areaHa: 59_412, biomaAreaHa: 86_281_800,
  bbox: [-36.1, -7.4, -35.7, -7.1], boundary: 'full',
  geometry: { type: 'Polygon', coordinates: [] },
  biome: NO_BIOME,
}

/** The biome reference as precomputed.json gives it on 2026-09-16. */
const BIOME: BiomeReference = {
  stockTotalTc:      4_160_240_473.1142607,
  stockDensityTcHa:  55.098642014364884,
  forestSharePct:    26.777871129590096,
  fluxPerForestHaMg: -68.1317101317378,
  nativeSharePct:    { '1985': 70.68324143590091, '2024': 60.083306882513774 },
  degradedSharePct:  20.93553204222783,
  degradationSharesPct: {
    0: 1.9221535752808458, 1: 0.4299090590046468, 2: 11.02083142951937, 3: 7.908799886438091,
    4: 1.5424942847989411, 5: 0.03349738246678227, 6: 77.14231438249132,
  },
  rainMeanMm: 701.2012922878521,
}

const withBiome: TerritoryPayload = { ...territory, biome: BIOME }

function rasterLayer(id: string): RasterLayerConfig {
  return (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === id)!
}

describe('fluxMetrics', () => {
  it('keeps the magnitude positive and the direction apart', () => {
    const m = fluxMetrics({ theme: 'fluxo', totalMgCo2e: -461_632, forestAreaHa: 7_961, regionAreaHa: 59_412 })!
    expect(m.direction).toBe('removal')
    expect(m.magnitudeMg).toBe(461_632)
    expect(m.perForestHaMg).toBeGreaterThan(0)
  })

  it('reads a total that prints as zero as equilibrium', () => {
    expect(fluxMetrics({ theme: 'fluxo', totalMgCo2e: 0.4, forestAreaHa: 10, regionAreaHa: 20 })?.direction).toBe('neutral')
    expect(fluxMetrics({ theme: 'fluxo', totalMgCo2e: 0.5, forestAreaHa: 10, regionAreaHa: 20 })?.direction).toBe('emission')
  })

  it('divides the forest by the region the reduction weighed, capped at 100%', () => {
    expect(fluxMetrics({ theme: 'fluxo', totalMgCo2e: -120, forestAreaHa: 3, regionAreaHa: 6 })?.forestSharePct).toBe(50)
    expect(fluxMetrics({ theme: 'fluxo', totalMgCo2e: -120, forestAreaHa: 6.000001, regionAreaHa: 6 })?.forestSharePct).toBe(100)
  })

  it('has no forest share when the answer carries no region area', () => {
    // An answer cached before regionAreaHa existed would otherwise print "cobre 0,0%".
    expect(fluxMetrics({ theme: 'fluxo', totalMgCo2e: -120, forestAreaHa: 3, regionAreaHa: 0 })?.forestSharePct).toBeNull()
  })

  it('is null without mapped forest', () => {
    expect(fluxMetrics({ theme: 'fluxo', totalMgCo2e: 0, forestAreaHa: 0, regionAreaHa: 59_412 })).toBeNull()
  })
})

describe('land use groups', () => {
  it('puts each of the 30 lulc_mapbiomas codes in exactly one group', () => {
    const codes = rasterLayer('lulc_mapbiomas').classes!.map((c) => c.value)
    expect(codes).toHaveLength(30)
    for (const code of codes) {
      expect(LAND_USE_GROUPS.filter((g) => g.codes.includes(code))).toHaveLength(1)
    }
  })

  it('has the four groups the map and the chart share, with the palette colors', () => {
    expect(LAND_USE_GROUPS.map((g) => [g.id, g.color])).toEqual([
      ['nativa', LAND_USE_COLORS.nativa],
      ['agropecuaria', LAND_USE_COLORS.agropecuaria],
      ['urbana', LAND_USE_COLORS.urbana],
      ['outros', LAND_USE_COLORS.outros],
    ])
  })

  it('counts the nine native codes as native, keeps urban area apart, and sends the rest to "outros"', () => {
    expect(LAND_USE_GROUPS.filter((g) => g.native).flatMap((g) => g.codes).sort((a, b) => a - b))
      .toEqual([3, 4, 5, 6, 11, 12, 32, 49, 50])
    expect(landUseGroupOf(24).id).toBe('urbana')
    for (const code of [23, 25, 29, 30, 31, 33, 75, 0, 999]) expect(landUseGroupOf(code).id).toBe('outros')
  })

  it('keeps the groups in order, with "outros" only when it has area', () => {
    expect(landUseGroupShares({ '3': 600, '15': 400 }).map((g) => [g.id, g.sharePct])).toEqual([
      ['nativa', 60],
      ['agropecuaria', 40],
      ['urbana', 0],
    ])
    expect(landUseGroupShares({ '3': 500, '999': 500 }).at(-1)).toMatchObject({ id: 'outros', sharePct: 50 })
  })

})

describe('degradation', () => {
  it('turns code 1 into level 5 and code 5 into level 1', () => {
    expect(degradationLevel(1)).toBe(5)
    expect(degradationLevel(5)).toBe(1)
    expect(degradationLevel(6)).toBeNull()
  })

  it('counts codes 1 and 2 as the severe levels, and codes 1 to 5 as degraded', () => {
    const data: DegradationThemeData = {
      theme: 'degradacao', areas: { '1': 10, '2': 20, '3': 40, '6': 880 }, regionAreaM2: 1_000, pointCode: null,
    }
    const shares = degradationSharesPct(data)!
    expect(severeShareOf(shares)).toBeCloseTo(3)
    expect(degradedShareOf(shares)).toBeCloseTo(7)
    expect(shares[6]).toBeCloseTo(88)
    expect(shares[0]).toBeCloseTo(5)
  })

})

describe('rain', () => {
  it('calls a year within 10% of the mean near it, and 10% away above or below', () => {
    expect(rainComparison(110, 100)).toEqual({ direction: 'above', pct: 10 })
    expect(rainComparison(109.9, 100).direction).toBe('near')
    expect(rainComparison(90, 100)).toEqual({ direction: 'below', pct: 10 })
    expect(rainComparison(90.1, 100).direction).toBe('near')
  })

})

describe('formatting for the visitor', () => {
  const pt = fmtFor('pt')
  const en = fmtFor('en')

  it('writes hectares below 10 km² and square kilometres from there on', () => {
    expect(formatArea(0, pt)).toBe('0 ha')
    expect(formatArea(0.99, pt)).toBe('menos de 1 ha')
    // One decimal below 10, as every other figure of the story.
    expect(formatArea(1, pt)).toBe('1,0 ha')
    expect(formatArea(3.36, pt)).toBe('3,4 ha')
    expect(formatArea(9.96, pt)).toBe('10 ha')
    expect(formatArea(999.4, pt)).toBe('999 ha')
    // Rounds to 1.000 ha, which is 10 km².
    expect(formatArea(999.6, pt)).toBe('10 km²')
    expect(formatArea(5_205.1, pt)).toBe('52 km²')
    expect(formatArea(59_552.7, pt)).toBe('596 km²')
    expect(formatArea(86_617_415.5, pt)).toBe('866.174 km²')
  })

  it('writes tonnes in "mil", "milhões" and "bilhões", with at most three significant digits', () => {
    expect(formatTonnes(0, pt)).toBe('0 t')
    expect(formatTonnes(0.4, pt)).toBe('menos de 1 t')
    expect(formatTonnes(999, pt)).toBe('999 t')
    expect(formatTonnes(999.6, pt)).toBe('1 mil t')
    expect(formatTonnes(1_234, pt)).toBe('1,2 mil t')
    expect(formatTonnes(-461_632, pt)).toBe('462 mil t')
    expect(formatTonnes(999_700, pt)).toBe('1 milhão de t')
    expect(formatTonnes(1_500_000, pt)).toBe('1,5 milhão de t')
    expect(formatTonnes(1_960_000, pt)).toBe('2 milhões de t')
    expect(formatTonnes(2_727_845, pt)).toBe('2,7 milhões de t')
    expect(formatTonnes(4_160_240_473, pt)).toBe('4,2 bilhões de t')
    expect(tonnesParts(211_419, pt)).toEqual({ value: '211', unit: 'mil t' })
  })

  it('writes percents whole from 10 up and with one decimal below', () => {
    expect(formatPercent(0, pt)).toBe('0%')
    expect(formatPercent(0.04, pt)).toBe('menos de 0,1%')
    expect(formatPercent(0.1, pt)).toBe('0,1%')
    expect(formatPercent(2.53, pt)).toBe('2,5%')
    expect(formatPercent(9.96, pt)).toBe('10%')
    expect(formatPercent(46.29, pt)).toBe('46%')
  })
  it('writes the same figures in English notation', () => {
    expect(formatArea(0.99, en)).toBe('less than 1 ha')
    expect(formatArea(3.36, en)).toBe('3.4 ha')
    expect(formatArea(86_617_415.5, en)).toBe('866,174 km²')
    expect(formatTonnes(0.4, en)).toBe('less than 1 t')
    expect(formatTonnes(1_234, en)).toBe('1.2 thousand t')
    expect(formatTonnes(2_727_845, en)).toBe('2.7 million t')
    expect(formatTonnes(4_160_240_473, en)).toBe('4.2 billion t')
    expect(formatPercent(0.04, en)).toBe('less than 0.1%')
    expect(formatPercent(2.53, en)).toBe('2.5%')
    expect(formatPercent(46.29, en)).toBe('46%')
  })
})

describe('comparison with the Caatinga', () => {
  it('reads a difference under 10% of the Caatinga value as "perto"', () => {
    expect(readingOf(110, 100)).toBe('acima')
    expect(readingOf(109.9, 100)).toBe('perto')
    expect(readingOf(90, 100)).toBe('abaixo')
    expect(readingOf(90.1, 100)).toBe('perto')
    expect(readingOf(46, 55.1)).toBe('abaixo')
    expect(readingOf(5, null)).toBeNull()
  })

  it('divides the stock by the area with stock, as the biome reference does', () => {
    const chart = stockChart({ totalTc: 2_727_845.34, areaHa: 59_297.57, unit: 't C', pools: [], classes: [] }, withBiome)!
    expect(chart.density.here).toBeCloseTo(46.0, 1)
    expect(chart.density.reference).toBe(BIOME.stockDensityTcHa)
    expect(stockChart({ totalTc: 0, areaHa: 0, unit: 't C', pools: [], classes: [] }, withBiome)).toBeNull()
  })

  it('compares the flux per hectare of forest only when the territory and the biome go the same way', () => {
    const removal = fluxChart({ theme: 'fluxo', totalMgCo2e: -461_632.34, forestAreaHa: 7_967.42, regionAreaHa: 59_298.67 }, withBiome)!
    expect(removal.forestShare.here).toBeCloseTo(13.44, 2)
    expect(removal.forestShare.reference).toBe(BIOME.forestSharePct)
    expect(removal.perForestHa?.here).toBeCloseTo(57.94, 2)
    expect(removal.perForestHa?.reference).toBeCloseTo(68.13, 2)

    const emission = fluxChart({ theme: 'fluxo', totalMgCo2e: 1_200, forestAreaHa: 100, regionAreaHa: 2_000 }, withBiome)!
    expect(emission.perForestHa).toBeNull()
    expect(emission.forestShare.here).toBe(5)

    const balance = fluxChart({ theme: 'fluxo', totalMgCo2e: 0.4, forestAreaHa: 100, regionAreaHa: 2_000 }, withBiome)!
    expect(balance.perForestHa).toBeNull()

    const evenBiome = { ...withBiome, biome: { ...BIOME, fluxPerForestHaMg: 0 } }
    expect(fluxChart({ theme: 'fluxo', totalMgCo2e: -120, forestAreaHa: 3, regionAreaHa: 6 }, evenBiome)?.perForestHa).toBeNull()
    expect(fluxChart({ theme: 'fluxo', totalMgCo2e: 0, forestAreaHa: 0, regionAreaHa: 6 }, withBiome)).toBeNull()
  })

  it('counts every native code in the land use chart, the campestre ones too', () => {
    const chart = landUseChart({
      theme: 'uso',
      areas: { '1985': { '4': 500, '12': 200, '15': 300 }, '2024': { '4': 500, '12': 100, '24': 100, '15': 300 } },
    }, withBiome)!
    expect(chart.here).toEqual({ from: 70, to: 60 })
    expect(chart.reference).toEqual({ from: BIOME.nativeSharePct!['1985'], to: BIOME.nativeSharePct!['2024'] })
    expect(landUseChart({ theme: 'uso', areas: { '1985': {}, '2024': { '4': 1 } } }, withBiome)).toBeNull()
  })

  it('takes code 0 as the region minus the classes, and draws it only above 0,05%', () => {
    const campinaGrande: DegradationThemeData = {
      theme: 'degradacao',
      areas: { '2': 217_621_921.5, '3': 53_567_726.1, '4': 3_298_705.0, '6': 234_524_137.3 },
      regionAreaM2: 592_948_094.8,
      pointCode: null,
    }
    const shares = degradationSharesPct(campinaGrande)!
    expect(shares[0]).toBeCloseTo(14.16, 2)
    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBeCloseTo(100)

    const chart = degradationChart(campinaGrande, withBiome)!
    expect(chart.here.map((s) => s.code)).toEqual([6, 5, 4, 3, 2, 1, 0])
    expect(chart.here.find((s) => s.code === 2)?.pct).toBeCloseTo(36.7, 1)
    expect(chart.reference?.at(-1)).toEqual({ code: 0, pct: BIOME.degradationSharesPct![0] })

    // The classes add up to 509,01 km²: 0,04% and 0,06% of these regions are masked.
    const below = degradationChart({ ...campinaGrande, regionAreaM2: 509_200_000 }, withBiome)!
    expect(below.here.map((s) => s.code)).toEqual([6, 5, 4, 3, 2, 1])
    const above = degradationChart({ ...campinaGrande, regionAreaM2: 509_320_000 }, withBiome)!
    expect(above.here.at(-1)?.code).toBe(0)

    expect(degradationChart({ theme: 'degradacao', areas: null, regionAreaM2: null, pointCode: 2 }, withBiome)).toBeNull()
  })

  it('lists every year from 1985 to 2024, classes each against the own mean and leaves a missing year unclassed', () => {
    const series = [
      { date: '1984-01-01', value: 5_000 },
      { date: '1985-01-01', value: 1_000 },
      { date: '1986-01-01', value: null },
      { date: '2000-01-01', value: 890 },
      { date: '2024-01-01', value: 1_110 },
    ]
    const chart = rainChart(series, withBiome)!
    expect(chart.years).toHaveLength(40)
    expect(chart.meanMm).toBe(1_000)
    expect(chart.highlightYear).toBe(2024)
    expect(chart.mean).toEqual({ here: 1_000, reference: BIOME.rainMeanMm })

    const year = (y: number) => chart.years.find((v) => v.year === y)
    expect(year(1985)).toEqual({ year: 1985, valueMm: 1_000, kind: 'normal' })
    expect(year(1986)).toEqual({ year: 1986, valueMm: null, kind: null })
    expect(year(2000)?.kind).toBe('seco')
    expect(year(2024)?.kind).toBe('chuvoso')
    expect(year(1990)?.valueMm).toBeNull()

    expect(rainChart([{ date: '2024-01-01', value: null }], withBiome)).toBeNull()
  })
})

describe('chartMax', () => {
  it('ends the scale on a round number at least 10% past the larger value', () => {
    expect(chartMax(46, 55)).toBe(80)
    expect(chartMax(575, 701)).toBe(800)
    expect(chartMax(58, null)).toBe(80)
    expect(chartMax(9, 9.5)).toBe(15)
  })

  it('gives 1 when there is nothing to draw', () => {
    expect(chartMax(0, null)).toBe(1)
    expect(chartMax(Number.NaN)).toBe(1)
  })
})
