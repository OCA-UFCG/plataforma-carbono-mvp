import type { RasterLayerConfig } from '@/types/mapa'

/**
 * Sample a GEE raster at a single [lon, lat] via POST /api/gee/point.
 * Returns the raw pixel value, or null when the point is outside the raster
 * / over nodata.
 */
export async function getRasterPointValue(
  layer: RasterLayerConfig,
  lon: number,
  lat: number,
  temporalDate?: string,
): Promise<number | null> {
  if (!layer.gee?.asset) {
    throw new Error(`GEE layer "${layer.id}" is missing gee.asset`)
  }

  const res = await fetch('/api/gee/point', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset: layer.gee.asset,
      lon,
      lat,
      temporalDate,
    }),
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(payload?.error ?? `GEE point API error ${res.status}`)
  }

  const { value } = await res.json() as { value: number | null }
  return value
}
