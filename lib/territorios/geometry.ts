// Point lookups of the Territórios chooser, run in the browser over the GeoJSON
// the chooser map already holds: which territory contains a location, and which
// ones lie nearest when none does.

import { computeBbox } from '@/lib/mapa/computeBbox'
import { insideGeometry, polygonsOf, type PolygonalGeometry } from '@/lib/territorios/interiorPoint'

type Bbox = [number, number, number, number]

/** Mean Earth radius (IUGG), in km. */
const EARTH_RADIUS_KM = 6371.0088

// Keyed by the geometry object: 1923 settlements are scanned on every lookup,
// and their bboxes never change while the parsed file lives.
const bboxCache = new WeakMap<PolygonalGeometry, Bbox>()

function bboxOf(geometry: PolygonalGeometry): Bbox {
  let bbox = bboxCache.get(geometry)
  if (!bbox) {
    bbox = computeBbox(geometry)
    bboxCache.set(geometry, bbox)
  }
  return bbox
}

export function containsPoint(geometry: PolygonalGeometry, lon: number, lat: number): boolean {
  const [minLon, minLat, maxLon, maxLat] = bboxOf(geometry)
  if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) return false
  return insideGeometry(lon, lat, polygonsOf(geometry))
}

/**
 * Every item whose geometry contains the point, in list order. Outlines of one
 * type do overlap: the interior point of 28 of the 1923 settlements, 3 of the
 * 50 indigenous lands and 1 of the 1210 municipalities lies inside another
 * territory of the same type (measured on 2026-09-16).
 */
export function findContaining<T extends { geometry: PolygonalGeometry }>(
  items: readonly T[],
  lon: number,
  lat: number,
): T[] {
  return items.filter((item) => containsPoint(item.geometry, lon, lat))
}

function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

export interface NearestItem<T> {
  item:       T
  distanceKm: number
}

/**
 * The `k` items nearest to the point, closest first, by the distance to the
 * nearest vertex of each outline. Vertices overstate the distance by up to half
 * an edge; measured on 2026-09-16, the median edge of the settlement, quilombo
 * and indigenous land outlines is 1.2 km (99th percentile 9.4 km), the same
 * order as the location accuracy the chooser accepts.
 */
export function nearestFeatures<T extends { geometry: PolygonalGeometry }>(
  items: readonly T[],
  lon: number,
  lat: number,
  k: number,
): NearestItem<T>[] {
  const measured: NearestItem<T>[] = items.map((item) => {
    let distanceKm = Infinity
    for (const polygon of polygonsOf(item.geometry)) {
      for (const ring of polygon) {
        for (const [vLon, vLat] of ring) {
          const d = haversineKm(lon, lat, vLon, vLat)
          if (d < distanceKm) distanceKm = d
        }
      }
    }
    return { item, distanceKm }
  })

  return measured
    .filter((m) => Number.isFinite(m.distanceKm))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, Math.max(0, k))
}
