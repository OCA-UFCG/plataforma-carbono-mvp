'use client'

/* eslint-disable @next/next/no-img-element -- decorative art, hidden when it fails to load */
import '@/app/territorios-galeria.css'
import { INTRO } from '@/config/territorios/chooserScript'
import type { TerritoryType } from '@/config/territorios/story'

export interface TypeStripProps {
  type:     TerritoryType
  onChange: () => void
}

/** The chosen type's panel, folded into a band over the chooser and the story. */
export default function TypeStrip({ type, onChange }: TypeStripProps) {
  return (
    <div className="territorios-tipo-faixa territorios-no-print">
      <img
        className="territorios-painel-arte"
        src={type.image}
        alt=""
        onError={(event) => { event.currentTarget.hidden = true }}
      />
      <p className="territorios-tipo-faixa-nome">{type.unitLabel}</p>
      <button type="button" className="territorios-tipo-faixa-botao" onClick={onChange}>
        {INTRO.changeType}
      </button>
    </div>
  )
}
