// What the "Resultados" panel shows for each raster layer.
//
// A layer's numbers are only meaningful under one aggregation rule, and that
// rule is a property of the variable, not of the pixel type: a stock density
// adds up to a total once multiplied by the pixel area, a soil concentration in
// g/kg never does, a class code must never be averaged, and an accumulated
// flux is not a yearly one. Each archetype below encodes one such rule, and
// every raster in layers.json names exactly one (tests/config/resultProfiles
// checks it).
//
// Only layer ids and bands of layers.json are referenced, never an asset, so
// the file is safe on the client. The server reads the same file to decide what
// to compute (lib/mapa/resultsRegistry.ts); nothing here travels in a request.
//
// The prose (notes, labels, group names) is written here in Portuguese and is
// translated by `getResultProfile(layerId, tx)`, from the MapaResults namespace
// (profiles.<layerId>.<field>; the six stock layers share profiles.stocks).

import { lookup, unitLabel, type MapaText } from '@/lib/mapa/text'

export type Archetype =
  | 'stocks'
  | 'amount'
  | 'distribution'
  | 'flux'
  | 'annual'
  | 'composition'
  | 'recurrence'

interface Common {
  /** One line about the data under the result. Never about how the panel computes. */
  note?: string
  /** Reference period for a layer whose config carries no year of its own. */
  period?: string
}

/** Quarto Inventário stock report; the pool layers are the same asset seen through one band. */
export interface StocksProfile extends Common {
  archetype: 'stocks'
  /** Layer holding the `gee.stocks` block the report is computed from. */
  source: string
}

/** A density that adds up to a total: value × pixel area. */
export interface AmountProfile extends Common {
  archetype: 'amount'
  totalLabel: string
  /** Unit of the total, the layer's per-hectare unit times hectares. */
  totalUnit: string
  /** Which hectares the density refers to: every hectare with data, woody cover only, or all territory. */
  densityBasis: 'valid' | 'woody' | 'territory'
  /** Carbon fraction of dry biomass, for layers in biomass rather than carbon. */
  carbonFraction?: number
  /** Lower edges of the histogram bands; the last one is open-ended. */
  bins: number[]
}

/** An intensive quantity, summarised by its distribution and never totalled. */
export interface DistributionProfile extends Common {
  archetype: 'distribution'
  /** Fixed analysis scale, the same for any region so percentiles stay comparable. */
  scale: number
  bins: number[]
  threshold?: { value: number; label: string }
}

/** A carbon flux accumulated over the whole model period. */
export interface FluxProfile extends Common {
  archetype: 'flux'
  totalLabel: string
  /** Net flux: negative where removals beat emissions. */
  signed: boolean
  totalUnit: 't CO2e' | 't CO2'
}

/** One value per year, read against the selected year. */
export interface AnnualProfile extends Common {
  archetype: 'annual'
  meanLabel: string
  unit: string
  /**
   * Changes to the layer's asset needed for a physical yearly value. The map
   * tile of the MODIS productivity layers stays in raw counts, because its
   * Jenks breaks were computed on them.
   */
  physical?: { reducer?: 'sum'; multiplier: number }
  /** Productivity: the yearly value summed over the area; m² per unit of the total. */
  total?: { label: string; unit: string; areaDivisor: number }
}

export interface MacroGroup {
  /** Key of the group's translation (MapaResults profiles.<layer>.groups.<id>). */
  id: string
  label: string
  color: string
  codes: number[]
}

/** Area per class code. */
export interface CompositionProfile extends Common {
  archetype: 'composition'
  nominal?: { native: number[]; groups: MacroGroup[] }
  ordinal?: {
    /** Display order, from the best condition to the worst. */
    order: number[]
    degraded: number[]
    severe: number[]
    severeLabel: string
  }
}

/** Accumulated fire count since the first year of the series. */
export interface RecurrenceProfile extends Common {
  archetype: 'recurrence'
  scale: number
  firstYear: number
  /** Counts from this value up read as recurrent fire. */
  recurrentFrom: number
  /** Count bands, [from, to], `to` null for the open top band. */
  bins: [number, number | null][]
}

export type ResultProfile =
  | StocksProfile
  | AmountProfile
  | DistributionProfile
  | FluxProfile
  | AnnualProfile
  | CompositionProfile
  | RecurrenceProfile

// Carbon fraction of dry biomass adopted by the Quarto Inventário for aboveground
// biomass: Relatório de Referência LULUCF da 4ª Comunicação Nacional, table "Teor
// de carbono da biomassa" (IPCC 2006, vol. 4, table 4.3).
const CARBON_FRACTION = 0.47

