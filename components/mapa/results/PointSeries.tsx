'use client'

// The yearly series at a clicked point, in the results panel. The report's
// TimeSeriesChart labels ticks by month and draws class codes as a line; here
// a class series is a strip of colored years, fire is the years with fire, and
// any other value is a yearly line with its mean and the selected year marked.

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { ResultProfile } from '@/config/mapa/resultProfiles'
import { adaptive } from '@/lib/mapa/results/format'
import { useMapaText } from '@/lib/mapa/useMapaText'
import { localizeLayer } from '@/lib/mapa/text'
import { localizeProfile } from '@/config/mapa/resultProfiles'
import type { PlatformTheme, RasterLayerConfig, TimeSeriesPoint } from '@/types/mapa'
import { Empty, Footnote, Hero, Pair, Stack } from './blocks'
import { sourceOf } from './LayerResultView'

interface Props {
  theme:         PlatformTheme
  layer:         RasterLayerConfig
  profile:       ResultProfile
  series:        TimeSeriesPoint[]
  temporalDate?: string
}

interface YearValue {
  year:  number
  value: number | null
}

export default function PointSeries({ theme, layer: rawLayer, profile: rawProfile, series, temporalDate }: Props) {
  const t = useTranslations('MapaOvResults')
  const tx = useMapaText()
  // Both are idempotent, so a parent that already localized them is harmless.
  const layer = useMemo(() => localizeLayer(rawLayer, tx), [rawLayer, tx])
  const profile = useMemo(() => localizeProfile(rawLayer.id, rawProfile, tx), [rawLayer.id, rawProfile, tx])
  const points: YearValue[] = series.map((p) => ({ year: Number(p.date.slice(0, 4)), value: p.value }))
  const selected = temporalDate ? Number(temporalDate.slice(0, 4)) : points[points.length - 1]?.year

  let body: React.ReactNode
  if (points.length === 0) {
    body = <Empty theme={theme} text={t('series.noData')} />
  } else if (profile.archetype === 'composition') {
    body = <ClassStrip theme={theme} layer={layer} points={points} selected={selected} />
  } else if (profile.archetype === 'recurrence') {
    body = <FireYears theme={theme} points={points} selected={selected} />
  } else {
    const unit = profile.archetype === 'annual' ? profile.unit : layer.unit
    body = <YearLine theme={theme} points={points} selected={selected} unit={unit} />
  }

  return (
    <Stack>
      {body}
      <Footnote theme={theme} notes={[sourceOf(layer, tx)]} />
    </Stack>
  )
}

function Strip({ theme, title, cells, selected }: {
  theme: PlatformTheme
  title: string
  cells: { year: number; color: string; title: string }[]
  selected?: number
}) {
  const c = theme.colors
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: c.text }}>{title}</h3>
      <div>
        <div style={{ display: 'flex', gap: 1, height: 24 }}>
          {cells.map((cell) => (
            <div
              key={cell.year}
              title={cell.title}
              style={{
                flex: 1, minWidth: 0, background: cell.color, borderRadius: 2,
                outline: cell.year === selected ? `2px solid ${c.text}` : undefined,
                outlineOffset: cell.year === selected ? 1 : undefined,
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: c.textDim, marginTop: 6 }}>
          <span>{cells[0]?.year}</span>
          <span>{cells[cells.length - 1]?.year}</span>
        </div>
      </div>
    </section>
  )
}

function ClassStrip({ theme, layer, points, selected }: {
  theme: PlatformTheme; layer: RasterLayerConfig; points: YearValue[]; selected?: number
}) {
  const t = useTranslations('MapaOvResults')
  const byCode = new Map((layer.classes ?? []).map((k) => [k.value, k]))
  const classOf = (v: number | null) => (v === null ? undefined : byCode.get(Math.round(v)))
  // A point outside the classified area comes back as one null per year.
  const known = points.filter((p) => p.value !== null)
  if (known.length === 0) return <Empty theme={theme} text={t('series.noData')} />
  const current = points.find((p) => p.year === selected)
  const currentClass = classOf(current?.value ?? null)
  // A year without data is not a change of class.
  const changes = known.filter((p, i) => i > 0 && classOf(p.value) !== classOf(known[i - 1].value)).length

  return (
    <>
      <Hero theme={theme} caption={t('series.classCaption', { year: selected ?? '' })}>
        <span style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1, color: theme.colors.text }}>
          {currentClass?.label ?? t('series.noDataShort')}
        </span>
      </Hero>
      <Pair theme={theme} items={[{ label: t('series.classChanges'), value: String(changes) }]} />
      <Strip theme={theme} title={t('series.classByYear')} selected={selected} cells={points.map((p) => {
        const cls = classOf(p.value)
        return { year: p.year, color: cls?.color ?? theme.colors.chip, title: cls ? t('series.cellClass', { year: p.year, label: cls.label }) : t('series.cellNoData', { year: p.year }) }
      })} />
    </>
  )
}

