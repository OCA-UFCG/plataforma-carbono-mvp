import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  RETRY_TILE_PROTOCOL,
  fetchTileWithRetry,
  withRetryProtocol,
  withoutRetryProtocol,
} from '@/lib/mapa/tileRetry'

const TILE = 'https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps/abc-def/tiles/10/403/535'

/** A fetch that answers call n with statuses[n], recording the URLs it was asked for. */
function scriptedFetch(statuses: number[]) {
  const calls: string[] = []
  const fetch = async (input: RequestInfo | URL) => {
    calls.push(String(input))
    const status = statuses[calls.length - 1]
    return new Response(status === 200 ? 'tile' : 'erro', { status })
  }
  return { fetch, calls }
}

/** A wait that returns at once, recording how long it was asked to wait. */
function recordedWait() {
  const waits: number[] = []
  return { waits, wait: async (ms: number) => { waits.push(ms) } }
}

describe('withRetryProtocol', () => {
  it('hands the tile template to the registered protocol and restores the https URL for the fetch', () => {
    const template = 'https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps/abc-def/tiles/{z}/{x}/{y}'
    const routed = withRetryProtocol(template)

    // MapLibre looks a protocol up by what precedes "://", and skips the
    // lookup for http(s) URLs.
    expect(routed.slice(0, routed.indexOf('://'))).toBe(RETRY_TILE_PROTOCOL)
    expect(withoutRetryProtocol(routed.replace('{z}/{x}/{y}', '10/403/535'))).toBe(TILE)
  })
})

describe('fetchTileWithRetry', () => {
  afterEach(() => { vi.useRealTimers() })

  it('returns the first answer when the tile loads', async () => {
    const { fetch, calls } = scriptedFetch([200])
    const { wait, waits } = recordedWait()

    const res = await fetchTileWithRetry(TILE, {}, { fetch, wait })

    expect(res.status).toBe(200)
    expect(calls).toEqual([TILE])
    expect(waits).toEqual([])
  })

  it.each([429, 500, 502, 503, 504])('asks again after a %i and returns the tile that follows', async (status) => {
    const { fetch, calls } = scriptedFetch([status, 200])
    const { wait } = recordedWait()

    const res = await fetchTileWithRetry(TILE, {}, { fetch, wait })

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('tile')
    expect(calls).toEqual([TILE, TILE])
  })

  it('waits before each new attempt, longer the second time', async () => {
    const { fetch } = scriptedFetch([503, 503, 200])
    const { wait, waits } = recordedWait()

    await fetchTileWithRetry(TILE, {}, { fetch, wait })

    expect(waits).toHaveLength(2)
    expect(waits[0]).toBeGreaterThan(0)
    expect(waits[1]).toBeGreaterThan(waits[0])
  })

  it('gives up after the third attempt and returns that failure', async () => {
    const { fetch, calls } = scriptedFetch([503, 503, 503, 200])
    const { wait } = recordedWait()

    const res = await fetchTileWithRetry(TILE, {}, { fetch, wait })

    expect(res.status).toBe(503)
    expect(calls).toHaveLength(3)
  })

  it.each([400, 403, 404])('does not ask again after a %i, which another attempt would not change', async (status) => {
    const { fetch, calls } = scriptedFetch([status, 200])
    const { wait, waits } = recordedWait()

    const res = await fetchTileWithRetry(TILE, {}, { fetch, wait })

    expect(res.status).toBe(status)
    expect(calls).toHaveLength(1)
    expect(waits).toEqual([])
  })

  it('stops when MapLibre drops the tile during the wait', async () => {
    vi.useFakeTimers()
    const { fetch, calls } = scriptedFetch([503, 200])
    const controller = new AbortController()

    const outcome = fetchTileWithRetry(TILE, { signal: controller.signal }, { fetch }).catch((err) => err)
    await vi.advanceTimersByTimeAsync(100)
    controller.abort()

    expect(await outcome).toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(calls).toHaveLength(1)
  })

  it('does not wait at all when the tile was already dropped', async () => {
    const controller = new AbortController()
    const fetch = async () => {
      controller.abort()
      return new Response('erro', { status: 503 })
    }

    await expect(fetchTileWithRetry(TILE, { signal: controller.signal }, { fetch })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('passes the request options through to every attempt', async () => {
    const inits: (RequestInit | undefined)[] = []
    const statuses = [503, 200]
    const fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      inits.push(init)
      return new Response('tile', { status: statuses[inits.length - 1] })
    }
    const { wait } = recordedWait()
    const controller = new AbortController()
    const init = { headers: { accept: 'image/webp,*/*' }, signal: controller.signal }

    await fetchTileWithRetry(TILE, init, { fetch, wait })

    expect(inits).toEqual([init, init])
  })
})
