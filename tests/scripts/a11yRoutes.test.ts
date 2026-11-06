import { describe, expect, it } from 'vitest'
import { A11Y_ROUTES, routesToRun, screenshotName, sessionFor } from '@/scripts/a11y/routes'

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

  it('rejects a session route named without a session instead of dropping it', () => {
    expect(() => routesToRun(['/mapa'], false)).toThrow(/\/mapa.*A11Y_SESSION/)
    expect(() => routesToRun(['/login', '/mapa'], false)).toThrow(/\/mapa/)
  })

  it('runs a session route named with a session', () => {
    expect(routesToRun(['/mapa'], true).map((r) => r.path)).toEqual(['/mapa'])
  })
})

describe('sessionFor', () => {
  const route = (path: string) => A11Y_ROUTES.find((r) => r.path === path)!

  it('hands the session only to the routes that need it', () => {
    expect(sessionFor(route('/mapa'), 'cookie')).toBe('cookie')
    expect(sessionFor(route('/login'), 'cookie')).toBeUndefined()
  })

  it('has none to hand without one', () => {
    expect(sessionFor(route('/mapa'), undefined)).toBeUndefined()
  })
})

describe('screenshotName', () => {
  it('names screenshots after the path', () => {
    expect(screenshotName('/')).toBe('home.png')
    expect(screenshotName('/sobre/carbono-e-comunidades')).toBe('sobre-carbono-e-comunidades.png')
  })
})

describe('A11Y_ROUTES', () => {
  const route = (path: string) => A11Y_ROUTES.find((r) => r.path === path)!

  it('has no repeated path', () => {
    const paths = A11Y_ROUTES.map((r) => r.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('waits on the auth card, not on a bare h1 that the 404 page also has', () => {
    const auth = ['/login', '/cadastro', '/cadastro/confirmacao', '/esqueci-senha', '/redefinir-senha', '/aguardando-liberacao']
    for (const path of auth) expect(route(path).ready, path).toBe('main > section > h1')
    expect(A11Y_ROUTES.filter((r) => r.ready === 'h1')).toEqual([])
  })

  it('waits for the settled state of the pages that check an emailed code', () => {
    expect(route('/cadastro/confirmacao').settled).toBeTruthy()
    expect(route('/redefinir-senha').settled).toBeTruthy()
  })

  it('gives every screenshot its own file', () => {
    const names = A11Y_ROUTES.map((r) => screenshotName(r.path))
    expect(new Set(names).size).toBe(names.length)
  })
})
