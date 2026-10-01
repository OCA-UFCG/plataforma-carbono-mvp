// Numbers of the Territórios story: what each theme response measures, how the
// sentences print it in the visitor's language, and the chart inputs that set it beside the
// whole Caatinga.
//
// Pure on purpose, like lib/mapa/reportNarrative.ts: no Earth Engine and no
// clock, so every rule a sentence rests on (which degradation levels are the
// severe ones, how a rain year is classed, where "perto" ends) is under a unit
// test.
//
// Only shares are read from the m² a reduction returns: Earth Engine weights
// the pixels on a polygon's edge, and on small territories measured on
// 2026-09-16 the class areas added up to 51% and 75% of the real area.

import {
  LAND_USE_GROUPS,
  UNCLASSIFIED_GROUP_ID,
  landUseGroupOf,
} from '@/config/territorios/landUseGroups'
import {
  LAND_USE_YEARS,
  RAIN_FIRST_YEAR,
  RAIN_LAST_YEAR,
} from '@/config/territorios/story'
import { fluxDirection } from '@/lib/mapa/carbonFlux'
import { fixed, intlLocale, type Fmt } from '@/lib/territorios/i18n'
import type { StockReport, TimeSeriesPoint } from '@/types/mapa'
import type {
  DegradationChart,
  DegradationShare,
  DegradationThemeData,
  FluxChart,
  FluxThemeData,
  LandUseChart,
  LandUseThemeData,
  RainChartData,
  RainYearKind,
  Reading,
  StockChart,
  TerritoryPayload,
} from '@/types/territorios'

/** Below this degraded share, the territory reads as all conserved. */
export const DEGRADED_NEGLIGIBLE_PCT = 0.05
/** Within this distance from the mean, the year reads as "perto da média". */
export const RAIN_NEAR_MEAN_PCT = 10

// Formatting for the visitor. Figures follow one rule: whole from 10 up, one
// decimal below, and a positive value too small to print never reads as zero.
// Adapted from `adaptive`, `hectares` and `quantity` of lib/mapa/results/format.ts
// in commit c5eab2a (the Resultados tab), with "mil t" and "milhões de t" in
// place of kt and Mt. Each formatter takes a `Fmt`: the locale for the digits,
// and the TerritoriosStory messages for the words ("menos de", the units).

/** A figure and its unit, printed apart as the big number of a step. */
export interface Parts {
  value: string
  unit:  string
}

export function joinParts(parts: Parts): string {
  return `${parts.value} ${parts.unit}`
}

/** Rounded to the precision `formatNumber` prints. */
function printedValue(n: number): number {
  return n >= 10 ? Math.round(n) : Math.round(n * 10) / 10
}

/** A magnitude: "46", "8,5", "menos de 0,1". The sign is dropped. */
export function formatNumber(n: number, fmt: Fmt): string {
  const a = Math.abs(n)
  if (!(a > 0)) return '0'
  if (a < 0.1) return fmt.t('values.lessThan', { value: fixed(0.1, 1, fmt.locale) })
  // 9.96 prints as "10", not "10,0".
  return printedValue(a) >= 10 ? fixed(a, 0, fmt.locale) : fixed(a, 1, fmt.locale)
}

/** `pct` is a percent, 0..100: "46%", "2,5%", "menos de 0,1%". */
export function formatPercent(pct: number, fmt: Fmt): string {
  return `${formatNumber(pct, fmt)}%`
}

/** Hectares below 10 km², square kilometres from there on. */
export function areaParts(ha: number, fmt: Fmt): Parts {
  const hectare = fmt.t('area.hectare')
  if (!(ha > 0)) return { value: '0', unit: hectare }
  if (ha < 1) return { value: fmt.t('values.lessThanOne'), unit: hectare }
  if (ha < 10) return { value: formatNumber(ha, fmt), unit: hectare }
  if (Math.round(ha) < 1_000) return { value: fixed(ha, 0, fmt.locale), unit: hectare }
  return { value: fixed(ha / 100, 0, fmt.locale), unit: fmt.t('area.squareKm') }
}

