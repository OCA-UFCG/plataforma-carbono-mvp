import { describe, expect, it } from 'vitest'
import precomputedJson from '@/config/territorios/precomputed.json'
import { TERRITORY_TYPES, type TerritoryType } from '@/config/territorios/story'
import { SHIPPED_STORY_SCRIPT, storyScript } from '@/config/territorios/storyScript'
import { territoriosCopyDefaults } from '@/lib/content/territorios'
import {
  aboutItems,
  stepAnswer,
  territoryIndicators,
  type SummaryInput,
} from '@/lib/territorios/storyText'
import type {
  AboutItem,
  BiomeReference,
  NativeShareYear,
  PrecomputedFile,
  StepAnswer,
  TerritoryPayload,
  TerritoryTypeId,
  ThemeData,
  ThemeId,
  ThemeResponse,
} from '@/types/territorios'

function typeOf(id: TerritoryTypeId): TerritoryType {
  return TERRITORY_TYPES.find((t) => t.id === id)!
}

const municipio = typeOf('municipio')
const assentamento = typeOf('assentamento')
const bioma = typeOf('bioma')

/** One share a year from 1985, as the API's land use series. */
const yearly = (values: number[]): NativeShareYear[] => values.map((sharePct, i) => ({ year: 1985 + i, sharePct }))

// Over answers of the real API
// (2026-09-27; fire on 2026-10-05; the land use series on 2026-11-22) for
// Campina Grande and the PA Serra do Monte, and the biome reference of
// config/territorios/precomputed.json.

const BIOME: BiomeReference = {
  stockTotalTc:      4_160_240_473.1142607,
  stockDensityTcHa:  55.098642014364884,
  forestSharePct:    26.777871129590096,
  fluxPerForestHaMg: -68.1317101317378,
  nativeSharePct:    { '1985': 74.06124587380222, '2025': 62.59887178552211 },
  nativeSeries:      yearly([
    74.06, 74.07, 73.89, 73.4, 72.8, 72.17, 71.64, 71.12, 70.62, 70.11,
    69.79, 69.57, 69.45, 69.12, 69.14, 69.06, 68.81, 68.63, 68.39, 68.09,
    68.01, 67.93, 67.84, 67.66, 67.52, 67.35, 67.12, 66.72, 66.44, 66.32,
    66.13, 66.08, 66.06, 66.03, 65.92, 65.74, 65.38, 64.75, 63.97, 63.39,
    62.6,
  ]),
  fireBurnedSharePct: 12.037964993028348,
  fireRecurrenceSharesPct: {
    never: 87.96203500697166, once: 7.3746054989168215, twoToFour: 4.113356427102522, fivePlus: 0.5500030670090056,
  },
  fireAnnualMeanSharePct: 0.558980579062026,
  rainMeanMm: 701.2012922878521,
}

function payload(over: Partial<TerritoryPayload>): TerritoryPayload {
  return {
    recorteId: 'municipios', recorteName: 'Municípios',
    featureId: 'campina-grande', featureName: 'Campina Grande', context: 'PB',
    areaHa: 59_552.72506798451, biomaAreaHa: 86_617_415.51410055, caatingaSharePct: 100,
    bbox: [-36.12386, -7.38712, -35.70432, -7.15422], boundary: 'full',
    geometry: { type: 'Polygon', coordinates: [] },
    biome: BIOME,
    areaRank: null,
    ...over,
  }
}

const CG = payload({})
const PA = payload({
  recorteId: 'assentamentos', recorteName: 'Assentamentos (INCRA)',
  featureId: 'pa-serra-do-monte', featureName: 'PA SERRA DO MONTE',
  areaHa: 5_205.1146084090715, bbox: [-36.23956, -7.44505, -36.14285, -7.34928],
})

function answer(data: ThemeData | null, over: Partial<ThemeResponse> = {}): ThemeResponse {
  return {
    recorteId: 'municipios', featureId: 'campina-grande', theme: (data?.theme ?? 'estoque') as ThemeId,
    status: data ? 'available' : 'no_pixels', origin: 'zonal', coarseScaleM: null, data,
    ...over,
  }
}

