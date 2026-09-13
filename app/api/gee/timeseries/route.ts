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
import { type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { isValidAsset, isValidLonLat, bodyTooLarge } from '@/lib/mapa/geeValidation'
import { isAllowedAsset } from '@/lib/mapa/geeAllowlist'
import { rateLimit, clientIp } from '@/lib/mapa/rateLimit'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { anosDoIntervalo, computeSeries, MAX_ANOS } from '@/lib/mapa/zonalSeries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ReqBody {
  asset:     GeeAssetConfig
  lon:       number
  lat:       number
  dateRange: [string, string]  // ["1985-01-01", "2024-01-01"]
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

  try {
    const series = await computeSeries(ee, {
      asset: body.asset,
      anos,
      region: { kind: 'point', lon: body.lon, lat: body.lat },
    })
    return NextResponse.json({ series })
  } catch (err) {
    console.error('[/api/gee/timeseries] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
