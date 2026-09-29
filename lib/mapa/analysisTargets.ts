import type { LayerConfig, VectorLayerConfig } from '@/types/mapa'
import { intlLocale } from '@/lib/mapa/locale'
import { layerName, PT_TEXT, type MapaText } from '@/lib/mapa/text'
import { subthemeLabel, themeLabel, THEMES, TERRITORY_THEME_ID } from '@/config/mapa/groups'

/**
 * What a click on the map is actually able to analyse.
 *
 * Click-to-stats runs through a visible recorte: MapView resolves the pointer
 * to a vector feature and measures every visible raster underneath it. So
 * numbers need BOTH a visible raster and a visible vector sitting ABOVE it.
 * With every recorte off the click lands on nothing at all; with no raster on,
 * or with the recorte dragged below the rasters by `reorderLayer`, it still
 * highlights and names the feature, but there is nothing under it to measure.
 *
 * The rule used to live only inside MapView, where the results panel could not
 * see it -- which is why its hint kept telling people to click a municipality
 * that was not on the map. Both read `clickableRecortes` now: the panel names
 * the recortes it returns, MapView measures only for a recorte it contains, so
 * the instruction and the behavior cannot drift apart.
 */

// Every branch of the hint ends the same way: the drawing tools are the way
// out when no recorte fits. The toolbar starts closed, so the hint names the
// pencil button that opens it (MapaAnalysis hint.fallback).

/** Index of the topmost visible raster; -1 when none is on. */
export function topVisibleRasterIndex(layers: LayerConfig[]): number {
  return layers.findIndex((layer) => layer.type === 'raster' && layer.visible)
}

/**
 * Visible recortes a click can resolve to, in layer order. Empty when no
 * raster is on (nothing to measure) or when every recorte is off or below it.
 */
export function clickableRecortes(layers: LayerConfig[]): VectorLayerConfig[] {
  const rasterIdx = topVisibleRasterIndex(layers)
  if (rasterIdx === -1) return []

  return layers
    .slice(0, rasterIdx)
    .filter((layer): layer is VectorLayerConfig => layer.type === 'vector' && layer.visible)
}

/**
 * What the results panel tells someone who has a raster on but nothing
 * analysed yet. Names the recortes a click can land on, rather than promising
 * a municipality that may well be turned off.
 *
 * The recorte names are looked up by layer id, so the layers may be the store's
 * Portuguese ones or already localized. The English text names the panel path
 * ("Themes › Territory › Reference boundaries") and the drawing tools
 * ("Polygon, Point or Coordinates"), which the UI labels must keep matching.
 */
export function analysisHint(recortes: VectorLayerConfig[], tx: MapaText = PT_TEXT): string {
  const fallback = tx.t('MapaAnalysis.hint.fallback')

  if (recortes.length === 0) {
    const territory = THEMES.find((theme) => theme.id === TERRITORY_THEME_ID)!
    const limits = territory.subthemes.find((sub) => sub.id === TERRITORY_HINT.subtheme)!
    const path = tx.t('MapaAnalysis.hint.path', {
      theme:    themeLabel(territory, tx),
      subtheme: subthemeLabel(territory.id, limits, tx),
    })
    return tx.t('MapaAnalysis.hint.noneActive', { path, fallback })
  }

  // A disjunction list: "Bioma Caatinga ou Municípios" / "Caatinga Biome or Municipalities".
  const list = new Intl.ListFormat(intlLocale(tx.locale), { style: 'long', type: 'disjunction' })
  const names = list.format(recortes.map((layer) => layerName(layer, tx)))
  return tx.t('MapaAnalysis.hint.click', { names, fallback })
}

/** Where the hint tells the user to switch a recorte on. */
const TERRITORY_HINT = { subtheme: 'limites' } as const
