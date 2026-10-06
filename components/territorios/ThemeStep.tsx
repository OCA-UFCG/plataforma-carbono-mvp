'use client'

import { useLayoutEffect, useRef } from 'react'
import PanelNav from './PanelNav'
import StepChart from './StepChart'
import StepIcon from './StepIcon'
import type { LandUseYear } from './StoryMap'
import StepFigure from './charts/StepFigure'
import { STEP_COLORS } from '@/config/territorios/palette'
import { LAND_USE_YEARS, STEP_LABELS, type TerritoryType } from '@/config/territorios/story'
import { UI } from '@/config/territorios/storyScript'
import { nextStep, sectionId } from '@/lib/territorios/storyTabs'
import { stepAnswer } from '@/lib/territorios/storyText'
import type { StepId, TerritoryPayload, ThemeResponse } from '@/types/territorios'

/** Where one theme's request stands, as the report's panels read it. */
export type ThemeLoad =
  | { kind: 'loading' }
  | { kind: 'ready'; response: ThemeResponse }
  | { kind: 'failed'; rateLimited: boolean }

export interface ThemeStepProps {
  step:      Exclude<StepId, 'resumo'>
  territory: TerritoryPayload
  type:      TerritoryType
  /** Ignored on the territory step, which needs no theme request. */
  load:      ThemeLoad
  /** The session is gone: a retry would only fail again, and the banner says what to do. */
  expired:   boolean
  onRetry:   () => void
  /** "Recorte": back to the gallery of types. */
  onBack:    () => void
  /** Opens the tab this panel's second button names. */
  onNext:    (step: StepId) => void
  /** The land use map's year switch; the map beside the panel follows it. */
  landUseYear?: { year: LandUseYear; onChange: (year: LandUseYear) => void }
}

/**
 * One tab of the report, beside the map (Figma 19254:37447): the title with
 * its icon, the question, the answer and its chart; at the foot, the way back
 * to the types and on to the next tab.
 */
export default function ThemeStep({
  step, territory, type, load, expired, onRetry, onBack, onNext, landUseYear,
}: ThemeStepProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const color = STEP_COLORS[step]
  const theme = step === 'territorio' ? null : load
  const response = theme?.kind === 'ready' ? theme.response : undefined
  const answer = stepAnswer(step, { territory, type, response })
  const next = nextStep(step)

  // The chart that replaces "Carregando" pushes the buttons down, and a focused
  // one can leave the screen with its focus ring.
  useLayoutEffect(() => {
    const focused = document.activeElement
    if (!(focused instanceof HTMLElement) || !sectionRef.current?.contains(focused)) return
    const box = focused.getBoundingClientRect()
    if (box.bottom > window.innerHeight || box.top < 0) focused.scrollIntoView({ block: 'nearest' })
  }, [theme?.kind, response])

  let body: React.ReactNode
  if (theme?.kind === 'loading') {
    body = <p className="territorios-estado" role="status">{UI.loading}</p>
  } else if (theme && (theme.kind === 'failed' || theme.response.status === 'unavailable')) {
    const rateLimited = theme.kind === 'failed' && theme.rateLimited
    body = (
      <div className="territorios-estado" role="status">
        <p>{rateLimited ? UI.rateLimited : UI.unavailable}</p>
        {!expired && (
          <button type="button" className="territorios-btn territorios-btn--contorno" onClick={onRetry}>
            {UI.retry}
          </button>
        )}
      </div>
    )
  } else {
    body = (
      <>
        <div className="territorios-resposta">
          {answer.headline && <StepFigure value={answer.headline.value} unit={answer.headline.unit} color={color} />}
          {answer.sentence && <p className="territorios-resposta-frase">{answer.sentence}</p>}
        </div>
        {step !== 'territorio' && response && (
          <StepChart theme={step} response={response} territory={territory} type={type} />
        )}
      </>
    )
  }

  const id = sectionId(step)

  return (
    <section ref={sectionRef} id={id} data-step={step} className="territorios-etapa-painel" aria-labelledby={`${id}-titulo`}>
      <div className="territorios-etapa-corpo">
        <h3 id={`${id}-titulo`} className="territorios-etapa-titulo" style={{ color }} tabIndex={-1}>
          <StepIcon step={step} />
          {STEP_LABELS[step]}
        </h3>
        <h4 className="territorios-etapa-pergunta">{answer.question}</h4>
        <div className="territorios-passo-texto">{body}</div>
        {landUseYear && (
          <div className="territorios-passo-anos" role="group" aria-labelledby={`${id}-anos`}>
            <span id={`${id}-anos`}>{UI.mapYear}</span>
            {LAND_USE_YEARS.map((y) => (
              <button key={y} type="button" aria-pressed={y === landUseYear.year} onClick={() => landUseYear.onChange(y)}>
                {y}
              </button>
            ))}
          </div>
        )}
      </div>
      <PanelNav
        onBack={onBack}
        next={next ? { label: STEP_LABELS[next], onClick: () => onNext(next) } : undefined}
      />
    </section>
  )
}
