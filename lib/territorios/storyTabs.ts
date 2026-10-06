// Which tab of the Territórios report is open, what it needs loaded, where it
// lives in the address, and when "Baixar" can print. Pure functions;
// components/territorios/TerritoriosApp.tsx holds the state.

import { STEPS, STORY_THEMES } from '@/config/territorios/story'
import type { StepId, ThemeId } from '@/types/territorios'

const THEME_IDS = STORY_THEMES.map((t) => t.id)

export function sectionId(step: StepId): string {
  return `etapa-${step}`
}

export function isStep(value: string): value is StepId {
  return (STEPS as string[]).includes(value)
}

/** The tab an address opens: the one it names, or the territory's own. */
export function stepFromQuery(etapa: string): StepId {
  return isStep(etapa) ? etapa : 'territorio'
}

/** The tab after `step`; null after the summary. */
export function nextStep(step: StepId): StepId | null {
  return STEPS[STEPS.indexOf(step) + 1] ?? null
}

function isTheme(step: StepId): step is ThemeId {
  return (THEME_IDS as string[]).includes(step)
}

/**
 * Themes to load while `step` is open: its own and the next tab's, so the next
 * one is usually ready when the visitor gets there; every theme on the summary.
 */
export function wantedThemes(step: StepId): ThemeId[] {
  if (step === 'resumo') return [...THEME_IDS]
  const next = nextStep(step)
  return [step, next].filter((s): s is ThemeId => s !== null && isTheme(s))
}

/**
 * Address of a screen of the section. The query, not the path, holds the state,
 * so the same links work wherever the section is placed: /territorios today, a
 * section of the home later.
 */
export function storyPath(pathname: string, recorteId: string | null, featureId: string, step: StepId): string {
  const params = new URLSearchParams()
  if (recorteId) params.set('recorte', recorteId)
  if (recorteId && featureId) {
    params.set('feicao', featureId)
    params.set('etapa', step)
  }
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

/**
 * Whether the summary "Baixar" asked for can print: every theme has an answer,
 * a failure included, or the session is gone and nothing more will come.
 */
export function readyToPrint(
  printKey:     string | null,
  territoryKey: string | null,
  expired:      boolean,
  settled:      Partial<Record<ThemeId, unknown>>,
): boolean {
  if (printKey === null || printKey !== territoryKey) return false
  return expired || THEME_IDS.every((theme) => settled[theme] !== undefined)
}
