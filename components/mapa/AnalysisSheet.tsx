'use client'

import type { Ref } from 'react'
import LayerResultCard from './LayerResultCard'
import { Pair } from './results/blocks'
import type { LayerResult, PlatformTheme, RasterLayerConfig } from '@/types/mapa'

const nf    = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const nfInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

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
 */
export default function AnalysisSheet({
  theme, mapSrc, analysisKind, analysisLabel, drawnArea, drawnLength, generatedAt, layers, ref,
}: Props) {
  const c = theme.colors
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
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: c.accentInk }}>Caativar</div>
          <div style={{ fontSize: 13, color: c.textDim, fontVariantNumeric: 'lining-nums tabular-nums' }}>
            Gerado em {generatedAt.toLocaleDateString('pt-BR')}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: stacked ? 'column' : 'row', alignItems: 'flex-start', gap: GAP }}>
        {mapSrc && (
          // A data URL, not a remote image: next/image has nothing to optimise.
          // eslint-disable-next-line @next/next/no-img-element
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
    </div>
  )
}
