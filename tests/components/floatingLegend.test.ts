import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildSiteTheme } from '@/config/mapa/platforms'

const bioma = { id: 'bioma', name: 'Bioma Caatinga', type: 'vector', visible: true, opacity: 70, color: '#374d15' }
const estoque = {
  id: 'estoque_total', name: 'Estoque total', type: 'raster', visible: true, opacity: 100,
  unit: 't C/ha', colorType: 'continuous',
  gee: { visParams: { min: 0, max: 250, palette: ['#fdfeda', '#8dcf81', '#0c633b'] }, temporal: { dateRange: ['1985-01-01', '2024-01-01'] } },
}

const state = vi.hoisted(() => ({
  layers: [] as object[],
  temporalDate: {}, emissoes: {}, layerErrors: {}, loadingLayers: {},
  setTemporalDate: () => {},
}))
vi.mock('@/lib/mapa/store', () => ({
  useStore: (select: (s: typeof state) => unknown) => select(state),
}))

import FloatingLegend from '@/components/mapa/overlays/FloatingLegend'

const render = () => renderToStaticMarkup(createElement(FloatingLegend, { theme: buildSiteTheme(), rightOffset: 40 }))

describe('FloatingLegend', () => {
  beforeEach(() => { state.layers = [] })

  it('stays out while no layer is on', () => {
    expect(render()).toBe('')
  })

  it('opens as the "Legendas" card of Figma 19428:58419', () => {
    state.layers = [bioma]
    const markup = render()
    expect(markup).toMatch(/<button [^>]*aria-expanded="true"[^>]*>.*Legendas/)
    expect(markup).toContain('Bioma Caatinga')
  })

  it('stacks the year control above the card, outside what folding hides', () => {
    state.layers = [bioma, estoque]
    const m = render()
    expect(m).toMatch(/<input [^>]*type="range"[^>]*aria-label="Ano de Estoque total"/)
    expect(m.indexOf('type="range"')).toBeLessThan(m.indexOf('Legendas'))
    expect(m.indexOf('type="range"')).toBeLessThan(m.indexOf('id="legenda-conteudo"'))
  })

  it('has no year control without a temporal layer', () => {
    state.layers = [bioma]
    expect(render()).not.toContain('type="range"')
  })
})