function annual(values: number[]): { date: string; value: number }[] {
  return values.map((value, i) => ({ date: `${1985 + i}-01-01`, value }))
}

const pool = (band: string, label: string, tc: number) => ({ band, label, tc })

function burned(values: number[]): { year: number; burnedHa: number }[] {
  return values.map((burnedHa, i) => ({ year: 1985 + i, burnedHa }))
}

const CG_ANSWERS: Record<ThemeId, ThemeResponse> = {
  estoque: answer({
    theme: 'estoque',
    report: {
      totalTc: 2_727_845.341836988, areaHa: 59_297.56568703722, unit: 't C',
      pools: [
        pool('b2', 'Biomassa acima do solo', 743_682.8), pool('b3', 'Biomassa abaixo do solo', 385_909.5),
        pool('b4', 'Madeira morta', 94_573.1), pool('b5', 'Serrapilheira', 107_254.5),
        pool('b6', 'Carbono orgânico do solo', 1_396_425.5),
      ],
      classes: [
        { codigo: 1, sigla: 'Ta', tc: 2_246_783.8, areaHa: 53_915.7, porPool: {} },
        { codigo: 2, sigla: 'TN', tc: 481_061.6, areaHa: 5_381.9, porPool: {} },
      ],
    },
  }),
  fluxo: answer({ theme: 'fluxo', totalMgCo2e: -461_632.3371852833, forestAreaHa: 7_967.418417275371, regionAreaHa: 59_298.673741115104 }),
  uso: answer({
    theme: 'uso',
    areas: {
      '1985': { '3': 13_230_717, '4': 188_116_664, '15': 279_030_140, '21': 79_532_028, '24': 26_657_392, '25': 172_967, '29': 12_410, '33': 4_251_782, '41': 443_509 },
      '2025': { '3': 5_576_055, '4': 185_165_284, '15': 312_180_668, '21': 18_043_929, '24': 67_673_255, '25': 135_386, '33': 2_673_031 },
    },
    series: yearly([
      34.04, 34.32, 34.33, 32.65, 29.44, 28.42, 28.03, 27.08, 26.43, 26.47,
      26.03, 25.1, 24.54, 24.26, 24.36, 25.8, 28.71, 29.54, 30.36, 31.26,
      31.84, 32.19, 32.34, 32.27, 31.38, 32.07, 32.54, 32.62, 32.51, 32.74,
      32.94, 33.24, 33.42, 33.46, 33.22, 33.03, 32.62, 31.87, 32.08, 31.81,
      32.25,
    ]),
  }),
  fogo: answer({
    theme: 'fogo',
    regionAreaHa: 59_298.68, burnedOnceHa: 1_863.17,
    recurrenceHa: { once: 1_455.74, twoToFour: 357.68, fivePlus: 49.75 },
    annual: burned([
      20, 3, 85, 64, 16, 50, 166, 9, 60, 49, 70, 162, 47, 27, 330, 97, 174, 51, 31, 232,
      136, 47, 11, 307, 135, 20, 7, 57, 9, 4, 16, 15, 11, 5, 0, 6, 22, 78, 48,
    ]),
  }),
  chuva: answer({
    theme: 'chuva',
    series: annual([
      883.8, 731, 493.4, 686.5, 618.7, 383.9, 479.5, 492.9, 258.9, 533.9, 443.9, 510.1, 506, 275.6, 459.6,
      837.3, 532.6, 594.5, 498.3, 807.8, 553.6, 502.7, 578.8, 689.7, 699.4, 584.7, 912.5, 433.1, 611.4, 609.6,
      499.2, 496.6, 433.8, 582.8, 568.7, 666.7, 379.6, 793.8, 610.5, 750.8, 512.1,
    ]),
  }),
}

