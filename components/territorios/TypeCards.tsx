'use client'

/* eslint-disable @next/next/no-img-element -- the panel art is swapped for an empty fill when it fails to load, which next/image does not report */
import { useEffect, useRef, useState } from 'react'
import '@/app/territorios-galeria.css'
import { INTRO } from '@/config/territorios/chooserScript'
import { TERRITORY_TYPES, type TerritoryType } from '@/config/territorios/story'

export interface TypeCardsProps {
  onSelect: (type: TerritoryType) => void
}

function PanelArt({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      className="territorios-painel-arte"
      src={src}
      alt=""
      // The page is server-rendered, so a missing image can fail before
      // hydration attaches onError; a finished load with no pixels is that
      // same failure.
      ref={(el) => { if (el?.complete && el.naturalWidth === 0) setFailed(true) }}
      onError={() => setFailed(true)}
    />
  )
}

/** Every type as a panel; one is open at a time, with its line and the way in. */
export default function TypeCards({ onSelect }: TypeCardsProps) {
  const [openId, setOpenId] = useState(TERRITORY_TYPES[0].id)
  const openedByVisitor = useRef(false)
  const titleRef = useRef<HTMLHeadingElement | null>(null)

  // The tab the visitor pressed unmounts as its panel opens; focus goes to the
  // open panel's title instead of falling back to the page.
  useEffect(() => {
    if (openedByVisitor.current) titleRef.current?.focus({ preventScroll: true })
  }, [openId])

  return (
    <ul className="territorios-galeria">
      {TERRITORY_TYPES.map((type) => {
        const open = type.id === openId
        return (
          <li key={type.id} className="territorios-painel" data-aberto={open || undefined}>
            <PanelArt src={type.image} />
            {open ? (
              <div className="territorios-painel-conteudo">
                <h3 ref={titleRef} tabIndex={-1} className="territorios-painel-titulo">{type.unitLabel}</h3>
                <p className="territorios-painel-texto">{INTRO.descriptions[type.id]}</p>
                {type.enabled ? (
                  <button type="button" className="territorios-painel-botao" onClick={() => onSelect(type)}>
                    {INTRO.explore}
                  </button>
                ) : (
                  <p className="territorios-painel-embreve">{INTRO.soonBadge}</p>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="territorios-painel-aba"
                aria-expanded={false}
                onClick={() => { openedByVisitor.current = true; setOpenId(type.id) }}
              >
                <span className="territorios-painel-rotulo">{type.unitLabel}</span>
                {!type.enabled && <span className="territorios-painel-rotulo-embreve">{INTRO.soonBadge}</span>}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
