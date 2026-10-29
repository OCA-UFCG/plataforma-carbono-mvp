import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// The open tab is read from the address, as Next.js hands it to the page.
const endereco = vi.hoisted(() => ({ busca: '' }))

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(endereco.busca) }))

import ComunicacaoAbas from '@/components/marketing/ComunicacaoAbas'

const paineis = {
  conteudo: createElement('p', null, 'painel de conteúdo'),
  eventos: createElement('p', null, 'painel de eventos'),
}

const html = (busca: string) => {
  endereco.busca = busca
  return renderToStaticMarkup(createElement(ComunicacaoAbas, { paineis }))
}

describe('ComunicacaoAbas', () => {
  it('renders every tab in the Inter tab style, and every panel', () => {
    const markup = html('')
    const tabs = markup.match(/<button [^>]*role="tab"[^>]*>[^<]*<\/button>/g) ?? []

    expect(tabs.map((tab) => tab.replace(/<[^>]+>/g, ''))).toEqual(['Conteúdo', 'Eventos e articulações'])
    for (const tab of tabs) expect(tab).toMatch(/class="[^"]*\btext-ui-tab\b/)
    expect(markup).toContain('painel de conteúdo')
    expect(markup).toContain('painel de eventos')
  })

  it('opens the tab the address names and hides the other panel', () => {
    const markup = html('?aba=eventos')

    expect(markup).toMatch(/id="comunicacao-tab-eventos"[^>]*aria-selected="true"[^>]*tabindex="0"/)
    expect(markup).toMatch(/id="comunicacao-tab-conteudo"[^>]*aria-selected="false"[^>]*tabindex="-1"/)
    expect(markup).toMatch(/id="comunicacao-panel-conteudo"[^>]*hidden=""/)
    expect(markup).not.toMatch(/id="comunicacao-panel-eventos"[^>]*hidden=""/)
  })

  it('opens the first tab when the address names none, or an unknown one', () => {
    for (const busca of ['', '?aba=outra', '?outra=coisa']) {
      expect(html(busca), busca).toMatch(/id="comunicacao-tab-conteudo"[^>]*aria-selected="true"/)
    }
  })

  it('points every tab at a panel present in the markup', () => {
    const markup = html('')

    for (const [, panel] of markup.matchAll(/aria-controls="([^"]+)"/g)) {
      expect(markup).toContain(`id="${panel}"`)
    }
  })
})
