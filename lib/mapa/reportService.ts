// Builds the report: the shell with no Earth Engine work, and then one analysis
// at a time.
//
// One analysis per call on purpose. Six layers are about twelve live Earth
// Engine reductions, and a zonal statistic that takes seconds over a
// municipality takes tens of seconds over a state; a single request for the
// whole document would time out and show a blank page while it ran. Splitting
// it also makes each analysis independently cacheable and retryable, and turns
// partial failure into a status on a section instead of an error on the page.

import 'server-only'

import appConfig from '@/config/mapa/layers.json'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { getReportLayer, MAX_REPORT_LAYERS, REPORT_LAYERS } from '@/config/mapa/reportLayers'
import { getEe, initGee } from '@/lib/mapa/geeAuth'
import { getFeicao } from '@/lib/mapa/recorteRegistry'
import { buildNarrative } from '@/lib/mapa/reportNarrative'
import {
  analysisCacheKey,
  getCachedAnalysis,
  setCachedAnalysis,
} from '@/lib/mapa/reportCache'
import { ano, paradas } from '@/lib/mapa/temporal'
import { computeSeries } from '@/lib/mapa/zonalSeries'
import { computeZonalStats } from '@/lib/mapa/zonalStats'
import type { RasterLayerConfig } from '@/types/mapa'
import type {
  ReportAnalysis,
  ReportAnalysisDescriptor,
  ReportRecorte,
  ReportShell,
} from '@/types/relatorio'

/** The recorte, the feature or the layer does not exist. */
export class ReportNotFoundError extends Error {}
/** The request is well-formed but asks for something the report does not offer. */
export class ReportBadRequestError extends Error {}

function rasterLayer(layerId: string): RasterLayerConfig {
  const layer = (appConfig.layers as RasterLayerConfig[]).find(
    (l) => l.id === layerId && l.type === 'raster',
  )
  if (!layer) throw new ReportNotFoundError('Layer not found.')
  return layer
}

function resolveRecorte(recorteId: string, feicaoId: string): ReportRecorte {
  const layer = appConfig.layers.find((l) => l.id === recorteId && l.type === 'vector')
  if (!layer) throw new ReportNotFoundError('Recorte not found.')

  const feicao = getFeicao(recorteId, feicaoId)
  if (!feicao) throw new ReportNotFoundError('Feature not found.')

  return {
    layerId:     recorteId,
    layerName:   layer.name,
    featureId:   feicao.id,
    featureName: feicao.name,
    areaHa:      feicao.areaHa,
    bbox:        feicao.bbox,
    boundary:    feicao.boundary,
  }
}

/** Years the layer can be asked for, as 4-digit strings. Empty when static. */
function availableYearsOf(layer: RasterLayerConfig): string[] {
  return layer.gee?.temporal ? paradas(layer.gee.temporal).map(ano) : []
}

function describe(layerId: string, requestedYear: string): ReportAnalysisDescriptor {
  const config = getReportLayer(layerId)
  if (!config) {
    throw new ReportBadRequestError('Layer is not eligible for the report.')
  }
  const layer = rasterLayer(layerId)
  const availableYears = availableYearsOf(layer)
  const isTemporal = availableYears.length > 0

  return {
    layerId,
    name:           layer.name,
    unit:           layer.unit,
    signedFlux:     layer.signedFlux,
    source:         LAYER_META[layerId]?.source ?? '',
    methodology:    config.methodology,
    sectionColor:   config.sectionColor,
    availableYears,
    // A static layer has no year to select, so the requested one does not
    // apply to it rather than being missing from it.
    requestedYear:  isTemporal ? requestedYear : null,
    effectiveYear:  isTemporal
      ? (availableYears.includes(requestedYear) ? requestedYear : null)
      : null,
  }
}

/** The document shell: identification plus the ordered descriptors. No GEE call. */
export function buildReportShell(input: {
  recorteId: string
  feicaoId:  string
  year:      string
  layerIds:  string[]
  now?:      () => Date
}): ReportShell {
  const { recorteId, feicaoId, year, layerIds } = input

  if (layerIds.length === 0) {
    throw new ReportBadRequestError('No layer was selected.')
  }

  const recorte = resolveRecorte(recorteId, feicaoId)
  const order = new Map(REPORT_LAYERS.map((entry) => [entry.layerId, entry.order]))
  const deduped = [...new Set(layerIds)]
  if (deduped.length > MAX_REPORT_LAYERS) {
    throw new ReportBadRequestError(
      `At most ${MAX_REPORT_LAYERS} layers can be selected.`,
    )
  }
  const selected = deduped.sort(
    (a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity),
  )

  return {
    schemaVersion: 1,
    generatedAt:   (input.now ?? (() => new Date()))().toISOString(),
    recorte,
    requestedYear: year,
    analyses:      selected.map((layerId) => describe(layerId, year)),
  }
}

