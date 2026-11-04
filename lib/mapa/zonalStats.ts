// Zonal statistics of a raster over a (multi)polygon.
//
// Extracted from app/api/gee/stats/route.ts so the report service can run the
// same computation without an HTTP round trip. The route keeps validation,
// the asset allowlist and authentication; this module is the Earth Engine work.
//
// Errors come back as a value, not as a throw, because the route has to answer
// with the same status codes it always did (400 on a stock mismatch, 422 on too
// few valid pixels, 500 on an unresolvable band name).

import { bandaDoAno, buildEeImage, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import { jenksBreaks } from '@/lib/mapa/jenks'
import { getStocks } from '@/lib/mapa/stocksRegistry'
import { buildStockReport } from '@/lib/mapa/stockReport'
import type { RasterStatsResult } from '@/types/mapa'

export interface ZonalStatsInput {
  asset:         GeeAssetConfig
  geometry:      { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }
  temporalDate?: string
  classify?:     { numClasses: number; method: 'jenks' }
  /** Raw from the client: sanitized here, so every caller gets the same check. */
  breaks?:       unknown
  colorType?:    'categorical' | 'continuous'
  /** When the layer declares `gee.stocks`, the result is the stock report. */
  layerId?:      string
}

// This module never produces the 'timeseries' kind (that one is
// /api/gee/timeseries's job) — excluding it here lets the route narrow
// `result.kind` down to a plain `if`/`if`/fallthrough without an unreachable
// branch, instead of TypeScript treating 'timeseries' as still possible.
export type ZonalStatsOutcome =
  | { ok: true; result: Exclude<RasterStatsResult, { kind: 'timeseries' }>; breaks?: number[] }
  | { ok: false; error: string; status: number }

/**
 * Only trust client-supplied breaks when they are a non-empty array of finite
 * numbers. Kept exactly as the route had it: the ascending order the old
 * comment mentions was never actually checked, and adding the check here would
 * change behavior inside an extraction.
 */
function sanitizeBreaks(breaks: unknown): number[] | undefined {
  return Array.isArray(breaks) &&
    breaks.length > 0 &&
    breaks.every((n) => typeof n === 'number' && Number.isFinite(n))
    ? (breaks as number[])
    : undefined
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeZonalStats(ee: any, input: ZonalStatsInput): Promise<ZonalStatsOutcome> {
  const { asset, geometry, temporalDate, classify, colorType, layerId } = input
  const providedBreaks = sanitizeBreaks(input.breaks)

  const image  = buildEeImage(ee, asset, temporalDate)
  const region = ee.Geometry(geometry)
  const scale  = asset.scale ?? 500

  // Stock report: the layer declares which bands are pools and which asset
  // brings the phytophysiognomy, and the result is the total broken down along
  // both axes. It comes before the other branches because it replaces the
  // statistics of the visible band, it does not complement them.
  const stocks = layerId ? getStocks(layerId) : null
  if (stocks) {
    if (stocks.assetId !== asset.id || stocks.assetBand !== asset.band) {
      return { ok: false, error: 'layerId does not match the asset', status: 400 }
    }
    const report = await buildStockReport(
      ee, ee.Image(stocks.assetId), region, stocks.cfg, stocks.legenda, stocks.scale,
    )
    return { ok: true, result: { kind: 'stocks', report } }
  }

  // Resolve band name
  let bandName = temporalDate && asset.bandPattern
    ? bandaDoAno(asset.bandPattern, temporalDate.slice(0, 4))
    : asset.band
  if (!bandName) {
    const bands = await evaluate<string[]>(image.bandNames())
    bandName = bands?.[0]
  }
  if (!bandName) {
    return { ok: false, error: 'Could not determine band name', status: 500 }
  }

  // Categorical branch: Jenks classify -> area per class
  if (classify?.method === 'jenks' && classify.numClasses >= 2) {
    const numClasses = classify.numClasses

    // Prefer the biome-wide breaks from /api/gee/tile so the chart classes
    // match the map colors and legend exactly. Only fall back to sampling this
    // feature when the caller did not supply them.
    let breaks: number[]
    if (providedBreaks) {
      breaks = providedBreaks
    } else {
      const sample = image.sample({
        region, scale, numPixels: 5000, seed: 42, geometries: false,
      })
      const values = await evaluate<number[]>(sample.aggregate_array(bandName))

      if (!values || values.length < numClasses) {
        return {
          ok: false,
          error: `Not enough valid pixels (got ${values?.length ?? 0})`,
          status: 422,
        }
      }
      breaks = jenksBreaks(values, numClasses)
    }

    let classified = ee.Image.constant(1).toInt()
    for (let i = 0; i < breaks.length; i++) {
      classified = classified.where(image.gt(breaks[i]), i + 2)
    }
    classified = classified.updateMask(image.mask())

    // Area (m²) per class via pixelArea summed and grouped by class. Robust to
    // bestEffort rescaling (area is conserved), where a pixel count would be
    // wrong whenever GEE coarsens the scale for a large region.
    const areaImg = ee.Image.pixelArea().addBands(classified)
    const grouped = areaImg.reduceRegion({
      reducer:    ee.Reducer.sum().group({ groupField: 1, groupName: 'class' }),
      geometry:   region,
      scale,
      maxPixels:  1e9,
      bestEffort: true,
    })

    const raw = await evaluate<{ groups?: { class: number; sum: number }[] }>(grouped)
    const areas: Record<string, number> = {}
    for (const g of raw.groups ?? []) {
      areas[String(Math.trunc(Number(g.class)))] = g.sum
    }

    return { ok: true, result: { kind: 'categorical', areas }, breaks }
  }

  // Raw categorical branch: area per class code on the original image. Used
  // when the layer is already classified (integer pixel values matching the
  // classes in layers.json) and no Jenks is required.
  if (colorType === 'categorical') {
    const areaImg = ee.Image.pixelArea().addBands(image)
    const grouped = areaImg.reduceRegion({
      reducer:    ee.Reducer.sum().group({ groupField: 1, groupName: 'class' }),
      geometry:   region,
      scale,
      maxPixels:  1e9,
      bestEffort: true,
    })

    const raw = await evaluate<{ groups?: { class: number; sum: number }[] }>(grouped)
    const areas: Record<string, number> = {}
    for (const g of raw.groups ?? []) {
      // Normalize "1.0" -> "1" so the legend lookup by integer value works.
      const intKey = String(Math.trunc(Number(g.class)))
      areas[intKey] = (areas[intKey] ?? 0) + g.sum
    }

    if (Object.keys(areas).length === 0) {
      return { ok: false, error: 'No valid pixels in the given geometry', status: 422 }
    }

    return { ok: true, result: { kind: 'categorical', areas } }
  }

  // Continuous branch: numeric stats
  const combined = ee.Reducer.mean()
    .combine({ reducer2: ee.Reducer.minMax(), sharedInputs: true })
    .combine({ reducer2: ee.Reducer.median(), sharedInputs: true })
    .combine({ reducer2: ee.Reducer.stdDev(), sharedInputs: true })
    .combine({ reducer2: ee.Reducer.count(),  sharedInputs: true })
    .combine({ reducer2: ee.Reducer.sum(),    sharedInputs: true })

  const reduced = image.reduceRegion({
    reducer:    combined,
    geometry:   region,
    scale,
    maxPixels:  1e9,
    bestEffort: true,
  })

  const raw = await evaluate<Record<string, number | null>>(reduced)

  const get = (suffix: string): number | undefined => {
    const v = raw[`${bandName}_${suffix}`]
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined
  }

  const mean   = get('mean')
  const min    = get('min')
  const max    = get('max')
  const median = get('median')
  const std    = get('stdDev')
  const count  = get('count')
  const sum    = get('sum')

  if (mean === undefined || min === undefined || max === undefined || count === undefined) {
    return { ok: false, error: 'No valid pixels in the given geometry', status: 422 }
  }

  return {
    ok: true,
    result: { kind: 'continuous', stats: { min, max, mean, median, std, count, sum } },
  }
}
