import type { GeeAssetConfig } from './geeImage'

/**
 * Runtime validator for a {@link GeeAssetConfig}. API routes use this
 * to guard against malformed request bodies before dispatching work to
 * Earth Engine. This checks SHAPE only, see `isAllowedAsset` in
 * `geeAllowlist.ts` for the security allowlist.
 */
export function isValidAsset(a: unknown): a is GeeAssetConfig {
  if (!a || typeof a !== 'object') return false
  const { type, id } = a as { type?: string; id?: string }
  return (
    (type === 'image' || type === 'imageCollection') &&
    typeof id === 'string' &&
    id.length > 0
  )
}

/**
 * Runtime validator for a `[minLon, minLat, maxLon, maxLat]` tuple used
 * as a clipping/sampling bbox in the GEE routes.
 */
export function isValidBbox(
  x: unknown,
): x is [number, number, number, number] {
  return (
    Array.isArray(x) &&
    x.length === 4 &&
    x.every((n) => typeof n === 'number' && Number.isFinite(n))
  )
}

// Upper bound for Jenks classes. The classifier is O(n²*k) and allocates
// (n+1)×(k+1) matrices, so an unbounded numClasses is a denial-of-service
// vector. No real layer uses more than 5 classes.
export const MAX_JENKS_CLASSES = 10

/**
 * Validate an optional `classify` block. Returns true when absent (continuous
 * layers) or when it's a well-formed Jenks request with a sane class count.
 */
export function isValidClassify(
  c: unknown,
): c is { numClasses: number; method: 'jenks' } | undefined {
  if (c === undefined || c === null) return true
  if (typeof c !== 'object') return false
  const { numClasses, method } = c as { numClasses?: unknown; method?: unknown }
  return (
    method === 'jenks' &&
    typeof numClasses === 'number' &&
    Number.isInteger(numClasses) &&
    numClasses >= 2 &&
    numClasses <= MAX_JENKS_CLASSES
  )
}

/** Finite lon/lat within geographic range. */
export function isValidLonLat(lon: unknown, lat: unknown): boolean {
  return (
    typeof lon === 'number' && Number.isFinite(lon) && lon >= -180 && lon <= 180 &&
    typeof lat === 'number' && Number.isFinite(lat) && lat >= -90  && lat <= 90
  )
}

// Recursively count leaf coordinate pairs in a GeoJSON coordinates array.
function countVertices(coords: unknown): number {
  if (!Array.isArray(coords)) return 0
  if (typeof coords[0] === 'number') return 1
  let n = 0
  for (const c of coords) n += countVertices(c)
  return n
}

// Generous cap, blocks the "millions of vertices" abuse case while
// comfortably allowing the detailed Caatinga boundary (~105k vertices).
export const MAX_VERTICES = 500_000

/** Validate a Polygon/MultiPolygon geometry with a vertex ceiling. */
export function validatePolygonGeometry(
  g: unknown,
): { ok: true } | { ok: false; error: string } {
  if (!g || typeof g !== 'object') return { ok: false, error: 'geometry must be an object' }
  const geom = g as { type?: string; coordinates?: unknown }
  if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') {
    return { ok: false, error: 'geometry must be a Polygon or MultiPolygon' }
  }
  if (!Array.isArray(geom.coordinates)) {
    return { ok: false, error: 'geometry.coordinates must be an array' }
  }
  const n = countVertices(geom.coordinates)
  if (n === 0) return { ok: false, error: 'geometry has no coordinates' }
  if (n > MAX_VERTICES) {
    return { ok: false, error: `geometry too complex (${n} vertices, max ${MAX_VERTICES})` }
  }
  return { ok: true }
}

/** Validate a FeatureCollection clip geometry with a total vertex ceiling. */
export function validateClipGeometry(
  g: unknown,
): { ok: true } | { ok: false; error: string } {
  if (!g || typeof g !== 'object') return { ok: false, error: 'clipGeometry must be an object' }
  const fc = g as { type?: string; features?: unknown }
  if (fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
    return { ok: false, error: 'clipGeometry must be a FeatureCollection' }
  }
  let n = 0
  for (const f of fc.features) {
    const geom = (f as { geometry?: { coordinates?: unknown } })?.geometry
    n += countVertices(geom?.coordinates)
  }
  if (n === 0) return { ok: false, error: 'clipGeometry has no coordinates' }
  if (n > MAX_VERTICES) {
    return { ok: false, error: `clipGeometry too complex (${n} vertices, max ${MAX_VERTICES})` }
  }
  return { ok: true }
}

const HEX_COLOR = /^#?[0-9a-fA-F]{6}$/

/**
 * Validate an optional `visParams` block. Returns true when absent or when
 * palette is an array of hex strings and min/max (if present) are finite.
 */
export function isValidVisParams(v: unknown): boolean {
  if (v === undefined || v === null) return true
  if (typeof v !== 'object') return false
  const { min, max, palette } = v as { min?: unknown; max?: unknown; palette?: unknown }
  if (min !== undefined && !(typeof min === 'number' && Number.isFinite(min))) return false
  if (max !== undefined && !(typeof max === 'number' && Number.isFinite(max))) return false
  if (palette !== undefined) {
    if (!Array.isArray(palette)) return false
    if (!palette.every((c) => typeof c === 'string' && HEX_COLOR.test(c))) return false
  }
  return true
}

// Reject request bodies above this size before parsing, a MultiPolygon of
// dozens of MB would otherwise be read fully into memory. The largest
// legitimate payload today is the ~2.5 MB Caatinga clip.
export const MAX_BODY_BYTES = 20 * 1024 * 1024

/** True when the request declares a Content-Length above the ceiling. */
export function bodyTooLarge(req: Request): boolean {
  const len = req.headers.get('content-length')
  if (!len) return false
  const n = Number(len)
  return Number.isFinite(n) && n > MAX_BODY_BYTES
}
