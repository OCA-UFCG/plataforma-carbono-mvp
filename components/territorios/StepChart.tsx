// The chart of each theme step, and its compact bar on the final sheet: the
// chart inputs of storyValues.ts with the labels of CHART_SCRIPT. On the biome
// itself there is nothing to compare with, so the single row is the Caatinga.

import ComparisonBar from './charts/ComparisonBar'
import Dumbbell from './charts/Dumbbell'
import LevelsBar from './charts/LevelsBar'
import YearStrip from './charts/YearStrip'
import { FLUX_COLORS, LAND_USE_COLORS, STEP_COLORS } from '@/config/territorios/palette'
import { LAND_USE_YEARS, type TerritoryType } from '@/config/territorios/story'
import { CHART_SCRIPT, RAIN_KIND_LABELS } from '@/config/territorios/storyScript'
import {
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
  const reference = alone ? null : value.reference
  return (
    <ComparisonBar
      here={value.here}
      reference={reference}
      max={max ?? chartMax(value.here, reference)}
      format={format}
      color={color}
      label={compact || untitled ? undefined : label}
      hereLabel={alone ? CHART_SCRIPT.biome : CHART_SCRIPT.here}
      compact={compact}
      description={CHART_SCRIPT.compare(label, format(value.here), reference === null ? null : format(reference))}
    />
  )
}

function levelsText(shares: DegradationShare[]): string {
  return shares
    .map((s) => `${CHART_SCRIPT.degradacao.levels[s.code]} ${formatPercent(s.pct)}`)
    .join(', ')
}

function rainStripText(data: RainChartData): string {
  const count = (kind: string) => data.years.filter((y) => y.kind === kind).length
  const year = data.years.find((y) => y.year === data.highlightYear)
  const highlight = year && year.valueMm !== null && year.kind
    ? CHART_SCRIPT.chuva.year(year.year, RAIN_KIND_LABELS[year.kind].toLowerCase(), formatNumber(year.valueMm))
    : CHART_SCRIPT.chuva.noYear(data.highlightYear)
  return `${CHART_SCRIPT.chuva.strip(count('seco'), count('normal'), count('chuvoso'))} ${highlight}`
}

export default function StepChart({ theme, response, territory, type, compact = false }: StepChartProps) {
  const alone = type.id === 'bioma'
  const bar = { alone, compact }

  switch (theme) {
    case 'estoque': {
      const data = dataOf(response, 'estoque')
      const chart = data && stockChart(data.report, territory)
      if (!chart) return null
      return <Bar {...bar} value={chart.density} label={CHART_SCRIPT.estoque} untitled format={formatNumber} color={STEP_COLORS.estoque} />
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
          label={CHART_SCRIPT.fluxoPerHa}
          format={formatNumber}
          color={m.direction === 'emission' ? FLUX_COLORS.emission : FLUX_COLORS.removal}
        />
      )
      // The sheet compares the flux per hectare with trees, as its row does.
      if (compact) return perHa || null
      return (
        <div className="territorios-graficos">
          <Bar {...bar} value={chart.forestShare} label={CHART_SCRIPT.fluxoShare} format={formatPercent} color={STEP_COLORS.fluxo} max={100} />
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
            label={CHART_SCRIPT.uso.share}
            format={formatPercent}
            color={LAND_USE_COLORS.nativa}
            max={100}
          />
        )
      }
      const rows = [{ label: alone ? CHART_SCRIPT.biome : CHART_SCRIPT.here, ...chart.here }]
      if (!alone && chart.reference) rows.push({ label: CHART_SCRIPT.biome, ...chart.reference })
      return (
        <Dumbbell
          rows={rows}
          fromLabel={FIRST_YEAR}
          toLabel={LAST_YEAR}
          color={LAND_USE_COLORS.nativa}
          format={formatPercent}
          description={CHART_SCRIPT.uso.description(
            rows.map((r) => CHART_SCRIPT.uso.row(r.label, formatPercent(r.from), formatPercent(r.to))).join(' '),
          )}
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
            label={CHART_SCRIPT.degradacao.share}
            format={formatPercent}
            color={STEP_COLORS.degradacao}
            max={100}
          />
        )
      }
      const chart = degradationChart(data, territory)
      if (!chart) return null
      const rows = [{ label: alone ? CHART_SCRIPT.biome : CHART_SCRIPT.here, shares: chart.here }]
      if (!alone && chart.reference) rows.push({ label: CHART_SCRIPT.biome, shares: chart.reference })
      return (
        <LevelsBar
          rows={rows}
          description={CHART_SCRIPT.degradacao.description(
            rows.map((r) => CHART_SCRIPT.degradacao.row(r.label, levelsText(r.shares))).join(' '),
          )}
        />
      )
    }

    case 'chuva': {
      const data = dataOf(response, 'chuva')
      const chart = data && rainChart(data.series, territory)
      if (!chart) return null
      const mean = <Bar {...bar} value={chart.mean} label={CHART_SCRIPT.chuva.mean} format={formatNumber} color={STEP_COLORS.chuva} />
      if (compact) return mean
      return (
        <div className="territorios-graficos">
          <YearStrip data={chart} description={rainStripText(chart)} />
          {mean}
        </div>
      )
    }
  }
}
