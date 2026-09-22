import { describe, expect, it } from 'vitest'
import { resultSummary } from '@/lib/mapa/resultSummary'
import type { LayerResult, RasterLayerConfig } from '@/types/mapa'

const layer = (over: Partial<RasterLayerConfig> = {}): RasterLayerConfig => ({
  id: 'estoque_carbono', name: 'Estoque de carbono', type: 'raster',
  visible: true, opacity: 80, colorType: 'continuous', unit: 't C/ha', ...over,
})

const result = (over: Partial<LayerResult> = {}): LayerResult => ({
  layerId: 'estoque_carbono', status: 'ready',
  stats: null, pixelValue: null, error: null, ...over,
})

describe('resultSummary', () => {
  it('is null while the layer has no result at all', () => {
    expect(resultSummary(layer(), undefined)).toBeNull()
  })

  it('is null while the layer is loading, so the card shows its skeleton', () => {
    expect(resultSummary(layer(), result({ status: 'loading' }))).toBeNull()
  })

  it('is null on error, so the card shows the message instead', () => {
    expect(resultSummary(layer(), result({ status: 'error', error: 'x' }))).toBeNull()
  })

  it('gives the mean with the unit for a continuous layer', () => {
    const summary = resultSummary(layer(), result({
      stats: { kind: 'continuous', stats: { min: 2.1, max: 91, mean: 38.2456, count: 900 } },
    }))

    expect(summary).toBe('média 38,25 t C/ha')
  })

  it('prefers the unit the statistics carry over the layer default', () => {
    const summary = resultSummary(layer(), result({
      stats: { kind: 'continuous', unit: 'Mg/ha', stats: { min: 0, max: 9, mean: 4, count: 9 } },
    }))

    expect(summary).toBe('média 4,00 Mg/ha')
  })

  it('gives the dominant class and its share for a categorical layer', () => {
    const summary = resultSummary(
      layer({
        colorType: 'categorical',
        classes: [
          { value: 1, label: 'Formação florestal', color: '#1f8d49' },
          { value: 2, label: 'Pastagem',           color: '#edde8e' },
        ],
      }),
      result({ stats: { kind: 'categorical', areas: { '1': 750_000, '2': 250_000 } } }),
    )

    expect(summary).toBe('Formação florestal · 75,0%')
  })

  it('gives the last measured year of a series', () => {
    const summary = resultSummary(layer({ unit: 'NDVI' }), result({
      stats: {
        kind: 'timeseries',
        series: [
          { date: '2022-01-01', value: 0.38 },
          { date: '2023-01-01', value: 0.41 },
        ],
      },
    }))

    expect(summary).toBe('2023: 0,41 NDVI')
  })

  // A nodata tail must not be read as the latest measurement.
  it('skips trailing nodata when picking the last year of a series', () => {
    const summary = resultSummary(layer({ unit: 'NDVI' }), result({
      stats: {
        kind: 'timeseries',
        series: [
          { date: '2022-01-01', value: 0.38 },
          { date: '2023-01-01', value: null },
        ],
      },
    }))

    expect(summary).toBe('2022: 0,38 NDVI')
  })

  it('is null for a series with no measurement at all', () => {
    const summary = resultSummary(layer(), result({
      stats: { kind: 'timeseries', series: [{ date: '2023-01-01', value: null }] },
    }))

    expect(summary).toBeNull()
  })

  it('gives the total for a stock report', () => {
    const summary = resultSummary(layer(), result({
      stats: {
        kind: 'stocks',
        report: { totalTc: 4_760_123.4, areaHa: 62_140, unit: 't C', pools: [], classes: [] },
      },
    }))

    expect(summary).toBe('total 4.760.123 t C')
  })

  it('gives the pixel value with its class label for a point analysis', () => {
    const summary = resultSummary(
      layer({ unit: 'classe' }),
      result({ pixelValue: { value: 3, label: 'Pastagem' } }),
    )

    expect(summary).toBe('3,00 classe · Pastagem')
  })

  it('gives the bare pixel value when the layer has no classes', () => {
    const summary = resultSummary(layer(), result({ pixelValue: { value: 38.24 } }))

    expect(summary).toBe('38,24 t C/ha')
  })
})
