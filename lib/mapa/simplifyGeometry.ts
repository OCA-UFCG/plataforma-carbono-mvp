// Coarsens a recorte's boundary to the scale a reduction reads it at.
//
// The biome boundary has 108k vertices. Sent whole, every reduction over it ran
// 32 to 80 s against a 60 s deadline, while Bahia (353k km², 4.5k vertices)
// answered in 4 to 27 s: the cost is the vertex count, not only the area. A
// reduction assigns a pixel by its centre, so a boundary moved by less than half
// a pixel cannot change which pixels it reads. At 120 m that tolerance takes
// the biome to ~13k vertices and moves its area by 0.002%.
//
// The tile path solved the same problem offline (scripts/simplify-clip.mjs);
// here the scale changes per layer and per region, so it runs per request.

type Position = number[]
type Ring = Position[]

/** Metres per degree of latitude; a degree of longitude is never longer. */
const METRES_PER_DEGREE = 111_320

/** Half a pixel at `scaleM`, in degrees. */
export function toleranceDegrees(scaleM: number): number {
  return scaleM / 2 / METRES_PER_DEGREE
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

/**
 * Douglas-Peucker on one closed ring. Iterative: a 108k-vertex ring would
 * overflow the stack with the recursive form.
 */
function simplifyRing(ring: Ring, tol: number): Ring {
  if (ring.length < 3) return ring
  const keep = new Uint8Array(ring.length)
  keep[0] = 1
  keep[ring.length - 1] = 1
  const tol2 = tol * tol
  const stack: [number, number][] = [[0, ring.length - 1]]

  while (stack.length) {
    const [a, b] = stack.pop()!
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
 * The polygon with every ring simplified, or null when its shell collapses
 * below a closed ring (4 positions). A collapsed hole is dropped alone.
 */
function simplifyPolygon(rings: Ring[], tol: number): Ring[] | null {
  const shell = simplifyRing(rings[0], tol)
  if (shell.length < 4) return null
  const holes = rings.slice(1).map((r) => simplifyRing(r, tol)).filter((r) => r.length >= 4)
  return [shell, ...holes]
}

/**
 * `geometry` with its boundary moved by at most half a pixel at `scaleM`.
 * Returns the input itself when nothing would survive, so a speck of a
 * recorte still reaches Earth Engine as drawn.
 */
export function simplifyForScale<G extends GeoJSON.Polygon | GeoJSON.MultiPolygon>(
  geometry: G,
  scaleM: number,
): G {
  const tol = toleranceDegrees(scaleM)

  if (geometry.type === 'Polygon') {
    const rings = simplifyPolygon(geometry.coordinates, tol)
    return rings ? ({ type: 'Polygon', coordinates: rings } as G) : geometry
  }

  const polygons = geometry.coordinates
    .map((p) => simplifyPolygon(p, tol))
    .filter((p): p is Ring[] => p !== null)
  return polygons.length ? ({ type: 'MultiPolygon', coordinates: polygons } as G) : geometry
}
