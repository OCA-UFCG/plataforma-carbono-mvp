// Text of each screen of the Territórios story: picks the variant a theme
// response calls for and fills the messages of TerritoriosStory.json with the
// numbers of storyValues.ts. The language comes in with the inputs (`fmt`), so
// this module stays pure.
//
// A sentence never names the feature: settlement names arrive in capitals and
// with "PA " prefixes, and the recorte types differ in gender. The biome
// variants drop the comparisons with the biome, which would compare the
// Caatinga with itself.

import {
  LAND_USE_YEARS,
  RAIN_FIRST_YEAR,
  RAIN_LAST_YEAR,
  DEGRADATION_YEAR,
  FLUX_FIRST_YEAR,
  FLUX_LAST_YEAR,
  STORY_THEMES,
  type TerritoryType,
} from '@/config/territorios/story'
import { STATE_CODES } from '@/config/territorios/storyScript'
import { fixed, listText, type Fmt } from '@/lib/territorios/i18n'
import {
  CONSERVED_CODE,
  DEGRADED_NEGLIGIBLE_PCT,
  areaParts,
  biomeAreaSharePct,
  biomeFluxDirection,
  degradationLevel,
  degradationSharesPct,
  degradedShareOf,
  fluxChart,
  fluxMetrics,
  forestSharePct,
  formatNumber,
  formatPercent,
  formatTonnes,
  isConservedCode,
  landUseChart,
  rainChart,
  rainComparison,
  rainKind,
  rainLastYearMm,
  readingOf,
  severeShareOf,
  stockChart,
  tonnesParts,
} from '@/lib/territorios/storyValues'
import type {
  AboutItem,
  Reading,
  StepAnswer,
  StepId,
  SummaryRow,
  TerritoryPayload,
  ThemeData,
  ThemeId,
  ThemeResponse,
} from '@/types/territorios'

export interface SummaryInput {
  responses: Partial<Record<ThemeId, ThemeResponse>>
  territory: TerritoryPayload
  type:      TerritoryType
  fmt:       Fmt
}

const [LAND_USE_FIRST, LAND_USE_LAST] = LAND_USE_YEARS

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
  fmt:       Fmt
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

/** Below this share of levels 4 and 5, the degradation answer gives the conserved share instead. */
const SEVERE_MENTION_PCT = 1

function joinSentences(...parts: (string | null | false)[]): string {
  return parts.filter(Boolean).join(' ')
}

/** "na Paraíba", "em Sergipe e na Bahia"; null for a context the table does not know. */
function stateLocative(context: string | undefined, fmt: Fmt): string | null {
  if (!context) return null
  const ufs = context.split('/').map((uf) => uf.trim())
  if (!ufs.length || ufs.some((uf) => !(STATE_CODES as readonly string[]).includes(uf))) return null
  return listText(ufs.map((uf) => fmt.t(`states.${uf}`)), fmt.locale)
}

/** The reading against the Caatinga; null for the biome itself and without a reference. */
function against(here: number, reference: number | null, type: TerritoryType): { reading: Reading; reference: number } | null {
  if (isBioma(type) || reference === null) return null
  const reading = readingOf(here, reference)
  return reading ? { reading, reference } : null
}

/** Shorthands for the numbers, so each sentence below reads as its message. */
function figures(fmt: Fmt) {
  return {
    n:   (value: number) => formatNumber(value, fmt),
    pct: (value: number) => formatPercent(value, fmt),
  }
}

function territoryAnswer({ territory, type, fmt }: StepInput): Answer {
  const key = (name: string, values?: Record<string, string | number>) => fmt.t(`answers.territorio.${name}`, values)
  let sentence: string
  if (isBioma(type)) {
    sentence = key('biome')
  } else if (type.id === 'estado') {
    // A state is the one type whose share of the biome is not "menos de 0,1%".
    sentence = key('state', { biomePct: formatPercent(biomeAreaSharePct(territory), fmt) })
  } else {
    const where = stateLocative(territory.context, fmt)
    sentence = where ? key('located', { where }) : key('plain')
  }
  return { headline: areaParts(territory.areaHa, fmt), sentence }
}

