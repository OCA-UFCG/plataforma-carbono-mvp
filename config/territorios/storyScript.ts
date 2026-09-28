// Every string of the Territórios story.
//
// Templates receive values already formatted by lib/territorios/storyValues.ts;
// lib/territorios/storyText.ts picks the variant, so a copy review reads this
// file alone.
//
// A step shows a question of at most ten words, a big figure and an answer of
// at most twenty, and compares the territory with the whole Caatinga in the
// words "acima", "abaixo" and "perto". Sources, periods, definitions and
// caveats wait in "Sobre os dados", at the end.

import { numero } from '@/lib/mapa/format'
import { displayName } from '@/lib/territorios/featureIds'
import {
  DEGRADATION_YEAR,
  FLUX_FIRST_YEAR,
  FLUX_LAST_YEAR,
  LAND_USE_YEARS,
  RAIN_FIRST_YEAR,
  RAIN_LAST_YEAR,
} from '@/config/territorios/story'
import type { RainYearKind, Reading, StepId, ThemeId } from '@/types/territorios'

export const UI = {
  pageTitle:    'Territórios',

  loading:       'Carregando os dados',
  unavailable:    'Não foi possível carregar estes dados.',
  territoryUnavailable: 'Não foi possível carregar os dados deste território.',
  retry:          'Tentar novamente',
  rateLimited:    'Muitos acessos no momento. Aguarde e tente novamente.',
  sessionExpired: 'Sua sessão expirou.',
  signIn:         'Entrar novamente',

  stepsLabel:       'Etapas',
  next:            'Próxima',
  changeTerritory:  'Trocar território',
  showMap:          'Ver no mapa',
  closeMap:         'Fechar mapa',
  mapDialog:        (step: string) => `Mapa: ${step}`,
  mapYear:          'Ano do mapa',

  summaryTitle:     'Resumo',
  summaryUnavailable: 'Indisponível no momento.',
  print:            'Imprimir resumo',
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
}

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

