// Area-per-class results, read two ways: nominal classes grouped into macro
// classes (land use and cover), and ordinal levels read as a condition scale
// (land degradation).
//
// Every share is of the area with data, the sum of the class areas, and not of
// the polygon: a drawn polygon crossing the biome edge or the sea has part of
// its area with no class at all, and dividing by the polygon would slip that
// part into the classes.

import { classShares, type ClassShare } from '@/lib/mapa/classShares'
import type { CompositionProfile } from '@/config/mapa/resultProfiles'
import type { RasterClass } from '@/types/mapa'
import { PT_TEXT, type MapaText } from '@/lib/mapa/text'

export interface GroupShare {
  label:  string
  color:  string
  areaHa: number
  /** Percent of the area with data, 0..100. */
  share:  number
}

export interface NominalSummary {
  validHa:     number
  nativeHa:    number
  nativeShare: number
  /** Macro groups in profile order, plus a remainder for codes no group lists. */
  groups:      GroupShare[]
  /** Every class, by decreasing area. */
  classes:     ClassShare[]
  /** Largest real class, never the unclassified remainder. */
  dominant:    ClassShare | null
}

export interface OrdinalSummary {
  validHa:          number
  degradedShare:    number
  severeShare:      number
  /** Every level in profile order, zero-area levels included. */
  levels:           ClassShare[]
  /** Most frequent level among the degraded ones; a tie goes to the more severe. */
  dominantDegraded: ClassShare | null
}

function areaHaOf(areas: Record<string, number>, codes: number[]): number {
  return codes.reduce((s, c) => s + (areas[String(c)] ?? 0), 0) / 10_000
}

function validHaOf(areas: Record<string, number>): number {
  return Object.values(areas).reduce((a, b) => a + b, 0) / 10_000
}

export function nominalSummary(
  areas: Record<string, number>,
  classes: RasterClass[],
  nominal: NonNullable<CompositionProfile['nominal']>,
  tx: MapaText = PT_TEXT,
): NominalSummary {
  const validHa = validHaOf(areas)
  const pct = (ha: number) => (validHa > 0 ? (ha / validHa) * 100 : 0)

  const groups: GroupShare[] = nominal.groups.map((g) => {
    const ha = areaHaOf(areas, g.codes)
    return { label: g.label, color: g.color, areaHa: ha, share: pct(ha) }
  })
  const groupedHa = groups.reduce((s, g) => s + g.areaHa, 0)
  const restHa = validHa - groupedHa
  // A code the data carries but no group lists: without this bucket the
  // groups stop adding up to 100% with no sign that anything is missing.
  if (restHa > 1e-9) {
    groups.push({ label: tx.t('MapaResults.unclassified.group'), color: '#9e9e9e', areaHa: restHa, share: pct(restHa) })
  }

  const nativeHa = areaHaOf(areas, nominal.native)
  const shares = classShares(areas, classes, tx)

  return {
    validHa,
    nativeHa,
    nativeShare: pct(nativeHa),
    groups,
    classes: shares,
    dominant: shares.find((c) => c.value >= 0) ?? null,
  }
}

export function ordinalSummary(
  areas: Record<string, number>,
  classes: RasterClass[],
  ordinal: NonNullable<CompositionProfile['ordinal']>,
): OrdinalSummary {
  const validHa = validHaOf(areas)
  const pct = (ha: number) => (validHa > 0 ? (ha / validHa) * 100 : 0)
  const byCode = new Map(classes.map((c) => [c.value, c]))

  const levels: ClassShare[] = ordinal.order.map((code) => {
    const cls = byCode.get(code)
    const ha = areaHaOf(areas, [code])
    return {
      value:  code,
      label:  cls?.label ?? String(code),
      color:  cls?.color ?? '#9e9e9e',
      areaHa: ha,
      share:  pct(ha),
    }
  })

  // `order` runs from the best condition to the worst, so among equal areas
  // the later level is the more severe one and wins.
  let dominantDegraded: ClassShare | null = null
  for (const level of levels) {
    if (!ordinal.degraded.includes(level.value) || level.areaHa <= 0) continue
    if (!dominantDegraded || level.areaHa >= dominantDegraded.areaHa) dominantDegraded = level
  }

  return {
    validHa,
    degradedShare: pct(areaHaOf(areas, ordinal.degraded)),
    severeShare:   pct(areaHaOf(areas, ordinal.severe)),
    levels,
    dominantDegraded,
  }
}
