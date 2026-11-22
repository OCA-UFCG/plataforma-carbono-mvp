// The charts of each theme step, each under its question: the chart inputs of
// storyValues.ts with the labels of CHART_SCRIPT. On the biome itself there is
// nothing to compare with, so the single row is the Caatinga.

import type { ReactNode } from 'react'
import ComparisonBar from './charts/ComparisonBar'
import LevelsBar, { type Level } from './charts/LevelsBar'
import PairBars from './charts/PairBars'
import RainClassBar from './charts/RainClassBar'
import YearBars from './charts/YearBars'
import YearLines, { type YearLine } from './charts/YearLines'
import YearStrip from './charts/YearStrip'
import {
  FIRE_COLORS,
  FLUX_COLORS,
  LAND_USE_COLORS,
  PAIR_REFERENCE_COLOR,
  REFERENCE_COLOR,
  STEP_COLORS,
} from '@/config/territorios/palette'
import type { TerritoryType } from '@/config/territorios/story'
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
  /** Heading level of each chart's question: 4 in a tab, 5 in the summary. */
  titleLevel?: 4 | 5
}

/** A chart under the question it answers, a heading level below the step's own. */
function Titled({ title, level, children }: { title: string; level: 4 | 5; children: ReactNode }) {
  const Heading = level === 4 ? 'h4' : 'h5'
  return (
    <div className="territorios-grafico">
      <Heading className="territorios-grafico-titulo">{title}</Heading>
      {children}
    </div>
  )
}

function dataOf<K extends ThemeId>(response: ThemeResponse, theme: K): Extract<ThemeData, { theme: K }> | null {
  if (response.status !== 'available' || response.data?.theme !== theme) return null
  return response.data as Extract<ThemeData, { theme: K }>
}

