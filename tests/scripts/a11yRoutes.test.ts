import { describe, expect, it } from 'vitest'
import { routesToRun, screenshotName } from '@/scripts/a11y/routes'

describe('routesToRun', () => {
  it('drops session routes without a session', () => {
    expect(routesToRun([], false).map((r) => r.path)).not.toContain('/mapa')
  })

  it('keeps them with one', () => {
    expect(routesToRun([], true).map((r) => r.path)).toContain('/mapa')
  })

  it('narrows to the given paths', () => {
    expect(routesToRun(['/login'], false).map((r) => r.path)).toEqual(['/login'])
  })

  it('rejects an unknown path', () => {
    expect(() => routesToRun(['/nada'], false)).toThrow(/\/nada/)
  })
})

describe('screenshotName', () => {
  it('names screenshots after the path', () => {
    expect(screenshotName('/')).toBe('home.png')
    expect(screenshotName('/sobre/carbono-e-comunidades')).toBe('sobre-carbono-e-comunidades.png')
  })
})
