/**
 * GET /api/territorios/territorio?recorte=&feicao=
 *
 * The territory a Territórios story is about: name, state, area inside the
 * biome, bbox, geometry and the biome-wide references. No Earth Engine work.
 *
 * The client names a recorte and a feature, never a geometry: the server
 * resolves both, and only for the enabled territory types.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/mapa/rateLimit'
import { getTerritory, TerritoryNotFoundError } from '@/lib/territorios/themeService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RECORTE_PATTERN = /^[a-z0-9_-]{1,80}$/u
const FEICAO_PATTERN  = /^[a-z0-9-]{1,120}$/u

export async function GET(req: Request) {
  if (!await getAuthenticatedRequest(req)) return unauthorizedResponse()

  const rl = rateLimit(clientIp(req))
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const params = new URL(req.url).searchParams
  const recorteId = params.get('recorte')?.trim() ?? ''
  const featureId = params.get('feicao')?.trim() ?? ''

  if (!RECORTE_PATTERN.test(recorteId)) {
    return NextResponse.json({ error: 'Invalid recorte.' }, { status: 400 })
  }
  if (!FEICAO_PATTERN.test(featureId)) {
    return NextResponse.json({ error: 'Invalid feature.' }, { status: 400 })
  }

  try {
    // The vector files change only with a deploy (scripts/build-recortes.py),
    // so an hour of staleness is the most a counted ranking can lag a release.
    return NextResponse.json(getTerritory(recorteId, featureId), {
      headers: { 'Cache-Control': 'private, max-age=3600' },
    })
  } catch (err) {
    if (err instanceof TerritoryNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    console.error('[/api/territorios/territorio] error:', err)
    return NextResponse.json({ error: 'Unable to load the territory.' }, { status: 500 })
  }
}
