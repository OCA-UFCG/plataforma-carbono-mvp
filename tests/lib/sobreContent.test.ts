import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CARBONO_E_COMUNIDADES, CARBONO_E_COMUNIDADES_IMAGEM } from '@/lib/content/sobre/carbono-e-comunidades'
import {
  SOBRE_LIMITES_IMAGEM,
  SOBRE_PLATAFORMA,
  SOBRE_PLATAFORMA_IMAGEM,
} from '@/lib/content/sobre/plataforma'
import { COMO_FUNCIONA, duvidas, passos } from '@/lib/content/sobre/como-funciona'
import { CAATINGA, CAATINGA_PESSOAS_IMAGEM } from '@/lib/content/sobre/caatinga'
import { INICIO_DESTAQUES, destaquesCards } from '@/lib/content/destaques'
import { copyDefaults } from '@/lib/content/site/model'
import { barFill } from '@/lib/marketing/figure'
import { MESSAGES } from '@/tests/helpers/intl'

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

  // The mission is a single quote (Figma 19538:11413), so one paragraph.
  it('states the mission as one paragraph', () => {
    expect(p.missaoTitulo).toBe('Qual é a missão da Caativar?')
    // The `paragraph` kind turns a blank line an editor types into a line
    // break, so the quote never splits into two paragraphs.
    expect(SOBRE_PLATAFORMA.fields.missaoTexto.kind).toBe('paragraph')
    expect(p.missaoTexto).not.toContain('\n')
  })

  // The chips name the audiences, and the text after them only adds who
  // else the platform serves (19538:11415).
  it('names the four audiences of the chips, then who else it serves', () => {
    expect(p.publicoTitulo).toBe('Para quem é a plataforma?')
    expect(p.publicoPerfis).toEqual(['Comunidades', 'Gestores públicos', 'Pesquisadores', 'Investidores'])
    expect(p.publicoTexto[0]).toMatch(/^A plataforma também atende demais interessados/)
  })

  it('closes on what the platform does not do, beside its photo', () => {
    expect(inPublic(SOBRE_LIMITES_IMAGEM.src)).toBe(true)
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

  // The design marks "consulta livre, prévia e informada" with "ⓘ" for a
  // glossary it does not define (issue #44, question 3). Until it exists, the
  // words appear without it.
  // The 2026-11-04 Figma frame (18988:8769) brings back what commit 438ec35
  // removed: the law figures, two sections and the closing paragraph.
  it('brings back the law figures, the decisions, the benefits and the closing', () => {
    expect([c.garantia1Valor, c.garantia2Valor]).toEqual(['mín. 50%', 'mín. 70%'])
    expect([c.garantia1Rotulo, c.garantia2Rotulo]).toEqual(['créditos de remoção', 'redução do desmatamento'])
    expect([c.decisoesTitulo, c.beneficiosTitulo]).toEqual([
      'Quem decide sobre os projetos?',
      'Como os benefícios devem ser repartidos?',
    ])
    expect(c.decisoesTexto).toHaveLength(3)
    expect(c.beneficiosTexto).toHaveLength(3)
    expect(c.fechamento).toMatch(/^Compreender essas questões/)
  })

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
  // The bars under the climate and efficiency cards (Figma 19406:47719) fill
  // to the share their own card states.
  it('fills each bar to the share its card states', () => {
    expect(c.climaIndicadorTexto).toContain(`cerca de ${c.climaIndicadorBarra}%`)
    expect(c.eficienciaIndicadorValor).toContain(`${c.eficienciaIndicadorBarra}%`)
    expect(barFill(c.climaIndicadorBarra)).toBe(38)
    expect(barFill(c.eficienciaIndicadorBarra)).toBe(60)
  })

  it('ships the vegetation section without its highlight', () => {
    expect(c.vegetacaoDestaque).toBe('')
  })

  // The landing's highlights (lib/content/destaques.ts) repeat two of these
  // figures, which must agree: the share of Brazil's removals in 2022 and the
  // carbon use efficiency.
  it('agrees with the landing on removal and efficiency', () => {
    const landing = (rotulo: string) => DESTAQUES.find((d) => d.rotulo === rotulo)
    expect(c.climaIndicadorTexto).toContain(`cerca de ${landing('Remoção de carbono')?.numero}%`)
    const eficiencia = landing('Eficiência no uso de carbono')
    expect(`${eficiencia?.numero}${eficiencia?.unidade}`).toBe(c.eficienciaIndicadorValor)
  })

  it('points its photo at a file that exists', () => {
    expect(inPublic(CAATINGA_PESSOAS_IMAGEM.src)).toBe(true)
  })
})

// Each photo's description follows the visitor's language, so it lives with
// the interface labels (messages/<locale>.json, "Sobre.imageAlt"), keyed by
// the page, and not beside the photo's address.
describe('the Sobre photos’ descriptions', () => {
  const photos = {
    plataforma: SOBRE_PLATAFORMA_IMAGEM,
    caatinga: CAATINGA_PESSOAS_IMAGEM,
    'carbono-e-comunidades': CARBONO_E_COMUNIDADES_IMAGEM,
    // The second photo of /sobre, beside "O que a plataforma não faz".
    limites: SOBRE_LIMITES_IMAGEM,
  } as const

  it('describes every page photo in both languages', () => {
    for (const locale of ['pt', 'en'] as const) {
      for (const slug of Object.keys(photos) as Array<keyof typeof photos>) {
        expect(MESSAGES[locale].Sobre.imageAlt[slug], `${locale} ${slug}`).toBeTruthy()
      }
    }
  })

  it('keeps the descriptions out of the content modules', () => {
    for (const photo of Object.values(photos)) expect(photo).not.toHaveProperty('alt')
  })
})
