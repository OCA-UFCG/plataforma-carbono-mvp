// The world with a territory cut out, painted dark around it: on the story map
// (/territorios) and around the recorte selected on the map module (/mapa),
// hence `lib/` rather than either module's folder.
//
// Only the outer ring of each part becomes a hole: an enclave inside the
// territory is outside it, and stays under the mask.
//
// The winding is normalised on purpose. MapLibre splits a polygon's rings into
// outer and inner by the sign of their area (classifyRings), so a hole wound the
// same way as the world ring would be read as a second outer ring and the
// territory itself would come out dark. The recorte GeoJSONs follow no single
// convention, so the input winding cannot be trusted.

import type { Feature, Polygon, Position } from 'geojson'

/** Any polygonal geometry: a GeoJSON Polygon or MultiPolygon, or a territory's. */
type PolygonalGeometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }

/** Counter-clockwise, as RFC 7946 wants an exterior ring. */
const WORLD_RING: Position[] = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]

/** Shoelace area in degrees²: positive for a counter-clockwise ring. */
function signedArea(ring: Position[]): number {
  let twice = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    twice += x1 * y2 - x2 * y1
  }
  return twice / 2
}

export function outsideMask(geometry: PolygonalGeometry): Feature<Polygon> {
  const parts = geometry.type === 'Polygon'
    ? [geometry.coordinates as Position[][]]
    : (geometry.coordinates as Position[][][])

  const holes = parts
    .map((rings) => rings[0])
    .filter((ring): ring is Position[] => Array.isArray(ring) && ring.length >= 4)
    .map((ring) => (signedArea(ring) > 0 ? [...ring].reverse() : ring))

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [WORLD_RING.map((p) => [...p]), ...holes] },
  }
}
