// The strings of the Territórios story.
//
// Editors keep the story's words in Contentful (lib/content/territorios.ts);
// storyScript(), at the end of this file, turns that copy into the templates
// lib/territorios/storyText.ts fills, with the years of each series from
// config/territorios/story.ts. What stays here is what the copy leaves in
// code: interface labels, the answers and summary sentences (for now), the
// chart descriptions read by screen readers, the summary's badges and the
// grammar tables.
//
// Templates receive values already formatted by lib/territorios/storyValues.ts;
// lib/territorios/storyText.ts picks the variant.
//
// A step shows a question of at most ten words, a big figure and an answer of
// at most twenty-one, and compares the territory with the whole Caatinga in the
// words "acima", "abaixo" and "perto". Sources, periods, definitions and
// caveats wait in "Sobre os dados", at the end.

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
  mapYear:          'Ano do mapa',

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
  MA: 'no Maranhão',
  MG: 'em Minas Gerais',
  PB: 'na Paraíba',
  PE: 'em Pernambuco',
  PI: 'no Piauí',
  RN: 'no Rio Grande do Norte',
  SE: 'em Sergipe',
}

/** A reading on the final sheet. */
export const READING_LABELS: Record<Reading, string> = {
  acima:  'Acima da Caatinga',
  abaixo: 'Abaixo da Caatinga',
  perto:  'Perto da Caatinga',
}

/** Years of the rain strip. */
export const RAIN_KIND_LABELS: Record<RainYearKind, string> = {
  seco:    'Seco',
  normal:  'Normal',
  chuvoso: 'Chuvoso',
}

const READING_OPENING: Record<Reading, string> = {
  acima:  'Acima',
  abaixo: 'Abaixo',
  perto:  'Perto',
}

/**
 * Answers while the story runs. The question already names the subject ("as
 * áreas com árvores", "a vegetação nativa"), so the answers start from the
 * figure. `tonnes` comes with its scale: "2,7 milhões de t".
 */
export const ANSWER_SCRIPT = {
  territorio: {
    located: (where: string) => `Área dentro da Caatinga, ${where}.`,
    plain:   'Área dentro da Caatinga.',
    state:   (biomePct: string) => `Área dentro da Caatinga, ${biomePct} do bioma.`,
    // Ten features in the estados layer (tests/config/territoriosStory.test.ts).
    biome:   'A Caatinga inteira, em dez estados.',
  },
  estoque: {
    unit:    't de carbono por hectare',
    compare: (reading: Reading, biome: string) =>
      `${READING_OPENING[reading]} da Caatinga (${biome} t por hectare).`,
    total:   (tonnes: string) => `No total, ${tonnes} de carbono.`,
    noData:  'Sem dado de carbono para esta área.',
  },
  fluxo: {
    unit:      (tonnes: string) => `${tonnes} de CO₂e`,
    removal:   'Tiraram mais carbono do que lançaram.',
    emission:  'Lançaram mais carbono do que tiraram.',
    balance:   'Tiraram e lançaram no ar a mesma quantidade de carbono.',
    share:     (pct: string, reading: Reading, biome: string) =>
      `Cobrem ${pct} da área, ${reading} dos ${biome} da Caatinga.`,
    shareOnly: (pct: string) => `Cobrem ${pct} da área.`,
    noForest:  'Não há áreas com árvores mapeadas aqui.',
  },
  uso: {
    unit:    `de vegetação nativa em ${LAND_USE_LAST}`,
    before:  (pct: string) => `Eram ${pct} em ${LAND_USE_FIRST}.`,
    compare: (biome: string, reading: Reading) => `A Caatinga tem ${biome}; aqui fica ${reading}.`,
    noData:  'Sem dado de uso da terra aqui.',
  },
  fogo: {
    unit:    'da área queimou ao menos uma vez',
    compare: (biome: string) => `Na Caatinga, ${biome}.`,
    peak:    (year: number) => `O ano com mais fogo aqui foi ${year}.`,
    none:    `Nenhuma área queimada registrada de ${FIRE_FIRST_YEAR} a ${FIRE_LAST_YEAR}.`,
    noData:  'Sem dado de fogo aqui.',
  },
  chuva: {
    unit:     `mm em ${RAIN_LAST_YEAR}`,
    meanUnit: 'mm por ano, em média',
    chuvoso:  (pct: string, mean: string) => `Chuvoso, ${pct} acima da média daqui (${mean} mm).`,
    seco:     (pct: string, mean: string) => `Seco, ${pct} abaixo da média daqui (${mean} mm).`,
    normal:   (mean: string) => `Perto da média daqui (${mean} mm).`,
    missing:  `Sem dado de ${RAIN_LAST_YEAR} aqui.`,
    compare:  (biome: string, reading: Reading) => `Essa média fica ${reading} da Caatinga (${biome} mm).`,
    noData:   'Sem dado de chuva aqui.',
  },
}

