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
//
// For the same reason, a layer's own name never takes a gendered article
// either: "Biomassa Aérea", "Frequência de Fogo" and "Precipitação Anual" are
// feminine while most curated layers are masculine, and a config of genders
// keyed by layer name has the same drift problem the recorte table would.
// "A camada <nome>" sidesteps it — "camada" is always feminine, so the
// article never has to agree with the name that follows it.
//
// The sentences live in translations/<locale>/MapaReport.json (narrative.*);
// this file only decides which one to say and formats the numbers. Called
// without a `MapaText` it writes Portuguese, as it always did. The caller passes
// `layerName` and `classes` already in the user's language.

import { describeFlux } from '@/lib/mapa/carbonFlux'
import { classShares } from '@/lib/mapa/classShares'
import { numero } from '@/lib/mapa/format'
import { PT_TEXT, poolLabel, type MapaText } from '@/lib/mapa/text'
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

const NS = 'MapaReport.narrative'

/** " em 2023" / " in 2023", or nothing at all on a layer with no year. */
function atYear(year: string | null, tx: MapaText): string {
  return year ? tx.t(`${NS}.atYear`, { year }) : ''
}

function withUnit(value: number, unit: string | undefined, digits: number, tx: MapaText): string {
  return unit ? `${numero(value, digits, tx.locale)} ${unit}` : numero(value, digits, tx.locale)
}

function situationContinuous(input: NarrativeInput, stats: { mean: number; min: number; max: number }, tx: MapaText) {
  const { recorte, layerName, unit, signedFlux, effectiveYear } = input

  if (signedFlux) {
    // The magnitude and the verb come from the module that owns this
    // convention, so the document and the panel say the same word.
    const flux = describeFlux(stats.mean, tx)
    if (flux.direction === 'unknown') return null
    // One sentence per direction rather than a verb slotted into a shared one:
    // 'emitiu'/'sequestrou' are verbs that read fine after "a área", while 'em
    // equilíbrio' is an adjectival phrase that needs the copula, and other
    // languages split them differently again.
    const key = flux.direction === 'emission' ? 'fluxEmission'
      : flux.direction === 'removal' ? 'fluxRemoval'
      : 'fluxNeutral'
    return tx.t(`${NS}.${key}`, {
      feature: recorte.featureName,
      layer:   layerName,
      value:   withUnit(flux.magnitude, unit, 2, tx),
      atYear:  atYear(effectiveYear, tx),
    })
  }

  return tx.t(`${NS}.continuous`, {
    feature: recorte.featureName,
    layer:   layerName,
    mean:    withUnit(stats.mean, unit, 1, tx),
    atYear:  atYear(effectiveYear, tx),
    min:     numero(stats.min, 1, tx.locale),
    max:     withUnit(stats.max, unit, 1, tx),
  })
}

function situationCategorical(input: NarrativeInput, areas: Record<string, number>, tx: MapaText) {
  const { recorte, layerName, classes, config, effectiveYear } = input
  const dominant = classShares(areas, classes ?? [], tx)[0]
  if (!dominant) return null

  return tx.t(`${NS}.categorical`, {
    feature:    recorte.featureName,
    layer:      layerName,
    class:      dominant.label,
    share:      numero(dominant.share, 1, tx.locale),
    context:    config.coverageContext,
    yearClause: effectiveYear ? tx.t(`${NS}.atYearComma`, { year: effectiveYear }) : '',
  })
}

function situationStocks(
  input: NarrativeInput,
  report: Extract<RasterStatsResult, { kind: 'stocks' }>['report'],
  tx: MapaText,
) {
  const { recorte } = input
  if (report.totalTc <= 0 || report.areaHa <= 0) return null

  const topPool = [...report.pools].sort((a, b) => b.tc - a.tc)[0]
  // `classes` already arrives sorted by decreasing stock from the report.
  const topClass = report.classes[0]
  const density = report.totalTc / report.areaHa

  const parts = [
    tx.t(`${NS}.stocksTotal`, {
      feature: recorte.featureName,
      total:   numero(report.totalTc, 0, tx.locale),
      unit:    report.unit,
      area:    numero(report.areaHa, 0, tx.locale),
      density: numero(density, 1, tx.locale),
    }),
  ]
  if (topPool && topClass) {
    parts.push(
      tx.t(`${NS}.stocksBreakdown`, {
        // The pool label arrives from the server config in Portuguese.
        pool:       poolLabel(topPool.band, topPool.label, tx),
        poolShare:  numero((topPool.tc / report.totalTc) * 100, 1, tx.locale),
        class:      topClass.sigla,
        classShare: numero((topClass.tc / report.totalTc) * 100, 1, tx.locale),
      }),
    )
  }
  return parts.join(' ')
}

