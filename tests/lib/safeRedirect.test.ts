import { describe, expect, it } from 'vitest'
import { safeRedirect } from '@/lib/auth'

describe('safeRedirect', () => {
  it('keeps the app routes, with a path or a query after them', () => {
    expect(safeRedirect('/')).toBe('/')
    expect(safeRedirect('/mapa')).toBe('/mapa')
    expect(safeRedirect('/mapa/qualquer')).toBe('/mapa/qualquer')
    expect(safeRedirect('/relatorio')).toBe('/relatorio')
    expect(safeRedirect('/relatorio?recorte=municipios&feicao=campina-grande'))
      .toBe('/relatorio?recorte=municipios&feicao=campina-grande')
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
