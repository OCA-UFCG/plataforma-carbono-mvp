'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import StepChart from './StepChart'
import StepFigure from './charts/StepFigure'
import { useStoryFmt } from './useStoryFmt'
import { confirmDetailText } from '@/config/territorios/chooserScript'
import { FIGURE_COLORS, STEP_COLORS } from '@/config/territorios/palette'
import type { TerritoryType } from '@/config/territorios/story'
import { TERRITORY_SCRIPT } from '@/config/territorios/storyScript'
import { sectionId } from '@/lib/territorios/activeSection'
import { aboutItems, summaryRows } from '@/lib/territorios/storyText'
import { intlLocale } from '@/lib/territorios/i18n'
import { formatArea } from '@/lib/territorios/storyValues'
import type { ThemeLoad } from './ThemeStep'
import type { ThemeId, TerritoryPayload, ThemeResponse } from '@/types/territorios'

export interface StorySummaryProps {
  territory: TerritoryPayload
  type:      TerritoryType
  loads:     Record<ThemeId, ThemeLoad>
  /** The session is gone: the retry buttons would only fail again. */
  expired:   boolean
  onRetry:   (theme: ThemeId) => void
  onAnotherTerritory: () => void
}

type ShareNotice = 'copied' | 'failed' | null

// The final sheet: one row per theme, "Sobre os dados" folded, and the actions.
// Printing outputs this section alone (territorios.css), with the fold open.
export default function StorySummary({
  territory, type, loads, expired, onRetry, onAnotherTerritory,
}: StorySummaryProps) {
  const ui = useTranslations('TerritoriosUi')
  const chooser = useTranslations('TerritoriosChooser')
  const names = useTranslations('TerritoriosTypes')
  const locale = useLocale()
  const fmt = useStoryFmt()
  const [generated] = useState(() => new Date())
  const [notice, setNotice] = useState<ShareNotice>(null)
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

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const responses: Partial<Record<ThemeId, ThemeResponse>> = {}
  for (const [theme, load] of Object.entries(loads) as [ThemeId, ThemeLoad][]) {
    if (load.kind === 'ready') responses[theme] = load.response
  }
  const input = { responses, territory, type, fmt }
  const rows = summaryRows(input)
  const about = aboutItems(input)
  const title = TERRITORY_SCRIPT.title(territory.featureName, type.id === 'estado' ? undefined : territory.context)
  const id = sectionId('resumo')
  const generatedAt = generated.toLocaleDateString(intlLocale(locale))

  async function share() {
    const url = window.location.href
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
      } catch {
        // Closing the share sheet rejects too; there is nothing to report.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setNotice('copied')
    } catch {
      setNotice('failed')
    }
  }

  return (
    <section id={id} data-step="resumo" className="territorios-resumo" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className="territorios-faixa" style={{ background: STEP_COLORS.territorio }} tabIndex={-1}>
        {ui('summaryTitle')}
      </h2>

      <header className="territorios-ficha-cabecalho">
        <p className="territorios-ficha-nome">{title}</p>
        <p className="territorios-ficha-detalhe">
          {/* The title above already carries the state. */}
          {confirmDetailText(
            names(`types.${type.id}.unitLabel`),
            undefined,
            formatArea(territory.areaHa, fmt),
            (key, values) => chooser(key, values),
            type.id === 'bioma',
          )}
        </p>
      </header>

      <ul className="territorios-ficha">
        {rows.map((row) => {
          const load = loads[row.theme]
          return (
            <li
              key={row.theme}
              // A print from another section can come before this theme was ever requested.
              className={load.kind === 'loading' ? 'territorios-ficha-linha territorios-no-print' : 'territorios-ficha-linha'}
              style={{ '--tema-cor': STEP_COLORS[row.theme] } as React.CSSProperties}
            >
              <h3 className="territorios-ficha-titulo">{row.title}</h3>
              {load.kind === 'loading' ? (
                <p className="territorios-ficha-estado">{ui('loading')}</p>
              ) : load.kind === 'failed' || load.response.status === 'unavailable' ? (
                <div className="territorios-ficha-estado">
                  <p>{ui('summaryUnavailable')}</p>
                  {!expired && (
                    <button
                      type="button"
                      className="territorios-btn territorios-btn--contorno territorios-no-print"
                      onClick={() => onRetry(row.theme)}
                      aria-label={ui('retryStep', { step: names(`steps.${row.theme}`) })}
                    >
                      {ui('retry')}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="territorios-ficha-valor">
                    {row.headline && (
                      <StepFigure value={row.headline.value} unit={row.headline.unit} color={FIGURE_COLORS[row.theme]} />
                    )}
                    {row.reading && (
                      <p className="territorios-ficha-leitura">
                        {fmt.t(row.theme === 'fluxo' ? `summary.fluxo.readings.${row.reading}` : `readings.${row.reading}`)}
                      </p>
                    )}
                  </div>
                  <p className="territorios-ficha-frase">{row.sentence}</p>
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
        <summary>{fmt.t('about.title')}</summary>
        <dl>
          {about.map((item) => (
            <div key={item.title}>
              <dt>{item.title}</dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
        <p className="territorios-sobre-data">{ui('generatedAt', { date: generatedAt })}</p>
      </details>

      <div className="territorios-navegacao territorios-navegacao--resumo">
        <button type="button" className="territorios-btn territorios-btn--primario" onClick={() => window.print()}>
          {ui('print')}
        </button>
        <button type="button" className="territorios-btn territorios-btn--contorno" onClick={() => void share()}>
          {ui('share')}
        </button>
        <button type="button" className="territorios-btn territorios-btn--contorno" onClick={onAnotherTerritory}>
          {ui('changeTerritory')}
        </button>
        <p className="territorios-aviso-link" role="status">
          {notice === 'copied' ? ui('linkCopied') : notice === 'failed' ? ui('copyFailed') : ''}
        </p>
      </div>
    </section>
  )
}
