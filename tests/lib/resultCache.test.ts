import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RESULT_CACHE_MAX_ENTRIES,
  RESULT_CACHE_TTL_MS,
  clearResultCache,
  resultCacheKey,
  withResultCache,
} from '@/lib/mapa/resultCache'

const square = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }

describe('resultCacheKey', () => {
  it('tells layers, years and geometries apart', () => {
    const k = resultCacheKey('ndvi_modis', '2024-01-01', square)
    expect(resultCacheKey('ndvi_modis', '2024-01-01', square)).toBe(k)
    expect(resultCacheKey('evi_modis', '2024-01-01', square)).not.toBe(k)
    expect(resultCacheKey('ndvi_modis', '2023-01-01', square)).not.toBe(k)
    expect(resultCacheKey('ndvi_modis', undefined, square)).not.toBe(k)
    const moved = { ...square, coordinates: [[[0, 0], [2, 0], [1, 1], [0, 0]]] }
    expect(resultCacheKey('ndvi_modis', '2024-01-01', moved)).not.toBe(k)
  })
})

describe('withResultCache', () => {
  beforeEach(() => clearResultCache())
  afterEach(() => vi.useRealTimers())

  it('computes once and answers the next request from memory', async () => {
    const compute = vi.fn(async () => ({ kind: 'annual', mean: 1 }))
    await withResultCache('k', compute)
    expect(await withResultCache('k', compute)).toEqual({ kind: 'annual', mean: 1 })
    expect(compute).toHaveBeenCalledOnce()
  })

  it('shares one computation between requests that arrive together', async () => {
    let release!: (v: number) => void
    const compute = vi.fn(() => new Promise<number>((r) => { release = r }))
    const a = withResultCache('k', compute)
    const b = withResultCache('k', compute)
    release(7)
    expect(await Promise.all([a, b])).toEqual([7, 7])
    expect(compute).toHaveBeenCalledOnce()
  })

  it('keeps no failure, so the next request tries again', async () => {
    const compute = vi.fn()
      .mockRejectedValueOnce(new Error('timed out'))
      .mockResolvedValueOnce(3)
    await expect(withResultCache('k', compute)).rejects.toThrow('timed out')
    expect(await withResultCache('k', compute)).toBe(3)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('computes again once an entry expires', async () => {
    vi.useFakeTimers()
    const compute = vi.fn(async () => 1)
    await withResultCache('k', compute)
    vi.advanceTimersByTime(RESULT_CACHE_TTL_MS + 1)
    await withResultCache('k', compute)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('drops the oldest entry past capacity', async () => {
    const compute = vi.fn(async () => 1)
    for (let i = 0; i <= RESULT_CACHE_MAX_ENTRIES; i++) await withResultCache(`k${i}`, compute)
    compute.mockClear()
    await withResultCache(`k${RESULT_CACHE_MAX_ENTRIES}`, compute)
    expect(compute).not.toHaveBeenCalled()
    await withResultCache('k0', compute)
    expect(compute).toHaveBeenCalledOnce()
  })
})
