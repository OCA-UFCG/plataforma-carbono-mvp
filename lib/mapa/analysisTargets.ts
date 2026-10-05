import type { LayerConfig, RasterLayerConfig, VectorLayerConfig } from '@/types/mapa'

/**
 * What a click on the map is actually able to analyse.
 *
 * Click-to-stats runs through a visible recorte: MapView resolves the pointer
 * to a vector feature and measures every visible raster underneath it. So
 * numbers need BOTH a visible raster and a visible vector sitting ABOVE it.
 * With every recorte off the click lands on nothing at all; with no raster on,
 * it still highlights and names the feature, but there is nothing under it to
 * measure. A recorte below a raster would be the same, but `layerOrder.ts`
 * keeps every vector above the rasters, so that check is only a guard.
 *
 * The rule used to live only inside MapView, where the results panel could not
 * see it -- which is why its hint kept telling people to click a municipality
 * that was not on the map. Both read `clickableRecortes` now: the panel names
 * the recortes it returns, MapView measures only for a recorte it contains, so
 * the instruction and the behavior cannot drift apart.
 */

// Portuguese list with "ou": "Bioma Caatinga ou Municípios".
const recorteList = new Intl.ListFormat('pt-BR', { style: 'long', type: 'disjunction' })

// Every branch of the hint ends the same way: the drawing tools are the way
// out when no recorte fits. The toolbar starts closed, so the hint names the
// pencil button that opens it.
const DRAW_FALLBACK =
  'ou delimite a área com Polígono, Ponto ou Coordenadas, nas ferramentas de desenho do botão do lápis.'

/** A visible raster the results panel measures. */
export function isMeasuredRaster(layer: LayerConfig): layer is RasterLayerConfig {
  return layer.type === 'raster' && layer.visible && layer.analysis !== false
}

/** Index of the topmost visible raster that is measured; -1 when none is on. */
export function topVisibleRasterIndex(layers: LayerConfig[]): number {
  return layers.findIndex(isMeasuredRaster)
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
 */
export function analysisHint(recortes: VectorLayerConfig[]): string {
  if (recortes.length === 0) {
    return (
      'Nenhum recorte territorial ativo, então o clique no mapa não tem o que selecionar. ' +
      'Ligue um em Temas › Território › Limites de referência, ' +
      DRAW_FALLBACK
    )
  }

  const names = recorteList.format(recortes.map((layer) => layer.name))
  return `Clique no mapa sobre ${names} para ver estatísticas desta camada, ${DRAW_FALLBACK}`
}
