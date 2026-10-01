// The one line a collapsed result card shows for a layer with a result
// profile: the headline number of its result and what it counts, so three
// closed cards can be compared at a glance. The open card shows the same number
// as its headline, never both at once.

import type { ResultProfile } from '@/config/mapa/resultProfiles'
import { describeFlux } from '@/lib/mapa/carbonFlux'
import type { PanelResult, RasterLayerConfig } from '@/types/mapa'
import { nominalSummary, ordinalSummary } from './composition'
import { adaptive, percentShort, quantity, stockTc } from './format'
import { recurrenceSummary } from './recurrence'
import { PT_TEXT, type MapaText } from '@/lib/mapa/text'

/** The band of the stock asset that holds the total of the five pools. */
export const STOCK_TOTAL_BAND = 'b1'

const unitOf = (u: string | undefined) => (u ? ` ${u}` : '')

/**
 * Null when the result does not match the profile, so the caller falls back.
 * The layer and the profile are expected already localized (`localizeLayer`,
 * `getResultProfile(id, tx)`): only the words of the headline itself are read
 * from `tx` here.
 */
export function profiledSummary(
  layer: RasterLayerConfig,
  profile: ResultProfile,
  stats: PanelResult,
  tx: MapaText = PT_TEXT,
): string | null {
  switch (profile.archetype) {
    case 'stocks': {
      if (stats.kind !== 'stocks') return null
      const band = layer.gee?.asset.band ?? STOCK_TOTAL_BAND
      const pool = band === STOCK_TOTAL_BAND ? null : stats.report.pools.find((p) => p.band === band)
      // As the open card and the report write it: "12 Mt C", not "12,0 Mt C".
      const q = stockTc(pool ? pool.tc : stats.report.totalTc, tx.locale)
      return `${q.value} ${q.unit}`
    }
    case 'amount': {
      if (stats.kind !== 'amount') return null
      const q = quantity(stats.total, profile.totalUnit, tx)
      return `${q.value} ${q.unit}`
    }
    case 'distribution':
      if (stats.kind !== 'distribution' || !Number.isFinite(stats.p50)) return null
      return tx.t('MapaResults.headline.median', { value: adaptive(stats.p50, tx), unit: unitOf(layer.unit) })
    case 'flux': {
      if (stats.kind !== 'flux') return null
      const net = stats.positive + stats.negative
      const q = quantity(Math.abs(profile.signed ? net : stats.positive), profile.totalUnit, tx)
      if (!profile.signed) return `${q.value} ${q.unit}`
      const direction = describeFlux(net, tx).direction
      const key = direction === 'removal' ? 'fluxRemoval' : direction === 'emission' ? 'fluxEmission' : 'fluxNeutral'
      return tx.t(`MapaResults.headline.${key}`, { value: q.value, unit: q.unit })
    }
    case 'annual':
      if (stats.kind !== 'annual' || !Number.isFinite(stats.mean)) return null
      return `${adaptive(stats.mean, tx)}${unitOf(profile.unit)}`
    case 'composition': {
      if (stats.kind !== 'categorical') return null
      const classes = layer.classes ?? []
      if (profile.ordinal) {
        const s = ordinalSummary(stats.areas, classes, profile.ordinal)
        return s.validHa > 0 ? tx.t('MapaResults.headline.degraded', { share: percentShort(s.degradedShare, tx) }) : null
      }
      if (profile.nominal) {
        const s = nominalSummary(stats.areas, classes, profile.nominal, tx)
        return s.validHa > 0 ? tx.t('MapaResults.headline.native', { share: percentShort(s.nativeShare, tx) }) : null
      }
      return null
    }
    case 'recurrence': {
      if (stats.kind !== 'recurrence' || stats.regionHa <= 0) return null
      const s = recurrenceSummary(stats, profile, tx)
      return s.everHa > 0
        ? tx.t('MapaResults.headline.burned', { share: percentShort(s.everShare, tx), year: profile.firstYear })
        : tx.t('MapaResults.headline.noFire')
    }
  }
}