function FireYears({ theme, points, selected }: { theme: PlatformTheme; points: YearValue[]; selected?: number }) {
  const t = useTranslations('MapaOvResults')
  // The accumulated count is masked where the point never burned, so a gap
  // reads as zero; a year with fire is a year where the count went up.
  const counts = points.map((p) => ({ year: p.year, count: p.value ?? 0 }))
  const fired = new Set(counts.filter((p, i) => p.count > (i > 0 ? counts[i - 1].count : 0)).map((p) => p.year))
  const upTo = counts.filter((p) => selected === undefined || p.year <= selected)
  const countAtSelected = upTo[upTo.length - 1]?.count ?? 0
  const lastFire = [...fired].filter((y) => selected === undefined || y <= selected).pop()

  return (
    <>
      <Hero
        theme={theme}
        value={String(Math.round(countAtSelected))}
        caption={selected === undefined || selected === counts[counts.length - 1]?.year ? t('series.fireCaption') : t('series.fireCaptionUntil', { year: selected })}
      />
      <Pair theme={theme} items={[{ label: t('series.lastFire'), value: lastFire ? String(lastFire) : t('series.none') }]} />
      <Strip theme={theme} title={t('series.fireYears')} selected={selected} cells={counts.map((p) => ({
        year: p.year,
        color: fired.has(p.year) ? theme.colors.terracota : theme.colors.chip,
        title: fired.has(p.year) ? t('series.cellBurned', { year: p.year }) : t('series.cellNoFire', { year: p.year }),
      }))} />
    </>
  )
}

function YearLine({ theme, points, selected, unit }: {
  theme: PlatformTheme; points: YearValue[]; selected?: number; unit?: string
}) {
  const c = theme.colors
  const t = useTranslations('MapaOvResults')
  const tx = useMapaText()
  const valid = points.filter((p): p is { year: number; value: number } => p.value !== null)
  if (valid.length === 0) return <Empty theme={theme} text={t('series.noData')} />

  const mean = valid.reduce((s, p) => s + p.value, 0) / valid.length
  const min = valid.reduce((a, p) => (p.value < a.value ? p : a))
  const max = valid.reduce((a, p) => (p.value > a.value ? p : a))
  const current = points.find((p) => p.year === selected)?.value ?? null
  const u = unit ? ` ${unit}` : ''

  return (
    <>
      <Hero
        theme={theme}
        value={current === null ? t('series.noDataShort') : adaptive(current, tx)}
        unit={current === null ? undefined : unit || undefined}
        caption={t('series.lineCaption', { year: selected ?? '' })}
      />
      <Pair theme={theme} items={[
        { label: t('series.periodMean'), value: adaptive(mean, tx), aside: unit || undefined },
        { label: t('series.lowestHighest'), value: t('series.range', { min: adaptive(min.value, tx), max: adaptive(max.value, tx) }), aside: unit || undefined },
      ]} />
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: c.text }}>{t('series.valueByYear')}</h3>
        <div style={{ width: '100%', height: 170, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
              <XAxis
                dataKey="year" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false}
                tick={{ fontSize: 11, fill: c.textDim }} stroke={c.border} tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']} tickFormatter={(v: number) => adaptive(v, tx)}
                tick={{ fontSize: 11, fill: c.textDim }} stroke={c.border} tickLine={false} width={48}
              />
              <ReferenceLine y={mean} stroke={c.textDim} strokeDasharray="3 3" />
              {selected !== undefined && <ReferenceLine x={selected} stroke={c.accent} strokeWidth={1.5} />}
              <Tooltip
                formatter={(v) => [`${adaptive(Number(v), tx)}${u}`, t('series.tooltipValue')]}
                labelFormatter={(y) => String(y)}
                contentStyle={{ fontSize: 12, borderRadius: 6, border: `1px solid ${c.border}`, backgroundColor: c.bgCard, color: c.text }}
                itemStyle={{ color: c.text }}
              />
              <Line type="linear" dataKey="value" stroke={c.accent} strokeWidth={1.8} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  )
}
