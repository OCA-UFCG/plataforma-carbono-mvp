// The strings of the Territórios story.
//
// Editors keep the story's words in Contentful (lib/content/territorios.ts);
// storyScript(), at the end of this file, turns that copy into the templates
// lib/territorios/storyText.ts fills, with the years of each series from
// config/territorios/story.ts. What stays here is what the copy leaves in
// code: interface labels, the chart descriptions read by screen readers, the
// summary's badges and the grammar tables.
//
// Templates receive values already formatted by lib/territorios/storyValues.ts;
// lib/territorios/storyText.ts picks the variant.
//
// A step is titled by a question of at most ten words, shows a big figure and
// an answer of at most forty, and compares the territory with the whole
// Caatinga. Its box "Por que importa?" names the source; periods, definitions and caveats wait in "Sobre
// os dados", at the end.

import { fillPlaceholders as fill } from '@/lib/content/site/model'
import { territoriosCopyDefaults, type TerritoriosCopy } from '@/lib/content/territorios'
import { numero } from '@/lib/mapa/format'
import { displayName } from '@/lib/territorios/featureIds'
import {
  FIRE_FIRST_YEAR,
  FIRE_LAST_YEAR,
  FLUX_FIRST_YEAR,
  FLUX_LAST_YEAR,
  LAND_USE_YEARS,
  RAIN_FIRST_YEAR,
  RAIN_LAST_YEAR,
} from '@/config/territorios/story'
import type { RainYearKind, Reading, StepId, TerritoryTypeId, ThemeId } from '@/types/territorios'

export const UI = {
  loading:       'Carregando os dados',
  unavailable:    'Não foi possível carregar estes dados.',
  territoryUnavailable: 'Não foi possível carregar os dados deste território.',
  retry:          'Tentar novamente',
  rateLimited:    'Muitos acessos no momento. Aguarde e tente novamente.',
  sessionExpired: 'Sua sessão expirou.',
  signIn:         'Entrar novamente',

  stepsLabel:       'Etapas',
  changeTerritory:  'Trocar território',
  mapYear:          'Mostrar no mapa:',
  exploreTitle:     'Explore no mapa',
  exploreText:      `Veja a cobertura vegetal do território em ${LAND_USE_YEARS[0]} e em ${LAND_USE_YEARS[1]}.`,
  areaLabel:        'Área do território',
  biomeShareLabel:  'Área na Caatinga',
  sourceLabel:      'Fonte dos dados:',
  newTab:           'abre em nova aba',

  summaryUnavailable: 'Indisponível no momento.',
  share:            'Compartilhar',
  linkCopied:       'Link copiado',
  copyFailed:       'Não foi possível copiar o link.',

  generatedAt:    (date: string) => `Gerado em ${date}.`,
  mapUnavailable: 'Mapa indisponível',
} as const

const TWO_FINGERS = 'Use dois dedos para mover o mapa'

/** MapLibre's control strings. */
export const MAP_LOCALE = {
  'Map.Title':                            'Mapa',
  'NavigationControl.ZoomIn':             'Aproximar',
  'NavigationControl.ZoomOut':            'Afastar',
  'AttributionControl.ToggleAttribution': 'Alternar atribuição',
  // StoryMap turns wheel zoom off, so a one-finger pan is the only gesture the
  // map blocks; the desktop message shows for it on a touch screen with a
  // mouse, and "Ctrl + scroll" would name a gesture that does nothing.
  'CooperativeGesturesHandler.WindowsHelpText': TWO_FINGERS,
  'CooperativeGesturesHandler.MacHelpText':     TWO_FINGERS,
  'CooperativeGesturesHandler.MobileHelpText':  TWO_FINGERS,
}

export const TERRITORY_SCRIPT = {
  /** `context` is the state; left out for a state, whose name already is one. */
  title: (name: string, context?: string) => (context ? `${displayName(name)} (${context})` : displayName(name)),
  /** The territory's share of the biome, under its area (Figma 19254:37460). */
  biomeShare: 'da área da Caatinga',
  /** Beside the share of the whole territory inside the biome: "do município está na Caatinga". */
  inBiome: (unit: string, feminine: boolean) => `${feminine ? 'da' : 'do'} ${unit.toLowerCase()} está na Caatinga`,
  /** Its place by area among the territories of its type (19254:37461). */
  rankValue: (position: number, feminine: boolean) => `${numero(position, 0)}${feminine ? 'ª' : 'º'}`,
  rankText:  (total: number, plural: string, feminine: boolean) =>
    `maior entre ${feminine ? 'as' : 'os'} ${numero(total, 0)} ${plural}`,
}

