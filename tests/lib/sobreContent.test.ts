import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CARBONO_E_COMUNIDADES,
  CARBONO_E_COMUNIDADES_IMAGEM,
  perguntas,
} from '@/lib/content/sobre/carbono-e-comunidades'
import {
  SOBRE_PLATAFORMA,
  SOBRE_PLATAFORMA_ICONES,
  SOBRE_PLATAFORMA_IMAGEM,
} from '@/lib/content/sobre/plataforma'
import { COMO_FUNCIONA, duvidas, passos } from '@/lib/content/sobre/como-funciona'
import { CAATINGA, CAATINGA_PESSOAS_IMAGEM } from '@/lib/content/sobre/caatinga'
import { INICIO_DESTAQUES, destaquesCards } from '@/lib/content/destaques'
import { SOBRE_FAIXA_IMAGEM } from '@/lib/content/paginas'
import { copyDefaults } from '@/lib/content/site/model'

const DESTAQUES = destaquesCards(copyDefaults(INICIO_DESTAQUES))

function inPublic(src: string): boolean {
  return existsSync(path.join(process.cwd(), 'public', src))
}

describe('Conheça a plataforma (/sobre)', () => {
  const p = copyDefaults(SOBRE_PLATAFORMA)

  it('opens with why the platform exists, beside its photo', () => {
    expect(p.porQueTitulo).toBe('Por que criar uma plataforma para a Caatinga?')
    expect(inPublic(SOBRE_PLATAFORMA_IMAGEM.src)).toBe(true)
  })

  it('answers the two questions of the icon cards, each with an icon that exists', () => {
    expect([p.missaoTitulo, p.publicoTitulo]).toEqual([
      'Qual é a missão da Caativar?',
      'Para quem é a plataforma?',
    ])
    for (const icone of Object.values(SOBRE_PLATAFORMA_ICONES)) {
      expect(inPublic(icone), icone).toBe(true)
    }
  })

  it('closes on what the platform does not do', () => {
    expect(inPublic(SOBRE_FAIXA_IMAGEM)).toBe(true)
    expect(p.faixaTitulo).toBe('O que a plataforma não faz')
    expect(p.faixaItens).toEqual([
      'Não vende créditos de carbono',
      'Não certifica nem aprova projetos',
      'Não substitui reguladores e certificadoras',
    ])
  })
})

describe('Entenda essa relação (/sobre/carbono-e-comunidades)', () => {
  const c = copyDefaults(CARBONO_E_COMUNIDADES)

  it('lists the seven cautions of the red card', () => {
    expect(c.cuidadosItens).toHaveLength(7)
    expect(c.cuidadosTitulo).toBe('Quais cuidados devem ser observados?')
  })

  it('asks the eight questions, each with an icon that exists', () => {
    expect(perguntas(c)).toHaveLength(8)
    for (const { pergunta, icone } of perguntas(c)) {
      expect(inPublic(icone.src), `${pergunta}: ${icone.src}`).toBe(true)
      if (icone.glyph) expect(inPublic(icone.glyph.src), `${pergunta}: ${icone.glyph.src}`).toBe(true)
    }
  })

  // Figma 18988:8918 breaks question 5 as "Quem assumirá os custos e / os
  // riscos?". A no-break space keeps "os riscos?" together, which gives that
  // break in the 389px question column and still wraps freely when narrower.
  it('keeps "os riscos?" together in question 5', () => {
    expect(c.pergunta5).toBe('Quem assumirá os custos e os\u00a0riscos?')
  })

  it('states the two minimum shares the law guarantees', () => {
    expect([
      { rotulo: c.garantia1Rotulo, valor: c.garantia1Valor },
      { rotulo: c.garantia2Rotulo, valor: c.garantia2Valor },
    ]).toEqual([
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
    expect(inPublic(CARBONO_E_COMUNIDADES_IMAGEM.src)).toBe(true)
  })
})

describe('Como funciona (/sobre/como-funciona)', () => {
  const c = copyDefaults(COMO_FUNCIONA)

  it('walks through the six steps of using the map, in order', () => {
    expect(passos(c).map((p) => p.titulo)).toEqual([
      'Encontre a área de interesse',
      'Escolha as informações',
      'Visualize no mapa',
      'Escolha o período',
      'Consulte os detalhes',
      'Gere um relatório territorial',
    ])
  })

  it('groups the information in the four themes of the map', () => {
    const grupos = passos(c).flatMap((p) => p.grupos ?? [])
    expect(grupos.map((g) => [g.rotulo, g.tom])).toEqual([
      ['Território', 'territorio'],
      ['Carbono', 'carbono'],
      ['Uso da terra e pressões', 'pressoes'],
      ['Ambiente', 'ambiente'],
    ])
    expect(grupos.every((g) => g.itens.length > 0)).toBe(true)
  })

  it('answers the three frequent questions', () => {
    expect(duvidas(c)).toHaveLength(3)
    expect(duvidas(c).every((d) => d.pergunta.endsWith('?') && d.resposta.length > 0)).toBe(true)
  })
})

describe('Conheça a Caatinga (/sobre/caatinga)', () => {
  const c = copyDefaults(CAATINGA)
  const valores = [
    c.climaIndicadorValor,
    c.eficienciaIndicadorValor,
    c.armazenamentoIndicador1Valor,
    c.armazenamentoIndicador2Valor,
  ]

  it('states the four indicators, with the subscript as a character', () => {
    expect(valores).toEqual(['410 Mt', '60%', '125tC/ha', '1,5–5tCO₂/ha/ano'])
  })

  // The 2026-10-05 meeting dropped the vegetation section's highlight; the
  // field is optional, and empty it leaves the quote out.
  it('ships the vegetation section without its highlight', () => {
    expect(c.vegetacaoDestaque).toBe('')
  })

  // The landing's highlights (lib/content/destaques.ts) repeat three of these
  // figures, which must agree: since the 2026-10-05 meeting the landing's
  // removal card gives the same 40% as this page, not the 48% of gross carbon
  // removal it carried before.
  it('agrees with the landing on removal, efficiency and removal capacity', () => {
    expect(c.climaIndicadorTexto).toContain(
      `cerca de ${DESTAQUES.find((d) => d.rotulo === 'Remoção de carbono')?.numero}%`,
    )
    const landing = (rotulo: string) => DESTAQUES.find((d) => d.rotulo === rotulo)
    expect(`${landing('Eficiência de carbono')?.numero}${landing('Eficiência de carbono')?.unidade}`).toBe(
      c.eficienciaIndicadorValor,
    )
    expect(landing('Capacidade de remoção')?.numero).toBe('1,5–5')
    expect(c.armazenamentoIndicador2Valor.startsWith('1,5–5')).toBe(true)
  })

  it('compares the area under severe desertification in 2000 and 2020', () => {
    expect([c.comparacaoAnoAntes, c.comparacaoValorAntes]).toEqual(['2000', '74 mil km²'])
    expect([c.comparacaoAnoDepois, c.comparacaoValorDepois]).toEqual(['2020', '107 mil km²'])
  })

  it('points its photo and arrow at files that exist', () => {
    expect(inPublic(CAATINGA_PESSOAS_IMAGEM.src)).toBe(true)
    expect(inPublic('/icons/sobre/arrow.svg')).toBe(true)
  })
})
