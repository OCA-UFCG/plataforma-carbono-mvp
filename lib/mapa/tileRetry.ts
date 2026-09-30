// Earth Engine's tile server now and then answers a single tile with a 503
// (or a 429 under load) that renders fine when asked again moments later.
// MapLibre never re-requests a raster tile that failed with anything but a
// 404, so without a retry that tile stays a hole in the map until it leaves
// the tile cache. The GEE raster sources therefore point at a custom scheme
// whose handler (registered in MapView) fetches through fetchTileWithRetry.

/** Scheme of the GEE tile URLs handed to MapLibre, served by the retrying handler. */
export const RETRY_TILE_PROTOCOL = 'ee-retry'

/** Transient answers: the same tile succeeds on a later attempt. */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

/** Wait before each retry, so three attempts in all. */
const RETRY_DELAYS_MS = [500, 1500]

/** Route a GEE tile URL (or its {z}/{x}/{y} template) through the retrying handler. */
export function withRetryProtocol(url: string): string {
  return url.replace(/^https:\/\//, `${RETRY_TILE_PROTOCOL}://`)
}

/** The https URL the handler actually fetches. */
export function withoutRetryProtocol(url: string): string {
  return url.startsWith(`${RETRY_TILE_PROTOCOL}://`)
    ? `https://${url.slice(RETRY_TILE_PROTOCOL.length + 3)}`
    : url
}

/** setTimeout as a promise that rejects as soon as the tile's request is aborted. */
function wait(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Fetch a tile, asking again after a transient failure. Resolves with the
 * last response, successful or not, so the caller reports a failure the way
 * MapLibre reports any failed tile. Rejects with an AbortError when MapLibre
 * drops the tile (it left the viewport) while an attempt or a wait is pending.
 */
export async function fetchTileWithRetry(
  url: string,
  init: RequestInit,
  deps: {
    fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    wait?: (ms: number, signal?: AbortSignal | null) => Promise<void>
  } = {},
): Promise<Response> {
  const doFetch = deps.fetch ?? fetch
  const doWait = deps.wait ?? wait

  for (let attempt = 0; ; attempt++) {
    const res = await doFetch(url, init)
    if (!RETRYABLE_STATUS.has(res.status) || attempt >= RETRY_DELAYS_MS.length) return res
    await doWait(RETRY_DELAYS_MS[attempt], init.signal)
  }
}
