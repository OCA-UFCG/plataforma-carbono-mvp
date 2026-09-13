'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * A capture that never settles must not stall every section behind it.
 *
 * This is a backstop, not the primary defense: `ReportMapPreview` owns a
 * shorter (20s) timeout of its own, which can still show the "indisponível"
 * placeholder and calls `onCapture` through the normal path. This longer
 * timeout only matters when there is no component to ask — the section's
 * `ReportMapPreview` never mounted, or unmounted without ever reporting — so
 * there is no placeholder to show here, only the queue slot to release.
 */
const CAPTURE_TIMEOUT_MS = 25_000

/**
 * Serializes the map captures: at most one MapLibre instance is mounted at a
 * time, in the document's own section order.
 *
 * A browser caps the live WebGL contexts a page may hold, and six maps
 * rendering at once makes some of them capture a blank canvas. Waiting for one
 * to finish before mounting the next costs wall-clock and buys images that are
 * actually there.
 */
export function useReportMapCaptureQueue(
  layerIds: string[],
  isReady: (layerId: string) => boolean,
) {
  const [finished, setFinished] = useState<Set<string>>(new Set())

  const activeKey = useMemo(
    () => layerIds.find((id) => isReady(id) && !finished.has(id)) ?? null,
    [layerIds, isReady, finished],
  )

  const onCaptured = useCallback((layerId: string) => {
    setFinished((prev) => (prev.has(layerId) ? prev : new Set(prev).add(layerId)))
  }, [])

  // Backstop only: releases the slot for a section whose `ReportMapPreview`
  // never mounted or unmounted without reporting. The ordinary stuck-map case
  // is caught first by the component's own shorter timeout, which can still
  // show the placeholder; this one cannot, because there is no component left
  // to show it.
  useEffect(() => {
    if (!activeKey) return
    const timer = setTimeout(() => onCaptured(activeKey), CAPTURE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [activeKey, onCaptured])

  return { activeKey, onCaptured }
}
