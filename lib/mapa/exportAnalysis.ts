import type {
  AreaBin,
  PanelResult,
  PixelValueResult,
  ProfiledResult,
  RasterClass,
  RasterStatsResult,
} from '@/types/mapa'
import type { ResultProfile } from '@/config/mapa/resultProfiles'
import { isoDate, numeroCsv, slug } from '@/lib/mapa/format'
import { sourceNote } from '@/lib/mapa/results/format'
import { PT_TEXT, poolLabel, type MapaText } from '@/lib/mapa/text'

/** One layer's part of the file: its identity and its numbers. */
export interface LayerSnapshot {
  layerName: string
  layerUnit?: string
  /** Classes of the categorical layer, to translate the code into a label. */
  layerClasses?: RasterClass[]
  /** Year of the current temporal stop, when the layer is time-navigable. */
  year?: string
  /** Layer whose values are a signed flux, negative where carbon was removed. */
  signedFlux?: boolean
  pixelValue: PixelValueResult | null
  stats: PanelResult | null
  /** Result profile of the layer, which names and scales the results panel's totals. */
  profile?: ResultProfile
  /** Source line of the layer (layerMeta); the file names it without the resolution. */
  source?: string
}

/**
 * Everything an analysis needs to become a file.
 *
 * The recorte is identified once and the layers repeat below it, because the
 * panel now answers for every visible raster and a file per layer would leave
 * whoever wants to compare them joining spreadsheets by hand.
 */
export interface AnalysisSnapshot {
  analysisKind: string | null
  analysisLabel: string | null
  drawnArea: number | null
  drawnLength: number | null
  generatedAt: Date
  layers: LayerSnapshot[]
}

// Portuguese spreadsheets read ';' with a decimal comma; English ones read ','
// with a decimal point. `numeroCsv` and the delimiter follow the locale
// together, so a cell never mixes the two conventions.
const delimiter = (tx: MapaText) => (tx.locale === 'en' ? ',' : ';')
const EOL = '\r\n'
// Without the BOM Excel reads the file as Latin-1 and eats every accent.
const BOM = '﻿'

