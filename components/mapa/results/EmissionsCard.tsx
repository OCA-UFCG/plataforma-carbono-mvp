'use client'

// The emissions of the selected municipality, state or biome in the results
// panel, while an emissions layer is on. The headline is the visible layer's
// measure in the slider's year, in tonnes; below come the same measure in the
// other inventory, the municipality's rank, both inventories by sector and the
// land-use sector side by side, the one the platform is about.

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { anoEmissoes } from '@/lib/emissoes/mapa'
import { describeFlux, fluxInk } from '@/lib/mapa/carbonFlux'
import { formatarCo2e, unidadeDaSelecao, valorDaMedida } from '@/lib/emissoes/painel'
import type { EmissoesUnidadePayload } from '@/types/emissoes'
import type { EmissionsLayerConfig, PlatformTheme, SelectedGeometry } from '@/types/mapa'
import { SkeletonChart } from '../StatsCards'
import { Empty, Footnote, Hero, Pair, Stack } from './blocks'

const EmissionsCharts = dynamic(() => import('./EmissionsCharts'), { ssr: false, loading: () => null })

type Estado =
  | { status: 'loading' }
  | { status: 'ready'; payload: EmissoesUnidadePayload }
  | { status: 'error' }

// One request per unit for the page's lifetime; a failure is not kept, so the
// next selection of the same unit asks again.
const cache = new Map<string, Promise<EmissoesUnidadePayload>>()

function carregar(nivel: string, chave: string): Promise<EmissoesUnidadePayload> {
  const key = `${nivel}|${chave}`
  const cached = cache.get(key)
  if (cached) return cached
  const request = fetch(`/api/mapa/emissoes/unidade?nivel=${nivel}&chave=${encodeURIComponent(chave)}`)
    .then((res) => {
      if (!res.ok) throw new Error(`API error ${res.status}`)
      return res.json() as Promise<EmissoesUnidadePayload>
    })
  request.catch(() => cache.delete(key))
  cache.set(key, request)
  return request
}

const INVENTARIO = { seeg: 'SEEG', ct: 'Climate TRACE' } as const
const MEDIDA = { brutas: 'emissões brutas', liquidas: 'emissões líquidas' } as const
const ESCOPO = { usoDaTerra: 'do uso da terra', total: 'de todos os setores' } as const
const nfInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const nfHa = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 3 })

