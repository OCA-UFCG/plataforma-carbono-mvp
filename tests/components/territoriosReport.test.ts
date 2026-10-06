import { describe, expect, it } from 'vitest'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PanelNav from '@/components/territorios/PanelNav'
import ReportActions, { type ReportActionsProps } from '@/components/territorios/ReportActions'
import ReportBand from '@/components/territorios/ReportBand'
import ReportTabs from '@/components/territorios/ReportTabs'
import StepIcon from '@/components/territorios/StepIcon'
import StorySummary from '@/components/territorios/StorySummary'
import TerritoryChooser from '@/components/territorios/TerritoryChooser'
import ThemeStep from '@/components/territorios/ThemeStep'
import { TERRITORY_TYPES, type TerritoryType } from '@/config/territorios/story'
import type { BiomeReference, TerritoryPayload, TerritoryTypeId } from '@/types/territorios'

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

const NO_BIOME: BiomeReference = {
  stockTotalTc: null, stockDensityTcHa: null, forestSharePct: null, fluxPerForestHaMg: null,
  nativeSharePct: null, fireBurnedSharePct: null, fireRecurrenceSharesPct: null,
  fireAnnualMeanSharePct: null, rainMeanMm: null,
}

/** Juazeiro (BA), the territory of the Figma frames; 6.720 km² as Figma 19254:37456 prints it. */
const JUAZEIRO: TerritoryPayload = {
  recorteId: 'municipios', recorteName: 'Municípios',
  featureId: 'juazeiro', featureName: 'Juazeiro', context: 'BA',
  areaHa: 672_000, biomaAreaHa: 86_000_000,
  bbox: [-40.9, -10.0, -39.9, -9.2], boundary: 'full',
  geometry: { type: 'Polygon', coordinates: [] },
  biome: NO_BIOME,
  areaRank: { position: 40, total: 1210 },
}

const STEP = {
  territory: JUAZEIRO, type: typeOf('municipio'), load: { kind: 'loading' } as const,
  expired: false, onRetry: noop, onBack: noop, onNext: noop,
}

describe('ThemeStep', () => {
  it('lays out the territory tab of Figma 19254:37447', () => {
    const markup = html(ThemeStep, { ...STEP, step: 'territorio' })
    expect(markup).toContain('<h3 id="etapa-territorio-titulo" class="territorios-etapa-titulo" style="color:#587c22" tabindex="-1">')
    expect(markup).toContain('/images/territorios/icones/territorio.svg')
    expect(markup).toContain('Onde fica e qual é o tamanho?')
    expect(markup).toContain('>6.720<')
    expect(markup).toContain('Área dentro da Caatinga, na Bahia.')
    expect(markup).toContain('<ul class="territorios-indicadores">')
    expect(markup).toContain('maior entre os 1.210 municípios')
    expect(buttons(markup).map((b) => b.text)).toEqual(['Recorte', 'Estoque'])
  })

  it('names the summary on the last theme\'s button, and waits for its data', () => {
    const markup = html(ThemeStep, { ...STEP, step: 'chuva' })
    expect(buttons(markup).map((b) => b.text)).toEqual(['Recorte', 'Resumo'])
    expect(markup).toContain('Carregando os dados')
  })
})

const LOADING_ALL = {
  estoque: { kind: 'loading' }, fluxo: { kind: 'loading' }, uso: { kind: 'loading' },
  fogo: { kind: 'loading' }, chuva: { kind: 'loading' },
} as const

const SUMMARY = {
  territory: JUAZEIRO, type: typeOf('municipio'), loads: LOADING_ALL,
  expired: false, onRetry: noop, onBack: noop,
}

describe('StorySummary', () => {
  it('stays in the page, hidden, while another tab is open, for "Baixar"', () => {
    // Not anchored: React hoists <link rel="preload"> for the icons ahead of the section.
    expect(html(StorySummary, { ...SUMMARY, hidden: true })).toMatch(/<section id="etapa-resumo"[^>]* hidden=""/)
  })

  it('lays out a card per theme, the name for paper only, and the way back', () => {
    const markup = html(StorySummary, { ...SUMMARY, hidden: false })
    // Cards still loading stay off the printed sheet.
    expect(markup.match(/<li class="territorios-ficha territorios-no-print"/g)).toHaveLength(5)
    expect(markup).toContain('<header class="territorios-ficha-cabecalho territorios-so-impressao">')
    expect(markup).toContain('Juazeiro (BA)')
    expect(markup).toContain('/images/territorios/icones/abrir.svg')
    expect(buttons(markup).map((b) => b.text)).toEqual(['Recorte'])
  })

  it('offers a retry on a failed card, named for its theme', () => {
    const markup = html(StorySummary, {
      ...SUMMARY, hidden: false, loads: { ...LOADING_ALL, fogo: { kind: 'failed', rateLimited: false } },
    })
    expect(markup).toContain('aria-label="Tentar novamente: Fogo"')
  })
})

describe('TerritoryChooser', () => {
  it('ends its column with the way back and "Ver relatório", disabled until a territory is proposed', () => {
    const markup = html(TerritoryChooser, {
      type: typeOf('municipio'), onChoose: noop, onBack: noop, onUnauthorized: noop,
    })
    expect(markup).toContain('Qual município?')
    expect(buttons(markup).slice(-2)).toEqual([
      { text: 'Recorte', disabled: false },
      { text: 'Ver relatório', disabled: true },
    ])
    // The locate button carries the design's pin; the privacy note stays.
    expect(markup).toContain('/images/territorios/icones/localizacao.svg')
    expect(markup).toContain('Sua localização não é enviada nem guardada.')
  })
})
