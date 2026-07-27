'use client'

import { useEffect, useState } from 'react'
import { IcList } from './icons'
import MapView from './MapView'
import Sidebar from './Sidebar'
import ResultsSidebar from './ResultsSidebar'
import Header from './Header'
import Welcome from './Welcome'
import { useStore } from '@/lib/plataforma/store'
import { buildTheme } from '@/config/plataforma/platforms'
import { resolveMonth } from '@/lib/phenology'
import type { PlatformTheme } from '@/types/plataforma'

export default function Plataforma() {
  const darkMode    = useStore((s) => s.darkMode)
  const monthPref   = useStore((s) => s.month)
  const welcomeSeen = useStore((s) => s.welcomeSeen)

  // Mes efetivo -> acento; darkMode -> neutros.
  const month = resolveMonth(monthPref)
  const theme = buildTheme(month, darkMode)

  // Temas panel: open on wide screens, collapsed below 1180px (floating button).
  const [panelOpen, setPanelOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1180
  })

  // Results panel visibility (drives the dynamic control/legend offset)
  // Same condition ResultsSidebar renders on: any measurement/stat content OR
  // an active raster (which shows the onboarding hint).
  const drawnArea    = useStore((s) => s.drawnArea)
  const drawnLength  = useStore((s) => s.drawnLength)
  const pixelValue   = useStore((s) => s.pixelValue)
  const rasterStats  = useStore((s) => s.rasterStats)
  const statsLoading = useStore((s) => s.statsLoading)
  const statsError   = useStore((s) => s.statsError)
  const layers       = useStore((s) => s.layers)

  const resultsHasContent =
    drawnArea !== null || drawnLength !== null || pixelValue !== null ||
    rasterStats !== null || statsLoading || statsError !== null
  const activeRaster = layers.some((l) => l.type === 'raster' && l.visible)
  const resultsVisible = resultsHasContent || activeRaster

  const [resultsCollapsed, setResultsCollapsed] = useState(false)
  // When the panel goes away entirely, reset collapse so it reopens expanded.
  useEffect(() => { if (!resultsVisible) setResultsCollapsed(false) }, [resultsVisible])

  const resultsOpen = resultsVisible && !resultsCollapsed

  // Below 768px the Results panel is a full-width overlay drawer (it doesn't
  // reserve horizontal space), so the map controls/legend must NOT shift to the
  // desktop 396px offset, that would push them off the left edge.
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Floating-layout anchors (handoff): panel edge on the left, Results-aware
  // offset on the right. On narrow screens the offset stays at 14 (drawer
  // overlays the map). When collapsed to a tab, clear its 28px width.
  const leftEdge    = panelOpen ? 360 : 64
  const rightOffset = narrow ? 14 : resultsOpen ? 396 : resultsVisible ? 42 : 14

  return (
    <div
      data-cc-root
      data-month={month.id}
      data-theme={darkMode ? 'dark' : undefined}
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        background: theme.colors.bg,
        transition: 'background .4s',
        // As vars do acento saem daqui, e nao de blocos [data-month] no CSS:
        // sao doze meses em dois modos, e o conjunto ja vem calculado no tema.
        // Quem le var(--acc) (accent-color dos sliders, por exemplo) acompanha.
        ['--acc' as string]: theme.colors.accent,
        ['--accBg' as string]: theme.colors.accentBg,
        ['--accInk' as string]: theme.colors.accentInk,
        ['--accBd' as string]: theme.colors.accentBd,
        ['--accGrad' as string]: theme.colors.accentGrad,
      }}
    >
      <Header theme={theme} month={month} />

      {/* Full-bleed map with floating panels over it (GFW style). */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapView theme={theme} leftEdge={leftEdge} rightOffset={rightOffset} />

        {panelOpen ? (
          <Sidebar theme={theme} onCollapse={() => setPanelOpen(false)} />
        ) : (
          <button
            className="ui-press"
            onClick={() => setPanelOpen(true)}
            title="Mostrar painel de temas"
            aria-label="Mostrar painel de temas"
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 12,
              width: 40,
              height: 40,
              borderRadius: 11,
              background: theme.colors.glassBg,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: `1px solid ${theme.colors.glassBd}`,
              boxShadow: 'var(--sh-ctrl)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.text,
            }}
          >
            <IcList size={17} />
          </button>
        )}

        <ResultsSidebar theme={theme} collapsed={resultsCollapsed} onSetCollapsed={setResultsCollapsed} />
      </div>

      {!welcomeSeen && <Welcome theme={theme} month={month} />}
    </div>
  )
}

export type { PlatformTheme }
