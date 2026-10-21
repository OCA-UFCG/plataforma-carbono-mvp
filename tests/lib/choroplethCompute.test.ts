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

import { CHOROPLETH_MIN_SCALE_M, parseChoropleth, reduceChoropleth } from '@/lib/mapa/choroplethCompute'
import { STATIC_KEY } from '@/lib/mapa/choropleth'

/** Just enough of `ee` to record what the reduction is built from. */
function fakeEe() {
  const reduceRegions = vi.fn((args: unknown) => ({ reduced: args, select: vi.fn((...a: unknown[]) => ({ selected: a })) }))
  const cat = vi.fn((bands: unknown[]) => ({ bands, reduceRegions }))
  const setOutputs = vi.fn((names: string[]) => ({ mean: true, outputs: names }))
  const filterDate = vi.fn((from: string, to: string) => ({
    size: () => ({ gt: (n: number) => ({ imagesIn: [from, to], moreThan: n }) }),
  }))
  const ee = {
    Image: Object.assign((image: unknown) => image, {
      cat,
      constant: (value: number) => ({
        updateMask: (mask: number) => ({ rename: (name: string) => ({ constant: value, masked: mask === 0, name }) }),
      }),
    }),
    ImageCollection: (id: string) => ({ id, filterDate }),
    Algorithms: { If: (c: unknown, a: unknown, b: unknown) => ({ if: c, then: a, else: b }) },
    FeatureCollection: (features: unknown[]) => ({ features }),
    Feature: (geometry: unknown, props: unknown) => ({ geometry, props }),
    Geometry: (g: unknown) => ({ geometry: g }),
    Reducer: { mean: () => ({ mean: true, setOutputs }) },
  }
  return { ee, cat, reduceRegions, setOutputs, filterDate }
}

const polygon = { type: 'Polygon' as const, coordinates: [[[-40, -8], [-40, -7], [-39, -7], [-40, -8]]] }
const features = [{ index: 0, geometry: polygon }, { index: 2, geometry: polygon }]
const collection = { type: 'imageCollection' as const, id: 'projects/x/chirps', band: 'precipitation', scale: 5566 }
const image = { type: 'image' as const, id: 'projects/x/stock', band: 'b1', scale: 100 }

describe('reduceChoropleth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reduces the mean of every year over every feature, tagged with its file position', async () => {
    mocks.evaluate.mockResolvedValueOnce({ features: [] })
    const { ee, reduceRegions } = fakeEe()

    await reduceChoropleth(ee, collection, ['2010', '2020'], features)

    const args = reduceRegions.mock.calls[0][0] as Record<string, unknown>
    expect(args).toMatchObject({ reducer: { mean: true }, scale: 5566, tileScale: 4 })
    expect(args.collection).toEqual({ features: [
      { geometry: { geometry: polygon }, props: { i: 0 } },
      { geometry: { geometry: polygon }, props: { i: 2 } },
    ] })
  })

  it('reads at least at the minimum scale, coarser than a 100 m layer', async () => {
    mocks.evaluate.mockResolvedValueOnce({ features: [] })
    const { ee, reduceRegions } = fakeEe()

    await reduceChoropleth(ee, image, [STATIC_KEY], features)

    expect(reduceRegions.mock.calls[0][0]).toMatchObject({ scale: CHOROPLETH_MIN_SCALE_M })
  })

  it("names a single band's output after the band, not after the reducer", async () => {
    mocks.evaluate.mockResolvedValueOnce({ features: [] })
    const { ee, setOutputs } = fakeEe()

    await reduceChoropleth(ee, image, [STATIC_KEY], features)

    expect(setOutputs).toHaveBeenCalledWith(['ystatic'])
  })

  it("turns a collection's year without images into a masked band", async () => {
    mocks.evaluate.mockResolvedValueOnce({ features: [] })
    const { ee, cat } = fakeEe()

    await reduceChoropleth(ee, collection, ['2010', '2030'], features)

    expect(cat.mock.calls[0][0][1]).toEqual({
      if: { imagesIn: ['2030-01-01', '2031-01-01'], moreThan: 0 },
      then: { name: 'y2030', date: '2030-01-01' },
      else: { constant: 0, masked: true, name: 'y2030' },
    })
  })
})

describe('parseChoropleth', () => {
  it('lays the values out by year and feature index, rounded, null where missing', () => {
    const out = { features: [
      { properties: { i: 2, y2010: 12.34567, y2020: null } },
      { properties: { i: 0, y2010: 1 } },
    ] }

    expect(parseChoropleth(out, ['2010', '2020'], features)).toEqual([
      [1, null, 12.35],
      [null, null, null],
    ])
  })

  it('answers every feature with null when Earth Engine returned nothing', () => {
    expect(parseChoropleth(null, [STATIC_KEY], features)).toEqual([[null, null, null]])
  })
})