const PA_ANSWERS: Record<ThemeId, ThemeResponse> = {
  estoque: answer({
    theme: 'estoque',
    report: {
      totalTc: 211_418.820753668, areaHa: 5_182.476285727353, unit: 't C',
      pools: [pool('b6', 'Carbono orgânico do solo', 116_631.3)],
      classes: [{ codigo: 1, sigla: 'Ta', tc: 211_418.8, areaHa: 5_182.5, porPool: {} }],
    },
  }),
  fluxo: answer({ theme: 'fluxo', totalMgCo2e: -131_072.58480486023, forestAreaHa: 1_558.633653113158, regionAreaHa: 5_182.865149445729 }),
  uso: answer({
    theme: 'uso',
    areas: {
      '1985': { '4': 45_675_123, '15': 2_494_462, '21': 2_763_393, '33': 417_659 },
      '2025': { '4': 43_361_545, '15': 7_545_346, '21': 363_052, '33': 80_693 },
    },
    series: yearly([
      88.95, 91.5, 94.1, 95.64, 96.55, 96.78, 97.15, 97.12, 97.1, 97.08,
      96.84, 96.44, 96.39, 96.39, 96.22, 96.69, 96.79, 96.26, 95.98, 95.02,
      91.29, 89.53, 88.59, 88.02, 87.8, 87.82, 87.92, 88.92, 89.0, 88.6,
      87.95, 87.37, 86.34, 85.3, 84.9, 84.67, 84.49, 84.1, 84.09, 84.09,
      84.44,
    ]),
  }),
  fogo: answer({
    theme: 'fogo',
    regionAreaHa: 5_182.86, burnedOnceHa: 90.76,
    recurrenceHa: { once: 73.33, twoToFour: 17.43, fivePlus: 0 },
    annual: burned([
      0, 0, 0, 0, 0, 0.52, 2.13, 0, 0, 0, 18.93, 16.75, 0, 2.13, 29.14, 0, 6.74, 0, 0, 12.24,
      1.42, 4.17, 0, 9.22, 2.84, 0.02, 0, 0, 0, 0, 1.77, 1.42, 0, 0, 0, 0, 0, 0, 0,
    ]),
  }),
  chuva: answer({
    theme: 'chuva',
    series: annual([
      631.4, 506.5, 283.1, 480, 468.3, 216.6, 295.8, 300.9, 131.6, 345.4, 288.7, 351.5, 343.3, 144.5, 320.5,
      539.1, 393.5, 440.5, 315.4, 561.6, 414.9, 366.6, 404.5, 532.3, 516.3, 409.7, 615.4, 272.3, 357.4, 369.8,
      320.2, 329.4, 280.4, 408.6, 384.3, 491.3, 224.9, 499, 379.9, 532, 299.5,
    ]),
  }),
}

const STEPS = ['territorio', 'estoque', 'fluxo', 'uso', 'fogo', 'chuva'] as const
type Step = typeof STEPS[number]

const answers: StepAnswer[] = []
const abouts: AboutItem[][] = []

type Input = Omit<SummaryInput, 'script'>

function step(s: Step, territory: TerritoryPayload, type: TerritoryType, response?: ThemeResponse): StepAnswer {
  const out = stepAnswer(s, { territory, type, response, script: SHIPPED_STORY_SCRIPT })
  answers.push(out)
  return out
}

function about(input: Input): AboutItem[] {
  const out = aboutItems({ ...input, script: SHIPPED_STORY_SCRIPT })
  abouts.push(out)
  return out
}

