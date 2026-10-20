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
  /** Open step, in an animation told in steps; null otherwise. */
  etapa: number | null
  /** Name and text of the open step, read by screen readers. */
  textoEtapa: string | null
}

export interface EtapaCena {
  nome: string
  /** Colour of the step's swatch, when it has one. */
  cor: string | null
}

export interface OpcoesCena {
  /** Font stack for the text drawn on the canvas, the page's own. */
  fonte?: string
  aoMudar?: (estado: EstadoCena) => void
  /** Element under the animation where a scene with controls of its own builds them. */
  painel?: HTMLElement
}

export interface ControleCena {
  tocar(v: boolean): void
  velocidade(v: number): void
  posicao(p: number): void
  /** Off screen the scene stops drawing. */
  visivel(v: boolean): void
  /** The steps of an animation told in steps; null for one that plays a year. */
  etapas(): EtapaCena[] | null
  etapa(i: number): void
  /** Whether the page shows the time controls; false for a scene told only in steps. */
  tempo(): boolean
  estado(): EstadoCena
  encerrar(): void
}

export type CriarCena = (canvas: HTMLCanvasElement, opcoes?: OpcoesCena) => ControleCena
