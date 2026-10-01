// The chart of each theme step, and its compact bar on the final sheet: the
// chart inputs of storyValues.ts with the labels of TerritoriosCharts.json. On the biome
// itself there is nothing to compare with, so the single row is the Caatinga.

import { useTranslations } from 'next-intl'
import ComparisonBar from './charts/ComparisonBar'
import Dumbbell from './charts/Dumbbell'
import LevelsBar from './charts/LevelsBar'
import YearStrip from './charts/YearStrip'
import { useStoryFmt } from './useStoryFmt'
import { FLUX_COLORS, LAND_USE_COLORS, STEP_COLORS } from '@/config/territorios/palette'
import { LAND_USE_YEARS, RAIN_FIRST_YEAR, RAIN_LAST_YEAR, type TerritoryType } from '@/config/territorios/story'
import type { Fmt } from '@/lib/territorios/i18n'
import {
  DEGRADATION_KEYS,
  chartMax,
  degradationChart,
  degradedShareOf,
  degradationSharesPct,
  fluxChart,
  fluxMetrics,
  formatNumber,
  formatPercent,
  landUseChart,
  rainChart,
  stockChart,
} from '@/lib/territorios/storyValues'
import type {
  Comparison,
  DegradationShare,
  RainChartData,
  TerritoryPayload,
  ThemeData,
  ThemeId,
  ThemeResponse,
} from '@/types/territorios'

export interface StepChartProps {
  theme:     ThemeId
  response:  ThemeResponse
  territory: TerritoryPayload
  type:      TerritoryType
  /** The one bar of the final sheet, in place of the step's chart. */
  compact?:  boolean
}

const [FIRST_YEAR, LAST_YEAR] = LAND_USE_YEARS

function dataOf<K extends ThemeId>(response: ThemeResponse, theme: K): Extract<ThemeData, { theme: K }> | null {
  if (response.status !== 'available' || response.data?.theme !== theme) return null
  return response.data as Extract<ThemeData, { theme: K }>
}

type ChartT = (key: string, values?: Record<string, string | number>) => string

function Bar({ value, label, untitled = false, format, color, max, alone, compact }: {
  value:   Comparison
  /** Title above the bar, and the start of its accessible description. */
  label:   string
  /** Only the description carries the label: the figure above already says it. */
  untitled?: boolean
  format:  (n: number) => string
  color:   string
  max?:    number
  /** The biome itself: no marker, and the bar is the Caatinga's. */
  alone:   boolean
  compact: boolean
}) {
  const t = useTranslations('TerritoriosCharts')
  const reference = alone ? null : value.reference
  const here = format(value.here)
  return (
    <ComparisonBar
      here={value.here}
      reference={reference}
      max={max ?? chartMax(value.here, reference)}
      format={format}
      color={color}
      label={compact || untitled ? undefined : label}
      hereLabel={alone ? t('biome') : t('here')}
      compact={compact}
      description={
        reference === null
          ? t('compare.alone', { label, here })
          : t('compare.withBiome', { label, here, biome: format(reference) })
      }
    />
  )
}

function levelsText(shares: DegradationShare[], t: ChartT, fmt: Fmt): string {
  return shares
    .map((s) => `${t(`degradacao.levels.${DEGRADATION_KEYS[s.code]}`)} ${formatPercent(s.pct, fmt)}`)
    .join(', ')
}

function rainStripText(data: RainChartData, t: ChartT, fmt: Fmt): string {
  const count = (kind: string) => data.years.filter((y) => y.kind === kind).length
  const year = data.years.find((y) => y.year === data.highlightYear)
  const highlight = year && year.valueMm !== null && year.kind
    ? t('chuva.year', {
      year: year.year,
      kind: t(`rainKinds.${year.kind}`).toLowerCase(),
      mm: formatNumber(year.valueMm, fmt),
    })
    : t('chuva.noYear', { year: data.highlightYear })
  const strip = t('chuva.strip', {
    first: RAIN_FIRST_YEAR,
    last: RAIN_LAST_YEAR,
    dry: count('seco'),
    normal: count('normal'),
    wet: count('chuvoso'),
  })
  return `${strip} ${highlight}`
}

