'use client'

// The emissions of the selected municipality, state or biome in the results
// panel, while an emissions layer is on, in that layer's inventory only: the two
// define gross and net differently, so the card never sets them side by side.
// The headline is the layer's measure in the slider's year, in tonnes; below
// come the other measure of the same inventory, the municipality's rank, the
// inventory by sector, and notes saying what each measure holds.

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { anoEmissoes } from '@/lib/emissoes/mapa'
import { describeFlux, fluxInk } from '@/lib/mapa/carbonFlux'
import { formatarCo2e, queimadasForaDoInventario, unidadeDaSelecao, valorDaMedida } from '@/lib/emissoes/painel'
import type { EmissoesUnidadePayload, Inventario } from '@/types/emissoes'
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
const OUTRA_MEDIDA = { brutas: 'liquidas', liquidas: 'brutas' } as const
const ROTULO_MEDIDA = { brutas: 'Emissões brutas', liquidas: 'Emissões líquidas' } as const
const ESCOPO = { usoDaTerra: 'do uso da terra', total: 'de todos os setores' } as const

// What gross and net hold in each inventory's land use (SEEG 13 MUT
// methodology note; CTrees forestry methodology, Climate TRACE 5.11; see
// DOCUMENTACAO.md).
const DEFINICOES: Record<Inventario, string> = {
  seeg: 'No SEEG, as emissões brutas do uso da terra vêm da mudança para usos com menos carbono por hectare, como a conversão de vegetação nativa, da perda de carbono do solo e da queima dos resíduos do desmatamento; as remoções vêm da vegetação secundária, das áreas protegidas, das mudanças de uso que aumentam o estoque e do ganho de carbono do solo, com valores fixos por hectare do inventário nacional, e as líquidas somam as duas.',
  ct: 'No Climate TRACE, as emissões brutas do uso da terra somam desmatamento, degradação, fogo em floresta, vegetação arbustiva e áreas úmidas (sem separar o ligado ao desmatamento) e reservatórios; as líquidas partem da variação anual do estoque de biomassa viva, que já inclui as perdas por desmatamento, degradação e fogo e o crescimento da vegetação, e somam o carbono do solo das lavouras e os reservatórios.',
}
const CT_CONFIANCA = 'No registro de 2025, o Climate TRACE classifica como muito baixa a confiança no saldo de biomassa em todos os municípios de uma amostra da Caatinga; esse saldo varia muito de um ano para outro e entre versões.'
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

  let body: React.ReactNode
  if (!unidade) {
    body = <Empty theme={theme} text="Sem dado de emissões para esta seleção; selecione um município, um estado ou o bioma." />
  } else if (estado.status === 'loading') {
    body = <SkeletonChart theme={theme} />
  } else if (estado.status === 'error') {
    body = <Empty theme={theme} text="Os valores não carregaram; selecione a feição de novo para tentar outra vez." />
  } else {
    const p = estado.payload
    const seeg = spec.inventario === 'seeg'
    const valor = valorDaMedida(p, spec, ano)
    const outra = OUTRA_MEDIDA[spec.medida]
    const valorOutra = valorDaMedida(p, { ...spec, medida: outra }, ano)
    // A net value is a signed flux: the magnitude, with its direction in words
    // and color, as the platform's other flux results show it.
    const fluxo = valor !== null && spec.medida === 'liquidas' ? describeFlux(valor) : null
    const magnitude = fluxo ? fluxo.magnitude : valor
    const f = magnitude === null ? null : formatarCo2e(magnitude)
    const fluxoOutra = valorOutra !== null && outra === 'liquidas' ? describeFlux(valorOutra) : null
    const fOutra = valorOutra === null ? null : formatarCo2e(fluxoOutra ? fluxoOutra.magnitude : valorOutra)
    const rotuloOutra = fluxoOutra?.direction === 'removal' ? 'Remoções líquidas' : ROTULO_MEDIDA[outra]
    const medida = fluxo?.direction === 'removal' ? 'remoções líquidas' : MEDIDA[spec.medida]
    const i = p.anos[spec.inventario].indexOf(ano)
    const posicao = p.posicao?.[spec.inventario]?.[i]
    const brutasUso = valorDaMedida(p, { inventario: spec.inventario, medida: 'brutas', escopo: 'usoDaTerra' }, ano)
    const rotuloPosicao = 'Posição em emissões brutas do uso da terra'
    const queimadas = seeg ? queimadasForaDoInventario(p, ano) : null
    const fQueimadas = queimadas ? formatarCo2e(queimadas) : null
    const residuoNegativo = seeg && Object.values(p.seeg).some((tipos) => tipos?.emissao?.some((v) => v < 0))

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
            label: `${rotuloOutra} ${ESCOPO[spec.escopo]}`,
            value: fOutra ? fOutra.valor : `sem dado em ${ano}`,
            aside: fOutra?.unidade,
          },
          !p.posicao || !posicao
            ? { label: 'Municípios somados', value: nfInt.format(p.municipios) }
            : brutasUso === 0
              ? { label: rotuloPosicao, value: 'sem emissão bruta' }
              : { label: rotuloPosicao, value: `${posicao}º`, aside: `de ${nfInt.format(p.posicao.de)}` },
        ]} />
        <EmissionsCharts theme={theme} payload={p} inventario={spec.inventario} ano={ano} />
        <Footnote theme={theme} notes={[
          'Valores do município inteiro; estados e bioma somam os municípios de predominância Caatinga.',
          DEFINICOES[spec.inventario],
          seeg
            ? `As queimadas em vegetação nativa não desmatada (${fQueimadas ? `${fQueimadas.valor} ${fQueimadas.unidade}` : 'nenhuma registrada'} em ${ano}) ficam fora das brutas e das líquidas, porque o inventário nacional não as contabiliza; o SEEG as publica à parte.`
            : CT_CONFIANCA,
          residuoNegativo ? 'O SEEG registra emissão negativa na disposição final de resíduos desta unidade.' : null,
          `CO2 equivalente com o ${p.fontes.gwp}.`,
          seeg ? `Fonte: SEEG, coleção ${p.fontes.seeg}.` : `Fonte: Climate TRACE, versão ${p.fontes.ct}.`,
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
