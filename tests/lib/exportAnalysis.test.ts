import { describe, expect, it } from 'vitest'
import {
  buildAnalysisCsv,
  type AnalysisSnapshot,
  type LayerSnapshot,
} from '@/lib/mapa/exportAnalysis'
import { RESULT_PROFILES } from '@/config/mapa/resultProfiles'

const layer = (over: Partial<LayerSnapshot> = {}): LayerSnapshot => ({
  layerName: 'Carbono Orgânico do Solo (0-30 cm)',
  pixelValue: null,
  stats: null,
  ...over,
})

const base: AnalysisSnapshot = {
  analysisKind: 'Município',
  analysisLabel: 'Petrolina',
  drawnArea: null,
  drawnLength: null,
  generatedAt: new Date('2026-08-24T15:00:00Z'),
  layers: [layer()],
}

describe('buildAnalysisCsv', () => {
  it('writes continuous statistics as a labelled table in pt-BR numbers', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerUnit: 't C/ha',
        stats: {
          kind: 'continuous',
          stats: { min: 1.5, max: 80, mean: 23.456789, median: 20, std: 4.25, count: 1200 },
        },
      })],
    })

    expect(csv).toContain('estatistica;valor;unidade')
    expect(csv).toContain('Média;23,4568;t C/ha')
    expect(csv).toContain('Mínimo;1,5;t C/ha')
    expect(csv).toContain('Contagem de pixels;1200;')
  })

  it('writes categorical areas in hectares with class labels and share', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerName: 'Uso e Cobertura (MapBiomas 2024)',
        layerClasses: [
          { value: 3, label: 'Formação Florestal', color: '#1f8d49' },
          { value: 15, label: 'Pastagem', color: '#edde8e' },
        ],
        stats: { kind: 'categorical', areas: { '3': 750_000, '15': 250_000 } },
      })],
    })

    expect(csv).toContain('classe;area_ha;percentual')
    expect(csv).toContain('Formação Florestal;75;75')
    expect(csv).toContain('Pastagem;25;25')
  })

  it('buckets class codes missing from the layer config so the shares still sum to 100', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerClasses: [{ value: 3, label: 'Formação Florestal', color: '#1f8d49' }],
        stats: { kind: 'categorical', areas: { '3': 500_000, '99': 500_000 } },
      })],
    })

    expect(csv).toContain('Não classificadas;50;50')
  })

  it('writes a time series as one row per year, keeping nodata blank', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerUnit: 'mm/ano',
        stats: {
          kind: 'timeseries',
          series: [
            { date: '2021-01-01', value: 688.4 },
            { date: '2022-01-01', value: null },
            { date: '2023-01-01', value: 712 },
          ],
        },
      })],
    })

    expect(csv).toContain('ano;valor;unidade')
    expect(csv).toContain('2021;688,4;mm/ano')
    expect(csv).toContain('2022;;mm/ano')
  })

  it('writes the stock report as a pool table followed by a phytophysiognomy table', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerName: 'Estoque de Carbono (Quarto Inventário Nacional)',
        stats: {
          kind: 'stocks',
          report: {
            totalTc: 2752237.6,
            areaHa: 12480,
            unit: 't C',
            pools: [
              { band: 'b1', label: 'Biomassa aérea', tc: 1840233.5 },
              { band: 'b2', label: 'Biomassa subterrânea', tc: 912004.1 },
            ],
            classes: [
              { codigo: 1, sigla: 'Ta', tc: 1204880.2, areaHa: 5490, porPool: {} },
            ],
          },
        },
      })],
    })

    expect(csv).toContain('reservatorio;estoque;unidade')
    expect(csv).toContain('Biomassa aérea;1840233,5;t C')
    expect(csv).toContain('fitofisionomia;estoque;area_ha;unidade')
    expect(csv).toContain('Ta;1204880,2;5490;t C')
    expect(csv).toContain('Total;2752237,6;12480;t C')
  })

  it('heads the file with provenance metadata as comment lines', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        year: '2023',
        stats: { kind: 'continuous', stats: { min: 0, max: 1, mean: 0.5, count: 10 } },
      })],
    })

    expect(csv).toContain('# Camada: Carbono Orgânico do Solo (0-30 cm)')
    expect(csv).toContain('# Recorte: Município - Petrolina')
    expect(csv).toContain('# Ano: 2023')
    expect(csv).toContain('# Gerado em: 2026-08-24')
    expect(csv).not.toContain('Earth Engine')
  })

  it('omits metadata lines that have no value instead of writing empty ones', () => {
    const { csv } = buildAnalysisCsv({ ...base, analysisLabel: null, analysisKind: null })

    expect(csv).not.toContain('# Recorte:')
    expect(csv).not.toContain('# Ano:')
  })

  it('writes drawn measurements and the sampled pixel value as their own block', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      drawnArea: 12.48,
      drawnLength: 3.2,
      layers: [layer({
        layerUnit: 't C/ha',
        // The class is named from the layer's own (localized) classes.
        layerClasses: [{ value: 3, label: 'Formação Florestal', color: '#1f8d49' }],
        pixelValue: { value: 38.25, classValue: 3 },
      })],
    })

    expect(csv).toContain('medida;valor;unidade')
    expect(csv).toContain('Área analisada;12,48;km²')
    expect(csv).toContain('Área analisada;1248;ha')
    expect(csv).toContain('Comprimento;3,2;km')
    expect(csv).toContain('Valor no ponto;38,25;t C/ha')
    expect(csv).toContain('Classe no ponto;Formação Florestal;')
  })

  it('quotes values carrying the delimiter so the columns do not shift', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerClasses: [{ value: 3, label: 'Pastagem; plantada', color: '#000000' }],
        stats: { kind: 'categorical', areas: { '3': 10_000 } },
      })],
    })

    expect(csv).toContain('"Pastagem; plantada";1;100')
  })

  it('starts with a UTF-8 BOM and separates rows with CRLF so Excel opens it clean', () => {
    const { csv } = buildAnalysisCsv({ ...base })

    expect(csv.startsWith('\ufeff')).toBe(true)
    expect(csv).toContain('\r\n')
    expect(csv).not.toMatch(/[^\r]\n/)
  })

  it('names the file after the layer, the cut and the date', () => {
    const { filename } = buildAnalysisCsv({ ...base })

    expect(filename).toBe(
      'caativar_carbono-organico-do-solo-0-30-cm_petrolina_2026-08-24.csv',
    )
  })

  it('falls back to the cut kind when the feature has no name', () => {
    const { filename } = buildAnalysisCsv({
      ...base,
      layers: [layer({ layerName: 'Estoque de Carbono' })],
      analysisKind: 'Área desenhada',
      analysisLabel: null,
    })

    expect(filename).toBe('caativar_estoque-de-carbono_area-desenhada_2026-08-24.csv')
  })

  it('states the sign convention in the metadata when the layer is a signed flux', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerName: 'Fluxo Líquido de Carbono Florestal (GFW)',
        signedFlux: true,
      })],
    })

    expect(csv).toContain('# Convenção: valor negativo = sequestro, positivo = emissão')
  })

  it('omits the sign convention for a layer whose values carry no sign', () => {
    const { csv } = buildAnalysisCsv({ ...base })

    expect(csv).not.toContain('# Convenção')
  })

  // The panel hides the minus sign on purpose; the file must not. A spreadsheet
  // has to be able to sum sinks against sources, and the color does not travel
  // into Excel.
  it('keeps the sign on the exported numbers so a spreadsheet can still sum them', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerName: 'Fluxo Líquido de Carbono Florestal (GFW)',
        layerUnit: 'Mg CO2e/ha',
        signedFlux: true,
        pixelValue: { value: -45.2 },
        stats: {
          kind: 'continuous',
          stats: { min: -95.5, max: 240, mean: -12.25, count: 900 },
        },
      })],
    })

    expect(csv).toContain('Valor no ponto;-45,2;Mg CO2e/ha')
    expect(csv).toContain('Mínimo;-95,5;Mg CO2e/ha')
    expect(csv).toContain('Média;-12,25;Mg CO2e/ha')
  })

  it('writes one block per layer, each naming its own layer and year', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      drawnArea: 621.4,
      layers: [
        layer({
          layerName: 'Estoque de Carbono', layerUnit: 't C/ha', year: '2023',
          stats: { kind: 'continuous', stats: { min: 2, max: 91, mean: 38.2, count: 900 } },
        }),
        layer({
          layerName: 'Biomassa GEDI', layerUnit: 'Mg/ha',
          stats: { kind: 'continuous', stats: { min: 1, max: 60, mean: 14.7, count: 900 } },
        }),
      ],
    })

    expect(csv).toContain('# Camada: Estoque de Carbono')
    expect(csv).toContain('# Ano: 2023')
    expect(csv).toContain('# Camada: Biomassa GEDI')
    expect(csv).toContain('Média;38,2;t C/ha')
    expect(csv).toContain('Média;14,7;Mg/ha')
    // The recorte is identified once, above the per-layer blocks.
    expect(csv.match(/# Recorte: /g)).toHaveLength(1)
    expect(csv.match(/Área analisada;621,4;km²/g)).toHaveLength(1)
  })

  // A drawn LineString measures no raster, and neither does a polygon with
  // every raster turned off. Both are analyses the panel shows and the user can
  // export, so the file carries the measurement rows and is named after the
  // analysis -- "0-camadas" would be a filename describing nothing.
  it('exports a measurement that touched no layer, named after the analysis', () => {
    const { filename, csv } = buildAnalysisCsv({
      ...base,
      analysisKind: 'Área desenhada',
      analysisLabel: null,
      drawnArea: null,
      drawnLength: 42.5,
      layers: [],
    })

    expect(csv).toContain('medida;valor;unidade')
    expect(csv).toContain('Comprimento;42,5;km')
    expect(filename).toBe('caativar_analise_area-desenhada_2026-08-24.csv')
  })

  it('names a multi-layer file after the layer count', () => {
    const { filename } = buildAnalysisCsv({
      ...base,
      layers: [layer({ layerName: 'Estoque de Carbono' }), layer({ layerName: 'Biomassa GEDI' })],
    })

    expect(filename).toBe('caativar_2-camadas_petrolina_2026-08-24.csv')
  })
  // A sum of per-hectare values is not a total of anything.
  it('leaves the pixel sum out of the continuous table', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerUnit: 't C/ha',
        stats: { kind: 'continuous', stats: { min: 1, max: 3, mean: 2, sum: 4800, count: 2400 } },
      })],
    })

    expect(csv).not.toContain('Soma')
  })

  it('names each layer\'s data source without its grid resolution', () => {
    const { csv } = buildAnalysisCsv({ ...base, layers: [layer({ source: 'GEDI L4B, 1 km' })] })

    expect(csv).toContain('# Fonte: GEDI L4B')
    expect(csv).not.toContain('1 km')
  })

  it('writes a density total with its carbon share and the density bands', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerName: 'Biomassa Aérea (GEDI L4B)',
        layerUnit: 'Mg/ha',
        profile: RESULT_PROFILES.biomassa_gedi,
        stats: {
          kind: 'amount', total: 10_000, validHa: 500, zeroHa: 20, scaleM: 1000,
          bins: [{ from: 0, to: 10, areaHa: 120 }, { from: 90, to: null, areaHa: 5 }],
        },
      })],
    })

    expect(csv).toContain('Biomassa aérea;10000;t')
    expect(csv).toContain('Carbono;4700;t C')
    expect(csv).toContain('Média por hectare;20;t/ha')
    expect(csv).toContain('0;10;t/ha;120')
    expect(csv).toContain('90;;t/ha;5')
    expect(csv).not.toContain('Escala')
  })

  it('splits a net flux into its signed parts, in the gas unit of the layer', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerUnit: 'Mg CO2e/ha',
        signedFlux: true,
        profile: RESULT_PROFILES.gfw_netflux,
        stats: {
          kind: 'flux', positive: 214_950, negative: -676_582,
          positiveHa: 940.95, negativeHa: 7026.47, validHa: 7967.42, scaleM: 30,
        },
      })],
    })

    expect(csv).toContain('Total;-461632;t CO2e')
    expect(csv).toContain('Soma dos valores negativos;-676582;t CO2e')
    expect(csv).toContain('Área com valor negativo;7026,47;ha')
  })

  it('writes fire recurrence as area per number of years with fire', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        stats: {
          kind: 'recurrence', year: 2023, regionHa: 100, scaleM: 30,
          byCount: [
            { count: 0, areaHa: 80, burnedInYearHa: 0 },
            { count: 1, areaHa: 12, burnedInYearHa: 2 },
            { count: 6, areaHa: 8, burnedInYearHa: 1 },
          ],
        },
      })],
    })

    expect(csv).toContain('anos_com_fogo;area_ha;queimou_em_2023_ha')
    expect(csv).toContain('1;12;2')
    expect(csv).toContain('Total;100;3')
  })

  it('writes a yearly point series of a MODIS productivity layer in the unit the panel shows', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerUnit: 'kg*C/m²/8day',
        profile: RESULT_PROFILES.gpp_modis,
        stats: { kind: 'timeseries', series: [{ date: '2023-01-01', value: 1669.1 }] },
      })],
    })

    expect(csv).toContain('2023;1669,1;g C/m²/ano')
  })
})
