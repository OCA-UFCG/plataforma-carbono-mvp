// Yearly series of a raster, at a point or over a region.
//
// Extracted from app/api/gee/timeseries/route.ts, which only ever did the point
// form, and extended with the zonal one the report needs.
//
// What the extraction has to preserve: one year per band, all read in a single
// `reduceRegion` instead of one request per year, and every band built through
// `buildEeImage`. That last point is what makes the chart and the map agree —
// a path that assembled its own ee.Image would return raw DN and show MODIS
// LST near 15000 while the map shows degrees Celsius.

import { buildEeImage, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import type { TimeSeriesPoint } from '@/types/mapa'

// Cap of years per request. MapBiomas covers 1985 to 2024, forty stops, so the
// old twenty-year limit would leave half of the series out.
export const MAX_ANOS = 50

export type SeriesRegion =
  | { kind: 'point'; lon: number; lat: number }
  | {
      kind: 'zonal'
      geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }
      /** Effective scale; the caller coarsens it for a large recorte. */
      scale?: number
    }

export interface ZonalSeriesInput {
  asset:  GeeAssetConfig
  anos:   number[]
  region: SeriesRegion
}

/** Validates an ISO range and returns its years, or null if it breaks the rules. */
export function anosDoIntervalo(r: unknown): number[] | null {
  if (!Array.isArray(r) || r.length !== 2) return null
  const [a, b] = r
  if (typeof a !== 'string' || typeof b !== 'string') return null
  const ini = Number(a.slice(0, 4))
  const fim = Number(b.slice(0, 4))
  if (!Number.isInteger(ini) || !Number.isInteger(fim)) return null
  if (ini < 1970 || fim > 2100 || ini > fim) return null
  if (fim - ini + 1 > MAX_ANOS) return null
  return Array.from({ length: fim - ini + 1 }, (_, i) => ini + i)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeSeries(ee: any, input: ZonalSeriesInput): Promise<TimeSeriesPoint[]> {
  const { asset, anos, region } = input
  if (anos.length === 0) return []

  // A collection with gaps, like ESA CCI, which only has 2007, 2010 and 2015 to
  // 2022: asking for an empty year makes the reducer return an image with no
  // band and the whole assembly fail. A cheap query for the existing years
  // avoids that and, as a bonus, makes the series show only the real stops.
  let anosUteis = anos
  if (!asset.bandPattern && asset.type === 'imageCollection') {
    const disponiveis = await evaluate<number[]>(
      ee.ImageCollection(asset.id)
        .filterDate(`${anos[0]}-01-01`, `${anos[anos.length - 1] + 1}-01-01`)
        .aggregate_array('system:time_start')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => ee.Date(t).get('year'))
        .distinct(),
    )
    const comDado = new Set(disponiveis ?? [])
    anosUteis = anos.filter((a) => comDado.has(a))
    if (anosUteis.length === 0) return []
  }

  // One year per band, each built through the same path that serves the tile,
  // which guarantees the same unit and the same mask in the chart and the map.
  const porAno = anosUteis.map((ano) =>
    buildEeImage(ee, asset, `${ano}-01-01`).rename(`a${ano}`),
  )

  // The point form samples a single pixel, so `first` over one read per band is
  // both correct and the cheapest possible. The zonal form averages the region,
  // and needs the large-region guards the other reductions use.
  const reduceArgs = region.kind === 'point'
    ? {
        reducer:   ee.Reducer.first(),
        geometry:  ee.Geometry.Point([region.lon, region.lat]),
        scale:     asset.scale ?? 500,
        // The cap counts one read per band, and here there is one band per year.
        maxPixels: anosUteis.length,
      }
    : {
        reducer:    ee.Reducer.mean(),
        geometry:   ee.Geometry(region.geometry),
        scale:      region.scale ?? asset.scale ?? 500,
        // This is the reduction with one band per year, so it gets the same
        // headroom as the other multi-band reduction in the codebase
        // (stockReport.ts). With bestEffort this budget sets where scale
        // coarsening begins, not where the call fails, so a tighter cap here
        // would degrade a 40-year series harder than a single-band snapshot
        // of the same layer.
        maxPixels:  1e10,
        bestEffort: true,
        tileScale:  4,
      }

  const valores = await evaluate<Record<string, unknown>>(
    ee.Image.cat(porAno).reduceRegion(reduceArgs),
  )

  return anosUteis.map((ano) => {
    const bruto = valores?.[`a${ano}`]
    return {
      date:  `${ano}-01-01`,
      // Empty rather than zero: a zero would be read as a real measurement.
      value: typeof bruto === 'number' && Number.isFinite(bruto) ? bruto : null,
    }
  })
}
