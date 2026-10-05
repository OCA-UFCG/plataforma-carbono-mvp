import { describe, expect, it } from 'vitest'
import { INICIO_PLATAFORMA, abasPlataforma } from '@/lib/content/plataforma'
import { copyDefaults } from '@/lib/content/site/model'

const ABAS_PLATAFORMA = abasPlataforma(copyDefaults(INICIO_PLATAFORMA))

describe('plataforma tabs', () => {
  it('declares the four tabs the design shows', () => {
    expect(ABAS_PLATAFORMA.map((a) => a.label)).toEqual([
      'O que é a Caativar?',
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
      expect(aba.conteudo.paragrafos.length).toBeGreaterThan(0)
    }
  })

  it('gives every tab a slug usable as an anchor and an aria id', () => {
    for (const aba of ABAS_PLATAFORMA) {
      expect(aba.id).toMatch(/^[a-z0-9-]+$/)
    }
    expect(new Set(ABAS_PLATAFORMA.map((a) => a.id)).size).toBe(ABAS_PLATAFORMA.length)
  })
})
