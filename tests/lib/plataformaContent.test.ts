import { describe, expect, it } from 'vitest'
import { ABAS_PLATAFORMA } from '@/lib/content/plataforma'
import pt from '@/translations/pt/Plataforma.json'
import en from '@/translations/en/Plataforma.json'

describe('plataforma tabs', () => {
  it('declares the four tabs the design shows', () => {
    expect(ABAS_PLATAFORMA.map((a) => pt.Plataforma.tabs[a.key].label)).toEqual([
      'O que é a CaatiVAR?',
      'A Caatinga',
      'Carbono e comunidades',
      'Como funciona',
    ])
  })

  it('gives every tab its copy in every language, titled after the tab', () => {
    for (const { Plataforma } of [pt, en]) {
      for (const aba of ABAS_PLATAFORMA) {
        const tab = Plataforma.tabs[aba.key]
        expect(Object.keys(tab).sort(), aba.id).toEqual(['body', 'highlight', 'imageAlt', 'label', 'title'])
        expect(tab.title, aba.id).toBe(tab.label)
      }
    }
  })

  it('points every tab at its image', () => {
    for (const aba of ABAS_PLATAFORMA) {
      expect(aba.imagem).toMatch(/^\/images\/plataforma\/[a-z0-9-]+\.webp$/)
    }
  })

  it('gives every tab a slug usable as an anchor and an aria id', () => {
    for (const aba of ABAS_PLATAFORMA) {
      expect(aba.id).toMatch(/^[a-z0-9-]+$/)
    }
  })
})
