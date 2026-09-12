'use client'

import { useCallback, useMemo, useState } from 'react'

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
    setFinished((prev) => new Set(prev).add(layerId))
  }, [])

  return { activeKey, onCaptured }
}
