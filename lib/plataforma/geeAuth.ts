// Server-only helper, do not import from client components.

import { readFileSync } from 'node:fs'

// @google/earthengine ships without TypeScript types, so we treat it as `any`
// at the boundary and narrow where it matters.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const ee: any = require('@google/earthengine')

let initPromise: Promise<void> | null = null

/**
 * Authenticates with Google Earth Engine using the Service Account key file
 * pointed to by the `GOOGLE_APPLICATION_CREDENTIALS` env var, then initializes
 * the EE client. Memoized, subsequent calls return the same promise.
 *
 * On failure the cached promise is cleared so the next caller can retry.
 */
export function initGee(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = new Promise<void>((resolve, reject) => {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if (!keyPath) {
      reject(new Error('GOOGLE_APPLICATION_CREDENTIALS env var is not set'))
      return
    }

    // Turbopack rejects dynamic `require()` calls, so read the JSON at runtime
    // via fs instead. This is a plain filesystem read, no module resolution.
    let key: unknown
    try {
      const contents = readFileSync(keyPath, 'utf-8')
      key = JSON.parse(contents)
    } catch (err) {
      // Log the path server-side only, never surface it to the client, as
      // the key filename embeds the GCP project id.
      console.error(`[geeAuth] failed to load service account key at ${keyPath}:`, err)
      reject(new Error('Failed to load service account key'))
      return
    }

    ee.data.authenticateViaPrivateKey(
      key,
      () => {
        ee.initialize(
          null,
          null,
          () => {
            // Cap how long any single GEE RPC may block before erroring, so a
            // stuck computation can't hang the request forever.
            try { ee.data.setDeadline(60_000) } catch { /* older SDKs: no-op */ }
            resolve()
          },
          (err: unknown) => {
            console.error('[geeAuth] ee.initialize failed:', err)
            reject(new Error('Earth Engine initialization failed'))
          },
        )
      },
      (err: unknown) => {
        console.error('[geeAuth] authenticateViaPrivateKey failed:', err)
        reject(new Error('Earth Engine authentication failed'))
      },
    )
  }).catch((err) => {
    // Clear the cache so the next caller can retry from scratch
    initPromise = null
    throw err
  })

  return initPromise
}

/** Expose the ee namespace to callers after a successful initGee(). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEe(): any {
  return ee
}