function stockAnswer({ response, territory, type, fmt }: StepInput): Answer {
  const s = (name: string, values?: Record<string, string | number>) => fmt.t(`answers.estoque.${name}`, values)
  const { n } = figures(fmt)
  const data = availableData(response, 'estoque')
  const chart = data && stockChart(data.report, territory)
  // "Sem dado", never zero: where the inventory has no pixel nothing was measured.
  if (!data || !chart) return { headline: null, sentence: s('noData') }

  const { here, reference } = chart.density
  const cmp = against(here, reference, type)
  return {
    headline: { value: n(here), unit: s('unit') },
    sentence: joinSentences(
      cmp && s(`compare.${cmp.reading}`, { biome: n(cmp.reference) }),
      s('total', { tonnes: formatTonnes(data.report.totalTc, fmt) }),
    ),
  }
}

function fluxAnswer({ response, territory, type, fmt }: StepInput): Answer {
  const s = (name: string, values?: Record<string, string | number>) => fmt.t(`answers.fluxo.${name}`, values)
  const { pct: p } = figures(fmt)
  const data = availableData(response, 'fluxo')
  const m = data && fluxMetrics(data)
  if (!data || !m) return { headline: null, sentence: s('noForest') }

  const tonnes = tonnesParts(m.magnitudeMg, fmt)
  // Without the share, a reader credits the whole territory with the total.
  const share = forestSharePct(data)
  const cmp = share === null ? null : against(share, territory.biome.forestSharePct, type)
  return {
    headline: m.direction === 'neutral' ? null : { value: tonnes.value, unit: s('unit', { tonnes: tonnes.unit }) },
    sentence: joinSentences(
      m.direction === 'removal' ? s('removal') : m.direction === 'emission' ? s('emission') : s('balance'),
      share !== null && (cmp
        ? s(`share.${cmp.reading}`, { pct: p(share), biome: p(cmp.reference) })
        : s('shareOnly', { pct: p(share) })),
    ),
  }
}

function landUseAnswer({ response, territory, type, fmt }: StepInput): Answer {
  const s = (name: string, values?: Record<string, string | number>) => fmt.t(`answers.uso.${name}`, values)
  const { pct: p } = figures(fmt)
  const data = availableData(response, 'uso')
  const chart = data && landUseChart(data, territory)
  if (!chart) return { headline: null, sentence: s('noData') }

  const cmp = against(chart.here.to, chart.reference?.to ?? null, type)
  return {
    headline: { value: p(chart.here.to), unit: s('unit', { year: LAND_USE_LAST }) },
    sentence: joinSentences(
      s('before', { pct: p(chart.here.from), year: LAND_USE_FIRST }),
      cmp && s(`compare.${cmp.reading}`, { biome: p(cmp.reference) }),
    ),
  }
}

function degradationPointSentence(code: number | null, fmt: Fmt): string | null {
  const s = (name: string, values?: Record<string, string | number>) => fmt.t(`answers.degradacao.${name}`, values)
  if (code === null) return null
  if (isConservedCode(code)) return s('pointConserved')
  const level = degradationLevel(code)
  return level === null ? null : s('pointLevel', { level: String(level) })
}

function degradationAnswer({ response, territory, type, fmt }: StepInput): Answer {
  const s = (name: string, values?: Record<string, string | number>) => fmt.t(`answers.degradacao.${name}`, values)
  const { pct: p } = figures(fmt)
  const noData = { headline: null, sentence: s('noData') }
  const data = availableData(response, 'degradacao')
  if (!data) return noData
  // A class is not an amount, so the point fallback has no big figure.
  if (response?.origin === 'point') {
    const sentence = degradationPointSentence(data.pointCode, fmt)
    return sentence ? { headline: null, sentence } : noData
  }
  const shares = degradationSharesPct(data)
  if (!shares) return noData

  const degraded = degradedShareOf(shares)
  const severe = severeShareOf(shares)
  const cmp = against(degraded, territory.biome.degradedSharePct, type)
  return {
    headline: { value: p(degraded), unit: s('unit') },
    sentence: joinSentences(
      cmp && s(`compare.${cmp.reading}`, { biome: p(cmp.reference) }),
      // A negligible degraded share lands here too, and reads as the
      // conserved share it leaves.
      severe >= SEVERE_MENTION_PCT ? s('severe', { pct: p(severe) }) : s('conserved', { pct: p(shares[CONSERVED_CODE]) }),
    ),
  }
}