export default function EmissionsCard({ theme, layer, selection, temporalDate }: {
  theme: PlatformTheme
  layer: EmissionsLayerConfig
  selection: SelectedGeometry
  temporalDate?: string
}) {
  const c = theme.colors
  const unidade = unidadeDaSelecao(selection.feature)
  const key = unidade ? `${unidade.nivel}|${unidade.chave}` : null
  // The answer is kept with the unit it belongs to: a new selection reads as
  // loading until its own answer lands, without resetting state in the effect.
  const [resposta, setResposta] = useState<{ key: string; estado: Estado } | null>(null)
  const estado: Estado = resposta && resposta.key === key ? resposta.estado : { status: 'loading' }

  useEffect(() => {
    if (!unidade || !key) return
    let vivo = true
    carregar(unidade.nivel, unidade.chave).then(
      (payload) => { if (vivo) setResposta({ key, estado: { status: 'ready', payload } }) },
      () => { if (vivo) setResposta({ key, estado: { status: 'error' } }) },
    )
    return () => { vivo = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const ano = anoEmissoes(layer, temporalDate)
  const spec = layer.emissoes
  const outro = spec.inventario === 'seeg' ? 'ct' : 'seeg'

  let body: React.ReactNode
  if (!unidade) {
    body = <Empty theme={theme} text="Sem dado de emissões para esta seleção; selecione um município, um estado ou o bioma." />
  } else if (estado.status === 'loading') {
    body = <SkeletonChart theme={theme} />
  } else if (estado.status === 'error') {
    body = <Empty theme={theme} text="Os valores não carregaram; selecione a feição de novo para tentar outra vez." />
  } else {
    const p = estado.payload
    const valor = valorDaMedida(p, spec, ano)
    const valorOutro = valorDaMedida(p, { ...spec, inventario: outro }, ano)
    // A net value is a signed flux: the magnitude, with its direction in words
    // and color, as the platform's other flux results show it.
    const fluxo = valor !== null && spec.medida === 'liquidas' ? describeFlux(valor) : null
    const magnitude = fluxo ? fluxo.magnitude : valor
    const f = magnitude === null ? null : formatarCo2e(magnitude)
    const fOutro = valorOutro === null ? null : formatarCo2e(valorOutro)
    const medida = fluxo?.direction === 'removal' ? 'remoções líquidas' : MEDIDA[spec.medida]
    const i = p.anos[spec.inventario].indexOf(ano)
    const posicao = p.posicao?.[spec.inventario]?.[i]
    const brutasUso = valorDaMedida(p, { inventario: spec.inventario, medida: 'brutas', escopo: 'usoDaTerra' }, ano)
    const residuoNegativo = Object.values(p.seeg).some((tipos) => tipos?.emissao?.some((v) => v < 0))
    const rotuloPosicao = `Posição em emissões brutas do uso da terra, ${INVENTARIO[spec.inventario]}`

    body = (
      <Stack>
        <Hero
          theme={theme}
          value={f?.valor ?? 'Sem dado'}
          unit={f?.unidade}
          aside={magnitude === null ? undefined : `${nfHa.format(magnitude / p.areaHa)} t CO2e/ha`}
          caption={`de ${medida} ${ESCOPO[spec.escopo]} em ${ano}, no ${INVENTARIO[spec.inventario]}`}
          ink={fluxo ? fluxInk(fluxo.direction, c) : undefined}
        />
        <Pair theme={theme} items={[
          {
            label: `${INVENTARIO[outro]}, mesma medida`,
            value: fOutro ? fOutro.valor : `sem dado em ${ano}`,
            aside: fOutro?.unidade,
          },
          !p.posicao || !posicao
            ? { label: 'Municípios somados', value: nfInt.format(p.municipios) }
            : brutasUso === 0
              ? { label: rotuloPosicao, value: 'sem emissão bruta' }
              : { label: rotuloPosicao, value: `${posicao}º`, aside: `de ${nfInt.format(p.posicao.de)}` },
        ]} />
        <EmissionsCharts theme={theme} payload={p} ano={ano} />
        <ComparacaoUsoDaTerra theme={theme} payload={p} />
        <Footnote theme={theme} notes={[
          'Valores do município inteiro; estados e bioma somam os municípios de predominância Caatinga.',
          'As emissões do uso da terra do SEEG não incluem as queimadas não associadas a desmatamento; as do Climate TRACE incluem todo o fogo em vegetação.',
          'As remoções do SEEG cobrem vegetação secundária, áreas protegidas, mudanças de uso e carbono do solo; o saldo do Climate TRACE é a variação do estoque de biomassa e do solo.',
          residuoNegativo ? 'O SEEG registra emissão negativa na disposição final de resíduos desta unidade.' : null,
          `CO2 equivalente com o ${p.fontes.gwp}.`,
          `Fonte: SEEG, coleção ${p.fontes.seeg}, e Climate TRACE, versão ${p.fontes.ct}.`,
        ]} />
      </Stack>
    )
  }

  return (
    <section style={{ paddingTop: 16, borderTop: `1px solid ${c.border}`, marginBottom: 24, flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: c.text, lineHeight: 1.3 }}>Emissões de gases de efeito estufa</span>
        <span style={{ fontSize: 14, color: c.textDim, whiteSpace: 'nowrap', fontVariantNumeric: 'lining-nums tabular-nums' }}>{ano}</span>
      </div>
      {body}
    </section>
  )
}

const VISUALMENTE_OCULTO: React.CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
}

/** Land use in both inventories over the years they share, gross and net. */
function ComparacaoUsoDaTerra({ theme, payload }: { theme: PlatformTheme; payload: EmissoesUnidadePayload }) {
  const c = theme.colors
  const anos = payload.anos.ct.filter((a) => payload.anos.seeg.includes(a))
  if (anos.length === 0) return null
  const linhas = [
    { rotulo: 'Brutas, SEEG', spec: { inventario: 'seeg', medida: 'brutas', escopo: 'usoDaTerra' } },
    { rotulo: 'Brutas, Climate TRACE', spec: { inventario: 'ct', medida: 'brutas', escopo: 'usoDaTerra' } },
    { rotulo: 'Líquidas, SEEG', spec: { inventario: 'seeg', medida: 'liquidas', escopo: 'usoDaTerra' } },
    { rotulo: 'Líquidas, Climate TRACE', spec: { inventario: 'ct', medida: 'liquidas', escopo: 'usoDaTerra' } },
  ] as const
  const maxAbs = Math.max(...linhas.flatMap((l) => anos.map((a) => Math.abs(valorDaMedida(payload, l.spec, a) ?? 0))))
  const escala = maxAbs >= 1e6 ? { d: 1e6, u: 'Mt CO2e' } : maxAbs >= 1e3 ? { d: 1e3, u: 'mil t CO2e' } : { d: 1, u: 't CO2e' }
  // Three significant digits keep the small rows readable on the table's shared scale; no sign on a zero.
  const nf = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 3, signDisplay: 'negative' })
  const cel: React.CSSProperties = { padding: '6px 4px', textAlign: 'right', fontVariantNumeric: 'lining-nums tabular-nums', whiteSpace: 'nowrap' }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: c.text }}>Uso da terra nos dois inventários</h3>
        <span style={{ fontSize: 13, color: c.textDim, whiteSpace: 'nowrap' }}>{escala.u}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, color: c.body }}>
          <caption style={VISUALMENTE_OCULTO}>{`Uso da terra nos dois inventários, ${escala.u}`}</caption>
          <thead>
            <tr style={{ color: c.textDim }}>
              <td style={cel} />
              {anos.map((a) => <th key={a} style={{ ...cel, fontWeight: 600 }}>{a}</th>)}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.rotulo} style={{ borderTop: `1px solid ${c.border}` }}>
                <th scope="row" style={{ ...cel, textAlign: 'left', fontWeight: 500, color: c.text, whiteSpace: 'normal', width: 92, lineHeight: 1.25 }}>{l.rotulo}</th>
                {anos.map((a) => {
                  const v = valorDaMedida(payload, l.spec, a)
                  return <td key={a} style={cel}>{v === null ? '' : nf.format(v / escala.d)}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
