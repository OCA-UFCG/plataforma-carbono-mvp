import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ZonalStatsOutcome } from '@/lib/mapa/zonalStats'
import type { TimeSeriesPoint } from '@/types/mapa'

const mocks = vi.hoisted(() => ({
  computeZonalStats: vi.fn<() => Promise<ZonalStatsOutcome>>(),
  computeSeries: vi.fn<() => Promise<TimeSeriesPoint[]>>(),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({
  initGee: vi.fn(async () => {}),
  getEe: vi.fn(() => ({})),
}))
vi.mock('@/lib/mapa/zonalStats', () => ({ computeZonalStats: mocks.computeZonalStats }))
vi.mock('@/lib/mapa/zonalSeries', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/zonalSeries')>(),
  computeSeries: mocks.computeSeries,
}))

import {
  buildReportAnalysis,
  buildReportShell,
  ReportBadRequestError,
  ReportNotFoundError,
} from '@/lib/mapa/reportService'

// Each `describe` block below uses its own feicaoId. The analysis cache is
// module state shared across every case in this file: two calls with the
// same (recorteId, feicaoId, year, layerId) tuple hit the cache on the
// second one, so reusing a feicaoId across cases would make the mocks set in
// `beforeEach` go unconsulted after the first case populates the cache. The
// one deliberate exception is the cache test itself, which calls twice with
// the same id on purpose.
const base = { recorteId: 'municipios', feicaoId: 'campina-grande', year: '2023' }

describe('buildReportShell', () => {
  it('identifies the recorte and orders the analyses by the configured order', () => {
    const shell = buildReportShell({
      ...base,
      feicaoId: 'petrolina',
      layerIds: ['solo_carbono', 'estoque_carbono'],
      now: () => new Date('2026-09-12T12:00:00.000Z'),
    })

    expect(shell.schemaVersion).toBe(1)
    expect(shell.generatedAt).toBe('2026-09-12T12:00:00.000Z')
    expect(shell.requestedYear).toBe('2023')
    expect(shell.recorte).toMatchObject({
      layerId: 'municipios', layerName: 'Municípios',
      featureId: 'petrolina', featureName: 'Petrolina',
      boundary: 'full',
    })
    // estoque_carbono has the lowest `order`, whatever order the caller asked in.
    expect(shell.analyses.map((a) => a.layerId)).toEqual(['estoque_carbono', 'solo_carbono'])
  })

  it('fills the descriptor from layers.json, LAYER_META and the report config', () => {
    const shell = buildReportShell({ ...base, feicaoId: 'juazeiro', layerIds: ['solo_carbono'] })
    const [analysis] = shell.analyses

    expect(analysis).toMatchObject({
      layerId: 'solo_carbono',
      name: 'Carbono Orgânico do Solo (MapBiomas)',
      unit: 't C/ha',
      sectionColor: '#5A4632',
      requestedYear: '2023',
      effectiveYear: '2023',
    })
    expect(analysis.source).toBeTruthy()
    expect(analysis.methodology).toBeTruthy()
    expect(analysis.availableYears).toContain('2023')
  })

  it('marks a static layer as having no year and no series', () => {
    const shell = buildReportShell({ ...base, feicaoId: 'caruaru', layerIds: ['estoque_carbono'] })
    const [analysis] = shell.analyses

    // No `gee.temporal`: there is nothing for a year to select.
    expect(analysis.requestedYear).toBeNull()
    expect(analysis.effectiveYear).toBeNull()
    expect(analysis.availableYears).toEqual([])
  })

  it('leaves effectiveYear null when the requested year is not a stop', () => {
    const shell = buildReportShell({ ...base, feicaoId: 'mossoro', year: '1900', layerIds: ['solo_carbono'] })
    const [analysis] = shell.analyses

    expect(analysis.requestedYear).toBe('1900')
    expect(analysis.effectiveYear).toBeNull()
    expect(analysis.availableYears.length).toBeGreaterThan(0)
  })

  it('rejects a layer that is not in the curated set', () => {
    // estoque_c_agb exists in layers.json but was not curated for the report.
    expect(() => buildReportShell({ ...base, feicaoId: 'sobral', layerIds: ['estoque_c_agb'] }))
      .toThrow(ReportBadRequestError)
    expect(() => buildReportShell({ ...base, feicaoId: 'sobral', layerIds: [] }))
      .toThrow(ReportBadRequestError)
  })

  it('rejects an unknown recorte or feature', () => {
    expect(() => buildReportShell({ ...base, feicaoId: 'feira-de-santana', recorteId: 'nao-existe', layerIds: ['solo_carbono'] }))
      .toThrow(ReportNotFoundError)
    expect(() => buildReportShell({ ...base, feicaoId: 'nao-existe', layerIds: ['solo_carbono'] }))
      .toThrow(ReportNotFoundError)
  })
})