// Municipality and class names contain the delimiter and quotes often enough
// for this not to be hypothetical; without escaping, the columns slide.
function cell(value: string | number | null | undefined, tx: MapaText): string {
  if (typeof value === 'number') return numeroCsv(value, tx.locale)
  const text = value ?? ''
  const special = delimiter(tx) === ';' ? /[;"\r\n]/ : /[,"\r\n]/
  return special.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

type Row = (cells: (string | number | null | undefined)[]) => string

/** Every line of the file goes through the row writer of one locale. */
function rowWriter(tx: MapaText): Row {
  return (cells) => cells.map((c) => cell(c, tx)).join(delimiter(tx))
}

const word = (tx: MapaText, key: string, values?: Record<string, string | number>) =>
  tx.t(`MapaExport.${key}`, values)

// A "# ..." line is one cell and goes through `cell` like any other. It carries
// free text -- a typed point reads `Coordinates - 9°00'00"S, 40°00'00"W` -- and
// the English file is comma-delimited, so without the escaping the line would
// split across columns and its bare quotes would break an RFC 4180 reader.
const note = (tx: MapaText, text: string): string => cell(text, tx)

function metadataRows(snap: AnalysisSnapshot, tx: MapaText): string[] {
  const recorte = [snap.analysisKind, snap.analysisLabel].filter(Boolean).join(' - ')
  const out = ['# Caativar']
  if (recorte) out.push(note(tx, word(tx, 'recorte', { value: recorte })))
  out.push(note(tx, word(tx, 'generatedAt', { date: isoDate(snap.generatedAt) })))
  return out
}

function layerHeaderRows(layer: LayerSnapshot, tx: MapaText): string[] {
  const out = [note(tx, word(tx, 'layer', { name: layer.layerName }))]
  // The panel drops the minus sign and says "sequestrou" in green instead, but
  // the file keeps the sign so a spreadsheet can sum sinks against sources.
  // Spelling the convention out is what stops the two readings from clashing.
  if (layer.signedFlux) out.push(note(tx, word(tx, 'fluxConvention')))
  if (layer.year) out.push(note(tx, word(tx, 'year', { year: layer.year })))
  const fonte = sourceNote(layer.source, tx)
  if (fonte) out.push(note(tx, `# ${fonte.replace(/\.$/, '')}`))
  return out
}

// Area and length: what the panel shows in the cards above the statistics
// table. Hectares go along with km2 because it is the working unit of
// whoever deals with carbon and land use.
function measurementRows(snap: AnalysisSnapshot, tx: MapaText, row: Row): string[] {
  const out: string[] = []
  if (snap.drawnArea !== null) {
    out.push(row([word(tx, 'rows.analyzedArea'), snap.drawnArea, 'km²']))
    out.push(row([word(tx, 'rows.analyzedArea'), snap.drawnArea * 100, 'ha']))
  }
  if (snap.drawnLength !== null) out.push(row([word(tx, 'rows.length'), snap.drawnLength, 'km']))
  return out.length
    ? [row([word(tx, 'columns.measure'), word(tx, 'columns.value'), word(tx, 'columns.unit')]), ...out]
    : []
}

function pixelRows(layer: LayerSnapshot, tx: MapaText, row: Row): string[] {
  if (layer.pixelValue === null) return []
  const out = [row([word(tx, 'columns.measure'), word(tx, 'columns.value'), word(tx, 'columns.unit')])]
  out.push(row([word(tx, 'rows.pointValue'), layer.pixelValue.value, layer.layerUnit ?? '']))
  if (layer.pixelValue.label) out.push(row([word(tx, 'rows.pointClass'), layer.pixelValue.label, '']))
  return out
}

const statisticHeader = (tx: MapaText, row: Row) =>
  row([word(tx, 'columns.statistic'), word(tx, 'columns.value'), word(tx, 'columns.unit')])

function continuousRows(s: RasterStatsResult & { kind: 'continuous' }, unit: string, tx: MapaText, row: Row): string[] {
  const out = [statisticHeader(tx, row)]
  const push = (label: string, value: number | undefined, withUnit = true) => {
    if (value === undefined) return
    out.push(row([label, value, withUnit ? unit : '']))
  }
  push(word(tx, 'rows.min'), s.stats.min)
  push(word(tx, 'rows.max'), s.stats.max)
  push(word(tx, 'rows.mean'), s.stats.mean)
  push(word(tx, 'rows.median'), s.stats.median)
  push(word(tx, 'rows.std'), s.stats.std)
  // No "Soma": the sum of per-hectare values over pixels is no total of
  // anything, and a spreadsheet user would read it as one.
  push(word(tx, 'rows.pixelCount'), s.stats.count, false)
  return out
}

// Mirrors the bar chart: area per class in hectares and share of the total. The
// final bucket collects codes present in the data but absent from the layer
// configuration, without which the shares would not add up to 100%.
function categoricalRows(
  s: RasterStatsResult & { kind: 'categorical' },
  classes: RasterClass[],
  tx: MapaText,
  row: Row,
): string[] {
  const totalM2 = Object.values(s.areas).reduce((a, b) => a + b, 0)
  if (totalM2 === 0) return []

  const out = [row([word(tx, 'columns.class'), word(tx, 'columns.areaHa'), word(tx, 'columns.percent')])]
  for (const cls of classes) {
    const m2 = s.areas[String(cls.value)] ?? 0
    if (m2 <= 0) continue
    out.push(row([cls.label, m2 / 10_000, (m2 / totalM2) * 100]))
  }

  const knownM2 = classes.reduce((a, cls) => a + (s.areas[String(cls.value)] ?? 0), 0)
  const restoM2 = totalM2 - knownM2
  if (restoM2 > 0) {
    out.push(row([tx.t('MapaResults.unclassified.classes'), restoM2 / 10_000, (restoM2 / totalM2) * 100]))
  }
  return out
}

function timeSeriesRows(s: RasterStatsResult & { kind: 'timeseries' }, unit: string, tx: MapaText, row: Row): string[] {
  const out = [row([word(tx, 'columns.yearColumn'), word(tx, 'columns.value'), word(tx, 'columns.unit')])]
  for (const p of s.series) {
    // Empty cell for nodata: a zero here would be read as a real measurement.
    out.push(row([p.date.slice(0, 4), p.value === null ? '' : p.value, unit]))
  }
  return out
}

// Two blocks, in the same breakdown the doughnut shows on screen. Both add up to
// the same total, and the "Total" row closes the check for whoever opens the sheet.
function stockRows(s: RasterStatsResult & { kind: 'stocks' }, tx: MapaText, row: Row): string[] {
  const { report } = s
  const out = [row([word(tx, 'columns.pool'), word(tx, 'columns.stock'), word(tx, 'columns.unit')])]
  for (const pool of report.pools) out.push(row([poolLabel(pool.band, pool.label, tx), pool.tc, report.unit]))

  out.push('')
  out.push(row([
    word(tx, 'columns.phytophysiognomy'), word(tx, 'columns.stock'), word(tx, 'columns.areaHa'), word(tx, 'columns.unit'),
  ]))
  for (const cls of report.classes) {
    out.push(row([cls.sigla, cls.tc, cls.areaHa, report.unit]))
  }
  out.push(row([word(tx, 'rows.total'), report.totalTc, report.areaHa, report.unit]))
  return out
}

// Value bands of a histogram: from, to (empty for the open top band), hectares.
function binRows(bins: AreaBin[], unit: string, tx: MapaText, row: Row): string[] {
  return [
    row([word(tx, 'columns.bandFrom'), word(tx, 'columns.bandTo'), word(tx, 'columns.unit'), word(tx, 'columns.areaHa')]),
    ...bins.map((b) => row([b.from, b.to ?? '', unit, b.areaHa])),
  ]
}

// The results panel's own kinds. Each block keeps the sign and the unit of the
// panel's headline numbers.
function profiledRows(
  s: ProfiledResult,
  profile: ResultProfile | undefined,
  unit: string,
  tx: MapaText,
  row: Row,
): string[] {
  const out = [statisticHeader(tx, row)]
  switch (s.kind) {
    case 'amount': {
      const p = profile?.archetype === 'amount' ? profile : undefined
      const perHa = p ? `${p.totalUnit}/ha` : unit
      out.push(row([p?.totalLabel ?? word(tx, 'rows.total'), s.total, p?.totalUnit ?? '']))
      if (p?.carbonFraction) out.push(row([word(tx, 'rows.carbon'), s.total * p.carbonFraction, 't C']))
      if (s.validHa > 0) out.push(row([word(tx, 'rows.meanPerHectare'), s.total / s.validHa, perHa]))
      out.push(row([word(tx, 'rows.areaWithData'), s.validHa, 'ha']))
      out.push(row([word(tx, 'rows.areaZero'), s.zeroHa, 'ha']))
      return [...out, '', ...binRows(s.bins, perHa, tx, row)]
    }
    case 'distribution':
      out.push(row([word(tx, 'rows.p10'), s.p10, unit]))
      out.push(row([word(tx, 'rows.median'), s.p50, unit]))
      out.push(row([word(tx, 'rows.p90'), s.p90, unit]))
      out.push(row([word(tx, 'rows.mean'), s.mean, unit]))
      out.push(row([word(tx, 'rows.areaWithData'), s.validHa, 'ha']))
      return [...out, '', ...binRows(s.bins, unit, tx, row)]
    case 'flux': {
      const u = profile?.archetype === 'flux' ? profile.totalUnit : ''
      out.push(row([word(tx, 'rows.total'), s.positive + s.negative, u]))
      out.push(row([word(tx, 'rows.sumPositive'), s.positive, u]))
      out.push(row([word(tx, 'rows.sumNegative'), s.negative, u]))
      out.push(row([word(tx, 'rows.areaPositive'), s.positiveHa, 'ha']))
      out.push(row([word(tx, 'rows.areaNegative'), s.negativeHa, 'ha']))
      out.push(row([word(tx, 'rows.areaWithData'), s.validHa, 'ha']))
      return out
    }
    case 'annual': {
      const p = profile?.archetype === 'annual' ? profile : undefined
      out.push(row([word(tx, 'rows.areaMean'), s.mean, p?.unit || unit]))
      if (s.total !== null && p?.total) out.push(row([p.total.label, s.total, p.total.unit]))
      out.push(row([word(tx, 'rows.areaWithData'), s.validHa, 'ha']))
      return out
    }
    case 'recurrence':
      return [
        row([
          word(tx, 'columns.yearsWithFire'),
          word(tx, 'columns.areaHa'),
          word(tx, 'columns.burnedInYear', { year: s.year }),
        ]),
        ...s.byCount.map((c) => row([c.count, c.areaHa, c.burnedInYearHa])),
        row([word(tx, 'rows.total'), s.regionHa, s.byCount.reduce((a, c) => a + c.burnedInYearHa, 0)]),
      ]
  }
}

function statsRows(layer: LayerSnapshot, tx: MapaText, row: Row): string[] {
  const unit = layer.layerUnit ?? ''
  const stats = layer.stats
  if (!stats) return []
  switch (stats.kind) {
    case 'continuous':  return continuousRows(stats, unit, tx, row)
    case 'categorical': return categoricalRows(stats, layer.layerClasses ?? [], tx, row)
    // The point series of a yearly profile comes back in the profile's unit.
    case 'timeseries':  return timeSeriesRows(stats, layer.profile?.archetype === 'annual' && layer.profile.unit ? layer.profile.unit : unit, tx, row)
    case 'stocks':      return stockRows(stats, tx, row)
    default:            return profiledRows(stats, layer.profile, unit, tx, row)
  }
}

/**
 * Builds the CSV of an analysis. Pure function: it takes the snapshot of the
 * store and returns text, touching neither DOM nor network, so it can be
 * verified in tests.
 *
 * Layer names, units, class labels, the profile and the source line are read
 * from the snapshot as they are, so the caller hands them over already in the
 * user's language (`localizeLayer`, `getResultProfile(id, tx)`); `tx` translates
 * the file's own vocabulary (headers, row names, file name) and picks the
 * delimiter and the decimal mark.
 */
export function buildAnalysisCsv(
  snap: AnalysisSnapshot,
  tx: MapaText = PT_TEXT,
): { filename: string; csv: string } {
  const row = rowWriter(tx)
  const blocks = [metadataRows(snap, tx), measurementRows(snap, tx, row)]
  for (const layer of snap.layers) {
    blocks.push(layerHeaderRows(layer, tx), pixelRows(layer, tx, row), statsRows(layer, tx, row))
  }

  const analysis = word(tx, 'fileNames.analysis')
  const recorte = snap.analysisLabel ?? snap.analysisKind ?? analysis
  // A single layer keeps the name it has always had; only a comparison needs
  // the count, and naming it after the topmost layer would misdescribe the file.
  // With no layer at all -- a drawn line, or a polygon with every raster off --
  // the file is still the area and length rows above, so it is named after the
  // analysis rather than after the "0-camadas" it would otherwise announce.
  const subject =
    snap.layers.length === 0 ? analysis
    : snap.layers.length === 1 ? slug(snap.layers[0].layerName)
    : word(tx, 'fileNames.layers', { count: snap.layers.length })

  const filename = ['caativar', subject, slug(recorte), isoDate(snap.generatedAt)]
    .join('_') + '.csv'

  return {
    filename,
    csv: BOM + blocks.filter((b) => b.length > 0).map((b) => b.join(EOL)).join(EOL + EOL) + EOL,
  }
}
