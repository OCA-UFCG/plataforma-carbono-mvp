'use client'

// Quarto Inventário stock in the results panel: the total of the five pools, or
// one pool when the layer is the asset seen through that pool's band. The
// server returns the same report for all six layers; only the reading differs.

import fitofisionomia from '@/config/mapa/fitofisionomia.json'
import { COR_POOL, Rosca, formatarTc } from '../StockReportView'
import { adaptive, coverageNote, percentShort } from '@/lib/mapa/results/format'
import { STOCK_TOTAL_BAND } from '@/lib/mapa/results/headline'
import type { StockReport } from '@/types/mapa'
import { BarList, Empty, Footnote, Hero, Pair, type Figure } from './blocks'
import { sourceOf, type LayerResultViewProps } from './LayerResultView'

/** The headline sentence of each pool layer. */
const POOL_CAPTION: Record<string, string> = {
  b2: 'de carbono na biomassa aérea',
  b3: 'de carbono na biomassa subterrânea',
  b4: 'de carbono na madeira morta',
  b5: 'de carbono na serrapilheira',
  b6: 'de carbono orgânico no solo',
}

/** Phytophysiognomies listed before the rest are grouped. */
const MAX_CLASSES = 6

const CLASS_COLOR = new Map(fitofisionomia.classes.map((c) => [c.sigla, c.cor]))

export default function StocksResult({
  theme, layer, profile, report, polygonHa,
}: LayerResultViewProps & { report: StockReport }) {
  if (report.totalTc <= 0 || report.classes.length === 0) {
    return <Empty theme={theme} text="Sem estoque mapeado nesta área." />
  }

  const band = layer.gee?.asset.band ?? STOCK_TOTAL_BAND
  const focusPool = band === STOCK_TOTAL_BAND ? null : report.pools.find((p) => p.band === band) ?? null
  const headline = focusPool ? focusPool.tc : report.totalTc
  const hero = formatarTc(headline)
  const coverage = coverageNote(report.areaHa, polygonHa)

  const pair: Figure[] = [
    { label: 'Por hectare', value: adaptive(report.areaHa > 0 ? headline / report.areaHa : 0), aside: 't C/ha' },
  ]
  if (focusPool) pair.push({ label: 'Do estoque total', value: percentShort((focusPool.tc / report.totalTc) * 100) })

  const classes = report.classes
    .map((k) => ({ sigla: k.sigla, value: focusPool ? k.porPool[band] ?? 0 : k.tc }))
    .filter((k) => k.value > 0)
    .sort((a, b) => b.value - a.value)
  const head = classes.slice(0, classes.length > MAX_CLASSES ? MAX_CLASSES - 1 : MAX_CLASSES)
  const tail = classes.slice(head.length)
  const rows = [
    ...head.map((k) => ({ key: k.sigla, label: k.sigla, value: k.value, color: CLASS_COLOR.get(k.sigla) ?? theme.colors.textDim })),
    ...(tail.length
      ? [{ key: 'outras', label: `${tail.length} outras`, value: tail.reduce((s, k) => s + k.value, 0), color: theme.colors.textDim }]
      : []),
  ]

  const caption = focusPool
    ? POOL_CAPTION[focusPool.band] ?? `de carbono em ${focusPool.label.toLowerCase()}`
    : `de carbono estocado ${coverage ? 'na parte com dado' : 'na área'}`

  return (
    <>
      <Hero theme={theme} value={hero.valor} unit={hero.unidade} caption={caption} />
      <Pair theme={theme} items={pair} />
      {!focusPool && (
        <Rosca
          titulo="Estoque por compartimento"
          total={report.totalTc}
          theme={theme}
          fatias={report.pools
            .map((p, i) => ({ nome: p.label, tc: p.tc, cor: COR_POOL[i % COR_POOL.length] }))
            .filter((f) => f.tc > 0)
            .sort((a, b) => b.tc - a.tc)}
        />
      )}
      <BarList
        theme={theme}
        title="Estoque por fitofisionomia"
        labelWidth={64}
        rows={rows.map((r) => {
          const q = formatarTc(r.value)
          return { ...r, amount: `${q.valor} ${q.unidade}`, share: percentShort((r.value / headline) * 100) }
        })}
      />
      <Footnote theme={theme} notes={[profile.note, coverage, sourceOf(layer)]} />
    </>
  )
}
