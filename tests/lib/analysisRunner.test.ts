import { describe, expect, it } from 'vitest'
import { pendingAnalyses } from '@/lib/mapa/analysisRunner'
import type { LayerResult, RasterLayerConfig } from '@/types/mapa'

const gee = (id: string, temporal = false): RasterLayerConfig => ({
  id, name: id, type: 'raster', visible: true, opacity: 80,
  colorType: 'continuous', source: 'gee',
  gee: {
    asset: { type: 'image', id: `projects/x/${id}` },
    ...(temporal ? { temporal: { dateRange: ['1985-01-01', '2024-01-01'] as [string, string] } } : {}),
  },
})

const ready = (layerId: string, date?: string): LayerResult => ({
  layerId, date, status: 'ready',
  stats: { kind: 'continuous', stats: { min: 1, max: 9, mean: 5, count: 10 } },
  pixelValue: null, error: null,
})

const input = (over: Partial<Parameters<typeof pendingAnalyses>[0]> = {}) => ({
  rasters: [] as RasterLayerConfig[],
  temporalDate: {} as Record<string, string>,
  results: {} as Record<string, LayerResult>,
  fetchedTileUrls: {} as Record<string, string>,
  temporalTileUrls: {} as Record<string, Record<string, string>>,
  ...over,
})

describe('pendingAnalyses', () => {
  it('returns every visible raster that has a tile and no result yet', () => {
    const a = gee('estoque_carbono')
    const b = gee('biomassa_gedi')
    const out = pendingAnalyses(input({
      rasters: [a, b],
      fetchedTileUrls: { estoque_carbono: 'u1', biomassa_gedi: 'u2' },
    }))

    expect(out).toEqual([{ layer: a, date: undefined }, { layer: b, date: undefined }])
  })

  it('keeps the layer order it was given, topmost first', () => {
    const a = gee('a'); const b = gee('b'); const c = gee('c')
    const out = pendingAnalyses(input({
      rasters: [a, b, c],
      fetchedTileUrls: { a: 'u', b: 'u', c: 'u' },
    }))

    expect(out.map((p) => p.layer.id)).toEqual(['a', 'b', 'c'])
  })

  it('skips a layer whose result already covers the same stop', () => {
    const a = gee('estoque_carbono')
    const out = pendingAnalyses(input({
      rasters: [a],
      fetchedTileUrls: { estoque_carbono: 'u1' },
      results: { estoque_carbono: ready('estoque_carbono') },
    }))

    expect(out).toEqual([])
  })

  it('recomputes a temporal layer whose result is from another year', () => {
    const a = gee('ndvi_modis', true)
    const out = pendingAnalyses(input({
      rasters: [a],
      temporalDate: { ndvi_modis: '2024-01-01' },
      temporalTileUrls: { ndvi_modis: { '2024-01-01': 'u' } },
      results: { ndvi_modis: ready('ndvi_modis', '2023-01-01') },
    }))

    expect(out).toEqual([{ layer: a, date: '2024-01-01' }])
  })

  // Retry is the card's button. An automatic retry inside the reactive effect
  // would fire again on every render that follows the failure.
  it('does not retry a failed layer on its own', () => {
    const a = gee('estoque_carbono')
    const failed: LayerResult = {
      layerId: 'estoque_carbono', status: 'error', stats: null, pixelValue: null,
      error: 'Falha ao calcular estatísticas. Tente novamente.',
    }
    const out = pendingAnalyses(input({
      rasters: [a],
      fetchedTileUrls: { estoque_carbono: 'u1' },
      results: { estoque_carbono: failed },
    }))

    expect(out).toEqual([])
  })

  it('skips a GEE layer whose tile request has not resolved yet', () => {
    const out = pendingAnalyses(input({ rasters: [gee('estoque_carbono')] }))

    expect(out).toEqual([])
  })

  it('skips a temporal layer whose tile for the selected year is missing', () => {
    const a = gee('ndvi_modis', true)
    const out = pendingAnalyses(input({
      rasters: [a],
      temporalDate: { ndvi_modis: '2024-01-01' },
      temporalTileUrls: { ndvi_modis: { '2023-01-01': 'u' } },
    }))

    expect(out).toEqual([])
  })

  it('skips a temporal layer with no stop selected yet', () => {
    const a = gee('ndvi_modis', true)
    const out = pendingAnalyses(input({
      rasters: [a],
      temporalTileUrls: { ndvi_modis: { '2024-01-01': 'u' } },
    }))

    expect(out).toEqual([])
  })
})
