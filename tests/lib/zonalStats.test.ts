import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  evaluate: vi.fn<(obj: unknown) => Promise<unknown>>(),
  buildStockReport: vi.fn(async () => ({
    totalTc: 12, areaHa: 1, unit: 't C', pools: [], classes: [],
  })),
}))

vi.mock('@/lib/mapa/geeEvaluate', () => ({ evaluate: mocks.evaluate, GEE_TIMEOUT_MS: 1000 }))
vi.mock('@/lib/mapa/stockReport', () => ({ buildStockReport: mocks.buildStockReport }))
vi.mock('@/lib/mapa/geeImage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/geeImage')>(),
  buildEeImage: vi.fn(() => eeStub()),
}))

import { computeZonalStats } from '@/lib/mapa/zonalStats'

/**
 * Self-returning stub: every property access and every call yields the same
 * object, so any Earth Engine chain (`ee.Image(id).select(b).multiply(x)`,
 * `ee.Reducer.sum().repeat(3).group({})`) resolves without describing it.
 * What the test then pins is the branching and the shape of the result, which
 * is what an extraction can break; Earth Engine itself is not under test.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function eeStub(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler: ProxyHandler<any> = { get: () => stub, apply: () => stub }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stub: any = new Proxy(function noop() {}, handler)
  return stub
}

const geometry = {
  type: 'Polygon' as const,
  coordinates: [[[-40, -8], [-40, -7], [-39, -7], [-40, -8]]],
}
const stockAsset = {
  type: 'image' as const,
  id: 'projects/ee-arturlourenco/assets/caatinga_estoques', band: 'b1', scale: 100,
}
const continuousAsset = {
  type: 'image' as const,
  id: 'projects/mapbiomas-public/assets/brazil/soil/collection2/mapbiomas_soil_collection2_soc_t_ha_000_030cm',
  band: 'prediction_2023', scale: 30,
}

describe('computeZonalStats stock branch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the stock report for the configured layer', async () => {
    const outcome = await computeZonalStats(eeStub(), {
      asset: stockAsset, geometry, layerId: 'estoque_carbono',
    })

    expect(outcome).toMatchObject({ ok: true, result: { kind: 'stocks', report: { totalTc: 12 } } })
    expect(mocks.buildStockReport).toHaveBeenCalledOnce()
  })

  it('rejects a stock layer id paired with a different band', async () => {
    const outcome = await computeZonalStats(eeStub(), {
      asset: { ...stockAsset, band: 'b2' }, geometry, layerId: 'estoque_carbono',
    })

    expect(outcome).toEqual({ ok: false, error: 'layerId does not match the asset', status: 400 })
    expect(mocks.buildStockReport).not.toHaveBeenCalled()
  })
})

describe('computeZonalStats continuous branch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps the reducer keys onto ContinuousStats', async () => {
    mocks.evaluate.mockResolvedValueOnce({
      prediction_2023_mean: 24.3,
      prediction_2023_min: 11.2,
      prediction_2023_max: 48.9,
      prediction_2023_median: 22.5,
      prediction_2023_stdDev: 4.25,
      prediction_2023_count: 1200,
      prediction_2023_sum: 29160,
    })

    const outcome = await computeZonalStats(eeStub(), { asset: continuousAsset, geometry })

    expect(outcome).toEqual({
      ok: true,
      result: {
        kind: 'continuous',
        stats: { min: 11.2, max: 48.9, mean: 24.3, median: 22.5, std: 4.25, count: 1200, sum: 29160 },
      },
    })
  })

  it('reports 422 when the geometry holds no valid pixel', async () => {
    mocks.evaluate.mockResolvedValueOnce({})

    const outcome = await computeZonalStats(eeStub(), { asset: continuousAsset, geometry })

    expect(outcome).toEqual({
      ok: false, error: 'No valid pixels in the given geometry', status: 422,
    })
  })
})

describe('computeZonalStats categorical branch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sums area per class and normalizes float class codes to integers', async () => {
    mocks.evaluate.mockResolvedValueOnce({
      groups: [{ class: 3.0, sum: 1000 }, { class: 15, sum: 2500 }, { class: 3, sum: 500 }],
    })

    const outcome = await computeZonalStats(eeStub(), {
      asset: { type: 'image', id: 'x', band: 'classification_2024', scale: 30 },
      geometry, colorType: 'categorical',
    })

    expect(outcome).toEqual({
      ok: true, result: { kind: 'categorical', areas: { '3': 1500, '15': 2500 } },
    })
  })

  it('reports 422 when no class came back', async () => {
    mocks.evaluate.mockResolvedValueOnce({ groups: [] })

    const outcome = await computeZonalStats(eeStub(), {
      asset: { type: 'image', id: 'x', band: 'b1', scale: 30 },
      geometry, colorType: 'categorical',
    })

    expect(outcome).toMatchObject({ ok: false, status: 422 })
  })

  it('reuses the biome-wide breaks instead of sampling the feature', async () => {
    mocks.evaluate.mockResolvedValueOnce({ groups: [{ class: 1, sum: 400 }] })

    const outcome = await computeZonalStats(eeStub(), {
      asset: { type: 'image', id: 'x', band: 'Gpp', scale: 500 },
      geometry,
      classify: { numClasses: 5, method: 'jenks' },
      breaks: [228.6304, 293.3043, 351.413, 433.6087],
    })

    expect(outcome).toMatchObject({
      ok: true,
      result: { kind: 'categorical', areas: { '1': 400 } },
      breaks: [228.6304, 293.3043, 351.413, 433.6087],
    })
    // One evaluate only: the grouped reduction. Sampling would add a second.
    expect(mocks.evaluate).toHaveBeenCalledOnce()
  })

  it('ignores malformed client breaks and samples instead', async () => {
    mocks.evaluate
      .mockResolvedValueOnce([1, 2, 3, 4, 5, 6, 7, 8])          // sample values
      .mockResolvedValueOnce({ groups: [{ class: 2, sum: 900 }] }) // grouped areas

    const outcome = await computeZonalStats(eeStub(), {
      asset: { type: 'image', id: 'x', band: 'Gpp', scale: 500 },
      geometry,
      classify: { numClasses: 5, method: 'jenks' },
      breaks: ['nao', 'numerico'],
    })

    expect(outcome).toMatchObject({ ok: true, result: { kind: 'categorical' } })
    expect(mocks.evaluate).toHaveBeenCalledTimes(2)
  })

  it('reports 422 when sampling yields fewer values than classes', async () => {
    mocks.evaluate.mockResolvedValueOnce([1, 2])

    const outcome = await computeZonalStats(eeStub(), {
      asset: { type: 'image', id: 'x', band: 'Gpp', scale: 500 },
      geometry,
      classify: { numClasses: 5, method: 'jenks' },
    })

    expect(outcome).toEqual({
      ok: false, error: 'Not enough valid pixels (got 2)', status: 422,
    })
  })
})
