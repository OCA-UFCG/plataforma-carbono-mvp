/**
 * GET /api/mapa/emissoes?camada=<layer id>
 *
 * The values of one emissions map layer (t CO2e/ha by year for every
 * municipality, state and the biome) and its color classes, built from
 * config/emissoes/emissoes.json (lib/emissoes/server.ts). The store keeps each
 * answer for the page's lifetime; the browser revalidates it on the next load,
 * so a deploy with new data reaches the reader at once.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { getCamadaEmissoes } from '@/lib/emissoes/server'
import { clientIp, rateLimit } from '@/lib/mapa/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LAYER_PATTERN = /^[a-z0-9_]{1,80}$/u

export async function GET(req: Request) {
  if (!await getAuthenticatedRequest(req)) return unauthorizedResponse()

  const rl = rateLimit(clientIp(req))
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const layerId = new URL(req.url).searchParams.get('camada')?.trim() ?? ''
  if (!LAYER_PATTERN.test(layerId)) {
    return NextResponse.json({ error: 'Invalid layer id.' }, { status: 400 })
  }

  const payload = getCamadaEmissoes(layerId)
  if (!payload) return NextResponse.json({ error: 'Unknown emissions layer.' }, { status: 404 })
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-cache' } })
}