export function formatArea(ha: number, fmt: Fmt): string {
  return joinParts(areaParts(ha, fmt))
}

// Keys of TerritoriosStory `tonnes.<scale>.one|many`.
const TONNE_SCALES = [
  { size: 1,   key: 'tonne' },
  { size: 1e3, key: 'thousand' },
  { size: 1e6, key: 'million' },
  { size: 1e9, key: 'billion' },
]

/**
 * A mass in tonnes, at most three significant digits once it is large:
 * "812 t", "462 mil t", "2,7 milhões de t", "1,6 bilhão de t". The sign is
 * dropped. The unit is singular below 2, as pt-BR writes "1,5 milhão".
 */
export function tonnesParts(t: number, fmt: Fmt): Parts {
  const a = Math.abs(t)
  if (!(a > 0)) return { value: '0', unit: fmt.t('tonnes.tonne.one') }
  if (a < 1) return { value: fmt.t('values.lessThanOne'), unit: fmt.t('tonnes.tonne.one') }

  let i = 0
  while (i < TONNE_SCALES.length - 1 && a >= TONNE_SCALES[i + 1].size) i++
  // 999,700 t would print as "1.000 mil t"; one scale up it is "1 milhão de t".
  if (i < TONNE_SCALES.length - 1 && printedValue(a / TONNE_SCALES[i].size) >= 1_000) i++

  const scale = TONNE_SCALES[i]
  const v = a / scale.size
  const value = i === 0 || v >= 10
    ? fixed(v, 0, fmt.locale)
    : (printedValue(v)).toLocaleString(intlLocale(fmt.locale), { maximumFractionDigits: 1 })
  return { value, unit: fmt.t(`tonnes.${scale.key}.${printedValue(v) < 2 ? 'one' : 'many'}`) }
}

export function formatTonnes(t: number, fmt: Fmt): string {
  return joinParts(tonnesParts(t, fmt))
}

// Territory

export function biomeAreaSharePct(territory: TerritoryPayload): number {
  return territory.biomaAreaHa > 0 ? (territory.areaHa / territory.biomaAreaHa) * 100 : 0
}

// Flux

export interface FluxMetrics {
  /** 'neutral' also when the total rounds to zero at the printed precision. */
  direction:     'emission' | 'removal' | 'neutral'
  /** Never negative. */
  magnitudeMg:   number
  perForestHaMg: number
  /** null when the answer carries no region area to divide by. */
  forestSharePct: number | null
}

/** Null when GFW maps no forest in the territory. */
export function fluxMetrics(data: FluxThemeData): FluxMetrics | null {
  if (!(data.forestAreaHa > 0) || !Number.isFinite(data.totalMgCo2e)) return null

  const flux = fluxDirection(data.totalMgCo2e)
  // A total that rounds to 0 t would state a direction the printed number cannot show.
  const neutral = flux.direction === 'neutral' || Math.round(flux.magnitude) === 0
  const direction = neutral ? 'neutral' : (flux.direction as 'emission' | 'removal')

  return {
    direction,
    magnitudeMg:    neutral ? 0 : flux.magnitude,
    perForestHaMg:  neutral ? 0 : flux.magnitude / data.forestAreaHa,
    forestSharePct: data.regionAreaHa > 0 ? Math.min(100, (data.forestAreaHa / data.regionAreaHa) * 100) : null,
  }
}

// Land use

export interface GroupShare {
  id:       string
  color:    string
  sharePct: number
}

/**
 * Share of each group, in LAND_USE_GROUPS order. Groups with no area stay in,
 * so the 1985 and 2024 bars line up; "outros" only shows up when
 * something falls in it. Empty when the areas add up to nothing.
 */
