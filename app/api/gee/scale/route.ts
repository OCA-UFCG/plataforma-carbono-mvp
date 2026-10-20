import { NextResponse } from 'next/server'
import { initGee } from '@/lib/mapa/geeAuth'
import { bodyTooLarge } from '@/lib/mapa/geeValidation'
import { rateLimit, clientIp } from '@/lib/mapa/rateLimit'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { recorteScaleKey } from '@/lib/mapa/recorteScale'
import {
  cachedRecorteScale,
  computeRecorteScale,
  getScaleFeicao,
  getScaleLayer,
} from '@/lib/mapa/recorteScaleService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The color scale of a continuous raster inside the feature selected on the
// map. The client sends ids only: the asset comes from layers.json and the
// geometry from the recorte registry, so the route cannot be pointed at any
// other image or region.
interface ReqBody {
  layerId?:     unknown
  recorteId?:   unknown
  feicaoIndex?: unknown   // position in the recorte GeoJSON = MapLibre generateId
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

  const layer = typeof body.layerId === 'string' ? getScaleLayer(body.layerId) : null
  if (!layer) {
    return NextResponse.json({ error: 'layerId must name a continuous GEE layer' }, { status: 400 })
  }

  const { recorteId, feicaoIndex } = body
  if (
    typeof recorteId !== 'string'
    || typeof feicaoIndex !== 'number' || !Number.isInteger(feicaoIndex) || feicaoIndex < 0
  ) {
    return NextResponse.json({ error: 'unknown recorte feature' }, { status: 400 })
  }
  const feicao = getScaleFeicao(layer, recorteId, feicaoIndex)
  if (!feicao) {
    return NextResponse.json({ error: 'unknown recorte feature' }, { status: 400 })
  }

  const key = recorteScaleKey(layer.id, recorteId, feicaoIndex)
  const hit = cachedRecorteScale(key)
  if (hit) return NextResponse.json(hit)

  try {
    await initGee()
  } catch (err) {
    console.error('[/api/gee/scale] auth error:', err)
    return NextResponse.json({ error: 'Earth Engine unavailable' }, { status: 503 })
  }

  try {
    return NextResponse.json(await computeRecorteScale(key, layer, feicao))
  } catch (err) {
    console.error('[/api/gee/scale] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
