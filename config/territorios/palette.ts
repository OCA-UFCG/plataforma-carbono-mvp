// Colors of the Territórios story, one place for the charts, the map rasters and
// the map legend, so a color on the map means the same thing in the chart
// beside it. The tab colors come from the report's Figma; the data colors from
// the home's Figma palette (app/globals.css) or darkened from the logo's
// terracotta. tests/config/territoriosPalette.test.ts holds each to its contrast.

import type { StepId } from '@/types/territorios'

/**
 * Accent of each tab of the report: its icon and title, its big figures and
 * the bars of its charts (Figma 19257:5752, and the summary cards of
 * 19254:37507). Carbon reads green, land brown, rain blue; fire takes the slot
 * the design gave degradation, which it replaced (13deade). None carries text
 * under 24 px, so each needs 3:1 on the page and on a card, not 4.5:1
 * (tests/config/territoriosPalette.test.ts).
 */
export const STEP_COLORS: Record<StepId, string> = {
  // --role-marca-ancora-padrao
  territorio: '#587c22',
  // --role-categorica1-padrao
  estoque:    '#27725b',
  fluxo:      '#27725b',
  // --ar-800
  uso:        '#7f765a',
  fogo:       '#7f765a',
  // --role-categorica3-padrao
  chuva:      '#367483',
  resumo:     '#587c22',
}

/** The Caatinga reference marker in every comparison chart. */
export const REFERENCE_COLOR = '#001d27'

/** --bg-fundo, the surface the charts and the map legend sit on. */
export const SURFACE_COLOR = '#fefefb'

/**
 * 1 px outline of a mark whose fill sits below 3:1 on the surface (never
 * burned, one fire, the normal rain year, "outros"), so its edge still reads;
 * it is --bg-borda.
 */
export const MARK_OUTLINE_COLOR = '#526f78'

/** Land use groups, on the map and in the chart. */
export const LAND_USE_COLORS = {
  nativa:       '#47651b',
  agropecuaria: '#bf814c',
  urbana:       '#3d4a4f',
  outros:       '#bfcace',
} as const

/**
 * Years with fire 1985-2023, lightest to darkest, in the recurrence chart and
 * on the map. The map leaves "never" transparent: the frequency is masked
 * where nothing ever burned.
 */
export const FIRE_COLORS = {
  never:     '#bfcace',
  once:      '#e0a46b',
  twoToFour: '#c0612b',
  fivePlus:  '#7a2e12',
} as const

/** GFW net flux, two classes on the map. */
export const FLUX_COLORS = {
  removal:  '#367483',
  emission: '#b54c40',
} as const

/** Years of the rain strip, against the territory's own 1985-2024 mean. */
export const RAIN_COLORS = {
  seco:    '#bf814c',
  normal:  '#bfcace',
  chuvoso: '#367483',
} as const
