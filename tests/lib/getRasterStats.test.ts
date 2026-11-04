import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRasterStats } from '@/lib/mapa/getRasterStats'
import type { RasterLayerConfig } from '@/types/mapa'

const layer: RasterLayerConfig = {
  id: 'estoque_carbono', name: 'estoque_carbono', type: 'raster', visible: true, opacity: 80,
  colorType: 'continuous', source: 'gee',
  gee: { asset: { type: 'image', id: 'projects/x/estoque_carbono' } },
}
const feature = {
  type: 'Feature' as const,
  geometry: {
    type: 'Polygon' as const,
    coordinates: [[[-40, -8], [-39, -8], [-39, -7], [-40, -7], [-40, -8]]],
  },
}
const answer = { kind: 'amount', total: 1, validHa: 1, zeroHa: 0, bins: [], scaleM: 500 }

/** A fetch that stays open until its signal aborts or the test settles it. */
function stubFetch() {
  const calls: { signal?: AbortSignal; settle: () => void }[] = []
  const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((resolve, reject) => {
    const signal = init.signal ?? undefined
    calls.push({ signal, settle: () => resolve(Response.json(answer)) })
    signal?.addEventListener('abort', () => reject(signal.reason))
  }))
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

describe('getRasterStats', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('hands its signal to the request, and an abort ends it', async () => {
    const { calls } = stubFetch()
    const controller = new AbortController()
    const running = getRasterStats(layer, feature, undefined, controller.signal)
    await vi.waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].signal).toBe(controller.signal)

    const reason = new Error('superseded')
    controller.abort(reason)
    await expect(running).rejects.toBe(reason)
  })

  it('shares one request between identical asks of the same selection', async () => {
    const { fetchMock, calls } = stubFetch()
    const controller = new AbortController()
    const a = getRasterStats(layer, feature, undefined, controller.signal)
    const b = getRasterStats(layer, feature, undefined, controller.signal)
    await vi.waitFor(() => expect(calls).toHaveLength(1))
    calls[0].settle()

    await expect(Promise.all([a, b])).resolves.toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('does not hand an abandoned request to a new selection', async () => {
    const { fetchMock, calls } = stubFetch()
    const old = new AbortController()
    const abandoned = getRasterStats(layer, feature, undefined, old.signal)
    abandoned.catch(() => {})
    await vi.waitFor(() => expect(calls).toHaveLength(1))
    old.abort()

    const fresh = getRasterStats(layer, feature, undefined, new AbortController().signal)
    await vi.waitFor(() => expect(calls).toHaveLength(2))
    calls[1].settle()

    await expect(fresh).resolves.toMatchObject({ kind: 'amount' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
