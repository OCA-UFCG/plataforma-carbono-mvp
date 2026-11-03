import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  evaluate: vi.fn<(obj: unknown, timeoutMs?: number) => Promise<unknown>>(),
  buildStockReport: vi.fn(async () => ({
    totalTc: 12, areaHa: 1, unit: 't C', pools: [], classes: [],
  })),
}))

vi.mock('@/lib/mapa/geeEvaluate', () => ({
  evaluate: mocks.evaluate, GEE_TIMEOUT_MS: 1000, GEE_RESULT_TIMEOUT_MS: 5000,
}))
vi.mock('@/lib/mapa/stockReport', () => ({ buildStockReport: mocks.buildStockReport }))
vi.mock('@/lib/mapa/geeImage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/geeImage')>(),
  buildEeImage: vi.fn(() => eeStub()),
}))

import { computeLayerResult } from '@/lib/mapa/layerResult'
import { getResultLayer } from '@/lib/mapa/resultsRegistry'

// Same self-returning stub as zonalStats.test.ts: any Earth Engine chain
// resolves, and the test pins what reaches `evaluate` and `ee.Geometry`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function eeStub(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler: ProxyHandler<any> = { get: () => stub, apply: () => stub }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stub: any = new Proxy(function noop() {}, handler)
  return stub
}

/** The stub, with `ee.Geometry` recording the geometry it was built from. */
function eeWithGeometrySpy() {
  const stub = eeStub()
  const Geometry = vi.fn<(g: unknown) => unknown>(() => stub)
  const ee = new Proxy(stub, { get: (_t, key) => (key === 'Geometry' ? Geometry : stub) })
  return { ee, Geometry }
}

const countVertices = (c: unknown): number =>
  Array.isArray(c) && c.length && typeof c[0] === 'number'
    ? 1
    : Array.isArray(c) ? c.reduce((n: number, x) => n + countVertices(x), 0) : 0

const biome = JSON.parse(
  readFileSync(path.join(process.cwd(), 'public/data/vector/limite_caatinga.geojson'), 'utf-8'),
).features[0].geometry

describe('computeLayerResult', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gives the panel its longer deadline', async () => {
    mocks.evaluate.mockResolvedValueOnce({ vA: 10, A: 1e4 })
    const entry = getResultLayer('gpp_modis')!
    const { ee } = eeWithGeometrySpy()

    await computeLayerResult(ee, { entry, geometry: biome, temporalDate: '2024-01-01' })

    expect(mocks.evaluate).toHaveBeenCalledOnce()
    expect(mocks.evaluate.mock.calls[0][1]).toBe(5000)
  })

  it('reduces over the boundary simplified to the scale it reads', async () => {
    mocks.evaluate.mockResolvedValueOnce({ vA: 10, A: 1e4 })
    const entry = getResultLayer('gpp_modis')!
    const { ee, Geometry } = eeWithGeometrySpy()

    await computeLayerResult(ee, { entry, geometry: biome, temporalDate: '2024-01-01' })

    expect(Geometry).toHaveBeenCalledOnce()
    const sent = Geometry.mock.calls[0][0] as GeoJSON.MultiPolygon
    expect(countVertices(sent.coordinates)).toBeLessThan(countVertices(biome.coordinates) / 4)
  })

  it('passes the deadline down to the stock report', async () => {
    const entry = getResultLayer('estoque_carbono')!
    const { ee } = eeWithGeometrySpy()

    await computeLayerResult(ee, { entry, geometry: biome })

    expect(mocks.buildStockReport).toHaveBeenCalledOnce()
    expect((mocks.buildStockReport.mock.calls[0] as unknown[]).at(-1)).toBe(5000)
  })
})