function rainYearSentence(lastMm: number, meanMm: number, fmt: Fmt): string {
  const { n, pct: p } = figures(fmt)
  const { pct } = rainComparison(lastMm, meanMm)
  const kind = rainKind(lastMm, meanMm)
  return fmt.t(`answers.chuva.${kind}`, { pct: p(pct), mean: n(meanMm) })
}

function rainAnswer({ response, territory, type, fmt }: StepInput): Answer {
  const s = (name: string, values?: Record<string, string | number>) => fmt.t(`answers.chuva.${name}`, values)
  const { n } = figures(fmt)
  const data = availableData(response, 'chuva')
  const chart = data && rainChart(data.series, territory)
  if (!data || !chart) return { headline: null, sentence: s('noData') }

  const lastMm = rainLastYearMm(data.series)
  const cmp = against(chart.meanMm, chart.mean.reference, type)
  return {
    headline: lastMm === null
      ? { value: n(chart.meanMm), unit: s('meanUnit') }
      : { value: n(lastMm), unit: s('unit', { year: RAIN_LAST_YEAR }) },
    sentence: joinSentences(
      lastMm === null ? s('missing', { year: RAIN_LAST_YEAR }) : rainYearSentence(lastMm, chart.meanMm, fmt),
      cmp && s(`compare.${cmp.reading}`, { biome: n(cmp.reference) }),
    ),
  }
}

/** A theme answer the text can read: settled, and of the theme asked. */
function settled(theme: ThemeId, response: ThemeResponse | undefined): response is ThemeResponse {
  return response !== undefined && response.status !== 'unavailable' && response.theme === theme
}

/** Shown as soon as the step opens, before its data arrives. */
function stepQuestion(step: Exclude<StepId, 'resumo'>, fmt: Fmt): string {
  const year = step === 'uso' ? LAND_USE_FIRST : step === 'chuva' ? RAIN_LAST_YEAR : undefined
  return fmt.t(`questions.${step}`, year === undefined ? undefined : { year })
}

/**
 * The question, the big figure and the one sentence of a step. A theme still
 * loading or failed gets the question alone; the screen shows its own state.
 */
export function stepAnswer(step: Exclude<StepId, 'resumo'>, input: StepInput): StepAnswer {
  const question = stepQuestion(step, input.fmt)
  if (step === 'territorio') return { question, ...territoryAnswer(input) }
  if (!settled(step, input.response)) return { question, headline: null, sentence: '' }

  switch (step) {
    case 'estoque':    return { question, ...stockAnswer(input) }
    case 'fluxo':      return { question, ...fluxAnswer(input) }
    case 'uso':        return { question, ...landUseAnswer(input) }
    case 'degradacao': return { question, ...degradationAnswer(input) }
    case 'chuva':      return { question, ...rainAnswer(input) }
  }
}

function stockRow({ response, territory, type, fmt }: StepInput): Row {
  const s = (name: string, values?: Record<string, string | number>) => fmt.t(`summary.estoque.${name}`, values)
  const { n } = figures(fmt)
  const data = availableData(response, 'estoque')
  const chart = data && stockChart(data.report, territory)
  if (!data || !chart) return { headline: null, sentence: fmt.t('answers.estoque.noData'), reading: null }

  const { here, reference } = chart.density
  const cmp = against(here, reference, type)
  return {
    headline: { value: n(here), unit: s('unit') },
    sentence: joinSentences(
      s('total', { tonnes: formatTonnes(data.report.totalTc, fmt) }),
      cmp && s('biome', { biome: n(cmp.reference) }),
    ),
    reading:  cmp?.reading ?? null,
  }
}