/** One measured analysis: the year's snapshot, the series, and the prose. */
export async function buildReportAnalysis(input: {
  recorteId: string
  feicaoId:  string
  year:      string
  layerId:   string
}): Promise<ReportAnalysis> {
  const { recorteId, feicaoId, year, layerId } = input

  const cacheKey = analysisCacheKey(recorteId, feicaoId, year, layerId)
  const cached = getCachedAnalysis(cacheKey)
  if (cached) return cached

  const config = getReportLayer(layerId)
  if (!config) throw new ReportBadRequestError('Layer is not eligible for the report.')

  const recorte = resolveRecorte(recorteId, feicaoId)
  const feicao = getFeicao(recorteId, feicaoId)!
  const descriptor = describe(layerId, year)
  const layer = rasterLayer(layerId)
  const asset = layer.gee?.asset
  if (!asset) throw new ReportNotFoundError('Layer has no GEE asset.')

  const empty = (status: ReportAnalysis['status']): ReportAnalysis => ({
    ...descriptor,
    status,
    snapshot:  null,
    series:    [],
    narrative: { situation: null, trend: null, context: null },
  })

  // A temporal layer asked for a year it does not have is settled here, from
  // config, without spending a reduction. The section lists the years that do
  // exist instead of falling back to the nearest one and showing a number that
  // answers a different question.
  if (descriptor.availableYears.length > 0 && !descriptor.effectiveYear) {
    const result = empty('year_not_found')
    setCachedAnalysis(cacheKey, result)
    return result
  }

  await initGee()
  const ee = getEe()
  const temporalDate = descriptor.effectiveYear ? `${descriptor.effectiveYear}-01-01` : undefined

  const outcome = await computeZonalStats(ee, {
    asset,
    geometry:  feicao.geometry,
    temporalDate,
    classify:  layer.gee?.classify,
    breaks:    layer.gee?.classify?.breaks,
    colorType: layer.colorType,
    layerId:   layer.gee?.stocks ? layerId : undefined,
  })

  if (!outcome.ok) {
    console.error(`[reportService] ${layerId}: ${outcome.error} (${outcome.status})`)
    // Not cached: the cause is usually transient, and the section offers a retry.
    return empty('unavailable')
  }

  // The series is optional in a way the snapshot is not. Forty stops reduced
  // over a whole state can exceed the Earth Engine deadline, and losing it must
  // not lose the section: the snapshot, the map and the situation sentence
  // stand on their own.
  let series: ReportAnalysis['series'] = []
  const canHaveSeries =
    config.seriesKind !== 'none' &&
    descriptor.availableYears.length > 1 &&
    Boolean(layer.gee?.temporal)

  if (canHaveSeries) {
    try {
      series = await computeSeries(ee, {
        asset,
        anos: descriptor.availableYears.map(Number),
        region: {
          kind:     'zonal',
          geometry: feicao.geometry,
          // A floor, never a fixed value: it can only coarsen. CHIRPS is
          // natively 5566 m, and a literal 300 there would resample finer than
          // the data for no gain.
          scale:    Math.max(config.seriesScale ?? 0, asset.scale ?? 500),
        },
      })
    } catch (err) {
      console.warn(`[reportService] ${layerId}: série indisponível`, err)
    }
  }

  const analysis: ReportAnalysis = {
    ...descriptor,
    status:    'available',
    snapshot:  outcome.result,
    series,
    narrative: buildNarrative({
      recorte,
      layerName:     descriptor.name,
      unit:          descriptor.unit,
      signedFlux:    descriptor.signedFlux,
      classes:       layer.classes,
      config,
      status:        'available',
      effectiveYear: descriptor.effectiveYear,
      snapshot:      outcome.result,
      series,
    }),
  }

  setCachedAnalysis(cacheKey, analysis)
  return analysis
}
