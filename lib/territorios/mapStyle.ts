// What the Territórios story map draws: the tile request of each theme, its
// legend and the framing of each step.
//
// Land use, degradation and flux take the story's own palette
// (config/territorios/palette.ts), so the raster paints the classes of the chart
// beside it in the chart's colors; stock and rain keep the layer's visParams.
// The WebSIG reads config/mapa/layers.json directly and never sees these.

import appConfig from '@/config/mapa/layers.json'
import { LAND_USE_GROUPS, landUseGroupOf } from '@/config/territorios/landUseGroups'
import { DEGRADATION_COLORS, FLUX_COLORS, SURFACE_COLOR } from '@/config/territorios/palette'
import { storyTheme } from '@/config/territorios/story'
import { contrast } from '@/lib/color'
import type { GeeAssetConfig } from '@/lib/mapa/geeImage'
import { DEGRADATION_KEYS } from '@/lib/territorios/storyValues'
import { fixed, type Fmt } from '@/lib/territorios/i18n'
import type { RasterLayerConfig } from '@/types/mapa'
import type { StepId, ThemeId } from '@/types/territorios'

type Bbox = [number, number, number, number]

export interface VisParams {
  min:     number
  max:     number
  palette: string[]
}

/** Body of POST /api/gee/tile. */
export interface TileRequest {
  asset:         GeeAssetConfig
  temporalDate?: string
  visParams:     VisParams
  classify?:     NonNullable<RasterLayerConfig['gee']>['classify']
}

export interface ThemeRaster {
  request: TileRequest
  /** 0..1 */
  opacity: number
  /** Nearest for the class maps, whose classes must not blend into colors no chart shows. */
  resampling: 'nearest' | 'linear'
}

export interface LegendItem {
  label:    string
  color:    string
  /** A fill below 3:1 on the surface gets the charts' 1 px outline. */
  outlined: boolean
}

export type Legend =
  | { kind: 'classes'; items: LegendItem[] }
  | { kind: 'ramp'; title: string; palette: string[]; min: string; max: string }

export function storyLayer(themeId: ThemeId): RasterLayerConfig {
  const id = storyTheme(themeId).layerId
  const layer = (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === id)
  if (!layer?.gee?.asset) throw new Error(`Layer ${id} has no Earth Engine asset`)
  return layer
}

/** One color per MapBiomas code, 0 to the layer's max: the color of the code's group. */
export function landUsePalette(maxCode: number): string[] {
  return Array.from({ length: maxCode + 1 }, (_, code) => landUseGroupOf(code).color)
}

const DEGRADATION_CODES = [0, 1, 2, 3, 4, 5, 6]

/**
 * Half-width of the band around zero where the two flux colors blend. The
 * pixel holds a 2001-2024 total in Mg CO2e/ha, tens of units away from zero.
 */
const FLUX_SPLIT = 0.001

function themeVisParams(themeId: ThemeId, layer: RasterLayerConfig): VisParams {
  switch (themeId) {
    case 'uso': {
      const maxCode = layer.gee?.visParams?.max ?? 0
      return { min: 0, max: maxCode, palette: landUsePalette(maxCode) }
    }
    case 'degradacao':
      return { min: 0, max: 6, palette: DEGRADATION_CODES.map((code) => DEGRADATION_COLORS[code]) }
    case 'fluxo':
      return { min: -FLUX_SPLIT, max: FLUX_SPLIT, palette: [FLUX_COLORS.removal, FLUX_COLORS.emission] }
    default: {
      const vis = layer.gee?.visParams
      return { min: vis?.min ?? 0, max: vis?.max ?? 1, palette: vis?.palette ?? [] }
    }
  }
}

const CLASS_MAPS: ThemeId[] = ['uso', 'degradacao', 'fluxo']

/**
 * The tile request of a theme. `year` overrides the step's map year (land use
 * shows 1985 on request).
 *
 * No clipId: the Earth Engine tile clipped to the full-detail biome outline
 * took 4.4 s against 1.4 s without it (measured 2026-09-28), and the slow tiles
 * are what ran into HTTP 429. The recortes are already clipped to the biome
 * and the map dims everything outside the territory.
 */
export function themeRaster(themeId: ThemeId, year?: string): ThemeRaster {
  const layer = storyLayer(themeId)
  const mapYear = year ?? storyTheme(themeId).mapYear
  const classMap = CLASS_MAPS.includes(themeId)
  const asset: GeeAssetConfig = { ...layer.gee!.asset }
  // The index masks the pixels it has no value for; filled with code 0 they
  // paint the "Sem dado" share of the chart instead of vanishing.
  if (themeId === 'degradacao') asset.unmaskValue = 0

  return {
    request: {
      asset,
      temporalDate: mapYear ? `${mapYear}-01-01` : undefined,
      visParams:    themeVisParams(themeId, layer),
      // A class palette is indexed by the raw code; Jenks would renumber the
      // pixels 1..N and paint them with the first N colors.
      classify:     classMap ? undefined : layer.gee?.classify,
    },
    // Full opacity keeps the class colors those of the chart.
    opacity:    classMap ? 1 : layer.opacity / 100,
    resampling: classMap ? 'nearest' : 'linear',
  }
}

