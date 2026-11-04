// Thins the boundary of a huge recorte before a reduction reads it.
//
// The biome boundary has 108k vertices. Sent whole, every reduction over it ran
// 32 to 80 s against the deadline, while Bahia (353k km², 4.5k vertices)
// answered in 4 to 27 s: what Earth Engine pays for is the vertex count, not
// only the area. The biome is also the only recorte feature above ~25k vertices, so
// that is the only geometry this touches: below SIMPLIFY_MIN_VERTICES it goes
// through untouched. At SIMPLIFY_TOLERANCE_M the biome drops to ~20k vertices,
// its area moves by 0.0003% and no edge crosses another.
//
// How accurate this is: the reducers (sum, mean) weight each pixel by the
// fraction of it inside the region, so any boundary shift moves the totals --
// "less than half a pixel" is not a bound. The bound is the area, guarded to
// MAX_AREA_CHANGE. A small or thin recorte (an assentamento, a UC) loses up to
// ~2% of its area at the same tolerance, 98% for a thin assentamento at a
// 250 m one, and grows crossing edges, which is why they are never simplified.
//
// Anything unexpected passes through untouched and never throws: a malformed
// geometry, work past the budget, a collapsed result, an area that moved too
// much, an edge crossing another. The caller then sends the geometry as drawn.
//
// The tile path solved the same problem offline (scripts/simplify-clip.mjs);
// the geometry here comes from the request, so it is done per request.

import { area } from '@turf/area'

type Position = number[]
type Ring = Position[]

/**
 * Vertices below which a geometry is not simplified. Bahia, at 4.5k vertices,
 * answered fine; the biome, at 108k, did not.
 */
export const SIMPLIFY_MIN_VERTICES = 50_000

/** Douglas-Peucker tolerance, in metres. */
export const SIMPLIFY_TOLERANCE_M = 60

/** Largest relative change of the geodesic area the result may carry (0.01%). */
export const MAX_AREA_CHANGE = 1e-4

/**
 * Point-to-segment distance evaluations Douglas-Peucker may spend over all
 * rings. The biome needs ~1.8M; a 100k-vertex spiral, which sends the
 * algorithm quadratic, blocked the event loop for 52 s without a bound.
 */
export const MAX_EVALUATIONS = 10_000_000

/** Grid insertions and pair visits the crossing check may spend. */
const MAX_CROSSING_OPS = 5_000_000

/** Metres per degree of latitude; a degree of longitude is never longer. */
const METRES_PER_DEGREE = 111_320

export interface SimplifyOptions {
  /** Defaults to SIMPLIFY_MIN_VERTICES. Exists for tests; callers pass nothing. */
  minVertices?:    number
  /** Defaults to SIMPLIFY_TOLERANCE_M. Exists for tests; callers pass nothing. */
  toleranceM?:     number
  /** Defaults to MAX_EVALUATIONS. Exists for tests; callers pass nothing. */
  maxEvaluations?: number
}

/** Squared distance from p to segment ab, in squared degrees. */
function segmentDistance2(p: Position, a: Position, b: Position): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0
  const ex = a[0] + t * dx - p[0]
  const ey = a[1] + t * dy - p[1]
  return ex * ex + ey * ey
}

/** What is left of the Douglas-Peucker work budget. */
interface Budget { left: number }

/**
 * Douglas-Peucker on one closed ring, or null when the budget runs out.
 * Iterative: a 108k-vertex ring would overflow the stack with the recursive form.
 */
function simplifyRing(ring: Ring, tol: number, budget: Budget): Ring | null {
  if (ring.length < 3) return ring
  const keep = new Uint8Array(ring.length)
  keep[0] = 1
  keep[ring.length - 1] = 1
  const tol2 = tol * tol
  const stack: [number, number][] = [[0, ring.length - 1]]

  while (stack.length) {
    const [a, b] = stack.pop()!
    budget.left -= b - a - 1
    if (budget.left < 0) return null
    let maxD = 0
    let maxI = -1
    for (let i = a + 1; i < b; i++) {
      const d = segmentDistance2(ring[i], ring[a], ring[b])
      if (d > maxD) { maxD = d; maxI = i }
    }
    if (maxD > tol2) {
      keep[maxI] = 1
      stack.push([a, maxI], [maxI, b])
    }
  }
  return ring.filter((_, i) => keep[i])
}

/**
 * The polygon with every ring simplified; `'collapsed'` when its shell falls
 * below a closed ring (4 positions), in which case a collapsed hole is the
 * only thing dropped alone; null when the budget runs out.
 */
function simplifyPolygon(rings: Ring[], tol: number, budget: Budget): Ring[] | 'collapsed' | null {
  const shell = simplifyRing(rings[0], tol, budget)
  if (!shell) return null
  if (shell.length < 4) return 'collapsed'
  const out = [shell]
  for (let i = 1; i < rings.length; i++) {
    const hole = simplifyRing(rings[i], tol, budget)
    if (!hole) return null
    if (hole.length >= 4) out.push(hole)
  }
  return out
}

const isPosition = (p: unknown): p is Position =>
  Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])

const isRing = (r: unknown): r is Ring =>
  Array.isArray(r) && r.length >= 4 && r.every(isPosition)

const isPolygon = (p: unknown): p is Ring[] =>
  Array.isArray(p) && p.length > 0 && p.every(isRing)

