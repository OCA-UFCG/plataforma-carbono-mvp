import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const estoque = {
  id: 'estoque_total', name: 'Estoque total', type: 'raster', visible: true, opacity: 100,
  gee: { temporal: { dateRange: ['1985-01-01', '2024-01-01'] } },
}

const state = vi.hoisted(() => ({
  layers: [] as object[],
  temporalDate: {} as Record<string, string>,
  loadingLayers: {} as Record<string, boolean>,
  setTemporalDate: () => {},
}))
vi.mock('@/lib/mapa/store', () => ({
  useStore: (select: (s: typeof state) => unknown) => select(state),
}))

import TemporalSlider from '@/components/mapa/overlays/TemporalSlider'

const render = () => renderToStaticMarkup(createElement(TemporalSlider))

describe('TemporalSlider', () => {
  beforeEach(() => {
    state.layers = []
    state.temporalDate = {}
    state.loadingLayers = {}
  })

  it('stays out without a visible temporal layer', () => {
    state.layers = [{ ...estoque, visible: false }]
    expect(render()).toBe('')
  })

  it("draws Figma's card: ‹, the track, ›", () => {
    state.layers = [estoque]
    const m = render()
    expect(m.indexOf('aria-label="Ano anterior"')).toBeLessThan(m.indexOf('type="range"'))
    expect(m.indexOf('type="range"')).toBeLessThan(m.indexOf('aria-label="Próximo ano"'))
  })

  it('labels the thumb with the year alone, since every series is annual', () => {
    state.layers = [estoque]
    const m = render()
    expect(m).toMatch(/<span[^>]*data-side="left"[^>]*>2024<\/span>/)
    expect(m).not.toMatch(/\d{4} - \d{2}/)
  })

  it('follows the stored year', () => {
    state.layers = [estoque]
    state.temporalDate = { estoque_total: '2000-01-01' }
    const m = render()
    expect(m).toMatch(/>2000</)
    expect(m).toContain('value="15"')
    expect(m).toMatch(/--f:0\.3846/) // 15 / 39
  })

  it('disables › on the last year and leaves ‹ on', () => {
    state.layers = [estoque]
    const [prev, next] = render().match(/<button[^>]*>/g)!
    expect(next).toContain('disabled=""')
    expect(prev).not.toContain('disabled')
  })

  it('drops the header and the range ends the design does not draw', () => {
    state.layers = [estoque]
    const m = render()
    expect(m).not.toMatch(/>Estoque total</)
    expect(m).not.toMatch(/>1985</)
    expect(m).toContain('aria-label="Ano de Estoque total"')
  })

  it('announces the tile load to screen readers only', () => {
    state.layers = [estoque]
    state.loadingLayers = { estoque_total: true }
    expect(render()).toMatch(/<span class="sr-only"[^>]*>carregando<\/span>/)
  })
})
