/**
 * POST /api/gee/timeseries
 *
 * Returns the per-date pixel-value time series of a GEE ImageCollection
 * sampled at a single [lon, lat]. A single call to `ee.ImageCollection
 * .getRegion()` fetches all dates in one server-side RPC, which is far
 * cheaper than one request per date.
 *
 * Used by the temporal-layer point interaction: when a user clicks or
 * draws a point while a temporal raster is active, the client calls
 * this route instead of `/api/gee/point` to render a time-series chart.
 */

import { NextResponse } from 'next/server'
import { initGee, getEe } from '@/lib/plataforma/geeAuth'
import type { GeeAssetConfig } from '@/lib/plataforma/geeImage'
import { evaluate } from '@/lib/plataforma/geeEvaluate'
import { isValidAsset, isValidLonLat, bodyTooLarge } from '@/lib/plataforma/geeValidation'
import { isAllowedAsset } from '@/lib/plataforma/geeAllowlist'
import { rateLimit, clientIp } from '@/lib/plataforma/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Widest interval a single time-series request may span (~20 years).
const MAX_RANGE_MS = 20 * 365 * 24 * 60 * 60 * 1000

interface ReqBody {
  asset:     GeeAssetConfig
  lon:       number
  lat:       number
  dateRange: [string, string]  // ["2024-01-01", "2026-02-01"]
}

/** Validate dateRange: two parseable ISO dates, start < end, bounded span. */
function isValidDateRange(r: unknown): r is [string, string] {
  if (!Array.isArray(r) || r.length !== 2) return false
  const [a, b] = r
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const ta = Date.parse(a)
  const tb = Date.parse(b)
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return false
  return ta < tb && tb - ta <= MAX_RANGE_MS
}

export async function POST(req: Request) {
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
  if (!isValidDateRange(body.dateRange)) {
    return NextResponse.json(
      { error: 'dateRange must be two ISO dates with start < end within 20 years' },
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
  const { asset, lon, lat, dateRange } = body

  try {
    let col = ee.ImageCollection(asset.id)
      .filterDate(dateRange[0], dateRange[1])

    if (asset.band) {
      col = col.select(asset.band)
    }

    const point = ee.Geometry.Point([lon, lat])
    const scale = asset.scale ?? 500

    // getRegion returns all pixel values at a point across the entire
    // collection in a single RPC call. Result shape:
    //   [ ['id', 'longitude', 'latitude', 'time', 'bandName'],
    //     ['img1', lon, lat, timestamp_ms, value],
    //     ['img2', lon, lat, timestamp_ms, value],
    //     ... ]
    const raw = await evaluate<unknown[][]>(col.getRegion(point, scale))

    if (!raw || raw.length < 2) {
      return NextResponse.json({ series: [] })
    }

    // Parse header row to find column indices
    const header = raw[0] as string[]
    const timeIdx = header.indexOf('time')
    // Band value is the last column (or the first non-standard column after 'time')
    const valueIdx = header.length - 1

    const series: { date: string; value: number | null }[] = []

    for (let i = 1; i < raw.length; i++) {
      const row = raw[i]
      const timestamp = row[timeIdx] as number
      const rawVal = row[valueIdx]

      // Convert epoch ms -> "YYYY-MM-01" (first of month)
      const d = new Date(timestamp)
      const yyyy = d.getUTCFullYear()
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      const date = `${yyyy}-${mm}-01`

      const value =
        typeof rawVal === 'number' && Number.isFinite(rawVal) ? rawVal : null

      series.push({ date, value })
    }

    // Sort by date
    series.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ series })
  } catch (err) {
    console.error('[/api/gee/timeseries] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
