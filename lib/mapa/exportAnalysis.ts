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

const DELIM = ';'
const EOL = '\r\n'
// Without the BOM Excel reads the file as Latin-1 and eats every accent.
const BOM = '﻿'

// Municipality and class names contain semicolons and quotes often enough for
// this not to be hypothetical; without escaping, the columns slide.
function cell(value: string | number | null | undefined): string {
  if (typeof value === 'number') return numeroCsv(value)
  const text = value ?? ''
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(cell).join(DELIM)
}

function metadataRows(snap: AnalysisSnapshot): string[] {
  const recorte = [snap.analysisKind, snap.analysisLabel].filter(Boolean).join(' - ')
  const out = ['# Caativar']
  if (recorte) out.push(`# Recorte: ${recorte}`)
  out.push(`# Gerado em: ${isoDate(snap.generatedAt)}`)
  return out
}

function layerHeaderRows(layer: LayerSnapshot): string[] {
  const out = [`# Camada: ${layer.layerName}`]
  // The panel drops the minus sign and says "sequestrou" in green instead, but
  // the file keeps the sign so a spreadsheet can sum sinks against sources.
  // Spelling the convention out is what stops the two readings from clashing.
  if (layer.signedFlux) {
    out.push('# Convenção: valor negativo = sequestro, positivo = emissão')
  }
  if (layer.year) out.push(`# Ano: ${layer.year}`)
  const fonte = sourceNote(layer.source)
  if (fonte) out.push(`# ${fonte.replace(/\.$/, '')}`)
  return out
}

// Area and length: what the panel shows in the cards above the statistics
// table. Hectares go along with km2 because it is the working unit of
// whoever deals with carbon and land use.
function measurementRows(snap: AnalysisSnapshot): string[] {
  const out: string[] = []
  if (snap.drawnArea !== null) {
    out.push(row(['Área analisada', snap.drawnArea, 'km²']))
    out.push(row(['Área analisada', snap.drawnArea * 100, 'ha']))
  }
  if (snap.drawnLength !== null) out.push(row(['Comprimento', snap.drawnLength, 'km']))
  return out.length ? [row(['medida', 'valor', 'unidade']), ...out] : []
}

function pixelRows(layer: LayerSnapshot): string[] {
  if (layer.pixelValue === null) return []
  const out = [row(['medida', 'valor', 'unidade'])]
  out.push(row(['Valor no ponto', layer.pixelValue.value, layer.layerUnit ?? '']))
  if (layer.pixelValue.label) out.push(row(['Classe no ponto', layer.pixelValue.label, '']))
  return out
}

function continuousRows(s: RasterStatsResult & { kind: 'continuous' }, unit: string): string[] {
  const out = [row(['estatistica', 'valor', 'unidade'])]
  const push = (label: string, value: number | undefined, withUnit = true) => {
    if (value === undefined) return
    out.push(row([label, value, withUnit ? unit : '']))
  }
  push('Mínimo', s.stats.min)
  push('Máximo', s.stats.max)
  push('Média', s.stats.mean)
  push('Mediana', s.stats.median)
  push('Desvio padrão', s.stats.std)
  // No "Soma": the sum of per-hectare values over pixels is no total of
  // anything, and a spreadsheet user would read it as one.
  push('Contagem de pixels', s.stats.count, false)
  return out
}

// Mirrors the bar chart: area per class in hectares and share of the total. The
// final bucket collects codes present in the data but absent from the layer
// configuration, without which the shares would not add up to 100%.
function categoricalRows(
  s: RasterStatsResult & { kind: 'categorical' },
  classes: RasterClass[],
): string[] {
  const totalM2 = Object.values(s.areas).reduce((a, b) => a + b, 0)
  if (totalM2 === 0) return []

  const out = [row(['classe', 'area_ha', 'percentual'])]
  for (const cls of classes) {
    const m2 = s.areas[String(cls.value)] ?? 0
    if (m2 <= 0) continue
    out.push(row([cls.label, m2 / 10_000, (m2 / totalM2) * 100]))
  }

  const knownM2 = classes.reduce((a, cls) => a + (s.areas[String(cls.value)] ?? 0), 0)
  const restoM2 = totalM2 - knownM2
  if (restoM2 > 0) {
    out.push(row(['Não classificadas', restoM2 / 10_000, (restoM2 / totalM2) * 100]))
  }
  return out
}

function timeSeriesRows(s: RasterStatsResult & { kind: 'timeseries' }, unit: string): string[] {
  const out = [row(['ano', 'valor', 'unidade'])]
  for (const p of s.series) {
    // Empty cell for nodata: a zero here would be read as a real measurement.
    out.push(row([p.date.slice(0, 4), p.value === null ? '' : p.value, unit]))
  }
  return out
}

// Two blocks, in the same breakdown the doughnut shows on screen. Both add up to
// the same total, and the "Total" row closes the check for whoever opens the sheet.
function stockRows(s: RasterStatsResult & { kind: 'stocks' }): string[] {
  const { report } = s
  const out = [row(['reservatorio', 'estoque', 'unidade'])]
  for (const pool of report.pools) out.push(row([pool.label, pool.tc, report.unit]))

  out.push('')
  out.push(row(['fitofisionomia', 'estoque', 'area_ha', 'unidade']))
  for (const cls of report.classes) {
    out.push(row([cls.sigla, cls.tc, cls.areaHa, report.unit]))
  }
  out.push(row(['Total', report.totalTc, report.areaHa, report.unit]))
  return out
}

