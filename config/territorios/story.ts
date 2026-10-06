// Structure of the Territórios story: the territory types on the opening
// cards, the theme steps and the fixed facts every layer of the story shares.
// The sentences themselves live in storyScript.ts.

import { STEP_COLORS } from '@/config/territorios/palette'
import type { StepId, TerritoryTypeId, ThemeId } from '@/types/territorios'

export interface TerritoryType {
  id:        TerritoryTypeId
  /** Plural, capitalized as the layer names it. */
  label:     string
  /** Singular, for the type cards and the screen subtitle. */
  unitLabel: string
  /** Vector layer id in config/mapa/layers.json. */
  recorteId: string
  image:     string
  /** Lowercase plural for "{n} municípios com área na Caatinga"; null when there is no search. */
  plural:         string | null
  searchQuestion: string | null
}

export const BIOMA_RECORTE_ID = 'bioma'
/** slug('Bioma Caatinga'), the single feature of the biome recorte. */
export const BIOMA_FEATURE_ID = 'bioma-caatinga'

export const TERRITORY_TYPES: TerritoryType[] = [
  {
    id: 'bioma', label: 'Bioma', unitLabel: 'Bioma', recorteId: BIOMA_RECORTE_ID,
    image: '/images/territorios/bioma.jpg', plural: null, searchQuestion: null,
  },
  {
    id: 'estado', label: 'Estado', unitLabel: 'Estado', recorteId: 'estados',
    image: '/images/territorios/estado.jpg', plural: 'estados', searchQuestion: 'Qual estado?',
  },
  {
    id: 'municipio', label: 'Município', unitLabel: 'Município', recorteId: 'municipios',
    image: '/images/territorios/municipio.jpg', plural: 'municípios', searchQuestion: 'Qual município?',
  },
  {
    id: 'terra_indigena', label: 'Terras Indígenas', unitLabel: 'Terra Indígena', recorteId: 'terras_indigenas',
    image: '/images/territorios/terra-indigena.jpg', plural: 'terras indígenas', searchQuestion: 'Qual terra indígena?',
  },
  {
    id: 'territorio_quilombola', label: 'Territórios Quilombolas', unitLabel: 'Território Quilombola', recorteId: 'quilombolas',
    image: '/images/territorios/territorio-quilombola.jpg', plural: 'territórios quilombolas', searchQuestion: 'Qual território quilombola?',
  },
  {
    id: 'assentamento', label: 'Assentamentos', unitLabel: 'Assentamento', recorteId: 'assentamentos',
    image: '/images/territorios/assentamento.jpg', plural: 'assentamentos', searchQuestion: 'Qual assentamento?',
  },
]

export function territoryTypeByRecorte(recorteId: string): TerritoryType | undefined {
  return TERRITORY_TYPES.find((t) => t.recorteId === recorteId)
}

export interface StoryTheme {
  id:        ThemeId
  /** Raster layer id in config/mapa/layers.json. */
  layerId:   string
  railLabel: string
  /** Heading bar and summary card border; carries white text, so at least 4.5:1 against white. */
  color:     string
  /** Year of the map on this step; null for a static layer. */
  mapYear:   string | null
}

export const STORY_THEMES: StoryTheme[] = [
  { id: 'estoque',    layerId: 'estoque_carbono',  railLabel: 'Estoque',      color: STEP_COLORS.estoque,    mapYear: null },
  { id: 'fluxo',      layerId: 'gfw_netflux',      railLabel: 'Fluxo',        color: STEP_COLORS.fluxo,      mapYear: null },
  { id: 'uso',        layerId: 'lulc_mapbiomas',   railLabel: 'Uso da terra', color: STEP_COLORS.uso,        mapYear: '2024' },
  { id: 'fogo',       layerId: 'fogo_frequencia',  railLabel: 'Fogo',         color: STEP_COLORS.fogo,       mapYear: '2023' },
  { id: 'chuva',      layerId: 'chirps_precip',    railLabel: 'Chuva',        color: STEP_COLORS.chuva,      mapYear: '2024' },
]

export const STEPS: StepId[] = ['territorio', 'estoque', 'fluxo', 'uso', 'fogo', 'chuva', 'resumo']

export const STEP_LABELS: Record<StepId, string> = {
  territorio: 'Território',
  estoque:    'Estoque',
  fluxo:      'Fluxo',
  uso:        'Uso da terra',
  fogo:       'Fogo',
  chuva:      'Chuva',
  resumo:     'Resumo',
}

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

/** MapBiomas Fogo collection 3: frequency and annual burned area, 1985 to 2023. */
export const FIRE_FIRST_YEAR = 1985
export const FIRE_LAST_YEAR = 2023
/**
 * Annual burned area, one band per year (burned_area_YYYY), 1 where the pixel
 * burned that year and masked elsewhere. Not a layer of the WebSIG: only
 * computeTheme reads it, on the server, so it needs no allowlist entry.
 */
export const FIRE_ANNUAL_ASSET =
  'projects/mapbiomas-public/assets/brazil/fire/collection3/mapbiomas_fire_collection3_annual_burned_v1'
