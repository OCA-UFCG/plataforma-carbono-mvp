// Structure of the Territórios story: the territory types on the opening
// cards, the theme steps and the fixed facts every layer of the story shares.
// The words the visitor reads live in translations/<locale>/: the type names
// and the step names in TerritoriosTypes.json (by the ids below), the
// sentences in TerritoriosStory.json.

import { STEP_COLORS } from '@/config/territorios/palette'
import type { StepId, TerritoryTypeId, ThemeId } from '@/types/territorios'

export interface TerritoryType {
  id:        TerritoryTypeId
  /** Vector layer id in config/mapa/layers.json; null for the types with no data yet. */
  recorteId: string | null
  enabled:   boolean
  image:     string
  /** Whether the chooser offers a search by name (and its count line). */
  searchable: boolean
}

export const BIOMA_RECORTE_ID = 'bioma'
/** slug('Bioma Caatinga'), the single feature of the biome recorte. */
export const BIOMA_FEATURE_ID = 'bioma-caatinga'

export const TERRITORY_TYPES: TerritoryType[] = [
  {
    id: 'bioma', recorteId: BIOMA_RECORTE_ID, enabled: true,
    image: '/images/territorios/bioma.jpg', searchable: false,
  },
  {
    id: 'estado', recorteId: 'estados', enabled: true,
    image: '/images/territorios/estado.jpg', searchable: true,
  },
  {
    id: 'municipio', recorteId: 'municipios', enabled: true,
    image: '/images/territorios/municipio.jpg', searchable: true,
  },
  {
    id: 'terra_indigena', recorteId: 'terras_indigenas', enabled: true,
    image: '/images/territorios/terra-indigena.jpg', searchable: true,
  },
  {
    id: 'territorio_quilombola', recorteId: 'quilombolas', enabled: true,
    image: '/images/territorios/territorio-quilombola.jpg', searchable: true,
  },
  {
    id: 'assentamento', recorteId: 'assentamentos', enabled: true,
    image: '/images/territorios/assentamento.jpg', searchable: true,
  },
  {
    id: 'propriedade_rural', recorteId: null, enabled: false,
    image: '/images/territorios/propriedade-rural.jpg', searchable: false,
  },
  {
    id: 'unidade_conservacao', recorteId: null, enabled: false,
    image: '/images/territorios/unidade-conservacao.jpg', searchable: false,
  },
]

export function territoryTypeByRecorte(recorteId: string): TerritoryType | undefined {
  return TERRITORY_TYPES.find((t) => t.recorteId === recorteId)
}

export interface StoryTheme {
  id:        ThemeId
  /** Raster layer id in config/mapa/layers.json. */
  layerId:   string
  /** Heading bar and summary card border; carries white text, so at least 4.5:1 against white. */
  color:     string
  /** Year of the map on this step; null for a static layer. */
  mapYear:   string | null
}

export const STORY_THEMES: StoryTheme[] = [
  { id: 'estoque',    layerId: 'estoque_carbono',  color: STEP_COLORS.estoque,    mapYear: null },
  { id: 'fluxo',      layerId: 'gfw_netflux',      color: STEP_COLORS.fluxo,      mapYear: null },
  { id: 'uso',        layerId: 'lulc_mapbiomas',   color: STEP_COLORS.uso,        mapYear: '2024' },
  { id: 'degradacao', layerId: 'degradacao_terra', color: STEP_COLORS.degradacao, mapYear: null },
  { id: 'chuva',      layerId: 'chirps_precip',    color: STEP_COLORS.chuva,      mapYear: '2024' },
]

export const STEPS: StepId[] = ['territorio', 'estoque', 'fluxo', 'uso', 'degradacao', 'chuva', 'resumo']

export function storyTheme(id: ThemeId): StoryTheme {
  const theme = STORY_THEMES.find((t) => t.id === id)
  if (!theme) throw new Error(`Unknown theme ${id}`)
  return theme
}

// Facts measured against the assets on 2026-09-16 (see the plan's Phase 0).

/** GFW net flux model period: the pixel holds the 2001-2024 total per hectare. */
export const FLUX_FIRST_YEAR = 2001
export const FLUX_LAST_YEAR = 2024
/**
 * Above this area the 30 m flux reduction runs into the 60 s Earth Engine
 * deadline (Bahia took 39 s and 60 s); at 100 m it took 8.9 s and the total
 * moved 0.04%.
 */
export const FLUX_COARSE_ABOVE_HA = 15_000_000
export const FLUX_COARSE_SCALE_M = 100

/**
 * One CHIRPS pixel (5.566 km) in hectares. Below it the zonal rain series
 * comes back empty or runs out of Earth Engine memory (13 ha and 25 ha
 * settlements, 2026-09-28), so the series is read at a point from the start.
 */
export const RAIN_POINT_BELOW_HA = 3_100

export const LAND_USE_YEARS = ['1985', '2024'] as const
export const RAIN_FIRST_YEAR = 1985
export const RAIN_LAST_YEAR = 2024
export const DEGRADATION_YEAR = 2021
