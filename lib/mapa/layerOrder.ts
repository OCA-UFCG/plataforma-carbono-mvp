import appConfig from '@/config/mapa/layers.json'
import { THEMES, TERRITORY_THEME_ID } from '@/config/mapa/groups'
import type { LayerConfig } from '@/types/mapa'

/**
 * Draw order of the map layers. The store's `layers` array IS the draw order
 * (layers[0] is drawn on top), set by one user order of every layer: the
 * recortes are dragged in "Recorte em destaque" (Figma 19423:56814), the
 * thematic layers (rasters and emissions) in "Camadas ativas" (19430:58765).
 * Whatever that order says, the vectors are drawn above the thematic layers:
 * a click resolves to a recorte and measures the rasters under it
 * (`clickableRecortes`). Which recorte a click picks is `pickPriority`'s call,
 * not this order's.
 *
 * By default an `overlay` layer (a Relevo hillshade) draws above the other
 * layers of its subtheme (`overlayFirst`); the reader can drag it below.
 *
 * Until the redesign the user ordered themes and subthemes instead. That order
 * is kept below only to translate a state saved back then
 * (`layerOrderFromGroups`), so whoever returns finds the layers drawn as they
 * left them.
 *
 * Every function returns the same array when nothing changes, so the store does
 * not notify, re-render or re-persist for a no-op.
 */

// layers.json order: the recortes' default order, and every tie-break.
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

/**
 * The draw order: the vectors, then the thematic layers, each in `layerOrder`
 * and by catalog among those it does not list.
 */
export function applyLayerOrder(
  layers: LayerConfig[],
  layerOrder: string[],
  catalog: readonly LayerConfig[] = CATALOG,
): LayerConfig[] {
  const catalogIndex = new Map(catalog.map((layer, index) => [layer.id, index]))
  const byCatalog = (layer: LayerConfig) => catalogIndex.get(layer.id) ?? catalog.length
  const byOrder = (a: LayerConfig, b: LayerConfig) =>
    rank(layerOrder, a.id) - rank(layerOrder, b.id) || byCatalog(a) - byCatalog(b)
  const vectors = layers.filter((layer) => layer.type === 'vector').sort(byOrder)
  const thematic = layers.filter((layer) => layer.type !== 'vector').sort(byOrder)
  const out = [...vectors, ...thematic]
  return out.every((layer, index) => layer === layers[index]) ? layers : out
}

// Overlays sort ahead of the other layers of their subtheme, so they draw above them.
const overlayFirst = (layer: LayerConfig) => (layer.type === 'raster' && layer.overlay ? 0 : 1)

/**
 * The draw order the theme and subtheme order gave: vectors in catalog
 * order, then thematic layers by theme, subtheme, overlays first and
 * catalog. Kept for migrating a saved state (`layerOrderFromGroups`) and for
 * the default order.
 */
export function applyGroupOrder(
  layers: LayerConfig[],
  themeOrder: string[],
  subthemeOrder: Record<string, string[]>,
  catalog: readonly LayerConfig[] = CATALOG,
): LayerConfig[] {
  const catalogIndex = new Map(catalog.map((layer, index) => [layer.id, index]))
  const byCatalog = (layer: LayerConfig) => catalogIndex.get(layer.id) ?? catalog.length
  const vectors = layers.filter((layer) => layer.type === 'vector').sort((a, b) => byCatalog(a) - byCatalog(b))
  const rasters = layers.filter((layer) => layer.type !== 'vector').sort((a, b) =>
    rank(themeOrder, a.theme) - rank(themeOrder, b.theme) ||
    rank(subthemeOrder[a.theme ?? ''], a.subtheme) - rank(subthemeOrder[b.theme ?? ''], b.subtheme) ||
    overlayFirst(a) - overlayFirst(b) ||
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

/**
 * Every layer, top first, in the order a stored theme and subtheme order drew
 * them: the recortes in catalog order, then the thematic layers. Anything
 * missing or invalid falls back to the defaults, so with nothing stored this
 * is the default layer order.
 */
export function layerOrderFromGroups(
  themeOrder: unknown,
  subthemeOrder: unknown,
  catalog: readonly LayerConfig[] = CATALOG,
): string[] {
  return applyGroupOrder([...catalog], sanitizeThemeOrder(themeOrder), sanitizeSubthemeOrder(subthemeOrder), catalog)
    .map((layer) => layer.id)
}

/** Every layer of layers.json, top first, as the catalog and the themes ordered them by default. */
export const DEFAULT_LAYER_ORDER: string[] = layerOrderFromGroups(DEFAULT_THEME_ORDER, DEFAULT_SUBTHEME_ORDER)

/** A stored layer order checked against layers.json; layers added since go last. */
export function sanitizeLayerOrder(stored: unknown): string[] {
  return sanitizeList(stored, DEFAULT_LAYER_ORDER)
}
