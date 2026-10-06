'use client'

/* eslint-disable @next/next/no-img-element -- fixed-size icons exported from Figma */
import { useEffect, useRef, useState } from 'react'
import '@/app/territorios-resumo.css'
import PanelNav from './PanelNav'
import StepChart from './StepChart'
import StepIcon from './StepIcon'
import StepFigure from './charts/StepFigure'
import { CHOOSER } from '@/config/territorios/chooserScript'
import { UI_ICONS } from '@/config/territorios/icons'
import { STEP_COLORS } from '@/config/territorios/palette'
import { STEP_LABELS, type TerritoryType } from '@/config/territorios/story'
import { ABOUT_SCRIPT, READING_LABELS, SUMMARY_ROW_SCRIPT, TERRITORY_SCRIPT, UI } from '@/config/territorios/storyScript'
import { sectionId } from '@/lib/territorios/storyTabs'
import { aboutItems, summaryRows } from '@/lib/territorios/storyText'
import { formatArea } from '@/lib/territorios/storyValues'
import type { ThemeLoad } from './ThemeStep'
import type { ThemeId, TerritoryPayload, ThemeResponse } from '@/types/territorios'

export interface StorySummaryProps {
  /** Another tab is open; the summary stays in the page so "Baixar" can print it. */
  hidden:    boolean
  territory: TerritoryPayload
  type:      TerritoryType
  loads:     Record<ThemeId, ThemeLoad>
  /** The session is gone: the retry buttons would only fail again. */
  expired:   boolean
  onRetry:   (theme: ThemeId) => void
  /** "Recorte": back to the gallery of types. */
  onBack:    () => void
}

/**
 * The summary tab (Figma 19254:37467): a card per theme, its reading as a
 * badge colored by whether it is good news, "Sobre os dados" folded, and the
 * way back. Printing outputs this section alone, with the fold open, whichever
 * tab is on screen; the band that names the territory does not print, so the
 * name heads the sheet on paper only.
 */
export default function StorySummary({
  hidden, territory, type, loads, expired, onRetry, onBack,
}: StorySummaryProps) {
  const [generatedAt] = useState(() => new Date().toLocaleDateString('pt-BR'))
  const aboutRef = useRef<HTMLDetailsElement | null>(null)

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
  const input = { responses, territory, type }
  const rows = summaryRows(input)
  const about = aboutItems(input)
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
          {CHOOSER.confirmDetail(type.unitLabel, undefined, formatArea(territory.areaHa), type.id === 'bioma')}
        </p>
      </header>

      <ul className="territorios-fichas">
        {rows.map((row) => {
          const load = loads[row.theme]
          const color = STEP_COLORS[row.theme]
          return (
            <li
              key={row.theme}
              // A print from another tab can come before this theme was ever requested.
              className={load.kind === 'loading' ? 'territorios-ficha territorios-no-print' : 'territorios-ficha'}
            >
              <div className="territorios-ficha-topo">
                {row.reading && row.tone && (
                  <p className="territorios-ficha-leitura" data-tom={row.tone}>
                    {row.theme === 'fluxo' ? SUMMARY_ROW_SCRIPT.fluxo.readings[row.reading] : READING_LABELS[row.reading]}
                  </p>
                )}
                <h4 className="territorios-ficha-titulo">{row.title}</h4>
              </div>
              {load.kind === 'loading' ? (
                <p className="territorios-ficha-estado">{UI.loading}</p>
              ) : load.kind === 'failed' || load.response.status === 'unavailable' ? (
                <div className="territorios-ficha-estado">
                  <p>{UI.summaryUnavailable}</p>
                  {!expired && (
                    <button
                      type="button"
                      className="territorios-btn territorios-btn--contorno territorios-no-print"
                      onClick={() => onRetry(row.theme)}
                      aria-label={`${UI.retry}: ${STEP_LABELS[row.theme]}`}
                    >
                      {UI.retry}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="territorios-ficha-valor">
                    {row.headline && <StepFigure value={row.headline.value} unit={row.headline.unit} color={color} />}
                    <p className="territorios-ficha-frase">{row.sentence}</p>
                  </div>
                  <div className="territorios-ficha-grafico">
                    <StepChart theme={row.theme} response={load.response} territory={territory} type={type} compact />
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>

      <details ref={aboutRef} className="territorios-sobre">
        <summary>
          {ABOUT_SCRIPT.title}
          <img className="territorios-sobre-abrir" src={UI_ICONS.open} alt="" width={24} height={24} />
          <img className="territorios-sobre-fechar" src={UI_ICONS.close} alt="" width={24} height={24} />
        </summary>
        <dl>
          {about.map((item) => (
            <div key={item.title}>
              <dt>{item.title}</dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
        <p className="territorios-sobre-data">{UI.generatedAt(generatedAt)}</p>
      </details>

      <PanelNav onBack={onBack} />
    </section>
  )
}
