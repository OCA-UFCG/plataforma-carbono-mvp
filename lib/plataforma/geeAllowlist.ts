// Server-only allowlist of GEE assets. The API routes accept a full asset
// config from the client, but only assets that exactly match a layer defined
// in config/layers.json are permitted. Without this the routes would proxy
// the service account to ANY Earth Engine asset supplied by a caller.

import appConfig from '@/config/plataforma/layers.json'
import type { GeeAssetConfig } from './geeImage'

function assetKey(id: string, band?: string): string {
  return `${id}::${band ?? ''}`
}

// Built once at module load from the configured layers.
const ALLOWED: ReadonlySet<string> = (() => {
  const set = new Set<string>()
  for (const layer of appConfig.layers) {
    const asset = (layer as { gee?: { asset?: GeeAssetConfig } }).gee?.asset
    if (asset?.id) set.add(assetKey(asset.id, asset.band))
  }
  return set
})()

/**
 * True when `asset` (by id + band) matches a layer configured in
 * config/layers.json. Callers should have already run {@link isValidAsset}
 * to confirm the shape.
 */
export function isAllowedAsset(asset: GeeAssetConfig): boolean {
  return ALLOWED.has(assetKey(asset.id, asset.band))
}
