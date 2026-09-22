// The one line a collapsed result card shows.
//
// The panel's whole point is that a number is never shown without its layer, so
// every card has to answer while closed -- otherwise comparing three layers
// means opening three cards. Pure, because vitest runs in the node environment
// here and this is the part of the card that can be checked directly.

import { classShares } from '@/lib/mapa/classShares'
import { numero } from '@/lib/mapa/format'
import type { LayerResult, RasterLayerConfig } from '@/types/mapa'

export function resultSummary(
  layer: RasterLayerConfig,
  result: LayerResult | undefined,
): string | null {
  // Loading and error have their own treatment inside the card; a summary would
  // compete with the skeleton and with the retry button.
  if (!result || result.status !== 'ready') return null

  const suffix = (unit?: string) => (unit ? ` ${unit}` : '')

  if (result.pixelValue) {
    const { value, label } = result.pixelValue
    const shown = `${numero(value, 2)}${suffix(layer.unit)}`
    return label ? `${shown} · ${label}` : shown
  }

  const stats = result.stats
  if (!stats) return null

  switch (stats.kind) {
    case 'continuous':
      return `média ${numero(stats.stats.mean, 2)}${suffix(stats.unit ?? layer.unit)}`

    case 'categorical': {
      const [dominant] = classShares(stats.areas, layer.classes ?? [])
      return dominant ? `${dominant.label} · ${numero(dominant.share, 1)}%` : null
    }

    case 'timeseries': {
      // Backwards: a series that ends in nodata still has a last measurement,
      // and reporting the nodata year would date the number wrong.
      for (let i = stats.series.length - 1; i >= 0; i--) {
        const point = stats.series[i]
        if (point.value !== null) {
          return `${point.date.slice(0, 4)}: ${numero(point.value, 2)}${suffix(layer.unit)}`
        }
      }
      return null
    }

    case 'stocks':
      return `total ${numero(stats.report.totalTc, 0)} ${stats.report.unit}`
  }
}
