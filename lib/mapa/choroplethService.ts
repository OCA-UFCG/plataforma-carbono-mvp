// Server side of /api/gee/choropleth: which layers and recortes can be drawn
// by feature, and the values, cached per layer and recorte. The data is
// static, so an answer is reused across users for a day; module scope, like
// tileCache.ts.

import 'server-only'

import appConfig from '@/config/mapa/layers.json'
import { getEe } from '@/lib/mapa/geeAuth'
import { layerYears } from '@/lib/mapa/dataRange'
import type { GeeAssetConfig } from '@/lib/mapa/geeImage'
import { featureGeometries } from '@/lib/mapa/recorteRegistry'
import { reduceChoropleth } from '@/lib/mapa/choroplethCompute'
import { choroplethRange, isChoroplethLayer, STATIC_KEY, type ChoroplethResponse } from '@/lib/mapa/choropleth'
import type { LayerConfig, RasterLayerConfig } from '@/types/mapa'

const LAYERS = appConfig.layers as LayerConfig[]

/** A continuous Earth Engine quantity, which can be drawn by feature. */
export function getChoroplethLayer(layerId: string): RasterLayerConfig | null {
  const layer = LAYERS.find((l) => l.id === layerId)
  return layer && isChoroplethLayer(layer) ? layer : null
}

/** A recorte declaring `choropleth` in layers.json (Estados, Municípios). */
export function isChoroplethRecorte(recorteId: string): boolean {
  return LAYERS.some((l) => l.id === recorteId && l.type === 'vector' && !!l.choropleth)
}

const TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map<string, { value: ChoroplethResponse; expires: number }>()
const inFlight = new Map<string, Promise<ChoroplethResponse>>()

export function cachedChoropleth(key: string): ChoroplethResponse | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    cache.delete(key)
    return null
  }
  return hit.value
}

/**
 * The values of `layer` by feature of `recorteId`, every year at once. A second
 * request for the same key while the first runs waits on the same computation;
 * a failure is not cached. Earth Engine must already be initialized: the route
 * answers 503 itself when it is not.
 */
export function computeChoropleth(
  key: string,
  layer: RasterLayerConfig,
  recorteId: string,
): Promise<ChoroplethResponse> {
  const hit = cachedChoropleth(key)
  if (hit) return Promise.resolve(hit)
  const running = inFlight.get(key)
  if (running) return running

  const gee = layer.gee!
  const run = (async () => {
    const features = featureGeometries(recorteId)
    if (!features) throw new Error(`recorte "${recorteId}" has no features`)
    const keys = gee.temporal ? layerYears(gee.temporal) : [STATIC_KEY]
    const values = await reduceChoropleth(getEe(), gee.asset as GeeAssetConfig, keys, features)
    const value: ChoroplethResponse = { keys, values, range: choroplethRange(layer, values) }
    cache.set(key, { value, expires: Date.now() + TTL_MS })
    return value
  })().finally(() => inFlight.delete(key))

  inFlight.set(key, run)
  return run
}
