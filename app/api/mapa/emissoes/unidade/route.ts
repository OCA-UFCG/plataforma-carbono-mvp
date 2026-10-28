/**
 * GET /api/mapa/emissoes/unidade?nivel=<municipios|estados|bioma>&chave=<key>
 *
 * The emissions of one municipality (7-digit IBGE code), state (two-letter
 * code) or the biome ('bioma'), by sector and year in t CO2e, for the results
 * panel (lib/emissoes/server.ts).
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { getUnidadeEmissoes } from '@/lib/emissoes/server'
import { clientIp, rateLimit } from '@/lib/mapa/rateLimit'
import type { NivelEmissoes } from '@/types/emissoes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CHAVE: Record<NivelEmissoes, RegExp> = {
  municipios: /^\d{7}$/u,
  estados: /^[A-Z]{2}$/u,
  bioma: /^bioma$/u,
}

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
  const nivel = params.get('nivel')?.trim() ?? ''
  const chave = params.get('chave')?.trim() ?? ''
  if (!Object.hasOwn(CHAVE, nivel) || !CHAVE[nivel as NivelEmissoes].test(chave)) {
    return NextResponse.json({ error: 'Invalid level or key.' }, { status: 400 })
  }

  const payload = getUnidadeEmissoes(nivel as NivelEmissoes, chave)
  if (!payload) return NextResponse.json({ error: 'Unknown unit.' }, { status: 404 })
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-cache' } })
}
