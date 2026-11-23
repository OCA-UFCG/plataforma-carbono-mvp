'use client'

/* eslint-disable @next/next/no-img-element -- fixed-size icons exported from Figma */
import { useEffect, useRef, useState } from 'react'
import '@/app/territorios-resumo.css'
import PanelNav from './PanelNav'
import StepContent from './StepContent'
import StepIcon from './StepIcon'
import { useStoryScript } from './StoryScriptContext'
import { CHOOSER } from '@/config/territorios/chooserScript'
import { UI_ICONS } from '@/config/territorios/icons'
import { STEP_COLORS } from '@/config/territorios/palette'
import { clippedToBiome, STEP_LABELS, STEPS, type TerritoryType } from '@/config/territorios/story'
import { TERRITORY_SCRIPT, UI } from '@/config/territorios/storyScript'
import { previousStep, sectionId } from '@/lib/territorios/storyTabs'
import { aboutItems } from '@/lib/territorios/storyText'
import { formatArea } from '@/lib/territorios/storyValues'
import type { ThemeLoad } from './ThemeStep'
import type { StepId, ThemeId, TerritoryPayload, ThemeResponse } from '@/types/territorios'

export interface StorySummaryProps {
  /** Another tab is open; the summary stays in the page so "Baixar" can print it. */
  hidden:    boolean
  territory: TerritoryPayload
  type:      TerritoryType
  loads:     Record<ThemeId, ThemeLoad>
  /** The session is gone: the retry buttons would only fail again. */
  expired:   boolean
  onRetry:   (theme: ThemeId) => void
  /** Opens the tab the button at the foot names, the one before the summary. */
  onOpen:    (step: StepId) => void
}

/** Every step but the summary itself, in the order of the tabs. */
const SUMMARY_STEPS = STEPS.filter((step): step is Exclude<StepId, 'resumo'> => step !== 'resumo')

/**
 * The summary tab: every step again, as its tab shows it under its question,
 * then "Sobre os dados" folded and the way back. Printing outputs this
 * section alone, with the fold open, whichever tab is on screen; the band that
 * names the territory does not print, so the name heads the sheet on paper
 * only.
 */
export default function StorySummary({
  hidden, territory, type, loads, expired, onRetry, onOpen,
}: StorySummaryProps) {
  const [generatedAt] = useState(() => new Date().toLocaleDateString('pt-BR'))
  const aboutRef = useRef<HTMLDetailsElement | null>(null)
  const script = useStoryScript()
  const previous = previousStep('resumo')

  // A folded <details> prints folded; the sheet prints it open and folds it
  // back afterwards if the visitor had it closed.
  useEffect(() => {
    let reopen = false
    const before = () => {
      const details = aboutRef.current
      if (!details || details.open) return
      reopen = true
      details.open = true
    }
    const after = () => {
      if (reopen && aboutRef.current) aboutRef.current.open = false
      reopen = false
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  const responses: Partial<Record<ThemeId, ThemeResponse>> = {}
  for (const [theme, load] of Object.entries(loads) as [ThemeId, ThemeLoad][]) {
    if (load.kind === 'ready') responses[theme] = load.response
  }
  const about = aboutItems({ responses, territory, type, script })
  const title = TERRITORY_SCRIPT.title(territory.featureName, type.id === 'estado' ? undefined : territory.context)
  const id = sectionId('resumo')

  return (
    <section id={id} data-step="resumo" className="territorios-resumo" aria-labelledby={`${id}-titulo`} hidden={hidden}>
      <h3 id={`${id}-titulo`} className="territorios-etapa-titulo" style={{ color: STEP_COLORS.resumo }} tabIndex={-1}>
        <StepIcon step="resumo" />
        {STEP_LABELS.resumo}
      </h3>

      <header className="territorios-ficha-cabecalho territorios-so-impressao">
        <p className="territorios-ficha-nome">{title}</p>
        <p className="territorios-ficha-detalhe">
          {/* The title above already carries the state. */}
          {CHOOSER.confirmDetail(type.unitLabel, undefined, formatArea(territory.areaHa), type.id === 'bioma' || !clippedToBiome(type))}
        </p>
      </header>

      <div className="territorios-resumo-etapas">
        {SUMMARY_STEPS.map((step) => {
          const load = step === 'territorio' ? null : loads[step]
          return (
            <section
              key={step}
              // A print from another tab can come before this theme was ever requested.
              className={load?.kind === 'loading' ? 'territorios-resumo-etapa territorios-no-print' : 'territorios-resumo-etapa'}
              aria-labelledby={`${id}-${step}`}
            >
              <h4 id={`${id}-${step}`} className="territorios-resumo-etapa-titulo" style={{ color: STEP_COLORS[step] }}>
                <StepIcon step={step} />
                {script.questions[step]}
              </h4>
              <StepContent
                step={step}
                territory={territory}
                type={type}
                load={load ?? { kind: 'loading' }}
                expired={expired}
                onRetry={() => { if (step !== 'territorio') onRetry(step) }}
                level={5}
              />
            </section>
          )
        })}
      </div>

      <details ref={aboutRef} className="territorios-sobre">
        <summary>
          {script.about.title}
          <img className="territorios-sobre-abrir" src={UI_ICONS.open} alt="" width={24} height={24} />
          <img className="territorios-sobre-fechar" src={UI_ICONS.close} alt="" width={24} height={24} />
        </summary>
        <dl>
          {about.map((item, i) => (
            <div key={i}>
              <dt>{item.title}</dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
        <p className="territorios-sobre-data">{UI.generatedAt(generatedAt)}</p>
      </details>

      {previous && <PanelNav back={{ label: STEP_LABELS[previous], onClick: () => onOpen(previous) }} />}
    </section>
  )
}
