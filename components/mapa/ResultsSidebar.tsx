'use client'

import { useState, useEffect } from 'react'
import { IcX, IcBarChart, IcDownload } from './icons'
import LayerResultCard from './LayerResultCard'
import { useStore, hasAnalysisContent } from '@/lib/mapa/store'
import { buildAnalysisCsv } from '@/lib/mapa/exportAnalysis'
import { analysisHint, clickableRecortes } from '@/lib/mapa/analysisTargets'
import type { LayerResult, PlatformTheme, RasterLayerConfig } from '@/types/mapa'

// pt-BR number formatting (comma decimal, dot thousands).
const nf    = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const nfInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

interface Props {
  theme: PlatformTheme
  /** Collapse state is lifted so plataforma can shift the map controls/legend. */
  collapsed: boolean
  onSetCollapsed: (v: boolean) => void
}

/**
 * Floating results panel. Appears whenever there's a measurement to show
 * (drawn geometry, or a vector feature clicked over a raster), or when a
 * raster is active but nothing was analysed yet, in which case it shows an
 * onboarding hint.
 *
 * Anatomy: cut chip + feature name, "Área analisada" hero card, length card,
 * one collapsible result card per visible raster, provenance footer. Below
 * 768px it becomes a bottom drawer so it never squeezes the map sideways.
 */
export default function ResultsSidebar({ theme, collapsed, onSetCollapsed }: Props) {
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
  const rasters = layers.filter(
    (l): l is RasterLayerConfig => l.type === 'raster' && l.visible,
  )
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

  function handleDownload() {
    const { filename, csv } = buildAnalysisCsv({
      analysisKind,
      analysisLabel,
      drawnArea,
      drawnLength,
      generatedAt: new Date(),
      layers: measured.map((raster) => ({
        layerName:    raster.name,
        layerUnit:    raster.unit,
        layerClasses: raster.classes,
        signedFlux:   raster.signedFlux,
        year:         temporalDate[raster.id]?.slice(0, 4),
        pixelValue:   results[raster.id]?.pixelValue ?? null,
        stats:        results[raster.id]?.stats ?? null,
      })),
    })

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  const showEmptyHint = !hasContent && !!activeRaster

  // Below 768px the panel becomes a bottom drawer over the map.
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!hasContent && !showEmptyHint) return null

  // Collapsed: a pill at the bottom on narrow screens, a slim tab on the right
  // edge on desktop.
  if (collapsed) {
    return (
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
          fontSize: 12,
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
  }

  // Shared card + label styles (handoff typographic scale).
  const card: React.CSSProperties = {
    background: c.accentBg,
    border: `1px solid ${c.accentBd}`,
    borderRadius: 12,
    padding: '12px 14px',
    marginBottom: 8,
    flexShrink: 0,
  }
  const eyebrow: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    color: c.dim,
  }
  const heroNumber: React.CSSProperties = {
    fontSize: 36,
    fontWeight: 800,
    color: c.text,
    lineHeight: 1.05,
    fontVariantNumeric: 'tabular-nums',
  }
  const heroUnit: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: c.accent,
  }

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 10,
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
        padding: '14px 14px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 10px', flexShrink: 0 }}>
        <span style={{ ...eyebrow, fontSize: 11 }}>Resultados</span>
        <button
          onClick={() => onSetCollapsed(true)}
          aria-label="Ocultar resultados"
          title="Ocultar resultados"
          style={{
            width: 28, height: 28, borderRadius: 999,
            background: 'transparent',
            border: `1px solid ${c.border}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: c.textDim,
          }}
        >
          <IcX size={14} />
        </button>
      </div>

      {/* Cut chip + feature name */}
      {(analysisKind || analysisLabel) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '0 0 10px', flexShrink: 0 }}>
          {analysisKind && (
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
              color: c.accentInk, background: c.accentBg, border: `1px solid ${c.accentBd}`,
              borderRadius: 5, padding: '2px 8px',
            }}>
              {analysisKind}
            </span>
          )}
          {analysisLabel && (
            <span style={{ fontSize: 13.5, fontWeight: 700, color: c.text }}>{analysisLabel}</span>
          )}
        </div>
      )}

      {/* Scrollable body: the header, the feature name, the download and the
          footer stay in view. Its children must not shrink -- the body scrolls
          instead; `LayerResultCard` carries the same guard. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      {/* Área analisada (hero) */}
      {drawnArea !== null && (
        <div style={card}>
          <div style={{ ...eyebrow, marginBottom: 4 }}>Área analisada</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={heroNumber}>{nf.format(drawnArea)}</span>
            <span style={heroUnit}>km²</span>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: c.dim, fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>
            {nfInt.format(drawnArea * 100)} hectares
          </div>
        </div>
      )}

      {/* Comprimento */}
      {drawnLength !== null && (
        <div style={card}>
          <div style={{ ...eyebrow, marginBottom: 4 }}>Comprimento</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ ...heroNumber, fontSize: 28 }}>{nf.format(drawnLength)}</span>
            <span style={{ ...heroUnit, fontSize: 14 }}>km</span>
          </div>
        </div>
      )}

      {/* One card per visible raster. Gated on the selection because a card with
          no result yet renders as "Calculando...": with nothing selected -- or with
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
          />
        )
      })}

      {showEmptyHint && (
        <div style={{
          background: c.bgCard,
          border: `1px dashed ${c.border}`,
          borderRadius: 12,
          padding: '14px 12px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: c.text, overflowWrap: 'anywhere', lineHeight: 1.35 }}>
            Analisar {activeRaster.name}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: c.dim, lineHeight: 1.5 }}>
            {analysisHint(recortes)}
          </span>
        </div>
      )}
      </div>

      {/* Baixar a análise */}
      {canDownload && (
        <button
          className="ui-press"
          onClick={handleDownload}
          title="Baixar esta análise em CSV"
          style={{
            // Pinned below the scrollable body, like the header above it, so the
            // download stays in view however many cards are open.
            marginTop: 8,
            width: '100%',
            height: 36,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            background: c.accentBg,
            border: `1px solid ${c.accentBd}`,
            borderRadius: 10,
            cursor: 'pointer',
            color: c.accentInk,
            fontFamily: 'var(--font-app), sans-serif',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <IcDownload size={14} />
          Baixar CSV
        </button>
      )}

      {/* Provenance footer */}
      {hasContent && (
        <div style={{
          marginTop: 10, paddingTop: 10, borderTop: `1px solid ${c.border}`,
          flexShrink: 0,
          fontSize: 10, fontWeight: 600, color: c.caption, textAlign: 'center',
        }}>
          Estatística zonal, Google Earth Engine
        </div>
      )}
    </div>
  )
}
