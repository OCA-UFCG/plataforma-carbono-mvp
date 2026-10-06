// Earth Engine work of one theme step over one territory.
//
// No `server-only` guard: scripts/territorios-precompute.ts imports this module
// outside Next.js. The caller owns authentication and caching.
//
// A settled answer comes back as a value ('available' or 'no_pixels'); any
// other failure throws, and themeService.ts turns the throw into 'unavailable'.
// The reductions follow what the plan's Phase 0 measured against the assets on
// 2026-09-16.

import appConfig from '@/config/mapa/layers.json'
import {
  FIRE_ANNUAL_ASSET,
  FIRE_FIRST_YEAR,
  FIRE_LAST_YEAR,
  FLUX_COARSE_ABOVE_HA,
  FLUX_COARSE_SCALE_M,
  LAND_USE_YEARS,
  RAIN_FIRST_YEAR,
  RAIN_LAST_YEAR,
  RAIN_POINT_BELOW_HA,
  storyTheme,
} from '@/config/territorios/story'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import { buildEeImage, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { buildStockReport } from '@/lib/mapa/stockReport'
import { getStocks } from '@/lib/mapa/stocksRegistry'
import { computeSeries } from '@/lib/mapa/zonalSeries'
import { computeZonalStats, type ZonalStatsOutcome } from '@/lib/mapa/zonalStats'
import { interiorPoint } from '@/lib/territorios/interiorPoint'
import type { RasterLayerConfig, TimeSeriesPoint } from '@/types/mapa'
import type { TerritoryPayload, ThemeData, ThemeId, ThemeOrigin } from '@/types/territorios'

type Geometry = TerritoryPayload['geometry']

export interface ThemeComputation {
  status:       'available' | 'no_pixels'
  origin:       ThemeOrigin
  coarseScaleM: number | null
  data:         ThemeData | null
}

function assetOf(theme: ThemeId): GeeAssetConfig {
  const { layerId } = storyTheme(theme)
  const layer = (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === layerId)
  const asset = layer?.gee?.asset
  if (!asset) throw new Error(`Layer ${layerId} has no GEE asset`)
  return asset
}

function noPixels(origin: ThemeOrigin, coarseScaleM: number | null = null): ThemeComputation {
  return { status: 'no_pixels', origin, coarseScaleM, data: null }
}

function hasValue(series: TimeSeriesPoint[]): boolean {
  return series.some((p) => p.value !== null)
}

function failure(theme: ThemeId, outcome: Extract<ZonalStatsOutcome, { ok: false }>): Error {
  return new Error(`${theme}: ${outcome.error} (${outcome.status})`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function stock(ee: any, geometry: Geometry): Promise<ThemeComputation> {
  const stocks = getStocks(storyTheme('estoque').layerId)
  if (!stocks) throw new Error('estoque: layer has no stocks block')
  const report = await buildStockReport(
    ee, ee.Image(stocks.assetId), ee.Geometry(geometry), stocks.cfg, stocks.legenda, stocks.scale,
  )
  if (report.totalTc <= 0) return noPixels('zonal')
  return { status: 'available', origin: 'zonal', coarseScaleM: null, data: { theme: 'estoque', report } }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function flux(ee: any, geometry: Geometry, areaHa: number): Promise<ThemeComputation> {
  const asset = assetOf('fluxo')
  const image = buildEeImage(ee, asset)
  const coarse = areaHa > FLUX_COARSE_ABOVE_HA
  const coarseScaleM = coarse ? FLUX_COARSE_SCALE_M : null

  // The pixel holds Mg CO2e per hectare, so a total needs the pixel area: the
  // `sum` of computeZonalStats adds per-hectare values and is not a total. The
  // forest band is the pixel area where the model has a value, since outside
  // its forest extent the asset is masked rather than zero. The unmasked region
  // band goes through the same reduction so the forest share has one base.
  const sums = await evaluate<{ flux?: number | null; forest?: number | null; region?: number | null }>(
    ee.Image.cat(
      image.multiply(ee.Image.pixelArea()).divide(1e4).rename('flux'),
      ee.Image.pixelArea().divide(1e4).updateMask(image.mask()).rename('forest'),
      ee.Image.pixelArea().divide(1e4).rename('region'),
    ).reduceRegion({
      reducer:    ee.Reducer.sum(),
      geometry:   ee.Geometry(geometry),
      scale:      coarse ? FLUX_COARSE_SCALE_M : asset.scale,
      maxPixels:  1e10,
      bestEffort: true,
      tileScale:  4,
    }),
  )

  const forestAreaHa = sums?.forest
  if (typeof forestAreaHa !== 'number' || !(forestAreaHa > 0)) return noPixels('zonal', coarseScaleM)
  const totalMgCo2e = sums?.flux
  if (typeof totalMgCo2e !== 'number' || !Number.isFinite(totalMgCo2e)) {
    throw new Error('fluxo: forest area without a flux total')
  }
  const regionAreaHa = sums?.region
  if (typeof regionAreaHa !== 'number' || !(regionAreaHa > 0)) {
    throw new Error('fluxo: forest area without a region area')
  }

  return {
    status: 'available',
    origin: 'zonal',
    coarseScaleM,
    data: { theme: 'fluxo', totalMgCo2e, forestAreaHa, regionAreaHa },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function landUse(ee: any, geometry: Geometry, scaleM: number | undefined): Promise<ThemeComputation> {
  const native = assetOf('uso')
  const coarseScaleM = scaleM !== undefined && scaleM > (native.scale ?? 0) ? scaleM : null
  const asset = coarseScaleM === null ? native : { ...native, scale: coarseScaleM }
  const outcomes = await Promise.all(LAND_USE_YEARS.map((year) =>
    computeZonalStats(ee, { asset, geometry, temporalDate: `${year}-01-01`, colorType: 'categorical' }),
  ))

  if (outcomes.some((o) => !o.ok && o.status === 422)) return noPixels('zonal', coarseScaleM)
  const areas = outcomes.map((o) => {
    if (!o.ok) throw failure('uso', o)
    if (o.result.kind !== 'categorical') throw new Error(`uso: unexpected ${o.result.kind} result`)
    return o.result.areas
  })

  return {
    status: 'available',
    origin: 'zonal',
    coarseScaleM,
    data: { theme: 'uso', areas: { '1985': areas[0], '2024': areas[1] } },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fire(ee: any, geometry: Geometry, areaHa: number): Promise<ThemeComputation> {
  const asset = assetOf('fogo')
  const coarse = areaHa > FLUX_COARSE_ABOVE_HA
  const coarseScaleM = coarse ? FLUX_COARSE_SCALE_M : null
  const years = Array.from({ length: FIRE_LAST_YEAR - FIRE_FIRST_YEAR + 1 }, (_, i) => FIRE_FIRST_YEAR + i)

  // Both assets are masked where nothing burned, so inside the territory a
  // masked pixel is "never burned" and the region band is the base of every
  // share. Each burned band weights the pixel area by the mask rather than
  // masking it: at the coarse scale Earth Engine reads a mean pyramid, where
  // the mask is the burned fraction of the pixel and the frequency a mean of
  // whole years, hence the class bounds at half years.
  const ha = ee.Image.pixelArea().divide(1e4)
  const frequency = buildEeImage(ee, asset)
  const burned = ha.multiply(frequency.mask())
  const count = frequency.unmask(0)
  const annual = ee.Image(FIRE_ANNUAL_ASSET).select(years.map((y) => `burned_area_${y}`))

  const sums = await evaluate<Record<string, number | null | undefined>>(
    ee.Image.cat(
      ha.rename('region'),
      burned.multiply(count.lt(1.5)).rename('once'),
      burned.multiply(count.gte(1.5).and(count.lt(4.5))).rename('twoToFour'),
      burned.multiply(count.gte(4.5)).rename('fivePlus'),
      annual.mask().multiply(ha).rename(years.map((y) => `y${y}`)),
    ).reduceRegion({
      reducer:    ee.Reducer.sum(),
      geometry:   ee.Geometry(geometry),
      scale:      coarse ? FLUX_COARSE_SCALE_M : asset.scale,
      maxPixels:  1e10,
      bestEffort: true,
      tileScale:  4,
    }),
  )

  const regionAreaHa = sums?.region
  if (typeof regionAreaHa !== 'number' || !(regionAreaHa > 0)) throw new Error('fogo: no region area')
  // A sum over no burned pixel can come back null; there it is 0 ha.
  const haOf = (key: string) => {
    const v = sums?.[key]
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0
  }
  const recurrenceHa = { once: haOf('once'), twoToFour: haOf('twoToFour'), fivePlus: haOf('fivePlus') }

  // Nothing burned is a settled answer too, never no_pixels.
  return {
    status: 'available',
    origin: 'zonal',
    coarseScaleM,
    data: {
      theme: 'fogo',
      regionAreaHa,
      burnedOnceHa: recurrenceHa.once + recurrenceHa.twoToFour + recurrenceHa.fivePlus,
      recurrenceHa,
      annual: years.map((year) => ({ year, burnedHa: haOf(`y${year}`) })),
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rain(ee: any, geometry: Geometry, areaHa: number): Promise<ThemeComputation> {
  const asset = assetOf('chuva')
  const anos = Array.from(
    { length: RAIN_LAST_YEAR - RAIN_FIRST_YEAR + 1 },
    (_, i) => RAIN_FIRST_YEAR + i,
  )

  if (areaHa >= RAIN_POINT_BELOW_HA) {
    const zonal = await computeSeries(ee, {
      asset, anos, region: { kind: 'zonal', geometry, scale: asset.scale },
    })
    if (hasValue(zonal)) {
      return { status: 'available', origin: 'zonal', coarseScaleM: null, data: { theme: 'chuva', series: zonal } }
    }
  }

  // Above one pixel the mean can still come back null, when no 5.6 km pixel
  // reaches the minimum weight inside the polygon, so the empty series falls
  // back to the point too.
  const { lon, lat } = interiorPoint(geometry)
  const point = await computeSeries(ee, { asset, anos, region: { kind: 'point', lon, lat } })
  if (hasValue(point)) {
    return { status: 'available', origin: 'point', coarseScaleM: null, data: { theme: 'chuva', series: point } }
  }
  return noPixels('point')
}

export async function computeTheme(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ee: any,
  input: {
    theme:    ThemeId
    geometry: Geometry
    areaHa:   number
    /**
     * Land use reduction scale when coarser than 30 m. Past 1e9 pixels in the
     * bounding box computeZonalStats' bestEffort coarsens the scale without
     * reporting it, so the precompute script sets one for the biome.
     */
    landUseScaleM?: number
  },
): Promise<ThemeComputation> {
  const { theme, geometry, areaHa } = input
  switch (theme) {
    case 'estoque':    return stock(ee, geometry)
    case 'fluxo':      return flux(ee, geometry, areaHa)
    case 'uso':        return landUse(ee, geometry, input.landUseScaleM)
    case 'fogo':       return fire(ee, geometry, areaHa)
    case 'chuva':      return rain(ee, geometry, areaHa)
  }
}
