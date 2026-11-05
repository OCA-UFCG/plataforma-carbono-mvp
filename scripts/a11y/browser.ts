import puppeteer, { type Browser, type Page } from 'puppeteer-core'
import { sessionFor, type A11yRoute } from './routes'

/**
 * Headless Chrome for the accessibility checks. puppeteer-core downloads no
 * browser: it drives the system Chrome (CHROME_PATH), which the CI runners and
 * the development machines already have.
 *
 * Callbacks passed to page.evaluate run in the page, after tsx compiled them
 * with esbuild's keepNames: a named binding inside one (`const f = () => …`)
 * gets wrapped in __name(), which the page does not define. Keep them flat.
 */
export const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 }

const READY_TIMEOUT_MS = 15_000

export function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
    headless: true,
    // Ubuntu 24.04 runners block the user namespaces Chrome's sandbox needs.
    args: process.env.CI ? ['--no-sandbox'] : [],
  })
}

/** Resolves once the server answers below 500; the CI step starts it in the background. */
export async function waitForServer(baseUrl: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      const response = await fetch(baseUrl, { redirect: 'manual' })
      if (response.status < 500) return
    } catch {
      // Not listening yet.
    }
    if (Date.now() > deadline) throw new Error(`${baseUrl} did not answer within ${timeoutMs / 1000}s`)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

/**
 * Opens a route at 1440×900 and returns the page once it really rendered: the
 * response must be 200 and `route.ready` must appear. Anything else throws, so
 * an error page or a 404 never gets checked in the page's place.
 */
export async function openRoute(
  browser: Browser,
  baseUrl: string,
  route: A11yRoute,
  opts: { session?: string; reducedMotion?: boolean } = {},
): Promise<Page> {
  const page = await browser.newPage()
  await page.setViewport(VIEWPORT)
  // The cookie belongs to the whole browser, not to the page: a session route
  // sets it, and any other route clears what an earlier one left.
  const session = sessionFor(route, opts.session)
  if (session) {
    await browser.setCookie({ name: 'session', value: session, domain: new URL(baseUrl).hostname, path: '/' })
  } else {
    const left = (await browser.cookies()).filter((cookie) => cookie.name === 'session')
    if (left.length > 0) await browser.deleteCookie(...left)
  }
  if (opts.reducedMotion) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  }
  // 'load', then puppeteer's own count of requests in flight. Chrome's
  // networkidle2 lifecycle event never fired for /glossario at 1440 px under
  // reduced motion, with nothing in flight, so goto is not left waiting on it.
  const response = await page.goto(new URL(route.path, baseUrl).href, { waitUntil: 'load' })
  const status = response?.status()
  if (status !== 200) throw new Error(`status ${status ?? 'none'}`)
  await page.waitForNetworkIdle({ idleTime: 500, concurrency: 2, timeout: 30_000 })
  await page.waitForSelector(route.ready, { timeout: READY_TIMEOUT_MS })
  return page
}