export function landUseGroupShares(areas: Record<string, number>): GroupShare[] {
  const byGroup = new Map<string, number>()
  let total = 0
  for (const [code, m2] of Object.entries(areas)) {
    if (!(m2 > 0)) continue
    const group = landUseGroupOf(Number(code))
    byGroup.set(group.id, (byGroup.get(group.id) ?? 0) + m2)
    total += m2
  }
  if (total <= 0) return []

  return LAND_USE_GROUPS
    .map((g) => ({ id: g.id, color: g.color, sharePct: ((byGroup.get(g.id) ?? 0) / total) * 100 }))
    .filter((g) => g.id !== UNCLASSIFIED_GROUP_ID || g.sharePct > 0)
}

const NATIVE_GROUP_IDS = new Set(LAND_USE_GROUPS.filter((g) => g.native).map((g) => g.id))

// Degradation

// Ascending code is descending severity: code 1 is level 5, the worst.
const DEGRADED_CODES = [1, 2, 3, 4, 5]
const SEVERE_CODES = [1, 2]
export const CONSERVED_CODE = 6

/**
 * Message key of each class code, under `legend.degradation` and
 * `TerritoriosCharts.degradacao.levels`: code 6 is Conservado, code 1 is
 * level 5 and code 0 the masked area.
 */
export const DEGRADATION_KEYS: Record<number, string> = {
  6: 'conserved',
  5: 'level1',
  4: 'level2',
  3: 'level3',
  2: 'level4',
  1: 'level5',
  0: 'noData',
}

/** Level 1 (lightest) to 5 (worst) of a degraded class code; null otherwise. */
export function degradationLevel(code: number): number | null {
  return DEGRADED_CODES.includes(code) ? 6 - code : null
}

export function isConservedCode(code: number): boolean {
  return code === CONSERVED_CODE
}

// Rain

export interface RainComparison {
  direction: 'above' | 'below' | 'near'
  /** Distance from the mean, as a percent of it; never negative. */
  pct:       number
}

export function rainComparison(valueMm: number, meanMm: number): RainComparison {
  if (!(meanMm > 0)) return { direction: 'near', pct: 0 }
  const pct = (Math.abs(valueMm - meanMm) / meanMm) * 100
  if (pct < RAIN_NEAR_MEAN_PCT) return { direction: 'near', pct }
  return { direction: valueMm > meanMm ? 'above' : 'below', pct }
}

// Bases of the comparison with the Caatinga. Each value here is what both the
// territory's chart and the biome reference (lib/territorios/themeService.ts)
// divide by, so the two land on one axis; tests/lib/territoriosThemeService.test.ts
// runs the biome's own answers through the charts and expects here = reference.

/** Reference stock per hectare with stock data, t C/ha; null without stock. */
export function stockDensity(report: StockReport): number | null {
  return report.totalTc > 0 && report.areaHa > 0 ? report.totalTc / report.areaHa : null
}

/** Percent (0..100) of the region inside the GFW forest extent; null without a region area. */
export function forestSharePct(data: FluxThemeData): number | null {
  if (!(data.regionAreaHa > 0) || !(data.forestAreaHa >= 0)) return null
  return Math.min(100, (data.forestAreaHa / data.regionAreaHa) * 100)
}

/** Signed Mg CO2e per hectare of GFW forest, negative for a removal; null without forest. */
export function fluxPerForestHa(data: FluxThemeData): number | null {
  if (!(data.forestAreaHa > 0) || !Number.isFinite(data.totalMgCo2e)) return null
  return data.totalMgCo2e / data.forestAreaHa
}

/** Native vegetation share (0..100) of one year's class areas; null when they add up to nothing. */
export function nativeSharePct(areas: Record<string, number> | undefined): number | null {
  if (!areas) return null
  const shares = landUseGroupShares(areas)
  if (!shares.length) return null
  return shares.filter((g) => NATIVE_GROUP_IDS.has(g.id)).reduce((sum, g) => sum + g.sharePct, 0)
}

