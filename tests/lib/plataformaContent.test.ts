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

  it('only the first tab has content; the other three are awaiting copy', () => {
    expect(ABAS_PLATAFORMA[0].conteudo).not.toBeNull()
    expect(ABAS_PLATAFORMA.slice(1).every((a) => a.conteudo === null)).toBe(true)
  })

  it('gives every tab a slug usable as an anchor and an aria id', () => {
    for (const aba of ABAS_PLATAFORMA) {
      expect(aba.id).toMatch(/^[a-z0-9-]+$/)
    }
  })
})
