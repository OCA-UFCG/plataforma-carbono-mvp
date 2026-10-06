// Contract of the Territórios storytelling experiment (/territorios).
//
// Shared by the two API routes, the precompute script and the client. The
// story is a sequence of steps over one recorte feature; each theme step is one
// request to /api/territorios/tema and one answer of this shape.

import type { StockReport, TimeSeriesPoint } from '@/types/mapa'

export type ThemeId = 'estoque' | 'fluxo' | 'uso' | 'fogo' | 'chuva'

export type StepId = 'territorio' | ThemeId | 'resumo'

/**
 * `no_pixels` is a settled answer (the data has nothing over this territory)
 * and is cached like `available`. `unavailable` is a failure worth retrying
 * and is never cached.
 */
export type ThemeStatus = 'available' | 'no_pixels' | 'unavailable'

/**
 * `point` means the zonal reduction found no pixel with weight and the value
 * is the pixel under an interior point of the territory. `precomputed` means
 * the answer came from config/territorios/precomputed.json.
 */
export type ThemeOrigin = 'zonal' | 'point' | 'precomputed'

export type TerritoryTypeId =
  | 'bioma'
  | 'estado'
  | 'municipio'
  | 'terra_indigena'
  | 'territorio_quilombola'
  | 'assentamento'

type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }

/**
 * Biome-wide references every step compares the territory with, read from the
 * precomputed biome entry. Each value divides by the same base the territory's
 * value does, so the two sit on one axis.
 */
export interface BiomeReference {
  /** Total reference stock of the biome in t C, computed from the same raster. */
  stockTotalTc: number | null
  /** Reference stock per hectare with stock data, t C/ha (total / report.areaHa). */
  stockDensityTcHa: number | null
  /** Percent (0..100) of the region inside the GFW forest extent. */
  forestSharePct: number | null
  /** Signed net flux 2001-2024 per hectare of GFW forest, Mg CO2e/ha. Negative = removal. */
  fluxPerForestHaMg: number | null
  /** Percent (0..100) of native vegetation, per year. */
  nativeSharePct: { '1985': number; '2024': number } | null
  /** Percent (0..100) of the region that burned at least once in the fire period. */
  fireBurnedSharePct: number | null
  /** Percent (0..100) of the region per number of years with fire. */
  fireRecurrenceSharesPct: FireRecurrenceShares | null
  /** Mean over the fire period of the region's yearly burned share, percent (0..100). */
  fireAnnualMeanSharePct: number | null
  /** Mean annual rainfall 1985-2024, in mm. */
  rainMeanMm: number | null
}

// Inputs of the story's charts. storyValues computes them from a theme answer
// and the biome reference; the chart components only draw them.

/** A value of the territory beside the same value for the whole Caatinga. */
export interface Comparison {
  here:      number
  /** null when the biome has no value, and the marker is left out. */
  reference: number | null
}

export interface StockChart {
  /** t C per hectare. */
  density: Comparison
}

export interface FluxChart {
  /** Percent (0..100) of the area inside the GFW forest extent. */
  forestShare: Comparison
  /**
   * Mg CO2e per hectare of forest, as magnitudes. null when the territory and
   * the biome went opposite ways, where two lengths on one axis would compare
   * a removal with an emission.
   */
  perForestHa: Comparison | null
}

export interface LandUseChart {
  /** Native vegetation share (0..100) in 1985 and 2024. */
  here:      { from: number; to: number }
  reference: { from: number; to: number } | null
}

/** Share (0..100) of the region per number of years with fire; adds up to 100. */
export interface FireRecurrenceShares {
  never:     number
  once:      number
  twoToFour: number
  fivePlus:  number
}

export interface FireChart {
  /** Percent (0..100) of the region that burned at least once. */
  burnedShare: Comparison
  /** Burned share (0..100) of the region, every year of the fire period. */
  years: { year: number; sharePct: number }[]
  /** Year with the largest burned area, the earliest on a tie; null when nothing burned. */
  peakYear: number | null
  /** Mean yearly burned share of the Caatinga; null without a reference. */
  referenceMeanPct: number | null
  recurrence: { here: FireRecurrenceShares; reference: FireRecurrenceShares | null }
}

export type RainYearKind = 'seco' | 'normal' | 'chuvoso'

export interface RainChartData {
  years: { year: number; valueMm: number | null; kind: RainYearKind | null }[]
  /** The territory's own 1985-2024 mean, which classifies the years. */
  meanMm:         number
  highlightYear:  number
  /** Mean annual rainfall: here against the Caatinga. */
  mean: Comparison
}

