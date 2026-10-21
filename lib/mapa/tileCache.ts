// Server-side in-memory cache for /api/gee/tile results. The tile for a given
// layer is always the same asset clipped to the same biome with the same
// classification, so the sample + Jenks + getMap work is identical across
// reloads and users. GEE getMap URLs stay valid for ~2 days; we expire well
// before that. Single-instance only (module scope), fine for one Render node.

interface TileResult {
  tileUrl: string
  breaks?: number[]
}

interface Entry {
  value: TileResult
  expires: number
}

const TTL_MS = 90 * 60 * 1000  // 90 minutes
const MAX_ENTRIES = 200

const cache = new Map<string, Entry>()

export function getTileCache(key: string): TileResult | null {
  const e = cache.get(key)
  if (!e) return null
  if (Date.now() > e.expires) {
    cache.delete(key)
    return null
  }
  return e.value
}

export function setTileCache(key: string, value: TileResult): void {
  cache.set(key, { value, expires: Date.now() + TTL_MS })
  // Bound memory: drop the oldest inserted entry when over capacity.
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}
