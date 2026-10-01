'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslations } from 'next-intl'
import { CardBox } from './StatsCards'
import StockReportView from './StockReportView'
import FluxValue from './FluxValue'
import { formatNumber } from '@/lib/mapa/locale'
import { useMapaText } from '@/lib/mapa/useMapaText'
import type { MapaText } from '@/lib/mapa/text'
import { MONTHS, monthLabel, monthShort } from '@/lib/phenology'
import type {
  RasterClass,
  RasterStatsResult,
  PlatformTheme,
  ContinuousStats,
  TimeSeriesPoint,
} from '@/types/mapa'

export interface StatsChartViewProps {
  theme:       PlatformTheme
  stats:       RasterStatsResult
  classes?:    RasterClass[]
  unit?:       string
  signedFlux?: boolean
  caption?:    string
  /**
   * Whether the yearly-series line animates in. Defaults to true so the
   * map's results panel (LayerResultCard) keeps its existing feel; the
   * report path passes false because recharts animates by mutating SVG
   * attributes from JS, which a print stylesheet cannot interrupt, and a
   * chart mid-animation at the moment print captures the page prints blank.
   */
  animate?:    boolean
  /**
   * A fixed pixel width for the yearly-series chart, replacing
   * `ResponsiveContainer`. Undefined (the default) keeps the map panel's
   * existing `ResponsiveContainer`-driven behaviour exactly as it is today.
   *
   * The report path passes a fixed width for the same reason it passes
   * `animate={false}`: the content column is ~150mm on screen and 180mm in
   * print, a 20% change a `ResizeObserver`-driven SVG does not reliably pick
   * up before the print snapshot. A concrete pixel size sidesteps the
   * observer entirely.
   */
  width?:      number
}

/**
 * The charts with no store behind them: one result, one layer's metadata.
 *
 * Both callers render N sections at once -- the report one per section, the
 * results panel one per visible raster -- so "the visible raster" the store
 * used to expose means nothing to either of them.
 */
export function StatsChartView({
  theme, stats, classes, unit, signedFlux, caption, animate = true, width,
}: StatsChartViewProps) {
  if (stats.kind === 'stocks') {
    return <StockReportView report={stats.report} theme={theme} caption={caption} />
  }
  if (stats.kind === 'timeseries') {
    return (
      <TimeSeriesChart
        series={stats.series}
        classes={classes}
        theme={theme}
        caption={caption}
        animate={animate}
        width={width}
      />
    )
  }
  if (stats.kind === 'categorical') {
    return <CategoricalChart areas={stats.areas} classes={classes} theme={theme} caption={caption} />
  }
  return (
    <ContinuousStatsView
      stats={stats.stats}
      unit={stats.unit ?? unit}
      theme={theme}
      caption={caption}
      signedFlux={signedFlux}
    />
  )
}

// Categorical (horizontal bar chart, area per class)

interface CategoricalRow {
  label: string
  value: number
  color: string
  areaHa: number  // hectares
  pct: number     // share of the total area
}

