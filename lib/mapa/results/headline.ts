// The one line a collapsed result card shows for a layer with a result
// profile: the headline number of its result and what it counts, so three
// closed cards can be compared at a glance. The open card shows the same number
// as its headline, never both at once.

import type { ResultProfile } from '@/config/mapa/resultProfiles'
import { describeFlux } from '@/lib/mapa/carbonFlux'
import type { PanelResult, RasterLayerConfig } from '@/types/mapa'
import { nominalSummary, ordinalSummary } from './composition'
import { adaptive, percentShort, quantity } from './format'
import { recurrenceSummary } from './recurrence'

/** The band of the stock asset that holds the total of the five pools. */
export const STOCK_TOTAL_BAND = 'b1'

const unitOf = (u: string | undefined) => (u ? ` ${u}` : '')

/** Null when the result does not match the profile, so the caller falls back. */
export function profiledSummary(layer: RasterLayerConfig, profile: ResultProfile, stats: PanelResult): string | null {
  switch (profile.archetype) {
    case 'stocks': {
      if (stats.kind !== 'stocks') return null
      const band = layer.gee?.asset.band ?? STOCK_TOTAL_BAND
      const pool = band === STOCK_TOTAL_BAND ? null : stats.report.pools.find((p) => p.band === band)
      const q = quantity(pool ? pool.tc : stats.report.totalTc, 't C')
      return `${q.value} ${q.unit}`
    }
    case 'amount': {
      if (stats.kind !== 'amount') return null
      const q = quantity(stats.total, profile.totalUnit)
      return `${q.value} ${q.unit}`
    }
    case 'distribution':
      if (stats.kind !== 'distribution' || !Number.isFinite(stats.p50)) return null
      return `mediana ${adaptive(stats.p50)}${unitOf(layer.unit)}`
    case 'flux': {
      if (stats.kind !== 'flux') return null
      const net = stats.positive + stats.negative
      const q = quantity(Math.abs(profile.signed ? net : stats.positive), profile.totalUnit)
      if (!profile.signed) return `${q.value} ${q.unit}`
      const direction = describeFlux(net).direction
      const word = direction === 'removal' ? 'de sequestro' : direction === 'emission' ? 'de emissão' : 'em equilíbrio'
      return `${q.value} ${q.unit} ${word}`
    }
    case 'annual':
      if (stats.kind !== 'annual' || !Number.isFinite(stats.mean)) return null
      return `${adaptive(stats.mean)}${unitOf(profile.unit)}`
    case 'composition': {
      if (stats.kind !== 'categorical') return null
      const classes = layer.classes ?? []
      if (profile.ordinal) {
        const s = ordinalSummary(stats.areas, classes, profile.ordinal)
        return s.validHa > 0 ? `${percentShort(s.degradedShare)} com degradação` : null
      }
      if (profile.nominal) {
        const s = nominalSummary(stats.areas, classes, profile.nominal)
        return s.validHa > 0 ? `${percentShort(s.nativeShare)} de vegetação nativa` : null
      }
      return null
    }
    case 'recurrence': {
      if (stats.kind !== 'recurrence' || stats.regionHa <= 0) return null
      const s = recurrenceSummary(stats, profile)
      return s.everHa > 0 ? `${percentShort(s.everShare)} queimou desde ${profile.firstYear}` : 'sem queimada mapeada'
    }
  }
}
