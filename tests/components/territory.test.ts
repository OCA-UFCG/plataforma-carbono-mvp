import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const state = vi.hoisted(() => ({
  layers: [] as object[],
  selectedGeometry: null as object | null,
  analysisLabel: null as string | null,
  analysisKind: null as string | null,
  drawing: null as object | null,
  drawMode: null as string | null,
  layerErrors: {} as Record<string, string>,
  toggleLayer: () => {}, setOpacity: () => {}, moveLayer: () => {}, clearRecortes: () => {}, clearLayerError: () => {},
  setDrawMode: () => {}, clearDrawings: () => {},
}))
vi.mock('@/lib/mapa/store', () => ({
  useStore: (select: (s: typeof state) => unknown) => select(state),
}))

import Territory, { FocusCard, TerritorySummary, recorteSummary } from '@/components/mapa/panel/Territory'
import RecortePicker, { nextOption, pickerLabel, recorteGroups } from '@/components/mapa/panel/RecortePicker'
import type { LayerConfig } from '@/types/mapa'

const recorte = (id: string, name: string, subtheme: string, visible: boolean): LayerConfig => ({
  id, name, type: 'vector', url: `/data/${id}.geojson`, visible, opacity: 50, color: '#000', theme: 'territorio', subtheme,
})
const bioma = recorte('bioma', 'Bioma Caatinga', 'limites', true)
const estados = recorte('estados', 'Estados', 'limites', false)
const municipios = recorte('municipios', 'Municípios', 'limites', true)
const quilombolas = recorte('quilombolas', 'Territórios Quilombolas', 'territorios', false)
const pontos: LayerConfig = {
  id: 'pontos', name: 'Áreas de Monitoramento', type: 'vector', url: '/data/pontos.geojson', visible: true, opacity: 100,
  color: '#000', theme: 'localidades', subtheme: 'monitoramento',
}
const estoque: LayerConfig = {
  id: 'estoque', name: 'Estoque Total', type: 'raster', visible: true, opacity: 50, colorType: 'continuous',
  theme: 'carbono', subtheme: 'estoques',
}

const render = () => renderToStaticMarkup(createElement(Territory, { onSelectFeature: () => {}, onDismissSelection: () => {} }))
const point = { geometry: { type: 'Point', coordinates: [-35.9, -7.2] }, geometryType: 'point', lon: -35.9, lat: -7.2 }

describe('Territory (Figma 19423:56814)', () => {
  beforeEach(() => {
    state.layers = []
    state.selectedGeometry = null
    state.analysisLabel = null
    state.analysisKind = null
    state.drawing = null
    state.drawMode = null
    state.layerErrors = {}
  })

  it('opens with its title and the arrow that folds it', () => {
    state.layers = [bioma]
    const markup = render()
    expect(markup).toMatch(/<h2[^>]*>Território<\/h2>/)
    expect(markup).toMatch(/<button [^>]*aria-expanded="true"[^>]*aria-label="Recolher Território"/)
  })

  it('searches under the picker, then offers the map and the drawing buttons, as 19423:56814 stacks them', () => {
    state.layers = [bioma]
    const markup = render()
    expect(markup).toMatch(/<input [^>]*role="combobox"[^>]*placeholder="Buscar município, estado ou território"/)
    const at = (text: string) => markup.indexOf(text)
    expect(at('aria-haspopup="listbox"')).toBeLessThan(at('role="combobox"'))
    expect(at('role="combobox"')).toBeLessThan(at('Ou clique no mapa.'))
    expect(at('Ou clique no mapa.')).toBeLessThan(at('Delimitar recorte'))
    expect(at('Delimitar recorte')).toBeLessThan(at('Marcar ponto'))
    expect(at('Marcar ponto')).toBeLessThan(at('<hr'))
    expect(markup).toContain('/icons/mapa/edit.svg')
  })

  it('arms the drawing button in use', () => {
    state.drawMode = 'polygon'
    const markup = render()
    expect(markup).toMatch(/<button [^>]*aria-pressed="true"[^>]*>Delimitar recorte/)
    expect(markup).toMatch(/<button [^>]*aria-pressed="false"[^>]*>Marcar ponto/)
  })

  it('shows the card in focus only with a feature or a drawing in focus', () => {
    expect(render()).not.toContain('em foco')
    state.selectedGeometry = { ...point, feature: { recorteId: 'municipios', properties: {} } }
    state.analysisKind = 'Município'
    state.analysisLabel = 'Campina Grande'
    expect(render()).toContain('Município em foco')
  })

  it('shows a drawing in focus by its kind, so its X can erase it (#136, question 2)', () => {
    state.drawing = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [] } }
    state.analysisKind = 'Área desenhada'
    const markup = render()
    expect(markup).toMatch(/>Em foco<(?:(?!<\/button>).)*>Área desenhada</)
    expect(markup).toMatch(/aria-label="Desfazer a seleção de Área desenhada"/)
  })

  it('lists the recortes on, in draw order, and nothing else', () => {
    // Draw order: municípios was dragged above the biome.
    state.layers = [municipios, pontos, bioma, estados, estoque]
    const markup = render()
    const cards = [...markup.matchAll(/data-layer="([^"]+)"/g)].map((m) => m[1])
    expect(cards).toEqual(['municipios', 'bioma'])
    expect(markup).toContain('Recorte em destaque (2)')
  })

  it('gives each card its name, opacity and a bin that takes it off the map', () => {
    state.layers = [bioma]
    const markup = render()
    expect(markup).toMatch(/aria-label="Mover Bioma Caatinga na ordem do mapa/)
    expect(markup).toMatch(/<input [^>]*type="range"[^>]*aria-label="Opacidade de Bioma Caatinga"/)
    expect(markup).toMatch(/aria-label="Tirar Bioma Caatinga do mapa"/)
    expect(markup).toContain('/icons/mapa/delete-forever-heavy.svg')
  })

  it('carries the error of a recorte in its card', () => {
    // The limits of the emissions' recorte that did not arrive (MapView).
    state.layers = [municipios]
    state.layerErrors = { municipios: 'Os limites não carregaram.' }
    expect(render()).toMatch(/data-layer="municipios"(?:(?!<\/li>).)*Os limites não carregaram\./)
  })

  it('lets "Limpar" clear the recortes, and disables it with none on', () => {
    state.layers = [bioma]
    expect(render()).not.toMatch(/<button [^>]*disabled[^>]*>Limpar/)
    state.layers = [estados, estoque]
    const markup = render()
    expect(markup).toContain('Recorte em destaque (0)')
    expect(markup).toMatch(/<button [^>]*disabled[^>]*>Limpar/)
    expect(markup).not.toMatch(/data-layer=/)
  })
})

