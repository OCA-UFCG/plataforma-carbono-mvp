// Server side of /api/gee/scale: which layers and features can re-scale, and
// the scale itself, cached per layer and feature. The data is static, so an
// answer is reused across users for a day; module scope, like tileCache.ts.

import 'server-only'

import appConfig from '@/config/mapa/layers.json'
import { getEe } from '@/lib/mapa/geeAuth'
import { layerYears } from '@/lib/mapa/dataRange'
import type { GeeAssetConfig } from '@/lib/mapa/geeImage'
import { getFeicaoByIndex, listRecortes, type FeicaoResolvida } from '@/lib/mapa/recorteRegistry'
import { reduceRecorteStats } from '@/lib/mapa/recorteScaleCompute'
import { recorteScale, STATIC_KEY, type ScaleResponse } from '@/lib/mapa/recorteScale'
import type { RasterLayerConfig } from '@/types/mapa'

/** A continuous Earth Engine raster, whose colors can follow a recorte. */
export function getScaleLayer(layerId: string): RasterLayerConfig | null {
  const layer = (appConfig.layers as { id: string; type: string }[])
    .find((l) => l.id === layerId && l.type === 'raster') as RasterLayerConfig | undefined
  if (!layer || layer.colorType !== 'continuous' || layer.source !== 'gee' || !layer.gee?.asset) return null
  return layer
}

/**
 * The selected feature, when its recorte can re-scale the layer. The recorte
 * the layer is clipped to (the biome) is refused: its scale is the default one.
 */
export function getScaleFeicao(
  layer: RasterLayerConfig,
  recorteId: string,
  feicaoIndex: number,
): FeicaoResolvida | null {
  if (recorteId === layer.clipToLayerId) return null
  if (!listRecortes().some((r) => r.layerId === recorteId)) return null
  return getFeicaoByIndex(recorteId, feicaoIndex)
}

const TTL_MS = 24 * 60 * 60 * 1000
const MAX_ENTRIES = 5000

const cache = new Map<string, { value: ScaleResponse; expires: number }>()
const inFlight = new Map<string, Promise<ScaleResponse>>()

export function cachedRecorteScale(key: string): ScaleResponse | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    cache.delete(key)
    return null
  }
  return hit.value
}

/**
 * The scale of `layer` inside `feicao`. A second request for the same key while
 * the first runs (a double click, two users) waits on the same computation. A
 * failure is not cached, so the next selection tries again. Earth Engine must
 * already be initialized: the route answers 503 itself when it is not.
 */
export function computeRecorteScale(
  key: string,
  layer: RasterLayerConfig,
  feicao: FeicaoResolvida,
): Promise<ScaleResponse> {
  const hit = cachedRecorteScale(key)
  if (hit) return Promise.resolve(hit)
  const running = inFlight.get(key)
  if (running) return running

  const gee = layer.gee!
  const run = (async () => {
    const keys = gee.temporal ? layerYears(gee.temporal) : [STATIC_KEY]
    const byYear = await reduceRecorteStats(
      getEe(), gee.asset as GeeAssetConfig, keys, feicao.geometry, feicao.areaHa * 10_000)
    const value = recorteScale(layer, byYear)
    cache.set(key, { value, expires: Date.now() + TTL_MS })
    if (cache.size > MAX_ENTRIES) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
    return value
  })().finally(() => inFlight.delete(key))

  inFlight.set(key, run)
  return run
}
