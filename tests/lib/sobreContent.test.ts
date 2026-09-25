import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CARBONO_E_COMUNIDADES } from '@/lib/content/sobre/carbono-e-comunidades'

function inPublic(src: string): boolean {
  return existsSync(path.join(process.cwd(), 'public', src))
}

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
