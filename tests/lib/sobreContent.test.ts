import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CARBONO_E_COMUNIDADES } from '@/lib/content/sobre/carbono-e-comunidades'
import { SOBRE_PLATAFORMA } from '@/lib/content/sobre/plataforma'
import { COMO_FUNCIONA } from '@/lib/content/sobre/como-funciona'
import { CAATINGA } from '@/lib/content/sobre/caatinga'
import { SOBRE_FAIXA } from '@/lib/content/paginas'
import ptDestaques from '@/translations/pt/Destaques.json'
import ptPlataforma from '@/translations/pt/SobrePlataformaPage.json'
import enPlataforma from '@/translations/en/SobrePlataformaPage.json'
import ptCaatinga from '@/translations/pt/SobreCaatingaPage.json'
import enCaatinga from '@/translations/en/SobreCaatingaPage.json'
import ptRelacao from '@/translations/pt/SobreCarbonoComunidadesPage.json'
import enRelacao from '@/translations/en/SobreCarbonoComunidadesPage.json'
import ptComoFunciona from '@/translations/pt/SobreComoFuncionaPage.json'
import enComoFunciona from '@/translations/en/SobreComoFuncionaPage.json'

// The pages' copy lives in translations/<locale>/Sobre*Page.json, their
// structure (ids, images, icons) in lib/content/sobre/*.ts. These tests read
// the Portuguese text, the reference, and check the structure is backed by
// copy in every language.
const P = ptPlataforma.SobrePlataformaPage
const CA = ptCaatinga.SobreCaatingaPage
const R = ptRelacao.SobreCarbonoComunidadesPage
const F = ptComoFunciona.SobreComoFuncionaPage

// Follows a dotted path ("why.blocks.b1.l1") into a messages object; undefined
// when a step is missing.
function at(messages: unknown, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], messages)
}

function expectCopy(messages: unknown, paths: string[], label: string) {
  for (const p of paths) {
    expect(typeof at(messages, p), `${label}: ${p}`).toBe('string')
  }
}

function inPublic(src: string): boolean {
  return existsSync(path.join(process.cwd(), 'public', src))
}

describe('Conheça a plataforma (/sobre)', () => {
  const p = SOBRE_PLATAFORMA

  it('opens with why the platform exists, beside its photo', () => {
    expect(P.why.title).toBe('Por que criar uma plataforma para a Caatinga?')
    expect(inPublic(p.porQue.imagem)).toBe(true)
  })

  it('answers the two questions of the icon cards, each with an icon that exists', () => {
    expect(p.cards.map((card) => P.cards[card.id as 'mission' | 'audience'].title)).toEqual([
      'Qual é a missão da CaatiVAR?',
      'Para quem é a plataforma?',
    ])
    for (const card of p.cards) {
      expect(inPublic(card.icone), card.icone).toBe(true)
    }
  })

  it('closes on what the platform does not do', () => {
    expect(P.band.title).toBe('O que a plataforma não faz')
    expect(SOBRE_FAIXA.itens.map((key) => P.band.items[key as keyof typeof P.band.items])).toEqual([
      'Não vende créditos de carbono',
      'Não certifica nem aprova projetos',
      'Não substitui reguladores e certificadoras',
    ])
    expect(inPublic(SOBRE_FAIXA.image)).toBe(true)
  })

  it('has copy for its whole structure in every language', () => {
    for (const messages of [ptPlataforma, enPlataforma]) {
      expectCopy(
        messages.SobrePlataformaPage,
        [
          'why.title',
          'why.imageAlt',
          ...p.porQue.blocos.flat().map((k) => `why.blocks.${k}`),
          ...p.cards.flatMap((card) => [`cards.${card.id}.title`, ...card.paragrafos.map((k) => `cards.${card.id}.${k}`)]),
          'band.title',
          ...SOBRE_FAIXA.itens.map((k) => `band.items.${k}`),
        ],
        'plataforma',
      )
    }
  })
})

