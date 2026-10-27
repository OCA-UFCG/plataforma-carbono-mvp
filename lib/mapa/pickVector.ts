import type { VectorLayerConfig } from '@/types/mapa'

/** A visible recorte hit by the pointer, paired with its position in the store. */
export interface VectorPickCandidate<T> {
  layer: VectorLayerConfig
  /** Index in the store's `layers` array; 0 is the topmost layer. */
  storeIndex: number
  hit: T
}

/**
 * Choose which recorte a hover or click belongs to when several visible ones
 * overlap under the pointer.
 *
 * Layer order alone is the wrong answer here: `bioma` sits at the top of the
 * list and its polygon contains every other recorte but the edges of the
 * municipalities that cross it, so "topmost wins" made every click inside the
 * Caatinga resolve to the biome and left Municípios, Estados and the territory
 * layers impossible to hover or click. The finer recorte wins instead, ranked
 * by the `pickPriority` each layer declares in layers.json.
 *
 * Between recortes of the same granularity the smaller feature wins, then layer
 * order. The territories and the conservation units nest both ways (an APA
 * holds whole settlements, a park lies whole inside an indigenous land, an RPPN
 * inside an APA of its own layer), so no order of layers lets every one be
 * picked; comparing the features under the pointer does.
 *
 * `areaOf` has to give the area of the whole feature. A rendered feature is
 * clipped to its tile, and once a small unit fills the tile it measures exactly
 * as much as the one around it, while two that only overlap swap places from
 * one zoom to the next. It is asked only for the candidates of the finest
 * level, and areas decide only when it knows every one of them: until then
 * (the source GeoJSON still loading) layer order does, as between equal areas.
 */
export function pickMostSpecific<T>(
  candidates: VectorPickCandidate<T>[],
  areaOf: (candidate: VectorPickCandidate<T>) => number | undefined = () => undefined,
): VectorPickCandidate<T> | null {
  const priorityOf = (candidate: VectorPickCandidate<T>) => candidate.layer.pickPriority ?? 0
  const top = Math.max(...candidates.map(priorityOf))
  const finest = candidates.filter((candidate) => priorityOf(candidate) === top)
  if (finest.length <= 1) return finest[0] ?? null

  const areas = finest.map(areaOf)
  const byArea = areas.every((area) => area !== undefined)
  let best = 0
  for (let i = 1; i < finest.length; i++) {
    const a = areas[i] ?? 0
    const b = areas[best] ?? 0
    if (byArea && a !== b ? a < b : finest[i].storeIndex < finest[best].storeIndex) best = i
  }
  return finest[best]
}
