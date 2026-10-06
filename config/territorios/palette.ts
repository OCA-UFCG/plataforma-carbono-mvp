// Colors of the Territórios story, one place for the charts, the map rasters and
// the map legend, so a color on the map means the same thing in the chart
// beside it. Theme colors come from the home's Figma palette (app/globals.css)
// or are darkened from the logo's terracotta; each carries white text and sits
// on --bg-fundo at 4.5:1 or more (tests/config/territoriosPalette.test.ts).

import type { StepId } from '@/types/territorios'

/** Heading band and accent of each step. */
export const STEP_COLORS: Record<Exclude<StepId, 'resumo'>, string> = {
  territorio: '#27725b',
  estoque:    '#47651b',
  fluxo:      '#002b39',
  uso:        '#9a5a2a',
  // --role-alerta-risco-hover of the home.
  fogo:       '#8f3a32',
  chuva:      '#2a5964',
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

/**
 * Big figure of each step and of its line on the final sheet. The land use
 * figure is the native vegetation share, so it takes the native color of the
 * chart and the map, where the step's terracotta sits next to agriculture's.
 */
export const FIGURE_COLORS: Record<Exclude<StepId, 'resumo'>, string> = {
  ...STEP_COLORS,
  uso: LAND_USE_COLORS.nativa,
}
