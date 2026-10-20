// Terms of the Glossário tab (Comunicação page). A term with `paragrafos`
// has its own page; one without is listed as "em breve". `animacao` names a
// scene assembled in lib/cenas/gerado/ (scripts/montar-cenas.mjs).

export type AnimacaoId = 'cicloAnual' | 'torreFluxo'

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
  { slug: 'estoque-de-carbono', titulo: 'Estoque de carbono' },
  {
    slug: 'torre-de-fluxo',
    titulo: 'Torre de fluxo',
    paragrafos: [],
    animacao: {
      id: 'torreFluxo',
      titulo: 'Como a torre mede o carbono',
      descricao: 'Paisagem de Caatinga com a torre de fluxo: o vento vertical e o CO₂ medidos no topo mostram se a vegetação absorve ou libera carbono. Os botões escolhem o caso.',
    },
  },
  { slug: 'fluxos-de-carbono', titulo: 'Fluxos de carbono' },
  { slug: 'eficiencia-de-uso-do-carbono', titulo: 'Eficiência de uso do carbono' },
  { slug: 'degradacao', titulo: 'Degradação' },
]

export const TERMO_PARAM = 'termo'

/** The term the address names, or the first one with a page. */
export function parseTermo(value: string | string[] | undefined): Termo {
  const comPagina = TERMOS.filter((t) => t.paragrafos)
  return comPagina.find((t) => t.slug === value) ?? comPagina[0]
}
