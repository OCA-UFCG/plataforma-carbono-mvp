// Text of each screen of the Territórios story: picks the variant a theme
// response calls for and fills the templates of the script it is given
// (storyScript() in config/territorios/storyScript.ts) with the numbers of
// storyValues.ts.
//
// Only the territory step names the feature, through displayName(), which
// drops the "PA " of settlements and their capitals. The biome variants drop
// the comparisons with the biome, which would compare the Caatinga with itself.

import { clippedToBiome, type TerritoryType } from '@/config/territorios/story'
import { FEMININE_TYPES, STATE_LOCATIVE, TERRITORY_SCRIPT, type Change, type StoryScript } from '@/config/territorios/storyScript'
import { displayName } from '@/lib/territorios/featureIds'
import {
  areaParts,
  biomeAreaSharePct,
  fireBurnedSharePct,
  firePeakYear,
  fluxMetrics,
  forestSharePct,
  formatNumber,
  formatPercent,
  landUseChart,
  rainChart,
  rainComparison,
  rainKind,
  rainLastYearMm,
  readingOf,
  stockChart,
  tonnesParts,
} from '@/lib/territorios/storyValues'
import type {
  AboutItem,
  Indicator,
  RainChartData,
  Reading,
  StepAnswer,
  StepId,
  TerritoryPayload,
  ThemeData,
  ThemeId,
  ThemeResponse,
} from '@/types/territorios'

export interface SummaryInput {
  responses: Partial<Record<ThemeId, ThemeResponse>>
  territory: TerritoryPayload
  type:      TerritoryType
  /** The story's words, as storyScript() builds them from the copy. */
  script:    StoryScript
}

function isBioma(type: TerritoryType): boolean {
  return type.id === 'bioma'
}

function availableData<K extends ThemeId>(
  response: ThemeResponse | undefined,
  theme: K,
): Extract<ThemeData, { theme: K }> | null {
  if (response?.status !== 'available' || response.data?.theme !== theme) return null
  return response.data as Extract<ThemeData, { theme: K }>
}

export interface StepInput {
  territory: TerritoryPayload
  type:      TerritoryType
  /** The theme's answer; unused on the territory step. */
  response?: ThemeResponse
  /** The story's words, as storyScript() builds them from the copy. */
  script:    StoryScript
}

type Answer = Omit<StepAnswer, 'question'>

/**
 * Below this share of the territory with inventory pixels, "Sobre os dados"
 * says the stock total leaves part of it out. The territory's area and the
 * report's are measured apart, so a full cover lands a little off 1.
 */
const STOCK_FULL_COVERAGE = 0.95

function joinSentences(...parts: (string | null | false)[]): string {
  return parts.filter(Boolean).join(' ')
}

/** "na Paraíba", "em Sergipe e na Bahia"; null for a context the table does not know. */
function stateLocative(context: string | undefined): string | null {
  if (!context) return null
  const parts = context.split('/').map((uf) => STATE_LOCATIVE[uf.trim()])
  if (!parts.length || parts.some((p) => p === undefined)) return null
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
}

/** The reading against the Caatinga; null for the biome itself and without a reference. */
function against(here: number, reference: number | null, type: TerritoryType): { reading: Reading; reference: number } | null {
  if (isBioma(type) || reference === null) return null
  const reading = readingOf(here, reference)
  return reading ? { reading, reference } : null
}

function territoryAnswer({ territory, type, script }: StepInput): Answer {
  const s = script.answers.territorio
  let sentence: string
  if (isBioma(type)) {
    sentence = s.biome
  } else if (type.id === 'estado') {
    // A state is the one type whose share of the biome is not "menos de 0,1%".
    sentence = s.state(formatPercent(biomeAreaSharePct(territory)))
  } else {
    const name = displayName(territory.featureName)
    const noun = type.unitLabel.toLowerCase()
    const feminine = FEMININE_TYPES.has(type.id)
    const where = stateLocative(territory.context)
    sentence = where ? s.located(name, noun, feminine, where) : s.plain(name, noun, feminine)
  }
  return { headline: areaParts(territory.areaHa), sentence }
}

/** Below this share of the biome the card would only say "menos de 0,1%". */
const SHARE_CARD_MIN_PCT = 0.1

/**
 * The cards under the territory's area (Figma 19254:37459): its share of the
 * biome, from 0,1% up, and its rank by area among the territories of its type.
 * None for the biome, which is the whole. A municipality enters whole, past
 * the biome edge, so its area is no share of the biome; it and every type that
 * falls under 0,1% keep the rank alone.
 */
