import { describe, expect, it } from 'vitest'
import { buildNarrative, type NarrativeInput } from '@/lib/mapa/reportNarrative'
import { getReportLayer } from '@/config/mapa/reportLayers'
import type { ReportRecorte } from '@/types/relatorio'
import type { RasterClass } from '@/types/mapa'

const recorte: ReportRecorte = {
  layerId: 'municipios', layerName: 'Municípios',
  featureId: 'campina-grande', featureName: 'Campina Grande',
  areaHa: 59_412, bbox: [-36, -7.4, -35.7, -7.1], boundary: 'full',
}

function input(over: Partial<NarrativeInput>): NarrativeInput {
  return {
    recorte,
    layerName: 'Carbono Orgânico do Solo (0-30 cm)',
    unit: 't C/ha',
    config: getReportLayer('solo_carbono')!,
    status: 'available',
    effectiveYear: '2023',
    snapshot: null,
    series: [],
    ...over,
  }
}

const lulcClasses: RasterClass[] = [
  { value: 3, label: 'Formação Florestal', color: '#1f8d49' },
  { value: 15, label: 'Pastagem', color: '#edde8e' },
]

describe('buildNarrative situation', () => {
  it('states mean and range for a continuous layer', () => {
    const { situation } = buildNarrative(input({
      snapshot: {
        kind: 'continuous',
        stats: { min: 11.2, max: 48.9, mean: 24.3, median: 22.5, std: 4.25, count: 1200 },
      },
    }))

    expect(situation).toBe(
      'Em Campina Grande, o Carbono Orgânico do Solo (0-30 cm) tem média de 24,3 t C/ha em 2023, variando de 11,2 a 48,9 t C/ha.',
    )
  })

  it('drops the sign and carries the direction in a word for a signed flux', () => {
    // The source follows the atmospheric convention: negative is removal. A
    // minus sign in a sentence reads as the opposite of what it deserves.
    const { situation } = buildNarrative(input({
      layerName: 'Fluxo Líquido de Carbono Florestal (GFW)',
      unit: 'Mg CO2e/ha',
      signedFlux: true,
      config: getReportLayer('gfw_netflux')!,
      effectiveYear: null,
      snapshot: {
        kind: 'continuous',
        stats: { min: -8.4, max: 3.1, mean: -1.23, count: 900 },
      },
    }))

    expect(situation).toBe(
      'Em Campina Grande, o Fluxo Líquido de Carbono Florestal (GFW) indica que a área sequestrou, em média, 1,23 Mg CO2e/ha.',
    )
    expect(situation).not.toContain('-1,23')
  })

  it('names the dominant class and its share for a categorical layer', () => {
    const { situation } = buildNarrative(input({
      layerName: 'Uso e Cobertura (MapBiomas 2024)',
      unit: undefined,
      classes: lulcClasses,
      config: getReportLayer('lulc_mapbiomas')!,
      effectiveYear: '2024',
      snapshot: { kind: 'categorical', areas: { '15': 600_000, '3': 400_000 } },
    }))

    expect(situation).toBe(
      'Em Campina Grande, a classe predominante de Uso e Cobertura (MapBiomas 2024) é Pastagem, com 60,0% da área analisada nesta classe de uso e cobertura, em 2024.',
    )
  })

  it('states the total, the density and both leading axes for a stock report', () => {
    const { situation } = buildNarrative(input({
      layerName: 'Estoque de Carbono (Quarto Inventário Nacional)',
      unit: 't C/ha',
      config: getReportLayer('estoque_carbono')!,
      effectiveYear: null,
      snapshot: {
        kind: 'stocks',
        report: {
          totalTc: 2_345_678, areaHa: 59_412, unit: 't C',
          pools: [
            { band: 'b1', label: 'Biomassa acima do solo', tc: 1_130_000 },
            { band: 'b2', label: 'Carbono do solo', tc: 1_215_678 },
          ],
          classes: [
            { codigo: 1, sigla: 'Ta', tc: 1_032_098, areaHa: 26_000, porPool: {} },
            { codigo: 2, sigla: 'Sa', tc: 500_000, areaHa: 15_000, porPool: {} },
          ],
        },
      },
    }))

    expect(situation).toBe(
      'Em Campina Grande, o estoque total de carbono é de 2.345.678 t C sobre 59.412 ha, uma densidade média de 39,5 t C/ha. O reservatório Carbono do solo responde por 51,8% do total, e a fitofisionomia Ta por 44,0%.',
    )
  })

  it('says nothing at all when the analysis is not available', () => {
    for (const status of ['unavailable', 'year_not_found'] as const) {
      expect(buildNarrative(input({ status, snapshot: null }))).toEqual({
        situation: null, trend: null, context: null,
      })
    }
  })
})

