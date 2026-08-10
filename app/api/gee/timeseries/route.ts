/**
 * POST /api/gee/timeseries
 *
 * Devolve a série anual do valor de pixel num [lon, lat]. Cada ano é montado
 * pelo mesmo `buildEeImage` que serve o tile e a estatística zonal, então o
 * gráfico e o mapa mostram o mesmo número, na mesma unidade, com a mesma
 * máscara. Os anos vão como bandas de uma imagem só e saem num `reduceRegion`
 * único, em vez de uma requisição por ano.
 *
 * Serve as duas formas de série que a plataforma tem: coleção filtrada por
 * data e imagem com o ano no nome da banda (`bandPattern`).
 */

import { NextResponse } from 'next/server'
import { initGee, getEe } from '@/lib/mapa/geeAuth'
import { buildEeImage, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import { isValidAsset, isValidLonLat, bodyTooLarge } from '@/lib/mapa/geeValidation'
import { isAllowedAsset } from '@/lib/mapa/geeAllowlist'
import { rateLimit, clientIp } from '@/lib/mapa/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Teto de anos por requisição. O MapBiomas cobre 1985 a 2024, quarenta paradas,
// então o limite antigo de vinte anos deixaria metade da série de fora.
const MAX_ANOS = 50

interface ReqBody {
  asset:     GeeAssetConfig
  lon:       number
  lat:       number
  dateRange: [string, string]  // ["1985-01-01", "2024-01-01"]
}

/** Valida o intervalo e devolve a lista de anos, ou null se estiver fora das regras. */
function anosDoIntervalo(r: unknown): number[] | null {
  if (!Array.isArray(r) || r.length !== 2) return null
  const [a, b] = r
  if (typeof a !== 'string' || typeof b !== 'string') return null
  const ini = Number(a.slice(0, 4))
  const fim = Number(b.slice(0, 4))
  if (!Number.isInteger(ini) || !Number.isInteger(fim)) return null
  if (ini < 1970 || fim > 2100 || ini > fim) return null
  if (fim - ini + 1 > MAX_ANOS) return null
  return Array.from({ length: fim - ini + 1 }, (_, i) => ini + i)
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
  const anos = anosDoIntervalo(body.dateRange)
  if (!anos) {
    return NextResponse.json(
      { error: `dateRange must be two ISO dates spanning at most ${MAX_ANOS} years` },
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
  const { asset, lon, lat } = body

  try {
    // Coleção com lacuna, como a do ESA CCI, que só tem 2007, 2010 e 2015 a
    // 2022: pedir um ano vazio faz o redutor devolver imagem sem banda e a
    // montagem inteira falhar. Uma consulta barata aos anos existentes evita
    // isso e, de quebra, faz a série mostrar só as paradas reais.
    let anosUteis = anos
    if (!asset.bandPattern && asset.type === 'imageCollection') {
      const disponiveis = await evaluate<number[]>(
        ee.ImageCollection(asset.id)
          .filterDate(`${anos[0]}-01-01`, `${anos[anos.length - 1] + 1}-01-01`)
          .aggregate_array('system:time_start')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((t: any) => ee.Date(t).get('year'))
          .distinct(),
      )
      const comDado = new Set(disponiveis ?? [])
      anosUteis = anos.filter((a) => comDado.has(a))
      if (anosUteis.length === 0) return NextResponse.json({ series: [] })
    }

    // Um ano por banda, cada uma construída pelo mesmo caminho que serve o
    // tile, o que garante a mesma unidade e a mesma máscara no gráfico e no mapa.
    const porAno = anosUteis.map((ano) =>
      buildEeImage(ee, asset, `${ano}-01-01`).rename(`a${ano}`),
    )

    const point = ee.Geometry.Point([lon, lat])
    const scale = asset.scale ?? 500

    const valores = await evaluate<Record<string, unknown>>(
      ee.Image.cat(porAno).reduceRegion({
        reducer:   ee.Reducer.first(),
        geometry:  point,
        scale,
        // O teto conta uma leitura por banda, e aqui há uma banda por ano.
        maxPixels: anosUteis.length,
      }),
    )

    const series = anosUteis.map((ano) => {
      const bruto = valores?.[`a${ano}`]
      return {
        date:  `${ano}-01-01`,
        value: typeof bruto === 'number' && Number.isFinite(bruto) ? bruto : null,
      }
    })

    return NextResponse.json({ series })
  } catch (err) {
    console.error('[/api/gee/timeseries] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
