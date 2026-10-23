'use client'

/* eslint-disable @next/next/no-img-element */
import type { Ref } from 'react'
import LayerResultCard, { type CardCharts } from './LayerResultCard'
import { StatsChartView } from './StatsChart'
import PointSeries from './results/PointSeries'
import { Pair } from './results/blocks'
import { luminance } from '@/lib/color'
import { VectorLegendItem, RasterLegendItem } from './overlays/LegendItems'
import type {
  LayerConfig, LayerResult, PlatformTheme, RasterLayerConfig, VectorLayerConfig,
} from '@/types/mapa'

const nf    = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const nfInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

// The charts come with the sheet, not lazily: the capture runs right after the
// sheet commits, and a lazy chart is still empty then.
const charts: CardCharts = { StatsChartView, PointSeries }

/** Width of the results column: the panel's own 328 px of content, plus air. */
const RESULTS_WIDTH = 360
const MAP_WIDTH = 860
const GAP = 32
/** Most result columns side by side under the map. */
const MAX_COLUMNS = 3
/** Width of the stacked layout: the map spans the full row of result columns. */
const STACKED_WIDTH = MAX_COLUMNS * RESULTS_WIDTH + (MAX_COLUMNS - 1) * GAP

export interface SheetLayer {
  raster: RasterLayerConfig
  result: LayerResult
  /** Temporal stop the result refers to; undefined for a static layer. */
  date?:  string
}

interface Props {
  theme:         PlatformTheme
  /** Snapshot of the map, or null when the canvas could not be read. */
  mapSrc:        string | null
  analysisKind:  string | null
  analysisLabel: string | null
  drawnArea:     number | null
  drawnLength:   number | null
  generatedAt:   Date
  layers:        SheetLayer[]
  /** Layers that were on the map, in the legend's order. */
  legendLayers:  LayerConfig[]
  /** Temporal stop of each layer, to pick the year's range on a ramp. */
  legendDates:   Record<string, string>
  ref?:          Ref<HTMLDivElement>
}

/**
 * The analysis laid out for the JPEG, every card open, under one heading that
 * names the recorte and the date.
 *
 * One layer sits beside the map, as in the panel. From two on, a single
 * column would run several maps tall and leave a void under the map, so the
 * map goes on top across the width and the cards share the row below it.
 *
 * Rendered off screen and captured by html-to-image. The image travels alone
 * -- shared in a message, pasted in a slide -- so it carries what the panel
 * leaves to its surroundings: where the area is, and when it was measured.
 *
 * It imports recharts outright, so the panel loads it only when a JPEG is
 * asked for.
 */
export default function AnalysisSheet({
  theme, mapSrc, analysisKind, analysisLabel, drawnArea, drawnLength, generatedAt, layers, legendLayers, legendDates, ref,
}: Props) {
  const c = theme.colors
  const dark = luminance(c.bg) < 0.25
  const title = analysisLabel ?? analysisKind ?? 'Resultados'
  // A recorte with no raster measured has nothing for the results column; an
  // empty column would read as a capture that failed.
  const hasResults = layers.length > 0 || drawnLength !== null
  const stacked = layers.length >= 2
  const contentWidth = stacked
    ? STACKED_WIDTH
    : Math.max((mapSrc ? MAP_WIDTH : 0) + (mapSrc && hasResults ? GAP : 0) + (hasResults ? RESULTS_WIDTH : 0), RESULTS_WIDTH)

  const length = drawnLength !== null && (
    <div style={{ marginBottom: 24 }}>
      <Pair theme={theme} items={[{ label: 'Comprimento', value: nf.format(drawnLength), aside: 'km' }]} />
    </div>
  )
  const cards = layers.map(({ raster, result, date }) => (
    <LayerResultCard
      key={raster.id}
      layer={raster}
      result={result}
      date={date}
      expanded
      onToggle={() => {}}
      theme={theme}
      geometry={null}
      polygonHa={drawnArea !== null ? drawnArea * 100 : null}
      still
      charts={charts}
    />
  ))

  return (
    <div
      ref={ref}
      style={{
        width: contentWidth + 2 * GAP,
        padding: GAP,
        boxSizing: 'border-box',
        background: c.bg,
        color: c.text,
        fontFamily: 'var(--font-app), sans-serif',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          {analysisKind && analysisLabel && analysisKind !== analysisLabel && (
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: c.textDim }}>
              {analysisKind}
            </span>
          )}
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.01em', overflowWrap: 'anywhere' }}>
            {title}
          </h1>
          {drawnArea !== null && (
            <span style={{ fontSize: 14, color: c.textDim, fontVariantNumeric: 'lining-nums tabular-nums' }}>
              {nfInt.format(drawnArea * 100)} ha analisados
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          {/* Bare marks, no chip: each has a variant drawn for its ground (the
              color lockup and Sudene's black shadow disappear on a dark one). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src={dark ? '/logos/caativar-branco.svg' : '/logos/caativar.svg'}
              alt="Caativar"
              style={{ height: 36, width: 'auto', display: 'block' }}
            />
            <img
              src={dark ? '/logos/logo_sudene_escuro.png' : '/logos/logo_sudene.png'}
              alt="Sudene"
              style={{ height: 36, width: 'auto', display: 'block' }}
            />
          </div>
          <div style={{ fontSize: 13, color: c.textDim, fontVariantNumeric: 'lining-nums tabular-nums' }}>
            Gerado em {generatedAt.toLocaleDateString('pt-BR')}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: stacked ? 'column' : 'row', alignItems: 'flex-start', gap: GAP }}>
        {mapSrc && (
          // A data URL, not a remote image: next/image has nothing to optimise.
          <img
            src={mapSrc}
            alt=""
            style={{
              width: stacked ? STACKED_WIDTH : MAP_WIDTH, height: 'auto', display: 'block', flexShrink: 0,
              borderRadius: 12, border: `1px solid ${c.border}`,
            }}
          />
        )}

        {stacked ? (
          <div style={{ width: STACKED_WIDTH }}>
            {length}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(layers.length, MAX_COLUMNS)}, minmax(0, 1fr))`,
              columnGap: GAP,
              alignItems: 'start',
            }}>
              {cards}
            </div>
          </div>
        ) : hasResults && (
          <div style={{ width: RESULTS_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            {length}
            {cards}
          </div>
        )}
      </div>

      {legendLayers.length > 0 && (
        <section style={{ marginTop: GAP, paddingTop: 20, borderTop: `1px solid ${c.border}` }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 12.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: c.text }}>
            Legenda
          </h2>
          {/* Columns, not a grid: a long legend (MapBiomas' 30 classes) fills a
              column while the short ramps share the next one. */}
          <div style={{ columnWidth: 256, columnGap: GAP }}>
            {legendLayers.map((layer) => (
              <div key={layer.id} style={{ breakInside: 'avoid', marginBottom: 14 }}>
                {layer.type === 'vector' ? (
                  <VectorLegendItem layer={layer as VectorLayerConfig} theme={theme} still />
                ) : (
                  <RasterLegendItem layer={layer as RasterLayerConfig} theme={theme} temporalDate={legendDates[layer.id]} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
