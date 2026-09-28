import { describe, expect, it } from 'vitest'
import { containsPoint, findContaining, nearestFeatures } from '@/lib/territorios/geometry'

// A U: the notch between the arms, x 1..2 and y 1..3, is outside.
const u = {
  type: 'Polygon' as const,
  coordinates: [[[0, 0], [3, 0], [3, 3], [2, 3], [2, 1], [1, 1], [1, 3], [0, 3], [0, 0]]],
}

const frame = {
  type: 'Polygon' as const,
  coordinates: [
    [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]],
    [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]],
  ],
}

const square = (x: number, y: number, side = 1) => ({
  type: 'Polygon' as const,
  coordinates: [[[x, y], [x + side, y], [x + side, y + side], [x, y + side], [x, y]]],
})

/** One degree of latitude on the IUGG mean sphere, in km. */
const DEGREE_KM = 111.195

describe('containsPoint', () => {
  it('follows a concave outline instead of its bbox', () => {
    expect(containsPoint(u, 0.5, 2.5)).toBe(true)
    expect(containsPoint(u, 1.5, 2)).toBe(false)
  })

  it('treats a hole as outside', () => {
    expect(containsPoint(frame, 2, 2)).toBe(false)
    expect(containsPoint(frame, 0.5, 2)).toBe(true)
  })

  it('finds the point in any part of a MultiPolygon, and not between the parts', () => {
    const parts = { type: 'MultiPolygon' as const, coordinates: [square(0, 0).coordinates, square(5, 5).coordinates] }

    expect(containsPoint(parts, 5.5, 5.5)).toBe(true)
    expect(containsPoint(parts, 3, 3)).toBe(false)
    expect(containsPoint(parts, -1, 0.5)).toBe(false)
  })
})

describe('findContaining', () => {
  const ids = (items: { id: string }[]) => items.map((item) => item.id)

  it('returns the items whose geometry holds the point, or none', () => {
    const items = [{ id: 'u', geometry: u }, { id: 'longe', geometry: square(10, 10) }, { id: 'nicho', geometry: square(1.2, 1.2, 0.5) }]

    expect(ids(findContaining(items, 1.5, 1.5))).toEqual(['nicho'])
    expect(ids(findContaining(items, 10.5, 10.5))).toEqual(['longe'])
    expect(findContaining(items, 1.5, 2.5)).toEqual([])
  })

  it('returns every overlapping item in list order, not only the first', () => {
    const items = [{ id: 'grande', geometry: square(0, 0, 4) }, { id: 'fora', geometry: square(10, 10) }, { id: 'dentro', geometry: square(1, 1) }]

    expect(ids(findContaining(items, 1.5, 1.5))).toEqual(['grande', 'dentro'])
  })
})

describe('nearestFeatures', () => {
  it('returns the k nearest, closest first, with the distance in km', () => {
    const items = [
      { id: 'tres', geometry: square(0, 3) },
      { id: 'um', geometry: square(0, 1) },
      { id: 'dois', geometry: square(0, 2) },
    ]

    const nearest = nearestFeatures(items, 0, 0, 2)

    expect(nearest.map((n) => n.item.id)).toEqual(['um', 'dois'])
    expect(nearest[0].distanceKm).toBeCloseTo(DEGREE_KM, 0)
    expect(nearest[1].distanceKm).toBeCloseTo(2 * DEGREE_KM, 0)
  })

  it('measures to the closest vertex of any ring and part, not to the first one', () => {
    // The second part's first vertex, (-3, 1), is over 3 degrees away; its corner (0, 1) is 1.
    const big = { id: 'grande', geometry: { type: 'MultiPolygon' as const, coordinates: [square(10, 10).coordinates, square(-3, 1, 3).coordinates] } }
    const small = { id: 'pequeno', geometry: square(1.5, 0) }

    expect(nearestFeatures([small, big], 0, 0, 3).map((n) => [n.item.id, Math.round(n.distanceKm)]))
      .toEqual([['grande', Math.round(DEGREE_KM)], ['pequeno', Math.round(1.5 * DEGREE_KM)]])
  })
})
