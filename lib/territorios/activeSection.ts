// Which section of the Territórios story is being read, and what it needs
// loaded. Pure functions; components/territorios/useActiveSection.ts measures
// the page and feeds them.

import { STEPS, STORY_THEMES } from '@/config/territorios/story'
import type { StepId, ThemeId } from '@/types/territorios'

/** Share of the uncovered viewport height, from its top, where a section becomes the active one. */
const TRIGGER_RATIO = 0.45

const THEME_IDS = STORY_THEMES.map((t) => t.id)

export function sectionId(step: StepId): string {
  return `etapa-${step}`
}

/**
 * Y of the trigger line in viewport coordinates. `coveredTop` is the bottom of
 * whatever sticks over the top of the text (the compact map on a phone), 0
 * when nothing does.
 */
export function triggerLineY(viewportHeight: number, coveredTop: number): number {
  const top = Math.min(Math.max(coveredTop, 0), viewportHeight)
  return top + (viewportHeight - top) * TRIGGER_RATIO
}

/**
 * Index of the last section whose top is at or above the trigger line; 0 when
 * none is. Tops are viewport coordinates in document order; a section that is
 * not rendered can be passed as Infinity.
 */
export function pickActiveIndex(sectionTops: readonly number[], triggerY: number): number {
  let index = 0
  sectionTops.forEach((top, i) => {
    if (top <= triggerY) index = i
  })
  return index
}

function isTheme(step: StepId): step is ThemeId {
  return (THEME_IDS as string[]).includes(step)
}

/**
 * Themes to load while `step` is the settled section: its own and the next
 * section's, so the next one is usually ready when the visitor gets there;
 * every theme on the summary.
 */
export function wantedThemes(step: StepId): ThemeId[] {
  if (step === 'resumo') return [...THEME_IDS]
  const next = STEPS[STEPS.indexOf(step) + 1]
  return [step, next].filter((s): s is ThemeId => s !== undefined && isTheme(s))
}
