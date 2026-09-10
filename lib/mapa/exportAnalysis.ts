import type { PixelValueResult, RasterClass, RasterStatsResult } from '@/types/mapa'
import { normalizeSearch } from '@/lib/mapa/normalizeSearch'

/** Everything an analysis needs to become a file, gathered from the store. */
export interface AnalysisSnapshot {
  layerName: string
  layerUnit?: string
  /** Classes of the categorical layer, to translate the code into a label. */
  layerClasses?: RasterClass[]
  /** Year of the current temporal stop, when the layer is time-navigable. */
  year?: string
  /** Layer whose values are a signed flux, negative where carbon was removed. */
  signedFlux?: boolean
  analysisKind: string | null
  analysisLabel: string | null
  drawnArea: number | null
  drawnLength: number | null
  pixelValue: PixelValueResult | null
  stats: RasterStatsResult | null
  generatedAt: Date
}

const DELIM = ';'
const EOL = '\r\n'
// Without the BOM Excel reads the file as Latin-1 and eats every accent.
const BOM = '﻿'

// Decimal comma and no thousands separator: Excel in Portuguese reads it this
// way, and the missing thousands dot avoids ambiguity for script importers.
function num(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 4, useGrouping: false })
}

// Municipality and class names contain semicolons and quotes often enough for
// this not to be hypothetical; without escaping, the columns slide.
function cell(value: string | number | null | undefined): string {
  if (typeof value === 'number') return num(value)
  const text = value ?? ''
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(cell).join(DELIM)
}

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function slug(value: string): string {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function metadataRows(snap: AnalysisSnapshot): string[] {
  const recorte = [snap.analysisKind, snap.analysisLabel].filter(Boolean).join(' - ')
  const out = ['# Plataforma Carbono Caatinga', `# Camada: ${snap.layerName}`]
  // The panel drops the minus sign and says "sequestrou" in green instead, but
  // the file keeps the sign so a spreadsheet can sum sinks against sources.
  // Spelling the convention out is what stops the two readings from clashing.
  if (snap.signedFlux) {
    out.push('# Convenção: valor negativo = sequestro, positivo = emissão')
  }
  if (recorte) out.push(`# Recorte: ${recorte}`)
  if (snap.year) out.push(`# Ano: ${snap.year}`)
  out.push(`# Gerado em: ${isoDate(snap.generatedAt)}`)
  out.push('# Fonte: Estatística zonal, Google Earth Engine')
  return out
}

// Area, length and point value: what the panel shows in the cards above the
// statistics table. Hectares go along with km2 because it is the working unit
// of whoever deals with carbon and land use.
function measurementRows(snap: AnalysisSnapshot): string[] {
  const out: string[] = []
  if (snap.drawnArea !== null) {
    out.push(row(['Área analisada', snap.drawnArea, 'km²']))
    out.push(row(['Área analisada', snap.drawnArea * 100, 'ha']))
  }
  if (snap.drawnLength !== null) out.push(row(['Comprimento', snap.drawnLength, 'km']))
  if (snap.pixelValue !== null) {
    out.push(row(['Valor do pixel', snap.pixelValue.value, snap.layerUnit ?? '']))
    if (snap.pixelValue.label) out.push(row(['Classe do pixel', snap.pixelValue.label, '']))
  }
  return out.length ? [row(['medida', 'valor', 'unidade']), ...out] : []
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
  push('Soma', s.stats.sum)
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

function statsRows(snap: AnalysisSnapshot): string[] {
  const unit = snap.layerUnit ?? ''
  switch (snap.stats?.kind) {
    case 'continuous':  return continuousRows(snap.stats, unit)
    case 'categorical': return categoricalRows(snap.stats, snap.layerClasses ?? [])
    case 'timeseries':  return timeSeriesRows(snap.stats, unit)
    case 'stocks':      return stockRows(snap.stats)
    default:            return []
  }
}

/**
 * Builds the CSV of an analysis. Pure function: it takes the snapshot of the
 * store and returns text, touching neither DOM nor network, so it can be
 * verified in tests.
 */
export function buildAnalysisCsv(snap: AnalysisSnapshot): { filename: string; csv: string } {
  const blocks = [metadataRows(snap), measurementRows(snap), statsRows(snap)]
    .filter((b) => b.length > 0)
    .map((b) => b.join(EOL))

  const recorte = snap.analysisLabel ?? snap.analysisKind ?? 'analise'
  const filename = [
    'carbono-caatinga',
    slug(snap.layerName),
    slug(recorte),
    isoDate(snap.generatedAt),
  ].join('_') + '.csv'

  return { filename, csv: BOM + blocks.join(EOL + EOL) + EOL }
}
