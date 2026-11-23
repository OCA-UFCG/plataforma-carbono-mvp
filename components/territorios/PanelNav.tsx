'use client'

/* eslint-disable @next/next/no-img-element -- fixed-size icons exported from Figma */
import '@/app/territorios-relatorio.css'
import { UI_ICONS } from '@/config/territorios/icons'

export interface PanelNavProps {
  /** The way back, named by where it leads: the previous tab, or the screen before the report. */
  back:   { label: string; onClick: () => void }
  /**
   * The way on, named by where it leads, and by the question it opens on;
   * disabled while onClick is null. Left out on the summary.
   */
  next?:  { label: string; detail?: string; onClick: (() => void) | null }
  /** Across the report under the panel and the map, the way on the wider. */
  wide?:  boolean
}

/**
 * The buttons at the foot of a panel (Figma 19254:37462, 19254:37407): back to
 * the previous screen on the left, on to the next one on the right; the
 * summary has only the first (19254:37515).
 */
export default function PanelNav({ back, next, wide = false }: PanelNavProps) {
  const classes = ['territorios-painel-nav', 'territorios-no-print']
  if (!next) classes.push('territorios-painel-nav--voltar')
  if (wide) classes.push('territorios-painel-nav--largo')
  return (
    <div className={classes.join(' ')}>
      <button type="button" className="territorios-navegar territorios-navegar--voltar" onClick={back.onClick}>
        <img src={UI_ICONS.back} alt="" width={16} height={16} />
        {back.label}
      </button>
      {next && (
        <button
          type="button"
          className="territorios-navegar"
          disabled={next.onClick === null}
          onClick={next.onClick ?? undefined}
        >
          {next.detail ? (
            <span className="territorios-navegar-texto">
              <b>{next.label}</b>
              <span className="territorios-navegar-detalhe">{next.detail}</span>
            </span>
          ) : next.label}
          <img src={next.onClick ? UI_ICONS.next : UI_ICONS.nextDisabled} alt="" width={16} height={16} />
        </button>
      )}
    </div>
  )
}
