import { describe, expect, it } from 'vitest'
import { ABAS_PLATAFORMA } from '@/lib/content/plataforma'

describe('plataforma tabs', () => {
  it('declares the four tabs the design shows', () => {
    expect(ABAS_PLATAFORMA.map((a) => a.label)).toEqual([
      'O que é a CaatiVAR?',
      'A Caatinga',
      'Carbono e comunidades',
      'Como funciona',
    ])
  })

  it('gives every tab its content, titled after the tab', () => {
    for (const aba of ABAS_PLATAFORMA) {
      expect(aba.conteudo, aba.id).not.toBeNull()
      expect(aba.conteudo?.titulo).toBe(aba.label)
      expect(aba.conteudo?.imagem).toMatch(/^\/images\/plataforma\/[a-z0-9-]+\.webp$/)
    }
  })

  it('gives every tab a slug usable as an anchor and an aria id', () => {
    for (const aba of ABAS_PLATAFORMA) {
      expect(aba.id).toMatch(/^[a-z0-9-]+$/)
    }
  })
})
