'use client'

import { useEffect, useId, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useStoryFmt } from './useStoryFmt'
import { confirmDetailText } from '@/config/territorios/chooserScript'
import { TERRITORY_SCRIPT } from '@/config/territorios/storyScript'
import { ellipsoidAreaHa } from '@/lib/territorios/ellipsoidArea'
import type { FeatureEntry } from '@/lib/territorios/featureIds'
import { formatArea } from '@/lib/territorios/storyValues'

export interface ConfirmCardProps {
  entry:     FeatureEntry
  unitLabel: string
  /** The state's abbreviation, when the name alone does not carry it. */
  context?:  string
  onConfirm: () => void
  onCancel:  () => void
}

// A card in the chooser's column on a computer, a sheet rising from the bottom
// edge on a phone (territorios-escolha.css); the markup is the same.
export default function ConfirmCard({ entry, unitLabel, context, onConfirm, onCancel }: ConfirmCardProps) {
  const t = useTranslations('TerritoriosChooser')
  const fmt = useStoryFmt()
  const sectionRef = useRef<HTMLElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const headingId = useId()
  const nameId = useId()
  const detailId = useId()

  // Measured from the geometry the chooser already holds, the same polygon and
  // the same measure as the story's (themeService.ts), so the card needs no
  // request of its own.
  const areaHa = useMemo(() => ellipsoidAreaHa(entry.geometry), [entry])

  // Every path lands here, and a tap on the map leaves no focus a screen
  // reader would follow to the card. The scroll is separate so the whole card
  // shows, not just its heading at the top edge; the sheet is fixed and needs
  // none. The heading is described by the name and the area because a live
  // region's first content, rendered with the card, is not announced.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    const section = sectionRef.current
    if (!section || getComputedStyle(section).position === 'fixed') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    section.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
  }, [entry])

  return (
    <section ref={sectionRef} className="territorios-escolha-cartao" aria-labelledby={headingId}>
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="territorios-escolha-cartao-titulo"
        aria-describedby={`${nameId} ${detailId}`}
      >
        {t('confirmTitle')}
      </h2>
      <div aria-live="polite">
        <p id={nameId} className="territorios-escolha-cartao-nome">{TERRITORY_SCRIPT.title(entry.name)}</p>
        <p id={detailId} className="territorios-escolha-cartao-detalhe">
          {confirmDetailText(unitLabel, context, formatArea(areaHa, fmt), (key, values) => t(key, values))}
        </p>
      </div>
      <div className="territorios-escolha-cartao-acoes">
        <button type="button" className="territorios-btn territorios-btn--primario" onClick={onConfirm}>
          {t('confirm')}
        </button>
        <button type="button" className="territorios-btn territorios-btn--contorno" onClick={onCancel}>
          {t('chooseAnother')}
        </button>
      </div>
    </section>
  )
}
