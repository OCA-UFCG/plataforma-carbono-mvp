import type { PixelValueResult, RasterLayerConfig } from '@/types/mapa'
import { useStore } from '@/lib/mapa/store'

/**
 * Turn a raw pixel value from /api/gee/point into a display result: apply the
 * asset's scaleFactor (physical value) and resolve the class label/color.
 *
 * For Jenks-classified layers (GPP/NPP) the raw DN never matches the 1..N
 * class codes, so the class is derived from the biome-wide breaks, matching
 * the server's reclassification (class = 1 + number of breaks the value
 * exceeds). For discrete-coded rasters (e.g. MapBiomas) the integer pixel
 * code is matched directly.
 */
export function resolvePixelValue(raster: RasterLayerConfig, raw: number): PixelValueResult {
  const scaleFactor = raster.gee?.asset?.scaleFactor ?? 1
  const isJenks = raster.gee?.classify?.method === 'jenks'
  const breaks = useStore.getState().jenksBreaks[raster.id]

  if (isJenks && Array.isArray(breaks) && breaks.length > 0) {
    const classIdx = 1 + breaks.filter((b) => raw > b).length
    const cls = raster.classes?.find((c) => c.value === classIdx)
    return { value: raw * scaleFactor, label: cls?.label, color: cls?.color }
  }

  const intVal = Math.trunc(raw)
  const cls = raster.classes?.find((c) => c.value === intVal)
  return { value: raw * scaleFactor, label: cls?.label, color: cls?.color }
}
