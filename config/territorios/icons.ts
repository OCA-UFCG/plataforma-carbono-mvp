// Icons of the Territórios report, served from public/images/territorios/icones.
// The Figma exports are used as they come (Figma 19257:5752 for the tabs,
// 19254:37414 and 19254:37407 for the rest); fogo.svg and baixar.svg are
// Material Symbols "local_fire_department" and "download" (Apache 2.0),
// filled with the color they sit on: the fire tab's, and white on "Baixar".

import type { StepId } from '@/types/territorios'

const DIR = '/images/territorios/icones'

/** A glyph inside its 24 px box: its file, its own size, and where it sits. */
export interface IconBox {
  src:    string
  width:  number
  height: number
  top:    number
  left:   number
}

const full = (name: string): IconBox => ({ src: `${DIR}/${name}.svg`, width: 24, height: 24, top: 0, left: 0 })

/**
 * The "Air" and "Summarize" glyphs export as their inner group, which the
 * design places at an inset of its 24 px frame: 12.5% 8.33% 16.67% 8.33% and
 * 12.5% all round.
 */
export const STEP_ICONS: Record<StepId, IconBox> = {
  territorio: full('territorio'),
  estoque:    full('estoque'),
  fluxo:      { src: `${DIR}/fluxo.svg`, width: 20, height: 17, top: 3, left: 2 },
  uso:        full('uso'),
  fogo:       full('fogo'),
  chuva:      full('chuva'),
  resumo:     { src: `${DIR}/resumo.svg`, width: 18, height: 18, top: 3, left: 3 },
}

/** Each in the color of the control it sits in, one file per state. */
export const UI_ICONS = {
  edit:          `${DIR}/editar.svg`,
  download:      `${DIR}/baixar.svg`,
  share:         `${DIR}/compartilhar.svg`,
  shareDisabled: `${DIR}/compartilhar-desabilitado.svg`,
  locate:        `${DIR}/localizacao.svg`,
  back:          `${DIR}/seta-esquerda.svg`,
  next:          `${DIR}/seta-direita.svg`,
  nextDisabled:  `${DIR}/seta-direita-desabilitada.svg`,
  open:          `${DIR}/abrir.svg`,
  close:         `${DIR}/fechar.svg`,
} as const
