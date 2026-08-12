import { NextResponse } from 'next/server'
import { initGee, getEe } from '@/lib/mapa/geeAuth'
import { bandaDoAno, buildEeImage, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { jenksBreaks } from '@/lib/mapa/jenks'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import {
  isValidAsset,
  isValidClassify,
  validatePolygonGeometry,
  bodyTooLarge,
} from '@/lib/mapa/geeValidation'
import { isAllowedAsset } from '@/lib/mapa/geeAllowlist'
import { rateLimit, clientIp } from '@/lib/mapa/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ReqBody {
  asset:         GeeAssetConfig
  geometry: {
    type:        'Polygon' | 'MultiPolygon'
    coordinates: unknown
  }
  temporalDate?: string   // ISO date, temporal mode: filter collection to this single month
  classify?: {
    numClasses: number
    method:     'jenks'
  }
  // Jenks break values computed once over the whole biome by /api/gee/tile.
  // Passed back here so the per-feature chart uses the SAME class cut points
  // as the map colors and legend, instead of recomputing breaks per feature.
  breaks?:   number[]
  colorType?: 'categorical' | 'continuous'
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
  if (!isValidClassify(body.classify)) {
    return NextResponse.json({ error: 'invalid classify block' }, { status: 400 })
  }
  const geomCheck = validatePolygonGeometry(body.geometry)
  if (!geomCheck.ok) {
    return NextResponse.json({ error: geomCheck.error }, { status: 400 })
  }

  try {
    await initGee()
  } catch (err) {
    console.error('[/api/gee/stats] auth error:', err)
    return NextResponse.json({ error: 'Earth Engine unavailable' }, { status: 503 })
  }

  const ee = getEe()
  const { asset, geometry, temporalDate, classify, colorType } = body
  // Only trust client-supplied breaks when they're a sane, ascending numeric array.
  const providedBreaks =
    Array.isArray(body.breaks) &&
    body.breaks.length > 0 &&
    body.breaks.every((n) => typeof n === 'number' && Number.isFinite(n))
      ? body.breaks
      : undefined

  try {
    const image  = buildEeImage(ee, asset, temporalDate)
    const region = ee.Geometry(geometry)
    const scale  = asset.scale ?? 500

    // Resolve band name
    let bandName = temporalDate && asset.bandPattern
      ? bandaDoAno(asset.bandPattern, temporalDate.slice(0, 4))
      : asset.band
    if (!bandName) {
      const bands = await evaluate<string[]>(image.bandNames())
      bandName = bands?.[0]
    }
    if (!bandName) {
      return NextResponse.json({ error: 'Could not determine band name' }, { status: 500 })
    }

    // Categorical branch: Jenks classify -> count per class
    if (classify?.method === 'jenks' && classify.numClasses >= 2) {
      const numClasses = classify.numClasses

      // Prefer the biome-wide breaks from /api/gee/tile so the chart classes
      // match the map colors and legend exactly. Only fall back to sampling
      // this feature when the client didn't supply them.
      let breaks: number[]
      if (providedBreaks) {
        breaks = providedBreaks
      } else {
        const sample = image.sample({
          region,
          scale,
          numPixels: 5000,
          seed:      42,
          geometries: false,
        })
        const values = await evaluate<number[]>(sample.aggregate_array(bandName))

        if (!values || values.length < numClasses) {
          return NextResponse.json(
            { error: `Not enough valid pixels (got ${values?.length ?? 0})` },
            { status: 422 },
          )
        }
        breaks = jenksBreaks(values, numClasses)
      }

      let classified = ee.Image.constant(1).toInt()
      for (let i = 0; i < breaks.length; i++) {
        classified = classified.where(image.gt(breaks[i]), i + 2)
      }
      classified = classified.updateMask(image.mask())

      // Area (m²) per class via pixelArea summed and grouped by class. Robust
      // to bestEffort rescaling (area is conserved), a pixel count would be
      // wrong whenever GEE coarsens the scale for a large region.
      const areaImg = ee.Image.pixelArea().addBands(classified)
      const grouped = areaImg.reduceRegion({
        reducer:    ee.Reducer.sum().group({ groupField: 1, groupName: 'class' }),
        geometry:   region,
        scale,
        maxPixels:  1e9,
        bestEffort: true,
      })

      const raw = await evaluate<{ groups?: { class: number; sum: number }[] }>(grouped)
      const areas: Record<string, number> = {}
      for (const g of raw.groups ?? []) {
        areas[String(Math.trunc(Number(g.class)))] = g.sum
      }

      return NextResponse.json({ kind: 'categorical', areas, breaks })
    }

    // Raw categorical branch: frequency histogram on the original image
    // Used when the layer is already classified (integer pixel values that
    // correspond to classes in layers.json) and no Jenks is required.
    if (colorType === 'categorical') {
      // Area (m²) per class code via pixelArea grouped by the classification.
      const areaImg = ee.Image.pixelArea().addBands(image)
      const grouped = areaImg.reduceRegion({
        reducer:    ee.Reducer.sum().group({ groupField: 1, groupName: 'class' }),
        geometry:   region,
        scale,
        maxPixels:  1e9,
        bestEffort: true,
      })

      const raw = await evaluate<{ groups?: { class: number; sum: number }[] }>(grouped)
      const areas: Record<string, number> = {}
      for (const g of raw.groups ?? []) {
        // Normalize "1.0" -> "1" so the legend lookup by integer value works
        const intKey = String(Math.trunc(Number(g.class)))
        areas[intKey] = (areas[intKey] ?? 0) + g.sum
      }

      if (Object.keys(areas).length === 0) {
        return NextResponse.json(
          { error: 'No valid pixels in the given geometry' },
          { status: 422 },
        )
      }

      return NextResponse.json({ kind: 'categorical', areas })
    }

    // Continuous branch: numeric stats
    const combined = ee.Reducer.mean()
      .combine({ reducer2: ee.Reducer.minMax(), sharedInputs: true })
      .combine({ reducer2: ee.Reducer.median(), sharedInputs: true })
      .combine({ reducer2: ee.Reducer.stdDev(), sharedInputs: true })
      .combine({ reducer2: ee.Reducer.count(),  sharedInputs: true })
      .combine({ reducer2: ee.Reducer.sum(),    sharedInputs: true })

    const reduced = image.reduceRegion({
      reducer:    combined,
      geometry:   region,
      scale,
      maxPixels:  1e9,
      bestEffort: true,
    })

    const raw = await evaluate<Record<string, number | null>>(reduced)

    const get = (suffix: string): number | undefined => {
      const v = raw[`${bandName}_${suffix}`]
      return typeof v === 'number' && Number.isFinite(v) ? v : undefined
    }

    const mean   = get('mean')
    const min    = get('min')
    const max    = get('max')
    const median = get('median')
    const std    = get('stdDev')
    const count  = get('count')
    const sum    = get('sum')

    if (mean === undefined || min === undefined || max === undefined || count === undefined) {
      return NextResponse.json(
        { error: 'No valid pixels in the given geometry' },
        { status: 422 },
      )
    }

    return NextResponse.json({
      kind:  'continuous',
      stats: { min, max, mean, median, std, count, sum },
    })
  } catch (err) {
    console.error('[/api/gee/stats] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