describe('buildNarrative trend', () => {
  const series = [
    { date: '2021-01-01', value: 22.0 },
    { date: '2022-01-01', value: 23.0 },
    { date: '2023-01-01', value: 24.3 },
  ]

  it('compares the effective year with the previous stop', () => {
    const { trend } = buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 24.3, count: 10 } },
      series,
    }))

    expect(trend).toBe(
      'Em relação a 2022, houve aumento de 1,3 t C/ha, ou 5,7%.',
    )
  })

  it('uses the configured decrease term when the value fell', () => {
    const { trend } = buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 21.0, count: 10 } },
      series: [...series.slice(0, 2), { date: '2023-01-01', value: 21.0 }],
    }))

    expect(trend).toBe('Em relação a 2022, houve redução de 2,0 t C/ha, ou 8,7%.')
  })

  it('calls a sub-half-percent move stable rather than inventing a trend', () => {
    const { trend } = buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 23.05, count: 10 } },
      series: [...series.slice(0, 2), { date: '2023-01-01', value: 23.05 }],
    }))

    expect(trend).toBe('Em relação a 2022, o valor permaneceu estável.')
  })

  it('is null with no previous stop, with a gap at the previous stop, or with no trend vocabulary', () => {
    // First year of the series: nothing behind it.
    expect(buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 22, count: 10 } },
      effectiveYear: '2021', series,
    })).trend).toBeNull()

    // Previous stop is nodata: a delta against null is not a trend.
    expect(buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 24.3, count: 10 } },
      series: [{ date: '2022-01-01', value: null }, { date: '2023-01-01', value: 24.3 }],
    })).trend).toBeNull()

    // lulc_mapbiomas declares no trend block, because its series is meaningless.
    expect(buildNarrative(input({
      config: getReportLayer('lulc_mapbiomas')!,
      classes: lulcClasses,
      snapshot: { kind: 'categorical', areas: { '15': 10 } },
      effectiveYear: '2024',
      series: [{ date: '2023-01-01', value: 9 }, { date: '2024-01-01', value: 10 }],
    })).trend).toBeNull()
  })
})

describe('buildNarrative context', () => {
  it('summarises the whole series with its extremes and their years', () => {
    const { context } = buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 24.3, count: 10 } },
      series: [
        { date: '2020-01-01', value: 19.2 },
        { date: '2021-01-01', value: 27.4 },
        { date: '2022-01-01', value: 23.0 },
        { date: '2023-01-01', value: 24.3 },
      ],
    }))

    expect(context).toBe(
      'Na série de 2020 a 2023, a média é 23,5 t C/ha, com máximo de 27,4 em 2021 e mínimo de 19,2 em 2020.',
    )
  })

  it('is null for a series too short to summarise', () => {
    expect(buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 24.3, count: 10 } },
      series: [{ date: '2023-01-01', value: 24.3 }],
    })).context).toBeNull()
  })

  it('ignores nodata years when computing the extremes', () => {
    const { context } = buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 24.3, count: 10 } },
      series: [
        { date: '2021-01-01', value: null },
        { date: '2022-01-01', value: 20.0 },
        { date: '2023-01-01', value: 24.0 },
      ],
    }))

    expect(context).toBe(
      'Na série de 2022 a 2023, a média é 22,0 t C/ha, com máximo de 24,0 em 2023 e mínimo de 20,0 em 2022.',
    )
  })
})
