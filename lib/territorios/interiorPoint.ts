// A point inside a territory, for the steps that fall back to reading a single
// pixel when the zonal reduction finds none with weight.
//
// The bbox center is not enough: it lands outside a concave territory or
// between the parts of a multipart one, and the pixel read there would describe
// a neighbour. Planar math on lon/lat is fine here, since the point only has to
// be inside, not at the true centroid.

type Position = [number, number]
type Ring = Position[]
type PolygonCoords = Ring[]

export interface PolygonalGeometry {
  type:        'Polygon' | 'MultiPolygon'
  coordinates: unknown
}

export function polygonsOf(geometry: PolygonalGeometry): PolygonCoords[] {
  return geometry.type === 'Polygon'
    ? [geometry.coordinates as PolygonCoords]
    : geometry.coordinates as PolygonCoords[]
}

/** Twice the signed area (shoelace). */
function doubleArea(ring: Ring): number {
  let sum = 0
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i]
    const [x1, y1] = ring[(i + 1) % ring.length]
    sum += x0 * y1 - x1 * y0
  }
  return sum
}

function centroid(ring: Ring): { lon: number; lat: number } | null {
  const a2 = doubleArea(ring)
  if (a2 === 0) return null
  let cx = 0
  let cy = 0
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i]
    const [x1, y1] = ring[(i + 1) % ring.length]
    const cross = x0 * y1 - x1 * y0
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  }
  return { lon: cx / (3 * a2), lat: cy / (3 * a2) }
}

function insideRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function insideGeometry(lon: number, lat: number, polygons: PolygonCoords[]): boolean {
  return polygons.some(([outer, ...holes]) =>
    outer !== undefined &&
    insideRing(lon, lat, outer) &&
    !holes.some((hole) => insideRing(lon, lat, hole)),
  )
}

export function interiorPoint(geometry: PolygonalGeometry): { lon: number; lat: number } {
  const polygons = polygonsOf(geometry)

  let largest: Ring | undefined
  let largestArea = -1
  for (const [outer] of polygons) {
    if (!outer?.length) continue
    const area = Math.abs(doubleArea(outer))
    if (area > largestArea) {
      largest = outer
      largestArea = area
    }
  }
  if (!largest) throw new Error('Geometry has no outer ring')

  const c = centroid(largest)
  if (c && insideGeometry(c.lon, c.lat, polygons)) return c

  // A boundary vertex still falls on a pixel that overlaps the territory.
  const [lon, lat] = largest[0]
  return { lon, lat }
}