describe('FocusCard (Figma 19416:55282)', () => {
  const card = (props: Parameters<typeof FocusCard>[0]) => renderToStaticMarkup(createElement(FocusCard, props))

  it('names a feature with its kind, and its X undoes the selection', () => {
    const markup = card({ label: 'Município em foco', name: 'Campina Grande', onClear: () => {} })
    expect(markup).toContain('Município em foco')
    expect(markup).toContain('Campina Grande')
    expect(markup).toMatch(/<button [^>]*aria-label="Desfazer a seleção de Campina Grande"/)
  })
})

describe('TerritorySummary (Figma 19430:58762)', () => {
  const summary = (destaque: string | null) =>
    renderToStaticMarkup(createElement(TerritorySummary, { count: 3, destaque, onOpen: () => {} }))

  it('counts the recortes on the map and names the feature in focus', () => {
    const markup = summary('Campina Grande')
    expect(markup).toContain('3 recortes no mapa')
    expect(markup).toContain('destaque: Campina Grande')
    expect(markup).toMatch(/<button [^>]*>Alterar<\/button>/)
  })

  it('leaves the destaque out with no feature in focus', () => {
    expect(summary(null)).not.toContain('destaque')
  })

  it('agrees in number', () => {
    expect(recorteSummary(0)).toBe('Nenhum recorte no mapa')
    expect(recorteSummary(1)).toBe('1 recorte no mapa')
    expect(recorteSummary(3)).toBe('3 recortes no mapa')
  })
})

describe('RecortePicker (Figma 19431:60257)', () => {
  it('groups the Território layers by subtheme, in groups.ts order, in catalog order', () => {
    const groups = recorteGroups([quilombolas, municipios, pontos, bioma, estados, estoque])
    expect(groups.map((group) => group.label)).toEqual(['Limites de referência', 'Territórios tradicionais e assentamentos'])
    expect(groups[0].layers.map((layer) => layer.id)).toEqual(['bioma', 'estados', 'municipios'])
    expect(groups[1].layers.map((layer) => layer.id)).toEqual(['quilombolas'])
  })

  it('takes in a new Território layer without a code change', () => {
    const assentamentos = recorte('assentamentos_novos', 'Assentamentos novos', 'territorios', false)
    const groups = recorteGroups([bioma, assentamentos])
    expect(groups[1].layers.map((layer) => layer.id)).toEqual(['assentamentos_novos'])
  })

  it('names what is chosen when closed', () => {
    expect(pickerLabel([])).toBe('Escolha o recorte')
    expect(pickerLabel([bioma])).toBe('Bioma Caatinga')
    expect(pickerLabel([bioma, municipios, quilombolas])).toBe('3 recortes escolhidos')
  })

  it('lists every option as a checkbox, ticked when the recorte is on', () => {
    const markup = renderToStaticMarkup(createElement(RecortePicker, {
      layers: [bioma, estados, quilombolas], onToggle: () => {},
    }))
    expect(markup).toMatch(/<button [^>]*aria-haspopup="listbox"[^>]*aria-expanded="false"/)
    expect(markup).toMatch(/role="listbox"[^>]*aria-multiselectable="true"/)
    expect(markup).toMatch(/role="option"[^>]*aria-selected="true"[^>]*>(?:(?!<\/li>).)*Bioma Caatinga/)
    expect(markup).toMatch(/role="option"[^>]*aria-selected="false"[^>]*>(?:(?!<\/li>).)*Estados/)
    expect(markup).toContain('Territórios tradicionais e assentamentos')
  })

  it('moves through the options with the arrow keys, Home and End, stopping at the ends', () => {
    expect(nextOption(0, 'ArrowDown', 5)).toBe(1)
    expect(nextOption(4, 'ArrowDown', 5)).toBe(4)
    expect(nextOption(2, 'ArrowUp', 5)).toBe(1)
    expect(nextOption(0, 'ArrowUp', 5)).toBe(0)
    expect(nextOption(3, 'Home', 5)).toBe(0)
    expect(nextOption(1, 'End', 5)).toBe(4)
    expect(nextOption(2, 'a', 5)).toBe(2)
  })
})