describe('Entenda essa relação (/sobre/carbono-e-comunidades)', () => {
  const c = CARBONO_E_COMUNIDADES

  it('lists the seven cautions of the red card', () => {
    expect(c.cuidados.itens).toHaveLength(7)
    expect(R.cautions.title).toBe('Quais cuidados devem ser observados?')
  })

  it('asks the eight questions, each with an icon that exists', () => {
    expect(c.perguntas.itens).toHaveLength(8)
    for (const { id, icone } of c.perguntas.itens) {
      expect(inPublic(icone.src), `${id}: ${icone.src}`).toBe(true)
      if (icone.glyph) expect(inPublic(icone.glyph.src), `${id}: ${icone.glyph.src}`).toBe(true)
    }
  })

  it('states the two minimum shares the law guarantees', () => {
    expect(c.lei.garantias.map((id) => R.law.guarantees[id as keyof typeof R.law.guarantees])).toEqual([
      { label: 'créditos de remoção', value: 'mín. 50%' },
      { label: 'redução do desmatamento', value: 'mín. 70%' },
    ])
  })

  // The design marks three terms with "ⓘ" for a glossary it does not define
  // (issue #44, question 3). Until it exists, the words appear without it.
  it('carries no glossary marker yet', () => {
    expect(JSON.stringify(ptRelacao)).not.toContain('ⓘ')
    expect(JSON.stringify(enRelacao)).not.toContain('ⓘ')
  })

  it('points its photo at a file that exists', () => {
    expect(inPublic(c.direitoTerra.imagem)).toBe(true)
  })

  it('has copy for its whole structure in every language', () => {
    const sections = [c.antesDeParticipar, c.renda, c.direitoTerra, c.lei, c.decisoes, c.beneficios]
    for (const messages of [ptRelacao, enRelacao]) {
      expectCopy(
        messages.SobreCarbonoComunidadesPage,
        [
          ...sections.flatMap((secao) => [`${secao.id}.title`, ...secao.paragrafos.map((k) => `${secao.id}.${k}`)]),
          `${c.antesDeParticipar.id}.highlight`,
          `${c.direitoTerra.id}.imageAlt`,
          ...c.lei.garantias.flatMap((id) => [`law.guarantees.${id}.label`, `law.guarantees.${id}.value`]),
          'law.closing',
          'cautions.title',
          'cautions.introduction',
          ...c.cuidados.itens.map((k) => `cautions.items.${k}`),
          'cautions.closing',
          'questions.title',
          'questions.introduction',
          ...c.perguntas.itens.map((q) => `questions.items.${q.id}`),
          'closing',
        ],
        'carbono-e-comunidades',
      )
    }
  })
})

describe('Como funciona (/sobre/como-funciona)', () => {
  const c = COMO_FUNCIONA

  it('walks through the six steps of using the map, in order', () => {
    expect(c.passos.map((p) => F.steps[p.id as keyof typeof F.steps].title)).toEqual([
      'Encontre a área de interesse',
      'Escolha as informações',
      'Visualize no mapa',
      'Escolha o período',
      'Consulte os detalhes',
      'Gere um relatório territorial',
    ])
  })

  it('groups the information in the four themes of the map', () => {
    const groups = F.steps.chooseInfo.groups
    const grupos = c.passos.flatMap((p) => p.grupos ?? [])
    expect(grupos.map((g) => [groups[g.id as keyof typeof groups].label, g.tom])).toEqual([
      ['Território', 'territorio'],
      ['Carbono', 'carbono'],
      ['Uso da terra e pressões', 'pressoes'],
      ['Ambiente', 'ambiente'],
    ])
    expect(grupos.every((g) => g.itens.length > 0)).toBe(true)
  })

  it('answers the three frequent questions', () => {
    expect(c.duvidas).toHaveLength(3)
    for (const id of c.duvidas) {
      const item = F.faq.items[id as keyof typeof F.faq.items]
      expect(item.question.endsWith('?') && item.answer.length > 0, id).toBe(true)
    }
  })

  it('has copy for its whole structure in every language', () => {
    for (const messages of [ptComoFunciona, enComoFunciona]) {
      expectCopy(
        messages.SobreComoFuncionaPage,
        [
          ...c.passos.flatMap((passo) => [
            `steps.${passo.id}.title`,
            ...passo.paragrafos.map((k) => `steps.${passo.id}.${k}`),
            ...(passo.grupos ?? []).flatMap((g) => [
              `steps.${passo.id}.groups.${g.id}.label`,
              ...g.itens.map((i) => `steps.${passo.id}.groups.${g.id}.items.${i}`),
            ]),
          ]),
          'faq.title',
          ...c.duvidas.flatMap((id) => [`faq.items.${id}.question`, `faq.items.${id}.answer`]),
        ],
        'como-funciona',
      )
    }
  })
})

