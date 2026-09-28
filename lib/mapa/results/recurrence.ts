// Fire recurrence read from the accumulated count of years with fire.
//
// The server returns the area at each count value, including zero: MapBiomas
// Fogo masks the pixels that never burned rather than writing 0, and the
// server fills that mask with zero inside the region, so the never-burned area
// is there to divide by.

import type { RecurrenceProfile } from '@/config/mapa/resultProfiles'
import type { ProfiledResult } from '@/types/mapa'

type Recurrence = Extract<ProfiledResult, { kind: 'recurrence' }>

export interface RecurrenceBand {
  label:  string
  areaHa: number
  /** Percent of the region, 0..100. */
  share:  number
}

export interface RecurrenceSummary {
  regionHa:       number
  everHa:         number
  everShare:      number
  yearHa:         number
  recurrentHa:    number
  recurrentShare: number
  bands:          RecurrenceBand[]
}

/** "1 ano", "2 a 3 anos", "11 anos ou mais". */
export function bandLabel(from: number, to: number | null): string {
  if (to === null) return `${from} anos ou mais`
  if (from === to) return from === 1 ? '1 ano' : `${from} anos`
  return `${from} a ${to} anos`
}

export function recurrenceSummary(r: Recurrence, profile: RecurrenceProfile): RecurrenceSummary {
  const pct = (ha: number) => (r.regionHa > 0 ? (ha / r.regionHa) * 100 : 0)
  const sumWhere = (keep: (count: number) => boolean) =>
    r.byCount.filter((c) => keep(c.count)).reduce((s, c) => s + c.areaHa, 0)

  const everHa = sumWhere((n) => n >= 1)
  const recurrentHa = sumWhere((n) => n >= profile.recurrentFrom)
  const yearHa = r.byCount.reduce((s, c) => s + c.burnedInYearHa, 0)

  const bands = profile.bins.map(([from, to]) => {
    const ha = sumWhere((n) => n >= from && (to === null || n <= to))
    return { label: bandLabel(from, to), areaHa: ha, share: pct(ha) }
  })

  return {
    regionHa: r.regionHa,
    everHa,
    everShare: pct(everHa),
    yearHa,
    recurrentHa,
    recurrentShare: pct(recurrentHa),
    bands,
  }
}
