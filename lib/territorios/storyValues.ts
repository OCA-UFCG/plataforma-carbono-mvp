// Numbers of the Territórios story: what each theme response measures, how the
// sentences print it in pt-BR, and the chart inputs that set it beside the
// whole Caatinga.
//
// Pure on purpose, like lib/mapa/reportNarrative.ts: no Earth Engine and no
// clock, so every rule a sentence rests on (which year had the most fire, how a
// rain year is classed, where "perto" ends) is under a unit test.
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
  FIRE_FIRST_YEAR,
  FIRE_LAST_YEAR,
  LAND_USE_YEARS,
  RAIN_FIRST_YEAR,
  RAIN_LAST_YEAR,
} from '@/config/territorios/story'
import { describeFlux } from '@/lib/mapa/carbonFlux'
import { numero } from '@/lib/mapa/format'
import type { StockReport, TimeSeriesPoint } from '@/types/mapa'
import type {
  FireChart,
  FireRecurrenceShares,
  FireThemeData,
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

/** Within this distance from the mean, the year reads as "perto da média". */
export const RAIN_NEAR_MEAN_PCT = 10

// Formatting for the visitor. Figures follow one rule: whole from 10 up, one
// decimal below, and a positive value too small to print never reads as zero.
// Adapted from `adaptive`, `hectares` and `quantity` of lib/mapa/results/format.ts
// in commit c5eab2a (the Resultados tab), with "mil t" and "milhões de t" in
// place of kt and Mt.

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
export function formatNumber(n: number): string {
  const a = Math.abs(n)
  if (!(a > 0)) return '0'
  if (a < 0.1) return `menos de ${numero(0.1)}`
  // 9.96 prints as "10", not "10,0".
  return printedValue(a) >= 10 ? numero(a, 0) : numero(a, 1)
}

/** `pct` is a percent, 0..100: "46%", "2,5%", "menos de 0,1%". */
export function formatPercent(pct: number): string {
  return `${formatNumber(pct)}%`
}

/** Hectares below 10 km², square kilometres from there on. */
export function areaParts(ha: number): Parts {
  if (!(ha > 0)) return { value: '0', unit: 'ha' }
  if (ha < 1) return { value: 'menos de 1', unit: 'ha' }
  if (ha < 10) return { value: formatNumber(ha), unit: 'ha' }
  if (Math.round(ha) < 1_000) return { value: numero(ha, 0), unit: 'ha' }
  return { value: numero(ha / 100, 0), unit: 'km²' }
}

export function formatArea(ha: number): string {
  return joinParts(areaParts(ha))
}

const TONNE_SCALES = [
  { size: 1,   one: 't',           many: 't' },
  { size: 1e3, one: 'mil t',       many: 'mil t' },
  { size: 1e6, one: 'milhão de t', many: 'milhões de t' },
  { size: 1e9, one: 'bilhão de t', many: 'bilhões de t' },
]

const scaledNumber = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/**
 * A mass in tonnes, at most three significant digits once it is large:
 * "812 t", "462 mil t", "2,7 milhões de t", "1,6 bilhão de t". The sign is
 * dropped. The unit is singular below 2, as pt-BR writes "1,5 milhão".
 */
export function tonnesParts(t: number): Parts {
  const a = Math.abs(t)
  if (!(a > 0)) return { value: '0', unit: 't' }
  if (a < 1) return { value: 'menos de 1', unit: 't' }

  let i = 0
  while (i < TONNE_SCALES.length - 1 && a >= TONNE_SCALES[i + 1].size) i++
  // 999,700 t would print as "1.000 mil t"; one scale up it is "1 milhão de t".
  if (i < TONNE_SCALES.length - 1 && printedValue(a / TONNE_SCALES[i].size) >= 1_000) i++

  const scale = TONNE_SCALES[i]
  const v = a / scale.size
  const value = i === 0 ? numero(v, 0) : v >= 10 ? numero(v, 0) : scaledNumber.format(printedValue(v))
  return { value, unit: printedValue(v) < 2 ? scale.one : scale.many }
}

export function formatTonnes(t: number): string {
  return joinParts(tonnesParts(t))
}

/**
 * `formatTonnes` with the "t" spelled out: "812 toneladas", "462 mil
 * toneladas", "2,7 milhões de toneladas". Only a bare tonne agrees with its
 * number: "1 tonelada", "menos de 1 tonelada", but "1,5 milhão de toneladas".
 */
export function formatTonnesInWords(t: number): string {
  const { value, unit } = tonnesParts(t)
  const singular = unit === 't' && (value === '1' || value === 'menos de 1')
  return `${value} ${unit.replace(/t$/, singular ? 'tonelada' : 'toneladas')}`
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

  const flux = describeFlux(data.totalMgCo2e)
  // A total that rounds to 0 t would state a direction the printed number cannot show.
  const neutral = flux.direction === 'neutral' || numero(flux.magnitude, 0) === numero(0, 0)
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
  label:    string
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
    .map((g) => ({ id: g.id, label: g.label, color: g.color, sharePct: ((byGroup.get(g.id) ?? 0) / total) * 100 }))
    .filter((g) => g.id !== UNCLASSIFIED_GROUP_ID || g.sharePct > 0)
}

const NATIVE_GROUP_IDS = new Set(LAND_USE_GROUPS.filter((g) => g.native).map((g) => g.id))

// Fire

/** Burned area of each year of the fire period; a year missing from the answer is 0 ha. */
function fireYears(data: FireThemeData): { year: number; burnedHa: number }[] {
  const byYear = new Map(data.annual.map((a) => [a.year, a.burnedHa]))
  const out: { year: number; burnedHa: number }[] = []
  for (let year = FIRE_FIRST_YEAR; year <= FIRE_LAST_YEAR; year++) {
    const ha = byYear.get(year)
    out.push({ year, burnedHa: typeof ha === 'number' && ha > 0 ? ha : 0 })
  }
  return out
}

/** Year with the largest burned area, the earliest on a tie; null when nothing burned. */
export function firePeakYear(data: FireThemeData): number | null {
  let peak: { year: number; burnedHa: number } | null = null
  for (const y of fireYears(data)) {
    if (y.burnedHa > 0 && (peak === null || y.burnedHa > peak.burnedHa)) peak = y
  }
  return peak?.year ?? null
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

const pctOf = (ha: number, regionHa: number) => Math.min(100, Math.max(0, (ha / regionHa) * 100))

/** Percent (0..100) of the region that burned at least once; null without a region area. */
export function fireBurnedSharePct(data: FireThemeData): number | null {
  if (!(data.regionAreaHa > 0)) return null
  return pctOf(data.burnedOnceHa, data.regionAreaHa)
}

/** Percent (0..100) of the region per number of years with fire, "never" being the rest. */
export function fireRecurrenceSharesPct(data: FireThemeData): FireRecurrenceShares | null {
  if (!(data.regionAreaHa > 0)) return null
  const { once, twoToFour, fivePlus } = data.recurrenceHa
  const shares = {
    once:      pctOf(once, data.regionAreaHa),
    twoToFour: pctOf(twoToFour, data.regionAreaHa),
    fivePlus:  pctOf(fivePlus, data.regionAreaHa),
  }
  return { never: Math.max(0, 100 - shares.once - shares.twoToFour - shares.fivePlus), ...shares }
}

/** Burned share (0..100) of the region, every year of the fire period; null without a region area. */
export function fireAnnualSharesPct(data: FireThemeData): { year: number; sharePct: number }[] | null {
  if (!(data.regionAreaHa > 0)) return null
  return fireYears(data).map((y) => ({ year: y.year, sharePct: pctOf(y.burnedHa, data.regionAreaHa) }))
}

/** Mean of the yearly burned shares (0..100) over the fire period; null without a region area. */
export function fireAnnualMeanSharePct(data: FireThemeData): number | null {
  const years = fireAnnualSharesPct(data)
  if (!years) return null
  return years.reduce((total, y) => total + y.sharePct, 0) / years.length
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

/** Null without a region area to divide by; a territory where nothing burned still has a chart. */
export function fireChart(data: FireThemeData, territory: TerritoryPayload): FireChart | null {
  const share = fireBurnedSharePct(data)
  const recurrence = fireRecurrenceSharesPct(data)
  const years = fireAnnualSharesPct(data)
  if (share === null || !recurrence || !years) return null
  const { biome } = territory
  return {
    burnedShare:      { here: share, reference: biome.fireBurnedSharePct },
    years,
    peakYear:         firePeakYear(data),
    referenceMeanPct: biome.fireAnnualMeanSharePct,
    recurrence:       { here: recurrence, reference: biome.fireRecurrenceSharesPct },
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
