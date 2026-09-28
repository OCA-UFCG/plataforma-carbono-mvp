/**
 * GET /api/territorios/tema?recorte=&feicao=&tema=
 *
 * One theme step of a Territórios story. The client asks for each step as it
 * enters it, so every Earth Engine reduction is its own short request.
 *
 * A failed computation comes back 200 with `status: "unavailable"`, as in
 * ../../mapa/relatorio/analise/route.ts: the step shows a retry instead of the
 * whole story failing. Only a malformed request or an unknown feature is a 4xx.
 * The client never sends an asset or a geometry.
 */

import { NextResponse } from 'next/server'
import { STORY_THEMES } from '@/config/territorios/story'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/mapa/rateLimit'
import { getTheme, TerritoryNotFoundError } from '@/lib/territorios/themeService'
import type { ThemeId } from '@/types/territorios'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RECORTE_PATTERN = /^[a-z0-9_-]{1,80}$/u
const FEICAO_PATTERN  = /^[a-z0-9-]{1,120}$/u

function isThemeId(value: string): value is ThemeId {
  return STORY_THEMES.some((t) => t.id === value)
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
  const recorteId = params.get('recorte')?.trim() ?? ''
  const featureId = params.get('feicao')?.trim() ?? ''
  const theme     = params.get('tema')?.trim() ?? ''

  if (!RECORTE_PATTERN.test(recorteId)) {
    return NextResponse.json({ error: 'Invalid recorte.' }, { status: 400 })
  }
  if (!FEICAO_PATTERN.test(featureId)) {
    return NextResponse.json({ error: 'Invalid feature.' }, { status: 400 })
  }
  if (!isThemeId(theme)) {
    return NextResponse.json({ error: 'Invalid theme.' }, { status: 400 })
  }

  try {
    const response = await getTheme(recorteId, featureId, theme)
    // The service never caches 'unavailable'; a browser-side max-age would
    // make the retry button replay the stale failure without reaching it.
    const cacheControl = response.status === 'unavailable'
      ? 'no-store'
      : 'private, max-age=1800'
    return NextResponse.json(response, { headers: { 'Cache-Control': cacheControl } })
  } catch (err) {
    if (err instanceof TerritoryNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    // Deliberately generic: an Earth Engine failure must not leak the
    // credentials path into a response body.
    console.error('[/api/territorios/tema] error:', err)
    return NextResponse.json({ error: 'Unable to load the theme.' }, { status: 500 })
  }
}
