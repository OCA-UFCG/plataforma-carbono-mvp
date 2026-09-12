import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  evaluate: vi.fn<(obj: unknown) => Promise<unknown>>(),
  buildEeImage: vi.fn(() => eeStub()),
}))

vi.mock('@/lib/mapa/geeEvaluate', () => ({ evaluate: mocks.evaluate, GEE_TIMEOUT_MS: 1000 }))
vi.mock('@/lib/mapa/geeImage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/geeImage')>(),
  buildEeImage: mocks.buildEeImage,
}))

import { anosDoIntervalo, computeSeries, MAX_ANOS } from '@/lib/mapa/zonalSeries'

/** Self-returning stub; see the note in tests/lib/zonalStats.test.ts. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function eeStub(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler: ProxyHandler<any> = { get: () => stub, apply: () => stub }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stub: any = new Proxy(function noop() {}, handler)
  return stub
}

const imageAsset = {
  type: 'image' as const,
  id: 'projects/mapbiomas-public/assets/x',
  bandPattern: 'classification_{ano}',
  scale: 30,
}
const collectionAsset = {
  type: 'imageCollection' as const,
  id: 'UCSB-CHG/CHIRPS/DAILY', band: 'precipitation', reducer: 'sum' as const, scale: 5566,
}
const polygon = {
  type: 'Polygon' as const,
  coordinates: [[[-40, -8], [-40, -7], [-39, -7], [-40, -8]]],
}

describe('anosDoIntervalo', () => {
  it('expands an ISO range into years', () => {
    expect(anosDoIntervalo(['2020-01-01', '2023-01-01'])).toEqual([2020, 2021, 2022, 2023])
  })

  it('rejects a malformed, inverted or oversized range', () => {
    expect(anosDoIntervalo('2020')).toBeNull()
    expect(anosDoIntervalo(['2023-01-01', '2020-01-01'])).toBeNull()
    expect(anosDoIntervalo(['1900-01-01', '2100-01-01'])).toBeNull()
    expect(anosDoIntervalo([`${2000}-01-01`, `${2000 + MAX_ANOS}-01-01`])).toBeNull()
  })
})

describe('computeSeries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds one band per year through buildEeImage and reads them in one evaluate', async () => {
    mocks.evaluate.mockResolvedValueOnce({ a2021: 10, a2022: 20, a2023: 30 })

    const series = await computeSeries(eeStub(), {
      asset: imageAsset,
      anos: [2021, 2022, 2023],
      region: { kind: 'zonal', geometry: polygon, scale: 300 },
    })

    expect(series).toEqual([
      { date: '2021-01-01', value: 10 },
      { date: '2022-01-01', value: 20 },
      { date: '2023-01-01', value: 30 },
    ])
    // One image per year, each through buildEeImage: that is what keeps the
    // chart in the same unit and under the same mask as the map.
    expect(mocks.buildEeImage).toHaveBeenCalledTimes(3)
    expect(mocks.buildEeImage.mock.calls.map((c) => c[2])).toEqual([
      '2021-01-01', '2022-01-01', '2023-01-01',
    ])
    expect(mocks.evaluate).toHaveBeenCalledOnce()
  })

  it('turns a missing or non-finite year into null instead of zero', async () => {
    // A zero here would be read as a real measurement of no rain.
    mocks.evaluate.mockResolvedValueOnce({ a2021: 10, a2022: null })

    const series = await computeSeries(eeStub(), {
      asset: imageAsset,
      anos: [2021, 2022, 2023],
      region: { kind: 'point', lon: -39.5, lat: -7.5 },
    })

    expect(series).toEqual([
      { date: '2021-01-01', value: 10 },
      { date: '2022-01-01', value: null },
      { date: '2023-01-01', value: null },
    ])
  })

  it('drops years a gapped collection does not have, before assembling', async () => {
    // ESA CCI only has 2007, 2010 and 2015 onward: asking for an empty year
    // makes the reducer return a band-less image and the whole assembly fail.
    mocks.evaluate
      .mockResolvedValueOnce([2015, 2016])                    // years present
      .mockResolvedValueOnce({ a2015: 26.5, a2016: 27.1 })    // the reduction

    const series = await computeSeries(eeStub(), {
      asset: collectionAsset,
      anos: [2014, 2015, 2016],
      region: { kind: 'zonal', geometry: polygon },
    })

    expect(series).toEqual([
      { date: '2015-01-01', value: 26.5 },
      { date: '2016-01-01', value: 27.1 },
    ])
  })

  it('returns an empty series when a gapped collection has none of the years', async () => {
    mocks.evaluate.mockResolvedValueOnce([])

    const series = await computeSeries(eeStub(), {
      asset: collectionAsset,
      anos: [2001, 2002],
      region: { kind: 'zonal', geometry: polygon },
    })

    expect(series).toEqual([])
    // No point reducing anything: the availability query settles it.
    expect(mocks.evaluate).toHaveBeenCalledOnce()
  })

  it('skips the availability query for a band-pattern asset', async () => {
    // The year is in the band name, so there is no collection to interrogate.
    mocks.evaluate.mockResolvedValueOnce({ a2023: 5 })

    await computeSeries(eeStub(), {
      asset: imageAsset,
      anos: [2023],
      region: { kind: 'zonal', geometry: polygon },
    })

    expect(mocks.evaluate).toHaveBeenCalledOnce()
  })
})
