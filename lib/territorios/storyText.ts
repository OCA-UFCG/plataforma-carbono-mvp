// Text of each screen of the Territórios story: picks the variant a theme
// response calls for and fills the templates of storyScript.ts with the numbers
// of storyValues.ts.
//
// A sentence never names the feature: settlement names arrive in capitals and
// with "PA " prefixes, and the recorte types differ in gender. The biome
// variants drop the comparisons with the biome, which would compare the
// Caatinga with itself.

import { STORY_THEMES, type TerritoryType } from '@/config/territorios/story'
import {
  ABOUT_SCRIPT,
  ANSWER_SCRIPT,
  FEMININE_TYPES,
  STATE_LOCATIVE,
  STEP_QUESTIONS,
  SUMMARY_ROW_SCRIPT,
  TERRITORY_SCRIPT,
} from '@/config/territorios/storyScript'
import {
  areaParts,
  biomeAreaSharePct,
  biomeFluxDirection,
  fireBurnedSharePct,
  firePeakYear,
  fluxChart,
  fluxMetrics,
  forestSharePct,
  formatNumber,
  formatPercent,
  formatTonnes,
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
  Reading,
  StepAnswer,
  StepId,
  SummaryRow,
  TerritoryPayload,
  ThemeData,
  ThemeId,
  ThemeResponse,
  Tone,
} from '@/types/territorios'

export interface SummaryInput {
  responses: Partial<Record<ThemeId, ThemeResponse>>
  territory: TerritoryPayload
  type:      TerritoryType
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
}

type Answer = Omit<StepAnswer, 'question'>
type Row = Omit<SummaryRow, 'theme' | 'title'>

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

function territoryAnswer({ territory, type }: StepInput): Answer {
  const s = ANSWER_SCRIPT.territorio
  let sentence: string
  if (isBioma(type)) {
    sentence = s.biome
  } else if (type.id === 'estado') {
    // A state is the one type whose share of the biome is not "menos de 0,1%".
    sentence = s.state(formatPercent(biomeAreaSharePct(territory)))
  } else {
    const where = stateLocative(territory.context)
    sentence = where ? s.located(where) : s.plain
  }
  return { headline: areaParts(territory.areaHa), sentence }
}

/** Below this share of the biome the card would only say "menos de 0,1%". */
const SHARE_CARD_MIN_PCT = 0.1

/**
 * The cards under the territory's area (Figma 19254:37459): its share of the
 * biome, from 0,1% up, and its rank by area among the territories of its type.
 * None for the biome, which is the whole. Most municipalities and every
 * smaller type fall under 0,1% and keep the rank alone.
 */
export function territoryIndicators({ territory, type }: { territory: TerritoryPayload; type: TerritoryType }): Indicator[] {
  if (isBioma(type)) return []
  const s = TERRITORY_SCRIPT
  const share = biomeAreaSharePct(territory)
  const items: Indicator[] = share >= SHARE_CARD_MIN_PCT ? [{ value: formatPercent(share), text: s.biomeShare }] : []
  const rank = territory.areaRank
  if (rank && type.plural) {
    const feminine = FEMININE_TYPES.has(type.id)
    items.push({ value: s.rankValue(rank.position, feminine), text: s.rankText(rank.total, type.plural, feminine) })
  }
  return items
}

function stockAnswer({ response, territory, type }: StepInput): Answer {
  const s = ANSWER_SCRIPT.estoque
  const data = availableData(response, 'estoque')
  const chart = data && stockChart(data.report, territory)
  // "Sem dado", never zero: where the inventory has no pixel nothing was measured.
  if (!data || !chart) return { headline: null, sentence: s.noData }

  const { here, reference } = chart.density
  const cmp = against(here, reference, type)
  return {
    headline: { value: formatNumber(here), unit: s.unit },
    sentence: joinSentences(
      cmp && s.compare(cmp.reading, formatNumber(cmp.reference)),
      s.total(formatTonnes(data.report.totalTc)),
    ),
  }
}

