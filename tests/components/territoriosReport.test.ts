import { describe, expect, it } from 'vitest'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PanelNav from '@/components/territorios/PanelNav'
import ReportActions, { type ReportActionsProps } from '@/components/territorios/ReportActions'
import ReportBand from '@/components/territorios/ReportBand'
import ReportTabs from '@/components/territorios/ReportTabs'
import StepIcon from '@/components/territorios/StepIcon'
import { TERRITORY_TYPES, type TerritoryType } from '@/config/territorios/story'
import type { TerritoryTypeId } from '@/types/territorios'

const html = <P extends object>(component: ComponentType<P>, props: P) =>
  renderToStaticMarkup(createElement(component, props))

const noop = () => {}
const typeOf = (id: TerritoryTypeId): TerritoryType => TERRITORY_TYPES.find((t) => t.id === id)!

/** Every <button> of a markup: its text without tags, and whether it is disabled. */
function buttons(markup: string): { text: string; disabled: boolean }[] {
  return [...markup.matchAll(/<button([^>]*)>(.*?)<\/button>/g)].map(([, attrs, inner]) => ({
    text: inner.replace(/<[^>]+>/g, '').trim(),
    disabled: /\sdisabled=""/.test(attrs),
  }))
}

describe('ReportTabs', () => {
  it('opens on "Localização" while a territory is chosen, every step disabled', () => {
    const markup = html(ReportTabs, { current: 'localizacao', stepsEnabled: false, onLocation: null, onSelect: noop })
    expect(buttons(markup)).toEqual([
      { text: 'Localização', disabled: false },
      { text: 'Território', disabled: true },
      { text: 'Estoque', disabled: true },
      { text: 'Fluxo', disabled: true },
      { text: 'Uso da terra', disabled: true },
      { text: 'Fogo', disabled: true },
      { text: 'Chuva', disabled: true },
      { text: 'Resumo', disabled: true },
    ])
    expect(markup).toMatch(/aria-current="step"[^>]*>Localização</)
  })

  it('marks the open step and leads back to the chooser', () => {
    const markup = html(ReportTabs, { current: 'fogo', stepsEnabled: true, onLocation: noop, onSelect: noop })
    expect(buttons(markup).every((b) => !b.disabled)).toBe(true)
    expect(markup).toMatch(/aria-current="step"[^>]*>Fogo</)
    expect(markup.match(/aria-current/g)).toHaveLength(1)
  })

  it('disables "Localização" for the bioma, which has nothing to choose', () => {
    const markup = html(ReportTabs, { current: 'territorio', stepsEnabled: true, onLocation: null, onSelect: noop })
    expect(buttons(markup)[0]).toEqual({ text: 'Localização', disabled: true })
  })
})

const ACTIONS: ReportActionsProps = {
  type: typeOf('municipio'), onChangeType: noop, location: null, shareTitle: null, onDownload: null, downloading: false,
}

describe('ReportActions', () => {
  it('asks for a location and disables both buttons before a territory is chosen', () => {
    const markup = html(ReportActions, ACTIONS)
    expect(markup).toContain('<p class="territorios-selo">Localização: escolher</p>')
    expect(buttons(markup)).toEqual([
      { text: 'Recorte: município. Trocar tipo', disabled: false },
      { text: 'Baixar', disabled: true },
      { text: 'Compartilhar', disabled: true },
    ])
    expect(markup).toContain('/images/territorios/icones/compartilhar-desabilitado.svg')
  })

  it('names the chosen territory and opens the chooser from its badge', () => {
    const markup = html(ReportActions, {
      ...ACTIONS, location: { value: 'Juazeiro (BA)', onEdit: noop }, shareTitle: 'Juazeiro (BA)', onDownload: noop,
    })
    expect(buttons(markup)).toEqual([
      { text: 'Recorte: município. Trocar tipo', disabled: false },
      { text: 'Localização: Juazeiro (BA). Trocar território', disabled: false },
      { text: 'Baixar', disabled: false },
      { text: 'Compartilhar', disabled: false },
    ])
    expect(markup).toContain('/images/territorios/icones/compartilhar.svg')
  })

  it('shows the bioma\'s location as a plain badge', () => {
    const markup = html(ReportActions, {
      ...ACTIONS, type: typeOf('bioma'), location: { value: 'Caatinga', onEdit: null }, shareTitle: 'Caatinga', onDownload: noop,
    })
    expect(markup).toContain('<p class="territorios-selo">Localização: <b>Caatinga</b></p>')
    expect(buttons(markup).map((b) => b.text)).toEqual(['Recorte: bioma. Trocar tipo', 'Baixar', 'Compartilhar'])
  })

  it('leaves the location out while the territory loads', () => {
    expect(html(ReportActions, { ...ACTIONS, location: undefined })).not.toContain('Localização')
  })

  it('marks "Baixar" busy while the summary waits for its themes', () => {
    expect(html(ReportActions, { ...ACTIONS, onDownload: noop, downloading: true })).toContain('aria-busy="true"')
  })
})

describe('ReportBand', () => {
  it('lays the actions beside the titles only when there are some', () => {
    const plain = html(ReportBand, { eyebrow: 'Territórios', title: 'Que território você quer conhecer?', headingRef: null })
    expect(plain).not.toContain('territorios-secao-faixa--acoes')
    expect(plain).toContain('<h2 id="territorios-secao-titulo" tabindex="-1" class="territorios-secao-titulo text-h2">')

    const withActions = html(ReportBand, {
      eyebrow: 'Territórios', title: 'Juazeiro (BA)', headingRef: null, children: createElement('span', null, 'ações'),
    })
    expect(withActions).toContain('territorios-secao-faixa--acoes')
  })
})

describe('PanelNav', () => {
  it('goes back to the types and on to the named tab', () => {
    expect(buttons(html(PanelNav, { onBack: noop, next: { label: 'Estoque', onClick: noop } }))).toEqual([
      { text: 'Recorte', disabled: false },
      { text: 'Estoque', disabled: false },
    ])
  })

  it('disables the way on until there is somewhere to go, with the grey arrow', () => {
    const markup = html(PanelNav, { onBack: noop, next: { label: 'Ver relatório', onClick: null } })
    expect(buttons(markup)[1]).toEqual({ text: 'Ver relatório', disabled: true })
    expect(markup).toContain('seta-direita-desabilitada.svg')
  })

  it('has only the way back on the summary', () => {
    expect(buttons(html(PanelNav, { onBack: noop }))).toEqual([{ text: 'Recorte', disabled: false }])
  })
})

describe('StepIcon', () => {
  it('places an inner glyph at its inset inside the 24 px box', () => {
    const markup = html(StepIcon, { step: 'fluxo' })
    expect(markup).toContain('src="/images/territorios/icones/fluxo.svg"')
    expect(markup).toContain('width="20" height="17" style="top:3px;left:2px"')
  })
})
