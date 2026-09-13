/**
 * GET /api/mapa/relatorio/analise?recorte=&feicao=&ano=&camada=
 *
 * One measured analysis: the year's snapshot, the zonal series and the prose.
 * The client calls it once per section, with limited concurrency, so each Earth
 * Engine reduction is its own short request instead of one long one for the
 * whole document.
 *
 * An unavailable analysis comes back 200 with `status: "unavailable"`, not as an
 * error: one layer failing must leave the rest of the document standing. Only a
 * malformed request or an unknown recorte is a 4xx.
 *
 * GET and no asset allowlist, for the reasons written in ../base/route.ts.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/mapa/rateLimit'
import {
  buildReportAnalysis,
  ReportBadRequestError,
  ReportNotFoundError,
} from '@/lib/mapa/reportService'

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
  const layerId   = params.get('camada')?.trim() ?? ''

  if (!RECORTE_PATTERN.test(recorteId)) {
    return NextResponse.json({ error: 'Invalid recorte.' }, { status: 400 })
  }
  if (!FEICAO_PATTERN.test(feicaoId)) {
    return NextResponse.json({ error: 'Invalid feature.' }, { status: 400 })
  }
  if (!YEAR_PATTERN.test(year)) {
    return NextResponse.json({ error: 'Invalid year.' }, { status: 400 })
  }
  if (!LAYER_PATTERN.test(layerId)) {
    return NextResponse.json({ error: 'Invalid layer id.' }, { status: 400 })
  }

  try {
    const analysis = await buildReportAnalysis({ recorteId, feicaoId, year, layerId })
    // reportCache.ts deliberately refuses to cache an 'unavailable' analysis —
    // caching it would hold a broken section for ninety minutes. Sending the
    // browser the same 30-minute freshness header for that body defeats the
    // point: the retry button re-requests the identical URL and the browser
    // serves the stale failure without ever reaching the server.
    const cacheControl = analysis.status === 'available'
      ? 'private, max-age=1800'
      : 'no-store'
    return NextResponse.json(analysis, {
      headers: { 'Cache-Control': cacheControl },
    })
  } catch (err) {
    if (err instanceof ReportNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof ReportBadRequestError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    // Deliberately generic: an Earth Engine failure must not leak the
    // credentials path into a response body.
    console.error('[/api/mapa/relatorio/analise] error:', err)
    return NextResponse.json({ error: 'Unable to build the analysis.' }, { status: 500 })
  }
}
