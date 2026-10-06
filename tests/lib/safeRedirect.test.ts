import { describe, expect, it } from 'vitest'
import { safeRedirect } from '@/lib/auth'

describe('safeRedirect', () => {
  it('keeps the platform routes, with a path or a query after them', () => {
    expect(safeRedirect('/mapa')).toBe('/mapa')
    expect(safeRedirect('/mapa/qualquer')).toBe('/mapa/qualquer')
    expect(safeRedirect('/relatorio')).toBe('/relatorio')
    expect(safeRedirect('/relatorio?recorte=municipios&feicao=campina-grande'))
      .toBe('/relatorio?recorte=municipios&feicao=campina-grande')
  })

  it('sends everything else to the map, the public pages included', () => {
    for (const value of ['/', '/sobre', '/sobre/caatinga', '/comunicacao', '/territorios?recorte=municipios', undefined]) {
      expect(safeRedirect(value), String(value)).toBe('/mapa')
    }
  })

  it('refuses anything that could leave the site', () => {
    // A protocol-relative URL is the case a "starts with /" test lets through.
    expect(safeRedirect('//evil.com')).toBe('/mapa')
    expect(safeRedirect('https://evil.com')).toBe('/mapa')
    expect(safeRedirect('/relatoriofalso')).toBe('/mapa')
    expect(safeRedirect('/mapafalso')).toBe('/mapa')
    expect(safeRedirect(['/mapa'])).toBe('/mapa')
  })
})