describe('Conheça a Caatinga (/sobre/caatinga)', () => {
  const c = CAATINGA
  const indicadores = [
    CA.climate.indicator,
    CA.efficiency.indicator,
    ...c.armazenamento.indicadores.map((id) => CA.storage.indicators[id as keyof typeof CA.storage.indicators]),
  ]

  it('states the four indicators, with the subscript as a character', () => {
    expect(indicadores.map((i) => i.value)).toEqual(['410 Mt', '60%', '125tC/ha', '1,5–5tCO₂/ha/ano'])
  })

  // The landing's highlights (translations/pt/Destaques.json) repeat two of these
  // figures, which must agree. The third shared subject does not: the landing
  // says 48% "da remoção bruta de carbono do Brasil", this page "cerca de 40%
  // das remoções realizadas pelos biomas brasileiros". DOCUMENTACAO.md already
  // lists that divergence for the content owner; it is not resolved here.
  it('agrees with the landing on efficiency and removal capacity', () => {
    const { efficiency, capacity } = ptDestaques.Destaques.items
    expect(`${efficiency.value}${efficiency.unit}`).toBe(CA.efficiency.indicator.value)
    expect(capacity.value).toBe('1,5–5')
    expect(CA.storage.indicators.capacity.value.startsWith('1,5–5')).toBe(true)
  })

  it('writes the figures in each language\'s own notation', () => {
    const en = enCaatinga.SobreCaatingaPage
    expect(en.storage.indicators.capacity.value).toBe('1.5–5tCO₂/ha/yr')
    expect(en.storage.indicators.capacity.value).not.toMatch(/\d,\d/)
  })

  it('compares the area under severe desertification in 2000 and 2020', () => {
    const { comparison } = CA.pressure
    expect([comparison.beforeYear, comparison.beforeValue]).toEqual(['2000', '74 mil km²'])
    expect([comparison.afterYear, comparison.afterValue]).toEqual(['2020', '107 mil km²'])
  })

  it('points its photo and arrow at files that exist', () => {
    expect(inPublic(c.pessoas.imagem)).toBe(true)
    expect(inPublic('/icons/sobre/arrow.svg')).toBe(true)
  })

  it('has copy for its whole structure in every language', () => {
    for (const messages of [ptCaatinga, enCaatinga]) {
      expectCopy(
        messages.SobreCaatingaPage,
        [
          ...c.abertura.map((k) => `opening.${k}`),
          'vegetation.title',
          ...c.vegetacao.blocos.flat().map((k) => `vegetation.blocks.${k}`),
          'vegetation.highlight',
          'climate.title',
          'climate.before',
          'climate.after',
          'efficiency.title',
          'efficiency.before',
          'efficiency.after',
          ...['climate', 'efficiency'].flatMap((s) => ['label', 'value', 'description'].map((f) => `${s}.indicator.${f}`)),
          'storage.title',
          'storage.before',
          ...c.armazenamento.indicadores.flatMap((id) =>
            ['label', 'value', 'description'].map((f) => `storage.indicators.${id}.${f}`),
          ),
          ...c.armazenamento.depois.map((k) => `storage.after.${k}`),
          'people.title',
          'people.imageAlt',
          ...c.pessoas.paragrafos.map((k) => `people.paragraphs.${k}`),
          'pressure.title',
          'pressure.before',
          'pressure.after',
          ...['title', 'beforeYear', 'beforeValue', 'afterYear', 'afterValue'].map((f) => `pressure.comparison.${f}`),
        ],
        'caatinga',
      )
    }
  })
})
