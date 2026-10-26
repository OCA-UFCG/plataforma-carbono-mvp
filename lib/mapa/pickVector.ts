import type { VectorLayerConfig } from '@/types/mapa'

/** A visible recorte hit by the pointer, paired with its position in the store. */
export interface VectorPickCandidate<T> {
  layer: VectorLayerConfig
  /** Index in the store's `layers` array; 0 is the topmost layer. */
  storeIndex: number
  /** Area of the hit feature, in any unit shared by all candidates. */
  area?: number
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
 * picked; comparing the features under the pointer does. Containment survives
 * the tile clipping of rendered features: inside one tile the clipped outline
 * of A still contains the clipped outline of B.
 */
export function pickMostSpecific<T>(
  candidates: VectorPickCandidate<T>[],
): VectorPickCandidate<T> | null {
  let best: VectorPickCandidate<T> | null = null
  let bestPriority = -Infinity

  for (const candidate of candidates) {
    const priority = candidate.layer.pickPriority ?? 0
    if (
      !best ||
      priority > bestPriority ||
      (priority === bestPriority && isFinerThan(candidate, best))
    ) {
      best = candidate
      bestPriority = priority
    }
  }

  return best
}

function isFinerThan<T>(a: VectorPickCandidate<T>, b: VectorPickCandidate<T>): boolean {
  if (a.area !== undefined && b.area !== undefined && a.area !== b.area) return a.area < b.area
  return a.storeIndex < b.storeIndex
}
