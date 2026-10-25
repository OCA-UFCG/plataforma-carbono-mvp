// Series the platform derives from config/emissoes/emissoes.json: the gross and
// net totals of each inventory, overall and for the land-use sector, the sector
// the platform is about. Pure functions over one unit (municipality, state or
// biome), shared by the platform and the tests.
//
// The two inventories share the metric (AR6) but not the definitions. In land
// use, Climate TRACE gross holds every fire on vegetation, while SEEG gross
// ("Emissão") leaves out the fires not tied to clearing ("Emissão (NCI)"); the
// SEEG removals cover secondary vegetation, protected areas, land-use changes
// that add stock and soil organic carbon, while the Climate TRACE balances are
// the yearly change of the whole biomass stock. The two gross series, like the
// two net series, are not the same quantity.

import type {
  CtSetorId,
  EmissoesFile,
  EmissoesUnidade,
  Escopo,
  Inventario,
  Medida,
  SeegSetorId,
  SeegTipo,
} from '@/types/emissoes'

export const SEEG_SETORES: Record<SeegSetorId, string> = {
  uso_da_terra: 'Mudança de Uso da Terra e Floresta',
  agropecuaria: 'Agropecuária',
  energia: 'Energia',
  processos_industriais: 'Processos Industriais',
  residuos: 'Resíduos',
}

export const CT_SETORES: Record<CtSetorId | 'forestry-and-land-use', string> = {
  'forestry-and-land-use': 'Florestas e uso da terra',
  agriculture: 'Agropecuária',
  buildings: 'Edificações',
  'fluorinated-gases': 'Gases fluorados',
  'fossil-fuel-operations': 'Operações com combustíveis fósseis',
  manufacturing: 'Indústria',
  'mineral-extraction': 'Mineração',
  power: 'Geração de eletricidade',
  transportation: 'Transporte',
  waste: 'Resíduos',
}

/** The land-use sector of each inventory, which the platform shows first. */
export const SETOR_DESTAQUE = { seeg: 'uso_da_terra', ct: 'forestry-and-land-use' } as const

/**
 * SEEG gross = "Emissão" and net = "Emissão" + "Remoção", the definitions of
 * the SEEG platform's own highlights; "Emissão (NCI)" stays out of both, as it
 * does there. In land use that leaves out the fires Climate TRACE counts as
 * gross.
 */
const SEEG_TIPOS: Record<Medida, SeegTipo[]> = {
  brutas: ['emissao'],
  liquidas: ['emissao', 'remocao'],
}

function soma(series: (number[] | undefined)[], n: number): number[] {
  const out = new Array<number>(n).fill(0)
  for (const s of series) {
    if (!s) continue
    for (let i = 0; i < n; i++) out[i] += s[i]
  }
  return out
}

function seegSerie(u: EmissoesUnidade, medida: Medida, escopo: Escopo, n: number): number[] {
  const setores = escopo === 'usoDaTerra' ? [SETOR_DESTAQUE.seeg] : (Object.keys(SEEG_SETORES) as SeegSetorId[])
  return soma(setores.flatMap((s) => SEEG_TIPOS[medida].map((t) => u.seeg[s]?.[t])), n)
}

/**
 * Climate TRACE land use, gross = clearing, degradation, every fire on
 * vegetation and reservoirs; net = biomass balance, cropland soil and
 * reservoirs. The total adds the other sectors, which have no removals, to
 * either.
 */
function ctSerie(u: EmissoesUnidade, medida: Medida, escopo: Escopo, n: number): number[] {
  const flu = u.ct.usoDaTerra
  const usoDaTerra = medida === 'brutas'
    ? [flu.brutas, flu.reservatorios]
    : [flu.saldos, flu.solo, flu.reservatorios]
  const outros = escopo === 'total' ? Object.values(u.ct.setores) : []
  return soma([...usoDaTerra, ...outros], n)
}

/** Years of an inventory, from the [first, last] pair in the file's `fontes`. */
export function anosDe([primeiro, ultimo]: [number, number]): number[] {
  return Array.from({ length: ultimo - primeiro + 1 }, (_, i) => primeiro + i)
}

/** Yearly t CO2e of a unit, aligned with `anosDe(fontes[inventario].anos)`. */
export function serieEmissoes(
  u: EmissoesUnidade,
  inventario: Inventario,
  medida: Medida,
  escopo: Escopo,
  fontes: Pick<EmissoesFile['fontes'], Inventario>,
): number[] {
  const [primeiro, ultimo] = fontes[inventario].anos
  const n = ultimo - primeiro + 1
  return inventario === 'seeg' ? seegSerie(u, medida, escopo, n) : ctSerie(u, medida, escopo, n)
}

/** t CO2e/ha over the whole area of the unit. */
export function intensidade(serie: number[], areaHa: number): number[] {
  return serie.map((v) => v / areaHa)
}