/** Codes of the degradation chart, Conservado first and level 5 last; 0 is the masked area. */
export const DEGRADATION_CHART_CODES = [6, 5, 4, 3, 2, 1, 0]

/**
 * Share (0..100) of the region per degradation code 1..6, and code 0 for the
 * region minus the classes, the part the index masks. Null for the point
 * fallback and when the index has no pixel.
 */
export function degradationSharesPct(data: DegradationThemeData): Record<number, number> | null {
  const { areas } = data
  if (!areas) return null
  const codes = [...DEGRADED_CODES, CONSERVED_CODE]
  const m2 = (code: number) => Math.max(0, areas[String(code)] ?? 0)
  const classesM2 = codes.reduce((total, code) => total + m2(code), 0)
  if (!(classesM2 > 0)) return null
  // The same floor as degradationMetrics: never a region smaller than its classes.
  const regionM2 = Math.max(data.regionAreaM2 ?? 0, classesM2)

  const shares: Record<number, number> = {}
  for (const code of codes) shares[code] = (m2(code) / regionM2) * 100
  shares[0] = ((regionM2 - classesM2) / regionM2) * 100
  return shares
}

/** Percent (0..100) of the region with degradation, levels 1 to 5. */
export function degradedShareOf(shares: Record<number, number>): number {
  return DEGRADED_CODES.reduce((total, code) => total + (shares[code] ?? 0), 0)
}

/** Percent (0..100) of the region in levels 4 and 5. */
export function severeShareOf(shares: Record<number, number>): number {
  return SEVERE_CODES.reduce((total, code) => total + (shares[code] ?? 0), 0)
}

function rainYear(point: TimeSeriesPoint): number {
  return Number(point.date.slice(0, 4))
}

/** Mean annual rainfall from RAIN_FIRST_YEAR to RAIN_LAST_YEAR, missing years left out; null with none. */
export function rainMeanMm(series: TimeSeriesPoint[]): number | null {
  const values = series
    .filter((p) => rainYear(p) >= RAIN_FIRST_YEAR && rainYear(p) <= RAIN_LAST_YEAR)
    .map((p) => p.value)
    .filter((v): v is number => v !== null && Number.isFinite(v))
  return values.length ? values.reduce((total, v) => total + v, 0) / values.length : null
}

/** Rainfall of RAIN_LAST_YEAR; null when that year has no data. */
export function rainLastYearMm(series: TimeSeriesPoint[]): number | null {
  const point = series.find((p) => rainYear(p) === RAIN_LAST_YEAR)
  return point && point.value !== null && Number.isFinite(point.value) ? point.value : null
}

// Charts of the story

/** Within this relative distance from the Caatinga, the territory reads as "perto". */
export const READING_NEAR_PCT = 10

/** Where a value stands against the Caatinga's; null without a reference. */
export function readingOf(here: number, reference: number | null): Reading | null {
  if (reference === null || !Number.isFinite(reference) || !Number.isFinite(here)) return null
  if (reference === 0) return here === 0 ? 'perto' : here > 0 ? 'acima' : 'abaixo'
  if ((Math.abs(here - reference) / Math.abs(reference)) * 100 < READING_NEAR_PCT) return 'perto'
  return here > reference ? 'acima' : 'abaixo'
}

/** Null when the inventory has no stock over the territory. */
export function stockChart(report: StockReport, territory: TerritoryPayload): StockChart | null {
  const here = stockDensity(report)
  if (here === null) return null
  return { density: { here, reference: territory.biome.stockDensityTcHa } }
}

/** Direction of the biome's signed flux per hectare. */
export function biomeFluxDirection(perHaMg: number): FluxMetrics['direction'] {
  if (perHaMg === 0) return 'neutral'
  return perHaMg < 0 ? 'removal' : 'emission'
}

