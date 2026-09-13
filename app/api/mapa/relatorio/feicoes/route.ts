/**
 * GET /api/mapa/relatorio/feicoes?recorte=municipios
 *
 * Features of a recorte, for the report form's picker. It exists so the form
 * does not have to download the GeoJSON: FloatingSearchBar pulls the whole
 * 1,1 MB of municipalities to search, and repeating that just to populate a
 * select would be wasteful.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/mapa/rateLimit'
import { listFeicoes } from '@/lib/mapa/recorteRegistry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RECORTE_PATTERN = /^[a-z0-9_-]{1,80}$/u

export async function GET(req: Request) {
  if (!await getAuthenticatedRequest(req)) return unauthorizedResponse()

  const rl = rateLimit(clientIp(req))
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const recorte = new URL(req.url).searchParams.get('recorte')?.trim() ?? ''
  if (!RECORTE_PATTERN.test(recorte)) {
    return NextResponse.json({ error: 'Invalid recorte.' }, { status: 400 })
  }

  const feicoes = listFeicoes(recorte)
  if (feicoes.length === 0) {
    return NextResponse.json({ error: 'Recorte not found.' }, { status: 404 })
  }

  // The vector files are static, so a day of staleness costs nothing and saves
  // the picker a round trip on every form open.
  return NextResponse.json({ feicoes }, {
    headers: { 'Cache-Control': 'private, max-age=86400' },
  })
}