export function territoryIndicators(
  { territory, type, script }: { territory: TerritoryPayload; type: TerritoryType; script: StoryScript },
): Indicator[] {
  if (isBioma(type)) return []
  const s = script.territory
  const share = clippedToBiome(type) ? biomeAreaSharePct(territory) : 0
  const items: Indicator[] = share >= SHARE_CARD_MIN_PCT ? [{ value: formatPercent(share), text: s.biomeShare }] : []
  const rank = territory.areaRank
  if (rank && type.plural) {
    const feminine = FEMININE_TYPES.has(type.id)
    items.push({ value: TERRITORY_SCRIPT.rankValue(rank.position, feminine), text: s.rankText(rank.total, type.plural, feminine) })
  }
  return items
}

function stockAnswer({ response, territory, script }: StepInput): Answer {
  const s = script.answers.estoque
  const data = availableData(response, 'estoque')
  const chart = data && stockChart(data.report, territory)
  // "Sem dado", never zero: where the inventory has no pixel nothing was measured.
  if (!data || !chart) return { headline: null, sentence: s.noData }

  // The comparison per hectare is the step's chart.
  return { headline: stockTotalParts(data.report.totalTc, s), sentence: '' }
}

/**
 * The total as the stock step's big figure: the scale word joins the number
 * ("1,8 milhão") and the unit reads in words beside it ("de toneladas de
 * carbono").
 */
function stockTotalParts(totalTc: number, s: StoryScript['answers']['estoque']): { value: string; unit: string } {
  const { value, unit } = tonnesParts(totalTc)
  const scaled = /^(mil|milhão|milhões|bilhão|bilhões)( de)? t$/.exec(unit)
  const singular = !scaled && (value === '1' || value === 'menos de 1')
  const tonnes = singular ? 'tonelada' : 'toneladas'
  return scaled
    ? { value: `${value} ${scaled[1]}`, unit: s.unit(`${scaled[2] ? 'de ' : ''}${tonnes}`) }
    : { value, unit: s.unit(tonnes) }
}

function fluxAnswer({ response, territory, type, script }: StepInput): Answer {
  const s = script.answers.fluxo
  const data = availableData(response, 'fluxo')
  const m = data && fluxMetrics(data)
  if (!data || !m) return { headline: null, sentence: s.noForest }

  const tonnes = tonnesParts(m.magnitudeMg)
  // Without the share, a reader credits the whole territory with the total.
  const share = forestSharePct(data)
  const cmp = share === null ? null : against(share, territory.biome.forestSharePct, type)
  return {
    headline: m.direction === 'neutral' ? null : { value: tonnes.value, unit: s.unit(tonnes.unit) },
    sentence: joinSentences(
      m.direction === 'removal' ? s.removal : m.direction === 'emission' ? s.emission : s.balance,
      share !== null && (cmp
        ? s.share(formatPercent(share), cmp.reading, formatPercent(cmp.reference))
        : s.shareOnly(formatPercent(share))),
    ),
  }
}

/**
 * The change of a share in percentage points, as the answer prints it. A change
 * that rounds to zero is no change.
 */
function pointsChange({ from, to }: { from: number; to: number }): { change: Change; points: string; magnitude: number } {
  const magnitude = Math.abs(to - from)
  const points = formatNumber(magnitude)
  const change: Change = /^0(,0+)?$/.test(points) ? 'none' : to < from ? 'down' : 'up'
  return { change, points, magnitude }
}

function landUseAnswer({ response, territory, type, script }: StepInput): Answer {
  const s = script.answers.uso
  const data = availableData(response, 'uso')
  const chart = data && landUseChart(data, territory)
  if (!chart) return { headline: null, sentence: s.noData }

  const here = pointsChange(chart.here)
  const biome = chart.reference && !isBioma(type) ? pointsChange(chart.reference) : null
  const reading = biome && readingOf(here.magnitude, biome.magnitude)
  return {
    headline: { value: formatPercent(chart.here.to), unit: s.unit },
    sentence: joinSentences(
      s.change(here.change, here.points),
      biome && reading && s.compare(here.change, biome.change, reading, biome.points),
    ),
  }
}

function fireAnswer({ response, territory, type, script }: StepInput): Answer {
  const s = script.answers.fogo
  const data = availableData(response, 'fogo')
  const share = data && fireBurnedSharePct(data)
  if (!data || share === null) return { headline: null, sentence: s.noData }

  const peak = firePeakYear(data)
  // Nothing burned is an answer too, and the comparison would only restate it.
  if (peak === null) return { headline: { value: formatPercent(share), unit: s.unit }, sentence: s.none }
  const reference = isBioma(type) ? null : territory.biome.fireBurnedSharePct
  return {
    headline: { value: formatPercent(share), unit: s.unit },
    sentence: reference === null ? '' : s.compare(formatPercent(reference)),
  }
}

