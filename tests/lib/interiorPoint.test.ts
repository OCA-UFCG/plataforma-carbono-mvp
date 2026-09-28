import { describe, expect, it } from 'vitest'
import { interiorPoint } from '@/lib/territorios/interiorPoint'

// A small island listed first, so the tests prove the largest part is the one used.
const island = [[[10, 10], [10.5, 10], [10.5, 10.5], [10, 10.5], [10, 10]]]

describe('interiorPoint', () => {
  it('returns the centroid of the largest part when it falls inside', () => {
    const square = [[[-40, -8], [-38, -8], [-38, -6], [-40, -6], [-40, -8]]]

    const point = interiorPoint({ type: 'MultiPolygon', coordinates: [island, square] })

    expect(point.lon).toBeCloseTo(-39)
    expect(point.lat).toBeCloseTo(-7)
  })

  it('falls back to the first vertex of the largest ring when a concave part puts the centroid outside', () => {
    // A U shape: its centroid (1.5, 1.36) sits in the notch between the arms.
    const u = [[[0, 0], [3, 0], [3, 3], [2, 3], [2, 1], [1, 1], [1, 3], [0, 3], [0, 0]]]

    expect(interiorPoint({ type: 'MultiPolygon', coordinates: [island, u] }))
      .toEqual({ lon: 0, lat: 0 })
  })

  it('treats a hole as outside', () => {
    const frame = [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]], [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]

    expect(interiorPoint({ type: 'Polygon', coordinates: frame })).toEqual({ lon: 0, lat: 0 })
  })

  it('accepts a centroid that lands in another part of the same territory', () => {
    const u = [[[0, 0], [3, 0], [3, 3], [2, 3], [2, 1], [1, 1], [1, 3], [0, 3], [0, 0]]]
    const inNotch = [[[1.2, 1.2], [1.8, 1.2], [1.8, 1.8], [1.2, 1.8], [1.2, 1.2]]]

    const point = interiorPoint({ type: 'MultiPolygon', coordinates: [u, inNotch] })

    expect(point.lon).toBeCloseTo(1.5)
    expect(point.lat).toBeCloseTo(9.5 / 7)
  })
})
