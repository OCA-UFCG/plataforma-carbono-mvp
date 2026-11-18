'use client'

import { useCallback, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { driver, type Driver } from 'driver.js'
import { TOUR_COPY, buildTourSteps, markPlatformTourSeen, shouldAutoStartTour } from './tourSteps'
import { clearDummyElementAria, focusReplayButton, renderPopover, revealTourTargets } from './tourDom'
import 'driver.js/dist/driver.css'
import './platformTour.css'

/** Lets the page settle before darkening the screen of someone who just arrived. */
const AUTO_START_DELAY_MS = 800
/** The theme accordion's arrow turns in 200 ms; the tour waits a little more. */
const LAYOUT_TRANSITION_MS = 350
/** A step whose target is not there yet waits this long before showing anyway. */
const WAIT_FOR_ELEMENT_MS = 3000

/**
 * The platform tour (driver.js, after SEDES's): opens by itself on a first
 * visit at desktop width, and the returned callback replays it.
 *
 * Before the first step it opens what the steps point into: the layer panel,
 * through `showPanel`, then Território and the first theme. It never touches
 * the map: no layer on, no recorte chosen.
 *
 * @example
 * const replayTour = usePlatformTour({ showPanel: () => setPanelOpen(true) })
 * <MapView onReplayTour={replayTour} />
 */
export function usePlatformTour({ showPanel }: { showPanel: () => void }): () => void {
  // In a ref, so the mount effect runs once whatever function the page passes.
  const showPanelRef = useRef(showPanel)
  useEffect(() => {
    showPanelRef.current = showPanel
  })

  const tourRef = useRef<Driver | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  const start = useCallback(() => {
    // One tour at a time: a press of "?" cancels a pending start and ends a
    // running tour before opening a new one.
    window.clearTimeout(timerRef.current)
    tourRef.current?.destroy()
    tourRef.current = null

    // The panel's content renders only while it is open, and driver.js and
    // revealTourTargets look for it in the DOM right away.
    flushSync(() => showPanelRef.current())
    const opened = revealTourTargets()

    timerRef.current = window.setTimeout(() => {
      // Marked on opening, not on finishing: someone who reloads mid-tour is
      // not surprised by it again, and the "?" is there.
      markPlatformTourSeen()

      const tour = driver({
        steps: buildTourSteps(),
        showProgress: true,
        progressText: TOUR_COPY.progress,
        nextBtnText: TOUR_COPY.next,
        prevBtnText: TOUR_COPY.previous,
        doneBtnText: TOUR_COPY.done,
        closeBtnLabel: TOUR_COPY.close,
        popoverClass: 'caativar-tour',
        onPopoverRender: renderPopover,
        onHighlighted: clearDummyElementAria,
        onDestroyed: focusReplayButton,
        // A stray click outside the balloon must not end the tour; "×" and
        // Esc do.
        overlayClickBehavior: 'none',
        // Turning a layer on mid-tour would start Earth Engine behind the
        // balloon.
        disableActiveInteraction: true,
        waitForElement: WAIT_FOR_ELEMENT_MS,
        // Darkens with the brand's deepest green, not black.
        overlayColor: '#374d15',
        overlayOpacity: 0.6,
        // Room around the highlight, and the balloon 16 px off it: the arrow
        // fits in the gap without touching either.
        stagePadding: 8,
        stageRadius: 12,
        popoverOffset: 16,
      })
      tourRef.current = tour
      tour.drive()
    }, opened ? LAYOUT_TRANSITION_MS : 0)
  }, [])

  useEffect(() => {
    if (!shouldAutoStartTour()) return
    timerRef.current = window.setTimeout(start, AUTO_START_DELAY_MS)
    return () => window.clearTimeout(timerRef.current)
  }, [start])

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current)
      tourRef.current?.destroy()
    },
    [],
  )

  return start
}
