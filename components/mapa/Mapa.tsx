'use client'

import { useEffect, useRef, useState } from 'react'
import { IcSearch } from './icons'
import MapView from './MapView'
import Sidebar from './Sidebar'
import ResultsSidebar from './ResultsSidebar'
import LayerInfoCard from './LayerInfoCard'
import SiteHeader from '@/components/marketing/SiteHeader'
import { useStore, camadasARestaurar, hasAnalysisContent } from '@/lib/mapa/store'
import { buildSiteTheme } from '@/config/mapa/platforms'
import { MAP_INSET } from '@/lib/mapa/layout'
import { isMeasuredRaster } from '@/lib/mapa/analysisTargets'
import type { PlatformTheme } from '@/types/mapa'

// The site's fixed palette, light only (Figma section "Plataforma",
// 19437:60649): one theme for every visit, so it is built once.
const theme = buildSiteTheme()

export default function Mapa() {
  // Layer panel: open on wide screens, collapsed below 1180px.
  const [panelOpen, setPanelOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1180
  })

  // Results panel visibility.
  // Same condition ResultsSidebar renders on: any measurement/stat content OR
  // an active raster (which shows the onboarding hint).
  const drawnArea   = useStore((s) => s.drawnArea)
  const drawnLength = useStore((s) => s.drawnLength)
  const results     = useStore((s) => s.results)
  const layers      = useStore((s) => s.layers)

  // Same predicate ResultsSidebar renders on -- shared, because two copies of
  // it is what let the panel and the controls disagree about being open.
  const resultsHasContent = hasAnalysisContent({ drawnArea, drawnLength, results, layers })
  const activeRaster = layers.some(isMeasuredRaster)
  const resultsVisible = resultsHasContent || activeRaster

  const [resultsCollapsed, setResultsCollapsed] = useState(false)
  // When the panel goes away entirely, reset collapse so it reopens expanded.
  // Adjusted while rendering rather than in an effect, so the reopened panel
  // never paints collapsed first.
  const [wasResultsVisible, setWasResultsVisible] = useState(resultsVisible)
  if (resultsVisible !== wasResultsVisible) {
    setWasResultsVisible(resultsVisible)
    if (!resultsVisible) setResultsCollapsed(false)
  }

  // The results panel's X. Over a recorte selection it does what a click on
  // empty map does: the highlight, the spotlight and the results go, and the
  // panel is left with what that click leaves (the hint, or nothing). A
  // drawing, which only "Limpar" clears, and the hint have nothing to drop, so
  // there the X collapses the panel. MapView fills the ref: it holds the draw
  // instance, the only reliable answer to whether a drawing is on the map.
  const dismissSelectionRef = useRef<(() => boolean) | null>(null)
  // Snapshot of the map for the results panel's JPEG. MapView fills it: only
  // it holds the map instance.
  const captureMapRef = useRef<(() => Promise<string | null>) | null>(null)
  const closeResults = () => {
    if (!dismissSelectionRef.current?.()) setResultsCollapsed(true)
  }

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

  // A link from the site (the Glossário) can name a layer to open on arrival,
  // /mapa?camada=<id>. The parameter is dropped from the address right away,
  // so a reload keeps whatever the visitor did afterwards. A layer coming back
  // from the previous session is already being turned on above.
  useEffect(() => {
    const url = new URL(window.location.href)
    const id = url.searchParams.get('camada')
    if (!id) return
    url.searchParams.delete('camada')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    const { layers: atuais, toggleLayer } = useStore.getState()
    const camada = atuais.find((l) => l.id === id)
    if (!camada || camada.visible || camadasARestaurar.includes(id)) return
    toggleLayer(id)
  }, [])

  const resultsOpen = resultsVisible && !resultsCollapsed

  // Open ficha. It lives here, not in Sidebar, because it is a column of the
  // row below, between the panel and the map.
  const [infoId, setInfoId] = useState<string | null>(null)
  const toggleInfo = (id: string) => setInfoId((current) => (current === id ? null : id))

  const collapsePanel = () => { setPanelOpen(false); setInfoId(null) }

  // Below 768px the side columns turn into drawers over the map (Sidebar,
  // ResultsSidebar and LayerInfoCard each switch on their own).
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div
      data-cc-root
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        background: theme.colors.bg,
        // The accent vars come from the theme, not from CSS, so the JS theme
        // stays their single source. Whoever reads var(--acc) (the sliders'
        // accent-color, for example) follows along.
        ['--acc' as string]: theme.colors.accent,
        ['--accBg' as string]: theme.colors.accentBg,
        ['--accInk' as string]: theme.colors.accentInk,
        ['--accBd' as string]: theme.colors.accentBd,
        ['--accGrad' as string]: theme.colors.accentGrad,
      }}
    >
      <SiteHeader account />

      {/* The docked layout of Figma 19413:54279 and 19451:60959: the layer
          panel, the ficha when open, the map and the results, side by side
          under the header. A column that closes leaves the row, and the map
          takes its width. */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative' }}>
        {panelOpen && (
          <Sidebar
            theme={theme}
            infoId={infoId}
            onInfo={toggleInfo}
          />
        )}

        {infoId && panelOpen && (
          <LayerInfoCard
            // A new layer gets a new sheet, so a "Copiado" never carries over.
            key={infoId}
            layerId={infoId}
            narrow={narrow}
            onClose={() => setInfoId(null)}
          />
        )}

        {/* Clips its overlays at the column's edge: with the ficha open the
            map is 290px wide, and the legend would spill over the ficha. */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
          {/* The panels no longer cover the map, so the insets only keep the
              overlays clear of the map's own buttons below. */}
          <MapView
            theme={theme}
            leftEdge={MAP_INSET}
            rightOffset={MAP_INSET}
            dismissSelectionRef={dismissSelectionRef}
            captureMapRef={captureMapRef}
          />

          {/* "‹" on the panel's edge (Figma 19442:60752), 14px under the
              header; it turns into "›" to bring the panel back. */}
          <button
            className="mapa-edge-button ui-press"
            onClick={panelOpen ? collapsePanel : () => setPanelOpen(true)}
            aria-label={panelOpen ? 'Recolher painel de camadas' : 'Mostrar painel de camadas'}
            title={panelOpen ? 'Recolher painel de camadas' : 'Mostrar painel de camadas'}
            aria-expanded={panelOpen}
            aria-controls={panelOpen ? 'painel-camadas' : undefined}
            style={{ top: 14 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
            <img
              src="/icons/mapa/keyboard-arrow-left.svg"
              alt=""
              width={16}
              height={16}
              style={panelOpen ? undefined : { transform: 'scaleX(-1)' }}
            />
          </button>

          {/* Provisional: the old map header was the only way into the search,
              and the redesign moves it into the panel (issue #141). Until then
              it opens from here, under the "‹". */}
          <button
            className="mapa-edge-button ui-press"
            onClick={() => window.dispatchEvent(new CustomEvent('cc-open-search'))}
            aria-label="Buscar município, estado ou território"
            title="Buscar município, estado ou território"
            style={{ top: 62 }}
          >
            <IcSearch size={16} />
          </button>

          {/* "Resultado" (Figma 19423:58080), 26px under the header, shows
              and hides the results column; it is there whenever the column
              has something to show. */}
          {resultsVisible && (
            <button
              className="mapa-result-button text-ui-medium ui-press"
              onClick={() => setResultsCollapsed((collapsed) => !collapsed)}
              aria-expanded={resultsOpen}
              aria-controls={resultsOpen ? 'painel-resultados' : undefined}
              style={{ top: 26, right: MAP_INSET }}
            >
              Resultado
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
              <img src="/icons/mapa/insert-chart.svg" alt="" width={16} height={16} />
            </button>
          )}
        </div>

        <ResultsSidebar
          theme={theme}
          collapsed={resultsCollapsed}
          onClose={closeResults}
          captureMap={() => captureMapRef.current?.() ?? Promise.resolve(null)}
        />
      </div>
    </div>
  )
}

export type { PlatformTheme }
