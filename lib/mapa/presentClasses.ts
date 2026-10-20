// The classes of a categorical layer that occur inside the selected feature,
// for the legend. Read from the composition the results panel already
// computes, so it costs no request. On a large state that composition is
// measured coarser, and a class covering very little area can be missing.

import type { LayerResult, RasterClass } from '@/types/mapa'

export function presentClasses(
  classes: RasterClass[],
  result: LayerResult | undefined,
  date: string | undefined,
): RasterClass[] {
  if (!result || result.status !== 'ready' || result.date !== date) return classes
  const stats = result.stats
  if (!stats || stats.kind !== 'categorical') return classes

  const present = classes.filter((c) => (stats.areas[String(c.value)] ?? 0) > 0)
  // A legend with no class at all would read as broken; the full list is honest.
  return present.length > 0 ? present : classes
}