/** Client cache key: the whole body, so a palette or a year never reuses another's URL. */
export function tileRequestKey(request: TileRequest): string {
  return JSON.stringify(request)
}

const outlined = (color: string) => contrast(color, SURFACE_COLOR) < 3

/** Legend order: Conservado first, level 5 next to last and the masked area ("Sem dado") last. */
const DEGRADATION_LEGEND_CODES = [6, 5, 4, 3, 2, 1, 0]

/** Title of the color ramp of the two themes that draw one; the layer's own unit otherwise. */
function rampTitle(themeId: ThemeId, year: string | null, fmt: Fmt): string | undefined {
  if (themeId === 'estoque') return fmt.t('legend.ramp.stock')
  if (themeId === 'chuva') return year ? fmt.t('legend.ramp.rainYear', { year }) : fmt.t('legend.ramp.rainPerYear')
  return undefined
}

/** The legend of a theme's map, worded in the language `fmt` carries. */
export function themeLegend(themeId: ThemeId, fmt: Fmt): Legend {
  const layer = storyLayer(themeId)
  const item = (label: string, color: string): LegendItem => ({ label, color, outlined: outlined(color) })
  const legendNumber = (n: number) => fixed(n, 0, fmt.locale)

  switch (themeId) {
    case 'uso': {
      // The groups that paint at least one class of the layer, in the chart's order.
      const painted = new Set((layer.classes ?? []).map((c) => landUseGroupOf(c.value).id))
      return {
        kind:  'classes',
        items: LAND_USE_GROUPS.filter((g) => painted.has(g.id)).map((g) => item(fmt.t(`landUseGroups.${g.id}`), g.color)),
      }
    }
    case 'degradacao':
      return {
        kind:  'classes',
        // Code 0 flat, as the raster paints it; only the chart hatches it.
        items: DEGRADATION_LEGEND_CODES.map((code) => item(fmt.t(`legend.degradation.${DEGRADATION_KEYS[code]}`), DEGRADATION_COLORS[code])),
      }
    case 'fluxo':
      return {
        kind:  'classes',
        items: [item(fmt.t('legend.fluxRemoval'), FLUX_COLORS.removal), item(fmt.t('legend.fluxEmission'), FLUX_COLORS.emission)],
      }
    default: {
      const vis = themeVisParams(themeId, layer)
      return {
        kind:    'ramp',
        title:   rampTitle(themeId, storyTheme(themeId).mapYear, fmt) ?? layer.unit ?? '',
        palette: vis.palette,
        min:     legendNumber(vis.min),
        max:     legendNumber(vis.max),
      }
    }
  }
}

/** Bounding box of the simplified biome outline the map draws (limite_caatinga_clip.geojson). */
export const CAATINGA_BBOX: Bbox = [-45.07658, -16.71049, -35.07258, -2.74849]

/**
 * Narrowest view of the rain step, in degrees: CHIRPS pixels are 0.05°, so the
 * view holds at least 30 of them across, where a small municipality alone
 * would sit on two or three.
 */
export const RAIN_MIN_SPAN_DEG = 1.5

export type Frame = 'bioma' | 'territorio' | 'entorno'

export function frameOf(step: StepId): Frame {
  if (step === 'territorio') return 'bioma'
  if (step === 'chuva') return 'entorno'
  return 'territorio'
}

export function frameBbox(frame: Frame, territoryBbox: Bbox): Bbox {
  if (frame === 'bioma') return CAATINGA_BBOX
  if (frame === 'territorio') return territoryBbox
  const [minX, minY, maxX, maxY] = territoryBbox
  const [x0, x1] = widen(minX, maxX)
  const [y0, y1] = widen(minY, maxY)
  return [x0, y0, x1, y1]
}

function widen(lo: number, hi: number): [number, number] {
  if (hi - lo >= RAIN_MIN_SPAN_DEG) return [lo, hi]
  const center = (lo + hi) / 2
  return [center - RAIN_MIN_SPAN_DEG / 2, center + RAIN_MIN_SPAN_DEG / 2]
}

const mercatorY = (lat: number) => {
  const r = (lat * Math.PI) / 180
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2
}

/** Larger side of a bbox on screen, in CSS pixels, at a MapLibre zoom (512 px world at zoom 0). */
export function bboxSpanPx(bbox: Bbox, zoom: number): number {
  const world = 512 * 2 ** zoom
  const dx = ((bbox[2] - bbox[0]) / 360) * world
  const dy = Math.abs(mercatorY(bbox[1]) - mercatorY(bbox[3])) * world
  return Math.max(dx, dy)
}

/** Below this size on screen a territory shows as a dot on the biome view. */
export const MARKER_BELOW_PX = 32