const BIOMASS_BINS = [0, 10, 20, 40, 60, 90]

// Mosaic of uses (21) counts as farming, as MapBiomas groups it. Rocky outcrop
// (29) is left out of native vegetation.
const NATIVE_FOREST = [3, 4, 5, 6, 49]
const NATIVE_NONFOREST = [11, 12, 32, 50]

const STOCKS: StocksProfile = {
  archetype: 'stocks',
  source: 'estoque_carbono',
  note: 'Estoque da cobertura pretérita (potencial).',
}

export const RESULT_PROFILES: Readonly<Record<string, ResultProfile>> = {
  estoque_carbono:  STOCKS,
  estoque_c_agb:    STOCKS,
  estoque_c_bgb:    STOCKS,
  estoque_c_dw:     STOCKS,
  estoque_c_litter: STOCKS,
  estoque_c_solo:   STOCKS,

  solo_carbono: {
    archetype: 'amount',
    totalLabel: 'Carbono orgânico do solo',
    totalUnit: 't C',
    densityBasis: 'valid',
    bins: [0, 20, 30, 40, 50, 60],
    note: 'Profundidade de 0 a 30 cm.',
  },
  biomassa_gedi: {
    archetype: 'amount',
    totalLabel: 'Biomassa aérea',
    totalUnit: 't',
    densityBasis: 'valid',
    carbonFraction: CARBON_FRACTION,
    bins: BIOMASS_BINS,
    note: 'Há lacunas entre as trilhas de medição do satélite.',
  },
  biomassa_esa_lenhosa: {
    archetype: 'amount',
    totalLabel: 'Biomassa aérea',
    totalUnit: 't',
    densityBasis: 'woody',
    carbonFraction: CARBON_FRACTION,
    bins: BIOMASS_BINS,
  },
  biomassa_esa_territorial: {
    archetype: 'amount',
    totalLabel: 'Biomassa aérea',
    totalUnit: 't',
    densityBasis: 'territory',
    carbonFraction: CARBON_FRACTION,
    bins: BIOMASS_BINS,
  },
  biomassa_spawn: {
    archetype: 'amount',
    totalLabel: 'Carbono da biomassa aérea',
    totalUnit: 't C',
    densityBasis: 'valid',
    bins: [0, 10, 20, 30, 50, 70],
    period: '2010',
  },

  solo_carbono_embrapa: {
    archetype: 'distribution',
    scale: 928,
    bins: [0, 4, 6, 8, 10, 12, 14, 16],
    period: '2020',
    note: 'Teor de carbono; não equivale a estoque.',
  },
  altura_dossel: {
    archetype: 'distribution',
    scale: 30,
    bins: [0, 1, 3, 5, 10],
    threshold: { value: 5, label: 'Área com dossel de 5 m ou mais' },
    period: '2023',
  },

  gfw_netflux: {
    archetype: 'flux',
    totalLabel: 'Fluxo líquido',
    signed: true,
    totalUnit: 't CO2e',
    period: '2001 a 2024',
  },
  gfw_emissions: {
    archetype: 'flux',
    totalLabel: 'Emissões brutas',
    signed: false,
    totalUnit: 't CO2e',
    period: '2001 a 2024',
  },
  gfw_removals: {
    archetype: 'flux',
    totalLabel: 'Remoções brutas',
    signed: false,
    totalUnit: 't CO2',
    period: '2001 a 2024',
    note: 'Em CO2, sem outros gases.',
  },

  gpp_modis: {
    archetype: 'annual',
    meanLabel: 'GPP média',
    unit: 'g C/m²/ano',
    physical: { reducer: 'sum', multiplier: 0.1 },
    total: { label: 'GPP total', unit: 't C/ano', areaDivisor: 1e6 },
  },
  npp_modis: {
    archetype: 'annual',
    meanLabel: 'NPP média',
    unit: 'g C/m²/ano',
    physical: { multiplier: 0.1 },
    total: { label: 'NPP total', unit: 't C/ano', areaDivisor: 1e6 },
  },
  gpp_pml: {
    archetype: 'annual',
    meanLabel: 'GPP média',
    unit: 'g C/m²/ano',
    total: { label: 'GPP total', unit: 't C/ano', areaDivisor: 1e6 },
  },
  ndvi_modis: {
    archetype: 'annual',
    meanLabel: 'NDVI médio',
    unit: '',
  },
  evi_modis: {
    archetype: 'annual',
    meanLabel: 'EVI médio',
    unit: '',
  },
  chirps_precip: {
    archetype: 'annual',
    meanLabel: 'Chuva no ano',
    unit: 'mm',
  },
  lst_modis: {
    archetype: 'annual',
    meanLabel: 'Temperatura média',
    unit: '°C',
    note: 'Temperatura da superfície, passagem diurna; não é temperatura do ar.',
  },

  lulc_mapbiomas: {
    archetype: 'composition',
    nominal: {
      native: [...NATIVE_FOREST, ...NATIVE_NONFOREST],
      groups: [
        { id: 'nativeForest', label: 'Vegetação nativa florestal', color: '#1f8d49', codes: NATIVE_FOREST },
        { id: 'nativeNonForest', label: 'Vegetação nativa campestre e arbustiva', color: '#d6bc74', codes: NATIVE_NONFOREST },
        { id: 'farming', label: 'Agropecuária', color: '#ffefc3', codes: [9, 15, 18, 20, 21, 35, 39, 40, 41, 46, 47, 48, 62] },
        { id: 'nonVegetated', label: 'Área não vegetada', color: '#d4271e', codes: [23, 24, 25, 29, 30, 75] },
        { id: 'water', label: 'Água', color: '#2532e4', codes: [31, 33] },
      ],
    },
  },
  degradacao_terra: {
    archetype: 'composition',
    period: '2021',
    ordinal: {
      order: [6, 5, 4, 3, 2, 1],
      degraded: [1, 2, 3, 4, 5],
      severe: [1, 2],
      severeLabel: 'Níveis 4 e 5',
    },
  },

  fogo_frequencia: {
    archetype: 'recurrence',
    scale: 30,
    firstYear: 1985,
    recurrentFrom: 5,
    // 5 starts a band, so the recurrent-fire figure is the sum of the last two bars.
    bins: [[1, 1], [2, 4], [5, 10], [11, null]],
  },
}

