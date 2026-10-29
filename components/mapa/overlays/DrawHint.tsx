'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/mapa/store'
import { centeredInGutters, gutterMaxWidth } from '@/lib/mapa/gutters'
import { RESULT_BUTTON_SPAN } from '@/lib/mapa/layout'

const HINT = {
  polygon: 'Clique no mapa para desenhar o polígono',
  point:   'Clique no mapa para marcar o ponto',
}

/**
 * While "Delimitar recorte" or "Marcar ponto" (the panel's Território
 * section) is armed: what to do on the map, and Esc to cancel from anywhere.
 * mapbox-gl-draw only hears Esc while the map has the focus, and after a
 * press on the panel's button it does not. At the top of the map, level with
 * the "Resultado" button and clear of it: the legend holds the bottom right.
 */
export default function DrawHint({ leftEdge, rightOffset }: { leftEdge: number; rightOffset: number }) {
  const drawMode    = useStore((s) => s.drawMode)
  const setDrawMode = useStore((s) => s.setDrawMode)

  useEffect(() => {
    if (!drawMode) return
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawMode(null)
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [drawMode, setDrawMode])

  if (!drawMode) return null
  return (
    <div
      role="status"
      style={{
        position: 'absolute', top: 29, zIndex: 15,
        ...centeredInGutters(leftEdge, rightOffset + RESULT_BUTTON_SPAN),
        width: 'max-content', maxWidth: gutterMaxWidth(leftEdge, rightOffset + RESULT_BUTTON_SPAN, 0),
        background: 'rgba(38,36,29,.92)', color: '#e8e6da', fontSize: 13.5, fontWeight: 600,
        padding: '8px 16px', borderRadius: 17, textAlign: 'center',
        fontFamily: 'var(--font-app), sans-serif',
      }}
    >
      {HINT[drawMode]}. <span style={{ fontWeight: 800, color: '#f5f4ec' }}>Esc</span> cancela
    </div>
  )
}
