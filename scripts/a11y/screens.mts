/**
 * The no-visual-change guard (spec decision 2, §6 A.6): every accessibility PR
 * captures the routes of scripts/a11y/routes.ts before and after, at 1440 px,
 * and the comparison must find 0 differing pixels.
 *
 *   A11Y_BASE_URL=http://localhost:3100 npm run a11y:screens -- capture <dir> [path …]
 *   npm run a11y:screens -- compare <beforeDir> <afterDir> <diffDir>
 *
 * Capture empties <dir> of .png files first, so it holds only this run. It takes
 * the same env as check.mts (A11Y_SESSION adds /mapa). Nothing
 * presses a key, so UI that only the keyboard brings up (decision 2b) never
 * shows in either capture.
 */
import { join } from 'node:path'
import { launchBrowser, openRoute, waitForServer } from './browser'
import { compareScreens, prepareCaptureDir } from './compare'
import { routesToRun, screenshotName } from './routes'

// What varies between two captures of the same code, hidden from both:
// canvases hold map tiles and animation frames; nextjs-portal is the dev
// overlay; the caret blinks.
const FREEZE_CSS = `
  canvas { visibility: hidden !important; }
  nextjs-portal { display: none !important; }
  * { caret-color: transparent !important; }
`

async function capture(dir: string, paths: string[]) {
  const baseUrl = process.env.A11Y_BASE_URL ?? 'http://localhost:3000'
  const session = process.env.A11Y_SESSION || undefined
  const routes = routesToRun(paths, Boolean(session))
  prepareCaptureDir(dir)
  await waitForServer(baseUrl)
  const browser = await launchBrowser()
  let failed = false
  try {
    for (const route of routes) {
      try {
        // Reduced motion holds the hero on its first photo (Hero.tsx) and the
        // scenes still; both sides of a comparison are captured the same way.
        const page = await openRoute(browser, baseUrl, route, { session, reducedMotion: true })
        try {
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

const [command, ...args] = process.argv.slice(2)
if (command === 'capture' && args[0]) {
  process.exit(await capture(args[0], args.slice(1)))
} else if (command === 'compare' && args.length === 3) {
  process.exit(compareScreens(args[0], args[1], args[2]))
} else {
  console.error('usage: a11y:screens capture <dir> [path …] | compare <beforeDir> <afterDir> <diffDir>')
  process.exit(2)
}
