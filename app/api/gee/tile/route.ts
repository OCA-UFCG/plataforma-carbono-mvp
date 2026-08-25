import { NextResponse } from 'next/server'
import { initGee, getEe } from '@/lib/mapa/geeAuth'
import { buildEeImage, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { jenksBreaks } from '@/lib/mapa/jenks'
import { evaluate, withTimeout, GEE_TIMEOUT_MS } from '@/lib/mapa/geeEvaluate'
import {
  isValidAsset,
  isValidBbox,
  isValidClassify,
  isValidVisParams,
  validateClipGeometry,
  bodyTooLarge,
} from '@/lib/mapa/geeValidation'
import { isAllowedAsset } from '@/lib/mapa/geeAllowlist'
import { rateLimit, clientIp } from '@/lib/mapa/rateLimit'
import { getClip } from '@/lib/mapa/clipRegistry'
import { getTileCache, setTileCache } from '@/lib/mapa/tileCache'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ReqBody {
  asset:          GeeAssetConfig
  clipId?:        string   // vector layer id, server reads the local GeoJSON (preferred)
  clipGeometry?:  unknown  // GeoJSON FeatureCollection, clips to exact boundary (legacy)
  clipBbox?:      [number, number, number, number]  // legacy fallback [minLon, minLat, maxLon, maxLat]
  temporalDate?:  string   // ISO date string, temporal mode: filter collection to this single month
  visParams?: {
    min?:    number
    max?:    number
    palette?: string[]
  }
  classify?: {
    numClasses: number
    method:     'jenks'
    breaks?:    number[]  // pre-computed offline; skips live sampling when present
  }
}

/**
 * Promisify `ee.Image.getMap()`, which returns a tile URL template for
 * serving rendered imagery over XYZ. Stays route-local because no other
 * route needs a tile URL.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function promisifyGetMap(image: any, visParams: Record<string, unknown>): Promise<{ urlFormat: string }> {
  return withTimeout(
    new Promise<{ urlFormat: string }>((resolve, reject) => {
      image.getMap(visParams, (result: unknown, err: unknown) => {
        if (err) {
          reject(new Error(`ee.Image.getMap failed: ${String(err)}`))
          return
        }
        if (!result || typeof (result as { urlFormat?: string }).urlFormat !== 'string') {
          reject(new Error('ee.Image.getMap returned no urlFormat'))
          return
        }
        resolve(result as { urlFormat: string })
      })
    }),
    GEE_TIMEOUT_MS,
    'ee.Image.getMap',
  )
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

  if (!isValidAsset(body.asset)) {
    return NextResponse.json(
      { error: 'asset must be { type: "image" | "imageCollection", id: string }' },
      { status: 400 },
    )
  }
  if (!isAllowedAsset(body.asset)) {
    return NextResponse.json({ error: 'asset not allowed' }, { status: 403 })
  }
  if (!isValidClassify(body.classify)) {
    return NextResponse.json({ error: 'invalid classify block' }, { status: 400 })
  }
  if (!isValidVisParams(body.visParams)) {
    return NextResponse.json({ error: 'invalid visParams' }, { status: 400 })
  }
  if (body.clipId !== undefined && typeof body.clipId !== 'string') {
    return NextResponse.json({ error: 'clipId must be a string' }, { status: 400 })
  }
  if (body.clipBbox !== undefined && !isValidBbox(body.clipBbox)) {
    return NextResponse.json({ error: 'clipBbox must be [minLon, minLat, maxLon, maxLat]' }, { status: 400 })
  }
  if (body.clipGeometry !== undefined) {
    const v = validateClipGeometry(body.clipGeometry)
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  }

  const { asset, temporalDate, visParams: clientVis, classify } = body

  // Resolve the clip: prefer a server-side clipId (reads the local GeoJSON, no
  // multi-MB upload) over a client-supplied inline geometry.
  let clipGeometry: unknown = body.clipGeometry
  let clipBbox = body.clipBbox
  let clipAssetId: string | undefined
  if (body.clipId) {
    const clip = getClip(body.clipId)
    if (!clip) {
      return NextResponse.json({ error: `unknown clipId "${body.clipId}"` }, { status: 400 })
    }
    if ('assetId' in clip) {
      clipAssetId = clip.assetId
    } else {
      clipGeometry = clip.geometry
      clipBbox = clip.bbox
    }
  }

  // Server cache: same params -> same tile. A hit skips auth + GEE entirely.
  // Skip caching when the clip is an inline geometry so we never hash a
  // multi-MB payload (the clipId path covers all real layers).
  const cacheKey =
    body.clipGeometry === undefined
      ? JSON.stringify({
          id: asset.id, band: asset.band, scale: asset.scale,
          vmin: asset.validMin, vmax: asset.validMax,
          // Without this the two ESA CCI layers, which start from the same asset
          // and the same band and differ only by the unmask, would collide in the cache.
          unmask: asset.unmaskValue,
          filterDate: asset.filterDate,
          bandPattern: asset.bandPattern,
          clipId: body.clipId ?? null, clipBbox, temporalDate,
          vis: clientVis, classify,
        })
      : null
  if (cacheKey) {
    const hit = getTileCache(cacheKey)
    if (hit) return NextResponse.json(hit)
  }

  try {
    await initGee()
  } catch (err) {
    console.error('[/api/gee/tile] auth error:', err)
    return NextResponse.json({ error: 'Earth Engine unavailable' }, { status: 503 })
  }

  const ee = getEe()

  try {
    let image = buildEeImage(ee, asset, temporalDate)

    // Optional clipping, prefer exact geometry, fall back to bbox rectangle.
    // When both are provided, the bbox is used for fast sampling (Jenks)
    // while the exact geometry is used for the final visual clip.
    let clipRegion: unknown = null   // exact boundary for image.clip()
    let sampleRegion: unknown = null // fast rectangle for pixel sampling
    if (clipAssetId) {
      // Native GEE asset: indexed by GEE, so clipping at FULL boundary detail
      // is fast (~2s), no simplification needed, sharp edges.
      clipRegion = ee.FeatureCollection(clipAssetId).geometry()
      image = image.clip(clipRegion)
      // Only used by the live-Jenks fallback (offline breaks skip sampling).
      sampleRegion = clipRegion
    } else if (clipGeometry && typeof clipGeometry === 'object') {
      const fc = ee.FeatureCollection(clipGeometry)
      // Simplify the boundary aggressively (500m) before clipping. The biome
      // outline has ~105k vertices; a detailed clip makes every tile slower to
      // render on GEE. At 500m the edge is visually identical at biome scale.
      // (Keep in sync with CLIP_SIMPLIFY_M in scripts/compute-breaks.mjs.)
      clipRegion = fc.geometry().simplify(500)
      image = image.clip(clipRegion)
      // Use the bbox rectangle for sampling if available (much faster)
      sampleRegion = clipBbox ? ee.Geometry.Rectangle(clipBbox) : clipRegion
    } else if (clipBbox) {
      clipRegion = ee.Geometry.Rectangle(clipBbox)
      sampleRegion = clipRegion
      image = image.clip(clipRegion)
    }

    // Jenks classification branch
    if (classify?.method === 'jenks' && classify.numClasses >= 2) {
      const numClasses = classify.numClasses

      // Prefer pre-computed breaks from the config ("Jenks offline"): this skips
      // the costly sample + evaluate round-trip (the dominant cost of loading a
      // classified layer). Fall back to live sampling when they're absent -
      // handy while experimenting with class counts before freezing them.
      let breaks: number[]
      const cfgBreaks = classify.breaks
      if (
        Array.isArray(cfgBreaks) &&
        cfgBreaks.length === numClasses - 1 &&
        cfgBreaks.every((n) => typeof n === 'number' && Number.isFinite(n))
      ) {
        breaks = cfgBreaks
      } else {
        const scale = asset.scale ?? 500

        // Sample pixel values, use the fast rectangle when available
        const sampleArea = sampleRegion ?? image.geometry()
        const sample = image.sample({
          region:    sampleArea,
          scale,
          numPixels: 5000,
          seed:      42,
          geometries: false,
        })

        // Resolve the band name we'll extract samples from. For explicit
        // band selection (collections with `asset.band`), use that. For bare
        // images without a band hint, query the image metadata.
        let bandName = asset.band
        if (!bandName) {
          const bands = await evaluate<string[]>(image.bandNames())
          bandName = bands?.[0]
        }
        if (!bandName) {
          return NextResponse.json(
            { error: 'Could not determine band name for sampling' },
            { status: 500 },
          )
        }

        const values = await evaluate<number[]>(sample.aggregate_array(bandName))

        if (!values || values.length < numClasses) {
          return NextResponse.json(
            { error: `Not enough valid pixels to classify (got ${values?.length ?? 0})` },
            { status: 422 },
          )
        }

        breaks = jenksBreaks(values, numClasses)
      }

      // Reclassify: pixels become integer class 1...N
      let classified = ee.Image.constant(1).toInt()
      for (let i = 0; i < breaks.length; i++) {
        classified = classified.where(image.gt(breaks[i]), i + 2)
      }
      classified = classified.updateMask(image.mask())

      const palette = (clientVis?.palette ?? []).map((c) => c.replace('#', ''))
      if (palette.length < numClasses) {
        return NextResponse.json(
          { error: `visParams.palette must have at least ${numClasses} colors` },
          { status: 400 },
        )
      }

      const { urlFormat } = await promisifyGetMap(classified, {
        min:     1,
        max:     numClasses,
        palette: palette.slice(0, numClasses),
      })

      const result = { tileUrl: urlFormat, breaks }
      if (cacheKey) setTileCache(cacheKey, result)
      return NextResponse.json(result)
    }

    // Plain visualization branch
    const palette = (clientVis?.palette ?? []).map((c) => c.replace('#', ''))
    const visParams: Record<string, unknown> = {}
    if (clientVis?.min !== undefined) visParams.min = clientVis.min
    if (clientVis?.max !== undefined) visParams.max = clientVis.max
    if (palette.length > 0)           visParams.palette = palette

    const { urlFormat } = await promisifyGetMap(image, visParams)

    const result = { tileUrl: urlFormat }
    if (cacheKey) setTileCache(cacheKey, result)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/gee/tile] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
