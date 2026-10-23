// Terms of the Glossário tab (Comunicação page). A term with `paragrafos`
// has its own page; one without is listed as "em breve". `animacao` names a
// scene assembled in lib/cenas/gerado/ (scripts/montar-cenas.mjs).

export type AnimacaoId = 'cicloAnual' | 'torreFluxo' | 'estoques' | 'fluxos' | 'cue' | 'degradacao' | 'agroecologia'

export interface Termo {
  slug: string
  titulo: string
  paragrafos?: string[]
  animacao?: {
    id: AnimacaoId
    titulo: string
    /** Read by screen readers in place of the canvas. */
    descricao: string
  }
  /** References in APA, in the order they are cited. */
  fontes?: string[]
  /** A way into the platform from the term, under the animation. */
  acesso?: { href: string; rotulo: string }
}

// Opens the platform on one layer. Through /login, which sends a visitor with
// a session straight on and brings one without back here after logging in;
// /mapa itself would drop the parameter on its way to the login page.
function naPlataforma(camada: string): string {
  return `/login?redirect=${encodeURIComponent(`/mapa?camada=${camada}`)}`
}

export const TERMOS: Termo[] = [
  {
    slug: 'fotossintese',
    titulo: 'Fotossíntese',
    // Placeholder until the team writes the entry and its sources.
    paragrafos: [
      'Fotossíntese é o processo pelo qual as plantas usam a energia da luz para transformar o gás carbônico (CO₂) do ar e a água em açúcares, liberando oxigênio (O₂). Esses açúcares viram folhas, galhos, raízes e frutos, e sustentam quase toda a vida do ecossistema. É por esse caminho que o carbono da atmosfera entra na vegetação e, mais tarde, no solo.',
    ],
    animacao: {
      id: 'cicloAnual',
      titulo: 'Um ano na Caatinga',
      descricao: 'Paisagem de Caatinga em corte, animada ao longo de um ano: o CO₂ entra nas plantas pela fotossíntese e sai pela respiração de plantas, serapilheira e solo; o saldo muda com a chuva.',
    },
  },
  {
    slug: 'estoque-de-carbono',
    titulo: 'Estoque de carbono',
    paragrafos: [],
    animacao: {
      id: 'estoques',
      titulo: 'Onde o carbono fica guardado',
      descricao: 'Paisagem de Caatinga em corte mostrando onde o carbono fica guardado: solo, parte aérea, raízes, madeira morta, serapilheira e herbáceas. Os botões destacam cada compartimento.',
    },
    acesso: { href: naPlataforma('estoque_carbono'), rotulo: 'Acesse os dados de estoque no bioma Caatinga' },
  },
  {
    slug: 'torre-de-fluxo',
    titulo: 'Torre de fluxo',
    paragrafos: [],
    animacao: {
      id: 'torreFluxo',
      titulo: 'Como a torre mede o carbono',
      descricao: 'Paisagem de Caatinga com a torre de fluxo: o vento em redemoinhos, os sensores no topo, o ar que sobe e desce de dia, à noite e na seca, e a área de onde vem o ar medido. Os botões avançam as etapas.',
    },
  },
  {
    slug: 'fluxos-de-carbono',
    titulo: 'Fluxos de carbono',
    paragrafos: [],
    animacao: {
      id: 'fluxos',
      titulo: 'Os nomes dos fluxos: GPP, Ra, NPP, Rh, Reco e NEE',
      descricao: 'Paisagem de Caatinga com a torre de fluxo, animada ao longo de um ano, mostrando GPP, respiração das plantas, NPP, respiração do solo, Reco e NEE. Os botões destacam cada fluxo.',
    },
  },
  {
    slug: 'eficiencia-de-uso-do-carbono',
    titulo: 'Eficiência de uso do carbono',
    paragrafos: [],
    animacao: {
      id: 'cue',
      titulo: 'Eficiência de uso do carbono (CUE)',
      descricao: 'Paisagem de Caatinga com a torre de fluxo mostrando, de cada 100 unidades de carbono fixadas pela fotossíntese, quantas ficam no ecossistema, e por que a CUE da Caatinga é alta. Os botões escolhem a explicação.',
    },
  },
  {
    slug: 'degradacao',
    titulo: 'Degradação',
    paragrafos: [],
    animacao: {
      id: 'degradacao',
      titulo: 'Caatinga degradada',
      descricao: 'Paisagem de Caatinga passando por etapas de degradação, de conservada a erodida, com o carbono que resta no ecossistema. Os botões escolhem a etapa.',
    },
  },
  {
    slug: 'manejo-agroecologico',
    titulo: 'Manejo agroecológico',
    paragrafos: [],
    animacao: {
      id: 'agroecologia',
      titulo: 'Agroecológico e tradicional exploratório',
      descricao: 'A mesma área de Caatinga com dois manejos separados por uma cerca: à esquerda, raleamento, cobertura morta e consórcio; à direita, corte raso, queima e roça em solo nu. Os botões avançam as etapas, e o painel compara o carbono dos dois lados.',
    },
  },
]

export const TERMO_PARAM = 'termo'

/** The term the address names, or the first one with a page. */
export function parseTermo(value: string | string[] | undefined): Termo {
  const comPagina = TERMOS.filter((t) => t.paragrafos)
  return comPagina.find((t) => t.slug === value) ?? comPagina[0]
}
