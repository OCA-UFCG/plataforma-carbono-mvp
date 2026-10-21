import { describe, expect, it } from 'vitest'
import {
  bandOf,
  choroplethColor,
  choroplethKey,
  choroplethPending,
  choroplethRange,
  choroplethRecorte,
  choroplethView,
  roundValue,
  STATIC_KEY,
  withoutChoroplethErrors,
  type ChoroplethEntry,
} from '@/lib/mapa/choropleth'
import type { LayerConfig, RasterLayerConfig, VectorLayerConfig } from '@/types/mapa'

const raster = (id: string, over: Partial<RasterLayerConfig> = {}): RasterLayerConfig => ({
  id, name: id, type: 'raster', visible: true, opacity: 80,
  colorType: 'continuous', source: 'gee', clipToLayerId: 'bioma',
  gee: { asset: { type: 'image', id: `projects/x/${id}` }, visParams: { min: 0, max: 100, palette: ['#000000', '#ffffff'] } },
  ...over,
})
const vector = (id: string, pickPriority: number, over: Partial<VectorLayerConfig> = {}): VectorLayerConfig => ({
  id, name: id, type: 'vector', url: `/data/vector/${id}.geojson`, visible: true, opacity: 80, color: '#000', pickPriority, ...over,
})
const estados = vector('estados', 10, { choropleth: { caption: 'Escala estadual' } })
const municipios = vector('municipios', 20, { choropleth: { caption: 'Escala municipal' } })
const tis = vector('terras_indigenas', 30)
const estoque = raster('estoque')

describe('choroplethRecorte', () => {
  it('draws a continuous raster by the finest choropleth recorte on', () => {
    expect(choroplethRecorte([municipios, estados, estoque], estoque)?.id).toBe('municipios')
    expect(choroplethRecorte([{ ...municipios, visible: false }, estados, estoque], estoque)?.id).toBe('estados')
  })

  it('ignores territories, which only partly cover the biome', () => {
    expect(choroplethRecorte([tis, estados, estoque], estoque)?.id).toBe('estados')
    expect(choroplethRecorte([tis, estoque], estoque)).toBeNull()
  })

  it('leaves categorical, relief, rendering-only and hidden rasters in pixels', () => {
    const layers: LayerConfig[] = [municipios]
    expect(choroplethRecorte(layers, raster('lulc', { colorType: 'categorical' }))).toBeNull()
    expect(choroplethRecorte(layers, raster('relevo', { source: 'dem' }))).toBeNull()
    expect(choroplethRecorte(layers, raster('hillshade', { analysis: false }))).toBeNull()
    expect(choroplethRecorte(layers, raster('off', { visible: false }))).toBeNull()
  })
})

describe('choroplethRange', () => {
  it('runs from the lowest to the highest value over every year and feature', () => {
    expect(choroplethRange(estoque, [[10, null, 40], [5, 30, null]])).toEqual({ min: 5, max: 40 })
  })

  it('is null without a finite value or with no spread', () => {
    expect(choroplethRange(estoque, [[null, null]])).toBeNull()
    expect(choroplethRange(estoque, [[7, 7]])).toBeNull()
  })

  it("keeps a signed flux's zero where the palette puts its white", () => {
    const netFlux = { signedFlux: true, gee: { visParams: { min: -100, max: 300 } } }
    // k = max(-20 / -100, 30 / 300) = 0.2
    const range = choroplethRange(netFlux, [[-20, 30]])!
    expect(range.min).toBeCloseTo(-20)
    expect(range.max).toBeCloseTo(60)
    // A feature set that only emits keeps zero on the bar: k = max(5 / -100, 150 / 300) = 0.5
    expect(choroplethRange(netFlux, [[5, 150]])!.min).toBeCloseTo(-50)
  })
})

describe('choroplethColor', () => {
  it('spreads the palette evenly over the range and leaves a feature without a value unfilled', () => {
    expect(choroplethColor(['#000000', '#808080', '#ffffff'], { min: 10, max: 30 }, 'v_estoque')).toEqual([
      'case',
      ['==', ['typeof', ['feature-state', 'v_estoque']], 'number'],
      ['interpolate', ['linear'], ['feature-state', 'v_estoque'], 10, '#000000', 20, '#808080', 30, '#ffffff'],
      'rgba(0, 0, 0, 0)',
    ])
  })
})

