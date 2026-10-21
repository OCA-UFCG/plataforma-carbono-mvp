// The one Earth Engine reduction behind /api/gee/choropleth: the mean of every
// year of a layer over every feature of a recorte, in a single evaluate. Each
// year comes from buildEeImage, so the values are in the units the map shows.

import 'server-only'

import { buildEeImage, yearWindow, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import { bandOf, roundValue, STATIC_KEY } from '@/lib/mapa/choropleth'

/**
 * The finest scale the means are read at. Plenty to color a municipality.
 * Measured over the 1,095 municipalities: 18 to 26 s for a static layer and
 * for 40-year series alike, with no gain at 2 km -- the cost is per feature
 * inside Earth Engine, not per pixel.
 */
export const CHOROPLETH_MIN_SCALE_M = 1000

export interface ChoroplethFeature {
  /** Position in the recorte GeoJSON: the id MapLibre's generateId gives the feature. */
  index:    number
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }
}

export async function reduceChoropleth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ee: any,
  asset: GeeAssetConfig,
  keys: string[],
  features: ChoroplethFeature[],
): Promise<(number | null)[][]> {
  const bands = keys.map(bandOf)
  const image = ee.Image.cat(keys.map((key) => yearBand(ee, asset, key)))
  const collection = ee.FeatureCollection(
    features.map((f) => ee.Feature(ee.Geometry(f.geometry), { i: f.index })))
  // A single-band image names its output after the reducer ("mean"); a stack
  // names one per band.
  const reducer = bands.length === 1 ? ee.Reducer.mean().setOutputs(bands) : ee.Reducer.mean()

  const reduced = image.reduceRegions({
    collection,
    reducer,
    scale:     Math.max(asset.scale ?? 500, CHOROPLETH_MIN_SCALE_M),
    tileScale: 4,
  })
  // Properties only: the geometries already live in the browser. Read with
  // `select`, not a list reducer, which would skip a feature with any null year.
  return parseChoropleth(await evaluate(reduced.select(['i', ...bands], null, false)), keys, features)
}

/** values[k][featureIndex], rounded; null for a feature or year with no value. */
export function parseChoropleth(
  out: unknown,
  keys: string[],
  features: ChoroplethFeature[],
): (number | null)[][] {
  const size = features.reduce((n, f) => Math.max(n, f.index + 1), 0)
  const values = keys.map(() => new Array<number | null>(size).fill(null))
  const rows = (out as { features?: { properties?: Record<string, unknown> }[] } | null)?.features ?? []
  for (const row of rows) {
    const props = row.properties ?? {}
    const i = props.i
    if (typeof i !== 'number' || i < 0 || i >= size) continue
    keys.forEach((key, k) => {
      const v = props[bandOf(key)]
      values[k][i] = typeof v === 'number' && Number.isFinite(v) ? roundValue(v) : null
    })
  }
  return values
}

/**
 * One year's band. A collection's year with no images (a year declared before
 * Earth Engine publishes it) composites to an image with no bands, on which
 * buildEeImage's unit conversion already fails -- and one failing band fails
 * the whole reduction. Such a year is chosen by its image count and becomes a
 * fully masked band, answered with nulls. `ee.Algorithms.If` is lazy: the
 * failing branch is never computed.
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
