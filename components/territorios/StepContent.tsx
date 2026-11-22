'use client'

/* eslint-disable @next/next/no-img-element -- fixed-size icons */
import type { ReactNode } from 'react'
import StepChart from './StepChart'
import { useStoryScript } from './StoryScriptContext'
import type { ThemeLoad } from './ThemeStep'
import WhyBox from './WhyBox'
import StepFigure from './charts/StepFigure'
import { UI_ICONS } from '@/config/territorios/icons'
import { STEP_COLORS } from '@/config/territorios/palette'
import { STEP_LABELS, storyTheme, type TerritoryType } from '@/config/territorios/story'
import { CHART_SCRIPT, UI } from '@/config/territorios/storyScript'
import { stepAnswer, territoryIndicators } from '@/lib/territorios/storyText'
import type { StepId, TerritoryPayload } from '@/types/territorios'

export interface StepContentProps {
  step:      Exclude<StepId, 'resumo'>
  territory: TerritoryPayload
  type:      TerritoryType
  /** Ignored on the territory step, which needs no theme request. */
  load:      ThemeLoad
  expired:   boolean
  onRetry:   () => void
  /** Level of the headings inside: 4 under a tab's title, 5 under a step of the summary. */
  level:     4 | 5
  /** Between the answer and "Por que importa?": the land use step's year switch. */
  children?: ReactNode
}

/**
 * What a step shows under its question: the answer and its charts, or the
 * territory's cards, then why the theme matters. The tab and the summary both
 * show it, so the summary repeats each step as the visitor saw it.
 */
export default function StepContent({
  step, territory, type, load, expired, onRetry, level, children,
}: StepContentProps) {
  const script = useStoryScript()
  const Heading = level === 4 ? 'h4' : 'h5'
  const color = STEP_COLORS[step]
  const theme = step === 'territorio' ? null : load
  const response = theme?.kind === 'ready' ? theme.response : undefined
  const answer = stepAnswer(step, { territory, type, response, script })

  let body: ReactNode
  if (theme?.kind === 'loading') {
    body = <p className="territorios-estado" role="status">{UI.loading}</p>
  } else if (theme && (theme.kind === 'failed' || theme.response.status === 'unavailable')) {
    const rateLimited = theme.kind === 'failed' && theme.rateLimited
    body = (
      <div className="territorios-estado" role="status">
        <p>{rateLimited ? UI.rateLimited : UI.unavailable}</p>
        {!expired && (
          <button
            type="button"
            className="territorios-btn territorios-btn--contorno territorios-no-print"
            onClick={onRetry}
            // The summary can hold several; each names its theme.
            aria-label={`${UI.retry}: ${STEP_LABELS[step]}`}
          >
            {UI.retry}
          </button>
        )}
      </div>
    )
  } else if (step === 'territorio') {
    body = (
      <div className="territorios-grafico">
        <Heading className="territorios-grafico-titulo">{CHART_SCRIPT.titles.territorio}</Heading>
        <div className="territorios-cartao">
          <span className="territorios-cartao-icone">
            <img src={UI_ICONS.area} alt="" width={24} height={24} />
          </span>
          <div className="territorios-cartao-conteudo">
            <p className="territorios-cartao-rotulo">{UI.areaLabel}</p>
            {answer.headline && <StepFigure value={answer.headline.value} unit={answer.headline.unit} color={color} />}
            {answer.sentence && <p className="territorios-resposta-frase">{answer.sentence}</p>}
          </div>
        </div>
        <ul className="territorios-indicadores">
          {territoryIndicators({ territory, type, script }).map((item) => (
            <li key={item.text} className="territorios-indicador">
              <p className="territorios-indicador-valor">{item.value}</p>
              <p className="territorios-indicador-texto">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    )
  } else {
    body = (
      <>
        <div className="territorios-resposta">
          {answer.headline && <StepFigure value={answer.headline.value} unit={answer.headline.unit} color={color} />}
          {answer.sentence && <p className="territorios-resposta-frase">{answer.sentence}</p>}
        </div>
        {response && <StepChart theme={step} response={response} territory={territory} type={type} titleLevel={level} />}
      </>
    )
  }

  const why = step === 'territorio' ? null : script.why[step]

  return (
    <>
      <div className="territorios-passo-texto">{body}</div>
      {children}
      {why && step !== 'territorio' && (
        <WhyBox title={why.title} text={why.text} source={why.source} glossarySlug={storyTheme(step).glossarySlug} level={level} />
      )}
    </>
  )
}