/** The answer of one step while the story runs: a figure and one short sentence. */
export interface StepAnswer {
  question: string
  /** Big figure; null when the step has no number to show (no data, point fallback without a value). */
  headline: { value: string; unit: string } | null
  /** One sentence, at most about 20 words. */
  sentence: string
}

/** Where the territory stands against the Caatinga, in words that judge nothing. */
export type Reading = 'acima' | 'abaixo' | 'perto'

/**
 * Whether a reading is good news for the territory: more carbon held, more
 * taken from the air, more native vegetation, less fire. The words of the
 * reading judge nothing; only the color of its badge does.
 */
export type Tone = 'good' | 'bad' | 'neutral'

/** One line of the final sheet. */
export interface SummaryRow {
  theme:    ThemeId
  title:    string
  headline: { value: string; unit: string } | null
  sentence: string
  reading:  Reading | null
  /** Color of the reading's badge; null with no reading. */
  tone:     Tone | null
}

/** One item of the "Sobre os dados" block at the end. */
export interface AboutItem {
  title: string
  text:  string
}

/** Where a territory stands among those of its type by area. */
export interface AreaRank {
  /** 1 for the largest; ties share the better place. */
  position: number
  total:    number
}

/** A card under the territory's area: a figure and the words after it. */
export interface Indicator {
  value: string
  text:  string
}

/** GET /api/territorios/territorio?recorte=&feicao= */
export interface TerritoryPayload {
  recorteId:   string
  recorteName: string
  featureId:   string
  featureName: string
  /** State abbreviation, from the layer's contextField. */
  context?:    string
  /** Geodesic area inside the biome boundary, in hectares. */
  areaHa:      number
  biomaAreaHa: number
  /** Its place among the territories of its type by area; null for the biome. */
  areaRank:    AreaRank | null
  bbox:        [number, number, number, number]
  boundary:    'full' | 'simplified'
  geometry:    Geometry
  biome:       BiomeReference
}

export interface StockThemeData {
  theme:  'estoque'
  report: StockReport
}

export interface FluxThemeData {
  theme: 'fluxo'
  /** Signed net flux 2001-2024 over the GFW forest extent, in Mg CO2e. Negative = removal. */
  totalMgCo2e:  number
  /** Area of the GFW forest extent inside the territory (unmasked pixels), in hectares. */
  forestAreaHa: number
  /**
   * Area of the whole territory weighted by the same reduction, in hectares. The
   * forest share divides by this, not by the geodesic area: a reduction weights
   * edge pixels by coverage, and small polygons come out below their geodesic
   * area (51% and 75% measured in Phase 0), so mixing the two bases skews the share.
   */
  regionAreaHa: number
}

export interface LandUseThemeData {
  theme: 'uso'
  /** Area in m² per MapBiomas class code, per year. Only shares are trusted, not the m² total. */
  areas: { '1985': Record<string, number>; '2024': Record<string, number> }
}

export interface FireThemeData {
  theme: 'fogo'
  /** Area of the whole territory weighted by the same reduction, in hectares; every share divides by it. */
  regionAreaHa: number
  /** Area that burned in at least one year of the fire period, in hectares. */
  burnedOnceHa: number
  /** Burned area by number of years with fire, in hectares; the three add up to burnedOnceHa. */
  recurrenceHa: { once: number; twoToFour: number; fivePlus: number }
  /** Burned area of each year of the fire period, in hectares. */
  annual: { year: number; burnedHa: number }[]
}

export interface RainThemeData {
  theme:  'chuva'
  /** Annual rainfall in mm, 1985 to 2024; null for a year with no data. */
  series: TimeSeriesPoint[]
}

export type ThemeData =
  | StockThemeData
  | FluxThemeData
  | LandUseThemeData
  | FireThemeData
  | RainThemeData

/** GET /api/territorios/tema?recorte=&feicao=&tema= */
export interface ThemeResponse {
  recorteId: string
  featureId: string
  theme:     ThemeId
  status:    ThemeStatus
  origin:    ThemeOrigin | null
  /** Reduction scale in metres when it is coarser than the layer's native scale, else null. */
  coarseScaleM: number | null
  data:      ThemeData | null
}

/** Shape of config/territorios/precomputed.json. */
export interface PrecomputedThemeEntry {
  status:       Exclude<ThemeStatus, 'unavailable'>
  coarseScaleM: number | null
  data:         ThemeData | null
}

export interface PrecomputedFile {
  generatedAt: string
  /** Keyed by `${recorteId}|${featureId}`. */
  entries: Record<string, {
    featureName: string
    themes: Partial<Record<ThemeId, PrecomputedThemeEntry>>
  }>
}