function rainYearSentence(s: StoryScript['answers']['chuva'], lastMm: number, chart: RainChartData): string {
  const mean = formatNumber(chart.meanMm)
  const { direction, pct } = rainComparison(lastMm, chart.meanMm)
  switch (rainKind(lastMm, chart.terciles)) {
    // A rainy year below the mean, or a dry one above it, would take a very
    // skewed series; the sentence then names the class without the distance.
    case 'chuvoso': return direction === 'above' ? s.chuvoso(formatPercent(pct), mean) : s.kindOnly('chuvoso', mean)
    case 'seco':    return direction === 'below' ? s.seco(formatPercent(pct), mean) : s.kindOnly('seco', mean)
    case 'normal':  return s.normal(mean)
  }
}

function rainAnswer({ response, territory, type, script }: StepInput): Answer {
  const s = script.answers.chuva
  const data = availableData(response, 'chuva')
  const chart = data && rainChart(data.series, territory)
  if (!data || !chart) return { headline: null, sentence: s.noData }

  const lastMm = rainLastYearMm(data.series)
  const cmp = against(chart.meanMm, chart.mean.reference, type)
  return {
    headline: lastMm === null
      ? { value: formatNumber(chart.meanMm), unit: s.meanUnit }
      : { value: formatNumber(lastMm), unit: s.unit },
    sentence: joinSentences(
      lastMm === null ? s.missing : rainYearSentence(s, lastMm, chart),
      cmp && s.compare(formatNumber(cmp.reference), cmp.reading),
    ),
  }
}

/** A theme answer the text can read: settled, and of the theme asked. */
function settled(theme: ThemeId, response: ThemeResponse | undefined): response is ThemeResponse {
  return response !== undefined && response.status !== 'unavailable' && response.theme === theme
}

/**
 * The question, the big figure and the one sentence of a step. A theme still
 * loading or failed gets the question alone; the screen shows its own state.
 */
export function stepAnswer(step: Exclude<StepId, 'resumo'>, input: StepInput): StepAnswer {
  const question = input.script.questions[step]
  if (step === 'territorio') return { question, ...territoryAnswer(input) }
  if (!settled(step, input.response)) return { question, headline: null, sentence: '' }

  switch (step) {
    case 'estoque':    return { question, ...stockAnswer(input) }
    case 'fluxo':      return { question, ...fluxAnswer(input) }
    case 'uso':        return { question, ...landUseAnswer(input) }
    case 'fogo':       return { question, ...fireAnswer(input) }
    case 'chuva':      return { question, ...rainAnswer(input) }
  }
}

/**
 * "Sobre os dados". A sentence that holds only for this territory joins the
 * theme it qualifies: the part the inventory covers, a value from the point
 * fallback, a coarser calculation.
 */
export function aboutItems(input: SummaryInput): AboutItem[] {
  const a = input.script.about
  const { responses, territory, type } = input

  const qualified = (theme: ThemeId, text: string): string => {
    const r = responses[theme]
    const settledHere = settled(theme, r)
    return joinSentences(
      text,
      settledHere && r.status === 'available' && r.origin === 'point' && a.point,
      settledHere && r.coarseScaleM !== null && a.coarse(r.coarseScaleM),
    )
  }

  const stock = availableData(responses.estoque, 'estoque')
  const coverage = stock && territory.areaHa > 0 ? stock.report.areaHa / territory.areaHa : null
  const stockGap = coverage !== null && coverage < STOCK_FULL_COVERAGE ? formatPercent(coverage * 100) : null

  const items: AboutItem[] = [
    { title: a.territorio.title, text: clippedToBiome(type) ? a.territorio.text : a.territorio.whole },
    { title: a.estoque.title, text: qualified('estoque', joinSentences(a.estoque.text, stockGap && a.estoque.coverage(stockGap))) },
    { title: a.fluxo.title, text: qualified('fluxo', a.fluxo.text) },
    { title: a.uso.title, text: qualified('uso', a.uso.text) },
    { title: a.fogo.title, text: qualified('fogo', a.fogo.text) },
    { title: a.chuva.title, text: qualified('chuva', a.chuva.text) },
    a.units,
  ]
  if (!isBioma(type)) items.push(a.comparison)
  return items
}
