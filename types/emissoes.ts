// Contract of config/emissoes/emissoes.json, written by scripts/build-emissoes.py.
//
// Annual GHG emissions of the 1,095 Caatinga municipalities from two
// inventories, in t CO2e (AR6 GWP100). Every value is the total of a whole
// municipality; a state is the sum of its Caatinga municipalities and the biome
// the sum of all of them. Each series is aligned with the inventory's year range
// in `fontes` and holds integers. Positive is emission, negative is removal.

export type Inventario = 'seeg' | 'ct'

/** Gross emissions, or emissions minus removals. */
export type Medida = 'brutas' | 'liquidas'

/** Every sector, or only the land-use one. */
export type Escopo = 'total' | 'usoDaTerra'

/** What one emissions map layer shows (the `emissoes` block of layers.json). */
export interface EmissoesCamadaSpec {
  inventario: Inventario
  medida: Medida
  escopo: Escopo
}

/** The recortes an emissions layer can be drawn on: the levels the data exists at. */
export type NivelEmissoes = 'municipios' | 'estados' | 'bioma'

/**
 * Answer of /api/mapa/emissoes for one layer: t CO2e/ha by year at each level,
 * and the color classes shared by all of them. `valores` keys are the IBGE code
 * (municipios), the two-letter state (estados) and 'bioma'.
 */
export interface EmissoesCamadaPayload {
  anos: number[]
  unidade: string
  classes: { limites: number[]; cores: string[] }
  valores: Record<NivelEmissoes, Record<string, number[]>>
}

export type SeegSetorId = 'agropecuaria' | 'energia' | 'uso_da_terra' | 'processos_industriais' | 'residuos'

/** SEEG emission types: 1 "Emissão", 9 "Emissão (NCI)" and 300 "Remoção". */
export type SeegTipo = 'emissao' | 'emissao_nci' | 'remocao'

export type CtSetorId =
  | 'agriculture'
  | 'buildings'
  | 'fluorinated-gases'
  | 'fossil-fuel-operations'
  | 'manufacturing'
  | 'mineral-extraction'
  | 'power'
  | 'transportation'
  | 'waste'

/**
 * Climate TRACE forestry-and-land-use, kept as four series. `saldos` (yearly
 * change of the living-biomass stock: net-forest-land, net-shrubgrass,
 * net-wetland) + `solo` (net-soil-organic-carbon) + `reservatorios` add up
 * without double counting. `brutas` (clearing, degradation and fires) is
 * already inside `saldos`: never add the two.
 */
export type CtUsoDaTerraFamilia = 'brutas' | 'saldos' | 'solo' | 'reservatorios'

export interface EmissoesUnidade {
  /** Official IBGE area of the whole municipalities, in hectares. */
  areaHa: number
  /** Only the sector x type pairs with a non-zero value in some year. */
  seeg: Partial<Record<SeegSetorId, Partial<Record<SeegTipo, number[]>>>>
  ct: {
    /** Sectors other than forestry-and-land-use, only those with a non-zero value. */
    setores: Partial<Record<CtSetorId, number[]>>
    usoDaTerra: Record<CtUsoDaTerraFamilia, number[]>
  }
}

export interface EmissoesMunicipio extends EmissoesUnidade {
  nome: string
  /** Two-letter state, as `abbrev_state` in municipios.geojson. */
  uf: string
}

export interface EmissoesAgregado extends EmissoesUnidade {
  /** How many municipalities the sum covers. */
  municipios: number
}

export interface EmissoesFonte {
  /** Date the API was queried, YYYY-MM-DD. */
  consulta: string
  /** First and last year of every series of this inventory. */
  anos: [number, number]
}

export interface EmissoesFile {
  fontes: {
    gwp: string
    unidade: string
    seeg: EmissoesFonte & { colecao: string }
    ct: EmissoesFonte & { versao: string }
    /** Where `areaHa` comes from, and the year of the IBGE municipal grid. */
    areas: { fonte: string; periodo: number }
  }
  bioma: EmissoesAgregado
  /** Keyed by the two-letter state. */
  estados: Record<string, EmissoesAgregado>
  /** Keyed by the 7-digit IBGE code, as `code_muni` in municipios.geojson. */
  municipios: Record<string, EmissoesMunicipio>
}
