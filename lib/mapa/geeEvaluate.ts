/**
 * Deadline of a single Earth Engine RPC, process-wide. A cold reduction over
 * the whole biome takes 40 to 65 s even with its boundary simplified; the
 * server caches the answer (lib/mapa/resultCache.ts), so only the first person
 * to ask pays for it.
 */
export const GEE_DEADLINE_MS = 150_000

/**
 * How long every route's handler waits for a computation before it gives up.
 * A few seconds past the RPC deadline, so no handler gives up before its
 * Earth Engine request ends.
 */
export const GEE_TIMEOUT_MS = GEE_DEADLINE_MS + 5_000

/**
 * Reject with a timeout error if `p` doesn't settle within `ms`. The
 * underlying GEE request may keep running server-side, but the HTTP handler
 * is freed instead of hanging indefinitely (the `ee.evaluate` callback has
 * no deadline of its own beyond `ee.data.setDeadline`).
 */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer)) as Promise<T>
}

/**
 * Promisify the callback-based `ee.ComputedObject.evaluate()` API.
 *
 * All GEE API routes use this pattern to await server-side computation
 * that Earth Engine performs asynchronously. The underlying `evaluate`
 * method takes a `(result, error) => void` callback; this helper wraps
 * it into a standard `Promise` for use with async/await, bounded by a
 * timeout so a stuck computation can't hang the request forever.
 *
 * Typed as `any` because `@google/earthengine` ships without TypeScript
 * declarations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function evaluate<T>(eeObj: any, timeoutMs = GEE_TIMEOUT_MS): Promise<T> {
  return withTimeout(
    new Promise<T>((resolve, reject) => {
      eeObj.evaluate((result: unknown, err: unknown) => {
        if (err) reject(new Error(String(err)))
        else resolve(result as T)
      })
    }),
    timeoutMs,
    'ee.evaluate',
  )
}
