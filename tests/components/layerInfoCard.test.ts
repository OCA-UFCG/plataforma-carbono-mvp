import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Two layers with controlled sheets: one with every field the Figma ficha
// (19451:60761) draws, one with only what every sheet has.
const state = vi.hoisted(() => ({
  layers: [
    { id: 'completa', name: 'Uso e Cobertura da Terra', type: 'raster', visible: false, opacity: 100, unit: 'classe', theme: 'uso_solo', subtheme: 'cobertura' },
    { id: 'minima', name: 'Bioma Caatinga', type: 'vector', visible: true, opacity: 70, theme: 'territorio', subtheme: 'limites' },
  ],
  toggleLayer: () => {},
}))
vi.mock('@/lib/mapa/store', () => ({
  useStore: (select: (s: typeof state) => unknown) => select(state),
}))
vi.mock('@/config/mapa/layerInfo', () => ({
  LAYER_INFO: {
    completa: {
      summary: 'Classes de uso e cobertura da terra, mapeadas em imagens Landsat.',
      period: '1985-2024',
      resolution: '30 m',
      source: 'MapBiomas, coleção 10.1',
      method: 'Classificação de imagens Landsat por aprendizado de máquina.',
      license: { label: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
      citation: 'Projeto MapBiomas, acessado em {acesso}.',
      learnMore: { href: '/comunicacao/mapbiomas', label: 'Saiba mais' },
    },
    minima: {
      summary: 'Limite oficial do bioma Caatinga.',
      source: 'IBGE',
    },
  },
}))

import LayerInfoCard from '@/components/mapa/LayerInfoCard'

function render(layerId: string) {
  return renderToStaticMarkup(createElement(LayerInfoCard, { layerId, narrow: false, onClose: () => {} }))
}

const text = (markup: string) => markup.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|')

describe('LayerInfoCard', () => {
  it('shows the period and the resolution as chips, and nothing else', () => {
    const chips = render('completa').match(/data-chip="[^"]*"/g) ?? []
    expect(chips).toEqual(['data-chip="1985-2024"', 'data-chip="30 m"'])
  })

  it('lists the sheet in the order of the design, with the licence as a link', () => {
    const markup = render('completa')
    const terms = [...markup.matchAll(/<dt[^>]*>([^<]*)<\/dt>/g)].map((m) => m[1])
    expect(terms).toEqual(['Fonte', 'Método', 'Período', 'Resolução', 'Licença'])
    expect(markup).toMatch(/<a [^>]*href="https:\/\/creativecommons.org\/licenses\/by\/4.0\/"[^>]*>CC BY 4.0<\/a>/)
  })

  it('leaves out what a layer does not have, labels included', () => {
    const markup = render('minima')
    const terms = [...markup.matchAll(/<dt[^>]*>([^<]*)<\/dt>/g)].map((m) => m[1])
    expect(terms).toEqual(['Fonte'])
    expect(markup).not.toContain('data-chip')
    expect(text(markup)).not.toContain('|Como citar|')
  })

  it('offers the citation with a copy button named for screen readers', () => {
    const markup = render('completa')
    expect(markup).toContain('Projeto MapBiomas, acessado em ')
    expect(markup).not.toContain('{acesso}')
    expect(markup).toMatch(/<button [^>]*aria-label="Copiar citação"/)
  })

  it('switches the layer on or off by its state', () => {
    expect(text(render('completa'))).toContain('|Ativar camada|')
    expect(text(render('minima'))).toContain('|Desativar camada|')
  })

  it('links "Saiba mais" when the layer has a page, and holds it inert otherwise', () => {
    expect(render('completa')).toMatch(/<a [^>]*href="\/comunicacao\/mapbiomas"[^>]*>Saiba mais<span class="sr-only"> \(abre em nova aba\)<\/span><\/a>/)
    const inert = render('minima').match(/<button [^>]*disabled[^>]*>Saiba mais.*?<\/button>/)
    expect(inert?.[0]).toContain('disponível em breve')
  })
})