function CategoricalChart({
  areas,
  classes,
  theme,
  caption,
}: {
  areas: Record<string, number>  // area in m² per class code
  classes?: RasterClass[]
  theme: PlatformTheme
  caption?: string
}) {
  const t = useTranslations('MapaUiStatsChart')
  const tx = useMapaText()
  if (!classes?.length) return null

  const totalM2 = Object.values(areas).reduce((a, b) => a + b, 0)
  if (totalM2 === 0) return null

  const rows: CategoricalRow[] = classes
    .map((cls) => {
      const m2 = areas[String(cls.value)] ?? 0
      return { ...cls, areaHa: m2 / 10_000, pct: (m2 / totalM2) * 100 }
    })
    .filter((r) => r.areaHa > 0)

  // Catch-all bucket for class codes present in the data but missing from the
  // layer's `classes` config, otherwise those areas render on the map (via
  // the GEE palette) but silently vanish from the chart, so the bars wouldn't
  // sum to 100%.
  const knownM2 = classes.reduce((a, cls) => a + (areas[String(cls.value)] ?? 0), 0)
  const unmappedM2 = totalM2 - knownM2
  if (unmappedM2 > 0) {
    rows.push({
      value: -1,
      label: tx.t('MapaResults.unclassified.classes'),
      color: theme.colors.textDim,
      areaHa: unmappedM2 / 10_000,
      pct: (unmappedM2 / totalM2) * 100,
    })
  }

  if (rows.length === 0) return null

  // Horizontal proportional bars (handoff): class label on the left, bar in the
  // class colour, share and hectares on the right.
  return (
    <CardBox title={t('areaByClass')} caption={caption} theme={theme}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map((r) => (
          <div key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              title={r.label}
              style={{
                width: 88, flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: theme.colors.text,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {r.label}
            </span>
            <div style={{ flex: 1, minWidth: 0, height: 8, borderRadius: 999, background: theme.colors.mist, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(r.pct, 1)}%`, height: '100%', borderRadius: 999, background: r.color }} />
            </div>
            <span style={{ width: 62, flexShrink: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: theme.colors.text }}>
                {formatNumber(r.pct, tx.locale, { maximumFractionDigits: 1 })}%
              </span>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: theme.colors.caption }}>
                {formatNumber(r.areaHa, tx.locale, { maximumFractionDigits: r.areaHa >= 100 ? 0 : 1 })} ha
              </span>
            </span>
          </div>
        ))}
      </div>
    </CardBox>
  )
}

// Continuous raster: numeric summary grid (not a chart)

function ContinuousStatsView({
  stats,
  unit,
  theme,
  caption,
  signedFlux,
}: {
  stats: ContinuousStats
  unit?: string
  theme: PlatformTheme
  caption?: string
  signedFlux?: boolean
}) {
  const t = useTranslations('MapaUiStatsChart')
  const tx = useMapaText()
  const fmt = (n: number | undefined): string => {
    if (n === undefined || !Number.isFinite(n)) return tx.t('MapaResults.format.notAvailable')
    const digits = Math.abs(n) >= 1000 ? 0 : Math.abs(n) >= 10 ? 1 : 2
    return formatNumber(n, tx.locale, { maximumFractionDigits: digits })
  }

  // The mean gets a highlighted hero card; the rest fill a 2x2 grid (handoff).
  //
  // A signed flux has no meaningful "Mínimo" (minimum): with the sign gone, a
  // minimum of 45,2 painted green reads as nonsense, and naming it "Maior
  // sequestro" would be false over an area that only emits, where `min` is
  // itself positive. "Menor fluxo" / "Maior fluxo" (lowest / highest flux) hold
  // either way, and each value states its own direction.
  const cells: { id: string; label: string; value: number | undefined; directional: boolean }[] = [
    { id: 'median', label: t('median'), value: stats.median, directional: true },
    { id: 'min', label: signedFlux ? t('lowestFlux') : t('minimum'), value: stats.min, directional: true },
    { id: 'max', label: signedFlux ? t('highestFlux') : t('maximum'), value: stats.max, directional: true },
    // A deviation is a spread, not a direction. Painting it green would claim
    // a sequestration the number never described.
    { id: 'std', label: t('deviation'), value: stats.std, directional: false },
  ]

  const c = theme.colors
  const eyebrow: React.CSSProperties = {
    fontSize: 12, fontWeight: 800, letterSpacing: '.14em',
    textTransform: 'uppercase', color: c.dim,
  }

  return (
    <div style={{
      background: c.accentBg,
      border: `1px solid ${c.accentBd}`,
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div>
        <div style={eyebrow}>{t('rasterStatistics')}</div>
        {caption && (
          <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginTop: 2 }}>{caption}</div>
        )}
      </div>

      {/* Hero: mean */}
      <div style={{
        background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 10,
        padding: '10px 12px', display: 'flex', gap: 8,
        alignItems: signedFlux ? 'flex-start' : 'baseline',
        // Same reason as FluxValue's own row: a long unit moves to its own line
        // whole rather than breaking inside itself.
        flexWrap: 'wrap',
      }}>
        {signedFlux ? (
          <FluxValue value={stats.mean} unit={unit} theme={theme} size={32} format={fmt} />
        ) : (
          <>
            <span style={{ fontSize: 32, fontWeight: 800, color: c.text, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(stats.mean)}
            </span>
            {unit && (
              <span style={{ fontSize: 16, fontWeight: 700, color: c.accent, whiteSpace: 'nowrap' }}>
                {unit}
              </span>
            )}
          </>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: c.dim }}>
          {t('mean')}
        </span>
      </div>

      {/* Median / min / max / deviation. `minmax(0, 1fr)` rather than `1fr`,
          for the reason StockReportView documents: a bare `1fr` floors the
          column at its content's min-content width, which overflows a column
          narrower than the results panel — such as the report's. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 6 }}>
        {cells.map((cell) => (
          <div key={cell.id} style={{
            background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 8, padding: '7px 10px',
          }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: c.dim }}>
              {cell.label}
            </div>
            {signedFlux && cell.directional && cell.value !== undefined ? (
              <FluxValue value={cell.value} theme={theme} size={22} format={fmt} />
            ) : (
              <div style={{ fontSize: 22, fontWeight: 800, color: c.text, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(cell.value)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11.5, fontWeight: 600, color: c.caption, textAlign: 'right' }}>
        {t('validPixels', { count: formatNumber(stats.count, tx.locale) })}
      </div>
    </div>
  )
}

// Time series (vertical bar chart over time)

/** "2024-06-01" -> "Jun 24" for compact axis ticks. */
function formatTickDate(dateStr: string, tx: MapaText): string {
  const [y, m] = dateStr.split('-')
  return `${monthShort(MONTHS[Number(m) - 1], tx)} ${y.slice(2)}`
}

/** "2024-06-01" -> "Junho 2024" ("June 2024") for tooltip headers. */
function formatFullDate(dateStr: string, tx: MapaText): string {
  const [y, m] = dateStr.split('-')
  return `${monthLabel(MONTHS[Number(m) - 1], tx)} ${y}`
}

interface TimeSeriesRow extends TimeSeriesPoint {
  color: string
  label: string  // class label or raw value fallback
}

function TimeSeriesChart({
  series,
  classes,
  theme,
  caption,
  animate = true,
  width,
}: {
  series: TimeSeriesPoint[]
  classes?: RasterClass[]
  theme: PlatformTheme
  caption?: string
  animate?: boolean
  width?: number
}) {
  const t = useTranslations('MapaUiStatsChart')
  const tx = useMapaText()
  const hasClasses = Boolean(classes?.length)

  if (series.length === 0) return null

  // Domain max: class max (categorical) or data max (continuous)
  const maxVal = hasClasses
    ? Math.max(...classes!.map((c) => c.value))
    : Math.max(...series.filter((p) => p.value !== null).map((p) => p.value!), 1)

  // Pre-resolve class metadata so the tooltip and cell fills can share it
  const rows: TimeSeriesRow[] = series.map((pt) => {
    const intVal = pt.value !== null ? Math.trunc(pt.value) : null
    const cls =
      hasClasses && intVal !== null
        ? classes!.find((c) => c.value === intVal)
        : null
    return {
      ...pt,
      color: cls?.color ?? theme.colors.accent,
      label: cls?.label ?? (pt.value !== null ? String(pt.value) : tx.t('MapaResults.format.notAvailable')),
    }
  })

  // Sample ticks so the axis doesn't overcrowd for long series (every Nth month)
  const tickInterval = rows.length > 12 ? Math.ceil(rows.length / 6) : 0

  // `ResponsiveContainer` measures its parent via `ResizeObserver`, which is
  // what the report path opts out of by passing a fixed `width` — see the
  // prop's doc comment on `StatsChartViewProps`. Either way it is the same
  // `LineChart`; only the wrapper, and whether the chart itself carries an
  // explicit size, differs.
  const chart = (
      <LineChart
        data={rows}
        width={width}
        height={width ? 220 : undefined}
        margin={{ top: 8, right: 12, left: -24, bottom: 4 }}
      >
        <XAxis
          dataKey="date"
          tickFormatter={(date: string) => formatTickDate(date, tx)}
          tick={{ fontSize: 11, fill: theme.colors.textDim }}
          stroke={theme.colors.border}
          tickLine={false}
          interval={tickInterval}
        />
        <YAxis
          domain={[0, maxVal]}
          tick={{ fontSize: 11, fill: theme.colors.textDim }}
          stroke={theme.colors.border}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: theme.colors.textDim, strokeDasharray: '3 3', opacity: 0.5 }}
          content={<TimeSeriesTooltip theme={theme} />}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={theme.colors.textDim}
          strokeWidth={1}
          strokeOpacity={0.4}
          connectNulls={false}
          isAnimationActive={animate}
          animationDuration={300}
          // Custom dot renderer, each point is colored by its class so
          // the reader sees both the trend (line) and the category (color).
          dot={(props: DotProps) => {
            const { cx, cy, payload } = props
            if (cx == null || cy == null || !payload || payload.value === null) {
              return <g key={payload?.date ?? String(cx)} />
            }
            return (
              <circle
                key={payload.date}
                cx={cx}
                cy={cy}
                r={4}
                fill={payload.color}
                stroke="#fff"
                strokeWidth={1.5}
              />
            )
          }}
          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
        />
      </LineChart>
  )

  return (
    <CardBox title={t('valueOverTime')} caption={caption} theme={theme}>
      <div style={{ width: width ?? '100%', height: 220, minWidth: 0 }}>
        {width ? chart : (
          <ResponsiveContainer width="100%" height="100%">
            {chart}
          </ResponsiveContainer>
        )}
      </div>
    </CardBox>
  )
}

/** Shape of the props Recharts passes to a custom `dot` renderer. */
interface DotProps {
  cx?: number
  cy?: number
  payload?: TimeSeriesRow
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TimeSeriesTooltip({ active, payload, theme }: any) {
  const tx = useMapaText()
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload as TimeSeriesRow
  return (
    <div
      style={{
        background: theme.colors.bgCard,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 6,
        padding: '6px 10px',
        fontFamily: "var(--font-raleway), sans-serif",
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.colors.text, marginBottom: 2 }}>
        {formatFullDate(row.date, tx)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: row.color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11.5, color: theme.colors.textDim }}>
          {row.label}
          {row.value !== null && `, ${row.value}`}
        </span>
      </div>
    </div>
  )
}
