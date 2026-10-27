import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimeSeriesPoint } from '@/types/mapa'

const mocks = vi.hoisted(() => ({
  computeSeries: vi.fn<(ee: unknown, input: { region: { kind: string } }) => Promise<TimeSeriesPoint[]>>(),
}))

vi.mock('@/lib/mapa/zonalSeries', () => ({ computeSeries: mocks.computeSeries }))

import { RAIN_POINT_BELOW_HA } from '@/config/territorios/story'
import { computeTheme } from '@/lib/territorios/computeTheme'

const square = { type: 'Polygon' as const, coordinates: [[[-38.4, -4.1], [-38.3, -4.1], [-38.3, -4.0], [-38.4, -4.0], [-38.4, -4.1]]] }
const empty: TimeSeriesPoint[] = [{ date: '2024-01-01', value: null }]
const rained: TimeSeriesPoint[] = [{ date: '2024-01-01', value: 1651.8 }]

function answer(byKind: Record<string, TimeSeriesPoint[]>) {
  mocks.computeSeries.mockImplementation(async (_ee, input) => byKind[input.region.kind])
}

async function rain(areaHa: number) {
  const result = await computeTheme({}, { theme: 'chuva', geometry: square, areaHa })
  return { status: result.status, origin: result.origin, kinds: mocks.computeSeries.mock.calls.map(([, i]) => i.region.kind) }
}

describe('rain series of a territory', () => {
  // Braces: a function returned from beforeEach is run as its teardown.
  beforeEach(() => { mocks.computeSeries.mockReset() })

  it('reads a large territory as the mean over its cells', async () => {
    answer({ zonal: rained, point: rained })
    expect(await rain(RAIN_POINT_BELOW_HA)).toEqual({ status: 'available', origin: 'zonal', kinds: ['zonal'] })
  })

  it('falls back to the point when the mean of a large territory is empty', async () => {
    answer({ zonal: empty, point: rained })
    expect(await rain(RAIN_POINT_BELOW_HA * 2)).toEqual({ status: 'available', origin: 'point', kinds: ['zonal', 'point'] })
  })

  it('reads a small territory at a point', async () => {
    answer({ zonal: rained, point: rained })
    expect(await rain(600)).toEqual({ status: 'available', origin: 'point', kinds: ['point'] })
  })

  it('falls back to the mean when a small coastal territory has its point over the sea', async () => {
    answer({ zonal: rained, point: empty })
    expect(await rain(600)).toEqual({ status: 'available', origin: 'zonal', kinds: ['point', 'zonal'] })
  })

  it('reports no pixels only when neither read finds rain', async () => {
    answer({ zonal: empty, point: empty })
    expect(await rain(600)).toEqual({ status: 'no_pixels', origin: 'point', kinds: ['point', 'zonal'] })
  })

  it('lets a failed fallback read throw rather than settle on no pixels', async () => {
    mocks.computeSeries.mockImplementation(async (_ee, input) => {
      if (input.region.kind === 'zonal') throw new Error('Computation timed out.')
      return empty
    })
    await expect(rain(600)).rejects.toThrow('Computation timed out.')
  })
})
