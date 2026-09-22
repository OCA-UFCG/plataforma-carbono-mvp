import type { LayerConfig, VectorLayerConfig } from '@/types/mapa'

/**
 * What a click on the map is actually able to analyse.
 *
 * Click-to-stats runs through a visible recorte: MapView resolves the pointer
 * to a vector feature and measures every visible raster over it. So numbers
 * need BOTH a visible raster and a visible vector sitting above it. With every
 * recorte off the click lands on nothing at all; with no raster on it still
 * highlights and names the feature, but there is nothing to measure.
 *
 * The rule used to live only inside MapView, where the results panel could not
 * see it -- which is why its hint kept telling people to click a municipality
 * that was not on the map. Both read it from here now, so the instruction and
 * the behavior cannot drift apart.
 */

// Portuguese list with "ou": "Bioma Caatinga ou Municípios".
const recorteList = new Intl.ListFormat('pt-BR', { style: 'long', type: 'disjunction' })

// Every branch of the hint ends the same way: the drawing tools are the way
// out when no recorte fits. They live in DrawToolbar, anchored to the Temas
// panel on the left -- the copy this replaced sent people to the right edge.
const DRAW_FALLBACK =
  'ou delimite a área com Polígono, Ponto ou Coordenadas, na barra de ferramentas à esquerda.'

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
