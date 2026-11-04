import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// The open term is read from the address, as Next.js hands it to the page.
const endereco = vi.hoisted(() => ({ busca: '' }))

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(endereco.busca) }))

import Glossario from '@/components/marketing/Glossario'
import BotaoReproduzir from '@/components/glossario/painel/BotaoReproduzir'
import { TERMOS, parseTermo } from '@/lib/glossario/termos'
import type { SiteLocale } from '@/lib/locale'
import { withIntl } from '@/tests/helpers/intl'

const html = (busca: string, locale: SiteLocale = 'pt') => {
  endereco.busca = busca
  return renderToStaticMarkup(withIntl(createElement(Glossario, { titulo: 'Glossário' }), locale))
}

const tabLabels = (markup: string) =>
  (markup.match(/<button [^>]*role="tab"[^>]*>[^<]*<\/button>/g) ?? []).map((tab) => tab.replace(/<[^>]+>/g, ''))

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

describe('Glossario in English', () => {
  it('names the terms, the list and the search box in English', () => {
    const markup = html('', 'en')

    expect(tabLabels(markup)).toEqual([
      'Photosynthesis',
      'Carbon stock',
      'Flux tower',
      'Carbon fluxes',
      'Carbon use efficiency',
      'Degradation',
      'Agroecological management',
      'Carbon sequestration',
      'Carbon inventory',
    ])
    expect(markup).toMatch(/role="tablist"[^>]*aria-label="Glossary terms"/)
    expect(markup).toMatch(/<input [^>]*placeholder="Search terms"[^>]*aria-label="Search terms"|<input [^>]*aria-label="Search terms"[^>]*placeholder="Search terms"/)
  })

  it('heads the open term, describes its animation and links to the platform in English', () => {
    const markup = html('?termo=estoque-de-carbono', 'en')

    expect(markup).toMatch(/<h2[^>]*>Carbon stock<\/h2>/)
    expect(markup).toMatch(/<canvas [^>]*aria-label="Cross-section of a Caatinga landscape showing where carbon is stored/)
    expect(markup).toMatch(/<figcaption[^>]*>Where carbon is stored<\/figcaption>/)
    expect(markup).toMatch(/<a [^>]*href="\/login[^"]*"[^>]*>Access stock data for the Caatinga biome<\/a>/)
  })

  it('keeps the address of each term in Portuguese, the same in both languages', () => {
    expect(html('?termo=torre-de-fluxo', 'en')).toMatch(/id="glossario-tab-torre-de-fluxo"[^>]*aria-selected="true"/)
  })
})

// Each term carries its words in both languages, side by side, so a term
// added in one cannot ship without the other.
describe('the glossary terms', () => {
  it('has every text in both languages', () => {
    for (const termo of TERMOS) {
      for (const texto of [termo.titulo, termo.animacao?.titulo, termo.animacao?.descricao, termo.acesso?.rotulo]) {
        if (texto === undefined) continue
        expect(texto.pt, termo.slug).toBeTruthy()
        expect(texto.en, termo.slug).toBeTruthy()
        expect(texto.en, termo.slug).not.toBe(texto.pt)
      }
      expect(termo.paragrafos.en, termo.slug).toHaveLength(termo.paragrafos.pt.length)
      expect(termo.paragrafosAposCena?.en.length, termo.slug).toBe(termo.paragrafosAposCena?.pt.length)
    }
  })
})

describe('BotaoReproduzir', () => {
  it('labels play and pause in the reader’s language', () => {
    const markup = (locale: SiteLocale) =>
      renderToStaticMarkup(withIntl(createElement(BotaoReproduzir, { tocando: false, onClick: () => {} }), locale))

    expect(markup('pt')).toMatch(/>Reproduzir<.*>Pausar</)
    expect(markup('en')).toMatch(/>Play<.*>Pause</)
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
