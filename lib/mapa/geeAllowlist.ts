// Server-only allowlist of GEE assets. The API routes accept a full asset
// config from the client, but only assets that exactly match a layer defined
// in config/layers.json are permitted. Without this the routes would proxy
// the service account to ANY Earth Engine asset supplied by a caller.

import appConfig from '@/config/mapa/layers.json'
import { bandaDoAno, type GeeAssetConfig } from './geeImage'

function assetKey(id: string, band?: string): string {
  return `${id}::${band ?? ''}`
}

// Built once at module load from the configured layers.
const ALLOWED: ReadonlySet<string> = (() => {
  const set = new Set<string>()
  for (const layer of appConfig.layers) {
    const gee = (layer as {
      gee?: { asset?: GeeAssetConfig; temporal?: { dateRange: [string, string] } }
    }).gee
    const asset = gee?.asset
    if (!asset?.id) continue
    set.add(assetKey(asset.id, asset.band))

    // A per-band temporal layer asks for a different band each year
    // (`classification_1985` ... `classification_2024`). Without expanding the
    // range here, navigating in time would hit a 403 on the first stop that was
    // not the year configured in `asset.band`.
    if (asset.bandPattern && gee?.temporal) {
      const [ini, fim] = gee.temporal.dateRange.map((d) => Number(d.slice(0, 4)))
      for (let ano = ini; ano <= fim; ano++) {
        set.add(assetKey(asset.id, bandaDoAno(asset.bandPattern, String(ano))))
      }
    }
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
