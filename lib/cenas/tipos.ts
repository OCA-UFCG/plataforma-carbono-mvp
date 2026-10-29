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
  /** The value the reader sets, in a scene that has one (valor()); null otherwise. */
  valor: number | null
  /** The value as the page shows it, "0,31". */
  textoValor: string | null
}

export interface EtapaCena {
  nome: string
  /** Colour of the step's swatch, when it has one. */
  cor: string | null
}

/** A value the reader sets, with presets: the CUE of each measured site. */
export interface ValorCena {
  /** Label of the slider, "Ajuste manual". */
  rotulo: string
  min: number
  max: number
  passo: number
  /** Values offered as buttons, "Área cristalina: 0,31". */
  predefinidos: { rotulo: string; valor: number }[]
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
  /** The value the reader sets, in a scene that has one; null otherwise. */
  valor(): ValorCena | null
  definirValor(v: number): void
  /** Whether the page shows the time controls; false for a scene told only in steps. */
  tempo(): boolean
  estado(): EstadoCena
  encerrar(): void
}

export type CriarCena = (canvas: HTMLCanvasElement, opcoes?: OpcoesCena) => ControleCena