export default function StepChart({ theme, response, territory, type, compact = false }: StepChartProps) {
  const chartText = useTranslations('TerritoriosCharts')
  const t: ChartT = (key, values) => chartText(key, values)
  const fmt = useStoryFmt()
  const formatNumberHere = (n: number) => formatNumber(n, fmt)
  const formatPercentHere = (n: number) => formatPercent(n, fmt)
  const alone = type.id === 'bioma'
  const bar = { alone, compact }

  switch (theme) {
    case 'estoque': {
      const data = dataOf(response, 'estoque')
      const chart = data && stockChart(data.report, territory)
      if (!chart) return null
      return <Bar {...bar} value={chart.density} label={t('estoque')} untitled format={formatNumberHere} color={STEP_COLORS.estoque} />
    }

    case 'fluxo': {
      const data = dataOf(response, 'fluxo')
      const chart = data && fluxChart(data, territory)
      const m = data && fluxMetrics(data)
      if (!chart || !m) return null
      const perHa = chart.perForestHa && (
        <Bar
          {...bar}
          value={chart.perForestHa}
          label={t('fluxoPerHa')}
          format={formatNumberHere}
          color={m.direction === 'emission' ? FLUX_COLORS.emission : FLUX_COLORS.removal}
        />
      )
      // The sheet compares the flux per hectare with trees, as its row does.
      if (compact) return perHa || null
      return (
        <div className="territorios-graficos">
          <Bar {...bar} value={chart.forestShare} label={t('fluxoShare')} format={formatPercentHere} color={STEP_COLORS.fluxo} max={100} />
          {perHa}
        </div>
      )
    }

    case 'uso': {
      const data = dataOf(response, 'uso')
      const chart = data && landUseChart(data, territory)
      if (!chart) return null
      if (compact) {
        return (
          <Bar
            {...bar}
            value={{ here: chart.here.to, reference: chart.reference?.to ?? null }}
            label={t('uso.share', { year: LAST_YEAR })}
            format={formatPercentHere}
            color={LAND_USE_COLORS.nativa}
            max={100}
          />
        )
      }
      const rows = [{ label: alone ? t('biome') : t('here'), ...chart.here }]
      if (!alone && chart.reference) rows.push({ label: t('biome'), ...chart.reference })
      return (
        <Dumbbell
          rows={rows}
          fromLabel={FIRST_YEAR}
          toLabel={LAST_YEAR}
          color={LAND_USE_COLORS.nativa}
          format={formatPercentHere}
          description={t('uso.description', {
            first: FIRST_YEAR,
            last: LAST_YEAR,
            rows: rows.map((r) => t('uso.row', { name: r.label, from: formatPercentHere(r.from), to: formatPercentHere(r.to) })).join(' '),
          })}
        />
      )
    }

    case 'degradacao': {
      const data = dataOf(response, 'degradacao')
      if (!data || response.origin === 'point') return null
      if (compact) {
        const shares = degradationSharesPct(data)
        if (!shares) return null
        return (
          <Bar
            {...bar}
            value={{ here: degradedShareOf(shares), reference: territory.biome.degradedSharePct }}
            label={t('degradacao.share')}
            format={formatPercentHere}
            color={STEP_COLORS.degradacao}
            max={100}
          />
        )
      }
      const chart = degradationChart(data, territory)
      if (!chart) return null
      const rows = [{ label: alone ? t('biome') : t('here'), shares: chart.here }]
      if (!alone && chart.reference) rows.push({ label: t('biome'), shares: chart.reference })
      return (
        <LevelsBar
          rows={rows}
          description={t('degradacao.description', {
            rows: rows.map((r) => t('degradacao.row', { name: r.label, parts: levelsText(r.shares, t, fmt) })).join(' '),
          })}
        />
      )
    }

    case 'chuva': {
      const data = dataOf(response, 'chuva')
      const chart = data && rainChart(data.series, territory)
      if (!chart) return null
      const mean = <Bar {...bar} value={chart.mean} label={t('chuva.mean')} format={formatNumberHere} color={STEP_COLORS.chuva} />
      if (compact) return mean
      return (
        <div className="territorios-graficos">
          <YearStrip data={chart} description={rainStripText(chart, t, fmt)} />
          {mean}
        </div>
      )
    }
  }
}
