import { describe, expect, it } from 'vitest'
import type { Position } from 'geojson'
import { outsideMask } from '@/lib/territorios/outsideMask'

const WORLD = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]

/** Axis-aligned square, counter-clockwise unless reversed. */
function square(lon: number, lat: number, size: number, clockwise = false): Position[] {
  const ring = [[lon, lat], [lon + size, lat], [lon + size, lat + size], [lon, lat + size], [lon, lat]]
  return clockwise ? ring.reverse() : ring
}

function signedArea(ring: Position[]): number {
  let twice = 0
  for (let i = 0; i < ring.length - 1; i++) {
    twice += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return twice / 2
}

describe('outsideMask', () => {
  it('cuts a Polygon out of the world as one hole, ignoring its own inner ring', () => {
    // Campina Grande-sized square with an enclave: the enclave is outside the
    // territory and must stay under the mask, so it never becomes a ring here.
    const outer = square(-36, -7.4, 0.5)
    const enclave = square(-35.9, -7.3, 0.1, true)
    const mask = outsideMask({ type: 'Polygon', coordinates: [outer, enclave] })

    expect(mask.geometry.coordinates).toHaveLength(2)
    expect(mask.geometry.coordinates[0]).toEqual(WORLD)
    expect(mask.geometry.coordinates[1]).toHaveLength(outer.length)
  })

  it('cuts every part of a MultiPolygon, with the world ring first', () => {
    const parts = [
      [square(-40, -9, 0.2)],
      [square(-39, -9, 0.2)],
      [square(-38, -9, 0.2)],
    ]
    const mask = outsideMask({ type: 'MultiPolygon', coordinates: parts })

    expect(mask.geometry.coordinates).toHaveLength(4)
    expect(mask.geometry.coordinates[0]).toEqual(WORLD)
  })

  // MapLibre tells holes from outer rings by winding; a hole wound like the
  // world ring would paint the territory dark instead of the outside.
  it('winds every hole against the world ring whatever the input winding', () => {
    const mask = outsideMask({
      type: 'MultiPolygon',
      coordinates: [[square(-40, -9, 0.2)], [square(-39, -9, 0.2, true)]],
    })
    const [world, ...holes] = mask.geometry.coordinates

    expect(signedArea(world)).toBeGreaterThan(0)
    for (const hole of holes) expect(signedArea(hole)).toBeLessThan(0)
  })
})