function fluxRow({ response, territory, type, fmt }: StepInput): Row {
  const s = (name: string, values?: Record<string, string | number>) => fmt.t(`summary.fluxo.${name}`, values)
  const { n } = figures(fmt)
  const data = availableData(response, 'fluxo')
  const m = data && fluxMetrics(data)
  if (!data || !m) return { headline: null, sentence: fmt.t('answers.fluxo.noForest'), reading: null }
  if (m.direction === 'neutral') return { headline: null, sentence: s('balance'), reading: null }

  // Per hectare of forest is the one flux figure a territory and the biome
  // share a base for; the total goes in the sentence.
  const perHa = fluxChart(data, territory)?.perForestHa ?? null
  const cmp = perHa ? against(perHa.here, perHa.reference, type) : null
  const biomePerHa = territory.biome.fluxPerForestHaMg
  const tonnes = formatTonnes(m.magnitudeMg, fmt)
  return {
    headline: { value: n(m.perForestHaMg), unit: s('unit') },
    sentence: joinSentences(
      m.direction === 'removal' ? s('removal', { tonnes }) : s('emission', { tonnes }),
      cmp
        ? s('biome', { biome: n(cmp.reference) })
        : !isBioma(type) && biomePerHa !== null && s(`biomeDirection.${biomeFluxDirection(biomePerHa)}`),
    ),
    reading: cmp?.reading ?? null,
  }
}

function landUseRow({ response, territory, type, fmt }: StepInput): Row {
  const s = (name: string, values?: Record<string, string | number>) => fmt.t(`summary.uso.${name}`, values)
  const { pct: p } = figures(fmt)
  const data = availableData(response, 'uso')
  const chart = data && landUseChart(data, territory)
  if (!chart) return { headline: null, sentence: fmt.t('answers.uso.noData'), reading: null }

  const ref = isBioma(type) ? null : chart.reference
  return {
    headline: { value: p(chart.here.to), unit: s('unit', { year: LAND_USE_LAST }) },
    sentence: joinSentences(
      s('before', { pct: p(chart.here.from), year: LAND_USE_FIRST }),
      ref && s('biome', { from: p(ref.from), to: p(ref.to) }),
    ),
    reading: ref ? readingOf(chart.here.to, ref.to) : null,
  }
}

function degradationRow({ response, territory, type, fmt }: StepInput): Row {
  const s = (name: string, values?: Record<string, string | number>) => fmt.t(`summary.degradacao.${name}`, values)
  const { pct: p } = figures(fmt)
  const noData: Row = { headline: null, sentence: fmt.t('answers.degradacao.noData'), reading: null }
  const data = availableData(response, 'degradacao')
  if (!data) return noData
  if (response?.origin === 'point') {
    const sentence = degradationPointSentence(data.pointCode, fmt)
    return sentence ? { headline: null, sentence, reading: null } : noData
  }
  const shares = degradationSharesPct(data)
  if (!shares) return noData

  const degraded = degradedShareOf(shares)
  const cmp = against(degraded, territory.biome.degradedSharePct, type)
  return {
    headline: { value: p(degraded), unit: s('unit') },
    sentence: joinSentences(
      cmp && s('biome', { biome: p(cmp.reference) }),
      s('conserved', { pct: p(shares[CONSERVED_CODE]) }),
    ),
    reading:  cmp?.reading ?? null,
  }
}

function rainRow({ response, territory, type, fmt }: StepInput): Row {
  const s = (name: string, values?: Record<string, string | number>) => fmt.t(`summary.chuva.${name}`, values)
  const { n } = figures(fmt)
  const data = availableData(response, 'chuva')
  const chart = data && rainChart(data.series, territory)
  if (!data || !chart) return { headline: null, sentence: fmt.t('answers.chuva.noData'), reading: null }

  // The mean is what the reading compares, so it is the row's figure.
  const lastMm = rainLastYearMm(data.series)
  const cmp = against(chart.meanMm, chart.mean.reference, type)
  return {
    headline: { value: n(chart.meanMm), unit: s('unit') },
    sentence: joinSentences(
      cmp && s('biome', { biome: n(cmp.reference) }),
      lastMm === null
        ? s('missing', { year: RAIN_LAST_YEAR })
        : s(`year.${rainKind(lastMm, chart.meanMm)}`, { year: RAIN_LAST_YEAR, mm: n(lastMm) }),
    ),
    reading: cmp?.reading ?? null,
  }
}

