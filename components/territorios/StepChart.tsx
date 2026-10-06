// The chart of each theme step, and its compact bar on the final sheet: the
// chart inputs of storyValues.ts with the labels of CHART_SCRIPT. On the biome
// itself there is nothing to compare with, so the single row is the Caatinga.

import ComparisonBar from './charts/ComparisonBar'
import Dumbbell from './charts/Dumbbell'
import LevelsBar, { type Level } from './charts/LevelsBar'
import YearBars from './charts/YearBars'
import YearStrip from './charts/YearStrip'
import { FIRE_COLORS, FLUX_COLORS, LAND_USE_COLORS, STEP_COLORS } from '@/config/territorios/palette'
import { LAND_USE_YEARS, type TerritoryType } from '@/config/territorios/story'
import { CHART_SCRIPT, RAIN_KIND_LABELS } from '@/config/territorios/storyScript'
import {
  chartMax,
  fireChart,
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
  FireRecurrenceShares,
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

const FIRE_LEVELS: Level[] = (['never', 'once', 'twoToFour', 'fivePlus'] as const).map((key) => ({
  key, name: CHART_SCRIPT.fogo.levels[key], color: FIRE_COLORS[key],
}))

function recurrenceText(shares: FireRecurrenceShares): string {
  return FIRE_LEVELS
    .map((l) => `${l.name.toLowerCase()} ${formatPercent(shares[l.key as keyof FireRecurrenceShares])}`)
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

    case 'fogo': {
      const data = dataOf(response, 'fogo')
      const chart = data && fireChart(data, territory)
      if (!chart) return null
      // Fire reaches a few percent of most territories, which a 0-100 track
      // draws as a sliver; Bar's default scale ends at a round number past both
      // values, and the printed figures carry the magnitude.
      const share = <Bar {...bar} value={chart.burnedShare} label={CHART_SCRIPT.fogo.share} format={formatPercent} color={STEP_COLORS.fogo} />
      if (compact) return share

      const peak = chart.years.find((y) => y.year === chart.peakYear)
      const reference = alone ? null : chart.referenceMeanPct
      const rows = [{ label: alone ? CHART_SCRIPT.biome : CHART_SCRIPT.here, shares: chart.recurrence.here }]
      if (!alone && chart.recurrence.reference) rows.push({ label: CHART_SCRIPT.biome, shares: chart.recurrence.reference })
      return (
        <div className="territorios-graficos">
          {share}
          <YearBars
            years={chart.years}
            peakYear={chart.peakYear}
            reference={reference}
            color={STEP_COLORS.fogo}
            description={CHART_SCRIPT.fogo.years(
              peak ? CHART_SCRIPT.fogo.peak(peak.year, formatPercent(peak.sharePct)) : null,
              reference === null ? null : formatPercent(reference),
            )}
          />
          <LevelsBar
            levels={FIRE_LEVELS}
            rows={rows.map((r) => ({ label: r.label, shares: { ...r.shares } }))}
            description={CHART_SCRIPT.fogo.recurrence(
              rows.map((r) => CHART_SCRIPT.fogo.row(r.label, recurrenceText(r.shares))).join(' '),
            )}
          />
        </div>
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
