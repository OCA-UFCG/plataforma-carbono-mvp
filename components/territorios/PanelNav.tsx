'use client'

/* eslint-disable @next/next/no-img-element -- fixed-size icons exported from Figma */
import '@/app/territorios-relatorio.css'
import { REPORT } from '@/config/territorios/chooserScript'
import { UI_ICONS } from '@/config/territorios/icons'

export interface PanelNavProps {
  /** "Recorte": back to the gallery of types. */
  onBack: () => void
  /** The way on, named by where it leads; disabled while onClick is null. Left out on the summary. */
  next?:  { label: string; onClick: (() => void) | null }
}

/**
 * The buttons at the foot of a panel (Figma 19254:37462, 19254:37407): back to
 * the types on the left, on to the next tab on the right; the summary has only
 * the first (19254:37515).
 */
export default function PanelNav({ onBack, next }: PanelNavProps) {
  return (
    <div className={next ? 'territorios-painel-nav territorios-no-print' : 'territorios-painel-nav territorios-painel-nav--voltar territorios-no-print'}>
      <button type="button" className="territorios-navegar territorios-navegar--voltar" onClick={onBack}>
        <img src={UI_ICONS.back} alt="" width={16} height={16} />
        {REPORT.cut}
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
