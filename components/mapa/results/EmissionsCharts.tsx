'use client'

// The sector chart of the emissions card, for the inventory of the visible
// layer: yearly bars stacked by sign, land use in the map's flux colors (gross
// emissions above zero, removals below) and the other sectors in theme grays,
// with the slider's year marked. Kept apart so recharts only loads once a card
// shows it.

import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatarCo2e, linhasPorSetor, seriesComDado, type SerieSetor } from '@/lib/emissoes/painel'
import type { EmissoesUnidadePayload, Inventario } from '@/types/emissoes'
import type { PlatformColors, PlatformTheme } from '@/types/mapa'
import { ListCard } from './blocks'

const nfEixo = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, signDisplay: 'negative' })

export const corDaSerie = (s: SerieSetor, c: PlatformColors) => s.cor ?? c[s.tom ?? 'dim']

/** One unit for a whole chart, from the tallest stack above or below zero. */
function escalaDe(maxAbs: number): { d: number; u: string } {
  if (maxAbs >= 999_950) return { d: 1e6, u: 'Mt CO2e' }
  if (maxAbs >= 999.5) return { d: 1e3, u: 'mil t CO2e' }
  return { d: 1, u: 't CO2e' }
}

export default function EmissionsCharts({ theme, payload, inventario, ano }: {
  theme: PlatformTheme
  payload: EmissoesUnidadePayload
  inventario: Inventario
  ano: number
}) {
  const c = theme.colors
  const linhas = linhasPorSetor(payload, inventario)
  const series = seriesComDado(inventario, linhas)
  const anos = payload.anos[inventario]
  const maxAbs = Math.max(0, ...linhas.flatMap((l) => {
    const valores = series.map((s) => l[s.key])
    return [valores.filter((v) => v > 0).reduce((a, v) => a + v, 0), -valores.filter((v) => v < 0).reduce((a, v) => a + v, 0)]
  }))
  const escala = escalaDe(maxAbs)

  return (
    <ListCard title="Por setor" hint={`${anos[0]} a ${anos[anos.length - 1]}, ${escala.u}`}>
      <div style={{ width: '100%', height: 190, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={linhas} stackOffset="sign" margin={{ top: 6, right: 6, left: -12, bottom: 0 }} barCategoryGap="20%" maxBarSize={14}>
            <XAxis dataKey="ano" tick={{ fontSize: 11, fill: c.textDim }} stroke={c.border} tickLine={false} minTickGap={16} />
            <YAxis tickFormatter={(v: number) => nfEixo.format(v / escala.d)} tick={{ fontSize: 11, fill: c.textDim }} stroke={c.border} tickLine={false} width={44} />
            <ReferenceLine y={0} stroke={c.textDim} />
            {anos.includes(ano) && <ReferenceLine x={ano} stroke={c.text} strokeWidth={1} strokeDasharray="3 3" />}
            <Tooltip
              cursor={{ fill: c.text, fillOpacity: 0.06 }}
              separator=": "
              itemSorter={(item) => series.findIndex((s) => s.key === item.dataKey)}
              formatter={(v, name) => {
                const f = formatarCo2e(Number(v))
                return [`${f.valor} ${f.unidade}`, series.find((s) => s.key === name)?.label ?? String(name)]
              }}
              labelFormatter={(a) => String(a)}
              contentStyle={{
                fontSize: 12, borderRadius: 6, border: `1px solid ${c.border}`, backgroundColor: c.bgCard, color: c.text,
                whiteSpace: 'normal', maxWidth: 240,
              }}
              itemStyle={{ color: c.text }}
            />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} stackId="setores" fill={corDaSerie(s, c)} stroke={c.bgCard} strokeWidth={0.5} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* The legend rows of the donut card (Donut.module.css), Figma 19432:60387. */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {series.map((s) => (
          <li key={s.key} className="text-ui-badge" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400, color: 'var(--bg-texto-primario)' }}>
            <span style={{ width: 16, height: 16, borderRadius: 2, background: corDaSerie(s, c), flexShrink: 0 }} />
            {s.label}
          </li>
        ))}
      </ul>
    </ListCard>
  )
}
