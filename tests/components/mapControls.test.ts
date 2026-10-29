import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/lib/mapa/store', () => ({
  useStore: (select: (s: object) => unknown) => select({ basemapId: 'carto-positron', setBasemap: () => {} }),
}))

import MapControls from '@/components/mapa/overlays/MapControls'

const markup = renderToStaticMarkup(createElement(MapControls, {
  mapRef: { current: null }, rightOffset: 40,
}))

describe('MapControls', () => {
  it('stacks the controls in the order of Figma 19428:58457', () => {
    const labels = [...markup.matchAll(/<button [^>]*aria-label="([^"]+)"/g)].map((m) => m[1])
    expect(labels).toEqual([
      'Aproximar', 'Afastar', 'Minha localização', 'Tela cheia', 'Orientar para o norte', 'Mapa base',
    ])
  })

  it('draws each control with the icon Figma exports', () => {
    const icons = [...markup.matchAll(/<img [^>]*src="([^"]+)"/g)].map((m) => m[1])
    expect(icons).toEqual([
      '/icons/mapa/zoom-in.svg', '/icons/mapa/zoom-out.svg', '/icons/mapa/target.svg',
      '/icons/mapa/fullscreen.svg', '/icons/mapa/navigation.svg', '/icons/mapa/map.svg',
    ])
  })
})
