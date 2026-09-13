import { NextResponse } from 'next/server'
import { initGee, getEe } from '@/lib/mapa/geeAuth'
import { type GeeAssetConfig } from '@/lib/mapa/geeImage'
import {
  isValidAsset,
  isValidClassify,
  validatePolygonGeometry,
  bodyTooLarge,
} from '@/lib/mapa/geeValidation'
import { isAllowedAsset } from '@/lib/mapa/geeAllowlist'
import { rateLimit, clientIp } from '@/lib/mapa/rateLimit'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { computeZonalStats } from '@/lib/mapa/zonalStats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ReqBody {
  asset:         GeeAssetConfig
  geometry: {
    type:        'Polygon' | 'MultiPolygon'
    coordinates: unknown
  }
  temporalDate?: string   // ISO date, temporal mode: filter collection to this single month
  classify?: {
    numClasses: number
    method:     'jenks'
  }
  // Jenks break values computed once over the whole biome by /api/gee/tile.
  // Passed back here so the per-feature chart uses the SAME class cut points
  // as the map colors and legend, instead of recomputing breaks per feature.
  breaks?:   number[]
  colorType?: 'categorical' | 'continuous'
  // Layer id. When it declares `gee.stocks`, the response is the stock report
  // instead of the statistics of the visible band. Only the id travels: the
  // configuration is resolved on the server.
  layerId?:  string
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
  if (!isValidClassify(body.classify)) {
    return NextResponse.json({ error: 'invalid classify block' }, { status: 400 })
  }
  const geomCheck = validatePolygonGeometry(body.geometry)
  if (!geomCheck.ok) {
    return NextResponse.json({ error: geomCheck.error }, { status: 400 })
  }

  try {
    await initGee()
  } catch (err) {
    console.error('[/api/gee/stats] auth error:', err)
    return NextResponse.json({ error: 'Earth Engine unavailable' }, { status: 503 })
  }

  const ee = getEe()

  try {
    const outcome = await computeZonalStats(ee, {
      asset:        body.asset,
      geometry:     body.geometry,
      temporalDate: body.temporalDate,
      classify:     body.classify,
      breaks:       body.breaks,
      colorType:    body.colorType,
      layerId:      body.layerId,
    })

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status })
    }

    const { result } = outcome
    if (result.kind === 'stocks') {
      return NextResponse.json({ kind: 'stocks', report: result.report })
    }
    if (result.kind === 'categorical') {
      // `breaks` is echoed for wire compatibility: the client ignores it today,
      // but it has always been part of the Jenks response.
      return NextResponse.json({
        kind: 'categorical',
        areas: result.areas,
        ...(outcome.breaks ? { breaks: outcome.breaks } : {}),
      })
    }
    return NextResponse.json({ kind: 'continuous', stats: result.stats })
  } catch (err) {
    console.error('[/api/gee/stats] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
