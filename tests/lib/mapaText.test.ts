// The English side of the map module's data and pure-logic layer, and the guard
// that keeps the Portuguese JSON and the config from drifting apart: the text
// moved into translations/<locale>/Mapa*.json, but layers.json, layerMeta.ts,
// groups.ts... still carry the Portuguese values the app falls back to.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import layersConfig from '@/config/mapa/layers.json'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { THEMES, localizedThemes } from '@/config/mapa/groups'
import { RESULT_PROFILES, getResultProfile } from '@/config/mapa/resultProfiles'
import { REPORT_LAYERS, getReportLayer } from '@/config/mapa/reportLayers'
import { basemaps, basemapName } from '@/config/mapa/basemaps'
import { MONTHS, PHASES, monthLabel, monthShort, phaseLabel, phasePhotoDate } from '@/lib/phenology'
import {
  PT_TEXT,
  createMapaText,
  layerDescription,
  layerKind,
  layerName,
  layerSource,
  layerUnit,
  layerUnitName,
  pixelClassLabel,
  localizeLayer,
  poolLabel,
  storedText,
  type MapaText,
} from '@/lib/mapa/text'
import { describeFlux } from '@/lib/mapa/carbonFlux'
import { analysisHint } from '@/lib/mapa/analysisTargets'
import { buildAnalysisCsv } from '@/lib/mapa/exportAnalysis'
import { numero, numeroCsv } from '@/lib/mapa/format'
import { buildNarrative } from '@/lib/mapa/reportNarrative'
import {
  buildCoordinatePolygon,
  buildCoordinatePoint,
  buildCoordinateRectangle,
  coordinateLabel,
  formatDms,
  parseVertexList,
} from '@/lib/mapa/parseCoordinates'
import { matchTerritory } from '@/lib/mapa/searchMatch'
import { profiledSummary } from '@/lib/mapa/results/headline'
import { hectaresShort, percent, quantity, sourceNote } from '@/lib/mapa/results/format'
import { bandLabel } from '@/lib/mapa/results/recurrence'
import { classShares } from '@/lib/mapa/classShares'
import type { LayerConfig, RasterLayerConfig, VectorLayerConfig } from '@/types/mapa'

const TRANSLATIONS = path.resolve(import.meta.dirname, '../../translations')

function messagesOf(locale: 'pt' | 'en'): Record<string, unknown> {
  const dir = path.join(TRANSLATIONS, locale)
  const files = fs.readdirSync(dir).filter((f) => /^Mapa.*\.json$/.test(f))
  return Object.assign({}, ...files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))))
}

const EN: MapaText = createMapaText('en', messagesOf('en'))
const PT: MapaText = createMapaText('pt', messagesOf('pt'))

const layers = layersConfig.layers as LayerConfig[]
const rasters = layers.filter((l): l is RasterLayerConfig => l.type === 'raster')
const vectors = layers.filter((l): l is VectorLayerConfig => l.type === 'vector')

