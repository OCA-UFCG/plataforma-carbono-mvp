'use client'

// Quarto Inventário stock in the results panel: the total of the five pools, or
// one pool when the layer is the asset seen through that pool's band. The
// server returns the same report for all six layers; only the reading differs.

import { useTranslations } from 'next-intl'
import fitofisionomia from '@/config/mapa/fitofisionomia.json'
import { useMapaText } from '@/lib/mapa/useMapaText'
import { poolLabel } from '@/lib/mapa/text'
import { adaptive, coverageNote, percentShort, quantity } from '@/lib/mapa/results/format'
import { STOCK_TOTAL_BAND } from '@/lib/mapa/results/headline'
import type { StockReport } from '@/types/mapa'
import { BarList, Empty, Footnote, Hero, Pair, type Figure } from './blocks'
import { sourceOf, type LayerResultViewProps } from './LayerResultView'

/** Pools with their own headline sentence (`stocks.poolCaption.<band>` in MapaOvResults). */
const POOL_CAPTION_BANDS = new Set(['b2', 'b3', 'b4', 'b5', 'b6'])

/** Phytophysiognomies listed before the rest are grouped. */
const MAX_CLASSES = 6

const CLASS_COLOR = new Map(fitofisionomia.classes.map((c) => [c.sigla, c.cor]))

export default function StocksResult({
  theme, layer, profile, report, polygonHa,
}: LayerResultViewProps & { report: StockReport }) {
  const t = useTranslations('MapaOvResults')
  const tx = useMapaText()
  if (report.totalTc <= 0 || report.classes.length === 0) {
    return <Empty theme={theme} text={t('empty.noStock')} />
  }

  const band = layer.gee?.asset.band ?? STOCK_TOTAL_BAND
  const focusPool = band === STOCK_TOTAL_BAND ? null : report.pools.find((p) => p.band === band) ?? null
  const headline = focusPool ? focusPool.tc : report.totalTc
  // Scaled to kt / Mt like the stock report, in the user's number format.
  const hero = quantity(headline, 't C', tx)
  const coverage = coverageNote(report.areaHa, polygonHa, undefined, tx)

  const pair: Figure[] = [
    { label: t('stocks.perHectare'), value: adaptive(report.areaHa > 0 ? headline / report.areaHa : 0, tx), aside: 't C/ha' },
  ]
  if (focusPool) pair.push({ label: t('stocks.ofTotal'), value: percentShort((focusPool.tc / report.totalTc) * 100, tx) })

  const classes = report.classes
    .map((k) => ({ sigla: k.sigla, value: focusPool ? k.porPool[band] ?? 0 : k.tc }))
    .filter((k) => k.value > 0)
    .sort((a, b) => b.value - a.value)
  const head = classes.slice(0, classes.length > MAX_CLASSES ? MAX_CLASSES - 1 : MAX_CLASSES)
  const tail = classes.slice(head.length)
  const rows = [
    ...head.map((k) => ({ key: k.sigla, label: k.sigla, value: k.value, color: CLASS_COLOR.get(k.sigla) ?? theme.colors.textDim })),
    ...(tail.length
      ? [{ key: 'outras', label: t('stocks.others', { count: tail.length }), value: tail.reduce((s, k) => s + k.value, 0), color: theme.colors.textDim }]
      : []),
  ]

  const caption = focusPool
    ? POOL_CAPTION_BANDS.has(focusPool.band)
      ? t(`stocks.poolCaption.${focusPool.band}`)
      // `label` comes from the server in Portuguese; `poolLabel` translates it.
      : t('stocks.poolFallback', { pool: poolLabel(focusPool.band, focusPool.label, tx).toLocaleLowerCase(tx.locale) })
    : coverage ? t('stocks.totalWithData') : t('stocks.totalArea')

  return (
    <>
      <Hero theme={theme} value={hero.value} unit={hero.unit} caption={caption} />
      <Pair theme={theme} items={pair} />
      <BarList
        theme={theme}
        title={t('stocks.title')}
        labelWidth={64}
        rows={rows.map((r) => {
          const q = quantity(r.value, 't C', tx)
          return { ...r, amount: `${q.value} ${q.unit}`, share: percentShort((r.value / headline) * 100, tx) }
        })}
      />
      <Footnote theme={theme} notes={[profile.note, coverage, sourceOf(layer, tx)]} />
    </>
  )
}