/** Types whose unit is feminine in Portuguese: "a 3ª maior terra indígena". */
export const FEMININE_TYPES: ReadonlySet<TerritoryTypeId> = new Set<TerritoryTypeId>(['terra_indigena'])

const [LAND_USE_FIRST, LAND_USE_LAST] = LAND_USE_YEARS

/**
 * States the Caatinga spans, as "na Paraíba" takes them. A context the table
 * does not know leaves the state out of the sentence.
 */
export const STATE_LOCATIVE: Record<string, string> = {
  AL: 'em Alagoas',
  BA: 'na Bahia',
  CE: 'no Ceará',
  MG: 'em Minas Gerais',
  PB: 'na Paraíba',
  PE: 'em Pernambuco',
  PI: 'no Piauí',
  RN: 'no Rio Grande do Norte',
  SE: 'em Sergipe',
}

/** Years of the rain strip. */
export const RAIN_KIND_LABELS: Record<RainYearKind, string> = {
  seco:    'Seco',
  normal:  'Normal',
  chuvoso: 'Chuvoso',
}

/** The territory against the biome, as the answers word it. */
const MEAN_READING: Record<Reading, string> = { acima: 'superior', abaixo: 'inferior', perto: 'próxima' }
const VALUE_READING: Record<Reading, string> = { acima: 'superior', abaixo: 'inferior', perto: 'próximo' }

/** Which way a share moved between the first and the last year. */
export type Change = 'down' | 'up' | 'none'

function joinNonEmpty(...parts: (string | null)[]): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * Labels and accessible descriptions of the charts. A description reads the
 * chart aloud with the figures the drawing labels.
 */
export const CHART_SCRIPT = {
  here:  'Território',
  biome: 'Caatinga',
  /** The question over each chart, as the step's title asks its own. */
  titles: {
    estoque:      'Como o território se compara à Caatinga?',
    uso:          'Quanto a vegetação nativa mudou?',
    fogoYears:    'Quanto do território queimou ao longo do tempo?',
    fogoLevels:   'Quantas vezes o fogo atingiu o território?',
    chuvaClass:   'Como esse ano é classificado?',
    chuvaStrip:   'Como foi a classificação ao longo do tempo?',
    territorio:   'Quais as principais características do território?',
  },
  compare: (label: string, here: string, biome: string | null) =>
    biome === null ? `${label}: ${here}.` : `${label}: aqui ${here}; na Caatinga, ${biome}.`,
  estoque:    't de carbono por hectare',
  estoquePerHa: 't/ha',
  fluxoShare: 'Parte da área com árvores',
  fluxoPerHa: 't de CO₂e por hectare com árvores',
  uso: {
    description: (rows: string) => `Parte da área com vegetação nativa em cada ano, de ${LAND_USE_FIRST} a ${LAND_USE_LAST}. ${rows}`,
    row:         (name: string, from: string, to: string) => `${name}: de ${from} para ${to}.`,
    share:       `Vegetação nativa em ${LAND_USE_LAST}`,
    axis:        'Vegetação nativa (%)',
  },
  fogo: {
    share:   'Área que já queimou',
    axis:    'Área queimada (%)',
    years:   (peak: string | null, biome: string | null) => joinNonEmpty(
      `Parte da área queimada em cada ano, de ${FIRE_FIRST_YEAR} a ${FIRE_LAST_YEAR}.`,
      peak ?? 'Nenhum ano com fogo.',
      biome && `Média anual da Caatinga: ${biome}.`,
    ),
    peak:    (year: number, pct: string) => `Mais fogo em ${year}: ${pct}.`,
    recurrence: (rows: string) => `Parte da área por número de anos com fogo, de ${FIRE_FIRST_YEAR} a ${FIRE_LAST_YEAR}. ${rows}`,
    row:     (name: string, parts: string) => `${name}: ${parts}.`,
    levels: {
      never:     'Nunca queimou',
      once:      '1 vez',
      twoToFour: '2 a 4 vezes',
      fivePlus:  '5 vezes ou mais',
    },
  },
  chuva: {
    /** The bands of the year's class, by the territory's own mean. */
    bands: {
      seco:    (low: string) => `abaixo de ${low} mm`,
      normal:  (low: string, high: string) => `${low} a ${high} mm`,
      chuvoso: (high: string) => `acima de ${high} mm`,
    },
    classDescription: (year: number, kind: string, mm: string, low: string, high: string) =>
      `${year}: ${kind}, ${mm} mm. Pelos terços dos anos daqui, seco abaixo de ${low} mm, normal de ${low} a ${high} mm, chuvoso acima de ${high} mm.`,
    strip: (seco: number, normal: number, chuvoso: number) =>
      `Chuva de ${RAIN_FIRST_YEAR} a ${RAIN_LAST_YEAR}, em terços dos anos daqui. Anos secos: ${seco}; normais: ${normal}; chuvosos: ${chuvoso}.`,
    year:    (year: number, kind: string, mm: string) => `${year}: ${kind}, ${mm} mm.`,
    noYear:  (year: number) => `${year}: sem dado.`,
    mean:    'Chuva média por ano, em mm',
  },
}