function buildSituation(input: NarrativeInput, tx: MapaText): string | null {
  const { snapshot } = input
  if (!snapshot) return null

  switch (snapshot.kind) {
    case 'continuous':  return situationContinuous(input, snapshot.stats, tx)
    case 'categorical': return situationCategorical(input, snapshot.areas, tx)
    case 'stocks':      return situationStocks(input, snapshot.report, tx)
    // A point series never reaches a report snapshot; the report's series lives
    // in its own field.
    case 'timeseries':  return null
  }
}

function buildTrend(input: NarrativeInput, tx: MapaText): string | null {
  const { config, unit, signedFlux, effectiveYear, series } = input
  // No vocabulary means the layer's series cannot carry a trend: either it is
  // static, or its mean is not a quantity (see `seriesKind` in the config).
  if (!config.trend || !effectiveYear) return null
  // The series here is a raw zonal mean, not the sign-dropped magnitude
  // `describeFlux` produces for the situation sentence. Under the atmospheric
  // convention a raw delta's direction is the opposite of what it means (a
  // flux growing more negative is more sequestration, which reads as
  // "redução" from a bare subtraction), so stating no trend for a signed flux
  // is safer than stating an inverted one until this is implemented properly.
  if (signedFlux) return null

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
    return tx.t(`${NS}.trendStable`, { year: previousYear })
  }

  const term = delta > 0 ? config.trend.increaseTerm : config.trend.decreaseTerm
  const magnitude = withUnit(Math.abs(delta), unit, 1, tx)
  // The percentage is dropped when the previous value is zero, where it would
  // be a division by zero dressed up as a statistic.
  const percentage = previous === 0
    ? ''
    : tx.t(`${NS}.trendPercentage`, { value: numero(relative * 100, 1, tx.locale) })

  return tx.t(`${NS}.trendChange`, { year: previousYear, term, magnitude, percentage })
}

function buildContext(input: NarrativeInput, tx: MapaText): string | null {
  const { config, unit, series, signedFlux } = input
  if (!config.trend) return null
  // Same reasoning as buildTrend: the series here is the raw zonal mean, not
  // describeFlux's sign-dropped magnitude, and under the atmospheric
  // convention a raw extreme's direction is the opposite of what it means (the
  // most negative value is the strongest sequestration, not the deepest
  // emission). Printing "máximo"/"mínimo" straight off that series would be
  // wrong in the same way a raw delta would be, so this declines too until
  // that is implemented properly.
  if (signedFlux) return null

  const measured = series.filter((p): p is { date: string; value: number } => p.value !== null)
  if (measured.length < 2) return null

  const mean = measured.reduce((sum, p) => sum + p.value, 0) / measured.length
  const highest = measured.reduce((best, p) => (p.value > best.value ? p : best))
  const lowest = measured.reduce((best, p) => (p.value < best.value ? p : best))
  const firstYear = measured[0].date.slice(0, 4)
  const lastYear = measured[measured.length - 1].date.slice(0, 4)

  return tx.t(`${NS}.context`, {
    first:   firstYear,
    last:    lastYear,
    mean:    withUnit(mean, unit, 1, tx),
    max:     numero(highest.value, 1, tx.locale),
    maxYear: highest.date.slice(0, 4),
    min:     numero(lowest.value, 1, tx.locale),
    minYear: lowest.date.slice(0, 4),
  })
}

/**
 * The three sentences of a section, each null when it has nothing to say.
 * `input.config` is expected already localized (`getReportLayer(id, tx)`).
 */
export function buildNarrative(input: NarrativeInput, tx: MapaText = PT_TEXT): ReportNarrative {
  // An unavailable analysis says nothing: the section prints the status and the
  // years that do exist instead, and inventing prose over a gap is worse than
  // silence.
  if (input.status !== 'available') return EMPTY

  return {
    situation: buildSituation(input, tx),
    trend:     buildTrend(input, tx),
    context:   buildContext(input, tx),
  }
}
