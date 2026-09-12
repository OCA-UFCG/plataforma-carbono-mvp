/**
 * GET /api/mapa/relatorio/base?recorte=&feicao=&ano=&camadas=
 *
 * The document shell: recorte identification plus the ordered descriptors of
 * the requested analyses. No Earth Engine work, so it answers immediately and
 * the client can draw the document before any measurement arrives.
 *
 * GET rather than POST, unlike /api/gee/*: those carry a geometry and a
 * visParams block in the body, while nothing but short ids travels here, so GET
 * buys HTTP caching per (recorte, feição, ano, camadas).
 *
 * There is no asset allowlist check because the route accepts no asset: the
 * client sends layer ids and the server resolves the assets from layers.json,
 * as stocksRegistry does. The equivalent guard is that the service rejects any
 * layer outside REPORT_LAYERS.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/mapa/rateLimit'
import {
  buildReportShell,
  ReportBadRequestError,
  ReportNotFoundError,
} from '@/lib/mapa/reportService'
import { MAX_REPORT_LAYERS } from '@/config/mapa/reportLayers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RECORTE_PATTERN = /^[a-z0-9_-]{1,80}$/u
const FEICAO_PATTERN  = /^[a-z0-9-]{1,120}$/u
const YEAR_PATTERN    = /^\d{4}$/u
const LAYER_PATTERN   = /^[A-Za-z0-9_-]{1,80}$/u

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
  const feicaoId  = params.get('feicao')?.trim() ?? ''
  const year      = params.get('ano')?.trim() ?? ''
  // De-duplicated before the cap check below, so a request repeating an id
  // is judged on its effective layer count, matching buildReportShell's own
  // order of operations.
  const layerIds  = [...new Set(
    (params.get('camadas') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  )]

  if (!RECORTE_PATTERN.test(recorteId)) {
    return NextResponse.json({ error: 'Invalid recorte.' }, { status: 400 })
  }
  if (!FEICAO_PATTERN.test(feicaoId)) {
    return NextResponse.json({ error: 'Invalid feature.' }, { status: 400 })
  }
  if (!YEAR_PATTERN.test(year)) {
    return NextResponse.json({ error: 'Invalid year.' }, { status: 400 })
  }
  if (layerIds.length === 0 || layerIds.length > MAX_REPORT_LAYERS) {
    return NextResponse.json(
      { error: `Between 1 and ${MAX_REPORT_LAYERS} layers are required.` },
      { status: 400 },
    )
  }
  if (!layerIds.every((id) => LAYER_PATTERN.test(id))) {
    return NextResponse.json({ error: 'Invalid layer id.' }, { status: 400 })
  }

  try {
    const shell = buildReportShell({ recorteId, feicaoId, year, layerIds })
    return NextResponse.json(shell, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    })
  } catch (err) {
    if (err instanceof ReportNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof ReportBadRequestError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[/api/mapa/relatorio/base] error:', err)
    return NextResponse.json({ error: 'Unable to build the report shell.' }, { status: 500 })
  }
}
