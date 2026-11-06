/**
 * Runs axe-core on the routes of scripts/a11y/routes.ts and fails on serious
 * or critical violations that scripts/a11y/known.ts does not forgive (spec
 * §6 A.5). CI runs it against the production build; locally, against any
 * server:
 *
 *   A11Y_BASE_URL=http://localhost:3100 npm run a11y [-- /login /cadastro]
 *
 * A11Y_SESSION (a `session` cookie value, see session.mts) adds the platform's
 * routes; CHROME_PATH overrides /usr/bin/google-chrome.
 */
import axe from 'axe-core'
import type { RunOptions } from 'axe-core'
import { launchBrowser, openRoute, waitForServer } from './browser'
import { judge, passed, type Impact, type RouteOutcome } from './judge'
import { KNOWN_VIOLATIONS } from './known'
import { routesToRun } from './routes'

declare global {
  interface Window {
    axe: typeof import('axe-core')
  }
}

// 'incomplete' is where axe puts what it could not decide, text over a photo
// among it (the hero). It does not fail the run, but it is printed.
const AXE_OPTIONS: RunOptions = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
  resultTypes: ['violations', 'incomplete'],
}

type Undecided = { path: string; rule: string; help: string; nodes: number }

/** The first few selectors of a violation, one per line, and how many more there are. */
function listTargets(targets: readonly string[], shown = 3): string {
  const lines = targets.slice(0, shown)
  if (targets.length > shown) lines.push(`… and ${targets.length - shown} more`)
  return lines.join('\n      ')
}

const baseUrl = process.env.A11Y_BASE_URL ?? 'http://localhost:3000'
const session = process.env.A11Y_SESSION || undefined
const routes = routesToRun(process.argv.slice(2), Boolean(session))

await waitForServer(baseUrl)
const browser = await launchBrowser()
const outcomes: RouteOutcome[] = []
const undecided: Undecided[] = []

try {
  for (const route of routes) {
    try {
      // Reduced motion, as in screens.mts: the hero advances and the scenes
      // fade on their own, so axe would otherwise sample a moving page.
      const page = await openRoute(browser, baseUrl, route, { session, reducedMotion: true })
      try {
        await page.evaluate(axe.source)
        const results = await page.evaluate((options) => window.axe.run(document, options), AXE_OPTIONS)
        for (const item of results.incomplete) {
          undecided.push({ path: route.path, rule: item.id, help: item.help, nodes: item.nodes.length })
        }
        outcomes.push({
          path: route.path,
          violations: results.violations.map((v) => ({
            rule: v.id,
            impact: (v.impact ?? null) as Impact | null,
            help: v.help,
            targets: v.nodes.map((node) => node.target.join(' ')),
          })),
        })
      } finally {
        await page.close()
      }
    } catch (error) {
      outcomes.push({ path: route.path, error: error instanceof Error ? error.message : String(error), violations: [] })
    }
  }
} finally {
  await browser.close()
}

for (const outcome of outcomes) {
  if (outcome.error !== undefined) {
    console.log(`✗ ${outcome.path}: did not load (${outcome.error})`)
  } else if (outcome.violations.length === 0) {
    console.log(`✓ ${outcome.path}`)
  } else {
    console.log(`• ${outcome.path}`)
    for (const v of outcome.violations) console.log(`    ${v.impact ?? 'n/a'}  ${v.rule}: ${v.help}\n      ${listTargets(v.targets)}`)
  }
}

if (undecided.length > 0) {
  console.log('\nAxe could not decide these; look at them by hand (they do not fail the run):')
  for (const item of undecided) console.log(`  ${item.path}  ${item.rule}: ${item.help} (${item.nodes} node(s))`)
}

const verdict = judge(outcomes, KNOWN_VIOLATIONS)
for (const v of verdict.unexpected) console.log(`\nFAIL ${v.path}: ${v.impact} ${v.rule} (${v.targets.join(', ')})`)
for (const e of verdict.errors) console.log(`\nFAIL ${e.path}: did not load (${e.error})`)
for (const k of verdict.stale) console.log(`\nFAIL stale entry in scripts/a11y/known.ts: ${k.rule} on ${k.path} no longer occurs; delete it.`)
console.log(passed(verdict) ? `\naxe: ${outcomes.length} route(s) pass.` : '\naxe: failed.')
process.exit(passed(verdict) ? 0 : 1)
