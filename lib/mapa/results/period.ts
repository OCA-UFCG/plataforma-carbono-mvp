// The period a layer's result refers to, as the header of the result names it.

import type { ResultProfile } from '@/config/mapa/resultProfiles'
import type { RasterLayerConfig } from '@/types/mapa'

/** Year at the end of a band name such as `fire_frequency_1985_2023`. */
export function yearOfBand(band: string | undefined): number | null {
  const m = band?.match(/(\d{4})$/)
  return m ? Number(m[1]) : null
}

/**
 * The selected year of a temporal layer; otherwise the year the static
 * config reads (the date filter, or the year in the band name); otherwise the
 * period the profile declares. A layer with none of these, such as the
 * inventory's past cover, has no period to name.
 */
export function layerPeriod(
  layer: RasterLayerConfig,
  profile: ResultProfile,
  temporalDate?: string,
): string | undefined {
  if (profile.period) return profile.period
  if (layer.gee?.temporal && temporalDate) return temporalDate.slice(0, 4)
  const asset = layer.gee?.asset
  if (asset?.filterDate) return asset.filterDate[0].slice(0, 4)
  const year = yearOfBand(asset?.band)
  return year === null ? undefined : String(year)
}
