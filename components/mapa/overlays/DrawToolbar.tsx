'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useStore } from '@/lib/mapa/store'
import CoordinateForm from './CoordinateForm'
import { centeredInGutters } from '@/lib/mapa/gutters'
import type { PlatformTheme, DrawMode } from '@/types/mapa'

interface Props {
  theme: PlatformTheme
  /** left anchor (px), right edge of the Temas panel + 12. */
  leftEdge: number
  /** Right anchor, for centering the hint toast in the free strip. */
  rightOffset: number
  open: boolean
  onClose: () => void
  /** Installs a geometry typed as coordinates. See MapView. */
  onApplyCoordinates: (feature: GeoJSON.Feature) => void
}

// Labels and hints live in MapaOvDrawToolbar under the mode's own name. The
// English "Polygon", "Point" and "Coordinates" are the words `MapaAnalysis.hint`
// uses to point the user at these tools, so they must stay in step.
const TOOLS: Exclude<DrawMode, null>[] = ['polygon', 'rectangle', 'linestring', 'point']

/**
 * Horizontal drawing toolbar (glass pill), anchored to the edge of the Temas
 * panel (`left = leftEdge + 12`) on the second row of the left cluster, under
 * the Relatório button. It starts closed; the pencil in the control cluster
 * shows and hides it. Tools as text (Polygon/Rectangle/Line/Point)
 * + Coordinates + Clear.
 *
 * Coordinates opens a form under the pill, for defining the same geometries by
 * typing them instead of drawing. The pill and the form share a flex column,
 * so the form follows the pill down when the tools wrap onto a second line.
 */
export default function DrawToolbar({
  theme, leftEdge, rightOffset, open, onClose, onApplyCoordinates,
}: Props) {
  const drawMode      = useStore((s) => s.drawMode)
  const setDrawMode   = useStore((s) => s.setDrawMode)
  const clearDrawings = useStore((s) => s.clearDrawings)
  const c = theme.colors
  const t = useTranslations('MapaOvDrawToolbar')

  const [coordsOpen, setCoordsOpen] = useState(false)

  // Esc escalates: it closes the coordinate form first, then cancels the armed
  // tool, and only closes the toolbar when neither is up. Doing all three at
  // once would cost the user the toolbar every time they gave up on a polygon.
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (coordsOpen) setCoordsOpen(false)
      else if (drawMode) setDrawMode(null)
      else onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, coordsOpen, drawMode, setDrawMode, onClose])

  if (!open) return null

  const toggleCoords = () => {
    setCoordsOpen((v) => {
      // An armed tool would draw on the same click that aims at the map while
      // the form is open, so opening the form disarms it.
      if (!v) setDrawMode(null)
      return !v
    })
  }

  return (
    <>
      <div
        style={{
          // Second row: the Relatório button holds `top: 16` at this same
          // `left`, so sharing a row would hide it under the toolbar.
          position: 'absolute', top: 62, left: leftEdge + 12, zIndex: 15,
          maxWidth: `calc(100% - ${leftEdge + rightOffset + 24}px)`,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
          fontFamily: 'var(--font-app), sans-serif', transition: 'left .3s',
        }}
      >
        <div
          style={{
            maxWidth: '100%',
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, padding: 4,
            background: c.glassBg, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${c.glassBd}`, borderRadius: 22, boxShadow: '0 8px 24px -8px rgba(30,28,18,.4)',
          }}
        >
          {TOOLS.map((mode) => {
            const active = drawMode === mode
            return (
              <button
                key={mode}
                onClick={() => setDrawMode(active ? null : mode)}
                aria-pressed={active}
                style={{
                  height: 34, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: active ? c.accent : 'transparent', color: active ? c.onAccent : c.body,
                  fontSize: 14, fontWeight: 700, fontFamily: 'inherit', transition: 'background .2s',
                }}
              >
                {t(`tools.${mode}`)}
              </button>
            )
          })}
          <div style={{ width: 1, height: 22, background: c.border, margin: '0 3px' }} />
          <button
            onClick={toggleCoords}
            aria-pressed={coordsOpen}
            aria-expanded={coordsOpen}
            style={{
              height: 34, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: coordsOpen ? c.accent : 'transparent',
              color: coordsOpen ? c.onAccent : c.body,
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit', transition: 'background .2s',
            }}
          >
            {t('coordinates')}
          </button>
          <div style={{ width: 1, height: 22, background: c.border, margin: '0 3px' }} />
          <button
            onClick={() => { clearDrawings(); setDrawMode(null) }}
            style={{
              height: 34, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'transparent', color: c.terracota, fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            {t('clear')}
          </button>
        </div>

        {coordsOpen && <CoordinateForm theme={theme} onApply={onApplyCoordinates} />}
      </div>

      {/* Instruction toast while a tool is armed */}
      {drawMode && (
        <div
          style={{
            position: 'absolute', bottom: 52, ...centeredInGutters(leftEdge, rightOffset), zIndex: 15,
            background: 'rgba(38,36,29,.92)', color: '#e8e6da', fontSize: 13.5, fontWeight: 600,
            padding: '8px 16px', borderRadius: 999, whiteSpace: 'nowrap',
            fontFamily: 'var(--font-app), sans-serif',
          }}
        >
          {t(`hints.${drawMode}`)}. <span style={{ fontWeight: 800, color: '#f5f4ec' }}>Esc</span> {t('cancel')}
        </div>
      )}
    </>
  )
}
