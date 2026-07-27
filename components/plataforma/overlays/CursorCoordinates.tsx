'use client'

import { useEffect, useState, type RefObject } from 'react'
import type maplibregl from 'maplibre-gl'
import type { PlatformTheme } from '@/types/plataforma'

interface Props {
  mapRef: RefObject<maplibregl.Map | null>
  theme:  PlatformTheme
}

/**
 * Live lat/lon readout of the cursor position. Hidden when the mouse is
 * outside the map.
 */
export default function CursorCoordinates({ mapRef, theme }: Props) {
  const [coords, setCoords] = useState<[number, number] | null>(null)

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Throttle to one state update per animation frame, mouse moves fire
    // faster than 60Hz and each setCoords re-renders this overlay.
    let raf: number | null = null
    let last: [number, number] | null = null
    const onMove = (e: maplibregl.MapMouseEvent) => {
      last = [e.lngLat.lng, e.lngLat.lat]
      if (raf !== null) return
      raf = requestAnimationFrame(() => {
        raf = null
        if (last) setCoords(last)
      })
    }
    const onOut = () => {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null }
      setCoords(null)
    }

    map.on('mousemove', onMove)
    map.on('mouseout', onOut)

    return () => {
      if (raf !== null) cancelAnimationFrame(raf)
      map.off('mousemove', onMove)
      map.off('mouseout', onOut)
    }
  }, [mapRef])

  if (!coords) return null

  const [lon, lat] = coords
  const fmt = (n: number) => n.toFixed(5)

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        background: theme.colors.glassBg,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: theme.colors.text,
        border: `1px solid ${theme.colors.glassBd}`,
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 11,
        fontFamily: 'var(--font-app), sans-serif',
        fontVariantNumeric: 'tabular-nums',
        boxShadow: 'var(--sh-ctrl)',
        pointerEvents: 'none',
        zIndex: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {fmt(lat)}°, {fmt(lon)}°
    </div>
  )
}