function story(territory: TerritoryPayload, type: TerritoryType, responses: Partial<Record<ThemeId, ThemeResponse>>) {
  return Object.fromEntries(STEPS.map((s) => [s, step(s, territory, type, s === 'territorio' ? undefined : responses[s])]))
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length

describe('stepAnswer', () => {
  it('tells the story of Campina Grande', () => {
    expect(story(CG, municipio, CG_ANSWERS)).toEqual({
      territorio: {
        question: 'Que território estamos conhecendo?',
        headline: { value: '596', unit: 'km²' },
        sentence: 'Campina Grande é um município localizado na Paraíba.',
      },
      estoque: {
        question: 'Quanto carbono a vegetação original e o solo guardariam aqui?',
        headline: { value: '2,7 milhões', unit: 'de toneladas de carbono' },
        sentence: '',
      },
      fluxo: {
        question: 'As áreas com árvores tiraram ou lançaram carbono do ar?',
        headline: { value: '462', unit: 'mil t de CO₂e' },
        sentence: 'Tiraram mais carbono do que lançaram. Cobrem 13% da área, abaixo dos 27% da Caatinga.',
      },
      uso: {
        question: 'Como estava a cobertura vegetal nativa?',
        headline: { value: '32%', unit: 'do território com vegetação nativa' },
        sentence: 'Entre 1985 e 2025, a área com vegetação nativa no território diminuiu 1,8 pontos percentuais (p.p.). Esse valor é inferior à redução que houve na Caatinga, de 11 p.p.',
      },
      fogo: {
        question: 'Como o fogo afetou o território ao longo do tempo?',
        headline: { value: '3,1%', unit: 'da área queimou ao menos uma vez entre 1985 e 2023' },
        sentence: 'Para esse mesmo período, 12% da Caatinga queimou ao menos uma vez.',
      },
      chuva: {
        question: 'Como foi a chuva em 2025?',
        headline: { value: '512', unit: 'mm de chuva' },
        sentence: 'A chuva ficou próxima da média do território (573 mm), sendo considerado um ano normal. Essa média é inferior à da Caatinga (701 mm).',
      },
    })
  })

  it('tells the story of a settlement', () => {
    const out = story(PA, assentamento, PA_ANSWERS)
    expect(Object.fromEntries(STEPS.map((s) => [s, out[s].sentence]))).toEqual({
      territorio: 'Serra do Monte é um assentamento localizado na Paraíba.',
      estoque:    '',
      fluxo:      'Tiraram mais carbono do que lançaram. Cobrem 30% da área, acima dos 27% da Caatinga.',
      uso:        'Entre 1985 e 2025, a área com vegetação nativa no território diminuiu 4,5 pontos percentuais (p.p.). Esse valor é inferior à redução que houve na Caatinga, de 11 p.p.',
      fogo:       'Para esse mesmo período, 12% da Caatinga queimou ao menos uma vez.',
      chuva:      'A chuva ficou 22% abaixo da média do território (385 mm), sendo considerado um ano seco. Essa média é inferior à da Caatinga (701 mm).',
    })
    expect(out.territorio.headline).toEqual({ value: '52', unit: 'km²' })
    expect(out.fogo.headline).toEqual({ value: '1,8%', unit: 'da área queimou ao menos uma vez entre 1985 e 2023' })
  })

  it('never compares the Caatinga with itself', () => {
    const themes = (precomputedJson as unknown as PrecomputedFile).entries['bioma|bioma-caatinga'].themes
    const responses = Object.fromEntries(Object.entries(themes).map(([id, e]) => [id, answer(e!.data, { coarseScaleM: e!.coarseScaleM })]))
    const caatingaItself = payload({
      recorteId: 'bioma', recorteName: 'Bioma Caatinga', featureId: 'bioma-caatinga', featureName: 'Bioma Caatinga',
      context: undefined, areaHa: 86_617_415.51410055, bbox: [-45.07658, -16.71049, -35.07258, -2.74849], boundary: 'simplified',
    })
    const out = story(caatingaItself, bioma, responses)

    expect(Object.fromEntries(STEPS.map((s) => [s, out[s].sentence]))).toEqual({
      territorio: 'A Caatinga inteira, em nove estados.',
      estoque:    '',
      fluxo:      'Tiraram mais carbono do que lançaram. Cobrem 27% da área.',
      uso:        'Entre 1985 e 2025, a área com vegetação nativa no território diminuiu 11 pontos percentuais (p.p.).',
      fogo:       '',
      chuva:      'A chuva ficou 20% abaixo da média do território (767 mm), sendo considerado um ano seco.',
    })
    expect(out.territorio.headline).toEqual({ value: '866.174', unit: 'km²' })
    expect(out.fluxo.headline).toEqual({ value: '1,6', unit: 'bilhão de t de CO₂e' })
    expect(out.fogo.headline).toEqual({ value: '12%', unit: 'da área queimou ao menos uma vez entre 1985 e 2023' })

    const items = about({ responses, territory: caatingaItself, type: bioma })
    expect(items.map((i) => i.title)).not.toContain('Comparação com a Caatinga')
    // The biome's flux, land use and fire were reduced at 100 m.
    for (const title of ['Fluxo', 'Uso da terra', 'Fogo']) {
      expect(items.find((i) => i.title === title)?.text, title).toMatch(/Aqui, calculado a 100 m\.$/)
    }
    // The inventory has pixels over 87% of the biome (75,5 of 86,6 Mha).
    expect(items.find((i) => i.title === 'Estoque')?.text).toMatch(/O inventário cobre 87% desta área; o total vale só para essa parte\.$/)
  })

  it('names the territory, its kind and its state', () => {
    expect(step('territorio', payload({ context: 'BA' }), municipio).sentence).toBe('Campina Grande é um município localizado na Bahia.')
    expect(step('territorio', payload({ context: 'XX' }), municipio).sentence).toBe('Campina Grande é um município.')
    expect(step('territorio', payload({ context: 'PE' }), typeOf('terra_indigena')).sentence)
      .toBe('Campina Grande é uma terra indígena localizada em Pernambuco.')
  })

  it('places the territory in its states, or in the biome for a state', () => {
    expect(step('territorio', payload({ context: 'SE/BA' }), assentamento).sentence)
      .toBe('Campina Grande é um assentamento localizado em Sergipe e na Bahia.')
    expect(step('territorio', payload({ context: 'XX' }), assentamento).sentence).toBe('Campina Grande é um assentamento.')
    expect(step('territorio', payload({ recorteId: 'estados', areaHa: 5_210_000 }), typeOf('estado')).sentence)
      .toBe('Área dentro da Caatinga, 6,0% do bioma.')
    expect(step('territorio', payload({ areaHa: 0.4 }), municipio).headline).toEqual({ value: 'menos de 1', unit: 'ha' })
  })

  it('says "sem dado" for each theme with nothing over the territory, never a zero', () => {
    const sentences = (['estoque', 'fluxo', 'uso', 'fogo', 'chuva'] as const).map((theme) => {
      const out = step(theme, CG, municipio, answer(null, { theme }))
      expect(out.headline).toBeNull()
      return out.sentence
    })
    expect(sentences).toEqual([
      'Sem dado de carbono para esta área.',
      'Não há áreas com árvores mapeadas aqui.',
      'Sem dado de uso da terra aqui.',
      'Sem dado de fogo aqui.',
      'Sem dado de chuva aqui.',
    ])
  })

  it('leaves the answer empty while a theme loads or after it fails', () => {
    expect(step('estoque', CG, municipio)).toEqual({
      question: 'Quanto carbono a vegetação original e o solo guardariam aqui?', headline: null, sentence: '',
    })
    expect(step('chuva', CG, municipio, answer(null, { theme: 'chuva', status: 'unavailable', origin: null })).sentence).toBe('')
  })

  it('says "sem dado" where the inventory has no pixel, and names the part it covers', () => {
    const responses = { ...CG_ANSWERS, estoque: answer(null, { theme: 'estoque' }) }
    expect(step('estoque', CG, municipio, responses.estoque)).toMatchObject({ headline: null, sentence: 'Sem dado de carbono para esta área.' })

    const stockText = (territory: TerritoryPayload) =>
      about({ responses: CG_ANSWERS, territory, type: municipio }).find((i) => i.title === 'Estoque')?.text
    // Feira de Santana: pixels over 40.583 of 53.486 ha.
    expect(stockText(payload({ areaHa: 59_297.56568703722 / 0.759 }))).toMatch(/O inventário cobre 76% desta área/)
    // Campina Grande's report covers 99,6% of the area: a whole cover.
    expect(stockText(CG)).not.toContain('O inventário cobre')
  })

  it('answers 0% for a territory where nothing burned, without a comparison', () => {
    const none = answer({
      theme: 'fogo', regionAreaHa: 13, burnedOnceHa: 0,
      recurrenceHa: { once: 0, twoToFour: 0, fivePlus: 0 },
      annual: burned(Array.from({ length: 39 }, () => 0)),
    })
    expect(step('fogo', PA, assentamento, none)).toMatchObject({
      headline: { value: '0%', unit: 'da área queimou ao menos uma vez entre 1985 e 2023' },
      sentence: 'Nenhuma área queimada registrada de 1985 a 2023.',
    })
  })

  it('states an equilibrium without a figure, and an emission against a Caatinga that removed', () => {
    const balance = answer({ theme: 'fluxo', totalMgCo2e: 0.4, forestAreaHa: 100, regionAreaHa: 2_000 })
    expect(step('fluxo', CG, municipio, balance)).toMatchObject({
      headline: null,
      sentence: 'Tiraram e lançaram no ar a mesma quantidade de carbono. Cobrem 5,0% da área, abaixo dos 27% da Caatinga.',
    })

    const emission = answer({ theme: 'fluxo', totalMgCo2e: 1_230, forestAreaHa: 100, regionAreaHa: 2_000 })
    expect(step('fluxo', CG, municipio, emission)).toEqual({
      question: 'As áreas com árvores tiraram ou lançaram carbono do ar?',
      headline: { value: '1,2', unit: 'mil t de CO₂e' },
      sentence: 'Lançaram mais carbono do que tiraram. Cobrem 5,0% da área, abaixo dos 27% da Caatinga.',
    })
  })

  it('gives the mean when 2025 has no rain data', () => {
    const series = CG_ANSWERS.chuva.data!.theme === 'chuva' ? CG_ANSWERS.chuva.data!.series : []
    const missing = answer({ theme: 'chuva', series: series.map((p) => (p.date.startsWith('2025') ? { ...p, value: null } : p)) })

    expect(step('chuva', CG, municipio, missing)).toMatchObject({
      headline: { value: '575', unit: 'mm por ano, em média' },
      sentence: 'Sem dado de 2025 aqui. Essa média é inferior à da Caatinga (701 mm).',
    })
  })
  it('reads its words from the script it is given', () => {
    const shipped = SHIPPED_STORY_SCRIPT
    const questions = { ...shipped.questions, estoque: 'Quanto carbono há aqui?' }
    expect(stepAnswer('estoque', { territory: CG, type: municipio, script: { ...shipped, questions } }).question)
      .toBe('Quanto carbono há aqui?')

    // An answer edited in Contentful, with its placeholder, reaches the sentence.
    const copy = territoriosCopyDefaults()
    const edited = storyScript({ ...copy, fogo: { ...copy.fogo, respostaComparacao: 'Na Caatinga, {percentualCaatinga}.' } })
    expect(stepAnswer('fogo', { territory: CG, type: municipio, response: CG_ANSWERS.fogo, script: edited }).sentence)
      .toBe('Na Caatinga, 12%.')

    const aboutScript = { ...shipped.about, units: { title: 'Unidades de medida', text: 'Toneladas.' } }
    expect(aboutItems({ responses: CG_ANSWERS, territory: CG, type: municipio, script: { ...shipped, about: aboutScript } }).at(-2))
      .toEqual({ title: 'Unidades de medida', text: 'Toneladas.' })
  })
})

describe('aboutItems', () => {
  it('lists the sources of Campina Grande in the order of the story', () => {
    const items = about({ responses: CG_ANSWERS, territory: CG, type: municipio })
    expect(items.map((i) => i.title)).toEqual([
      'Território', 'Estoque', 'Fluxo', 'Uso da terra', 'Fogo', 'Chuva', 'Unidades', 'Comparação com a Caatinga',
    ])
    expect(items.find((i) => i.title === 'Fogo')?.text).toBe(
      'MapBiomas Fogo, coleção 3, 30 m, 1985 a 2023. Frequência: número de anos com cicatriz de fogo. Área queimada anual: área com cicatriz de fogo no ano.',
    )
  })

  it('gives a municipality the source of its whole outline, and a territory the biome limit', () => {
    const territorio = (type: TerritoryType) => about({ responses: CG_ANSWERS, territory: CG, type }).find((i) => i.title === 'Território')?.text
    expect(territorio(municipio)).toBe('Município inteiro, segundo o IBGE (2022), inclusive fora da Caatinga.')
    expect(territorio(assentamento)).toBe('Área dentro do limite da Caatinga, segundo o IBGE (2019).')
  })

  it('stays within 250 words with every conditional sentence in', () => {
    const pointRain = answer({ theme: 'chuva', series: annual([500, 600]) }, { origin: 'point' })
    const coarse = (r: ThemeResponse) => ({ ...r, coarseScaleM: 100 })
    const west = payload({ areaHa: 100_000 })
    const responses = {
      ...CG_ANSWERS, chuva: pointRain, fluxo: coarse(CG_ANSWERS.fluxo), uso: coarse(CG_ANSWERS.uso), fogo: coarse(CG_ANSWERS.fogo),
    }

    const items = about({ responses, territory: west, type: municipio })
    expect(items.find((i) => i.title === 'Fogo')?.text).toMatch(/Aqui, calculado a 100 m\.$/)
    expect(words(items.map((i) => `${i.title} ${i.text}`).join(' '))).toBeLessThanOrEqual(250)
  })
})

describe('every answer, line and item', () => {
  it('keeps questions within 10 words, answers with their figure within 40, and nothing unfilled', () => {
    expect(answers.length).toBeGreaterThan(20)
    for (const a of answers) {
      expect(words(a.question), a.question).toBeLessThanOrEqual(10)
      // The big figure is part of the answer the visitor reads.
      const said = [a.headline?.value, a.headline?.unit, a.sentence].filter(Boolean).join(' ')
      expect(words(said), said).toBeLessThanOrEqual(40)
    }

    const lines = [
      ...answers.flatMap((a) => [a.question, a.sentence, a.headline?.value ?? '', a.headline?.unit ?? '']),
      ...abouts.flat().flatMap((i) => [i.title, i.text]),
    ]
    for (const line of lines) expect(line).not.toMatch(/[{}]|undefined|NaN/)
  })
})

describe('territoryIndicators', () => {
  const JUAZEIRO = payload({
    featureName: 'Juazeiro', context: 'BA', areaHa: 672_000, biomaAreaHa: 86_000_000,
    areaRank: { position: 40, total: 1210 },
  })

  it('gives a territory its share of the biome and its rank by area (Figma 19254:37459)', () => {
    expect(territoryIndicators({ territory: JUAZEIRO, type: assentamento, script: SHIPPED_STORY_SCRIPT })).toEqual([
      { value: '0,8%', text: 'da área da Caatinga' },
      { value: '40º', text: 'maior entre os 1.210 assentamentos' },
    ])
  })

  it('gives a municipality its rank alone, since it enters whole past the biome edge', () => {
    expect(territoryIndicators({ territory: JUAZEIRO, type: municipio, script: SHIPPED_STORY_SCRIPT })).toEqual([
      { value: '40º', text: 'maior entre os 1.210 municípios' },
    ])
  })

  it('agrees the rank with a feminine type', () => {
    const ti = payload({ areaRank: { position: 3, total: 50 } })
    expect(territoryIndicators({ territory: ti, type: typeOf('terra_indigena'), script: SHIPPED_STORY_SCRIPT }).at(-1))
      .toEqual({ value: '3ª', text: 'maior entre as 50 terras indígenas' })
  })

  it('gives the biome no card', () => {
    expect(territoryIndicators({ territory: CG, type: bioma, script: SHIPPED_STORY_SCRIPT })).toEqual([])
  })

  it('leaves out a share under 0,1%, which would only read "menos de 0,1%"', () => {
    // Campina Grande's 59.553 ha, of 86,6 million: 0,07% of the biome.
    expect(territoryIndicators({ territory: payload({ areaRank: { position: 120, total: 1210 } }), type: assentamento, script: SHIPPED_STORY_SCRIPT }))
      .toEqual([{ value: '120º', text: 'maior entre os 1.210 assentamentos' }])
    expect(territoryIndicators({ territory: CG, type: assentamento, script: SHIPPED_STORY_SCRIPT })).toEqual([])
  })

  it('shows a share from 0,1% up', () => {
    const tenth = payload({ areaHa: 86_000, biomaAreaHa: 86_000_000 })
    expect(territoryIndicators({ territory: tenth, type: assentamento, script: SHIPPED_STORY_SCRIPT })).toEqual([{ value: '0,1%', text: 'da área da Caatinga' }])
  })
})
