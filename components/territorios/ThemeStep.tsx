'use client'

import { useLayoutEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import StepChart from './StepChart'
import type { LandUseYear } from './StoryMap'
import { useStoryFmt } from './useStoryFmt'
import StepFigure from './charts/StepFigure'
import { FIGURE_COLORS, STEP_COLORS } from '@/config/territorios/palette'
import { LAND_USE_YEARS, type TerritoryType } from '@/config/territorios/story'
import { sectionId } from '@/lib/territorios/activeSection'
import { stepAnswer } from '@/lib/territorios/storyText'
import type { StepId, TerritoryPayload, ThemeResponse } from '@/types/territorios'

/** Where one theme's request stands, as the story screens read it. */
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
  /** Scrolls to the next section. */
  onNext:    () => void
  /** Opens the map sheet on a phone; the button only shows there. */
  onShowMap: (opener: HTMLButtonElement) => void
  /** The map sheet is open on this step. */
  mapOpen:   boolean
  /**
   * The land use map's year switch, on the land use step of a computer: there
   * the map comes after every step in the tab order.
   */
  landUseYear?: { year: LandUseYear; onChange: (year: LandUseYear) => void }
}

export default function ThemeStep({
  step, territory, type, load, expired, onRetry, onNext, onShowMap, mapOpen, landUseYear,
}: ThemeStepProps) {
  const ui = useTranslations('TerritoriosUi')
  const steps = useTranslations('TerritoriosTypes')
  const fmt = useStoryFmt()
  const sectionRef = useRef<HTMLElement | null>(null)
  const color = STEP_COLORS[step]
  const theme = step === 'territorio' ? null : load
  const response = theme?.kind === 'ready' ? theme.response : undefined
  const answer = stepAnswer(step, { territory, type, response, fmt })

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
    body = <p className="territorios-estado" role="status">{ui('loading')}</p>
  } else if (theme && (theme.kind === 'failed' || theme.response.status === 'unavailable')) {
    const rateLimited = theme.kind === 'failed' && theme.rateLimited
    body = (
      <div className="territorios-estado" role="status">
        <p>{rateLimited ? ui('rateLimited') : ui('unavailable')}</p>
        {!expired && (
          <button type="button" className="territorios-btn territorios-btn--contorno" onClick={onRetry}>
            {ui('retry')}
          </button>
        )}
      </div>
    )
  } else {
    body = (
      <>
        <div className="territorios-resposta">
          {answer.headline && <StepFigure value={answer.headline.value} unit={answer.headline.unit} color={FIGURE_COLORS[step]} />}
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
    <section ref={sectionRef} id={id} data-step={step} className="territorios-passo" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className="territorios-faixa" style={{ background: color }} tabIndex={-1}>
        {steps(`steps.${step}`)}
      </h2>
      <h3 className="territorios-pergunta">{answer.question}</h3>
      <div className="territorios-passo-texto">{body}</div>
      {landUseYear && (
        <div className="territorios-passo-anos" role="group" aria-labelledby={`${id}-anos`}>
          <span id={`${id}-anos`}>{ui('mapYear')}</span>
          {LAND_USE_YEARS.map((y) => (
            <button key={y} type="button" aria-pressed={y === landUseYear.year} onClick={() => landUseYear.onChange(y)}>
              {y}
            </button>
          ))}
        </div>
      )}
      <div className="territorios-navegacao">
        <button
          type="button"
          className="territorios-btn territorios-btn--contorno territorios-ver-mapa"
          aria-haspopup="dialog"
          aria-expanded={mapOpen}
          onClick={(event) => onShowMap(event.currentTarget)}
        >
          {ui('showMap')}
        </button>
        <button type="button" className="territorios-btn territorios-btn--primario" onClick={onNext}>
          {ui('next')}
        </button>
      </div>
    </section>
  )
}
