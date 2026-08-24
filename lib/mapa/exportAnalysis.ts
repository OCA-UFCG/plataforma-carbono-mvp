import type { PixelValueResult, RasterClass, RasterStatsResult } from '@/types/mapa'
import { normalizeSearch } from '@/lib/mapa/normalizeSearch'

/** Tudo que uma análise precisa para virar arquivo, colhido do store. */
export interface AnalysisSnapshot {
  layerName: string
  layerUnit?: string
  /** Classes da camada categórica, para traduzir o código em rótulo. */
  layerClasses?: RasterClass[]
  /** Ano da parada temporal em vigor, quando a camada é navegável no tempo. */
  year?: string
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
// Sem o BOM o Excel lê o arquivo como Latin-1 e come todos os acentos.
const BOM = '﻿'

// Vírgula decimal e sem separador de milhar: o Excel em português lê assim, e a
// ausência do ponto de milhar evita ambiguidade em quem importar por script.
function num(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 4, useGrouping: false })
}

// Nomes de município e de classe contêm ponto-e-vírgula e aspas com frequência
// suficiente para isto não ser hipotético; sem escapar, as colunas deslizam.
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
  if (recorte) out.push(`# Recorte: ${recorte}`)
  if (snap.year) out.push(`# Ano: ${snap.year}`)
  out.push(`# Gerado em: ${isoDate(snap.generatedAt)}`)
  out.push('# Fonte: Estatística zonal, Google Earth Engine')
  return out
}

// Área, comprimento e valor pontual: o que o painel mostra nos cards antes da
// tabela de estatística. Hectare acompanha o km² porque é a unidade de trabalho
// de quem lida com carbono e uso da terra.
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

// Espelha o gráfico de barras: área por classe em hectares e participação no
// total. A cesta final recolhe códigos presentes no dado mas ausentes da
// configuração da camada, sem a qual as participações não somariam 100%.
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
    // Célula vazia para nodata: um zero aqui seria lido como medição real.
    out.push(row([p.date.slice(0, 4), p.value === null ? '' : p.value, unit]))
  }
  return out
}

// Dois blocos, na mesma decomposição que a rosca mostra na tela. Os dois somam
// o mesmo total, e a linha "Total" fecha a conferência para quem abrir a planilha.
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
 * Monta o CSV de uma análise. Função pura: recebe o retrato do store e devolve
 * texto, sem tocar em DOM nem em rede, para poder ser verificada em teste.
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
