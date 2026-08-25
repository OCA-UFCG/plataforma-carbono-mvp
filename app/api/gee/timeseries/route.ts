/**
 * POST /api/gee/timeseries
 *
 * Returns the yearly series of the pixel value at a [lon, lat]. Each year is
 * built by the same `buildEeImage` that serves the tile and the zonal
 * statistics, so the chart and the map show the same number, in the same unit,
 * with the same mask. The years go as bands of a single image and come out of
 * one `reduceRegion`, instead of one request per year.
 *
 * It serves the two forms of series the platform has: a collection filtered by
 * date, and an image with the year in the band name (`bandPattern`).
 */

import { NextResponse } from 'next/server'
import { initGee, getEe } from '@/lib/mapa/geeAuth'
import { buildEeImage, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import { isValidAsset, isValidLonLat, bodyTooLarge } from '@/lib/mapa/geeValidation'
import { isAllowedAsset } from '@/lib/mapa/geeAllowlist'
import { rateLimit, clientIp } from '@/lib/mapa/rateLimit'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cap of years per request. MapBiomas covers 1985 to 2024, forty stops, so the
// old twenty-year limit would leave half of the series out.
const MAX_ANOS = 50

interface ReqBody {
  asset:     GeeAssetConfig
  lon:       number
  lat:       number
  dateRange: [string, string]  // ["1985-01-01", "2024-01-01"]
}

/** Validates the range and returns the list of years, or null if it breaks the rules. */
function anosDoIntervalo(r: unknown): number[] | null {
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

export async function POST(req: Request) {
  if (!await getAuthenticatedRequest(req)) return unauthorizedResponse()

  const rl = rateLimit(clientIp(req))
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }
  if (bodyTooLarge(req)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  let body: ReqBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isValidAsset(body.asset)) {
    return NextResponse.json({ error: 'asset is required' }, { status: 400 })
  }
  if (!isAllowedAsset(body.asset)) {
    return NextResponse.json({ error: 'asset not allowed' }, { status: 403 })
  }
  if (!isValidLonLat(body.lon, body.lat)) {
    return NextResponse.json({ error: 'lon/lat must be finite and within range' }, { status: 400 })
  }
  const anos = anosDoIntervalo(body.dateRange)
  if (!anos) {
    return NextResponse.json(
      { error: `dateRange must be two ISO dates spanning at most ${MAX_ANOS} years` },
      { status: 400 },
    )
  }

  try {
    await initGee()
  } catch (err) {
    console.error('[/api/gee/timeseries] auth error:', err)
    return NextResponse.json({ error: 'Earth Engine unavailable' }, { status: 503 })
  }

  const ee = getEe()
  const { asset, lon, lat } = body

  try {
    // A collection with gaps, like ESA CCI, which only has 2007, 2010 and 2015
    // to 2022: asking for an empty year makes the reducer return an image with
    // no band and the whole assembly fail. A cheap query for the existing years
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
      if (anosUteis.length === 0) return NextResponse.json({ series: [] })
    }

    // One year per band, each built through the same path that serves the tile,
    // which guarantees the same unit and the same mask in the chart and the map.
    const porAno = anosUteis.map((ano) =>
      buildEeImage(ee, asset, `${ano}-01-01`).rename(`a${ano}`),
    )

    const point = ee.Geometry.Point([lon, lat])
    const scale = asset.scale ?? 500

    const valores = await evaluate<Record<string, unknown>>(
      ee.Image.cat(porAno).reduceRegion({
        reducer:   ee.Reducer.first(),
        geometry:  point,
        scale,
        // The cap counts one read per band, and here there is one band per year.
        maxPixels: anosUteis.length,
      }),
    )

    const series = anosUteis.map((ano) => {
      const bruto = valores?.[`a${ano}`]
      return {
        date:  `${ano}-01-01`,
        value: typeof bruto === 'number' && Number.isFinite(bruto) ? bruto : null,
      }
    })

    return NextResponse.json({ series })
  } catch (err) {
    console.error('[/api/gee/timeseries] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
