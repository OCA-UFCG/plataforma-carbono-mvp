// Area of a territory on the WGS84 ellipsoid. @turf/area works on a sphere of
// the mean radius, which at the Caatinga's latitudes reads about 0.4% high: the
// biome came out as 866,174 km² against the 862,818 km² of IBGE (2019), the
// source "Sobre os dados" cites, and the 862,620 km² of Earth Engine's
// pixelArea. The same edge sum as turf's, with the sine of the latitude
// replaced by the authalic function q, which integrates the ellipsoid's area
// from the equator.

import { polygonsOf, type PolygonalGeometry } from '@/lib/territorios/interiorPoint'

const A = 6_378_137
const F = 1 / 298.257223563
const E2 = F * (2 - F)
const E = Math.sqrt(E2)
const RAD = Math.PI / 180

function q(latDeg: number): number {
  const s = Math.sin(latDeg * RAD)
  return (1 - E2) * (s / (1 - E2 * s * s) - Math.log((1 - E * s) / (1 + E * s)) / (2 * E))
}

function ringAreaM2(ring: [number, number][]): number {
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i]
    const [lon2, lat2] = ring[i + 1]
    sum += (lon2 - lon1) * RAD * (q(lat1) + q(lat2)) / 2
  }
  return Math.abs(sum) * A * A / 2
}

export function ellipsoidAreaHa(geometry: PolygonalGeometry): number {
  let m2 = 0
  for (const [outer, ...holes] of polygonsOf(geometry)) {
    m2 += ringAreaM2(outer) - holes.reduce((total, hole) => total + ringAreaM2(hole), 0)
  }
  return m2 / 10_000
}