function fluxAnswer({ response, territory, type }: StepInput): Answer {
  const s = ANSWER_SCRIPT.fluxo
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

function landUseAnswer({ response, territory, type }: StepInput): Answer {
  const s = ANSWER_SCRIPT.uso
  const data = availableData(response, 'uso')
  const chart = data && landUseChart(data, territory)
  if (!chart) return { headline: null, sentence: s.noData }

  const cmp = against(chart.here.to, chart.reference?.to ?? null, type)
  return {
    headline: { value: formatPercent(chart.here.to), unit: s.unit },
    sentence: joinSentences(
      s.before(formatPercent(chart.here.from)),
      cmp && s.compare(formatPercent(cmp.reference), cmp.reading),
    ),
  }
}

function fireAnswer({ response, territory, type }: StepInput): Answer {
  const s = ANSWER_SCRIPT.fogo
  const data = availableData(response, 'fogo')
  const share = data && fireBurnedSharePct(data)
  if (!data || share === null) return { headline: null, sentence: s.noData }

  const peak = firePeakYear(data)
  // Nothing burned is an answer too, and the comparison would only restate it.
  if (peak === null) return { headline: { value: formatPercent(share), unit: s.unit }, sentence: s.none }
  const cmp = against(share, territory.biome.fireBurnedSharePct, type)
  return {
    headline: { value: formatPercent(share), unit: s.unit },
    sentence: joinSentences(cmp && s.compare(formatPercent(cmp.reference)), s.peak(peak)),
  }
}

function rainYearSentence(lastMm: number, meanMm: number): string {
  const s = ANSWER_SCRIPT.chuva
  const mean = formatNumber(meanMm)
  const { pct } = rainComparison(lastMm, meanMm)
  switch (rainKind(lastMm, meanMm)) {
    case 'chuvoso': return s.chuvoso(formatPercent(pct), mean)
    case 'seco':    return s.seco(formatPercent(pct), mean)
    case 'normal':  return s.normal(mean)
  }
}

function rainAnswer({ response, territory, type }: StepInput): Answer {
  const s = ANSWER_SCRIPT.chuva
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
      lastMm === null ? s.missing : rainYearSentence(lastMm, chart.meanMm),
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
  const question = STEP_QUESTIONS[step]
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
 * Whether more than the Caatinga is good news, per theme; null where it is
 * neither, as with rain. Flux is left out: more per hectare is good news for a
 * removal and bad news for an emission, so its row passes its own direction.
 */
const MORE_IS_BETTER: Record<Exclude<ThemeId, 'fluxo'>, boolean | null> = {
  estoque: true,
  uso:     true,
  fogo:    false,
  chuva:   null,
}

/** The color of a reading's badge on the summary (Figma 19254:37508). */
export function readingTone(reading: Reading | null, moreIsBetter: boolean | null): Tone | null {
  if (reading === null) return null
  if (reading === 'perto' || moreIsBetter === null) return 'neutral'
  return (reading === 'acima') === moreIsBetter ? 'good' : 'bad'
}

function stockRow({ response, territory, type }: StepInput): Row {
  const s = SUMMARY_ROW_SCRIPT.estoque
  const data = availableData(response, 'estoque')
  const chart = data && stockChart(data.report, territory)
  if (!data || !chart) return { headline: null, sentence: ANSWER_SCRIPT.estoque.noData, reading: null, tone: null }

  const { here, reference } = chart.density
  const cmp = against(here, reference, type)
  const reading = cmp?.reading ?? null
  return {
    headline: { value: formatNumber(here), unit: s.unit },
    sentence: joinSentences(s.total(formatTonnes(data.report.totalTc)), cmp && s.biome(formatNumber(cmp.reference))),
    reading,
    tone:     readingTone(reading, MORE_IS_BETTER.estoque),
  }
}

function fluxRow({ response, territory, type }: StepInput): Row {
  const s = SUMMARY_ROW_SCRIPT.fluxo
  const data = availableData(response, 'fluxo')
  const m = data && fluxMetrics(data)
  if (!data || !m) return { headline: null, sentence: ANSWER_SCRIPT.fluxo.noForest, reading: null, tone: null }
  if (m.direction === 'neutral') return { headline: null, sentence: s.balance, reading: null, tone: null }

  // Per hectare of forest is the one flux figure a territory and the biome
  // share a base for; the total goes in the sentence.
  const perHa = fluxChart(data, territory)?.perForestHa ?? null
  const cmp = perHa ? against(perHa.here, perHa.reference, type) : null
  const biomePerHa = territory.biome.fluxPerForestHaMg
  const tonnes = formatTonnes(m.magnitudeMg)
  return {
    headline: { value: formatNumber(m.perForestHaMg), unit: s.unit },
    sentence: joinSentences(
      m.direction === 'removal' ? s.removal(tonnes) : s.emission(tonnes),
      cmp
        ? s.biome(formatNumber(cmp.reference))
        : !isBioma(type) && biomePerHa !== null && s.biomeDirection[biomeFluxDirection(biomePerHa)],
    ),
    reading: cmp?.reading ?? null,
    tone:    readingTone(cmp?.reading ?? null, m.direction === 'removal'),
  }
}

function landUseRow({ response, territory, type }: StepInput): Row {
  const s = SUMMARY_ROW_SCRIPT.uso
  const data = availableData(response, 'uso')
  const chart = data && landUseChart(data, territory)
  if (!chart) return { headline: null, sentence: ANSWER_SCRIPT.uso.noData, reading: null, tone: null }

  const ref = isBioma(type) ? null : chart.reference
  return {
    headline: { value: formatPercent(chart.here.to), unit: s.unit },
    sentence: joinSentences(
      s.before(formatPercent(chart.here.from)),
      ref && s.biome(formatPercent(ref.from), formatPercent(ref.to)),
    ),
    reading: ref ? readingOf(chart.here.to, ref.to) : null,
    tone:    readingTone(ref ? readingOf(chart.here.to, ref.to) : null, MORE_IS_BETTER.uso),
  }
}

function fireRow({ response, territory, type }: StepInput): Row {
  const s = SUMMARY_ROW_SCRIPT.fogo
  const data = availableData(response, 'fogo')
  const share = data && fireBurnedSharePct(data)
  if (!data || share === null) return { headline: null, sentence: ANSWER_SCRIPT.fogo.noData, reading: null, tone: null }

  const peak = firePeakYear(data)
  const cmp = against(share, territory.biome.fireBurnedSharePct, type)
  return {
    headline: { value: formatPercent(share), unit: s.unit },
    sentence: joinSentences(cmp && s.biome(formatPercent(cmp.reference)), peak === null ? s.none : s.peak(peak)),
    reading:  cmp?.reading ?? null,
    tone:     readingTone(cmp?.reading ?? null, MORE_IS_BETTER.fogo),
  }
}

function rainRow({ response, territory, type }: StepInput): Row {
  const s = SUMMARY_ROW_SCRIPT.chuva
  const data = availableData(response, 'chuva')
  const chart = data && rainChart(data.series, territory)
  if (!data || !chart) return { headline: null, sentence: ANSWER_SCRIPT.chuva.noData, reading: null, tone: null }

  // The mean is what the reading compares, so it is the row's figure.
  const lastMm = rainLastYearMm(data.series)
  const cmp = against(chart.meanMm, chart.mean.reference, type)
  return {
    headline: { value: formatNumber(chart.meanMm), unit: s.unit },
    sentence: joinSentences(
      cmp && s.biome(formatNumber(cmp.reference)),
      lastMm === null ? s.missing : s.year[rainKind(lastMm, chart.meanMm)](formatNumber(lastMm)),
    ),
    reading: cmp?.reading ?? null,
    tone:    readingTone(cmp?.reading ?? null, MORE_IS_BETTER.chuva),
  }
}

/**
 * One line per theme of the final sheet, in STORY_THEMES order. A theme still
 * loading or failed gets an empty line; the sheet shows its own state.
 */
export function summaryRows(input: SummaryInput): SummaryRow[] {
  return STORY_THEMES.map(({ id }): SummaryRow => {
    const head = { theme: id, title: SUMMARY_ROW_SCRIPT.titles[id] }
    const response = input.responses[id]
    if (!settled(id, response)) return { ...head, headline: null, sentence: '', reading: null, tone: null }

    const row = { response, territory: input.territory, type: input.type }
    switch (id) {
      case 'estoque':    return { ...head, ...stockRow(row) }
      case 'fluxo':      return { ...head, ...fluxRow(row) }
      case 'uso':        return { ...head, ...landUseRow(row) }
      case 'fogo':       return { ...head, ...fireRow(row) }
      case 'chuva':      return { ...head, ...rainRow(row) }
    }
  })
}

/**
 * "Sobre os dados". A sentence that holds only for this territory joins the
 * theme it qualifies: the part the inventory covers, a value from the point
 * fallback, a coarser calculation.
 */
export function aboutItems(input: SummaryInput): AboutItem[] {
  const a = ABOUT_SCRIPT
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
    a.territorio,
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