describe('buildReportAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.computeZonalStats.mockResolvedValue({
      ok: true,
      result: {
        kind: 'continuous',
        stats: { min: 11.2, max: 48.9, mean: 24.3, median: 22.5, std: 4.25, count: 1200 },
      },
    })
    mocks.computeSeries.mockResolvedValue([
      { date: '2022-01-01', value: 23.0 },
      { date: '2023-01-01', value: 24.3 },
    ])
  })

  it('measures the year and the series and narrates both', async () => {
    const analysis = await buildReportAnalysis({ ...base, feicaoId: 'patos', layerId: 'solo_carbono' })

    expect(analysis.status).toBe('available')
    expect(analysis.snapshot).toMatchObject({ kind: 'continuous' })
    expect(analysis.series).toHaveLength(2)
    expect(analysis.narrative.situation).toContain('Em Patos')
    expect(analysis.narrative.trend).toContain('Em relação a 2022')
  })

  it('coarsens the series scale to the configured floor, never finer than native', async () => {
    await buildReportAnalysis({ ...base, feicaoId: 'sousa', layerId: 'solo_carbono' })

    // solo_carbono is 30 m native with a 300 m floor for the series.
    expect(mocks.computeSeries.mock.calls[0][1]).toMatchObject({
      region: { kind: 'zonal', scale: 300 },
    })
  })

  it('keeps the snapshot when the series fails', async () => {
    mocks.computeSeries.mockRejectedValueOnce(new Error('ee.evaluate timed out after 65000ms'))

    const analysis = await buildReportAnalysis({ ...base, feicaoId: 'cajazeiras', layerId: 'solo_carbono' })

    // Losing the series must not lose the section.
    expect(analysis.status).toBe('available')
    expect(analysis.snapshot).toMatchObject({ kind: 'continuous' })
    expect(analysis.series).toEqual([])
    expect(analysis.narrative.situation).toBeTruthy()
    expect(analysis.narrative.trend).toBeNull()
  })

  it('reports the analysis unavailable when the snapshot fails', async () => {
    mocks.computeZonalStats.mockResolvedValueOnce({
      ok: false, error: 'No valid pixels in the given geometry', status: 422,
    })

    const analysis = await buildReportAnalysis({ ...base, feicaoId: 'campina-grande', layerId: 'solo_carbono' })

    expect(analysis.status).toBe('unavailable')
    expect(analysis.snapshot).toBeNull()
    expect(analysis.narrative).toEqual({ situation: null, trend: null, context: null })
  })

  it('reports the analysis unavailable when computeZonalStats rejects instead of returning ok: false', async () => {
    // The failure this one-analysis-per-request architecture was designed
    // around: geeEvaluate.ts rejects on GEE_TIMEOUT_MS, near-certain for a
    // large recorte. A throw here must become the same 'unavailable' status
    // as an `{ ok: false }` return, not escape as an unhandled rejection.
    mocks.computeZonalStats.mockRejectedValueOnce(new Error('ee.evaluate timed out after 65000ms'))

    const analysis = await buildReportAnalysis({ ...base, feicaoId: 'sobral', layerId: 'solo_carbono' })

    expect(analysis.status).toBe('unavailable')
    expect(analysis.snapshot).toBeNull()
    expect(analysis.narrative).toEqual({ situation: null, trend: null, context: null })
  })

  it('reports year_not_found without calling Earth Engine at all', async () => {
    const analysis = await buildReportAnalysis({ ...base, feicaoId: 'petrolina', year: '1900', layerId: 'solo_carbono' })

    expect(analysis.status).toBe('year_not_found')
    expect(analysis.availableYears.length).toBeGreaterThan(0)
    // Asking for a year the collection does not have is settled from config.
    expect(mocks.computeZonalStats).not.toHaveBeenCalled()
    expect(mocks.computeSeries).not.toHaveBeenCalled()
  })

  it('skips the series for a static layer and for one whose mean is meaningless', async () => {
    mocks.computeZonalStats.mockResolvedValue({
      ok: true, result: { kind: 'categorical', areas: { '15': 600_000, '3': 400_000 } },
    })

    const lulc = await buildReportAnalysis({ ...base, feicaoId: 'juazeiro', year: '2024', layerId: 'lulc_mapbiomas' })
    expect(lulc.series).toEqual([])

    mocks.computeZonalStats.mockResolvedValue({
      ok: true,
      result: {
        kind: 'stocks',
        report: { totalTc: 10, areaHa: 1, unit: 't C', pools: [], classes: [] },
      },
    })
    const estoque = await buildReportAnalysis({ ...base, feicaoId: 'caruaru', layerId: 'estoque_carbono' })
    expect(estoque.series).toEqual([])

    expect(mocks.computeSeries).not.toHaveBeenCalled()
  })

  it('serves a repeated request from the cache', async () => {
    await buildReportAnalysis({ ...base, feicaoId: 'mossoro', layerId: 'solo_carbono' })
    await buildReportAnalysis({ ...base, feicaoId: 'mossoro', layerId: 'solo_carbono' })

    expect(mocks.computeZonalStats).toHaveBeenCalledOnce()
  })
})