function Bar({ value, label, format, color, max, alone }: {
  value:   Comparison
  /** Title above the bar, and the start of its accessible description. */
  label:   string
  format:  (n: number) => string
  color:   string
  max?:    number
  /** The biome itself: no marker, and the bar is the Caatinga's. */
  alone:   boolean
}) {
  const reference = alone ? null : value.reference
  return (
    <ComparisonBar
      here={value.here}
      reference={reference}
      max={max ?? chartMax(value.here, reference)}
      format={format}
      color={color}
      label={label}
      hereLabel={alone ? CHART_SCRIPT.biome : CHART_SCRIPT.here}
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

/** The year's place among the territory's own classes; null without the year. */
function rainClass(data: RainChartData, alone: boolean): ReactNode {
  const year = data.years.find((y) => y.year === data.highlightYear)
  const values = data.years.flatMap((y) => (y.valueMm === null ? [] : [y.valueMm]))
  if (!year || year.valueMm === null || !year.kind || values.length === 0) return null

  const { lowMm: low, highMm: high } = data.terciles
  const [lowText, highText] = [formatNumber(low), formatNumber(high)]
  const bands = CHART_SCRIPT.chuva.bands
  return (
    <RainClassBar
      valueMm={year.valueMm}
      lowMm={low}
      highMm={high}
      minMm={Math.min(...values)}
      maxMm={Math.max(...values)}
      bands={{
        seco:    { name: RAIN_KIND_LABELS.seco, range: bands.seco(lowText) },
        normal:  { name: RAIN_KIND_LABELS.normal, range: bands.normal(lowText, highText) },
        chuvoso: { name: RAIN_KIND_LABELS.chuvoso, range: bands.chuvoso(highText) },
      }}
      markerLabel={alone ? CHART_SCRIPT.biome : CHART_SCRIPT.here}
      description={CHART_SCRIPT.chuva.classDescription(
        year.year, RAIN_KIND_LABELS[year.kind].toLowerCase(), formatNumber(year.valueMm), lowText, highText,
      )}
    />
  )
}

function rainStripText(data: RainChartData): string {
  const count = (kind: string) => data.years.filter((y) => y.kind === kind).length
  const year = data.years.find((y) => y.year === data.highlightYear)
  const highlight = year && year.valueMm !== null && year.kind
    ? CHART_SCRIPT.chuva.year(year.year, RAIN_KIND_LABELS[year.kind].toLowerCase(), formatNumber(year.valueMm))
    : CHART_SCRIPT.chuva.noYear(data.highlightYear)
  return `${CHART_SCRIPT.chuva.strip(count('seco'), count('normal'), count('chuvoso'))} ${highlight}`
}

export default function StepChart({ theme, response, territory, type, titleLevel = 4 }: StepChartProps) {
  const alone = type.id === 'bioma'
  const bar = { alone }

  switch (theme) {
    case 'estoque': {
      const data = dataOf(response, 'estoque')
      const chart = data && stockChart(data.report, territory)
      if (!chart) return null
      const { here, reference } = chart.density
      const rows = [{ label: alone ? CHART_SCRIPT.biome : CHART_SCRIPT.here, value: here, color: STEP_COLORS.estoque }]
      if (!alone && reference !== null) rows.push({ label: CHART_SCRIPT.biome, value: reference, color: PAIR_REFERENCE_COLOR })
      return (
        <Titled level={titleLevel} title={CHART_SCRIPT.titles.estoque}>
          <PairBars
            rows={rows}
            max={chartMax(here, alone ? null : reference)}
            format={(n) => `${formatNumber(n)} ${CHART_SCRIPT.estoquePerHa}`}
            description={CHART_SCRIPT.compare(CHART_SCRIPT.estoque, formatNumber(here), alone || reference === null ? null : formatNumber(reference))}
          />
        </Titled>
      )
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
      const rows = [{ label: alone ? CHART_SCRIPT.biome : CHART_SCRIPT.here, ...chart.here }]
      const lines: YearLine[] = [{ label: rows[0].label, color: LAND_USE_COLORS.nativa, points: chart.series.here }]
      if (!alone && chart.reference && chart.series.reference) {
        rows.push({ label: CHART_SCRIPT.biome, ...chart.reference })
        lines.push({ label: CHART_SCRIPT.biome, color: REFERENCE_COLOR, points: chart.series.reference, dashed: true })
      }
      return (
        <Titled level={titleLevel} title={CHART_SCRIPT.titles.uso}>
        <YearLines
          lines={lines}
          axisLabel={CHART_SCRIPT.uso.axis}
          description={CHART_SCRIPT.uso.description(
            rows.map((r) => CHART_SCRIPT.uso.row(r.label, formatPercent(r.from), formatPercent(r.to))).join(' '),
          )}
        />
        </Titled>
      )
    }

    case 'fogo': {
      const data = dataOf(response, 'fogo')
      const chart = data && fireChart(data, territory)
      if (!chart) return null
      const peak = chart.years.find((y) => y.year === chart.peakYear)
      const reference = alone ? null : chart.referenceMeanPct
      const rows = [{ label: alone ? CHART_SCRIPT.biome : CHART_SCRIPT.here, shares: chart.recurrence.here }]
      if (!alone && chart.recurrence.reference) rows.push({ label: CHART_SCRIPT.biome, shares: chart.recurrence.reference })
      return (
        <div className="territorios-graficos">
          <Titled level={titleLevel} title={CHART_SCRIPT.titles.fogoYears}>
          <YearBars
            years={chart.years}
            peakYear={chart.peakYear}
            reference={reference}
            color={STEP_COLORS.fogo}
            axisLabel={CHART_SCRIPT.fogo.axis}
            description={CHART_SCRIPT.fogo.years(
              peak ? CHART_SCRIPT.fogo.peak(peak.year, formatPercent(peak.sharePct)) : null,
              reference === null ? null : formatPercent(reference),
            )}
          />
          </Titled>
          <Titled level={titleLevel} title={CHART_SCRIPT.titles.fogoLevels}>
          <LevelsBar
            levels={FIRE_LEVELS}
            rows={rows.map((r) => ({ label: r.label, shares: { ...r.shares } }))}
            description={CHART_SCRIPT.fogo.recurrence(
              rows.map((r) => CHART_SCRIPT.fogo.row(r.label, recurrenceText(r.shares))).join(' '),
            )}
          />
          </Titled>
        </div>
      )
    }

    case 'chuva': {
      const data = dataOf(response, 'chuva')
      const chart = data && rainChart(data.series, territory)
      if (!chart) return null
      const classOfYear = rainClass(chart, alone)
      return (
        <div className="territorios-graficos">
          {classOfYear && <Titled level={titleLevel} title={CHART_SCRIPT.titles.chuvaClass}>{classOfYear}</Titled>}
          <Titled level={titleLevel} title={CHART_SCRIPT.titles.chuvaStrip}>
            <YearStrip data={chart} description={rainStripText(chart)} callout={false} />
          </Titled>
        </div>
      )
    }
  }
}
