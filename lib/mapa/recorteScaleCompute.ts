// The one Earth Engine reduction behind a recorte scale (/api/gee/scale): the
// minimum, maximum and 2nd and 98th percentiles of every year of a layer inside
// one feature, in a single evaluate. Each year is built by buildEeImage, so the
// numbers are in the units the tiles are drawn in.

import 'server-only'

import { buildEeImage, yearWindow, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import { analysisScale } from '@/lib/mapa/layerResult'
import { bandOf, parseYearStats, STATIC_KEY, type YearStats } from '@/lib/mapa/recorteScale'

/**
 * Pixels the whole reduction may read, shared by its bands. A band per year
 * costs as much as a reduction of its own, so the results panel's per-band
 * PIXEL_BUDGET would let `solo_carbono` (39 years at 30 m) run past
 * GEE_TIMEOUT_MS over a large state. Tuned against Bahia in the rendered check.
 */
export const SCALE_PIXEL_BUDGET = 5e7

export async function reduceRecorteStats(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ee: any,
  asset: GeeAssetConfig,
  keys: string[],
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown },
  regionM2: number,
): Promise<Record<string, YearStats>> {
  const bands = keys.map((key) => yearBand(ee, asset, key))

  const reduction = ee.Image.cat(bands).reduceRegion({
    reducer:    ee.Reducer.minMax().combine({ reducer2: ee.Reducer.percentile([2, 98]), sharedInputs: true }),
    geometry:   ee.Geometry(geometry),
    scale:      analysisScale(asset.scale ?? 500, regionM2, SCALE_PIXEL_BUDGET / keys.length),
    maxPixels:  1e9,
    tileScale:  4,
    bestEffort: true,
  })

  return parseYearStats(await evaluate<Record<string, unknown> | null>(reduction), keys)
}

/**
 * One year's band of the stack. A collection's year with no images (a year
 * declared before Earth Engine publishes it) composites to an image with no
 * bands, on which buildEeImage's unit conversion already fails -- and one
 * failing band fails the whole reduction. So such a year is chosen by its
 * image count and becomes a fully masked band, which the reduction answers
 * with nulls. `ee.Algorithms.If` is lazy: the failing branch is never computed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function yearBand(ee: any, asset: GeeAssetConfig, key: string): any {
  const band = bandOf(key)
  if (key === STATIC_KEY) return buildEeImage(ee, asset).rename(band)

  const image = buildEeImage(ee, asset, `${key}-01-01`).rename(band)
  // A band-per-year image has a band for every declared year.
  if (asset.type !== 'imageCollection' || asset.bandPattern) return image

  const [from, to] = yearWindow(Number(key))
  const hasImages = ee.ImageCollection(asset.id).filterDate(from, to).size().gt(0)
  return ee.Image(ee.Algorithms.If(hasImages, image, ee.Image.constant(0).updateMask(0).rename(band)))
}
