import { describe, expect, it } from 'vitest'
import { judge, passed, type RouteViolation } from '@/scripts/a11y/judge'
import type { KnownViolation } from '@/scripts/a11y/known'

function violation(rule: string, impact: RouteViolation['impact'], targets = ['button']): RouteViolation {
  return { rule, impact, help: `${rule} help`, targets }
}

const dots: KnownViolation = {
  path: '/',
  rule: 'target-size',
  target: /^button\[aria-label="Mostrar Foto \d+"\]$/,
  reason: 'hero dots, workstream F',
}
const DOT = 'button[aria-label="Mostrar Foto 2"]'

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
        { path: '/', violations: [violation('target-size', 'serious', [DOT])] },
        { path: '/sobre', violations: [violation('target-size', 'serious', [DOT])] },
      ],
      [dots],
    )
    expect(verdict.unexpected.map((v) => v.path)).toEqual(['/sobre'])
  })

  it('forgives a violation whose every node the entry names', () => {
    const verdict = judge(
      [{ path: '/', violations: [violation('target-size', 'serious', [DOT, 'button[aria-label="Mostrar Foto 3"]'])] }],
      [dots],
    )
    expect(verdict.unexpected).toEqual([])
    expect(passed(verdict)).toBe(true)
  })

  it('still flags a node the entry does not name, on a rule it forgives', () => {
    const verdict = judge(
      [{ path: '/', violations: [violation('target-size', 'serious', [DOT, 'footer a.social', 'header button.menu'])] }],
      [dots],
    )
    expect(verdict.unexpected).toHaveLength(1)
    expect(verdict.unexpected[0]).toMatchObject({ path: '/', rule: 'target-size', targets: ['footer a.social', 'header button.menu'] })
    expect(passed(verdict)).toBe(false)
  })

  it('lets several entries of one rule on a path forgive different nodes', () => {
    const other: KnownViolation = { ...dots, target: /^a\.legacy$/, reason: 'a legacy link' }
    const verdict = judge([{ path: '/', violations: [violation('target-size', 'serious', [DOT, 'a.legacy'])] }], [dots, other])
    expect(verdict.unexpected).toEqual([])
    expect(verdict.stale).toEqual([])
  })

  it('reports a known entry that no longer occurs as stale', () => {
    const verdict = judge([{ path: '/', violations: [] }], [dots])
    expect(verdict.stale).toEqual([dots])
    expect(passed(verdict)).toBe(false)
  })

  it('reports an entry as stale when its rule occurs only on nodes it does not name', () => {
    const verdict = judge([{ path: '/', violations: [violation('target-size', 'serious', ['footer a.social'])] }], [dots])
    expect(verdict.stale).toEqual([dots])
    expect(verdict.unexpected).toHaveLength(1)
  })

  it('ignores known entries of paths not checked in this run', () => {
    const mapa: KnownViolation = { path: '/mapa', rule: 'label', target: /./, reason: 'workstream E' }
    const verdict = judge([{ path: '/', violations: [violation('target-size', 'serious', [DOT])] }], [dots, mapa])
    expect(verdict.stale).toEqual([])
    expect(passed(verdict)).toBe(true)
  })

  it('reports a route that failed to load', () => {
    const known: KnownViolation = { path: '/territorios', rule: 'label', target: /./, reason: 'x' }
    const verdict = judge([{ path: '/territorios', error: 'status 500', violations: [] }], [known])
    expect(verdict.errors).toEqual([{ path: '/territorios', error: 'status 500' }])
    expect(verdict.stale).toEqual([])
    expect(passed(verdict)).toBe(false)
  })
})
