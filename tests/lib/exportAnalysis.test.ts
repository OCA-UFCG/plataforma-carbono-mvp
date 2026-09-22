import { describe, expect, it } from 'vitest'
import {
  buildAnalysisCsv,
  type AnalysisSnapshot,
  type LayerSnapshot,
} from '@/lib/mapa/exportAnalysis'

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
    expect(csv).toContain('# Fonte: Estatística zonal, Google Earth Engine')
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
        pixelValue: { value: 38.25, label: 'Formação Florestal' },
      })],
    })

    expect(csv).toContain('medida;valor;unidade')
    expect(csv).toContain('Área analisada;12,48;km²')
    expect(csv).toContain('Área analisada;1248;ha')
    expect(csv).toContain('Comprimento;3,2;km')
    expect(csv).toContain('Valor do pixel;38,25;t C/ha')
    expect(csv).toContain('Classe do pixel;Formação Florestal;')
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

    expect(csv).toContain('Valor do pixel;-45,2;Mg CO2e/ha')
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

  it('names a multi-layer file after the layer count', () => {
    const { filename } = buildAnalysisCsv({
      ...base,
      layers: [layer({ layerName: 'Estoque de Carbono' }), layer({ layerName: 'Biomassa GEDI' })],
    })

    expect(filename).toBe('caativar_2-camadas_petrolina_2026-08-24.csv')
  })
})
