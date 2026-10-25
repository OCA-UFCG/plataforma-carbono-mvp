// The emissions card of the results panel, as data: which unit a selection is,
// the value of the visible layer's measure, and the yearly rows of the sector
// charts. Pure. Land use, the sector the platform is about, is split into its
// emissions and its removals; the other sectors only emit and stay grouped.

import { chaveDaFeicao, RECORTE_DO_NIVEL } from '@/lib/emissoes/mapa'
import { serieEmissoes } from '@/lib/emissoes/series'
import type { CtSetorId, EmissoesCamadaSpec, EmissoesUnidadePayload, Inventario, NivelEmissoes, SeegSetorId } from '@/types/emissoes'

/** The unit a selected recorte feature stands for, or null for a recorte without emissions. */
export function unidadeDaSelecao(
  feature: { recorteId: string; properties: Record<string, unknown> } | undefined,
): { nivel: NivelEmissoes; chave: string } | null {
  if (!feature) return null
  const nivel = (Object.keys(RECORTE_DO_NIVEL) as NivelEmissoes[]).find((n) => RECORTE_DO_NIVEL[n] === feature.recorteId)
  if (!nivel) return null
  const chave = chaveDaFeicao(nivel, feature.properties)
  return chave ? { nivel, chave } : null
}

const fontesDe = (p: EmissoesUnidadePayload) => ({
  seeg: { anos: [p.anos.seeg[0], p.anos.seeg[p.anos.seeg.length - 1]] as [number, number] },
  ct: { anos: [p.anos.ct[0], p.anos.ct[p.anos.ct.length - 1]] as [number, number] },
})

/** t CO2e of the unit in one year for a layer's measure, or null outside the inventory's years. */
export function valorDaMedida(p: EmissoesUnidadePayload, spec: EmissoesCamadaSpec, ano: number): number | null {
  const i = p.anos[spec.inventario].indexOf(ano)
  if (i === -1) return null
  return serieEmissoes(p, spec.inventario, spec.medida, spec.escopo, fontesDe(p))[i]
}

/**
 * The series of one sector chart, in stacking order: land use first, in the
 * map's flux colors; the other sectors in theme grays (`tom`), so they keep
 * their contrast in dark mode.
 */
export interface SerieSetor {
  key: string
  label: string
  cor?: string
  tom?: 'dim' | 'textDim' | 'caption' | 'body'
}

export const COR_USO_EMISSAO = '#d6604d'
export const COR_USO_REMOCAO = '#1b7837'

const OUTROS_TONS = { agropecuaria: 'dim', energia: 'textDim', industria: 'caption', residuos: 'body' } as const

export const SERIES_SETOR: Record<Inventario, SerieSetor[]> = {
  seeg: [
    { key: 'usoEmissao', label: 'Uso da terra, emissões', cor: COR_USO_EMISSAO },
    { key: 'usoRemocao', label: 'Uso da terra, remoções', cor: COR_USO_REMOCAO },
    { key: 'agropecuaria', label: 'Agropecuária', tom: OUTROS_TONS.agropecuaria },
    { key: 'energia', label: 'Energia', tom: OUTROS_TONS.energia },
    { key: 'industria', label: 'Processos industriais', tom: OUTROS_TONS.industria },
    { key: 'residuos', label: 'Resíduos', tom: OUTROS_TONS.residuos },
  ],
  ct: [
    { key: 'usoEmissao', label: 'Uso da terra, emissões', cor: COR_USO_EMISSAO },
    { key: 'usoRemocao', label: 'Uso da terra, remoções', cor: COR_USO_REMOCAO },
    { key: 'agropecuaria', label: 'Agropecuária', tom: OUTROS_TONS.agropecuaria },
    { key: 'energia', label: 'Energia (transporte, edificações, eletricidade, combustíveis fósseis)', tom: OUTROS_TONS.energia },
    { key: 'industria', label: 'Indústria, mineração e gases fluorados', tom: OUTROS_TONS.industria },
    { key: 'residuos', label: 'Resíduos', tom: OUTROS_TONS.residuos },
  ],
}

const SEEG_OUTROS: Record<string, SeegSetorId> = {
  agropecuaria: 'agropecuaria', energia: 'energia', industria: 'processos_industriais', residuos: 'residuos',
}
const CT_OUTROS: Record<string, CtSetorId[]> = {
  agropecuaria: ['agriculture'],
  energia: ['transportation', 'buildings', 'power', 'fossil-fuel-operations'],
  industria: ['manufacturing', 'mineral-extraction', 'fluorinated-gases'],
  residuos: ['waste'],
}

export type LinhaSetor = { ano: number } & Record<string, number>

/**
 * One row per year with every series of the chart. Climate TRACE land use is
 * split so the two parts add up to its net value and keep their sign: the rest
 * of the balance after the gross emissions and reservoirs (biomass and soil
 * change minus the gross part) adds to the emissions when positive, a stock
 * loss, and is the removals when negative.
 */
export function linhasPorSetor(p: EmissoesUnidadePayload, inventario: Inventario): LinhaSetor[] {
  return p.anos[inventario].map((ano, i) => {
    const linha: LinhaSetor = { ano } as LinhaSetor
    if (inventario === 'seeg') {
      linha.usoEmissao = p.seeg.uso_da_terra?.emissao?.[i] ?? 0
      linha.usoRemocao = p.seeg.uso_da_terra?.remocao?.[i] ?? 0
      for (const [key, setor] of Object.entries(SEEG_OUTROS)) linha[key] = p.seeg[setor]?.emissao?.[i] ?? 0
    } else {
      const flu = p.ct.usoDaTerra
      const resto = flu.saldos[i] + flu.solo[i] - flu.brutas[i]
      linha.usoEmissao = flu.brutas[i] + flu.reservatorios[i] + Math.max(resto, 0)
      linha.usoRemocao = Math.min(resto, 0)
      for (const [key, setores] of Object.entries(CT_OUTROS)) {
        linha[key] = setores.reduce((a, s) => a + (p.ct.setores[s]?.[i] ?? 0), 0)
      }
    }
    return linha
  })
}

const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Tonnes of CO2e scaled to t, mil t or Mt, as the stock report scales tonnes of carbon. */
export function formatarCo2e(t: number): { valor: string; unidade: string } {
  // Thresholds on the rounded value, so 999,960 t reads "1,0 Mt" and not "1.000,0 mil t".
  const a = Math.abs(t)
  if (a >= 999_950) return { valor: nf1.format(t / 1e6), unidade: 'Mt CO2e' }
  if (a >= 999.5) return { valor: nf1.format(t / 1e3), unidade: 'mil t CO2e' }
  return { valor: nf0.format(t), unidade: 't CO2e' }
}
