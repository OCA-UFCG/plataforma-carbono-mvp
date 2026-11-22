'use client'

/* eslint-disable @next/next/no-img-element -- fixed-size icons */
import { useLayoutEffect, useRef } from 'react'
import StepContent from './StepContent'
import StepIcon from './StepIcon'
import { useStoryScript } from './StoryScriptContext'
import type { LandUseYear } from './StoryMap'
import { UI_ICONS } from '@/config/territorios/icons'
import { STEP_COLORS } from '@/config/territorios/palette'
import { LAND_USE_YEARS, type TerritoryType } from '@/config/territorios/story'
import { UI } from '@/config/territorios/storyScript'
import { sectionId } from '@/lib/territorios/storyTabs'
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
  /** The land use map's year switch; the map beside the panel follows it. */
  landUseYear?: { year: LandUseYear; onChange: (year: LandUseYear) => void }
}

/**
 * One tab of the report, beside the map: the question as its title, the
 * answer, its charts each under their own question, and why the theme matters.
 * The buttons to the previous and next tabs run under the panel and the map
 * (TerritoriosApp).
 */
export default function ThemeStep({
  step, territory, type, load, expired, onRetry, landUseYear,
}: ThemeStepProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const script = useStoryScript()
  const theme = step === 'territorio' ? null : load
  const response = theme?.kind === 'ready' ? theme.response : undefined

  // The chart that replaces "Carregando" pushes the buttons under the report
  // down, and a focused one can leave the screen with its focus ring.
  useLayoutEffect(() => {
    const focused = document.activeElement
    const report = sectionRef.current?.parentElement
    if (!(focused instanceof HTMLElement) || !report?.contains(focused)) return
    const box = focused.getBoundingClientRect()
    if (box.bottom > window.innerHeight || box.top < 0) focused.scrollIntoView({ block: 'nearest' })
  }, [theme?.kind, response])

  const id = sectionId(step)

  return (
    <section ref={sectionRef} id={id} data-step={step} className="territorios-etapa-painel" aria-labelledby={`${id}-titulo`}>
      <h3 id={`${id}-titulo`} className="territorios-etapa-titulo" style={{ color: STEP_COLORS[step] }} tabIndex={-1}>
        <StepIcon step={step} />
        {script.questions[step]}
      </h3>
      <StepContent step={step} territory={territory} type={type} load={load} expired={expired} onRetry={onRetry} level={4}>
        {landUseYear && (
          <div className="territorios-explorar">
            <img src={UI_ICONS.map} alt="" width={24} height={24} />
            <div>
              <h4 className="territorios-explorar-titulo">{UI.exploreTitle}</h4>
              <p className="territorios-explorar-texto">{UI.exploreText}</p>
              <div className="territorios-passo-anos" role="group" aria-labelledby={`${id}-anos`}>
                <span id={`${id}-anos`}>{UI.mapYear}</span>
                {LAND_USE_YEARS.map((y) => (
                  <button key={y} type="button" aria-pressed={y === landUseYear.year} onClick={() => landUseYear.onChange(y)}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </StepContent>
    </section>
  )
}
