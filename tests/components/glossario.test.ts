import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// The open term is read from the address, as Next.js hands it to the page.
const endereco = vi.hoisted(() => ({ busca: '' }))

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(endereco.busca) }))

import Glossario from '@/components/marketing/Glossario'
import { TERMOS, parseTermo } from '@/lib/glossario/termos'

const html = (busca: string) => {
  endereco.busca = busca
  return renderToStaticMarkup(createElement(Glossario))
}

describe('Glossario', () => {
  it('renders one tab per term, in the design order with "Sequestro de carbono" last', () => {
    const markup = html('')
    const tabs = markup.match(/<button [^>]*role="tab"[^>]*>[^<]*<\/button>/g) ?? []

    expect(tabs.map((tab) => tab.replace(/<[^>]+>/g, ''))).toEqual([
      'Fotossíntese',
      'Estoque de carbono',
      'Torre de fluxo',
      'Fluxos de carbono',
      'Eficiência de uso do carbono',
      'Degradação',
      'Manejo agroecológico',
      'Sequestro de carbono',
    ])
    for (const tab of tabs) expect(tab).toMatch(/class="[^"]*\btext-ui-tab\b/)
  })

  it('opens the term the address names, and only that one', () => {
    const markup = html('?termo=torre-de-fluxo')

    expect(markup).toMatch(/id="glossario-tab-torre-de-fluxo"[^>]*aria-selected="true"[^>]*tabindex="0"/)
    expect(markup).toMatch(/id="glossario-tab-fotossintese"[^>]*aria-selected="false"[^>]*tabindex="-1"/)
    expect(markup).toMatch(/<h2[^>]*>Torre de fluxo<\/h2>/)
    expect(markup.match(/role="tabpanel"/g)).toHaveLength(1)
    expect(markup.match(/<canvas/g)).toHaveLength(1)
  })

  it('opens the first term when the address names none, or an unknown one', () => {
    for (const busca of ['', '?termo=outro', '?outra=coisa']) {
      expect(html(busca), busca).toMatch(/id="glossario-tab-fotossintese"[^>]*aria-selected="true"/)
    }
  })

  it('points only the open tab at the panel, which it labels', () => {
    const markup = html('?termo=degradacao')
    const controls = [...markup.matchAll(/aria-controls="([^"]+)"/g)].map(([, id]) => id)

    expect(controls).toEqual(['glossario-painel'])
    expect(markup).toMatch(/id="glossario-painel"[^>]*aria-labelledby="glossario-tab-degradacao"|aria-labelledby="glossario-tab-degradacao"[^>]*id="glossario-painel"/)
  })

  it('links "Estoque de carbono" to its layer on the platform', () => {
    expect(html('?termo=estoque-de-carbono')).toContain(
      `href="/login?redirect=${encodeURIComponent('/mapa?camada=estoque_carbono')}"`,
    )
  })
})

describe('parseTermo', () => {
  it('opens the term the address names', () => {
    expect(parseTermo('torre-de-fluxo').slug).toBe('torre-de-fluxo')
    expect(parseTermo('sequestro-de-carbono').slug).toBe('sequestro-de-carbono')
  })

  it('opens the first term for anything else', () => {
    for (const value of [undefined, '', 'Torre-de-fluxo', 'outro', ['degradacao', 'degradacao']]) {
      expect(parseTermo(value).slug, JSON.stringify(value)).toBe(TERMOS[0].slug)
    }
  })
})
