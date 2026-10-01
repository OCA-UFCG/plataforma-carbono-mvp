'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { STEP_COLORS } from '@/config/territorios/palette'
import { STEPS } from '@/config/territorios/story'
import type { StepId } from '@/types/territorios'

export interface StepRailProps {
  current: StepId
  onSelect: (step: StepId) => void
  /** Set while a modal (the phone's map sheet) covers the page. */
  inert?: boolean
}

/** The six steps "3 de 6" counts; the summary is named, not numbered. */
const COUNTED_STEPS: StepId[] = STEPS.filter((step) => step !== 'resumo')

/** The summary shares the territory step's color, as it does its card borders. */
function stepColor(step: StepId): string {
  return step === 'resumo' ? STEP_COLORS.territorio : STEP_COLORS[step]
}

// On a computer the steps sit in a row; on a phone (territorios.css, up to
// 767 px) the row folds into a 40 px bar naming the current step, whose button
// drops the same list down.
export default function StepRail({ current, onSelect, inert = false }: StepRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLOListElement | null>(null)
  const toggleRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const listId = useId()
  const t = useTranslations('TerritoriosRail')
  const ui = useTranslations('TerritoriosUi')
  const steps = useTranslations('TerritoriosTypes')

  // Between the phone bar and a wide screen the row can overflow and scroll
  // sideways, with the later steps out of view. Not scrollIntoView, which
  // would also scroll the page.
  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector('[aria-current="step"]')
    if (!list || !item || list.scrollWidth <= list.clientWidth) return
    const listBox = list.getBoundingClientRect()
    const itemBox = item.getBoundingClientRect()
    if (itemBox.left < listBox.left || itemBox.right > listBox.right) {
      list.scrollLeft += itemBox.left - listBox.left
    }
  }, [current])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!railRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const position = COUNTED_STEPS.indexOf(current)

  return (
    <div ref={railRef} className="territorios-trilha territorios-no-print" data-aberta={open || undefined} inert={inert}>
      {/* Another root layout: a full page load, not next/link. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="territorios-trilha-logo" aria-label={t('homeLabel')}>
        <Image src="/logos/logo_oca.png" alt="" width={28} height={28} />
      </a>
      <nav className="territorios-trilha-nav" aria-label={ui('stepsLabel')}>
        <button
          ref={toggleRef}
          type="button"
          className="territorios-trilha-alternar"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
        >
          {position >= 0 && (
            <span className="territorios-trilha-posicao">{t('position', { n: position + 1, total: COUNTED_STEPS.length })}</span>
          )}
          <span className="territorios-trilha-atual">{steps(`steps.${current}`)}</span>
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <ol id={listId} ref={listRef} className="territorios-trilha-lista">
          {STEPS.map((step) => (
            <li key={step}>
              <button
                type="button"
                className="territorios-etapa"
                style={{ '--etapa-cor': stepColor(step) } as React.CSSProperties}
                aria-current={step === current ? 'step' : undefined}
                onClick={() => {
                  setOpen(false)
                  onSelect(step)
                }}
              >
                {steps(`steps.${step}`)}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
