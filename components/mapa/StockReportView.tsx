'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import fitofisionomia from '@/config/mapa/fitofisionomia.json'
import type { PlatformTheme, StockReport } from '@/types/mapa'

interface Props {
  report:  StockReport
  theme:   PlatformTheme
  caption?: string
}

/** Fatias a mostrar antes de agrupar o resto. */
const MAX_FATIAS = 7

// Reservatórios seguem a ordem da configuração; a cor é a da marca, do verde
// da parte viva ao terracota do solo.
const COR_POOL = ['#597636', '#6b7d34', '#8a9b4a', '#c9a227', '#a66a2e']

const COR_CLASSE = new Map(fitofisionomia.classes.map((c) => [c.sigla, c.cor]))

const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** Números grandes cansam de ler em tC; acima de mil passa a kt e Mt. */
function formatarTc(tc: number): { valor: string; unidade: string } {
  if (Math.abs(tc) >= 1e6) return { valor: nf1.format(tc / 1e6), unidade: 'Mt C' }
  if (Math.abs(tc) >= 1e3) return { valor: nf1.format(tc / 1e3), unidade: 'kt C' }
  return { valor: nf.format(tc), unidade: 't C' }
}

interface Fatia {
  nome: string
  tc:   number
  cor:  string
}

/** Agrupa a cauda em "outras", para a rosca não virar um pente de fatias. */
function agrupar(fatias: Fatia[], corOutras: string): Fatia[] {
  if (fatias.length <= MAX_FATIAS) return fatias
  const cabeca = fatias.slice(0, MAX_FATIAS - 1)
  const cauda = fatias.slice(MAX_FATIAS - 1)
  return [
    ...cabeca,
    {
      nome: `outras ${cauda.length}`,
      tc:   cauda.reduce((s, f) => s + f.tc, 0),
      cor:  corOutras,
    },
  ]
}

export default function StockReportView({ report, theme, caption }: Props) {
  const c = theme.colors
  const total = report.totalTc

  if (!total || !report.classes.length) {
    return (
      <p style={{ fontSize: 12, color: c.textDim, fontFamily: 'var(--font-app), sans-serif' }}>
        Não há estoque mapeado nesta área.
      </p>
    )
  }

  const porPool: Fatia[] = report.pools
    .map((p, i) => ({ nome: p.label, tc: p.tc, cor: COR_POOL[i % COR_POOL.length] }))
    .filter((f) => f.tc > 0)
    .sort((a, b) => b.tc - a.tc)

  const porClasse = agrupar(
    report.classes
      .filter((k) => k.tc > 0)
      .map((k) => ({ nome: k.sigla, tc: k.tc, cor: COR_CLASSE.get(k.sigla) ?? c.textDim })),
    c.textDim,
  )

  const densidade = report.areaHa > 0 ? total / report.areaHa : 0

  return (
    <div style={{ fontFamily: 'var(--font-app), sans-serif', display: 'grid', gap: 14 }}>
      {caption && (
        <p style={{ fontSize: 11, color: c.textDim, margin: 0 }}>{caption}</p>
      )}

      {/* A área não entra aqui: o cartão "Área analisada" do painel já a traz, e
          as duas divergem um pouco, porque nem todo hectare da feição tem dado
          de estoque. Repetir número parecido com significado diferente confunde. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Cartao
          theme={theme}
          rotulo="Estoque total"
          valor={formatarTc(total).valor}
          unidade={formatarTc(total).unidade}
          destaque
        />
        <Cartao
          theme={theme}
          rotulo="Por hectare"
          valor={nf1.format(densidade)}
          unidade="t C/ha"
        />
      </div>

      <Rosca titulo="Por reservatório" fatias={porPool} total={total} theme={theme} />
      <Rosca titulo="Por fitofisionomia" fatias={porClasse} total={total} theme={theme} />
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
      <div style={{ fontSize: 10, color: c.textDim, marginBottom: 2 }}>{rotulo}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontSize: 19, fontWeight: 800, lineHeight: 1,
            color: destaque ? c.accentInk : c.text,
            fontVariantNumeric: 'lining-nums tabular-nums',
          }}
        >
          {valor}
        </span>
        <span style={{ fontSize: 11, color: c.textDim }}>{unidade}</span>
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
  if (!fatias.length) return null

  return (
    <section>
      <h4
        style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
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

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, display: 'grid', gap: 3 }}>
          {fatias.map((f) => (
            <li key={f.nome} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <span
                style={{
                  width: 9, height: 9, borderRadius: 2,
                  background: f.cor, flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: c.text, flex: 1,
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
                {nf1.format((100 * f.tc) / total)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
