// What /api/mapa/emissoes sends for one emissions map layer: the intensity in
// t CO2e/ha of every municipality, state and the biome, year by year, and the
// classes every level is colored with. Pure, over the parsed emissoes.json.

import { classesEmissoes } from '@/lib/emissoes/classes'
import { anosDe, intensidade, serieEmissoes } from '@/lib/emissoes/series'
import type { EmissoesCamadaPayload, EmissoesCamadaSpec, EmissoesFile, EmissoesUnidade } from '@/types/emissoes'

export const UNIDADE_INTENSIDADE = 't CO2e/ha'

/** Four significant digits: below the precision of either inventory, and a third of the bytes. */
function compacto(v: number): number {
  return v === 0 ? 0 : Number(v.toPrecision(4))
}

export function camadaEmissoes(data: EmissoesFile, spec: EmissoesCamadaSpec): EmissoesCamadaPayload {
  const serie = (u: EmissoesUnidade) =>
    intensidade(serieEmissoes(u, spec.inventario, spec.medida, spec.escopo, data.fontes), u.areaHa)

  const municipios = Object.fromEntries(Object.entries(data.municipios).map(([code, u]) => [code, serie(u)]))
  // Classes from the full-precision municipal values, before compacting them.
  const classes = classesEmissoes(Object.values(municipios).flat())

  const compactar = (s: number[]) => s.map(compacto)
  return {
    anos: anosDe(data.fontes[spec.inventario].anos),
    unidade: UNIDADE_INTENSIDADE,
    classes,
    valores: {
      municipios: Object.fromEntries(Object.entries(municipios).map(([k, s]) => [k, compactar(s)])),
      estados: Object.fromEntries(Object.entries(data.estados).map(([uf, u]) => [uf, compactar(serie(u))])),
      bioma: { bioma: compactar(serie(data.bioma)) },
    },
  }
}
