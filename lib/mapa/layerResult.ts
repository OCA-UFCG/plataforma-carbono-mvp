// Earth Engine side of the results panel: one computation per archetype of
// config/mapa/resultProfiles.ts.
//
// Rules every branch keeps:
// - the image comes from `buildEeImage`, so the numbers are in the same unit as
//   the map;
// - a total or an area is always value × `ee.Image.pixelArea()`, never a pixel
//   count, which stops meaning anything the moment the scale changes;
// - one `evaluate` per click, so a result costs one request against the
//   per-IP limit.
//
// The territorial report does not come through here: it keeps
// `computeZonalStats`, so this panel can change without touching it.

import { area as turfArea } from '@turf/area'
import { buildEeImage, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import { buildStockReport } from '@/lib/mapa/stockReport'
import { yearOfBand } from '@/lib/mapa/results/period'
import type { ResultLayer } from '@/lib/mapa/resultsRegistry'
import type {
  AnnualProfile,
  DistributionProfile,
  RecurrenceProfile,
} from '@/config/mapa/resultProfiles'
import type { AreaBin, PanelResult, RecurrenceCount } from '@/types/mapa'

export interface LayerResultInput {
  entry:         ResultLayer
  geometry:      { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }
  temporalDate?: string
}

/**
 * Pixels one reduction may read before the scale doubles. Measured on the
 * territory experiment: a municipality or a state at native scale answered in
 * 1 to 13 s, while the net flux at 30 m over 150.000 km² (1,7e8 pixels) took
 * 39 to 60 s against a 65 s timeout.
 */
export const PIXEL_BUDGET = 1e8

/** Native scale, doubled until the region fits the pixel budget. */
export function analysisScale(nativeScale: number, regionM2: number, budget = PIXEL_BUDGET): number {
  let scale = nativeScale
  while (regionM2 / (scale * scale) > budget) scale *= 2
  return scale
}

/** Area bands from the grouped sums the histogram reduction returns. */
export function binsFromGroups(edges: number[], groups: { bin: number; sum: number }[]): AreaBin[] {
  const byBin = new Map(groups.map((g) => [Math.trunc(Number(g.bin)), g.sum]))
  return edges.map((from, i) => ({
    from,
    to: i + 1 < edges.length ? edges[i + 1] : null,
    areaHa: byBin.get(i) ?? 0,
  }))
}

/**
 * Area at each accumulated count, from groups keyed `count × 2 + burned in the
 * year`. Packing both into one key keeps the recurrence to a single grouped
 * reduction.
 */
export function countsFromGroups(groups: { k: number; sum: number }[]): RecurrenceCount[] {
  const byCount = new Map<number, RecurrenceCount>()
  for (const g of groups) {
    const key = Math.trunc(Number(g.k))
    const count = key >> 1
    const row = byCount.get(count) ?? { count, areaHa: 0, burnedInYearHa: 0 }
    row.areaHa += g.sum
    if (key & 1) row.burnedInYearHa += g.sum
    byCount.set(count, row)
  }
  return [...byCount.values()].sort((a, b) => a.count - b.count)
}

/**
 * Hectares with data, or where a 0/1 `condition` on the value holds, weighted
 * the same way in both cases. Past the native scale a pixel partly covered by
 * data carries a fractional mask; `updateMask(condition)` would count it whole,
 * so the condition is multiplied in and the fraction rides on the mask it
 * inherits from the value. The bands then add up to the area with data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function areaWhere(hectares: any, value: any, condition?: any): any {
  return condition ? hectares.multiply(condition) : hectares.updateMask(value.mask())
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const stat = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : NaN)

type Groups<K extends string> = { groups?: ({ sum: number } & Record<K, number>)[] }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeLayerResult(ee: any, input: LayerResultInput): Promise<PanelResult> {
  const { entry, geometry, temporalDate } = input
  const { asset, profile } = entry
  const region = ee.Geometry(geometry)
  const regionM2 = turfArea(geometry as GeoJSON.Geometry)
  // Built on use: the stock report brings its own area image.
  const hectares = () => ee.Image.pixelArea().divide(1e4)

  // Grouped sum of hectares by the integer band `key`. The summed band carries
  // the mask of the data: once the scale coarsens past native, a pixel only
  // partly covered by data has a fractional mask, and summing unmasked
  // hectares would count it whole while the total area counts the fraction.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupedHa = (key: any, groupName: string, scale: number, bestEffort: boolean, mask?: any) =>
    (mask ? hectares().updateMask(mask) : hectares()).addBands(key.rename(groupName)).reduceRegion({
      reducer:  ee.Reducer.sum().group({ groupField: 1, groupName }),
      geometry: region,
      scale,
      maxPixels: 1e9,
      tileScale: 4,
      bestEffort,
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sums = (image: any, scale: number) =>
    image.reduceRegion({
      reducer:    ee.Reducer.sum(),
      geometry:   region,
      scale,
      maxPixels:  1e9,
      tileScale:  4,
      bestEffort: true,
    })

  // Band index of the value among the profile's edges: 0 below the second edge,
  // and so on up to the open top band.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binIndex = (value: any, edges: number[]) => {
    let idx = ee.Image.constant(0)
    for (const edge of edges.slice(1)) idx = idx.add(value.gte(edge))
    return idx.updateMask(value.mask()).toInt()
  }

  switch (profile.archetype) {
    case 'stocks': {
      const stocks = entry.stocks!
      const report = await buildStockReport(
        ee, ee.Image(stocks.assetId), region, stocks.cfg, stocks.legenda, stocks.scale,
      )
      return { kind: 'stocks', report }
    }

    case 'amount': {
      const scale = analysisScale(asset.scale ?? 500, regionM2)
      const v = buildEeImage(ee, asset, temporalDate).rename('v')
      const totals = sums(
        ee.Image.cat(
          v.multiply(hectares()).rename('total'),
          areaWhere(hectares(), v).rename('valid'),
          areaWhere(hectares(), v, v.eq(0)).rename('zero'),
        ),
        scale,
      )
      const hist = groupedHa(binIndex(v, profile.bins), 'bin', scale, true, v.mask())
      const raw = await evaluate<{ t: Record<string, unknown>; h: Groups<'bin'> }>(
        ee.Dictionary({ t: totals, h: hist }),
      )
      return {
        kind:    'amount',
        total:   num(raw.t.total),
        validHa: num(raw.t.valid),
        zeroHa:  num(raw.t.zero),
        bins:    binsFromGroups(profile.bins, raw.h.groups ?? []),
        scaleM:  scale,
      }
    }

    case 'distribution':
      return distribution(ee, profile, asset, region, regionM2, temporalDate, groupedHa, binIndex)

    case 'flux':
      return flux(ee, asset, regionM2, temporalDate, sums, hectares())

    case 'annual':
      return annual(ee, profile, asset, regionM2, temporalDate, sums)

    case 'composition': {
      const scale = analysisScale(asset.scale ?? 500, regionM2)
      const v = buildEeImage(ee, asset, temporalDate)
      const raw = await evaluate<Groups<'class'>>(
        ee.Image.pixelArea().addBands(v.rename('class')).reduceRegion({
          reducer:    ee.Reducer.sum().group({ groupField: 1, groupName: 'class' }),
          geometry:   region,
          scale,
          maxPixels:  1e9,
          tileScale:  4,
          bestEffort: true,
        }),
      )
      // Area in m² per class code, the convention of the categorical kind.
      const areas: Record<string, number> = {}
      for (const g of raw.groups ?? []) {
        const code = String(Math.trunc(Number(g.class)))
        areas[code] = (areas[code] ?? 0) + g.sum
      }
      return { kind: 'categorical', areas }
    }

    case 'recurrence':
      return recurrence(ee, profile, asset, regionM2, temporalDate, groupedHa)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fn = (...args: any[]) => any

async function distribution(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ee: any, profile: DistributionProfile, asset: GeeAssetConfig, region: any,
  regionM2: number, temporalDate: string | undefined, groupedHa: Fn, binIndex: Fn,
): Promise<PanelResult> {
  // A fixed scale and no `bestEffort`: coarsening reads the mean pyramid,
  // which narrows the distribution, so the same municipality would get
  // different percentiles depending on how large a neighbour it was drawn with.
  const scale = analysisScale(profile.scale, regionM2)
  const v = buildEeImage(ee, asset, temporalDate).rename('v')
  const stats = v.reduceRegion({
    reducer: ee.Reducer.percentile([10, 50, 90])
      .combine({ reducer2: ee.Reducer.mean(), sharedInputs: true }),
    geometry:  region,
    scale,
    maxPixels: 1e9,
    tileScale: 4,
  })
  const hist = groupedHa(binIndex(v, profile.bins), 'bin', scale, false, v.mask())
  const raw = await evaluate<{ s: Record<string, unknown>; h: Groups<'bin'> }>(
    ee.Dictionary({ s: stats, h: hist }),
  )
  const bins = binsFromGroups(profile.bins, raw.h.groups ?? [])
  return {
    kind:    'distribution',
    p10:     stat(raw.s.v_p10),
    p50:     stat(raw.s.v_p50),
    p90:     stat(raw.s.v_p90),
    mean:    stat(raw.s.v_mean),
    validHa: bins.reduce((s, b) => s + b.areaHa, 0),
    bins,
    scaleM:  scale,
  }
}

async function flux(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ee: any, asset: GeeAssetConfig, regionM2: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  temporalDate: string | undefined, sums: Fn, hectares: any,
): Promise<PanelResult> {
  const scale = analysisScale(asset.scale ?? 30, regionM2)
  // Mg CO2e/ha × ha = t CO2e. The sign is split before summing, so the net
  // total also comes with how much of it came from source and from sink pixels.
  const v = buildEeImage(ee, asset, temporalDate).rename('v')
  const raw = await evaluate<Record<string, unknown>>(sums(
    ee.Image.cat(
      v.max(0).multiply(hectares).rename('pos'),
      v.min(0).multiply(hectares).rename('neg'),
      areaWhere(hectares, v, v.gt(0)).rename('posHa'),
      areaWhere(hectares, v, v.lt(0)).rename('negHa'),
      areaWhere(hectares, v).rename('valid'),
    ),
    scale,
  ))
  return {
    kind:       'flux',
    positive:   num(raw.pos),
    negative:   num(raw.neg),
    positiveHa: num(raw.posHa),
    negativeHa: num(raw.negHa),
    validHa:    num(raw.valid),
    scaleM:     scale,
  }
}

async function annual(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ee: any, profile: AnnualProfile, asset: GeeAssetConfig, regionM2: number,
  temporalDate: string | undefined, sums: Fn,
): Promise<PanelResult> {
  const scale = analysisScale(asset.scale ?? 500, regionM2)
  const v = buildEeImage(ee, asset, temporalDate).rename('v')
  const m2 = ee.Image.pixelArea()
  // The mean is weighted by the geodesic pixel area: a plain `mean` weights
  // every pixel alike, and a degree-gridded product such as CHIRPS has pixels
  // several percent smaller at the southern end of the biome than at the north.
  const raw = await evaluate<Record<string, unknown>>(sums(
    ee.Image.cat(v.multiply(m2).rename('vA'), m2.updateMask(v.mask()).rename('A')),
    scale,
  ))
  const vA = num(raw.vA)
  const A = num(raw.A)
  return {
    kind:    'annual',
    mean:    A > 0 ? vA / A : NaN,
    total:   profile.total ? vA / profile.total.areaDivisor : null,
    validHa: A / 1e4,
    scaleM:  scale,
  }
}

async function recurrence(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ee: any, profile: RecurrenceProfile, asset: GeeAssetConfig, regionM2: number,
  temporalDate: string | undefined, groupedHa: Fn,
): Promise<PanelResult> {
  const scale = analysisScale(profile.scale, regionM2)
  const year = temporalDate ? Number(temporalDate.slice(0, 4)) : yearOfBand(asset.band)
  if (year === null) throw new Error('recurrence layer without a year')

  // MapBiomas Fogo masks the pixels that never burned instead of writing 0
  // (Campina Grande: 1.863 of 59.299 ha carry a value). Left masked, the
  // never-burned area vanishes from the denominator and a first fire vanishes
  // from the year-on-year difference, so both counts are filled with zero.
  const current = buildEeImage(ee, asset, `${year}-01-01`)
  const count = current.unmask(0)
  const previous = year > profile.firstYear
    ? buildEeImage(ee, asset, `${year - 1}-01-01`).unmask(0)
    : ee.Image.constant(0)
  // The key is built on the native grid. Past it, Earth Engine would read the
  // counts from the asset's mean pyramid: a coarse pixel only partly burned
  // keeps a fractional mask that unmask(0) leaves alone, and its whole area
  // lands in a burned key (the biome at 120 m read 17,6% ever burned instead
  // of 12,8%). Reprojected, each coarse pixel takes the key of one real pixel.
  const key = count.multiply(2).add(count.gt(previous)).toInt().reproject(current.projection())

  const raw = await evaluate<Groups<'k'>>(groupedHa(key, 'k', scale, false))
  const byCount = countsFromGroups(raw.groups ?? [])
  return {
    kind:     'recurrence',
    year,
    regionHa: byCount.reduce((s, c) => s + c.areaHa, 0),
    byCount,
    scaleM:   scale,
  }
}
