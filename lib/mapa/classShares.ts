// Turns the area-per-class map the zonal statistics return into a sorted list
// of shares, with the labels and colors of the layer configuration.
//
// The trailing remainder is the point of the module: codes present in the data
// but absent from `layers.json` exist (a collection gains a class before the
// config catches up), and without collecting them the percentages stop adding
// up to 100 with no sign that anything is missing.

import type { RasterClass } from '@/types/mapa'

export interface ClassShare {
  value:  number
  label:  string
  color:  string
  areaHa: number
  /** Percent of the total area, 0..100. */
  share:  number
}

/** Sentinel value of the remainder bucket: no real class code is negative. */
const UNCLASSIFIED_VALUE = -1

export function classShares(
  areas: Record<string, number>,
  classes: RasterClass[],
): ClassShare[] {
  const totalM2 = Object.values(areas).reduce((a, b) => a + b, 0)
  if (totalM2 <= 0) return []

  const out: ClassShare[] = []
  for (const cls of classes) {
    const m2 = areas[String(cls.value)] ?? 0
    if (m2 <= 0) continue
    out.push({
      value:  cls.value,
      label:  cls.label,
      color:  cls.color,
      areaHa: m2 / 10_000,
      share:  (m2 / totalM2) * 100,
    })
  }

  const knownM2 = classes.reduce((a, cls) => a + (areas[String(cls.value)] ?? 0), 0)
  const restoM2 = totalM2 - knownM2
  if (restoM2 > 0) {
    // "Não classificadas": the same label the CSV export uses, so the file and
    // the document name the leftover the same way.
    out.push({
      value:  UNCLASSIFIED_VALUE,
      label:  'Não classificadas',
      color:  '#9e9e9e',
      areaHa: restoM2 / 10_000,
      share:  (restoM2 / totalM2) * 100,
    })
  }

  // Descending share, with the class value breaking ties so two classes of
  // equal area always come out in the same order. The unclassified remainder
  // is not a real class code, so on a tie it sorts after every real class
  // instead of by its sentinel value, which would otherwise put it first.
  return out.sort((a, b) => {
    if (a.share !== b.share) return b.share - a.share
    if (a.value === UNCLASSIFIED_VALUE) return 1
    if (b.value === UNCLASSIFIED_VALUE) return -1
    return a.value - b.value
  })
}
