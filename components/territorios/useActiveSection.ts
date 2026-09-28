'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { pickActiveIndex, triggerLineY } from '@/lib/territorios/activeSection'
import type { StepId } from '@/types/territorios'

/**
 * How long the active section has to hold before the map and the theme
 * requests follow it, so scrolling past a section costs no Earth Engine call.
 */
const SETTLE_MS = 350

/** Longest wait for an animation frame before measuring without one. */
const FRAME_FALLBACK_MS = 100

/** End of a programmatic scroll where the scrollend event never comes (Safari, or no movement). */
const SCROLL_END_FALLBACK_MS = 1000

export interface ActiveSectionOptions {
  steps:   readonly StepId[]
  initial: StepId
  /** Holds the sections, each marked with data-step. */
  bodyRef: RefObject<HTMLElement | null>
  /** The sticky map column. */
  mapRef:  RefObject<HTMLElement | null>
  /** False while the sections are not rendered. */
  enabled: boolean
}

export interface ActiveSection {
  /** The section under the trigger line, or the target of a programmatic scroll. */
  active:  StepId
  /** `active` once it has held for SETTLE_MS. */
  settled: StepId
  /** Scrolls to a section, makes it active at once and focuses its heading. */
  scrollToStep: (step: StepId, behavior?: 'smooth' | 'instant') => void
  /** Sets both steps without scrolling, for a new territory. */
  resetTo: (step: StepId) => void
}

interface ProgrammaticScroll {
  end: () => void
  /** Scrolls again to where the target section now is. */
  aim: () => void
}

export function useActiveSection({ steps, initial, bodyRef, mapRef, enabled }: ActiveSectionOptions): ActiveSection {
  const [active, setActiveState] = useState<StepId>(initial)
  const [settled, setSettled] = useState<StepId>(initial)
  /** `active` as last set, for the resize callback, which can run before React renders it. */
  const activeRef = useRef<StepId>(initial)
  /** The programmatic scroll in progress; measurements wait while it is set. */
  const scrollRef = useRef<ProgrammaticScroll | null>(null)

  const setActive = useCallback((step: StepId) => {
    activeRef.current = step
    setActiveState(step)
  }, [])

  const sectionOf = useCallback(
    (step: StepId) => bodyRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`) ?? null,
    [bodyRef],
  )

  // The same direct measurement as components/Sazonalidade.tsx, not an
  // IntersectionObserver, for the reason given there.
  const measure = useCallback(() => {
    if (scrollRef.current) return
    const sections = steps.map(sectionOf)
    const first = sections[0]
    if (!first) return

    const firstBox = first.getBoundingClientRect()
    const mapBox = mapRef.current?.getBoundingClientRect()
    // On a phone the sticky map sits above the text and hides the top of the
    // viewport; on a desktop it sits beside the text and hides none of it.
    const mapAbove = mapBox !== undefined && mapBox.left < firstBox.right && firstBox.left < mapBox.right
    const trigger = triggerLineY(window.innerHeight, mapAbove ? mapBox.bottom : 0)
    const tops = sections.map((el) => el?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY)
    setActive(steps[pickActiveIndex(tops, trigger)])
  }, [steps, sectionOf, mapRef, setActive])

  useEffect(() => {
    const body = bodyRef.current
    if (!enabled || !body) return

    let frame = 0
    let fallback: ReturnType<typeof setTimeout> | undefined
    const run = () => {
      cancelAnimationFrame(frame)
      clearTimeout(fallback)
      fallback = undefined
      measure()
    }
    const schedule = () => {
      if (fallback !== undefined) return
      frame = requestAnimationFrame(run)
      // A window that draws no frames never runs the callback, the same freeze
      // Sazonalidade.tsx describes; the timer measures anyway.
      fallback = setTimeout(run, FRAME_FALLBACK_MS)
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })

    // Charts and theme answers change the sections' heights without a scroll.
    // Growth above the active section would push it down, and Safari before 27
    // has no scroll anchoring to hold it: the trigger line would land on an
    // earlier step, and the map and the address would follow. The page holds
    // it itself; territorios.css turns native anchoring off so Chrome and
    // Firefox do not compensate twice.
    const heights = new Map<Element, number>()
    const observer = new ResizeObserver((entries) => {
      const anchor = steps.indexOf(activeRef.current)
      let shift = 0
      for (const entry of entries) {
        const height = entry.contentRect.height
        const previous = heights.get(entry.target)
        heights.set(entry.target, height)
        const index = steps.indexOf((entry.target as HTMLElement).dataset.step as StepId)
        if (previous !== undefined && index !== -1 && index < anchor) shift += height - previous
      }
      if (shift !== 0) {
        // A scrollBy would cut a smooth scroll short.
        if (scrollRef.current) scrollRef.current.aim()
        else window.scrollBy({ top: shift, behavior: 'instant' })
      }
      schedule()
    })
    for (const step of steps) {
      const section = sectionOf(step)
      if (section) observer.observe(section)
    }

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(fallback)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
      scrollRef.current?.end()
    }
  }, [enabled, bodyRef, measure, steps, sectionOf])

  useEffect(() => {
    if (active === settled) return
    const timer = setTimeout(() => setSettled(active), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [active, settled])

  const scrollToStep = useCallback((step: StepId, behavior: 'smooth' | 'instant' = 'smooth') => {
    const section = sectionOf(step)
    if (!section) return

    scrollRef.current?.end()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scroll: ProgrammaticScroll = {
      end: () => {
        window.removeEventListener('scrollend', finish)
        clearTimeout(timer)
        if (scrollRef.current === scroll) scrollRef.current = null
      },
      aim: () => section.scrollIntoView({ block: 'start', behavior: reduced ? 'instant' : behavior }),
    }
    // A smooth scroll passes over the sections in between; measuring resumes
    // only once it stops, so none of them becomes active on the way.
    const finish = () => {
      scroll.end()
      measure()
    }
    const timer = setTimeout(finish, SCROLL_END_FALLBACK_MS)
    scrollRef.current = scroll
    window.addEventListener('scrollend', finish)

    setActive(step)
    scroll.aim()
    section.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
  }, [sectionOf, measure, setActive])

  const resetTo = useCallback((step: StepId) => {
    scrollRef.current?.end()
    setActive(step)
    setSettled(step)
  }, [setActive])

  return { active, settled, scrollToStep, resetTo }
}