/**
 * A copy of the profile with its prose (and the units that carry Portuguese
 * words) in the user's language. Everything numeric is left untouched.
 */
export function localizeProfile(layerId: string, profile: ResultProfile, tx: MapaText): ResultProfile {
  // The stock layers are six ids sharing one profile, so they share one text.
  const id = profile.archetype === 'stocks' ? 'stocks' : layerId
  const text = (field: string, fallback: string) =>
    lookup(tx, `MapaResults.profiles.${id}.${field}`, fallback)
  const optional = (field: string, value: string | undefined) =>
    value === undefined ? undefined : text(field, value)

  const common = { note: optional('note', profile.note), period: optional('period', profile.period) }
  const defined = <T extends object>(obj: T): T =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T

  switch (profile.archetype) {
    case 'stocks':
    case 'recurrence':
      return { ...profile, ...defined(common) }
    case 'amount':
      return { ...profile, ...defined(common), totalLabel: text('totalLabel', profile.totalLabel) }
    case 'distribution':
      return {
        ...profile,
        ...defined(common),
        ...(profile.threshold
          ? { threshold: { ...profile.threshold, label: text('threshold', profile.threshold.label) } }
          : {}),
      }
    case 'flux':
      return { ...profile, ...defined(common), totalLabel: text('totalLabel', profile.totalLabel) }
    case 'annual':
      return {
        ...profile,
        ...defined(common),
        meanLabel: text('meanLabel', profile.meanLabel),
        unit: unitLabel(profile.unit, tx),
        ...(profile.total
          ? { total: { ...profile.total, label: text('totalLabel', profile.total.label), unit: unitLabel(profile.total.unit, tx) } }
          : {}),
      }
    case 'composition':
      return {
        ...profile,
        ...defined(common),
        ...(profile.nominal
          ? {
              nominal: {
                ...profile.nominal,
                groups: profile.nominal.groups.map((g) => ({ ...g, label: text(`groups.${g.id}`, g.label) })),
              },
            }
          : {}),
        ...(profile.ordinal
          ? { ordinal: { ...profile.ordinal, severeLabel: text('severeLabel', profile.ordinal.severeLabel) } }
          : {}),
      }
  }
}

/**
 * The result profile of a layer. With a `MapaText` the prose comes back
 * translated; without one it is the Portuguese the file carries (what the
 * server-side registry and the tests read).
 */
export function getResultProfile(layerId: string, tx?: MapaText): ResultProfile | undefined {
  const profile = RESULT_PROFILES[layerId]
  return profile && tx ? localizeProfile(layerId, profile, tx) : profile
}
