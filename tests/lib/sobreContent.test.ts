import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CARBONO_E_COMUNIDADES } from '@/lib/content/sobre/carbono-e-comunidades'
import { SOBRE_PLATAFORMA } from '@/lib/content/sobre/plataforma'
import { COMO_FUNCIONA } from '@/lib/content/sobre/como-funciona'
import { SOBRE_FAIXA } from '@/lib/content/paginas'

function inPublic(src: string): boolean {
  return existsSync(path.join(process.cwd(), 'public', src))
}

describe('Conheça a plataforma (/sobre)', () => {
  const p = SOBRE_PLATAFORMA

  it('opens with why the platform exists, beside its photo', () => {
    expect(p.porQue.titulo).toBe('Por que criar uma plataforma para a Caatinga?')
    expect(inPublic(p.porQue.imagem)).toBe(true)
  })

  it('answers the two questions of the icon cards, each with an icon that exists', () => {
    expect(p.cards.map((card) => card.titulo)).toEqual([
      'Qual é a missão da CaatiVAR?',
      'Para quem é a plataforma?',
    ])
    for (const card of p.cards) {
      expect(inPublic(card.icone), card.icone).toBe(true)
    }
  })

  it('closes on what the platform does not do', () => {
    expect(SOBRE_FAIXA.title).toBe('O que a plataforma não faz')
    expect(SOBRE_FAIXA.items).toEqual([
      'Não vende créditos de carbono',
      'Não certifica nem aprova projetos',
      'Não substitui reguladores e certificadoras',
    ])
  })
})

describe('Entenda essa relação (/sobre/carbono-e-comunidades)', () => {
  const c = CARBONO_E_COMUNIDADES

  it('lists the seven cautions of the red card', () => {
    expect(c.cuidados.itens).toHaveLength(7)
    expect(c.cuidados.titulo).toBe('Quais cuidados devem ser observados?')
  })

  it('asks the eight questions, each with an icon that exists', () => {
    expect(c.perguntas.itens).toHaveLength(8)
    for (const { pergunta, icone } of c.perguntas.itens) {
      expect(inPublic(icone.src), `${pergunta}: ${icone.src}`).toBe(true)
      if (icone.glyph) expect(inPublic(icone.glyph.src), `${pergunta}: ${icone.glyph.src}`).toBe(true)
    }
  })

  it('states the two minimum shares the law guarantees', () => {
    expect(c.lei.garantias).toEqual([
      { rotulo: 'créditos de remoção', valor: 'mín. 50%' },
      { rotulo: 'redução do desmatamento', valor: 'mín. 70%' },
    ])
  })

  // The design marks three terms with "ⓘ" for a glossary it does not define
  // (issue #44, question 3). Until it exists, the words appear without it.
  it('carries no glossary marker yet', () => {
    expect(JSON.stringify(c)).not.toContain('ⓘ')
  })

  it('points its photo at a file that exists', () => {
    expect(inPublic(c.direitoTerra.imagem)).toBe(true)
  })
})

describe('Como funciona (/sobre/como-funciona)', () => {
  const c = COMO_FUNCIONA

  it('walks through the six steps of using the map, in order', () => {
    expect(c.passos.map((p) => p.titulo)).toEqual([
      'Encontre a área de interesse',
      'Escolha as informações',
      'Visualize no mapa',
      'Escolha o período',
      'Consulte os detalhes',
      'Gere um relatório territorial',
    ])
  })

  it('groups the information in the four themes of the map', () => {
    const grupos = c.passos.flatMap((p) => p.grupos ?? [])
    expect(grupos.map((g) => [g.rotulo, g.tom])).toEqual([
      ['Território', 'territorio'],
      ['Carbono', 'carbono'],
      ['Uso da terra e pressões', 'pressoes'],
      ['Ambiente', 'ambiente'],
    ])
    expect(grupos.every((g) => g.itens.length > 0)).toBe(true)
  })

  it('answers the three frequent questions', () => {
    expect(c.duvidas.itens).toHaveLength(3)
    expect(c.duvidas.itens.every((d) => d.pergunta.endsWith('?') && d.resposta.length > 0)).toBe(true)
  })
})
