'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** A capture that never settles must not stall every section behind it. */
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

  // `isReady` closes over the analyses map and changes identity on every
  // arrival, which would make a dependency on it re-run the timeout effect
  // constantly. The ref keeps the latest without being a dependency.
  const isReadyRef = useRef(isReady)
  useEffect(() => { isReadyRef.current = isReady }, [isReady])

  const activeKey = useMemo(
    () => layerIds.find((id) => isReady(id) && !finished.has(id)) ?? null,
    [layerIds, isReady, finished],
  )

  const onCaptured = useCallback((layerId: string) => {
    setFinished((prev) => (prev.has(layerId) ? prev : new Set(prev).add(layerId)))
  }, [])

  // A map that never reaches `idle` — a tile route failure, a WebGL context
  // lost — would hold the queue forever. The timeout releases the slot and the
  // section keeps its placeholder.
  useEffect(() => {
    if (!activeKey) return
    const timer = setTimeout(() => onCaptured(activeKey), CAPTURE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [activeKey, onCaptured])

  return { activeKey, onCaptured }
}
