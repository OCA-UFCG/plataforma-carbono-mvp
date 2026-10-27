'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IcX, IcBarChart, IcDownload } from './icons'
import LayerResultCard from './LayerResultCard'
import type { default as AnalysisSheet, SheetLayer } from './AnalysisSheet'
import { useStore, hasAnalysisContent } from '@/lib/mapa/store'
import { analysisFilename, buildAnalysisCsv, type AnalysisSnapshot } from '@/lib/mapa/exportAnalysis'
import { analysisHint, clickableRecortes, isMeasuredRaster } from '@/lib/mapa/analysisTargets'
import { getResultProfile } from '@/config/mapa/resultProfiles'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { ContextLine, Empty, Pair, Stack } from './results/blocks'
import type { LayerConfig, LayerResult, PlatformTheme, RasterLayerConfig } from '@/types/mapa'

// pt-BR number formatting (comma decimal, dot thousands).
const nf    = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const nfInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

interface Props {
  theme: PlatformTheme
  /** Collapse state is lifted so plataforma can shift the map controls/legend. */
  collapsed: boolean
  onSetCollapsed: (v: boolean) => void
  /** The header's X; the owner decides whether it drops the selection or collapses the panel. */
  onClose: () => void
  /** Snapshot of the map between the panels, for the JPEG; null when unreadable. */
  captureMap: () => Promise<string | null>
}

/** Hands a blob to the browser as a download. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Floating results panel. Appears whenever there's a measurement to show
 * (drawn geometry, or a vector feature clicked over a raster), or when a
 * raster is active but nothing was analysed yet, in which case it shows an
 * onboarding hint.
 *
 * Anatomy: header with the cut, the feature name and its area; the length;
 * one collapsible result card per visible raster; the CSV and JPEG downloads. Below
 * 768px it becomes a bottom drawer so it never squeezes the map sideways.
 */
