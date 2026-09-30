import appConfig from '@/config/mapa/layers.json'
import { THEMES, TERRITORY_THEME_ID, type ThemeInfo } from '@/config/mapa/groups'
import type { LayerConfig } from '@/types/mapa'

/**
 * Draw order of the map layers. The store's `layers` array IS the draw order
 * (layers[0] is drawn on top): the recortes first, in layers.json order, then
 * the rasters by the user's theme order, then subtheme order. Recortes have to
 * sit above the rasters: a click resolves to a recorte and measures the rasters
 * under it (`clickableRecortes`). Every thematic subtheme is exclusive, so
 * ordering subthemes orders the visible rasters.
 *
 * Every function returns the same array when nothing changes, so the store does
 * not notify, re-render or re-persist for a no-op.
 */

// layers.json order: the recortes' order, and the tie-break inside a subtheme.
const CATALOG = appConfig.layers as LayerConfig[]
// Território is always on top, so it is not part of the user's order.
const THEMATIC = THEMES.filter((theme) => theme.id !== TERRITORY_THEME_ID)

export const DEFAULT_THEME_ORDER: string[] = THEMATIC.map((theme) => theme.id)
export const DEFAULT_SUBTHEME_ORDER: Record<string, string[]> = Object.fromEntries(
  THEMATIC.map((theme) => [theme.id, theme.subthemes.map((subtheme) => subtheme.id)]),
)

/** Moves `id` in front of `beforeId`, or to the end with null. */
export function moveInList(list: string[], id: string, beforeId: string | null): string[] {
  if (!list.includes(id) || id === beforeId) return list
  const rest = list.filter((item) => item !== id)
  const at = beforeId === null ? rest.length : rest.indexOf(beforeId)
  if (at === -1) return list
  const out = [...rest.slice(0, at), id, ...rest.slice(at)]
  return out.every((item, index) => item === list[index]) ? list : out
}

// Position in an order; anything missing from it sorts after the known ones.
function rank(order: readonly string[] | undefined, id: string | undefined): number {
  const index = order && id !== undefined ? order.indexOf(id) : -1
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

/** The draw order: vectors in catalog order, then rasters by theme, subtheme and catalog. */
export function applyGroupOrder(
  layers: LayerConfig[],
  themeOrder: string[],
  subthemeOrder: Record<string, string[]>,
  catalog: readonly LayerConfig[] = CATALOG,
): LayerConfig[] {
  const catalogIndex = new Map(catalog.map((layer, index) => [layer.id, index]))
  const byCatalog = (layer: LayerConfig) => catalogIndex.get(layer.id) ?? catalog.length
  const vectors = layers.filter((layer) => layer.type === 'vector').sort((a, b) => byCatalog(a) - byCatalog(b))
  const rasters = layers.filter((layer) => layer.type === 'raster').sort((a, b) =>
    rank(themeOrder, a.theme) - rank(themeOrder, b.theme) ||
    rank(subthemeOrder[a.theme ?? ''], a.subtheme) - rank(subthemeOrder[b.theme ?? ''], b.subtheme) ||
    byCatalog(a) - byCatalog(b),
  )
  const out = [...vectors, ...rasters]
  return out.every((layer, index) => layer === layers[index]) ? layers : out
}

// A stored list checked against the known ids: unknown ids and duplicates go,
// ids added to groups.ts since are appended in their default order.
function sanitizeList(stored: unknown, defaults: string[]): string[] {
  if (!Array.isArray(stored)) return defaults
  const known = new Set(defaults)
  const kept = [...new Set(stored.filter((id): id is string => typeof id === 'string' && known.has(id)))]
  const out = [...kept, ...defaults.filter((id) => !kept.includes(id))]
  return out.every((id, index) => id === defaults[index]) ? defaults : out
}

export function sanitizeThemeOrder(stored: unknown): string[] {
  return sanitizeList(stored, DEFAULT_THEME_ORDER)
}

export function sanitizeSubthemeOrder(stored: unknown): Record<string, string[]> {
  const record = typeof stored === 'object' && stored !== null && !Array.isArray(stored)
    ? (stored as Record<string, unknown>)
    : {}
  return Object.fromEntries(
    Object.entries(DEFAULT_SUBTHEME_ORDER).map(([theme, defaults]) => [theme, sanitizeList(record[theme], defaults)]),
  )
}

/** The panel's themes: Território first, then the user's order, subthemes included. */
export function orderThemes(
  themes: ThemeInfo[],
  themeOrder: string[],
  subthemeOrder: Record<string, string[]>,
): ThemeInfo[] {
  const fixed = themes.filter((theme) => theme.id === TERRITORY_THEME_ID)
  const thematic = themes
    .filter((theme) => theme.id !== TERRITORY_THEME_ID)
    .sort((a, b) => rank(themeOrder, a.id) - rank(themeOrder, b.id))
    .map((theme) => ({
      ...theme,
      subthemes: [...theme.subthemes].sort((a, b) =>
        rank(subthemeOrder[theme.id], a.id) - rank(subthemeOrder[theme.id], b.id)),
    }))
  return [...fixed, ...thematic]
}
