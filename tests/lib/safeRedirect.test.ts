import { describe, expect, it } from 'vitest'
import { loginRedirect, safeRedirect } from '@/lib/auth'

describe('safeRedirect', () => {
  it('keeps the platform routes, with a path or a query after them', () => {
    expect(safeRedirect('/mapa')).toBe('/mapa')
    expect(safeRedirect('/mapa/qualquer')).toBe('/mapa/qualquer')
    expect(safeRedirect('/relatorio')).toBe('/relatorio')
    expect(safeRedirect('/relatorio?recorte=municipios&feicao=campina-grande'))
      .toBe('/relatorio?recorte=municipios&feicao=campina-grande')
    expect(safeRedirect('/aprovacoes')).toBe('/aprovacoes')
  })

  it('sends everything else to the map, the public pages included', () => {
    for (const value of ['/', '/sobre', '/sobre/caatinga', '/comunicacao', '/territorios?recorte=municipios', '/cadastro', undefined]) {
      expect(safeRedirect(value), String(value)).toBe('/mapa')
    }
  })

  it('refuses anything that could leave the site', () => {
    // A protocol-relative URL is the case a "starts with /" test lets through.
    expect(safeRedirect('//evil.com')).toBe('/mapa')
    expect(safeRedirect('https://evil.com')).toBe('/mapa')
    expect(safeRedirect('/relatoriofalso')).toBe('/mapa')
    expect(safeRedirect('/mapafalso')).toBe('/mapa')
    expect(safeRedirect('/aprovacoesfalso')).toBe('/mapa')
    expect(safeRedirect(['/mapa'])).toBe('/mapa')
  })
})

describe('loginRedirect', () => {
  it('sends the login page back to the private page that asked', () => {
    expect(loginRedirect('/aprovacoes')).toBe('/login?redirect=%2Faprovacoes')
  })

  it('never carries a destination safeRedirect would refuse', () => {
    expect(loginRedirect('//evil.com')).toBe('/login?redirect=%2Fmapa')
    expect(loginRedirect(null)).toBe('/login?redirect=%2Fmapa')
  })
})
