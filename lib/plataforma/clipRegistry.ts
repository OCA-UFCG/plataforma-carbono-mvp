// Server-only registry of clip regions. The client sends just a `clipId` (a
// vector layer id from config/layers.json); the server resolves it here.
//
// Two backends, in order of preference:
//   1. A native GEE asset (`clipAsset` on the vector layer), indexed by GEE,
//      so clipping is fast (~2s) even at full boundary detail.
//   2. The local GeoJSON file, preferring a pre-simplified `<name>_clip.geojson`
//      (few hundred vertices) because clipping to the full ~105k-vertex boundary
//      makes getMap take ~50s per layer.

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import appConfig from '@/config/plataforma/layers.json'
import { computeBbox } from '@/lib/plataforma/computeBbox'

type Bbox = [number, number, number, number]

type ClipEntry =
  | { assetId: string }                    // native GEE FeatureCollection asset
  | { geometry: unknown; bbox: Bbox }      // local GeoJSON (geometry-only FC + bbox)

const cache = new Map<string, ClipEntry>()

/** Resolve a clip layer id to a GEE asset id or a local geometry, or null. */
export function getClip(clipId: string): ClipEntry | null {
  const cached = cache.get(clipId)
  if (cached) return cached

  const layer = appConfig.layers.find(
    (l) => l.id === clipId && l.type === 'vector',
  ) as { url?: string; clipAsset?: string } | undefined
  if (!layer) return null

  // 1. Native GEE asset, fastest, full detail.
  if (layer.clipAsset) {
    const entry: ClipEntry = { assetId: layer.clipAsset }
    cache.set(clipId, entry)
    return entry
  }

  // 2. Local GeoJSON (coarse file when available).
  if (!layer.url) return null
  try {
    const coarseUrl = layer.url.replace(/\.geojson$/, '_clip.geojson')
    const coarsePath = path.join(process.cwd(), 'public', coarseUrl)
    const fullPath = path.join(process.cwd(), 'public', layer.url)
    const filePath = existsSync(coarsePath) ? coarsePath : fullPath
    const geojson = JSON.parse(readFileSync(filePath, 'utf-8')) as {
      features?: { geometry: unknown }[]
    }
    const bbox = computeBbox(geojson)
    const geometry = {
      type: 'FeatureCollection',
      features: (geojson.features ?? []).map((f) => ({
        type: 'Feature',
        geometry: f.geometry,
        properties: {},
      })),
    }
    const entry: ClipEntry = { geometry, bbox }
    cache.set(clipId, entry)
    return entry
  } catch {
    return null
  }
}
