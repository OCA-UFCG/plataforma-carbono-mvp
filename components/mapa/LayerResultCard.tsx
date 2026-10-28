'use client'

import type { ComponentProps, ComponentType, ReactNode } from 'react'
import dynamic from 'next/dynamic'
import type { StatsChartViewProps } from './StatsChart'
import type PointSeriesView from './results/PointSeries'
import { ErrorCard, SkeletonChart } from './StatsCards'
import { IcChevronDown } from './icons'
import LayerResultView from './results/LayerResultView'
import PointValue from './results/PointValue'
import { Empty, LayerHeading, LeadCard, headingClass } from './results/blocks'
import { getResultProfile } from '@/config/mapa/resultProfiles'
import { currentAnalysisSeq, runLayerAnalysis } from '@/lib/mapa/analysisRunner'
import { resultSummary } from '@/lib/mapa/resultSummary'
import { layerTitle } from '@/lib/mapa/results/format'
import { layerPeriod } from '@/lib/mapa/results/period'
import type {
  LayerResult, PlatformTheme, RasterLayerConfig, SelectedGeometry,
} from '@/types/mapa'
import styles from './LayerResultCard.module.css'

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
 * Folded, its card carries the whole answer -- layer, year and headline
 * number -- so three layers can be compared without opening three cards. Open,
 * the headline moves into the result below and the heading keeps only the
 * layer and the year, so the number is not shown twice.
 *
 * The heading heads the result's first card, as in Figma 19432:60313: it goes
 * down through `LayerHeading` to the result view's Hero or Empty, and the
 * states the views do not draw (loading, error, the report's charts) put it in
 * a LeadCard of their own.
 */
export default function LayerResultCard({
  layer, result, date, expanded, onToggle, theme, geometry, polygonHa, still = false,
  charts = lazyCharts,
}: Props) {
  const { StatsChartView, PointSeries } = charts
  const Heading = still ? 'div' : 'button'
  const profile = getResultProfile(layer.id)
  const summary = resultSummary(layer, result)
  const loading = !result || result.status === 'loading'
  const stats = result?.status === 'ready' ? result.stats : null

  // A point series covers every year, so the heading names its range.
  const series = stats?.kind === 'timeseries' ? stats.series : null
  const period = series?.length
    ? `${series[0].date.slice(0, 4)} a ${series[series.length - 1].date.slice(0, 4)}`
    : profile ? layerPeriod(layer, profile, date) : date?.slice(0, 4)

  const heading = (
    <Heading
      {...(still ? {} : { type: 'button' as const, onClick: onToggle, 'aria-expanded': expanded })}
      className={styles.heading}
    >
      <span className={`${styles.title} ${headingClass}`}>{layerTitle(layer.name)}</span>
      {period && <span className={`${styles.period} text-body`}>{period}</span>}
      {!still && <span className={styles.arrow}><IcChevronDown size={14} /></span>}
    </Heading>
  )

  let body: ReactNode
  if (!expanded) {
    body = (
      <LeadCard>
        <span className={`${styles.summary} text-h4`}>{summary ?? (loading ? 'Calculando' : 'Sem resultado')}</span>
      </LeadCard>
    )
  } else if (loading) {
    body = <LeadCard><SkeletonChart theme={theme} /></LeadCard>
  } else if (result?.status === 'error') {
    body = (
      <LeadCard>
        <ErrorCard theme={theme} message={result.error ?? 'Falha ao calcular o resultado.'} />
        {geometry && !still && (
          <button
            type="button"
            className={`${styles.retry} text-ui-medium`}
            onClick={() => void runLayerAnalysis(layer, geometry, date, currentAnalysisSeq())}
          >
            Tentar novamente
          </button>
        )}
      </LeadCard>
    )
  } else if (result?.status === 'ready' && result.pixelValue) {
    body = <PointValue theme={theme} layer={layer} pixel={result.pixelValue} />
  } else if (stats && profile && stats.kind === 'timeseries') {
    body = <PointSeries theme={theme} layer={layer} profile={profile} series={stats.series} temporalDate={date} />
  } else if (stats && profile && stats.kind !== 'continuous') {
    body = (
      <LayerResultView
        theme={theme}
        layer={layer}
        profile={profile}
        result={stats}
        temporalDate={date}
        polygonHa={polygonHa}
      />
    )
  } else if (stats && (stats.kind === 'continuous' || stats.kind === 'categorical' || stats.kind === 'stocks' || stats.kind === 'timeseries')) {
    // A layer without a result profile keeps the report's views.
    body = (
      <LeadCard>
        <StatsChartView
          theme={theme}
          stats={stats}
          classes={layer.classes}
          unit={layer.unit}
          signedFlux={layer.signedFlux}
          animate={!still}
        />
      </LeadCard>
    )
  } else if (result?.status === 'ready' && !result.pixelValue && !result.stats) {
    // A point over nodata: status is 'ready' with nothing to show, a real answer.
    body = <Empty theme={theme} text="Sem dado neste ponto." />
  }

  return (
    <section className={styles.layer}>
      <LayerHeading.Provider value={heading}>{body}</LayerHeading.Provider>
    </section>
  )
}
