'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useTranslations } from 'next-intl'
import fitofisionomia from '@/config/mapa/fitofisionomia.json'
import { formatNumber } from '@/lib/mapa/locale'
import { poolLabel } from '@/lib/mapa/text'
import { useMapaText } from '@/lib/mapa/useMapaText'
import type { PlatformTheme, StockReport } from '@/types/mapa'

interface Props {
  report:  StockReport
  theme:   PlatformTheme
  caption?: string
}

/** Slices to show before grouping the rest. */
const MAX_FATIAS = 7

// Pools follow the configuration order; the color is the brand's, from the green
// of the living part to the terracotta of the soil.
const COR_POOL = ['#597636', '#6b7d34', '#8a9b4a', '#c9a227', '#a66a2e']

const COR_CLASSE = new Map(fitofisionomia.classes.map((c) => [c.sigla, c.cor]))

const nf = (value: number, locale: string) => formatNumber(value, locale, { maximumFractionDigits: 0 })
const nf1 = (value: number, locale: string) => formatNumber(value, locale, { maximumFractionDigits: 1 })

/**
 * Large numbers are tiring to read in tC; above a thousand it moves to kt and
 * Mt.
 *
 * Exported so ReportSection's hero card agrees with this exact formatting:
 * before this fix, the hero printed the raw `t C` total (`12.345.678 t C`)
 * while this view showed the same number scaled (`12,3 Mt C`), side by side
 * in section 1 of every default report. This scaled form reads better at
 * inventory scale — a state's or a biome's stock in bare tC is a long string
 * of digits nobody parses at a glance — so the hero now calls this too rather
 * than the other way around.
 *
 * `locale` is the message locale ('pt' | 'en', `tx.locale`) and picks the
 * decimal and grouping marks; the units are universal.
 */
export function formatarTc(tc: number, locale = 'pt'): { valor: string; unidade: string } {
  if (Math.abs(tc) >= 1e6) return { valor: nf1(tc / 1e6, locale), unidade: 'Mt C' }
  if (Math.abs(tc) >= 1e3) return { valor: nf1(tc / 1e3, locale), unidade: 'kt C' }
  return { valor: nf(tc, locale), unidade: 't C' }
}

interface Fatia {
  nome: string
  tc:   number
  cor:  string
}

/** Groups the tail into "outras" ("others"), so the doughnut does not become a comb of slices. */
function agrupar(fatias: Fatia[], corOutras: string, rotulo: (count: number) => string): Fatia[] {
  if (fatias.length <= MAX_FATIAS) return fatias
  const cabeca = fatias.slice(0, MAX_FATIAS - 1)
  const cauda = fatias.slice(MAX_FATIAS - 1)
  return [
    ...cabeca,
    {
      nome: rotulo(cauda.length),
      tc:   cauda.reduce((s, f) => s + f.tc, 0),
      cor:  corOutras,
    },
  ]
}