/**
 * One line per theme of the final sheet, in STORY_THEMES order. A theme still
 * loading or failed gets an empty line; the sheet shows its own state.
 */
export function summaryRows(input: SummaryInput): SummaryRow[] {
  return STORY_THEMES.map(({ id }): SummaryRow => {
    const head = { theme: id, title: input.fmt.t(`summary.titles.${id}`) }
    const response = input.responses[id]
    if (!settled(id, response)) return { ...head, headline: null, sentence: '', reading: null }

    const row = { response, territory: input.territory, type: input.type, fmt: input.fmt }
    switch (id) {
      case 'estoque':    return { ...head, ...stockRow(row) }
      case 'fluxo':      return { ...head, ...fluxRow(row) }
      case 'uso':        return { ...head, ...landUseRow(row) }
      case 'degradacao': return { ...head, ...degradationRow(row) }
      case 'chuva':      return { ...head, ...rainRow(row) }
    }
  })
}

/**
 * "Sobre os dados". A sentence that holds only for this territory joins the
 * theme it qualifies: the part the inventory covers, a value from the point
 * fallback, a coarser calculation, the share without degradation data.
 */
export function aboutItems(input: SummaryInput): AboutItem[] {
  const { responses, territory, type, fmt } = input
  const a = (name: string, values?: Record<string, string | number>) => fmt.t(`about.${name}`, values)
  const item = (theme: string, text: string): AboutItem => ({ title: a(`${theme}.title`), text })

  const qualified = (theme: ThemeId, text: string): string => {
    const r = responses[theme]
    const settledHere = settled(theme, r)
    return joinSentences(
      text,
      settledHere && r.status === 'available' && r.origin === 'point' && a('point'),
      settledHere && r.coarseScaleM !== null && a('coarse', { m: fixed(r.coarseScaleM, 0, fmt.locale) }),
    )
  }

  const degradation = availableData(responses.degradacao, 'degradacao')
  const shares = degradation && responses.degradacao?.origin !== 'point' ? degradationSharesPct(degradation) : null
  // The same threshold as the chart's hatched band, so the text names the gap
  // exactly when the chart draws it.
  const noDataPct = shares && shares[0] > DEGRADED_NEGLIGIBLE_PCT ? formatPercent(shares[0], fmt) : null
  const stock = availableData(responses.estoque, 'estoque')
  const coverage = stock && territory.areaHa > 0 ? stock.report.areaHa / territory.areaHa : null
  const stockGap = coverage !== null && coverage < STOCK_FULL_COVERAGE ? formatPercent(coverage * 100, fmt) : null

  const years = { first: LAND_USE_FIRST, last: LAND_USE_LAST }
  const items: AboutItem[] = [
    item('territorio', a('territorio.text')),
    item('estoque', qualified('estoque', joinSentences(a('estoque.text'), stockGap && a('estoque.coverage', { pct: stockGap })))),
    item('fluxo', qualified('fluxo', a('fluxo.text', { first: FLUX_FIRST_YEAR, last: FLUX_LAST_YEAR }))),
    item('uso', qualified('uso', a('uso.text', years))),
    item('degradacao', qualified('degradacao', a('degradacao.text', { year: DEGRADATION_YEAR })
      + (noDataPct ? a('degradacao.noDataHere', { pct: noDataPct }) : a('degradacao.noDataPeriod')))),
    item('chuva', qualified('chuva', a('chuva.text', { first: RAIN_FIRST_YEAR, last: RAIN_LAST_YEAR }))),
    item('units', a('units.text')),
  ]
  if (!isBioma(type)) items.push(item('comparison', a('comparison.text')))
  return items
}
