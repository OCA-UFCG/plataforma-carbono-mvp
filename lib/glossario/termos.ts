// Terms of the Glossário tab (Comunicação page). A term with `paragrafos`
// has its own page; one without is listed as "em breve". `animacao` names a
// scene assembled in lib/cenas/gerado/ (scripts/montar-cenas.mjs).

export type AnimacaoId = 'cicloAnual'

export interface Termo {
  slug: string
  titulo: string
  paragrafos?: string[]
  animacao?: {
    id: AnimacaoId
    titulo: string
    /** Read by screen readers in place of the canvas. */
    descricao: string
    /** What the animation simplifies; shown under it. */
    nota: string
  }
  /** References in APA, in the order they are cited. */
  fontes?: string[]
}

export const TERMOS: Termo[] = [
  {
    slug: 'fotossintese',
    titulo: 'Fotossíntese',
    paragrafos: [],
    animacao: {
      id: 'cicloAnual',
      titulo: 'Um ano na Caatinga',
      descricao: 'Paisagem de Caatinga em corte, animada ao longo de um ano: o CO₂ entra nas plantas pela fotossíntese e sai pela respiração de plantas, serapilheira e solo; o saldo muda com a chuva.',
      nota: 'Ilustração sem escala, sobre um modelo conceitual em valores relativos. A respiração anual em torno de 60% da fotossíntese segue Mendes et al. (2020); os demais valores são escolhas de representação.',
    },
    fontes: [],
  },
  { slug: 'estoque-de-carbono', titulo: 'Estoque de carbono' },
  { slug: 'torre-de-fluxo', titulo: 'Torre de fluxo' },
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
