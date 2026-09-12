// Deterministic prose for one report section, from the numbers already measured.
//
// A pure function on purpose: no Earth Engine, no `server-only`, no clock. The
// sentences are the part of the document most able to be quietly wrong, and
// this way the whole of it is covered by a unit test.
//
// Every sentence opens with "Em <feição>" rather than with an article. The
// recorte types differ in gender and article — o município, a terra indígena,
// o assentamento, o bioma — and a preposition table keyed by recorte type
// drifts the moment a seventh recorte arrives.

import { describeFlux } from '@/lib/mapa/carbonFlux'
import { classShares } from '@/lib/mapa/classShares'
import { numero } from '@/lib/mapa/format'
import type { ReportLayerConfig } from '@/config/mapa/reportLayers'
import type {
  ReportAnalysisStatus,
  ReportNarrative,
  ReportRecorte,
} from '@/types/relatorio'
import type { RasterClass, RasterStatsResult, TimeSeriesPoint } from '@/types/mapa'

export interface NarrativeInput {
  recorte:       ReportRecorte
  layerName:     string
  unit?:         string
  signedFlux?:   boolean
  classes?:      RasterClass[]
  config:        ReportLayerConfig
  status:        ReportAnalysisStatus
  effectiveYear: string | null
  snapshot:      RasterStatsResult | null
  series:        TimeSeriesPoint[]
}

/** Below this relative move, a difference is noise rather than a trend. */
const STABLE_THRESHOLD = 0.005

const EMPTY: ReportNarrative = { situation: null, trend: null, context: null }

/** " em 2023", or nothing at all on a layer with no year. */
function atYear(year: string | null): string {
  return year ? ` em ${year}` : ''
}

function withUnit(value: number, unit: string | undefined, digits = 1): string {
  return unit ? `${numero(value, digits)} ${unit}` : numero(value, digits)
}

function situationContinuous(input: NarrativeInput, stats: { mean: number; min: number; max: number }) {
  const { recorte, layerName, unit, signedFlux, effectiveYear } = input

  if (signedFlux) {
    // The magnitude and the verb come from the module that owns this
    // convention, so the document and the panel say the same word.
    const flux = describeFlux(stats.mean)
    if (!flux.label) return null
    return `Em ${recorte.featureName}, o ${layerName} indica que a área ${flux.label}, em média, ${withUnit(flux.magnitude, unit, 2)}${atYear(effectiveYear)}.`
  }

  return `Em ${recorte.featureName}, o ${layerName} tem média de ${withUnit(stats.mean, unit)}${atYear(effectiveYear)}, variando de ${numero(stats.min)} a ${withUnit(stats.max, unit)}.`
}

function situationCategorical(input: NarrativeInput, areas: Record<string, number>) {
  const { recorte, layerName, classes, config, effectiveYear } = input
  const dominant = classShares(areas, classes ?? [])[0]
  if (!dominant) return null

  return `Em ${recorte.featureName}, a classe predominante de ${layerName} é ${dominant.label}, com ${numero(dominant.share)}% da área analisada ${config.coverageContext}${effectiveYear ? `, em ${effectiveYear}` : ''}.`
}

function situationStocks(input: NarrativeInput, report: Extract<RasterStatsResult, { kind: 'stocks' }>['report']) {
  const { recorte } = input
  if (report.totalTc <= 0 || report.areaHa <= 0) return null

  const topPool = [...report.pools].sort((a, b) => b.tc - a.tc)[0]
  // `classes` already arrives sorted by decreasing stock from the report.
  const topClass = report.classes[0]
  const density = report.totalTc / report.areaHa

  const parts = [
    `Em ${recorte.featureName}, o estoque total de carbono é de ${numero(report.totalTc, 0)} ${report.unit} sobre ${numero(report.areaHa, 0)} ha, uma densidade média de ${numero(density)} ${report.unit}/ha.`,
  ]
  if (topPool && topClass) {
    parts.push(
      `O reservatório ${topPool.label} responde por ${numero((topPool.tc / report.totalTc) * 100)}% do total, e a fitofisionomia ${topClass.sigla} por ${numero((topClass.tc / report.totalTc) * 100)}%.`,
    )
  }
  return parts.join(' ')
}

function buildSituation(input: NarrativeInput): string | null {
  const { snapshot } = input
  if (!snapshot) return null

  switch (snapshot.kind) {
    case 'continuous':  return situationContinuous(input, snapshot.stats)
    case 'categorical': return situationCategorical(input, snapshot.areas)
    case 'stocks':      return situationStocks(input, snapshot.report)
    // A point series never reaches a report snapshot; the report's series lives
    // in its own field.
    case 'timeseries':  return null
  }
}

function buildTrend(input: NarrativeInput): string | null {
  const { config, unit, effectiveYear, series } = input
  // No vocabulary means the layer's series cannot carry a trend: either it is
  // static, or its mean is not a quantity (see `seriesKind` in the config).
  if (!config.trend || !effectiveYear) return null

  const index = series.findIndex((p) => p.date.slice(0, 4) === effectiveYear)
  if (index < 1) return null

  const current = series[index].value
  const previous = series[index - 1].value
  const previousYear = series[index - 1].date.slice(0, 4)
  // A delta against nodata is not a trend.
  if (current === null || previous === null) return null

  const delta = current - previous
  const relative = previous === 0 ? (delta === 0 ? 0 : Infinity) : Math.abs(delta / previous)
  if (relative < STABLE_THRESHOLD) {
    return `Em relação a ${previousYear}, o valor permaneceu estável.`
  }

  const term = delta > 0 ? config.trend.increaseTerm : config.trend.decreaseTerm
  const magnitude = withUnit(Math.abs(delta), unit)
  // The percentage is dropped when the previous value is zero, where it would
  // be a division by zero dressed up as a statistic.
  const percentage = previous === 0 ? '' : `, ou ${numero(relative * 100)}%`

  return `Em relação a ${previousYear}, houve ${term} de ${magnitude}${percentage}.`
}

function buildContext(input: NarrativeInput): string | null {
  const { config, unit, series } = input
  if (!config.trend) return null

  const measured = series.filter((p): p is { date: string; value: number } => p.value !== null)
  if (measured.length < 2) return null

  const mean = measured.reduce((sum, p) => sum + p.value, 0) / measured.length
  const highest = measured.reduce((best, p) => (p.value > best.value ? p : best))
  const lowest = measured.reduce((best, p) => (p.value < best.value ? p : best))
  const firstYear = measured[0].date.slice(0, 4)
  const lastYear = measured[measured.length - 1].date.slice(0, 4)

  return `Na série de ${firstYear} a ${lastYear}, a média é ${withUnit(mean, unit)}, com máximo de ${numero(highest.value)} em ${highest.date.slice(0, 4)} e mínimo de ${numero(lowest.value)} em ${lowest.date.slice(0, 4)}.`
}

/** The three sentences of a section, each null when it has nothing to say. */
export function buildNarrative(input: NarrativeInput): ReportNarrative {
  // An unavailable analysis says nothing: the section prints the status and the
  // years that do exist instead, and inventing prose over a gap is worse than
  // silence.
  if (input.status !== 'available') return EMPTY

  return {
    situation: buildSituation(input),
    trend:     buildTrend(input),
    context:   buildContext(input),
  }
}
