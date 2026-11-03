import type { KnownViolation } from './known'

export type Impact = 'minor' | 'moderate' | 'serious' | 'critical'

export type RouteViolation = { rule: string; impact: Impact | null; help: string; targets: string[] }

/** One visited route: its violations, or the error that kept axe from running on it. */
export type RouteOutcome = { path: string; error?: string; violations: RouteViolation[] }

export type Verdict = {
  errors: { path: string; error: string }[]
  unexpected: (RouteViolation & { path: string })[]
  stale: KnownViolation[]
}

const FAILING: ReadonlySet<Impact | null> = new Set(['serious', 'critical'])

/**
 * Decides a run. Serious and critical violations fail it unless a known entry
 * names that rule on that path; a route that did not load fails it; a known
 * entry fails it as stale when its path was checked and the rule no longer
 * occurs there at any impact. Known entries of routes outside the run are
 * left alone, so a run narrowed to some paths, or without a session, can pass.
 */
export function judge(outcomes: readonly RouteOutcome[], known: readonly KnownViolation[]): Verdict {
  const verdict: Verdict = { errors: [], unexpected: [], stale: [] }
  const checked = new Map<string, RouteViolation[]>()

  for (const outcome of outcomes) {
    if (outcome.error !== undefined) {
      verdict.errors.push({ path: outcome.path, error: outcome.error })
      continue
    }
    checked.set(outcome.path, outcome.violations)
    for (const violation of outcome.violations) {
      if (!FAILING.has(violation.impact)) continue
      const forgiven = known.some((entry) => entry.path === outcome.path && entry.rule === violation.rule)
      if (!forgiven) verdict.unexpected.push({ path: outcome.path, ...violation })
    }
  }

  for (const entry of known) {
    const violations = checked.get(entry.path)
    if (violations && !violations.some((violation) => violation.rule === entry.rule)) verdict.stale.push(entry)
  }

  return verdict
}

export function passed(verdict: Verdict): boolean {
  return verdict.errors.length === 0 && verdict.unexpected.length === 0 && verdict.stale.length === 0
}