describe('choroplethView', () => {
  const ready = (values: (number | null)[][], keys = [STATIC_KEY]): ChoroplethEntry =>
    ({ status: 'ready', keys, values, range: { min: 0, max: 50 } })

  it("hands MapView and the legend the year on screen's values", () => {
    const gpp = raster('gpp')
    const view = choroplethView([municipios, gpp], gpp, {
      [choroplethKey('gpp', 'municipios')]: ready([[1, 2], [3, 4]], ['2010', '2024']),
    }, '2024-01-01')
    expect(view).toMatchObject({ caption: 'Escala municipal', range: { min: 0, max: 50 }, values: [3, 4] })
    expect(view?.recorte.id).toBe('municipios')
    expect(view?.palette).toEqual(['#000000', '#ffffff'])
  })

  it('reads a static layer under the static key', () => {
    expect(choroplethView([estados, estoque], estoque, { [choroplethKey('estoque', 'estados')]: ready([[9]]) })?.values)
      .toEqual([9])
  })

  it('keeps the pixels while loading, after an error, without a range or without the year', () => {
    const key = choroplethKey('estoque', 'municipios')
    const layers = [municipios, estoque]
    expect(choroplethView(layers, estoque, {})).toBeNull()
    expect(choroplethView(layers, estoque, { [key]: { status: 'loading' } })).toBeNull()
    expect(choroplethView(layers, estoque, { [key]: { status: 'error' } })).toBeNull()
    expect(choroplethView(layers, estoque, { [key]: { status: 'ready', keys: [STATIC_KEY], values: [[1]], range: null } })).toBeNull()
    const gpp = raster('gpp')
    expect(choroplethView([municipios, gpp], gpp,
      { [choroplethKey('gpp', 'municipios')]: ready([[1]], ['2010']) }, '2024-01-01')).toBeNull()
  })

  it("never shows another recorte's values", () => {
    expect(choroplethView([municipios, estoque], estoque, { [choroplethKey('estoque', 'estados')]: ready([[9]]) }))
      .toBeNull()
  })
})

describe('choroplethPending', () => {
  it('names the scale being computed, from the moment the recorte is on', () => {
    const key = choroplethKey('estoque', 'municipios')
    expect(choroplethPending([municipios, estoque], estoque, {})).toBe('Escala municipal')
    expect(choroplethPending([municipios, estoque], estoque, { [key]: { status: 'loading' } })).toBe('Escala municipal')
  })

  it('names nothing once answered, failed, or without a recorte', () => {
    const key = choroplethKey('estoque', 'municipios')
    expect(choroplethPending([municipios, estoque], estoque, { [key]: { status: 'error' } })).toBeNull()
    expect(choroplethPending([municipios, estoque], estoque,
      { [key]: { status: 'ready', keys: [STATIC_KEY], values: [[1]], range: null } })).toBeNull()
    expect(choroplethPending([estoque], estoque, {})).toBeNull()
  })
})

describe('withoutChoroplethErrors', () => {
  it("drops one recorte's failures, so turning it on again retries", () => {
    const entries: Record<string, ChoroplethEntry> = {
      [choroplethKey('a', 'municipios')]: { status: 'error' },
      [choroplethKey('b', 'municipios')]: { status: 'loading' },
      [choroplethKey('a', 'estados')]: { status: 'error' },
    }
    expect(withoutChoroplethErrors(entries, 'municipios')).toEqual({
      [choroplethKey('b', 'municipios')]: { status: 'loading' },
      [choroplethKey('a', 'estados')]: { status: 'error' },
    })
  })
})

describe('helpers', () => {
  it('rounds to four significant digits', () => {
    expect(roundValue(123.456789)).toBe(123.5)
    expect(roundValue(0.000123456)).toBe(0.0001235)
  })

  it('names a band so a year is never a bare number', () => {
    expect(bandOf('2010')).toBe('y2010')
    expect(bandOf(STATIC_KEY)).toBe('ystatic')
  })
})