describe('Portuguese JSON mirrors the config it falls back to', () => {
  it('layer names, unit names, classes, descriptions and sources', () => {
    for (const layer of layers) {
      expect(layerName(layer, PT), layer.id).toBe(layer.name)
      if (layer.type === 'vector' && layer.unitName) {
        expect(layerUnitName(layer, PT), layer.id).toBe(layer.unitName)
      }
      if (layer.type === 'raster') {
        expect(layerUnit(layer, PT), layer.id).toBe(layer.unit)
        for (const cls of layer.classes ?? []) {
          expect(PT.t(`MapaLayers.layers.${layer.id}.classes.${cls.value}`), `${layer.id}:${cls.value}`).toBe(cls.label)
        }
      }
      const meta = LAYER_META[layer.id]
      if (meta) {
        expect(layerDescription(layer.id, '', PT), layer.id).toBe(meta.description)
        expect(layerSource(layer.id, '', PT), layer.id).toBe(meta.source)
        expect(layerKind(meta.kind, PT), layer.id).toBe(meta.kind)
      }
    }
  })

  it('localizing a layer in Portuguese is the identity', () => {
    for (const layer of layers) expect(localizeLayer(layer, PT)).toEqual(layer)
  })

  it('themes, subthemes, months, phases, basemaps, profiles and report layers', () => {
    expect(localizedThemes(PT)).toEqual(THEMES)
    for (const m of MONTHS) {
      expect(monthLabel(m, PT)).toBe(m.label)
      expect(monthShort(m, PT)).toBe(m.short)
    }
    for (const [id, phase] of Object.entries(PHASES)) {
      expect(phaseLabel(id as keyof typeof PHASES, PT)).toBe(phase.label)
      expect(phasePhotoDate(id as keyof typeof PHASES, PT)).toBe(phase.photoDate)
    }
    for (const b of Object.values(basemaps)) expect(basemapName(b, PT)).toBe(b.name)
    for (const id of Object.keys(RESULT_PROFILES)) {
      expect(getResultProfile(id, PT), id).toEqual(RESULT_PROFILES[id])
    }
    for (const entry of REPORT_LAYERS) {
      expect(getReportLayer(entry.layerId, PT), entry.layerId).toEqual(entry)
    }
  })
})

describe('English text covers the whole config', () => {
  it('every layer has a translated name, and no name is left in Portuguese by accident', () => {
    for (const layer of layers) {
      expect(EN.t.has(`MapaLayers.layers.${layer.id}.name`), layer.id).toBe(true)
    }
    expect(layerName(layers[0], EN)).toBe('Caatinga Biome')
  })

  it('every vector unit name and every class label is translated', () => {
    for (const v of vectors) expect(EN.t.has(`MapaLayers.layers.${v.id}.unitName`), v.id).toBe(true)
    for (const r of rasters) {
      for (const cls of r.classes ?? []) {
        expect(EN.t.has(`MapaLayers.layers.${r.id}.classes.${cls.value}`), `${r.id}:${cls.value}`).toBe(true)
      }
    }
  })

  it('every described layer has an English description and source', () => {
    for (const id of Object.keys(LAYER_META)) {
      expect(layerDescription(id, '', EN), id).not.toBe('')
      expect(layerSource(id, '', EN), id).not.toBe('')
    }
  })

  it('units with Portuguese words are translated, universal ones are kept', () => {
    const chirps = rasters.find((r) => r.id === 'chirps_precip')!
    const stock = rasters.find((r) => r.id === 'estoque_carbono')!
    expect(layerUnit(chirps, EN)).toBe('mm/yr')
    expect(layerUnit(stock, EN)).toBe('t C/ha')
  })

  it('localizeLayer translates name, unit and class labels and is idempotent', () => {
    const lulc = rasters.find((r) => r.id === 'lulc_mapbiomas')!
    const en = localizeLayer(lulc, EN)
    expect(en.name).toBe('Land Use and Land Cover (MapBiomas coll. 10.1)')
    expect(en.classes?.find((c) => c.value === 15)?.label).toBe('Pasture')
    expect(localizeLayer(en, EN)).toEqual(en)
    // Untouched: everything the GEE routes and the allowlist read.
    expect(en.gee).toEqual(lulc.gee)
    expect(en.id).toBe(lulc.id)
  })

  it('names the class of a sampled pixel by its value', () => {
    const degradacao = (layersConfig.layers as RasterLayerConfig[]).find((l) => l.id === 'degradacao_terra')!

    expect(pixelClassLabel(degradacao, { classValue: 6 }, EN)).toBe('Conserved')
    expect(pixelClassLabel(degradacao, { classValue: 6 }, PT)).toBe('Conservado')
    // Idempotent over a layer already localized, as the panel passes it.
    expect(pixelClassLabel(localizeLayer(degradacao, EN), { classValue: 6 }, EN)).toBe('Conserved')
    expect(pixelClassLabel(degradacao, {}, EN)).toBeUndefined()
  })

  it('names a stock pool by its band, whatever text came with it', () => {
    expect(poolLabel('b2', 'Biomassa acima do solo', EN)).toBe('Aboveground biomass')
    // The band is the id: the server's Portuguese text is only the fallback.
    expect(poolLabel('b2', 'biomassa acima do solo (Mg)', EN)).toBe('Aboveground biomass')
    expect(poolLabel('b9', 'Outro reservatório', EN)).toBe('Outro reservatório')
  })

  it('themes, months, phases, basemaps', () => {
    const themes = localizedThemes(EN)
    expect(themes.find((t) => t.id === 'territorio')?.label).toBe('Territory')
    expect(themes.flatMap((t) => t.subthemes).every((s) => s.label.length > 0)).toBe(true)
    expect(monthLabel(MONTHS[0], EN)).toBe('January')
    expect(phaseLabel('branca', EN)).toBe('Mata branca')
    expect(phasePhotoDate('folha', EN)).toBe('Jan 2025')
    expect(basemapName(basemaps['esri-imagery'], EN)).toBe('Esri World Imagery (Satellite)')
  })

  it('result profiles and report layers', () => {
    const gpp = getResultProfile('gpp_modis', EN)
    expect(gpp?.archetype === 'annual' && gpp.meanLabel).toBe('Mean GPP')
    expect(gpp?.archetype === 'annual' && gpp.unit).toBe('g C/m²/yr')
    // Numbers are not touched.
    expect(gpp?.archetype === 'annual' && gpp.physical).toEqual({ reducer: 'sum', multiplier: 0.1 })
    const lulc = getResultProfile('lulc_mapbiomas', EN)
    expect(lulc?.archetype === 'composition' && lulc.nominal?.groups[0].label).toBe('Native forest vegetation')
    expect(getResultProfile('estoque_c_agb', EN)?.note).toBe('Stock of the past cover (potential).')

    const ndvi = getReportLayer('ndvi_modis', EN)
    expect(ndvi?.trend?.increaseTerm).toBe('increase')
    expect(ndvi?.coverageContext).toBe('in this vigor range')
  })
})

