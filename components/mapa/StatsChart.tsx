'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useStore } from '@/lib/mapa/store'
import StockReportView from './StockReportView'
import FluxValue from './FluxValue'
import type {
  RasterLayerConfig,
  RasterClass,
  RasterStatsResult,
  PlatformTheme,
  ContinuousStats,
  TimeSeriesPoint,
} from '@/types/mapa'

interface Props {
  theme: PlatformTheme
}

export interface StatsChartViewProps {
  theme:       PlatformTheme
  stats:       RasterStatsResult
  classes?:    RasterClass[]
  unit?:       string
  signedFlux?: boolean
  caption?:    string
}

/**
 * The charts with no store behind them: one result, one layer's metadata.
 *
 * The report needs this shape because it renders N sections at once, each with
 * its own layer, where "the visible raster" the store exposes means nothing.
 */
export function StatsChartView({
  theme, stats, classes, unit, signedFlux, caption,
}: StatsChartViewProps) {
  if (stats.kind === 'stocks') {
    return <StockReportView report={stats.report} theme={theme} caption={caption} />
  }
  if (stats.kind === 'timeseries') {
    return <TimeSeriesChart series={stats.series} classes={classes} theme={theme} caption={caption} />
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

export default function StatsChart({ theme }: Props) {
  const rasterStats    = useStore((s) => s.rasterStats)
  const layers         = useStore((s) => s.layers)
  const loadingLayers  = useStore((s) => s.loadingLayers)
  const statsLoading   = useStore((s) => s.statsLoading)
  const statsError     = useStore((s) => s.statsError)
  const analysisLabel  = useStore((s) => s.analysisLabel)

  // Show skeleton while any visible raster has a pending GEE fetch (tile
  // activation) OR a zonal-stats/point request is in flight.
  const activeRasterLoading =
    statsLoading ||
    layers.some((l) => l.type === 'raster' && l.visible && loadingLayers[l.id])

  // Caption naming what's being analysed: "<raster>, <feature>".
  const activeRaster = layers.find(
    (l): l is RasterLayerConfig => l.type === 'raster' && l.visible,
  )
  const caption = activeRaster
    ? `${activeRaster.name}${analysisLabel ? `, ${analysisLabel}` : ''}`
    : undefined

  if (!rasterStats) {
    if (activeRasterLoading) return <SkeletonChart theme={theme} />
    if (statsError) return <ErrorCard message={statsError} />
    return null
  }

  return (
    <StatsChartView
      theme={theme}
      stats={rasterStats}
      classes={activeRaster?.classes}
      unit={activeRaster?.unit}
      signedFlux={activeRaster?.signedFlux}
      caption={caption}
    />
  )
}

// Error card (stats request failed)

function ErrorCard({ message }: { message: string }) {
  return (
    <div
      style={{
        background: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 8,
        fontFamily: "var(--font-raleway), sans-serif",
        fontSize: 12,
        color: '#b91c1c',
        lineHeight: 1.4,
      }}
    >
      {message}
    </div>
  )
}

// Skeleton loader (animated placeholder while stats are loading)

function SkeletonChart({ theme }: { theme: PlatformTheme }) {
  return (
    <CardBox title="Carregando..." theme={theme}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {[60, 80, 45, 70, 55].map((width, i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{
              height: 10,
              width: `${width}%`,
              borderRadius: 3,
              background: theme.colors.bgCard,
            }}
          />
        ))}
      </div>
    </CardBox>
  )
}

// Shared card wrapper

function CardBox({
  title,
  caption,
  theme,
  children,
}: {
  title: string
  caption?: string
  theme: PlatformTheme
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: theme.colors.accentBg,
        border: `1px solid ${theme.colors.accent}`,
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        // `minWidth: 0` lets the card shrink to fit the flex parent
        // (ResultsSidebar). Without it, ResponsiveContainer can measure
        // the parent as -1 on first render and warn in the console.
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span
          style={{
            fontSize: 11,
            color: theme.colors.textDim,
            fontFamily: "var(--font-raleway), sans-serif",
          }}
        >
          {title}
        </span>
        {caption && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: theme.colors.text,
              fontFamily: "var(--font-raleway), sans-serif",
            }}
          >
            {caption}
          </span>
        )}
      </div>
      {children}
    </div>
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
      label: 'Não classificadas',
      color: theme.colors.textDim,
      areaHa: unmappedM2 / 10_000,
      pct: (unmappedM2 / totalM2) * 100,
    })
  }

  if (rows.length === 0) return null

  // Horizontal proportional bars (handoff): class label on the left, bar in the
  // class colour, share and hectares on the right.
  return (
    <CardBox title="Área por classe" caption={caption} theme={theme}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map((r) => (
          <div key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              title={r.label}
              style={{
                width: 88, flexShrink: 0, fontSize: 11, fontWeight: 600, color: theme.colors.text,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {r.label}
            </span>
            <div style={{ flex: 1, minWidth: 0, height: 8, borderRadius: 999, background: theme.colors.mist, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(r.pct, 1)}%`, height: '100%', borderRadius: 999, background: r.color }} />
            </div>
            <span style={{ width: 62, flexShrink: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: theme.colors.text }}>
                {r.pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
              </span>
              <span style={{ display: 'block', fontSize: 9.5, fontWeight: 600, color: theme.colors.caption }}>
                {r.areaHa.toLocaleString('pt-BR', { maximumFractionDigits: r.areaHa >= 100 ? 0 : 1 })} ha
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
  const fmt = (n: number | undefined): string => {
    if (n === undefined || !Number.isFinite(n)) return 'n/d'
    const digits = Math.abs(n) >= 1000 ? 0 : Math.abs(n) >= 10 ? 1 : 2
    return n.toLocaleString('pt-BR', { maximumFractionDigits: digits })
  }

  // The mean gets a highlighted hero card; the rest fill a 2x2 grid (handoff).
  //
  // A signed flux has no meaningful "Mínimo": with the sign gone, a minimum of
  // 45,2 painted green reads as nonsense, and naming it "Maior sequestro"
  // would be false over an area that only emits, where `min` is itself
  // positive. "Menor fluxo" / "Maior fluxo" hold either way, and each value
  // states its own direction.
  const cells: { label: string; value: number | undefined; directional: boolean }[] = [
    { label: 'Mediana', value: stats.median, directional: true },
    { label: signedFlux ? 'Menor fluxo' : 'Mínimo', value: stats.min, directional: true },
    { label: signedFlux ? 'Maior fluxo' : 'Máximo', value: stats.max, directional: true },
    // A deviation is a spread, not a direction. Painting it green would claim
    // a sequestration the number never described.
    { label: 'Desvio',  value: stats.std, directional: false },
  ]

  const c = theme.colors
  const eyebrow: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em',
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
        <div style={eyebrow}>Estatísticas do raster</div>
        {caption && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: c.text, marginTop: 2 }}>{caption}</div>
        )}
      </div>

      {/* Hero: mean */}
      <div style={{
        background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 10,
        padding: '10px 12px', display: 'flex', gap: 8,
        alignItems: signedFlux ? 'flex-start' : 'baseline',
      }}>
        {signedFlux ? (
          <FluxValue value={stats.mean} unit={unit} theme={theme} size={32} format={fmt} />
        ) : (
          <>
            <span style={{ fontSize: 32, fontWeight: 800, color: c.text, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(stats.mean)}
            </span>
            {unit && <span style={{ fontSize: 15, fontWeight: 700, color: c.accent }}>{unit}</span>}
          </>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: c.dim }}>
          média
        </span>
      </div>

      {/* Median / min / max / deviation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {cells.map((cell) => (
          <div key={cell.label} style={{
            background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 8, padding: '7px 10px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: c.dim }}>
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

      <div style={{ fontSize: 10, fontWeight: 600, color: c.caption, textAlign: 'right' }}>
        {stats.count.toLocaleString('pt-BR')} pixels válidos
      </div>
    </div>
  )
}

// Time series (vertical bar chart over time)

const MONTH_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

const MONTH_LONG = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/** "2024-06-01" -> "Jun 24" for compact axis ticks. */
function formatTickDate(dateStr: string): string {
  const [y, m] = dateStr.split('-')
  return `${MONTH_SHORT[Number(m) - 1]} ${y.slice(2)}`
}

/** "2024-06-01" -> "Junho 2024" for tooltip headers. */
function formatFullDate(dateStr: string): string {
  const [y, m] = dateStr.split('-')
  return `${MONTH_LONG[Number(m) - 1]} ${y}`
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
}: {
  series: TimeSeriesPoint[]
  classes?: RasterClass[]
  theme: PlatformTheme
  caption?: string
}) {
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
      label: cls?.label ?? (pt.value !== null ? String(pt.value) : 'n/d'),
    }
  })

  // Sample ticks so the axis doesn't overcrowd for long series (every Nth month)
  const tickInterval = rows.length > 12 ? Math.ceil(rows.length / 6) : 0

  return (
    <CardBox title="Valor ao longo do tempo" caption={caption} theme={theme}>
      <div style={{ width: '100%', height: 220, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 8, right: 12, left: -24, bottom: 4 }}
          >
            <XAxis
              dataKey="date"
              tickFormatter={formatTickDate}
              tick={{ fontSize: 9, fill: theme.colors.textDim }}
              stroke={theme.colors.border}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              domain={[0, maxVal]}
              tick={{ fontSize: 9, fill: theme.colors.textDim }}
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
        </ResponsiveContainer>
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
      <div style={{ fontSize: 11, fontWeight: 600, color: theme.colors.text, marginBottom: 2 }}>
        {formatFullDate(row.date)}
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
        <span style={{ fontSize: 10, color: theme.colors.textDim }}>
          {row.label}
          {row.value !== null && `, ${row.value}`}
        </span>
      </div>
    </div>
  )
}
