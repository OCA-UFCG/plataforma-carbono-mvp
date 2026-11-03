import { describe, expect, it } from 'vitest'
import { judge, passed, type RouteViolation } from '@/scripts/a11y/judge'
import type { KnownViolation } from '@/scripts/a11y/known'

function violation(rule: string, impact: RouteViolation['impact']): RouteViolation {
  return { rule, impact, help: `${rule} help`, targets: ['button'] }
}

const dots: KnownViolation = { path: '/', rule: 'target-size', reason: 'hero dots, workstream F' }

describe('judge', () => {
  it('passes minor and moderate violations', () => {
    const verdict = judge([{ path: '/sobre', violations: [violation('region', 'moderate'), violation('x', 'minor')] }], [])
    expect(verdict).toEqual({ errors: [], unexpected: [], stale: [] })
    expect(passed(verdict)).toBe(true)
  })

  it('flags serious and critical violations that are not known', () => {
    const verdict = judge(
      [{ path: '/login', violations: [violation('label', 'critical'), violation('color-contrast', 'serious')] }],
      [],
    )
    expect(verdict.unexpected.map((v) => [v.path, v.rule])).toEqual([
      ['/login', 'label'],
      ['/login', 'color-contrast'],
    ])
    expect(passed(verdict)).toBe(false)
  })

  it('forgives a known rule only on its own path', () => {
    const verdict = judge(
      [
        { path: '/', violations: [violation('target-size', 'serious')] },
        { path: '/sobre', violations: [violation('target-size', 'serious')] },
      ],
      [dots],
    )
    expect(verdict.unexpected.map((v) => v.path)).toEqual(['/sobre'])
  })

  it('reports a known entry that no longer occurs as stale', () => {
    const verdict = judge([{ path: '/', violations: [] }], [dots])
    expect(verdict.stale).toEqual([dots])
    expect(passed(verdict)).toBe(false)
  })

  it('ignores known entries of paths not checked in this run', () => {
    const mapa: KnownViolation = { path: '/mapa', rule: 'label', reason: 'workstream E' }
    const verdict = judge([{ path: '/', violations: [violation('target-size', 'serious')] }], [dots, mapa])
    expect(verdict.stale).toEqual([])
    expect(passed(verdict)).toBe(true)
  })

  it('reports a route that failed to load', () => {
    const known: KnownViolation = { path: '/territorios', rule: 'label', reason: 'x' }
    const verdict = judge([{ path: '/territorios', error: 'status 500', violations: [] }], [known])
    expect(verdict.errors).toEqual([{ path: '/territorios', error: 'status 500' }])
    expect(verdict.stale).toEqual([])
    expect(passed(verdict)).toBe(false)
  })
})
