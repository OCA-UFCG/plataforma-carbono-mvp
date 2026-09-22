import type { PixelValueResult, RasterClass, RasterStatsResult } from '@/types/mapa'
import { isoDate, numeroCsv, slug } from '@/lib/mapa/format'

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
  stats: RasterStatsResult | null
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
  out.push('# Fonte: Estatística zonal, Google Earth Engine')
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
  out.push(row(['Valor do pixel', layer.pixelValue.value, layer.layerUnit ?? '']))
  if (layer.pixelValue.label) out.push(row(['Classe do pixel', layer.pixelValue.label, '']))
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

function statsRows(layer: LayerSnapshot): string[] {
  const unit = layer.layerUnit ?? ''
  switch (layer.stats?.kind) {
    case 'continuous':  return continuousRows(layer.stats, unit)
    case 'categorical': return categoricalRows(layer.stats, layer.layerClasses ?? [])
    case 'timeseries':  return timeSeriesRows(layer.stats, unit)
    case 'stocks':      return stockRows(layer.stats)
    default:            return []
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
  const subject = snap.layers.length === 1
    ? slug(snap.layers[0].layerName)
    : `${snap.layers.length}-camadas`

  const filename = ['caativar', subject, slug(recorte), isoDate(snap.generatedAt)]
    .join('_') + '.csv'

  return {
    filename,
    csv: BOM + blocks.filter((b) => b.length > 0).map((b) => b.join(EOL)).join(EOL + EOL) + EOL,
  }
}