describe('English pure functions', () => {
  it('describeFlux', () => {
    expect(describeFlux(-3, EN)).toMatchObject({ label: 'removed', noun: 'removal', direction: 'removal' })
    expect(describeFlux(3, EN)).toMatchObject({ label: 'emitted', noun: 'emission' })
    expect(describeFlux(0, EN).label).toBe('in balance')
  })

  it('number formatting follows the locale', () => {
    expect(numero(1234.5, 1, 'en')).toBe('1,234.5')
    expect(numero(1234.5, 1)).toBe('1.234,5')
    expect(numeroCsv(1234.5678, 'en')).toBe('1234.5678')
    expect(quantity(2_500_000, 't C', EN)).toEqual({ value: '2.5', unit: 'Mt C' })
    expect(percent(0.05, EN)).toBe('less than 0.1%')
    expect(hectaresShort(150_000, EN)).toBe('150k ha')
    expect(sourceNote('MODIS, 500 m', EN)).toBe('Source: MODIS.')
    expect(bandLabel(2, 4, EN)).toBe('2 to 4 years')
    expect(bandLabel(11, null, EN)).toBe('11 or more years')
  })

  it('unclassified remainder', () => {
    const shares = classShares({ '3': 100, '999': 100 }, [{ value: 3, label: 'A', color: '#000' }], EN)
    expect(shares.map((s) => s.label)).toEqual(['A', 'Unclassified'])
  })

  it('headline of a flux and of a recurrence result', () => {
    const flux = rasters.find((r) => r.id === 'gfw_netflux')!
    const profile = getResultProfile('gfw_netflux', EN)!
    expect(
      profiledSummary(flux, profile, { kind: 'flux', positive: 0, negative: -5_000_000, positiveHa: 0, negativeHa: 1, validHa: 1 } as never, EN),
    ).toBe('5.0 Mt CO2e of removal')
  })

  it('analysis hint names the recortes and the panel path', () => {
    const [bioma, , municipios] = vectors
    expect(analysisHint([bioma, municipios], EN)).toBe(
      'Click the map over Caatinga Biome or Municipalities to see statistics for this layer, or outline the area with Polygon, Point or Coordinates, in the drawing tools of the pencil button.',
    )
    expect(analysisHint([], EN)).toContain('Themes › Territory › Reference boundaries')
    expect(analysisHint([bioma], PT)).toBe(analysisHint([bioma]))
  })

  it('stored messages follow the language at display time', () => {
    expect(storedText({ key: 'MapaAnalysis.errors.stats' }, EN)).toBe('Failed to compute statistics. Please try again.')
    expect(storedText({ key: 'MapaAnalysis.errors.stats' }, PT)).toBe('Falha ao calcular estatísticas. Tente novamente.')
    expect(storedText({ key: 'MapaUiLayerErrors.wfs', values: { message: 'timeout' } }, EN)).toBe('Failed to load WFS: timeout')
    // A text that came back from an API route is shown as it is.
    expect(storedText({ text: 'API error 500' }, EN)).toBe('API error 500')
  })

  it('coordinates: errors, hemisphere letters and the rebuilt label', () => {
    // The parser returns the key; the form translates it where it renders it.
    const invalidLine = parseVertexList('nope')
    expect(invalidLine.ok).toBe(false)
    expect(!invalidLine.ok && EN.t(invalidLine.error.key, invalidLine.error.values)).toBe('Line 1: invalid coordinate')
    const tooFew = parseVertexList('-7,-35\n-7,-36')
    expect(tooFew.ok).toBe(false)
    expect(!tooFew.ok && EN.t(tooFew.error.key)).toBe('Enter at least three vertices')
    expect(formatDms(-35.88, 'lon', EN)).toBe('35°52\'48"W')
    expect(formatDms(-35.88, 'lon')).toBe('35°52\'48"O')

    const point = buildCoordinatePoint([-35.88, -7.21])
    expect(coordinateLabel(point, EN)).toBe('7°12\'36"S, 35°52\'48"W')
    expect(coordinateLabel(point)).toBe(point.properties?.ccLabel)

    const rect = buildCoordinateRectangle([-36, -8], [-35, -7])!
    expect(coordinateLabel(rect, EN)).toBe('Rectangle')
    expect(coordinateLabel(rect)).toBe('Retângulo')

    const poly = buildCoordinatePolygon([[-36, -8], [-35, -8], [-35, -7], [-36, -7]], EN)!
    expect(poly.properties?.ccLabel).toBe('Polygon of 4 vertices')
    // Same geometry as a rectangle, told apart by its kind.
    expect(coordinateLabel(poly, PT)).toBe('Polígono de 4 vértices')
    expect(coordinateLabel({ geometry: null, properties: {} }, EN)).toBeNull()
  })

  it('territory search normalizes with the locale', () => {
    expect(matchTerritory('sao jo', 'São João', undefined, { locale: 'en' })).toEqual({ start: 0, length: 6 })
  })
})

