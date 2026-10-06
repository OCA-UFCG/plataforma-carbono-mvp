import { describe, expect, it } from 'vitest'
import { INICIO_CAMINHOS, caminhosCards } from '@/lib/content/caminhos'
import { MAPA_LINK, TERRITORIOS_LINK } from '@/lib/marketing/nav'
import { copyDefaults } from '@/lib/content/site/model'

const CARDS = caminhosCards(copyDefaults(INICIO_CAMINHOS))

describe('caminhos content', () => {
  it('ships the two cards the design lays out, the summary first', () => {
    expect(CARDS.map((c) => c.titulo)).toEqual(['Resumo territorial', 'Plataforma de dados'])
  })

  it('sends each card to its product, across the route groups', () => {
    expect(CARDS.map((c) => c.href)).toEqual([TERRITORIOS_LINK.href, MAPA_LINK.href])
  })

  // The design labels both buttons "Ver Resumo"; the second one opens the
  // platform, so it says so.
  it('labels each button after where it goes', () => {
    expect(CARDS.map((c) => c.botao)).toEqual(['Ver Resumo', 'Acessar plataforma'])
  })

  it('gives every card its badge, text, three items and its own image', () => {
    for (const card of CARDS) {
      expect(card.selo, card.id).not.toBe('')
      expect(card.texto, card.id).not.toBe('')
      expect(card.itens, card.id).toHaveLength(3)
      expect(card.imagem).toMatch(/^\/images\/caminhos\/[a-z0-9-]+\.webp$/)
    }
    expect(new Set(CARDS.map((c) => c.imagem)).size).toBe(CARDS.length)
  })

  it('gives every card an id usable in an aria reference', () => {
    for (const card of CARDS) {
      expect(card.id).toMatch(/^[a-z0-9-]+$/)
    }
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length)
  })
})
