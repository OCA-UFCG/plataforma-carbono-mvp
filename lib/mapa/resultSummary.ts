// The one line a collapsed result card shows.
//
// The panel's whole point is that a number is never shown without its layer, so
// every card has to answer while closed -- otherwise comparing three layers
// means opening three cards. Pure, because vitest runs in the node environment
// here and this is the part of the card that can be checked directly.

import { classShares } from '@/lib/mapa/classShares'
import { getResultProfile } from '@/config/mapa/resultProfiles'
import { profiledSummary } from '@/lib/mapa/results/headline'
import { numero } from '@/lib/mapa/format'
import type { LayerResult, RasterLayerConfig } from '@/types/mapa'
import { PT_TEXT, localizeClassLabel, unitLabel, type MapaText } from '@/lib/mapa/text'

/**
 * `layer` is expected already localized (`localizeLayer`): unit and class
 * labels are read from it as they are.
 */
export function resultSummary(
  layer: RasterLayerConfig,
  result: LayerResult | undefined,
  tx: MapaText = PT_TEXT,
): string | null {
  // Loading and error have their own treatment inside the card; a summary would
  // compete with the skeleton and with the retry button.
  if (!result || result.status !== 'ready') return null

  const suffix = (unit?: string) => (unit ? ` ${unit}` : '')

  if (result.pixelValue) {
    const { value, label } = result.pixelValue
    // A class code means nothing to the reader: the class name stands alone.
    return localizeClassLabel(layer.id, label, tx) ?? `${numero(value, 2, tx.locale)}${suffix(layer.unit)}`
  }

  const stats = result.stats
  if (!stats) return null

  // A layer with a result profile answers with its own headline number.
  const profile = getResultProfile(layer.id, tx)
  const profiled = profile ? profiledSummary(layer, profile, stats, tx) : null
  if (profiled) return profiled

  switch (stats.kind) {
    case 'continuous':
      return tx.t('MapaResults.headline.mean', {
        value: numero(stats.stats.mean, 2, tx.locale),
        unit: suffix(stats.unit !== undefined ? unitLabel(stats.unit, tx) : layer.unit),
      })

    case 'categorical': {
      const [dominant] = classShares(stats.areas, layer.classes ?? [], tx)
      return dominant ? `${dominant.label} · ${numero(dominant.share, 1, tx.locale)}%` : null
    }

    case 'timeseries': {
      // Backwards: a series that ends in nodata still has a last measurement,
      // and reporting the nodata year would date the number wrong.
      for (let i = stats.series.length - 1; i >= 0; i--) {
        const point = stats.series[i]
        if (point.value !== null) {
          return `${point.date.slice(0, 4)}: ${numero(point.value, 2, tx.locale)}${suffix(layer.unit)}`
        }
      }
      return null
    }

    case 'stocks':
      return tx.t('MapaResults.headline.total', {
        value: numero(stats.report.totalTc, 0, tx.locale),
        unit: stats.report.unit,
      })

    default:
      return null
  }
}
