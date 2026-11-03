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
  return renderToStaticMarkup(createElement(Glossario, { titulo: 'Glossário' }))
}

describe('Glossario', () => {
  it('renders one tab per term, in the design order followed by the terms the design does not draw yet', () => {
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
      'Inventário de carbono',
    ])
    for (const tab of tabs) expect(tab).toMatch(/class="[^"]*\btext-ui-tab\b/)
  })

  it('heads the sidebar with the page title, the page\'s only h1', () => {
    const markup = html('')

    expect(markup.match(/<h1[^>]*>[^<]*<\/h1>/g)).toEqual([expect.stringMatching(/>Glossário<\/h1>$/)])
  })

  it('puts a "Buscar termo" box over the list, which starts with every term showing', () => {
    const markup = html('')

    expect(markup).toMatch(/<input [^>]*type="search"[^>]*aria-label="Buscar termo"[^>]*aria-controls="glossario-termos"/)
    expect(markup).toMatch(/<input [^>]*placeholder="Buscar termo"/)
    expect(markup).toMatch(/<img [^>]*src="\/icons\/mapa\/search.svg"[^>]*alt=""/)
    expect(markup).toMatch(/id="glossario-termos"[^>]*role="tablist"/)
    expect(markup).not.toMatch(/role="tab"[^>]*hidden/)
    expect(markup).not.toContain('Nenhum termo encontrado')
  })

  it('lays the terms out as a vertical tab list', () => {
    expect(html('')).toMatch(/role="tablist"[^>]*aria-orientation="vertical"|aria-orientation="vertical"[^>]*role="tablist"/)
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
    const tabs = markup.match(/<button [^>]*role="tab"[^>]*>/g) ?? []
    const controls = tabs.flatMap((tab) => tab.match(/aria-controls="([^"]+)"/)?.[1] ?? [])

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
    for (const value of [null, '', 'Torre-de-fluxo', 'outro']) {
      expect(parseTermo(value).slug, JSON.stringify(value)).toBe(TERMOS[0].slug)
    }
  })
})
