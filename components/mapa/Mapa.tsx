'use client'

import { useEffect, useState } from 'react'
import { IcList, IcBarChart } from './icons'
import MapView from './MapView'
import Sidebar from './Sidebar'
import ResultsSidebar from './ResultsSidebar'
import LayerInfoCard, { FICHA_WIDTH } from './LayerInfoCard'
import ReportForm from './overlays/ReportForm'
import Header from './Header'
import Welcome from './Welcome'
import { useStore, camadasARestaurar } from '@/lib/mapa/store'
import { buildTheme } from '@/config/mapa/platforms'
import { resolveMonth } from '@/lib/phenology'
import type { PlatformTheme } from '@/types/mapa'

export default function Mapa() {
  const darkMode    = useStore((s) => s.darkMode)
  const monthPref   = useStore((s) => s.month)
  const welcomeSeen = useStore((s) => s.welcomeSeen)

  // Effective month -> accent; darkMode -> neutrals.
  const month = resolveMonth(monthPref)
  const theme = buildTheme(month, darkMode)

  // Temas panel: open on wide screens, collapsed below 1180px (floating button).
  const [panelOpen, setPanelOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1180
  })

  // The report form overlay, opened by the trigger near the panel toggle.
  const [reportOpen, setReportOpen] = useState(false)

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

  // Turns back on the GEE rasters that were on in the previous session. They come
  // back from localStorage off on purpose: the tile is only fetched by
  // `activateDynamicLayer`, which also lights the layer up when it finishes.
  // Restoring them already visible would leave them lit in the panel and absent from the map.
  useEffect(() => {
    if (camadasARestaurar.length === 0) return
    const { layers: atuais, activateDynamicLayer } = useStore.getState()
    for (const id of camadasARestaurar) {
      const camada = atuais.find((l) => l.id === id)
      if (camada?.type === 'raster') void activateDynamicLayer(camada)
    }
  }, [])

  const resultsOpen = resultsVisible && !resultsCollapsed

  // Open ficha. It lives here, not in Sidebar, because only this component can
  // widen `leftEdge` to reserve the column the ficha occupies.
  const [infoId, setInfoId] = useState<string | null>(null)
  const toggleInfo = (id: string) => setInfoId((current) => (current === id ? null : id))

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
  //
  // Everything the map floats -- the Relatorio button, the draw toolbar, the
  // search bar, the temporal slider -- is laid out inside [leftEdge,
  // 100% - rightOffset]. Reserving space here is what keeps them from
  // overlapping, so a panel that takes room must be added to an anchor rather
  // than be given a higher z-index.
  const panelEdge   = panelOpen ? 360 : 64
  const fichaOpen   = !narrow && panelOpen && infoId !== null
  const leftEdge    = panelEdge + (fichaOpen ? FICHA_WIDTH + 12 : 0)
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
        // The accent vars come from here, and not from [data-month] blocks in the
        // CSS: there are twelve months in two modes, and the set already comes
        // computed in the theme. Whoever reads var(--acc) (the sliders'
        // accent-color, for example) follows along.
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
          <Sidebar
            theme={theme}
            infoId={infoId}
            onInfo={toggleInfo}
            onCollapse={() => { setPanelOpen(false); setInfoId(null) }}
          />
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

        {infoId && panelOpen && (
          <LayerInfoCard
            theme={theme}
            layerId={infoId}
            narrow={narrow}
            leftEdge={panelEdge}
            onClose={() => setInfoId(null)}
          />
        )}

        {/* Report trigger: sits next to the panel toggle and shifts with it. */}
        <button
          className="ui-press"
          onClick={() => setReportOpen(true)}
          title="Gerar relatório territorial"
          aria-label="Gerar relatório territorial"
          style={{
            position: 'absolute',
            top: 16,
            left: leftEdge + 12,
            zIndex: 12,
            height: 40,
            padding: '0 14px',
            borderRadius: 11,
            background: theme.colors.glassBg,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${theme.colors.glassBd}`,
            boxShadow: 'var(--sh-ctrl)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            color: theme.colors.text,
            transition: 'left .3s',
          }}
        >
          <IcBarChart size={15} />
          Relatório
        </button>

        <ResultsSidebar theme={theme} collapsed={resultsCollapsed} onSetCollapsed={setResultsCollapsed} />

        <ReportForm theme={theme} open={reportOpen} onClose={() => setReportOpen(false)} />
      </div>

      {!welcomeSeen && <Welcome theme={theme} month={month} />}
    </div>
  )
}

export type { PlatformTheme }
