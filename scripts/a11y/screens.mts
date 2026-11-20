/**
 * The no-visual-change guard (spec decision 2, §6 A.6): every accessibility PR
 * captures the routes of scripts/a11y/routes.ts before and after, at 1440 px,
 * and the comparison must find 0 differing pixels.
 *
 *   A11Y_BASE_URL=http://localhost:3100 npm run a11y:screens -- capture <dir> [--print] [path …]
 *   npm run a11y:screens -- compare <beforeDir> <afterDir> <diffDir>
 *
 * A full capture (no path arguments) empties <dir> of .png files first, so it holds
 * only this run; a capture of named paths keeps the other screenshots. It empties
 * only a directory an earlier capture marked (.a11y-capture) or a new, empty one,
 * and only after the server answered and the browser launched, so a run that fails
 * early leaves the previous capture in place. It takes
 * the same env as check.mts (A11Y_SESSION adds /mapa). Nothing presses a key, so
 * UI that only the keyboard brings up (decision 2b) never shows in either capture.
 *
 * --print captures under the print media type instead of the screen one, for the
 * PRs that touch what prints (workstreams D and E). Give it a directory of its
 * own: `compare` pairs files by name, so a print capture against a screen one
 * would differ on every route. It still takes the page at 1440 px, so it guards
 * the @media print rules, not the paper's page breaks.
 */
import { join } from 'node:path'
import { launchBrowser, openRoute, waitForServer } from './browser'
import { compareScreens, prepareCaptureDir } from './compare'
import { routesToRun, screenshotName } from './routes'
import { parseScreensArgs, SCREENS_USAGE } from './screensArgs'

// What varies between two captures of the same code, hidden from both:
// canvases hold map tiles and animation frames; nextjs-portal is the dev
// overlay; the caret blinks.
const FREEZE_CSS = `
  canvas { visibility: hidden !important; }
  nextjs-portal { display: none !important; }
  * { caret-color: transparent !important; }
`

async function capture(dir: string, paths: string[], print: boolean) {
  const baseUrl = process.env.A11Y_BASE_URL ?? 'http://localhost:3000'
  const session = process.env.A11Y_SESSION || undefined
  const routes = routesToRun(paths, Boolean(session))
  await waitForServer(baseUrl)
  const browser = await launchBrowser()
  let failed = false
  try {
    // After the browser is up, not before: a run that failed to start (server
    // still booting, wrong port, bad CHROME_PATH) must not have emptied the
    // previous capture. The finally below still closes the browser if this throws.
    prepareCaptureDir(dir, { empty: paths.length === 0 })
    for (const route of routes) {
      try {
        // Reduced motion holds the hero on its first photo (Hero.tsx) and the
        // scenes still; both sides of a comparison are captured the same way.
        const page = await openRoute(browser, baseUrl, route, { session, reducedMotion: true })
        try {
          if (print) await page.emulateMediaType('print')
          await page.addStyleTag({ content: FREEZE_CSS })
          // Walk down one viewport at a time so lazy images load, then back up.
          // 'instant' overrides globals.css's `scroll-behavior: smooth`, which
          // would still be gliding to the top when the screenshot is taken.
          await page.evaluate(async () => {
            for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
              window.scrollTo({ top: y, behavior: 'instant' })
              await new Promise((resolve) => setTimeout(resolve, 100))
            }
            window.scrollTo({ top: 0, behavior: 'instant' })
          })
          // Only rendered images: a lazy image in a hidden tab panel never loads,
          // and it does not show in the screenshot either.
          await page.waitForFunction(
            () => Array.from(document.images).every((image) => image.complete || image.getClientRects().length === 0),
            { timeout: 15_000 },
          )
          // `complete` turns true before an image with decoding="async" is painted:
          // wait for the decode of every rendered one, or a photo can be missing
          // from one capture and present in the next. Each decode is raced against
          // a 5 s timer: an image that changed src below the fold may never load,
          // and the wait must then end here, not at puppeteer's protocol timeout.
          await page.evaluate(() =>
            Promise.all(
              Array.from(document.images)
                .filter((image) => image.getClientRects().length > 0)
                .map((image) =>
                  Promise.race([image.decode().catch(() => undefined), new Promise((resolve) => setTimeout(resolve, 5_000))]),
                ),
            ).then(() => undefined),
          )
          await page.evaluate(() => document.fonts.ready.then(() => undefined))
          await new Promise((resolve) => setTimeout(resolve, 500))
          const file = join(dir, screenshotName(route.path)) as `${string}.png`
          await page.screenshot({ path: file, fullPage: true })
          console.log(`✓ ${route.path} → ${file}`)
        } finally {
          await page.close()
        }
      } catch (error) {
        failed = true
        console.log(`✗ ${route.path}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  } finally {
    await browser.close()
  }
  return failed ? 1 : 0
}

const parsed = parseScreensArgs(process.argv.slice(2))
if ('error' in parsed) {
  console.error(parsed.error)
  console.error(SCREENS_USAGE)
  process.exit(2)
}
if (parsed.command === 'capture') {
  process.exit(await capture(parsed.dir, parsed.paths, parsed.print))
}
process.exit(compareScreens(parsed.beforeDir, parsed.afterDir, parsed.diffDir))