/** A text around its one linked word: `{termo}` marks where the word goes. */
export interface LinkedText {
  before: string
  /** Null when the text names no `{termo}`: it then reads without a link. */
  term:   string | null
  after:  string
}

function linkedText(template: string, term: string): LinkedText {
  const at = template.indexOf('{termo}')
  if (at < 0) return { before: template, term: null, after: '' }
  return { before: template.slice(0, at), term, after: template.slice(at + '{termo}'.length) }
}

/**
 * The story's words, built from the copy editors keep in Contentful. The
 * server reads the copy and sends plain strings, since functions do not cross
 * into a client component; the client builds this once
 * (components/territorios/StoryScriptContext.tsx).
 */
export function storyScript(copy: TerritoriosCopy) {
  const { apresentacao, territorio, estoque, fluxo, uso, fogo, chuva, sobre } = copy
  const why = (tab: typeof chuva | typeof uso | typeof fogo | typeof estoque | typeof fluxo) => ({
    title:  tab.porqueTitulo,
    text:   linkedText(tab.porqueTexto, tab.porqueTermo),
    source: tab.fonte,
  })
  return {
    intro: {
      title:     apresentacao.titulo,
      lead:      apresentacao.chamada,
      chooseCut: apresentacao.recortesTitulo,
    },
    /** Shown as soon as the step opens, before its data arrives. */
    questions: {
      territorio: territorio.pergunta,
      estoque:    estoque.pergunta,
      fluxo:      fluxo.pergunta,
      uso:        uso.pergunta,
      fogo:       fogo.pergunta,
      chuva:      fill(chuva.pergunta, { anoFinal: RAIN_LAST_YEAR }),
    } satisfies Record<Exclude<StepId, 'resumo'>, string>,
    territory: {
      biomeShare: TERRITORY_SCRIPT.biomeShare,
      rankText:   TERRITORY_SCRIPT.rankText,
    },
    /** The sentence under each step's big figure; storyText.ts picks the variant. */
    answers: {
      territorio: {
        located: (name: string, noun: string, feminine: boolean, where: string) => fill(territorio.respostaLocalizado, {
          nome: name, tipo: `${feminine ? 'uma' : 'um'} ${noun}`, localizado: feminine ? 'localizada' : 'localizado', estado: where,
        }),
        plain: (name: string, noun: string, feminine: boolean) =>
          fill(territorio.respostaSemEstado, { nome: name, tipo: `${feminine ? 'uma' : 'um'} ${noun}` }),
        state: (biomePct: string) => fill(territorio.respostaEstado, { parteBioma: biomePct }),
        biome: territorio.respostaBioma,
      },
      estoque: {
        /** Under the total: "de toneladas de carbono". */
        unit:   (tonnes: string) => fill(estoque.unidade, { toneladas: tonnes }),
        noData: estoque.respostaSemDado,
      },
      fluxo: {
        unit:      (tonnes: string) => fill(fluxo.unidade, { toneladas: tonnes }),
        removal:   fluxo.respostaRemocao,
        emission:  fluxo.respostaEmissao,
        balance:   fluxo.respostaEquilibrio,
        share:     (pct: string, reading: Reading, biome: string) =>
          fill(fluxo.respostaParte, { percentual: pct, posicao: reading, percentualCaatinga: biome }),
        shareOnly: (pct: string) => fill(fluxo.respostaParteSemCaatinga, { percentual: pct }),
        noForest:  fluxo.respostaSemArvores,
      },
      uso: {
        unit:   uso.unidade,
        change: (change: Change, points: string) => {
          const years = { anoInicial: LAND_USE_FIRST, anoFinal: LAND_USE_LAST }
          if (change === 'none') return fill(uso.respostaEstavel, years)
          return fill(change === 'down' ? uso.respostaDiminuiu : uso.respostaAumentou, { ...years, variacao: points })
        },
        /** The biome's change beside the territory's; compared only when both went the same way. */
        compare: (here: Change, biome: Change, reading: Reading, biomePoints: string) => {
          if (biome === 'none') return null
          const values = { comparacao: VALUE_READING[reading], variacaoCaatinga: biomePoints }
          if (here === biome) return fill(biome === 'down' ? uso.respostaComparacaoPerda : uso.respostaComparacaoGanho, values)
          return fill(biome === 'down' ? uso.respostaCaatingaPerda : uso.respostaCaatingaGanho, values)
        },
        noData: uso.respostaSemDado,
      },
      fogo: {
        unit:    fill(fogo.unidade, { anoInicial: FIRE_FIRST_YEAR, anoFinal: FIRE_LAST_YEAR }),
        compare: (biome: string) => fill(fogo.respostaComparacao, { percentualCaatinga: biome }),
        none:    fill(fogo.respostaNenhum, { anoInicial: FIRE_FIRST_YEAR, anoFinal: FIRE_LAST_YEAR }),
        noData:  fogo.respostaSemDado,
      },
      chuva: {
        unit:     chuva.unidade,
        meanUnit: chuva.unidadeMedia,
        // The class is the year's tercile among the territory's own years.
        chuvoso:  (pct: string, mean: string) => fill(chuva.respostaChuvoso, { percentual: pct, media: mean }),
        seco:     (pct: string, mean: string) => fill(chuva.respostaSeco, { percentual: pct, media: mean }),
        normal:   (mean: string) => fill(chuva.respostaNormal, { media: mean }),
        kindOnly: (kind: RainYearKind, mean: string) => fill(chuva.respostaClasse, { classe: kind, media: mean }),
        missing:  fill(chuva.respostaSemAno, { anoFinal: RAIN_LAST_YEAR }),
        compare:  (biome: string, reading: Reading) =>
          fill(chuva.respostaComparacao, { comparacao: MEAN_READING[reading], mediaCaatinga: biome }),
        noData:   chuva.respostaSemDado,
      },
    },
    /** The box under each theme's answer: why it matters, and its source. */
    why: {
      chuva:   why(chuva),
      uso:     why(uso),
      fogo:    why(fogo),
      estoque: why(estoque),
      fluxo:   why(fluxo),
    } satisfies Record<ThemeId, unknown>,
    /**
     * "Sobre os dados", at the end: everything the steps leave out. At most 250
     * words with every conditional sentence in (tests/lib/territoriosStoryText.test.ts).
     */
    about: {
      title: sobre.titulo,
      territorio: {
        title: territorio.sobreTitulo,
        text:  territorio.sobreTexto,
        /** In place of `text` for a recorte kept whole past the biome edge. */
        whole: territorio.sobreTextoMunicipios,
      },
      estoque: {
        title: estoque.sobreTitulo,
        text:  estoque.sobreTexto,
        /** Where the inventory has no pixel, the total leaves that part out. */
        coverage: (pct: string) => fill(estoque.sobreCobertura, { percentual: pct }),
      },
      fluxo: { title: fluxo.sobreTitulo, text: fill(fluxo.sobreTexto, { anoInicial: FLUX_FIRST_YEAR, anoFinal: FLUX_LAST_YEAR }) },
      uso:   { title: uso.sobreTitulo, text: fill(uso.sobreTexto, { anoInicial: LAND_USE_FIRST, anoFinal: LAND_USE_LAST }) },
      fogo:  { title: fogo.sobreTitulo, text: fill(fogo.sobreTexto, { anoInicial: FIRE_FIRST_YEAR, anoFinal: FIRE_LAST_YEAR }) },
      chuva: { title: chuva.sobreTitulo, text: fill(chuva.sobreTexto, { anoInicial: RAIN_FIRST_YEAR, anoFinal: RAIN_LAST_YEAR }) },
      units:      { title: sobre.unidadesTitulo, text: sobre.unidadesTexto },
      comparison: { title: sobre.comparacaoTitulo, text: sobre.comparacaoTexto },
      /** Appended to a theme computed at the pixel under an interior point. */
      point:  sobre.ponto,
      /** Appended to a theme reduced coarser than the layer's own scale. */
      coarse: (m: number) => fill(sobre.escala, { metros: numero(m, 0) }),
    },
  }
}

export type StoryScript = ReturnType<typeof storyScript>

/** The story as the code ships it: what the page shows without Contentful. */
export const SHIPPED_STORY_SCRIPT: StoryScript = storyScript(territoriosCopyDefaults())
