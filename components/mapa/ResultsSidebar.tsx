'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { IcX, IcBarChart, IcDownload } from './icons'
import LayerResultCard from './LayerResultCard'
import { useStore, hasAnalysisContent } from '@/lib/mapa/store'
import { buildAnalysisCsv } from '@/lib/mapa/exportAnalysis'
import { analysisHint, clickableRecortes } from '@/lib/mapa/analysisTargets'
import { getResultProfile } from '@/config/mapa/resultProfiles'
import { layerMetaText } from '@/config/mapa/layerMeta'
import { localizeAnalysisKind, localizeAnalysisLabel } from '@/lib/mapa/analysisSubject'
import { formatNumber } from '@/lib/mapa/locale'
import { layerName, localizeClassLabel, localizeLayer } from '@/lib/mapa/text'
import { useMapaText } from '@/lib/mapa/useMapaText'
import { ContextLine, Empty, Pair, Stack } from './results/blocks'
import type { LayerResult, PlatformTheme, RasterLayerConfig } from '@/types/mapa'

interface Props {
  theme: PlatformTheme
  /** Collapse state is lifted so plataforma can shift the map controls/legend. */
  collapsed: boolean
  onSetCollapsed: (v: boolean) => void
  /** The header's X; the owner decides whether it drops the selection or collapses the panel. */
  onClose: () => void
}

/**
 * Floating results panel. Appears whenever there's a measurement to show
 * (drawn geometry, or a vector feature clicked over a raster), or when a
 * raster is active but nothing was analysed yet, in which case it shows an
 * onboarding hint.
 *
 * Anatomy: header with the cut, the feature name and its area; the length;
 * one collapsible result card per visible raster; the CSV download. Below
 * 768px it becomes a bottom drawer so it never squeezes the map sideways.
 */
export default function ResultsSidebar({ theme, collapsed, onSetCollapsed, onClose }: Props) {
  const t  = useTranslations('MapaUiResultsSidebar')
  const tx = useMapaText()
  // Number formatting of the user's language (comma decimal in Portuguese).
  const nf    = (value: number) => formatNumber(value, tx.locale, { maximumFractionDigits: 2 })
  const nfInt = (value: number) => formatNumber(value, tx.locale, { maximumFractionDigits: 0 })
  const drawnArea        = useStore((s) => s.drawnArea)
  const drawnLength      = useStore((s) => s.drawnLength)
  const results          = useStore((s) => s.results)
  const selectedGeometry = useStore((s) => s.selectedGeometry)
  const storedLabel      = useStore((s) => s.analysisLabel)
  const storedKind       = useStore((s) => s.analysisKind)
  const drawing          = useStore((s) => s.drawing)
  const layers           = useStore((s) => s.layers)
  const temporalDate     = useStore((s) => s.temporalDate)
  const layerErrors      = useStore((s) => s.layerErrors)

  const c = theme.colors

  // The store keeps the subject of the analysis in Portuguese, written when the
  // user clicked or drew; it is turned into the current language here.
  const analysisKind  = localizeAnalysisKind(storedKind, layers, tx, (key) => t(`kinds.${key}`))
  const analysisLabel = localizeAnalysisLabel(storedLabel, storedKind, drawing, layers, tx)

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
      layers: measured.map((raster) => {
        const local = localizeLayer(raster, tx)
        // `pixelCache` keeps the class label in Portuguese, like the panel's
        // own PointValue; without this the file would name the class in
        // Portuguese under English headers.
        const pixel = results[raster.id]?.pixelValue ?? null
        return {
          layerName:    local.name,
          layerUnit:    local.unit,
          layerClasses: local.classes,
          signedFlux:   local.signedFlux,
          year:         temporalDate[raster.id]?.slice(0, 4),
          pixelValue:   pixel && { ...pixel, label: localizeClassLabel(raster.id, pixel.label, tx) },
          stats:        results[raster.id]?.stats ?? null,
          profile:      getResultProfile(raster.id, tx),
          source:       layerMetaText(raster.id, tx)?.source,
        }
      }),
    }, tx)

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
        aria-label={t('show')}
        title={t('show')}
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
        {narrow && <span>{t('title')}</span>}
      </button>
    )
  }

  // Leftovers of an earlier analysis (a deleted drawing, a hint with nothing
  // analysed) must not name the panel.
  const title = hasContent ? (analysisLabel ?? analysisKind ?? t('title')) : t('title')

  return (
    <div
      role="region"
      aria-label={t('title')}
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
              {t('analyzedHectares', { value: nfInt(drawnArea * 100) })}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label={t('hide')}
          title={t('hide')}
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
          <Pair theme={theme} items={[{ label: t('length'), value: nf(drawnLength), aside: 'km' }]} />
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
          <ContextLine theme={theme} title={layerName(activeRaster, tx)} />
          <Empty theme={theme} text={analysisHint(recortes, tx)} />
        </Stack>
      )}
      </div>

      {/* Download the analysis, pinned below the scrollable body like the header above
          it, so the download stays in view however many cards are open. */}
      {canDownload && (
        <button
          className="ui-press"
          onClick={handleDownload}
          title={t('downloadTitle')}
          style={{
            marginTop: 16,
            width: '100%',
            height: 44,
            flexShrink: 0,
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
          }}
        >
          <IcDownload size={16} />
          {t('download')}
        </button>
      )}
    </div>
  )
}