export default function ResultsSidebar({ theme, collapsed, onSetCollapsed, onClose, captureMap }: Props) {
  const drawnArea        = useStore((s) => s.drawnArea)
  const drawnLength      = useStore((s) => s.drawnLength)
  const results          = useStore((s) => s.results)
  const selectedGeometry = useStore((s) => s.selectedGeometry)
  const analysisLabel    = useStore((s) => s.analysisLabel)
  const analysisKind     = useStore((s) => s.analysisKind)
  const layers           = useStore((s) => s.layers)
  const temporalDate     = useStore((s) => s.temporalDate)
  const layerErrors      = useStore((s) => s.layerErrors)

  const c = theme.colors

  // One card per visible raster, in panel order (topmost first), whether or
  // not it has an answer yet: a layer still computing shows its skeleton.
  const rasters = layers.filter(isMeasuredRaster)
  const hasContent = hasAnalysisContent({ drawnArea, drawnLength, results, layers })

  // The topmost layer opens; the rest answer from their headers until asked for.
  // `null` means untouched, which is not the same as "all closed": an empty Set
  // has to stay empty, or collapsing the top card would spring it back open.
  const [expanded, setExpanded] = useState<Set<string> | null>(null)
  const topId = rasters[0]?.id
  const isExpanded = (id: string) => (expanded ? expanded.has(id) : id === topId)
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev ?? (topId ? [topId] : []))
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  /**
   * What a card may show for a layer, tied to the stop its header names.
   *
   * A result from another stop is never shown under this year's heading: the
   * card falls back to its skeleton, which is what the deleted reactive effect
   * guarded with "do not leave the previous year's result visible while the new
   * tile is loading". `LayerResultCard` treats "no result" and "loading" alike,
   * so an undefined result is exactly that skeleton.
   *
   * A tile that failed for this stop would otherwise leave that skeleton
   * spinning for good -- `layerErrors` is set, `loadingLayers` is cleared and
   * nothing re-triggers the analysis -- so it surfaces as the card's own error.
   *
   * A point on a temporal layer is the exception: its result is the whole
   * series, cached under the deliberately date-free `timeSeriesCacheKey`
   * because every year is already in hand. Pinning it to one stop would blank
   * the chart on each step of the slider and refetch what is already there.
   * Only a per-year number belongs to a single stop.
   */
  function cardResult(raster: RasterLayerConfig, stop: string | undefined): LayerResult | undefined {
    const current = results[raster.id]
    if (current && (current.stats?.kind === 'timeseries' || current.date === stop)) return current

    const tileError = layerErrors[raster.id]
    if (tileError) {
      return {
        layerId: raster.id, date: stop, status: 'error',
        stats: null, pixelValue: null, error: tileError,
      }
    }
    return undefined
  }

  // Onboarding hint when a raster is active but nothing was analysed yet. What
  // it tells the reader to do depends on the recortes a click can actually land
  // on: with every recorte off, clicking the map is a silent no-op, so the hint
  // asks for one to be turned on instead of promising a municipality.
  const activeRaster = rasters[0]
  const recortes = clickableRecortes(layers)

  // Download the analysis. The CSV is built entirely on the client by
  // `buildAnalysisCsv`, from what the panel already has at hand.
  // A layer still computing, or one that failed, is left out rather than
  // exported empty. It goes through `cardResult` so the export cannot do what
  // the card cannot either: write one stop's numbers under another stop's year.
  // No layer measured is not a reason to withhold the file: a drawn line and a
  // polygon with every raster off are measurements in their own right, and
  // `buildAnalysisCsv` writes their rows and names the file "analise".
  const measured = rasters.filter((r) => {
    const stop = r.gee?.temporal ? temporalDate[r.id] : undefined
    return cardResult(r, stop)?.status === 'ready'
  })
  const canDownload = hasContent

  const snapshot = (generatedAt: Date): AnalysisSnapshot => ({
      analysisKind,
      analysisLabel,
      drawnArea,
      drawnLength,
      generatedAt,
      layers: measured.map((raster) => ({
        layerName:    raster.name,
        layerUnit:    raster.unit,
        layerClasses: raster.classes,
        signedFlux:   raster.signedFlux,
        year:         temporalDate[raster.id]?.slice(0, 4),
        pixelValue:   results[raster.id]?.pixelValue ?? null,
        stats:        results[raster.id]?.stats ?? null,
        profile:      getResultProfile(raster.id),
        source:       LAYER_META[raster.id]?.source,
      })),
  })

  function handleDownload() {
    const { filename, csv } = buildAnalysisCsv(snapshot(new Date()))
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename)
  }

  // The JPEG: the map beside the panel, every measured card open. The same
  // layers as the CSV, so the two files of one analysis agree. The sheet is
  // mounted off screen only while the picture is taken, and the effect below
  // takes it once the sheet has committed.
  // The layers are read at render, not at the click: the map may spend a few
  // seconds on its tiles, and a card that finishes meanwhile belongs in it.
  const [sheet, setSheet] = useState<{
    Sheet: typeof AnalysisSheet; mapSrc: string | null; generatedAt: Date
    // What was on the map when the button was clicked, for the legend.
    legendLayers: LayerConfig[]; legendDates: Record<string, string>
  } | null>(null)
  const sheetLayers: SheetLayer[] = measured.map((raster) => {
    const date = raster.gee?.temporal ? temporalDate[raster.id] : undefined
    return { raster, date, result: cardResult(raster, date)! }
  })
  const [jpegFailed, setJpegFailed] = useState(false)
  // From the click to the download: the map's wait for its tiles comes before
  // the sheet exists, and the button must stay busy through it.
  const [exporting, setExporting] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  async function handleDownloadJpeg() {
    if (exporting) return
    setExporting(true)
    setJpegFailed(false)
    try {
      const [mapSrc, { default: Sheet }] = await Promise.all([
        captureMap(),
        // The sheet brings its charts already loaded: a lazy one renders
        // nothing on its first pass, and the capture would catch it empty.
        import('./AnalysisSheet'),
      ])
      // The reader dropped the selection while the map settled: the analysis
      // the file was asked for is gone, and so is the reason to make it.
      if (!hasAnalysisContent(useStore.getState())) {
        setExporting(false)
        return
      }
      const { layers: current, temporalDate: dates } = useStore.getState()
      setSheet({
        Sheet, mapSrc, generatedAt: new Date(),
        legendLayers: current.filter((l) => l.visible), legendDates: dates,
      })
    } catch (err) {
      console.error('JPEG export failed', err)
      setJpegFailed(true)
      setExporting(false)
    }
  }

  useEffect(() => {
    if (!sheet) return
    let cancelled = false
    void (async () => {
      try {
        const node = sheetRef.current
        if (!node) throw new Error('sheet not mounted')
        await document.fonts.ready
        await Promise.all([...node.querySelectorAll('img')].map((img) => img.decode().catch(() => {})))
        // Two frames: ResponsiveContainer measures its box and the charts draw
        // at that size before the DOM is cloned.
        await nextFrame()
        await nextFrame()
        const { toBlob } = await import('html-to-image')
        const blob = await toBlob(node, {
          type: 'image/jpeg', quality: 0.92, pixelRatio: 2, backgroundColor: c.bg,
        })
        if (cancelled) return
        if (!blob) throw new Error('empty capture')
        saveBlob(blob, analysisFilename(snapshot(sheet.generatedAt), 'jpg'))
      } catch (err) {
        console.error('JPEG export failed', err)
        if (!cancelled) setJpegFailed(true)
      } finally {
        if (!cancelled) {
          setSheet(null)
          setExporting(false)
        }
      }
    })()
    return () => { cancelled = true }
    // Runs once per requested sheet; everything else it reads is from that render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet])
  const showEmptyHint = !hasContent && !!activeRaster

  const downloadButton: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: c.accentInk,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    color: c.bgCard,
    fontFamily: 'var(--font-app), sans-serif',
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }

  // Below 768px the panel becomes a bottom drawer over the map.
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // The JPEG's sheet, off screen while it is captured. Portalled out of the
  // panel: its backdrop-filter would make it the containing block of a fixed
  // child, and the sheet would land inside the panel. The map root keeps the
  // theme's CSS variables in reach.
  // Returned beside whatever the panel shows, and keyed, so React keeps the
  // one sheet mounted when the reader collapses the panel mid-capture: the
  // capture holds on to its DOM node.
  const sheetPortal = sheet && createPortal(
    <div aria-hidden style={{ position: 'fixed', left: -100_000, top: 0, pointerEvents: 'none' }}>
      <sheet.Sheet
        ref={sheetRef}
        theme={theme}
        mapSrc={sheet.mapSrc}
        analysisKind={analysisKind}
        analysisLabel={analysisLabel}
        drawnArea={drawnArea}
        drawnLength={drawnLength}
        generatedAt={sheet.generatedAt}
        layers={sheetLayers}
        legendLayers={sheet.legendLayers}
        legendDates={sheet.legendDates}
      />
    </div>,
    document.querySelector('[data-cc-root]') ?? document.body,
    'jpeg-sheet',
  )

  if (!hasContent && !showEmptyHint) return sheetPortal

  // Collapsed: a pill at the bottom on narrow screens, a slim tab on the right
  // edge on desktop.
  if (collapsed) {
    const tab = (
      <button
        className="ui-press"
        onClick={() => onSetCollapsed(false)}
        aria-label="Mostrar resultados"
        title="Mostrar resultados"
        style={{
          position: 'absolute',
          zIndex: 10,
          background: c.glassBg,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${c.glassBd}`,
          boxShadow: 'var(--sh-ctrl)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: c.accent,
          fontFamily: 'var(--font-app), sans-serif',
          fontSize: 13.5,
          fontWeight: 700,
          ...(narrow
            ? { left: '50%', bottom: 14, transform: 'translateX(-50%)', height: 38, padding: '0 16px', borderRadius: 999 }
            : { right: 0, top: '50%', transform: 'translateY(-50%)', width: 28, height: 56, padding: 0, borderRadius: '8px 0 0 8px', borderRight: 'none' }),
        }}
      >
        <IcBarChart size={14} />
        {narrow && <span>Resultados</span>}
      </button>
    )
    return (
      <>
        {tab}
        {sheetPortal}
      </>
    )
  }

  // Leftovers of an earlier analysis (a deleted drawing, a hint with nothing
  // analysed) must not name the panel.
  const title = hasContent ? (analysisLabel ?? analysisKind ?? 'Resultados') : 'Resultados'

  const panel = (
    <div
      role="region"
      aria-label="Resultados"
      style={{
        position: 'absolute',
        // The phone drawer rises into the map controls' column (zIndex 12), which
        // would cover its close button; it goes above them.
        zIndex: narrow ? 13 : 10,
        ...(narrow
          ? { left: 0, right: 0, bottom: 0, maxHeight: '62dvh', borderRadius: '16px 16px 0 0' }
            // Goes down to the bottom edge of the map. The controls and the legend
            // get out of the way on their own: `rightOffset` shifts them left while
            // the panel is open.
          : { right: 16, top: 16, width: 368, maxHeight: 'calc(100% - 32px)', borderRadius: 16 }),
        background: c.glassBg,
        backdropFilter: 'blur(11px)',
        WebkitBackdropFilter: 'blur(11px)',
        border: `1px solid ${c.glassBd}`,
        boxShadow: 'var(--sh-panel)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-app), sans-serif',
        // The clipping lives in the container and the scrolling in the body, so the
        // header and the feature name do not go out of sight when scrolling a long result.
        overflow: 'hidden',
        padding: '20px 20px',
      }}
    >
      {/* Header: what was analysed and how big it is. Stays in view while the
          results scroll. */}
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, margin: '0 0 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, paddingTop: 4 }}>
          {hasContent && analysisKind && analysisLabel && analysisKind !== analysisLabel && (
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: c.textDim }}>
              {analysisKind}
            </span>
          )}
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.01em', color: c.text, overflowWrap: 'anywhere' }}>
            {title}
          </h2>
          {drawnArea !== null && (
            <span style={{ fontSize: 14, color: c.textDim, fontVariantNumeric: 'lining-nums tabular-nums' }}>
              {nfInt.format(drawnArea * 100)} ha analisados
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Ocultar resultados"
          title="Ocultar resultados"
          style={{
            width: 40, height: 40, borderRadius: 999, flexShrink: 0,
            background: c.bgCard,
            border: `1px solid ${c.border}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: c.text,
          }}
        >
          <IcX size={16} />
        </button>
      </header>

      {/* Scrollable body: the header and the download stay in view. Its children
          must not shrink -- the body scrolls instead; `LayerResultCard` carries
          the same guard. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      {drawnLength !== null && (
        <div style={{ marginBottom: 24, flexShrink: 0 }}>
          <Pair theme={theme} items={[{ label: 'Comprimento', value: nf.format(drawnLength), aside: 'km' }]} />
        </div>
      )}

      {/* One card per visible raster. Gated on the selection because a card with
          no result yet renders as "Calculando": with nothing selected -- or with
          only a line drawn, which no raster is measured over -- that skeleton would
          never resolve, and it would sit above the onboarding hint on first load. */}
      {selectedGeometry && rasters.map((raster) => {
        const stop = raster.gee?.temporal ? temporalDate[raster.id] : undefined
        return (
          <LayerResultCard
            key={raster.id}
            layer={raster}
            result={cardResult(raster, stop)}
            date={stop}
            expanded={isExpanded(raster.id)}
            onToggle={() => toggle(raster.id)}
            theme={theme}
            geometry={selectedGeometry}
            polygonHa={drawnArea !== null ? drawnArea * 100 : null}
          />
        )
      })}

      {showEmptyHint && (
        <Stack>
          <ContextLine theme={theme} title={activeRaster.name} />
          <Empty theme={theme} text={analysisHint(recortes)} />
        </Stack>
      )}
      </div>

      {/* Baixar a análise, pinned below the scrollable body like the header above
          it, so the download stays in view however many cards are open. */}
      {canDownload && (
        <div style={{ marginTop: 16, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="ui-press"
              onClick={handleDownload}
              title="Baixar esta análise em CSV"
              style={downloadButton}
            >
              <IcDownload size={16} />
              Baixar CSV
            </button>
            <button
              className="ui-press"
              onClick={() => void handleDownloadJpeg()}
              disabled={exporting}
              aria-busy={exporting}
              title="Baixar o mapa e esta análise em JPEG"
              style={{ ...downloadButton, cursor: exporting ? 'progress' : 'pointer', opacity: exporting ? 0.7 : 1 }}
            >
              <IcDownload size={16} />
              {exporting ? 'Gerando…' : 'Baixar JPEG'}
            </button>
          </div>
          {jpegFailed && (
            <span role="alert" style={{ fontSize: 13, color: c.textDim, textAlign: 'center' }}>
              Não foi possível gerar a imagem. Tente novamente.
            </span>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      {panel}
      {sheetPortal}
    </>
  )
}
