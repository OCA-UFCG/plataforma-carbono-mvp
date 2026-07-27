/**
 * Compute the bounding box of a GeoJSON object (Feature, FeatureCollection,
 * or Geometry). Returns [minLon, minLat, maxLon, maxLat] in degrees.
 *
 * Handles Point, MultiPoint, LineString, MultiLineString, Polygon, and
 * MultiPolygon. No external dependencies, walks the coordinate nesting
 * recursively until it finds [lon, lat] pairs.
 */

type Bbox = [number, number, number, number]

export function computeBbox(geojson: unknown): Bbox {
  let minLon =  Infinity
  let minLat =  Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity

  const visit = (coords: unknown): void => {
    if (!Array.isArray(coords)) return

    // Leaf: [lon, lat] (maybe with altitude or other dimensions after)
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const lon = coords[0]
      const lat = coords[1]
      if (lon < minLon) minLon = lon
      if (lat < minLat) minLat = lat
      if (lon > maxLon) maxLon = lon
      if (lat > maxLat) maxLat = lat
      return
    }

    // Nested: iterate children
    for (const child of coords) visit(child)
  }

  const walkGeometry = (geom: unknown): void => {
    if (!geom || typeof geom !== 'object') return
    const g = geom as { type?: string; coordinates?: unknown; geometries?: unknown[] }
    if (g.type === 'GeometryCollection' && Array.isArray(g.geometries)) {
      for (const inner of g.geometries) walkGeometry(inner)
      return
    }
    visit(g.coordinates)
  }

  if (!geojson || typeof geojson !== 'object') {
    throw new Error('computeBbox: input is not a GeoJSON object')
  }

  const obj = geojson as { type?: string; features?: unknown[]; geometry?: unknown }

  if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
    for (const f of obj.features) {
      if (f && typeof f === 'object') {
        walkGeometry((f as { geometry?: unknown }).geometry)
      }
    }
  } else if (obj.type === 'Feature') {
    walkGeometry(obj.geometry)
  } else {
    walkGeometry(obj)
  }

  if (!Number.isFinite(minLon)) {
    throw new Error('computeBbox: no coordinates found in GeoJSON')
  }

  return [minLon, minLat, maxLon, maxLat]
}
