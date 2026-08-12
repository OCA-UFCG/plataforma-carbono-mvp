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

interface ReqBody {
  asset:         GeeAssetConfig
  lon:           number
  lat:           number
  temporalDate?: string  // ISO date, temporal mode: filter collection to this single month
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

  try {
    await initGee()
  } catch (err) {
    console.error('[/api/gee/point] auth error:', err)
    return NextResponse.json({ error: 'Earth Engine unavailable' }, { status: 503 })
  }

  const ee = getEe()
  const { asset, lon, lat, temporalDate } = body

  try {
    const image = buildEeImage(ee, asset, temporalDate)
    const point = ee.Geometry.Point([lon, lat])
    const scale = asset.scale ?? 500

    // Resolve band name
    let bandName = asset.band
    if (!bandName) {
      const bands = await evaluate<string[]>(image.bandNames())
      bandName = bands?.[0]
    }
    if (!bandName) {
      return NextResponse.json({ error: 'Could not determine band name' }, { status: 500 })
    }

    const result = await evaluate<Record<string, number | null>>(
      image.reduceRegion({
        reducer:   ee.Reducer.first(),
        geometry:  point,
        scale,
        maxPixels: 1,
      }),
    )

    const raw = result[bandName]
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null

    return NextResponse.json({ value })
  } catch (err) {
    console.error('[/api/gee/point] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