/** The polygons of `geometry`, or null when its shape is not what this expects. */
function polygonsOf(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): Ring[][] | null {
  if (geometry?.type === 'Polygon') {
    return isPolygon(geometry.coordinates) ? [geometry.coordinates] : null
  }
  if (geometry?.type === 'MultiPolygon') {
    const c = geometry.coordinates
    return Array.isArray(c) && c.length > 0 && c.every(isPolygon) ? c : null
  }
  return null
}

const vertexCount = (polygons: Ring[][]): number =>
  polygons.reduce((n, rings) => n + rings.reduce((m, ring) => m + ring.length, 0), 0)

/**
 * Whether two segments cross at a point interior to both. Segments that only
 * touch at an endpoint, or lie along each other, do not count.
 */
function properlyCross(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const o1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
  const o2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax)
  if (!((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0))) return false
  const o3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx)
  const o4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx)
  return (o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0)
}

/**
 * Whether no two segments of the polygons cross properly. A uniform grid
 * (about sqrt(n) cells a side) keeps it near-linear: each segment goes into the
 * cells its bounding box covers, and a pair is tested only in the first cell
 * the two share, so it is tested once. Over budget counts as not valid.
 */
function hasNoCrossings(polygons: Ring[][]): boolean {
  const segs: number[] = []   // ax, ay, bx, by per segment
  for (const rings of polygons) {
    for (const ring of rings) {
      for (let i = 1; i < ring.length; i++) {
        segs.push(ring[i - 1][0], ring[i - 1][1], ring[i][0], ring[i][1])
      }
    }
  }
  const n = segs.length / 4

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let s = 0; s < n; s++) {
    for (let k = 0; k < 4; k += 2) {
      const x = segs[s * 4 + k]
      const y = segs[s * 4 + k + 1]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  const side = Math.max(1, Math.ceil(Math.sqrt(n)))
  const cw = (maxX - minX) / side || 1
  const ch = (maxY - minY) / side || 1
  const cellX = (x: number) => Math.min(side - 1, Math.floor((x - minX) / cw))
  const cellY = (y: number) => Math.min(side - 1, Math.floor((y - minY) / ch))

  let ops = 0
  const cells = new Map<number, number[]>()
  // First cell column and row of each segment: the pair's meeting cell is the
  // larger of the two on each axis.
  const first = new Int32Array(n * 2)
  for (let s = 0; s < n; s++) {
    const o = s * 4
    const x0 = cellX(Math.min(segs[o], segs[o + 2]))
    const x1 = cellX(Math.max(segs[o], segs[o + 2]))
    const y0 = cellY(Math.min(segs[o + 1], segs[o + 3]))
    const y1 = cellY(Math.max(segs[o + 1], segs[o + 3]))
    first[s * 2] = x0
    first[s * 2 + 1] = y0
    ops += (x1 - x0 + 1) * (y1 - y0 + 1)
    if (ops > MAX_CROSSING_OPS) return false
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const key = x * side + y
        const bucket = cells.get(key)
        if (bucket) bucket.push(s)
        else cells.set(key, [s])
      }
    }
  }

  for (const [key, bucket] of cells) {
    const cx = Math.floor(key / side)
    const cy = key % side
    for (let i = 0; i < bucket.length; i++) {
      const s = bucket[i]
      const so = s * 4
      for (let j = i + 1; j < bucket.length; j++) {
        const t = bucket[j]
        if (++ops > MAX_CROSSING_OPS) return false
        // Tested in the first cell the pair shares, and only there.
        if (Math.max(first[s * 2], first[t * 2]) !== cx) continue
        if (Math.max(first[s * 2 + 1], first[t * 2 + 1]) !== cy) continue
        const to = t * 4
        if (properlyCross(
          segs[so], segs[so + 1], segs[so + 2], segs[so + 3],
          segs[to], segs[to + 1], segs[to + 2], segs[to + 3],
        )) return false
      }
    }
  }
  return true
}

/**
 * `geometry` with its boundary thinned when it is large enough to be worth it
 * and the result is safe, otherwise `geometry` itself (the same object).
 */
export function simplifyForAnalysis<G extends GeoJSON.Polygon | GeoJSON.MultiPolygon>(
  geometry: G,
  options: SimplifyOptions = {},
): G {
  const {
    minVertices = SIMPLIFY_MIN_VERTICES,
    toleranceM = SIMPLIFY_TOLERANCE_M,
    maxEvaluations = MAX_EVALUATIONS,
  } = options

  try {
    const polygons = polygonsOf(geometry)
    if (!polygons || vertexCount(polygons) < minVertices) return geometry

    const tol = toleranceM / METRES_PER_DEGREE
    const budget: Budget = { left: maxEvaluations }
    const simplified: Ring[][] = []
    for (const rings of polygons) {
      const out = simplifyPolygon(rings, tol, budget)
      if (out === null) return geometry
      if (out !== 'collapsed') simplified.push(out)
    }
    if (!simplified.length) return geometry

    const result = (geometry.type === 'Polygon'
      ? { type: 'Polygon', coordinates: simplified[0] }
      : { type: 'MultiPolygon', coordinates: simplified }) as G

    const before = area(geometry)
    if (!(before > 0) || Math.abs(area(result) - before) / before > MAX_AREA_CHANGE) return geometry
    return hasNoCrossings(simplified) ? result : geometry
  } catch {
    return geometry
  }
}
