import { NextResponse } from 'next/server'
import { initGee } from '@/lib/mapa/geeAuth'
import { bodyTooLarge } from '@/lib/mapa/geeValidation'
import { rateLimit, clientIp } from '@/lib/mapa/rateLimit'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { choroplethKey } from '@/lib/mapa/choropleth'
import {
  cachedChoropleth,
  computeChoropleth,
  getChoroplethLayer,
  isChoroplethRecorte,
} from '@/lib/mapa/choroplethService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The mean of a continuous layer by feature of a recorte (Estados,
// Municípios), every year at once, for the map by feature. The client sends
// ids only: the asset comes from layers.json and the geometries from the
// recorte's GeoJSON on the server.
interface ReqBody {
  layerId?:   unknown
  recorteId?: unknown
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

  const layer = typeof body.layerId === 'string' ? getChoroplethLayer(body.layerId) : null
  if (!layer) {
    return NextResponse.json({ error: 'layerId must name a continuous GEE layer' }, { status: 400 })
  }
  const { recorteId } = body
  if (typeof recorteId !== 'string' || !isChoroplethRecorte(recorteId)) {
    return NextResponse.json({ error: 'recorteId must name a recorte drawn by feature' }, { status: 400 })
  }

  const key = choroplethKey(layer.id, recorteId)
  const hit = cachedChoropleth(key)
  if (hit) return NextResponse.json(hit)

  try {
    await initGee()
  } catch (err) {
    console.error('[/api/gee/choropleth] auth error:', err)
    return NextResponse.json({ error: 'Earth Engine unavailable' }, { status: 503 })
  }

  try {
    return NextResponse.json(await computeChoropleth(key, layer, recorteId))
  } catch (err) {
    console.error('[/api/gee/choropleth] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
