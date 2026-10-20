import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  evaluate: vi.fn<(obj: unknown) => Promise<unknown>>(),
  buildEeImage: vi.fn((_ee: unknown, _asset: unknown, date?: string) => ({
    rename: (name: string) => ({ name, date }),
  })),
}))

vi.mock('@/lib/mapa/geeEvaluate', () => ({ evaluate: mocks.evaluate, GEE_TIMEOUT_MS: 1000 }))
vi.mock('@/lib/mapa/geeImage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/geeImage')>(),
  buildEeImage: mocks.buildEeImage,
}))

import { analysisScale } from '@/lib/mapa/layerResult'
import { reduceRecorteStats, SCALE_PIXEL_BUDGET } from '@/lib/mapa/recorteScaleCompute'
import { STATIC_KEY } from '@/lib/mapa/recorteScale'

/** Just enough of `ee` to record what the reduction is built from. */
function fakeEe() {
  const reduceRegion = vi.fn((args: unknown) => ({ reduction: args }))
  const cat = vi.fn((bands: unknown[]) => ({ bands, reduceRegion }))
  const ee = {
    Image: { cat },
    Reducer: {
      minMax: () => ({ combine: (opts: unknown) => ({ minMaxWith: opts }) }),
      percentile: (ps: number[]) => ({ percentile: ps }),
    },
    Geometry: (g: unknown) => ({ geometry: g }),
  }
  return { ee, cat, reduceRegion }
}

const asset = { type: 'imageCollection' as const, id: 'projects/x/esa', band: 'agb', scale: 100 }
const geometry = { type: 'Polygon' as const, coordinates: [[[-40, -8], [-40, -7], [-39, -7], [-40, -8]]] }

describe('reduceRecorteStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stacks one band per year, each built by buildEeImage at January 1st', async () => {
    mocks.evaluate.mockResolvedValueOnce({})
    const { ee, cat } = fakeEe()

    await reduceRecorteStats(ee, asset, ['2010', '2020'], geometry, 1e9)

    expect(mocks.buildEeImage.mock.calls.map((c) => c[2])).toEqual(['2010-01-01', '2020-01-01'])
    expect(cat).toHaveBeenCalledWith([
      { name: 'y2010', date: '2010-01-01' },
      { name: 'y2020', date: '2020-01-01' },
    ])
  })

  it('builds a static layer without a date', async () => {
    mocks.evaluate.mockResolvedValueOnce({})
    const { ee } = fakeEe()

    await reduceRecorteStats(ee, asset, [STATIC_KEY], geometry, 1e9)

    expect(mocks.buildEeImage.mock.calls[0][2]).toBeUndefined()
  })

  it('shares the pixel budget across the years, so a long series is read coarser', async () => {
    mocks.evaluate.mockResolvedValueOnce({})
    const { ee, reduceRegion } = fakeEe()
    const years = Array.from({ length: 39 }, (_, i) => String(1985 + i))
    const regionM2 = 5.6e11   // roughly Bahia's share of the Caatinga

    await reduceRecorteStats(ee, { ...asset, scale: 30 }, years, geometry, regionM2)

    const scale = analysisScale(30, regionM2, SCALE_PIXEL_BUDGET / 39)
    expect(scale).toBeGreaterThan(analysisScale(30, regionM2))
    expect(reduceRegion).toHaveBeenCalledWith(expect.objectContaining({ scale, bestEffort: true }))
  })

  it('returns the numbers of each year, null where the year had none', async () => {
    mocks.evaluate.mockResolvedValueOnce({ y2010_min: 1, y2010_max: 9, y2010_p2: 2, y2010_p98: 8 })
    const { ee } = fakeEe()

    await expect(reduceRecorteStats(ee, asset, ['2010', '2020'], geometry, 1e9)).resolves.toEqual({
      '2010': { min: 1, max: 9, p2: 2, p98: 8 },
      '2020': { min: null, max: null, p2: null, p98: null },
    })
  })
})
