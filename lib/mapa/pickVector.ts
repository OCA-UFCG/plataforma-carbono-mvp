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
 * list and its polygon contains every other recorte, so "topmost wins" made
 * every click inside the Caatinga resolve to the biome and left Municípios,
 * Estados and the territory layers impossible to hover or click. The finer
 * recorte wins instead, ranked by the `pickPriority` each layer declares in
 * layers.json; layer order only breaks ties between recortes of the same
 * granularity.
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
      (priority === bestPriority && candidate.storeIndex < best.storeIndex)
    ) {
      best = candidate
      bestPriority = priority
    }
  }

  return best
}