export default function StockReportView({ report, theme, caption }: Props) {
  const t = useTranslations('MapaUiStockReport')
  const tx = useMapaText()
  const c = theme.colors
  const total = report.totalTc

  if (!total || !report.classes.length) {
    return (
      <p style={{ fontSize: 13.5, color: c.textDim, fontFamily: 'var(--font-app), sans-serif' }}>
        {t('empty')}
      </p>
    )
  }

  const porPool: Fatia[] = report.pools
    .map((p, i) => ({ nome: poolLabel(p.band, p.label, tx), tc: p.tc, cor: COR_POOL[i % COR_POOL.length] }))
    .filter((f) => f.tc > 0)
    .sort((a, b) => b.tc - a.tc)

  const porClasse = agrupar(
    report.classes
      .filter((k) => k.tc > 0)
      .map((k) => ({ nome: k.sigla, tc: k.tc, cor: COR_CLASSE.get(k.sigla) ?? c.textDim })),
    c.textDim,
    (count) => t('others', { count }),
  )

  const densidade = report.areaHa > 0 ? total / report.areaHa : 0

  return (
    <div style={{ fontFamily: 'var(--font-app), sans-serif', display: 'grid', gap: 14 }}>
      {caption && (
        <p style={{ fontSize: 12.5, color: c.textDim, margin: 0 }}>{caption}</p>
      )}

      {/* The area does not go in here: the panel's "Área analisada" ("Analyzed
          area") card already carries it, and the two differ a little, because
          not every hectare of the feature has stock data. Repeating a similar
          number with a different meaning confuses. */}
      {/* `minmax(0, 1fr)`, not `1fr`: a bare `1fr` is `minmax(auto, 1fr)`, whose
          minimum is the content's min-content width. The value here is 19px and
          bold, so the pair refuses to shrink below it and overflows any column
          narrower than the results panel it was first written for. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
        <Cartao
          theme={theme}
          rotulo={t('totalStock')}
          valor={formatarTc(total, tx.locale).valor}
          unidade={formatarTc(total, tx.locale).unidade}
          destaque
        />
        <Cartao
          theme={theme}
          rotulo={t('perHectare')}
          valor={nf1(densidade, tx.locale)}
          unidade="t C/ha"
        />
      </div>

      <Rosca titulo={t('byPool')} fatias={porPool} total={total} theme={theme} />
      <Rosca titulo={t('byPhytophysiognomy')} fatias={porClasse} total={total} theme={theme} />
    </div>
  )
}

function Cartao({
  theme, rotulo, valor, unidade, destaque,
}: {
  theme: PlatformTheme; rotulo: string; valor: string; unidade: string; destaque?: boolean
}) {
  const c = theme.colors
  return (
    <div
      style={{
        border: `1px solid ${destaque ? c.accentBd : c.border}`,
        background: destaque ? c.accentBg : 'transparent',
        borderRadius: 10, padding: '9px 11px',
      }}
    >
      <div style={{ fontSize: 11.5, color: c.textDim, marginBottom: 2 }}>{rotulo}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontSize: 20, fontWeight: 800, lineHeight: 1,
            color: destaque ? c.accentInk : c.text,
            fontVariantNumeric: 'lining-nums tabular-nums',
          }}
        >
          {valor}
        </span>
        <span style={{ fontSize: 12.5, color: c.textDim }}>{unidade}</span>
      </div>
    </div>
  )
}

function Rosca({
  titulo, fatias, total, theme,
}: {
  titulo: string; fatias: Fatia[]; total: number; theme: PlatformTheme
}) {
  const c = theme.colors
  const tx = useMapaText()
  if (!fatias.length) return null

  return (
    <section>
      <h4
        style={{
          fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em',
          textTransform: 'uppercase', color: c.textDim, margin: '0 0 6px',
        }}
      >
        {titulo}
      </h4>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 118, height: 118, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={fatias}
                dataKey="tc"
                nameKey="nome"
                innerRadius="58%"
                outerRadius="94%"
                paddingAngle={1.5}
                stroke="none"
                isAnimationActive={false}
              >
                {fatias.map((f) => <Cell key={f.nome} fill={f.cor} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* `minWidth: 0` because a flex item's default `min-width` is `auto`,
            i.e. its min-content width — without it the legend cannot shrink and
            pushes the whole row past its container. */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, minWidth: 0, display: 'grid', gap: 3 }}>
          {fatias.map((f) => (
            <li key={f.nome} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
              <span
                style={{
                  width: 9, height: 9, borderRadius: 2,
                  background: f.cor, flexShrink: 0,
                }}
              />
              {/* The ellipsis needs `minWidth: 0` to engage at all: without it
                  this flex item keeps its min-content width — the whole label,
                  unbroken — and truncation never happens. */}
              <span
                title={f.nome}
                style={{
                  color: c.text, flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {f.nome}
              </span>
              <span
                style={{
                  color: c.textDim, fontVariantNumeric: 'lining-nums tabular-nums',
                }}
              >
                {nf1((100 * f.tc) / total, tx.locale)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
