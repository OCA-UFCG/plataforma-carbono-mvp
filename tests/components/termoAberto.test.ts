import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import TermoAberto from '@/components/glossario/TermoAberto'
import type { Termo } from '@/lib/glossario/termos'
import type { SiteLocale } from '@/lib/locale'
import { withIntl } from '@/tests/helpers/intl'

const TERMO: Termo = {
  slug: 'teste',
  titulo: { pt: 'Termo de teste', en: 'Test term' },
  paragrafos: { pt: ['Antes da cena.'], en: ['Before the scene.'] },
  animacao: {
    id: 'cicloAnual',
    titulo: { pt: 'Cena de teste', en: 'Test scene' },
    descricao: { pt: 'Descrição da cena.', en: 'The scene described.' },
  },
  paragrafosAposCena: {
    pt: ['Depois da cena, primeiro.', 'Depois da cena, segundo.'],
    en: ['After the scene, first.', 'After the scene, second.'],
  },
  acesso: { href: '/login', rotulo: { pt: 'Acesse os dados', en: 'Access the data' } },
  fontes: ['Fonte A.'],
}

const html = (termo: Termo, locale: SiteLocale = 'pt') =>
  renderToStaticMarkup(withIntl(createElement(TermoAberto, { termo }), locale))

describe('TermoAberto', () => {
  it('puts the text written for under the scene after its control panel, before the way into the platform', () => {
    const markup = html(TERMO)
    const posicoes = ['Antes da cena.', '</figure>', 'Depois da cena, primeiro.', 'Depois da cena, segundo.', 'Acesse os dados', 'Fonte A.'].map(
      (trecho) => markup.indexOf(trecho),
    )

    expect(posicoes.every((p) => p >= 0), JSON.stringify(posicoes)).toBe(true)
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b))
  })

  it('sets the text under the scene in the body style', () => {
    expect(html(TERMO)).toMatch(/<p class="[^"]*\btext-body\b[^"]*">Depois da cena, primeiro\.<\/p>/)
  })

  it('draws nothing between the scene and the way into the platform for a term without that text', () => {
    const semTexto: Termo = { ...TERMO, paragrafosAposCena: undefined }

    expect(html(semTexto)).toMatch(/<\/figure><a /)
  })

  it('writes every text of the term, and the sources heading, in the reader’s language', () => {
    const markup = html(TERMO, 'en')
    const posicoes = ['Before the scene.', '</figure>', 'After the scene, first.', 'Access the data', 'Sources', 'Fonte A.'].map(
      (trecho) => markup.indexOf(trecho),
    )

    expect(markup).toMatch(/<h2[^>]*>Test term<\/h2>/)
    expect(posicoes.every((p) => p >= 0), JSON.stringify(posicoes)).toBe(true)
    expect(markup).not.toMatch(/Antes da cena|Depois da cena|Acesse os dados|>Fontes</)
  })
})
