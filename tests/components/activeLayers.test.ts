import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const state = vi.hoisted(() => ({
  layers: [] as object[],
  layerErrors: {} as Record<string, string>,
  clearThematicLayers: () => {}, toggleLayer: () => {}, setOpacity: () => {}, moveLayer: () => {}, clearLayerError: () => {},
}))
vi.mock('@/lib/mapa/store', () => ({
  useStore: (select: (s: typeof state) => unknown) => select(state),
}))

import ActiveLayers from '@/components/mapa/panel/ActiveLayers'
import { parseOpacity } from '@/components/mapa/panel/OpacityControl'

const bioma = { id: 'bioma', name: 'Bioma Caatinga', type: 'vector', visible: true, opacity: 70, theme: 'territorio', subtheme: 'limites' }
const estoque = { id: 'estoque', name: 'Estoque Total', type: 'raster', visible: true, opacity: 50, unit: 't C/ha', theme: 'carbono', subtheme: 'estoques' }
const cobertura = { id: 'cobertura', name: 'Uso e Cobertura da Terra', type: 'raster', visible: true, opacity: 80, theme: 'uso_solo', subtheme: 'cobertura' }
const emissoes = { id: 'emissoes', name: 'Emissões brutas', type: 'emissions', visible: true, opacity: 80, unit: 't CO2e/ha', theme: 'uso_solo', subtheme: 'emissoes' }
const off = { id: 'off', name: 'Desligada', type: 'raster', visible: false, opacity: 100, theme: 'carbono', subtheme: 'estoques' }

const render = () => renderToStaticMarkup(createElement(ActiveLayers, { infoId: null, onInfo: () => {} }))

describe('ActiveLayers (Figma 19430:58765)', () => {
  beforeEach(() => { state.layers = []; state.layerErrors = {} })

  it('lists the thematic layers on, in draw order, emissions included and recortes left out', () => {
    state.layers = [bioma, cobertura, estoque, emissoes, off]
    const markup = render()
    const names = [...markup.matchAll(/data-layer="([^"]+)"/g)].map((m) => m[1])
    expect(names).toEqual(['cobertura', 'estoque', 'emissoes'])
  })

  it('counts them in two digits and lets "Limpar" turn them off', () => {
    state.layers = [bioma, cobertura, estoque, emissoes]
    const markup = render()
    expect(markup).toMatch(/data-count="3"[^>]*>03</)
    expect(markup).toMatch(/<button [^>]*>Limpar/)
    expect(markup).not.toMatch(/<button [^>]*disabled[^>]*>Limpar/)
  })

  it('gives each card the theme icon, unit, ficha, opacity and a way to switch it off', () => {
    state.layers = [estoque]
    const markup = render()
    expect(markup).toContain('/icons/mapa/grass.svg')
    expect(markup).toContain('t C/ha')
    expect(markup).toMatch(/aria-label="Ficha da camada Estoque Total"/)
    expect(markup).toMatch(/<input [^>]*type="range"[^>]*aria-label="Opacidade de Estoque Total"/)
    expect(markup).toMatch(/aria-label="Desligar Estoque Total"/)
  })

  it('shows the empty state with "Limpar" disabled', () => {
    state.layers = [bioma, off]
    const markup = render()
    expect(markup).toContain('Ative as camadas para editá-las')
    expect(markup).toMatch(/<button [^>]*disabled[^>]*>Limpar/)
    expect(markup).toMatch(/data-count="0"[^>]*>0</)
  })

  it('carries the error of a layer on in its card', () => {
    state.layers = [estoque]
    state.layerErrors = { estoque: 'Falha ao carregar o ano.' }
    expect(render()).toContain('Falha ao carregar o ano.')
  })
})

describe('parseOpacity', () => {
  it('reads a whole percent, with or without the sign', () => {
    expect(parseOpacity('50')).toBe(50)
    expect(parseOpacity(' 35% ')).toBe(35)
    expect(parseOpacity('12,6')).toBe(13)
  })

  it('keeps the value within 0 to 100', () => {
    expect(parseOpacity('150')).toBe(100)
    expect(parseOpacity('-5')).toBe(0)
  })

  it('refuses what is not a number', () => {
    expect(parseOpacity('')).toBeNull()
    expect(parseOpacity('abc')).toBeNull()
  })
})
