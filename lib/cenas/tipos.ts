// Contract between a glossary animation (lib/cenas/gerado/*.js, assembled by
// scripts/montar-cenas.mjs) and the page that hosts it.

export interface EstadoCena {
  tocando: boolean
  velocidade: number
  /** Position in the year, 0 to 1; the year starts on 1 November. */
  posicao: number
  /** Day and month at the position, "2 nov". */
  data: string
  movimentoReduzido: boolean
}

export interface OpcoesCena {
  /** Font stack for the text drawn on the canvas, the page's own. */
  fonte?: string
  aoMudar?: (estado: EstadoCena) => void
}

export interface ControleCena {
  tocar(v: boolean): void
  velocidade(v: number): void
  posicao(p: number): void
  /** Off screen the scene stops drawing. */
  visivel(v: boolean): void
  estado(): EstadoCena
  encerrar(): void
}

export type CriarCena = (canvas: HTMLCanvasElement, opcoes?: OpcoesCena) => ControleCena
