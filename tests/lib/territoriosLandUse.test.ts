import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ZonalStatsOutcome } from '@/lib/mapa/zonalStats'

const mocks = vi.hoisted(() => {
  // Stands for every Earth Engine object: each call or property gives it back,
  // so the series builds its 82 bands without a server. No `then`, or an await
  // would take it for a promise.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ee: any = new Proxy(function () {}, {
    get: (_target, key) => (key === 'then' ? undefined : ee),
    apply: () => ee,
  })
  return {
    ee,
    computeZonalStats: vi.fn<() => Promise<ZonalStatsOutcome>>(),
    evaluate:          vi.fn<() => Promise<unknown>>(),
  }
})

vi.mock('@/lib/mapa/zonalStats', () => ({ computeZonalStats: mocks.computeZonalStats }))
vi.mock('@/lib/mapa/geeEvaluate', () => ({ evaluate: mocks.evaluate }))
vi.mock('@/lib/mapa/geeImage', () => ({ buildEeImage: () => mocks.ee }))

import { computeTheme } from '@/lib/territorios/computeTheme'

const square = { type: 'Polygon' as const, coordinates: [[[-38.4, -4.1], [-38.3, -4.1], [-38.3, -4.0], [-38.4, -4.0], [-38.4, -4.1]]] }
const areas = (native: number, farming: number): ZonalStatsOutcome =>
  ({ ok: true, result: { kind: 'categorical', areas: { 3: native, 15: farming } } })

const landUse = () => computeTheme(mocks.ee, { theme: 'uso', geometry: square, areaHa: 10_000 })

describe('land use of a territory', () => {
  beforeEach(() => {
    mocks.computeZonalStats.mockReset()
    mocks.evaluate.mockReset()
    mocks.computeZonalStats.mockResolvedValueOnce(areas(60, 40)).mockResolvedValueOnce(areas(45, 55))
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('reads the yearly native share beside the two years of the step', async () => {
    mocks.evaluate.mockResolvedValue({ native_1985: 60, mapped_1985: 100, native_2025: 45, mapped_2025: 100 })
    const result = await landUse()
    expect(result.status).toBe('available')
    if (result.data?.theme !== 'uso') throw new Error('no land use data')
    expect(result.data.series?.find((p) => p.year === 1985)).toEqual({ year: 1985, sharePct: 60 })
    expect(result.data.series?.find((p) => p.year === 2000)).toEqual({ year: 2000, sharePct: null })
    expect(result.data.series?.at(-1)).toEqual({ year: 2025, sharePct: 45 })
  })

  it('keeps the step when the yearly series fails, only without the series', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.evaluate.mockRejectedValue(new Error('ee.evaluate timed out after 155000ms'))
    const result = await landUse()
    expect(result.status).toBe('available')
    expect(result.data).toEqual({ theme: 'uso', areas: { '1985': { 3: 60, 15: 40 }, '2025': { 3: 45, 15: 55 } }, series: null })
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('yearly series failed'))
  })

  it('still fails when a year of the step fails', async () => {
    mocks.computeZonalStats.mockReset()
    mocks.computeZonalStats.mockResolvedValue({ ok: false, error: 'Computation timed out.', status: 504 })
    mocks.evaluate.mockResolvedValue({})
    await expect(landUse()).rejects.toThrow()
  })
})
