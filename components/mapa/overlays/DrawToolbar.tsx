'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/mapa/store'
import type { PlatformTheme, DrawMode } from '@/types/mapa'

interface Props {
  theme: PlatformTheme
  /** left anchor (px), right edge of the Temas panel + 12. */
  leftEdge: number
  open: boolean
  onClose: () => void
}

const TOOLS: { mode: Exclude<DrawMode, null>; name: string }[] = [
  { mode: 'polygon',    name: 'Polígono'  },
  { mode: 'rectangle',  name: 'Retângulo' },
  { mode: 'linestring', name: 'Linha'     },
  { mode: 'point',      name: 'Ponto'     },
]

const HINT: Record<string, string> = {
  polygon:    'Clique no mapa para desenhar o polígono',
  rectangle:  'Arraste no mapa para desenhar o retângulo',
  linestring: 'Clique no mapa para desenhar a linha',
  point:      'Clique no mapa para marcar o ponto',
}

/**
 * Horizontal drawing toolbar (glass pill), anchored to the edge of the Temas
 * panel (`left = leftEdge + 12`) on the second row of the left cluster, under
 * the Relatório button. It opens with the map; the pencil in the control
 * cluster hides and shows it. Tools as text (Polígono/Retângulo/Linha/Ponto)
 * + Limpar.
 */
export default function DrawToolbar({ theme, leftEdge, open, onClose }: Props) {
  const drawMode      = useStore((s) => s.drawMode)
  const setDrawMode   = useStore((s) => s.setDrawMode)
  const clearDrawings = useStore((s) => s.clearDrawings)
  const c = theme.colors

  // Esc escalates: it cancels the armed tool first, and only closes the toolbar
  // when no tool is armed. Doing both at once would cost the user the toolbar
  // every time they gave up on a polygon, and the toolbar now opens with the map.
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (drawMode) setDrawMode(null)
      else onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, drawMode, setDrawMode, onClose])

  if (!open) return null

  return (
    <>
      <div
        style={{
          // Second row: the Relatório button holds `top: 16` at this same
          // `left`, so sharing a row would hide it under the toolbar.
          position: 'absolute', top: 62, left: leftEdge + 12, zIndex: 15,
          maxWidth: `calc(100vw - ${leftEdge + 24}px)`,
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, padding: 4,
          background: c.glassBg, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${c.glassBd}`, borderRadius: 22, boxShadow: '0 8px 24px -8px rgba(30,28,18,.4)',
          fontFamily: 'var(--font-app), sans-serif', transition: 'left .3s',
        }}
      >
        {TOOLS.map((t) => {
          const active = drawMode === t.mode
          return (
            <button
              key={t.mode}
              onClick={() => setDrawMode(active ? null : t.mode)}
              aria-pressed={active}
              style={{
                height: 34, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: active ? c.accent : 'transparent', color: active ? c.onAccent : c.body,
                fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', transition: 'background .2s',
              }}
            >
              {t.name}
            </button>
          )
        })}
        <div style={{ width: 1, height: 22, background: c.border, margin: '0 3px' }} />
        <button
          onClick={() => { clearDrawings(); setDrawMode(null) }}
          style={{
            height: 34, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'transparent', color: c.terracota, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
          }}
        >
          Limpar
        </button>
      </div>

      {/* Toast de instrução quando uma ferramenta está ativa */}
      {drawMode && HINT[drawMode] && (
        <div
          style={{
            position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)', zIndex: 15,
            background: 'rgba(38,36,29,.92)', color: '#e8e6da', fontSize: 12, fontWeight: 600,
            padding: '8px 16px', borderRadius: 999, whiteSpace: 'nowrap',
            fontFamily: 'var(--font-app), sans-serif',
          }}
        >
          {HINT[drawMode]}. <span style={{ fontWeight: 800, color: '#f5f4ec' }}>Esc</span> cancela
        </div>
      )}
    </>
  )
}