// Value bands of a histogram: from, to (empty for the open top band), hectares.
function binRows(bins: AreaBin[], unit: string): string[] {
  return [
    row(['faixa_de', 'faixa_ate', 'unidade', 'area_ha']),
    ...bins.map((b) => row([b.from, b.to ?? '', unit, b.areaHa])),
  ]
}

// The results panel's own kinds. Each block keeps the sign and the unit of the
// panel's headline numbers.
function profiledRows(s: ProfiledResult, profile: ResultProfile | undefined, unit: string): string[] {
  const out = [row(['estatistica', 'valor', 'unidade'])]
  switch (s.kind) {
    case 'amount': {
      const p = profile?.archetype === 'amount' ? profile : undefined
      const perHa = p ? `${p.totalUnit}/ha` : unit
      out.push(row([p?.totalLabel ?? 'Total', s.total, p?.totalUnit ?? '']))
      if (p?.carbonFraction) out.push(row(['Carbono', s.total * p.carbonFraction, 't C']))
      if (s.validHa > 0) out.push(row(['Média por hectare', s.total / s.validHa, perHa]))
      out.push(row(['Área com dado', s.validHa, 'ha']))
      out.push(row(['Área com valor zero', s.zeroHa, 'ha']))
      return [...out, '', ...binRows(s.bins, perHa)]
    }
    case 'distribution':
      out.push(row(['Percentil 10', s.p10, unit]))
      out.push(row(['Mediana', s.p50, unit]))
      out.push(row(['Percentil 90', s.p90, unit]))
      out.push(row(['Média', s.mean, unit]))
      out.push(row(['Área com dado', s.validHa, 'ha']))
      return [...out, '', ...binRows(s.bins, unit)]
    case 'flux': {
      const u = profile?.archetype === 'flux' ? profile.totalUnit : ''
      out.push(row(['Total', s.positive + s.negative, u]))
      out.push(row(['Soma dos valores positivos', s.positive, u]))
      out.push(row(['Soma dos valores negativos', s.negative, u]))
      out.push(row(['Área com valor positivo', s.positiveHa, 'ha']))
      out.push(row(['Área com valor negativo', s.negativeHa, 'ha']))
      out.push(row(['Área com dado', s.validHa, 'ha']))
      return out
    }
    case 'annual': {
      const p = profile?.archetype === 'annual' ? profile : undefined
      out.push(row(['Média da área', s.mean, p?.unit || unit]))
      if (s.total !== null && p?.total) out.push(row([p.total.label, s.total, p.total.unit]))
      out.push(row(['Área com dado', s.validHa, 'ha']))
      return out
    }
    case 'recurrence':
      return [
        row(['anos_com_fogo', 'area_ha', `queimou_em_${s.year}_ha`]),
        ...s.byCount.map((c) => row([c.count, c.areaHa, c.burnedInYearHa])),
        row(['Total', s.regionHa, s.byCount.reduce((a, c) => a + c.burnedInYearHa, 0)]),
      ]
  }
}

function statsRows(layer: LayerSnapshot): string[] {
  const unit = layer.layerUnit ?? ''
  const stats = layer.stats
  if (!stats) return []
  switch (stats.kind) {
    case 'continuous':  return continuousRows(stats, unit)
    case 'categorical': return categoricalRows(stats, layer.layerClasses ?? [])
    // The point series of a yearly profile comes back in the profile's unit.
    case 'timeseries':  return timeSeriesRows(stats, layer.profile?.archetype === 'annual' && layer.profile.unit ? layer.profile.unit : unit)
    case 'stocks':      return stockRows(stats)
    default:            return profiledRows(stats, layer.profile, unit)
  }
}

/**
 * Builds the CSV of an analysis. Pure function: it takes the snapshot of the
 * store and returns text, touching neither DOM nor network, so it can be
 * verified in tests.
 */
export function buildAnalysisCsv(snap: AnalysisSnapshot): { filename: string; csv: string } {
  const blocks = [metadataRows(snap), measurementRows(snap)]
  for (const layer of snap.layers) {
    blocks.push(layerHeaderRows(layer), pixelRows(layer), statsRows(layer))
  }

  const recorte = snap.analysisLabel ?? snap.analysisKind ?? 'analise'
  // A single layer keeps the name it has always had; only a comparison needs
  // the count, and naming it after the topmost layer would misdescribe the file.
  // With no layer at all -- a drawn line, or a polygon with every raster off --
  // the file is still the area and length rows above, so it is named after the
  // analysis rather than after the "0-camadas" it would otherwise announce.
  const subject =
    snap.layers.length === 0 ? 'analise'
    : snap.layers.length === 1 ? slug(snap.layers[0].layerName)
    : `${snap.layers.length}-camadas`

  const filename = ['caativar', subject, slug(recorte), isoDate(snap.generatedAt)]
    .join('_') + '.csv'

  return {
    filename,
    csv: BOM + blocks.filter((b) => b.length > 0).map((b) => b.join(EOL)).join(EOL + EOL) + EOL,
  }
}