/** Shown as soon as the step opens, before its data arrives. */
export const STEP_QUESTIONS: Record<Exclude<StepId, 'resumo'>, string> = {
  territorio: 'Onde fica e qual é o tamanho?',
  estoque:    'Quanto carbono a vegetação original guardaria aqui?',
  fluxo:      'As áreas com árvores tiraram ou lançaram carbono do ar?',
  uso:        `Como mudou a vegetação nativa desde ${LAND_USE_FIRST}?`,
  degradacao: 'Quanto da terra está degradada aqui?',
  chuva:      `${RAIN_LAST_YEAR} foi um ano seco ou chuvoso aqui?`,
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
    total:   (tonnes: string) => `No total, ${tonnes}.`,
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
  degradacao: {
    unit:           'da área com degradação',
    compare:        (biome: string, reading: Reading) => `${READING_OPENING[reading]} dos ${biome} da Caatinga.`,
    severe:         (pct: string) => `Os níveis mais graves, 4 e 5, somam ${pct}.`,
    conserved:      (pct: string) => `A área conservada soma ${pct}.`,
    pointConserved: 'A terra aqui está conservada.',
    pointLevel:     (level: number) => `A terra aqui está no nível ${level} de degradação; o 5 é o mais grave.`,
    noData:         'Sem dado de degradação aqui.',
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
  titles: {
    estoque:    'Carbono da vegetação original',
    fluxo:      'Carbono trocado com o ar',
    uso:        'Vegetação nativa',
    degradacao: 'Terra degradada',
    chuva:      'Chuva',
  } satisfies Record<ThemeId, string>,
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
  degradacao: {
    unit:      'da área',
    biome:     (biome: string) => `Na Caatinga, ${biome}.`,
    conserved: (pct: string) => `A área conservada soma ${pct}.`,
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

/**
 * "Sobre os dados", at the end: everything the steps leave out. At most 250
 * words with every conditional sentence in (tests/lib/territoriosStoryText.test.ts).
 */
export const ABOUT_SCRIPT = {
  title: 'Sobre os dados',
  territorio: {
    title: 'Território',
    text:  'Área dentro do limite da Caatinga, segundo o IBGE (2019).',
  },
  estoque: {
    title: 'Estoque',
    text:  'Quarto Inventário Nacional, em quadrados de 100 m. Carbono que a vegetação original guardaria, sem descontar o uso atual da terra; inclui o carbono do solo.',
    /** Where the inventory has no pixel, the total leaves that part out. */
    coverage: (pct: string) => `O inventário cobre ${pct} desta área; o total vale só para essa parte.`,
  },
  fluxo: {
    title: 'Fluxo',
    text:  `Global Forest Watch, versão 1.4.2, 30 m; saldo de ${FLUX_FIRST_YEAR} a ${FLUX_LAST_YEAR}. Áreas com árvores: copas cobrindo mais de 30% do chão em 2000, ou ganho de copas de 2000 a 2020.`,
  },
  uso: {
    title: 'Uso da terra',
    text:  `MapBiomas, coleção 10.1, 30 m, ${LAND_USE_FIRST} e ${LAND_USE_LAST}. Vegetação nativa: formações florestal, savânica e campestre, mangue, floresta alagável, restingas, campo alagado e apicum. Agropecuária inclui áreas de lavoura e pasto misturados.`,
  },
  degradacao: {
    title:  'Degradação',
    text:   `Índice OCA v4, de ${DEGRADATION_YEAR}, 500 m, em cinco níveis; o 5 é o mais grave. "Sem dado" é a parte que o índice não cobre`,
    /** Closes `text`: the share without data here, or just the period. */
    noData: (pct: string | null) => (pct ? `, ${pct} aqui.` : '.'),
  },
  chuva: {
    title: 'Chuva',
    text:  `CHIRPS, 5,6 km, de ${RAIN_FIRST_YEAR} a ${RAIN_LAST_YEAR}. Ano seco ou chuvoso: 10% ou mais abaixo ou acima da média do próprio território; entre os dois, normal.`,
  },
  units: {
    title: 'Unidades',
    text:  't C é tonelada de carbono; 1 t C equivale a 3,67 t de CO₂. CO₂e soma ao CO₂ outros gases de efeito estufa, como metano e óxido nitroso.',
  },
  comparison: {
    title: 'Comparação com a Caatinga',
    text:  'Mesmas fontes e mesmo cálculo; no bioma, fluxo e uso da terra a 100 m. Perto: diferença menor que 10%.',
  },
  /** Appended to a theme computed at the pixel under an interior point. */
  point:  'Aqui, valor de um ponto do território.',
  /** Appended to a theme reduced coarser than the layer's own scale. */
  coarse: (m: number) => `Aqui, calculado a ${numero(m, 0)} m.`,
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
  degradacao: {
    description: (rows: string) => `Parte da área em cada nível de degradação. ${rows}`,
    row:         (name: string, parts: string) => `${name}: ${parts}.`,
    share:       'Área com degradação',
    /** By class code; code 6 is Conservado and code 1 is Nível 5. */
    levels: {
      6: 'conservado',
      5: 'nível 1',
      4: 'nível 2',
      3: 'nível 3',
      2: 'nível 4',
      1: 'nível 5',
      0: 'sem dado',
    } as Record<number, string>,
  },
  chuva: {
    strip: (seco: number, normal: number, chuvoso: number) =>
      `Chuva de ${RAIN_FIRST_YEAR} a ${RAIN_LAST_YEAR} contra a média daqui. Anos secos: ${seco}; normais: ${normal}; chuvosos: ${chuvoso}.`,
    year:    (year: number, kind: string, mm: string) => `${year}: ${kind}, ${mm} mm.`,
    noYear:  (year: number) => `${year}: sem dado.`,
    mean:    'Chuva média por ano, em mm',
  },
}
