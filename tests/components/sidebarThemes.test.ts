import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildSiteTheme } from '@/config/mapa/platforms'
import { DEFAULT_SUBTHEME_ORDER, DEFAULT_THEME_ORDER } from '@/lib/mapa/layerOrder'

const state = vi.hoisted(() => ({
  layers: [
    { id: 'bioma', name: 'Bioma Caatinga', type: 'vector', visible: true, opacity: 70, theme: 'territorio', subtheme: 'limites' },
    { id: 'estados', name: 'Estados', type: 'vector', visible: false, opacity: 80, theme: 'territorio', subtheme: 'limites' },
    { id: 'estoque', name: 'Estoque Total', type: 'raster', visible: true, opacity: 100, unit: 't C/ha', theme: 'carbono', subtheme: 'estoques' },
    { id: 'biomassa', name: 'Biomassa', type: 'raster', visible: false, opacity: 100, unit: 't/ha', theme: 'carbono', subtheme: 'estoques' },
    { id: 'cobertura', name: 'Uso e Cobertura da Terra', type: 'raster', visible: false, opacity: 100, theme: 'uso_solo', subtheme: 'cobertura' },
    { id: 'altitude', name: 'Altitude', type: 'raster', visible: false, opacity: 100, unit: 'm', theme: 'ambiente', subtheme: 'relevo' },
  ],
  themeOrder: [] as string[],
  subthemeOrder: {} as Record<string, string[]>,
  loadingLayers: {}, layerErrors: {},
  moveTheme: () => {}, moveSubtheme: () => {}, showOnlyMunicipios: () => {}, clearThematicLayers: () => {},
  toggleLayer: () => {}, setOpacity: () => {}, clearLayerError: () => {},
}))
vi.mock('@/lib/mapa/store', () => ({
  useStore: (select: (s: typeof state) => unknown) => select(state),
}))

import Sidebar from '@/components/mapa/Sidebar'

state.themeOrder = DEFAULT_THEME_ORDER
state.subthemeOrder = DEFAULT_SUBTHEME_ORDER
const markup = renderToStaticMarkup(createElement(Sidebar, {
  theme: buildSiteTheme(), infoId: null, onInfo: () => {}, onCollapse: () => {},
}))
const header = (label: string) =>
  markup.match(new RegExp(`<button [^>]*aria-expanded="(?:true|false)"[^>]*>(?:(?!</button>).)*${label}(?:(?!</button>).)*</button>`))?.[0] ?? ''

describe('Sidebar themes (Figma 19430:58769)', () => {
  it('searches with the design\'s field', () => {
    expect(markup).toMatch(/<input [^>]*placeholder="Buscar Camadas"/)
  })

  it('heads each theme with its icon and the count of layers on', () => {
    expect(header('Vegetação')).toContain('/icons/mapa/grass.svg')
    expect(header('Vegetação')).toMatch(/data-count="1"/)
    expect(header('Uso do solo e pressões')).toContain('/icons/mapa/landslide.svg')
    expect(header('Uso do solo e pressões')).toMatch(/data-count="0"/)
    expect(header('Ambiente')).toContain('/icons/mapa/nature.svg')
  })

  it('names the subthemes of the open theme in plain text, not as toggles', () => {
    // The first theme opens on arrival.
    expect(markup).toContain('Limites de referência')
    expect(markup).not.toMatch(/<button [^>]*>(?:(?!<\/button>).)*Limites de referência/)
  })

  it('lists each layer with its switch, name, unit and ficha button', () => {
    expect(markup).toMatch(/role="switch" aria-checked="true" aria-label="Ocultar camada Bioma Caatinga"/)
    expect(markup).toMatch(/aria-label="Ficha da camada Bioma Caatinga"/)
  })

  it('has no 3D terrain switch (issue #136, question 2)', () => {
    expect(markup).not.toContain('Terreno em 3D')
  })
})
