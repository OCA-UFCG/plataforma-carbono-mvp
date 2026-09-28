// Resolves, on the server, everything the results panel computes a layer with.
//
// The client sends a layer id, a geometry and a date, and nothing else. The
// stats route used to accept the whole asset block from the client
// (multiplier, offset, unmaskValue, reducer), checked only by `id::band`
// against the allowlist; resolving the block here from layers.json means a
// caller can no longer ask for a transformed image of an allowed asset.

import appConfig from '@/config/mapa/layers.json'
import { getResultProfile, type ResultProfile } from '@/config/mapa/resultProfiles'
import { getStocks, type EntradaStocks } from './stocksRegistry'
import type { GeeAssetConfig } from './geeImage'
import type { RasterLayerConfig } from '@/types/mapa'

export interface ResultLayer {
  layer:   RasterLayerConfig
  asset:   GeeAssetConfig
  profile: ResultProfile
  /** Stock report configuration, for the layers of the stocks archetype. */
  stocks:  EntradaStocks | null
}

const cache = new Map<string, ResultLayer | null>()

export function getResultLayer(layerId: string): ResultLayer | null {
  const cached = cache.get(layerId)
  if (cached !== undefined) return cached

  const layer = (appConfig.layers as { id: string; type: string }[]).find(
    (l) => l.id === layerId && l.type === 'raster',
  ) as RasterLayerConfig | undefined
  const profile = getResultProfile(layerId)
  const asset = layer?.gee?.asset as GeeAssetConfig | undefined

  let entry: ResultLayer | null = null
  if (layer && profile && asset) {
    const stocks = profile.archetype === 'stocks' ? getStocks(profile.source) : null
    // A stocks profile whose source has no stock block is a broken config, not
    // a layer to fall back on: refusing it keeps the panel from showing a
    // report computed from the wrong asset.
    if (profile.archetype !== 'stocks' || stocks?.assetId === asset.id) {
      entry = { layer, asset, profile, stocks }
    }
  }
  cache.set(layerId, entry)
  return entry
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * The date to compute a temporal layer at, checked against the years the layer
 * declares. A static layer ignores the date. Returns `null` for a date that is
 * malformed or outside the series, which the route answers with 400 instead of
 * letting a bad year reach Earth Engine as a band name.
 */
export function resolveTemporalDate(layer: RasterLayerConfig, raw: unknown): string | undefined | null {
  const temporal = layer.gee?.temporal
  if (!temporal || raw === undefined || raw === null) return undefined
  if (typeof raw !== 'string' || !ISO_DATE.test(raw)) return null

  const year = Number(raw.slice(0, 4))
  if (temporal.dates?.length) {
    return temporal.dates.some((d) => Number(d.slice(0, 4)) === year) ? raw : null
  }
  const [first, last] = temporal.dateRange.map((d) => Number(d.slice(0, 4)))
  return year >= first && year <= last ? raw : null
}
