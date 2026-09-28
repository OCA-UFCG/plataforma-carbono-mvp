'use client'

/* eslint-disable @next/next/no-img-element -- the card art is swapped for an empty box when it fails to load, which next/image does not report */
import { useState } from 'react'
import { TERRITORY_TYPES, type TerritoryType } from '@/config/territorios/story'

export interface TypeCardsProps {
  onSelect: (type: TerritoryType) => void
}

function TypeCard({ type, onSelect }: { type: TerritoryType; onSelect: (type: TerritoryType) => void }) {
  const [failed, setFailed] = useState(false)

  return (
    <button type="button" className="territorios-tipo" onClick={() => onSelect(type)}>
      {failed ? (
        <span className="territorios-tipo-imagem" />
      ) : (
        <img
          className="territorios-tipo-imagem"
          src={type.image}
          alt=""
          // The page is server-rendered, so a missing image can fail before
          // hydration attaches onError; a finished load with no pixels is
          // that same failure.
          ref={(el) => { if (el?.complete && el.naturalWidth === 0) setFailed(true) }}
          onError={() => setFailed(true)}
        />
      )}
      <span className="territorios-tipo-nome">{type.unitLabel}</span>
      <svg className="territorios-tipo-seta" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

/** The enabled types only; the opening names the others in a line of text. */
export default function TypeCards({ onSelect }: TypeCardsProps) {
  return (
    <ul className="territorios-tipos">
      {TERRITORY_TYPES.filter((type) => type.enabled).map((type) => (
        <li key={type.id}>
          <TypeCard type={type} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  )
}
