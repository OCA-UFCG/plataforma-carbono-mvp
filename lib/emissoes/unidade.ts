// What /api/mapa/emissoes/unidade sends for one municipality, state or the
// biome: its series by sector in t CO2e and, for a municipality, its rank among
// all of them in land-use gross emissions, year by year. Pure, over the parsed
// emissoes.json.

import { anosDe, serieEmissoes } from '@/lib/emissoes/series'
import type { EmissoesFile, EmissoesUnidade, EmissoesUnidadePayload, NivelEmissoes } from '@/types/emissoes'

/** The unit a level and key name, or null when the file has none. */
export function unidadeDe(data: EmissoesFile, nivel: NivelEmissoes, chave: string): EmissoesUnidade | null {
  if (nivel === 'bioma') return chave === 'bioma' ? data.bioma : null
  const tabela: Record<string, EmissoesUnidade> = nivel === 'municipios' ? data.municipios : data.estados
  return Object.hasOwn(tabela, chave) ? tabela[chave] : null
}

/**
 * Rank of every municipality, year by year, in land-use gross emissions (1 =
 * the largest; equal values share a rank). In tonnes, not per hectare: the
 * rank answers where the emissions are, the map's intensity answers how dense.
 */
export function posicoesUsoDaTerra(data: EmissoesFile, inventario: 'seeg' | 'ct'): Map<string, number[]> {
  const codes = Object.keys(data.municipios)
  const series = codes.map((code) => serieEmissoes(data.municipios[code], inventario, 'brutas', 'usoDaTerra', data.fontes))
  const n = series[0]?.length ?? 0
  const ranks = codes.map(() => new Array<number>(n).fill(0))
  for (let ano = 0; ano < n; ano++) {
    const ordem = series.map((s, i) => ({ v: s[ano], i })).sort((a, b) => b.v - a.v)
    let rank = 0
    ordem.forEach(({ v, i }, k) => {
      if (k === 0 || v !== ordem[k - 1].v) rank = k + 1
      ranks[i][ano] = rank
    })
  }
  return new Map(codes.map((code, i) => [code, ranks[i]]))
}

export function unidadeEmissoes(
  data: EmissoesFile,
  nivel: NivelEmissoes,
  chave: string,
  posicoes: { seeg: Map<string, number[]>; ct: Map<string, number[]> } | null,
): EmissoesUnidadePayload | null {
  const u = unidadeDe(data, nivel, chave)
  if (!u) return null
  const total = Object.keys(data.municipios).length
  return {
    nivel,
    chave,
    areaHa: u.areaHa,
    municipios: 'municipios' in u ? (u.municipios as number) : 1,
    anos: { seeg: anosDe(data.fontes.seeg.anos), ct: anosDe(data.fontes.ct.anos) },
    fontes: { seeg: data.fontes.seeg.colecao, ct: data.fontes.ct.versao, gwp: data.fontes.gwp },
    seeg: u.seeg,
    ct: u.ct,
    posicao: nivel === 'municipios' && posicoes
      ? { de: total, seeg: posicoes.seeg.get(chave) ?? [], ct: posicoes.ct.get(chave) ?? [] }
      : null,
  }
}
