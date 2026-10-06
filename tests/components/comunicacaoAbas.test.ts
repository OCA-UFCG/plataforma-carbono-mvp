import { describe, expect, it } from 'vitest'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ComunicacaoAbas from '@/components/marketing/ComunicacaoAbas'

const html = <P extends object>(component: ComponentType<P>, props: P) =>
  renderToStaticMarkup(createElement(component, props))

const paineis = {
  conteudo: createElement('p', null, 'painel de conteúdo'),
  eventos: createElement('p', null, 'painel de eventos'),
}

describe('ComunicacaoAbas', () => {
  it('renders both tabs in the Inter tab style, and both panels', () => {
    const markup = html(ComunicacaoAbas, { inicial: 'conteudo', paineis })
    const tabs = markup.match(/<button [^>]*role="tab"[^>]*>[^<]*<\/button>/g) ?? []

    expect(tabs.map((tab) => tab.replace(/<[^>]+>/g, ''))).toEqual(['Conteúdo', 'Eventos e articulações'])
    for (const tab of tabs) expect(tab).toMatch(/class="[^"]*\btext-ui-tab\b/)
    expect(markup).toContain('painel de conteúdo')
    expect(markup).toContain('painel de eventos')
  })

  it('opens the tab it is given and hides the other panel', () => {
    const markup = html(ComunicacaoAbas, { inicial: 'eventos', paineis })

    expect(markup).toMatch(/id="comunicacao-tab-eventos"[^>]*aria-selected="true"[^>]*tabindex="0"/)
    expect(markup).toMatch(/id="comunicacao-tab-conteudo"[^>]*aria-selected="false"[^>]*tabindex="-1"/)
    expect(markup).toMatch(/id="comunicacao-panel-conteudo"[^>]*hidden=""/)
    expect(markup).not.toMatch(/id="comunicacao-panel-eventos"[^>]*hidden=""/)
  })

  it('points every tab at a panel present in the markup', () => {
    const markup = html(ComunicacaoAbas, { inicial: 'conteudo', paineis })

    for (const [, panel] of markup.matchAll(/aria-controls="([^"]+)"/g)) {
      expect(markup).toContain(`id="${panel}"`)
    }
  })
})
