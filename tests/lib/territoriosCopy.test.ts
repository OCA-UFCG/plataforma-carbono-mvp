import { describe, expect, it } from 'vitest'
import { FIRE_FIRST_YEAR, FLUX_FIRST_YEAR, FLUX_LAST_YEAR, LAND_USE_YEARS, RAIN_LAST_YEAR } from '@/config/territorios/story'
import { SHIPPED_STORY_SCRIPT, storyScript } from '@/config/territorios/storyScript'
import { copyFromEntry, type CopyType } from '@/lib/content/site/model'
import { TERRITORIOS_COPY, territoriosCopyDefaults, type TerritoriosCopy } from '@/lib/content/territorios'
import { SITE_COPY_TYPES } from '@/lib/content/site/types'

describe('the Territórios copy', () => {
  it('has a type per tab, in the order of the tabs, between the presentation and "Sobre os dados"', () => {
    expect(Object.values(TERRITORIOS_COPY).map((t) => t.id)).toEqual([
      'territoriosApresentacao', 'territoriosTerritorio', 'territoriosEstoque', 'territoriosFluxo',
      'territoriosUso', 'territoriosFogo', 'territoriosChuva', 'territoriosSobreDados',
    ])
  })

  // Provisioning, the round-trip checks and the space test all walk this list.
  it('is provisioned with the institutional copy', () => {
    for (const type of Object.values(TERRITORIOS_COPY)) expect(SITE_COPY_TYPES, type.id).toContain(type)
  })

  it('gives every tab its question and its source in "Sobre os dados"', () => {
    const copy = territoriosCopyDefaults()

    for (const tab of [copy.territorio, copy.estoque, copy.fluxo, copy.uso, copy.fogo, copy.chuva]) {
      expect(tab.pergunta).toMatch(/\?$/)
      expect(tab.sobreTitulo).not.toBe('')
      expect(tab.sobreTexto).not.toBe('')
    }
  })
})

// The shipped copy with one type's entry as an editor left it.
function edited<Key extends keyof TerritoriosCopy>(key: Key, entry: Record<string, unknown>): TerritoriosCopy {
  return { ...territoriosCopyDefaults(), [key]: copyFromEntry(TERRITORIOS_COPY[key] as CopyType, entry) } as TerritoriosCopy
}

describe('storyScript', () => {
  it('fills the years of each series from config/territorios/story.ts', () => {
    expect(SHIPPED_STORY_SCRIPT.questions.uso).toBe(`Como mudou a vegetação nativa desde ${LAND_USE_YEARS[0]}?`)
    expect(SHIPPED_STORY_SCRIPT.questions.fogo).toBe(`Quanto daqui já queimou desde ${FIRE_FIRST_YEAR}?`)
    expect(SHIPPED_STORY_SCRIPT.questions.chuva).toBe(`${RAIN_LAST_YEAR} foi um ano seco ou chuvoso aqui?`)
    expect(SHIPPED_STORY_SCRIPT.about.fluxo.text).toContain(`saldo de ${FLUX_FIRST_YEAR} a ${FLUX_LAST_YEAR}.`)
  })

  it('carries an edited question to the story, with its year filled', () => {
    expect(storyScript(edited('uso', { pergunta: 'O que mudou desde {anoInicial}?' })).questions.uso)
      .toBe('O que mudou desde 1985?')
  })

  it('keeps the shipped question when the edit names a placeholder the tab does not fill', () => {
    expect(storyScript(edited('uso', { pergunta: 'O que mudou desde {ano}?' })).questions.uso)
      .toBe('Como mudou a vegetação nativa desde 1985?')
  })

  // The uso, fogo and chuva questions show an editor {anoInicial}; the flux
  // question fills no year.
  it('keeps the shipped question when the edit copies a placeholder into a tab that fills none', () => {
    expect(storyScript(edited('fluxo', { pergunta: 'O carbono mudou desde {anoInicial}?' })).questions.fluxo)
      .toBe('As áreas com árvores tiraram ou lançaram carbono do ar?')
  })

  it('carries the edited presentation, summary title and source', () => {
    const script = storyScript({
      ...edited('apresentacao', { titulo: 'Escolha um território' }),
      fogo: copyFromEntry(TERRITORIOS_COPY.fogo, { resumoTitulo: 'Queimadas', sobreTexto: 'MapBiomas Fogo, {anoInicial}–{anoFinal}.' }),
    })

    expect(script.intro.title).toBe('Escolha um território')
    expect(script.summary.titles.fogo).toBe('Queimadas')
    expect(script.about.fogo.text).toBe('MapBiomas Fogo, 1985–2023.')
  })
})
