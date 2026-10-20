import { describe, expect, it } from 'vitest'
import { presentClasses } from '@/lib/mapa/presentClasses'
import type { LayerResult, RasterClass } from '@/types/mapa'

const classes: RasterClass[] = [
  { value: 3, label: 'Formação Florestal', color: '#1f8d49' },
  { value: 4, label: 'Formação Savânica', color: '#7dc975' },
  { value: 15, label: 'Pastagem', color: '#edde8e' },
]

const result = (areas: Record<string, number>, date?: string, status: LayerResult['status'] = 'ready'): LayerResult => ({
  layerId: 'lulc_mapbiomas', date, status,
  stats: { kind: 'categorical', areas }, pixelValue: null, error: null,
})

describe('presentClasses', () => {
  it('keeps the classes with area inside the feature', () => {
    expect(presentClasses(classes, result({ '3': 1200, '15': 40, '4': 0 }, '2024-01-01'), '2024-01-01'))
      .toEqual([classes[0], classes[2]])
  })

  it('lists every class while the result loads, after an error, or without one', () => {
    expect(presentClasses(classes, result({ '3': 1 }, '2024-01-01', 'loading'), '2024-01-01')).toEqual(classes)
    expect(presentClasses(classes, result({ '3': 1 }, '2024-01-01', 'error'), '2024-01-01')).toEqual(classes)
    expect(presentClasses(classes, undefined, '2024-01-01')).toEqual(classes)
  })

  it('lists every class when the result is for another year', () => {
    expect(presentClasses(classes, result({ '3': 1 }, '2010-01-01'), '2024-01-01')).toEqual(classes)
  })

  it('matches a static layer, whose result has no date', () => {
    expect(presentClasses(classes, result({ '4': 5 }), undefined)).toEqual([classes[1]])
  })

  it('lists every class rather than none when no class has area', () => {
    expect(presentClasses(classes, result({}, '2024-01-01'), '2024-01-01')).toEqual(classes)
  })

  it('lists every class for a result that is not a composition', () => {
    const continuous: LayerResult = {
      layerId: 'x', status: 'ready', pixelValue: null, error: null,
      stats: { kind: 'continuous', stats: { min: 1, max: 9, mean: 5, count: 10 } },
    }
    expect(presentClasses(classes, continuous, undefined)).toEqual(classes)
  })
})
