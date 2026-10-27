'use client'

/* eslint-disable @next/next/no-img-element -- fixed-size icons exported from Figma */
import '@/app/territorios-relatorio.css'
import { UI_ICONS } from '@/config/territorios/icons'

export interface PanelNavProps {
  /** The way back, named by where it leads: the previous tab, or the screen before the report. */
  back:   { label: string; onClick: () => void }
  /** The way on, named by where it leads; disabled while onClick is null. Left out on the summary. */
  next?:  { label: string; onClick: (() => void) | null }
}

/**
 * The buttons at the foot of a panel (Figma 19254:37462, 19254:37407): back to
 * the previous screen on the left, on to the next one on the right; the
 * summary has only the first (19254:37515).
 */
export default function PanelNav({ back, next }: PanelNavProps) {
  return (
    <div className={next ? 'territorios-painel-nav territorios-no-print' : 'territorios-painel-nav territorios-painel-nav--voltar territorios-no-print'}>
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
          {next.label}
          <img src={next.onClick ? UI_ICONS.next : UI_ICONS.nextDisabled} alt="" width={16} height={16} />
        </button>
      )}
    </div>
  )
}
