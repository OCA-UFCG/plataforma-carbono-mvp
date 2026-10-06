import { describe, expect, it } from 'vitest'
import { rankByArea } from '@/lib/territorios/areaRank'

describe('rankByArea', () => {
  const AREAS = new Map([['a', 10], ['b', 30], ['c', 20], ['d', 20]])

  it('counts from the largest, ties sharing the better place', () => {
    expect(rankByArea(AREAS, 'b')).toEqual({ position: 1, total: 4 })
    expect(rankByArea(AREAS, 'c')).toEqual({ position: 2, total: 4 })
    expect(rankByArea(AREAS, 'd')).toEqual({ position: 2, total: 4 })
    expect(rankByArea(AREAS, 'a')).toEqual({ position: 4, total: 4 })
  })

  it('has no place for a feature it does not know', () => {
    expect(rankByArea(AREAS, 'x')).toBeNull()
  })
})
