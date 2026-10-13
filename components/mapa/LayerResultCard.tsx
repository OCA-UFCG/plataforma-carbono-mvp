'use client'

import type { ComponentProps, ComponentType } from 'react'
import dynamic from 'next/dynamic'
import type { StatsChartViewProps } from './StatsChart'
import type PointSeriesView from './results/PointSeries'
import { ErrorCard, SkeletonChart } from './StatsCards'
import { IcChevronDown } from './icons'
import LayerResultView from './results/LayerResultView'
import PointValue from './results/PointValue'
import { Empty } from './results/blocks'
import { getResultProfile } from '@/config/mapa/resultProfiles'
import { currentAnalysisSeq, runLayerAnalysis } from '@/lib/mapa/analysisRunner'
import { resultSummary } from '@/lib/mapa/resultSummary'
import { layerTitle } from '@/lib/mapa/results/format'
import { layerPeriod } from '@/lib/mapa/results/period'
import type {
  LayerResult, PlatformTheme, RasterLayerConfig, SelectedGeometry,
} from '@/types/mapa'

/** The card's two charts, the only parts of it that pull in recharts. */
export interface CardCharts {
  StatsChartView: ComponentType<StatsChartViewProps>
  PointSeries:    ComponentType<ComponentProps<typeof PointSeriesView>>
}

// Recharts stays out of the initial map bundle: only a card that actually
// opens a chart pulls it in.
const lazyCharts: CardCharts = {
  StatsChartView: dynamic(
    () => import('./StatsChart').then((m) => m.StatsChartView),
    { ssr: false, loading: () => null },
  ),
  PointSeries: dynamic(() => import('./results/PointSeries'), { ssr: false, loading: () => null }),
}

interface Props {
  layer:    RasterLayerConfig
  result:   LayerResult | undefined
  /** Temporal stop the card refers to; undefined for a static layer. */
  date?:    string
  expanded: boolean
  onToggle: () => void
  theme:    PlatformTheme
  /** Geometry a retry re-measures, from the store. Null while nothing is selected. */
  geometry: SelectedGeometry | null
  /** Area of the analysed polygon in hectares, for the coverage note. */
  polygonHa: number | null
  /**
   * Rendered for the JPEG export: a plain heading instead of the toggle, no
   * retry, and no chart animation, which the capture would catch mid-way.
   */
  still?: boolean
  /**
   * The charts, lazy by default. A lazy chart renders nothing on its first
   * pass, even with its code already fetched, so the JPEG sheet passes them
   * loaded: its capture runs right after it commits.
   */
  charts?: CardCharts
}

/**
 * One visible raster's result, collapsible.
 *
 * Closed, the header carries the whole answer -- layer, year and headline
 * number -- so three layers can be compared without opening three cards. Open,
 * the headline moves into the result below and the header keeps only the layer
 * and the year, so the number is not shown twice.
 */
export default function LayerResultCard({
  layer, result, date, expanded, onToggle, theme, geometry, polygonHa, still = false,
  charts = lazyCharts,
}: Props) {
  const { StatsChartView, PointSeries } = charts
  const c = theme.colors
  const Heading = still ? 'div' : 'button'
  const profile = getResultProfile(layer.id)
  const summary = resultSummary(layer, result)
  const loading = !result || result.status === 'loading'
  const stats = result?.status === 'ready' ? result.stats : null

  // A point series covers every year, so the header names its range.
  const series = stats?.kind === 'timeseries' ? stats.series : null
  const period = series?.length
    ? `${series[0].date.slice(0, 4)} a ${series[series.length - 1].date.slice(0, 4)}`
    : profile ? layerPeriod(layer, profile, date) : date?.slice(0, 4)

  return (
    <section style={{
      paddingTop: 16,
      borderTop: `1px solid ${c.border}`,
      marginBottom: 24,
      // The card sits in the panel's scrollable flex column; without this,
      // several open cards would shrink to fit and clip instead of scrolling.
      flexShrink: 0,
    }}>
      <Heading
        {...(still ? {} : { className: 'ui-press', onClick: onToggle, 'aria-expanded': expanded })}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-app), sans-serif',
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: c.text, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
            {layerTitle(layer.name)}
          </span>
          {!expanded && (
            <span style={{
              display: 'block', marginTop: 4,
              fontSize: 17, fontWeight: 800, color: c.text,
              fontVariantNumeric: 'lining-nums tabular-nums', overflowWrap: 'anywhere',
            }}>
              {summary ?? (loading ? 'Calculando' : 'Sem resultado')}
            </span>
          )}
        </span>
        {period && (
          <span style={{ fontSize: 14, color: c.textDim, whiteSpace: 'nowrap', fontVariantNumeric: 'lining-nums tabular-nums' }}>
            {period}
          </span>
        )}
        {!still && (
          <span style={{
            color: c.textDim, flexShrink: 0, marginTop: 2,
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform .15s',
          }}>
            <IcChevronDown size={14} />
          </span>
        )}
      </Heading>

      {expanded && (
        <div style={{ paddingTop: 16 }}>
          {loading && <SkeletonChart theme={theme} />}

          {result?.status === 'error' && (
            <>
              <ErrorCard theme={theme} message={result.error ?? 'Falha ao calcular o resultado.'} />
              {geometry && !still && (
                <button
                  className="ui-press"
                  onClick={() => void runLayerAnalysis(layer, geometry, date, currentAnalysisSeq())}
                  style={{
                    marginTop: 12, width: '100%', height: 40,
                    background: 'transparent', border: `1px solid ${c.border}`,
                    borderRadius: 10, cursor: 'pointer', color: c.text,
                    fontFamily: 'var(--font-app), sans-serif', fontSize: 14, fontWeight: 600,
                  }}
                >
                  Tentar novamente
                </button>
              )}
            </>
          )}

          {result?.status === 'ready' && result.pixelValue && (
            <PointValue theme={theme} layer={layer} pixel={result.pixelValue} />
          )}

          {stats && profile && stats.kind === 'timeseries' && (
            <PointSeries theme={theme} layer={layer} profile={profile} series={stats.series} temporalDate={date} />
          )}

          {stats && profile && stats.kind !== 'timeseries' && stats.kind !== 'continuous' && (
            <LayerResultView
              theme={theme}
              layer={layer}
              profile={profile}
              result={stats}
              temporalDate={date}
              polygonHa={polygonHa}
            />
          )}

          {/* A layer without a result profile keeps the report's views. */}
          {stats && (!profile || stats.kind === 'continuous')
            && (stats.kind === 'continuous' || stats.kind === 'categorical' || stats.kind === 'stocks' || stats.kind === 'timeseries') && (
            <StatsChartView
              theme={theme}
              stats={stats}
              classes={layer.classes}
              unit={layer.unit}
              signedFlux={layer.signedFlux}
              animate={!still}
            />
          )}

          {/* A point over nodata: status is 'ready' with nothing to show, a real answer. */}
          {result?.status === 'ready' && !result.pixelValue && !result.stats && (
            <Empty theme={theme} text="Sem dado neste ponto." />
          )}
        </div>
      )}
    </section>
  )
}