describe('English report narrative and CSV', () => {
  const recorte = {
    layerId: 'municipios', layerName: 'Municipalities', featureId: 'x', featureName: 'Campina Grande',
    areaHa: 1, bbox: [0, 0, 0, 0] as [number, number, number, number], boundary: 'full' as const,
  }

  it('writes each sentence in English with English numbers', () => {
    const config = getReportLayer('chirps_precip', EN)!
    const out = buildNarrative({
      recorte, layerName: 'Annual Precipitation (CHIRPS)', unit: 'mm/yr', config,
      status: 'available', effectiveYear: '2023',
      snapshot: { kind: 'continuous', stats: { mean: 1234.5, min: 200, max: 1400, median: 1, std: 1, count: 1 } },
      series: [
        { date: '2021-01-01', value: 1000 },
        { date: '2022-01-01', value: 1100 },
        { date: '2023-01-01', value: 1234.5 },
      ],
    }, EN)

    expect(out.situation).toBe(
      'In Campina Grande, the Annual Precipitation (CHIRPS) layer averages 1,234.5 mm/yr in 2023, ranging from 200.0 to 1,400.0 mm/yr.',
    )
    expect(out.trend).toBe('Compared with 2022, the increase was 134.5 mm/yr, or 12.2%.')
    expect(out.context).toBe(
      'Over the 2021 to 2023 series, the mean is 1,111.5 mm/yr, with a maximum of 1,234.5 in 2023 and a minimum of 1,000.0 in 2021.',
    )
  })

  it('writes the flux and categorical sentences', () => {
    const flux = buildNarrative({
      recorte, layerName: 'Net Forest Carbon Flux (GFW)', unit: 'Mg CO2e/ha', signedFlux: true,
      config: getReportLayer('gfw_netflux', EN)!, status: 'available', effectiveYear: null,
      snapshot: { kind: 'continuous', stats: { mean: -2.5, min: -9, max: 4, median: 0, std: 1, count: 1 } },
      series: [],
    }, EN)
    expect(flux.situation).toBe(
      'In Campina Grande, the Net Forest Carbon Flux (GFW) layer indicates that the area removed an average of 2.50 Mg CO2e/ha.',
    )

    const cat = buildNarrative({
      recorte, layerName: 'Land Use', classes: [{ value: 15, label: 'Pasture', color: '#000' }],
      config: getReportLayer('lulc_mapbiomas', EN)!, status: 'available', effectiveYear: '2023',
      snapshot: { kind: 'categorical', areas: { '15': 100 } }, series: [],
    }, EN)
    expect(cat.situation).toBe(
      'In Campina Grande, the predominant class of Land Use is Pasture, with 100.0% of the analyzed area in this land use and cover class, in 2023.',
    )
  })

  it('writes the CSV with English headers, a decimal point and a comma delimiter', () => {
    const { csv, filename } = buildAnalysisCsv({
      analysisKind: 'Municipality', analysisLabel: 'Petrolina', drawnArea: 12.5, drawnLength: null,
      generatedAt: new Date('2026-08-24T15:00:00Z'),
      layers: [{
        layerName: 'Soil Organic Carbon', layerUnit: 't C/ha', pixelValue: null, source: 'MapBiomas Soil, 30 m',
        stats: { kind: 'continuous', stats: { min: 1.5, max: 80, mean: 23.456789, median: 20, std: 4.25, count: 1200 } },
      }],
    }, EN)

    expect(csv).toContain('# Territorial unit: Municipality - Petrolina')
    expect(csv).toContain('# Generated on: 2026-08-24')
    expect(csv).toContain('# Layer: Soil Organic Carbon')
    expect(csv).toContain('# Source: MapBiomas Soil')
    expect(csv).toContain('Analyzed area,12.5,km²')
    expect(csv).toContain('statistic,value,unit')
    expect(csv).toContain('Mean,23.4568,t C/ha')
    expect(csv).toContain('Pixel count,1200,')
    expect(filename).toBe('caativar_soil-organic-carbon_petrolina_2026-08-24.csv')
  })

  it('quotes a cell that carries the delimiter of its own locale only', () => {
    const one = (tx: MapaText) => buildAnalysisCsv({
      analysisKind: null, analysisLabel: null, drawnArea: null, drawnLength: null,
      generatedAt: new Date('2026-08-24T15:00:00Z'),
      layers: [{
        layerName: 'L', pixelValue: null,
        layerClasses: [{ value: 1, label: 'Beach, Dune', color: '#000' }],
        stats: { kind: 'categorical', areas: { '1': 10_000 } },
      }],
    }, tx).csv
    expect(one(PT_TEXT)).toContain('Beach, Dune;1;100')
    expect(one(EN)).toContain('"Beach, Dune",1,100')
  })
})
