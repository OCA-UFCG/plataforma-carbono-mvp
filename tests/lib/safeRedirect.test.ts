import { describe, expect, it } from 'vitest'
import { loginRedirect, safeRedirect } from '@/lib/auth'

describe('safeRedirect', () => {
  it('keeps the app routes, with a path or a query after them', () => {
    expect(safeRedirect('/')).toBe('/')
    expect(safeRedirect('/mapa')).toBe('/mapa')
    expect(safeRedirect('/mapa/qualquer')).toBe('/mapa/qualquer')
    expect(safeRedirect('/relatorio')).toBe('/relatorio')
    expect(safeRedirect('/relatorio?recorte=municipios&feicao=campina-grande'))
      .toBe('/relatorio?recorte=municipios&feicao=campina-grande')
  })

  it('keeps the internal marketing pages', () => {
    expect(safeRedirect('/sobre')).toBe('/sobre')
    expect(safeRedirect('/sobre/caatinga')).toBe('/sobre/caatinga')
    expect(safeRedirect('/comunicacao')).toBe('/comunicacao')
    expect(safeRedirect('/sobrefalso')).toBe('/')
    expect(safeRedirect('/comunicacaofalsa')).toBe('/')
  })

  it('refuses anything that could leave the site', () => {
    // A protocol-relative URL is the case a "starts with /" test lets through.
    expect(safeRedirect('//evil.com')).toBe('/')
    expect(safeRedirect('https://evil.com')).toBe('/')
    expect(safeRedirect('/relatoriofalso')).toBe('/')
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect(['/mapa'])).toBe('/')
  })
})

describe('loginRedirect', () => {
  it('sends the login page back to the page that asked', () => {
    expect(loginRedirect('/sobre/caatinga')).toBe('/login?redirect=%2Fsobre%2Fcaatinga')
    expect(loginRedirect('/')).toBe('/login?redirect=%2F')
  })

  it('never carries a destination safeRedirect would refuse', () => {
    expect(loginRedirect('//evil.com')).toBe('/login?redirect=%2F')
    expect(loginRedirect(null)).toBe('/login?redirect=%2F')
  })
})
