import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import TermoAberto from '@/components/glossario/TermoAberto'
import type { Termo } from '@/lib/glossario/termos'

const TERMO: Termo = {
  slug: 'teste',
  titulo: 'Termo de teste',
  paragrafos: ['Antes da cena.'],
  animacao: { id: 'cicloAnual', titulo: 'Cena de teste', descricao: 'Descrição da cena.' },
  paragrafosAposCena: ['Depois da cena, primeiro.', 'Depois da cena, segundo.'],
  acesso: { href: '/login', rotulo: 'Acesse os dados' },
  fontes: ['Fonte A.'],
}

const html = (termo: Termo) => renderToStaticMarkup(createElement(TermoAberto, { termo }))

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
})
