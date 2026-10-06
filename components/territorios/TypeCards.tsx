'use client'

/* eslint-disable @next/next/no-img-element -- the photo is swapped for an empty fill when it fails to load, which next/image does not report */
import { useState } from 'react'
import '@/app/territorios-galeria.css'
import { INTRO } from '@/config/territorios/chooserScript'
import { UI_ICONS } from '@/config/territorios/icons'
import { TERRITORY_TYPES, type TerritoryType } from '@/config/territorios/story'

export interface TypeCardsProps {
  onSelect: (type: TerritoryType) => void
}

function CardPhoto({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src={src}
      alt=""
      width={811}
      height={404}
      // The page is server-rendered, so a missing image can fail before
      // hydration attaches onError; a finished load with no pixels is that
      // same failure.
      ref={(el) => { if (el?.complete && el.naturalWidth === 0) setFailed(true) }}
      onError={() => setFailed(true)}
    />
  )
}

/**
 * The gallery of territory types (Figma 19254:37353): "Escolha o recorte" over
 * a grid of cards, each a photo over a bar with the type's name and an arrow.
 * The whole card is the button into the type.
 */
export default function TypeCards({ onSelect }: TypeCardsProps) {
  return (
    <section className="territorios-recortes" aria-labelledby="territorios-recortes-titulo">
      <h3 id="territorios-recortes-titulo" className="territorios-recortes-titulo">{INTRO.chooseCut}</h3>
      <ul className="territorios-recortes-grade">
        {TERRITORY_TYPES.map((type) => (
          <li key={type.id}>
            <button type="button" className="territorios-recorte" onClick={() => onSelect(type)}>
              <span className="territorios-recorte-foto">
                <CardPhoto src={type.image} />
              </span>
              <span className="territorios-recorte-rodape">
                <span className="territorios-recorte-nome">{type.unitLabel}</span>
                <img src={UI_ICONS.forward} alt="" width={24} height={24} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