/** Null when GFW maps no forest in the territory, or the answer carries no region area. */
export function fluxChart(data: FluxThemeData, territory: TerritoryPayload): FluxChart | null {
  const m = fluxMetrics(data)
  const share = forestSharePct(data)
  if (!m || share === null) return null

  const biomePerHa = territory.biome.fluxPerForestHaMg
  let perForestHa: FluxChart['perForestHa'] = null
  if (m.direction !== 'neutral') {
    if (biomePerHa === null) {
      perForestHa = { here: m.perForestHaMg, reference: null }
    } else if (biomeFluxDirection(biomePerHa) === m.direction) {
      perForestHa = { here: m.perForestHaMg, reference: Math.abs(biomePerHa) }
    }
  }

  return {
    forestShare: { here: share, reference: territory.biome.forestSharePct },
    perForestHa,
  }
}

/** Null when either year has no MapBiomas pixel over the territory. */
export function landUseChart(data: LandUseThemeData, territory: TerritoryPayload): LandUseChart | null {
  const [firstYear, lastYear] = LAND_USE_YEARS
  const from = nativeSharePct(data.areas[firstYear])
  const to = nativeSharePct(data.areas[lastYear])
  if (from === null || to === null) return null

  const ref = territory.biome.nativeSharePct
  return {
    here:      { from, to },
    reference: ref ? { from: ref[firstYear], to: ref[lastYear] } : null,
  }
}

function degradationList(shares: Record<number, number>): DegradationShare[] {
  return DEGRADATION_CHART_CODES
    // Below this the masked area is a remainder of two reductions, not a band to draw.
    .filter((code) => code !== 0 || (shares[0] ?? 0) > DEGRADED_NEGLIGIBLE_PCT)
    .map((code) => ({ code, pct: shares[code] ?? 0 }))
}

/** Null for the point fallback, and when the index has no pixel over the territory. */
export function degradationChart(data: DegradationThemeData, territory: TerritoryPayload): DegradationChart | null {
  const shares = degradationSharesPct(data)
  if (!shares) return null
  const ref = territory.biome.degradationSharesPct
  return {
    here:      degradationList(shares),
    reference: ref ? degradationList(ref) : null,
  }
}

/** A year against the territory's own mean, with the same 10% rule as rainComparison. */
export function rainKind(valueMm: number, meanMm: number): RainYearKind {
  const { direction } = rainComparison(valueMm, meanMm)
  return direction === 'near' ? 'normal' : direction === 'above' ? 'chuvoso' : 'seco'
}

/** Every year from RAIN_FIRST_YEAR to RAIN_LAST_YEAR; null when none has data. */
export function rainChart(series: TimeSeriesPoint[], territory: TerritoryPayload): RainChartData | null {
  const meanMm = rainMeanMm(series)
  if (meanMm === null) return null

  const byYear = new Map<number, number>()
  for (const p of series) {
    if (p.value !== null && Number.isFinite(p.value)) byYear.set(rainYear(p), p.value)
  }

  const years: RainChartData['years'] = []
  for (let year = RAIN_FIRST_YEAR; year <= RAIN_LAST_YEAR; year++) {
    const valueMm = byYear.get(year) ?? null
    years.push({ year, valueMm, kind: valueMm === null ? null : rainKind(valueMm, meanMm) })
  }

  return {
    years,
    meanMm,
    highlightYear: RAIN_LAST_YEAR,
    mean: { here: meanMm, reference: territory.biome.rainMeanMm },
  }
}

const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

/**
 * End of a comparison bar's scale: a round number at least 10% past the larger
 * of the two values, so neither bar nor marker sits on the track's end. 1 when
 * there is nothing to draw.
 */
export function chartMax(...values: (number | null)[]): number {
  const top = Math.max(0, ...values.filter((v): v is number => v !== null && Number.isFinite(v)).map(Math.abs))
  if (!(top > 0)) return 1
  const target = top * 1.1
  const power = 10 ** Math.floor(Math.log10(target))
  return (NICE_STEPS.find((n) => n * power >= target - 1e-9 * power) ?? 10) * power
}
