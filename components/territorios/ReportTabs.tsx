'use client'

import '@/app/territorios-relatorio.css'
import { REPORT } from '@/config/territorios/chooserScript'
import { STEPS, STEP_LABELS } from '@/config/territorios/story'
import { UI } from '@/config/territorios/storyScript'
import type { StepId } from '@/types/territorios'

/** "Localização" is the chooser; every other tab is a step of the report. */
export type ReportTab = StepId | 'localizacao'

export interface ReportTabsProps {
  current:      ReportTab
  /** False until a territory is chosen and loaded: the steps have nothing to show. */
  stepsEnabled: boolean
  /** Back to the chooser; null where there is none (the bioma) or it is already open. */
  onLocation:   (() => void) | null
  onSelect:     (step: StepId) => void
}

/**
 * The report's tab bar (Figma 19254:37436). Buttons rather than ARIA tabs:
 * "Localização" leaves the report for the chooser, which no tab panel can be.
 * The open tab carries aria-current, as the step rail did.
 */
export default function ReportTabs({ current, stepsEnabled, onLocation, onSelect }: ReportTabsProps) {
  const onChooser = current === 'localizacao'
  return (
    <nav className="territorios-abas territorios-no-print" aria-label={UI.stepsLabel}>
      <ul className="container territorios-abas-lista">
        <li>
          <button
            type="button"
            className="territorios-aba"
            aria-current={onChooser ? 'step' : undefined}
            disabled={!onChooser && !onLocation}
            onClick={onChooser ? undefined : onLocation ?? undefined}
          >
            {REPORT.location}
          </button>
        </li>
        {STEPS.map((step) => (
          <li key={step}>
            <button
              type="button"
              className="territorios-aba"
              aria-current={step === current ? 'step' : undefined}
              disabled={!stepsEnabled}
              onClick={() => onSelect(step)}
            >
              {STEP_LABELS[step]}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
