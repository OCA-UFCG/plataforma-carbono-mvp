import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { area } from '@turf/area'
import { simplifyForScale, toleranceDegrees } from '@/lib/mapa/simplifyGeometry'

type Ring = number[][]

const countVertices = (c: unknown): number =>
  Array.isArray(c) && c.length && typeof c[0] === 'number'
    ? 1
    : Array.isArray(c) ? c.reduce((n: number, x) => n + countVertices(x), 0) : 0

/** Distance from p to segment ab, in the same units as the coordinates. */
function segmentDistance(p: number[], a: number[], b: number[]): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0
  return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1])
}

const biome = JSON.parse(
  readFileSync(path.join(process.cwd(), 'public/data/vector/limite_caatinga.geojson'), 'utf-8'),
).features[0].geometry as GeoJSON.MultiPolygon

describe('simplifyForScale', () => {
  it('cuts the biome boundary down and keeps its area', () => {
    const out = simplifyForScale(biome, 120)
    expect(countVertices(out.coordinates)).toBeLessThan(countVertices(biome.coordinates) / 4)
    expect(Math.abs(area(out) - area(biome)) / area(biome)).toBeLessThan(0.001)
  })

  it('never strays from a dropped vertex by more than the tolerance', () => {
    const square: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [0.5, 0.00001], [1, 0], [1, 1], [0, 1], [0, 0]]],
    }
    const out = simplifyForScale(square, 10) as GeoJSON.Polygon
    const ring = out.coordinates[0]
    expect(ring).toHaveLength(5)
    const tol = toleranceDegrees(10)
    for (const p of square.coordinates[0]) {
      const d = Math.min(...ring.slice(1).map((b, i) => segmentDistance(p, ring[i], b)))
      expect(d).toBeLessThanOrEqual(tol)
    }
  })

  it('drops a hole that collapses and keeps the shell', () => {
    const tiny: Ring = [[0.5, 0.5], [0.5000001, 0.5], [0.5000001, 0.5000001], [0.5, 0.5]]
    const poly: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], tiny],
    }
    const out = simplifyForScale(poly, 500) as GeoJSON.Polygon
    expect(out.coordinates).toHaveLength(1)
  })

  it('drops a polygon whose shell collapses, keeping the others', () => {
    const multi: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        [[[5, 5], [5.0000001, 5], [5.0000001, 5.0000001], [5, 5]]],
      ],
    }
    const out = simplifyForScale(multi, 500) as GeoJSON.MultiPolygon
    expect(out.coordinates).toHaveLength(1)
  })

  it('returns the original when every polygon would collapse', () => {
    const speck: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[5, 5], [5.0000001, 5], [5.0000001, 5.0000001], [5, 5]]],
    }
    expect(simplifyForScale(speck, 500)).toBe(speck)
  })
})