/** Lines of the final sheet, where the stock unit shortens to "t C". */
export const SUMMARY_ROW_SCRIPT = {
  estoque: {
    // No-break spaces keep "t C" and its number on one line.
    unit:  't C por hectare',
    total: (tonnes: string) => `No total, ${tonnes} C.`,
    biome: (biome: string) => `Na Caatinga, ${biome} t C por hectare.`,
  },
  fluxo: {
    unit:     't de CO₂e por hectare com árvores',
    removal:  (tonnes: string) => `No saldo, as áreas com árvores tiraram do ar ${tonnes} de CO₂e.`,
    emission: (tonnes: string) => `No saldo, as áreas com árvores lançaram no ar ${tonnes} de CO₂e.`,
    balance:  'No saldo, as áreas com árvores tiraram e lançaram a mesma quantidade.',
    // The unit beside it and the sentence before carry the "CO₂e".
    biome:    (biome: string) => `Na Caatinga, ${biome} t por hectare com árvores.`,
    /** The row compares per hectare with trees, not the share the step compares. */
    readings: {
      acima:  'Acima da Caatinga por hectare com árvores',
      abaixo: 'Abaixo da Caatinga por hectare com árvores',
      perto:  'Perto da Caatinga por hectare com árvores',
    } satisfies Record<Reading, string>,
    /** When the Caatinga went the other way, or stayed even, and no length compares. */
    biomeDirection: {
      removal:  'Na Caatinga, tiraram mais do que lançaram.',
      emission: 'Na Caatinga, lançaram mais do que tiraram.',
      neutral:  'Na Caatinga, ficaram em equilíbrio.',
    },
  },
  uso: {
    unit:   `da área em ${LAND_USE_LAST}`,
    before: (pct: string) => `Eram ${pct} em ${LAND_USE_FIRST}.`,
    biome:  (from: string, to: string) => `Na Caatinga, de ${from} para ${to}.`,
  },
  fogo: {
    unit:  'da área queimou ao menos uma vez',
    biome: (biome: string) => `Na Caatinga, ${biome}.`,
    peak:  (year: number) => `Mais fogo em ${year}.`,
    none:  `Nenhum fogo de ${FIRE_FIRST_YEAR} a ${FIRE_LAST_YEAR}.`,
  },
  chuva: {
    unit:  'mm por ano, em média',
    biome: (biome: string) => `Na Caatinga, ${biome} mm.`,
    year: {
      chuvoso: (mm: string) => `${RAIN_LAST_YEAR} foi chuvoso, com ${mm} mm.`,
      seco:    (mm: string) => `${RAIN_LAST_YEAR} foi seco, com ${mm} mm.`,
      normal:  (mm: string) => `${RAIN_LAST_YEAR} ficou perto da média, com ${mm} mm.`,
    } satisfies Record<RainYearKind, (mm: string) => string>,
    missing: `Sem dado de ${RAIN_LAST_YEAR}.`,
  },
}

function joinNonEmpty(...parts: (string | null)[]): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * Labels and accessible descriptions of the charts. A description reads the
 * chart aloud with the figures the drawing labels.
 */
export const CHART_SCRIPT = {
  here:  'Aqui',
  biome: 'Caatinga',
  compare: (label: string, here: string, biome: string | null) =>
    biome === null ? `${label}: ${here}.` : `${label}: aqui ${here}; na Caatinga, ${biome}.`,
  estoque:    't de carbono por hectare',
  fluxoShare: 'Parte da área com árvores',
  fluxoPerHa: 't de CO₂e por hectare com árvores',
  uso: {
    description: (rows: string) => `Vegetação nativa em ${LAND_USE_FIRST} e ${LAND_USE_LAST}. ${rows}`,
    row:         (name: string, from: string, to: string) => `${name}: de ${from} para ${to}.`,
    share:       `Vegetação nativa em ${LAND_USE_LAST}`,
  },
  fogo: {
    share:   'Área que já queimou',
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
    strip: (seco: number, normal: number, chuvoso: number) =>
      `Chuva de ${RAIN_FIRST_YEAR} a ${RAIN_LAST_YEAR} contra a média daqui. Anos secos: ${seco}; normais: ${normal}; chuvosos: ${chuvoso}.`,
    year:    (year: number, kind: string, mm: string) => `${year}: ${kind}, ${mm} mm.`,
    noYear:  (year: number) => `${year}: sem dado.`,
    mean:    'Chuva média por ano, em mm',
  },
}

/**
 * The story's words, built from the copy editors keep in Contentful. The
 * server reads the copy and sends plain strings, since functions do not cross
 * into a client component; the client builds this once
 * (components/territorios/StoryScriptContext.tsx).
 */
export function storyScript(copy: TerritoriosCopy) {
  const { apresentacao, territorio, estoque, fluxo, uso, fogo, chuva, sobre } = copy
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
      uso:        fill(uso.pergunta, { anoInicial: LAND_USE_FIRST }),
      fogo:       fill(fogo.pergunta, { anoInicial: FIRE_FIRST_YEAR }),
      chuva:      fill(chuva.pergunta, { anoFinal: RAIN_LAST_YEAR }),
    } satisfies Record<Exclude<StepId, 'resumo'>, string>,
    territory: {
      biomeShare: TERRITORY_SCRIPT.biomeShare,
      rankText:   TERRITORY_SCRIPT.rankText,
    },
    answers: ANSWER_SCRIPT,
    summary: {
      ...SUMMARY_ROW_SCRIPT,
      titles: {
        estoque: estoque.resumoTitulo,
        fluxo:   fluxo.resumoTitulo,
        uso:     uso.resumoTitulo,
        fogo:    fogo.resumoTitulo,
        chuva:   chuva.resumoTitulo,
      } satisfies Record<ThemeId, string>,
    },
    /**
     * "Sobre os dados", at the end: everything the steps leave out. At most 250
     * words with every conditional sentence in (tests/lib/territoriosStoryText.test.ts).
     */
    about: {
      title: sobre.titulo,
      territorio: { title: territorio.sobreTitulo, text: territorio.sobreTexto },
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
