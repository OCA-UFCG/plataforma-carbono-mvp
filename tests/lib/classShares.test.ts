import { describe, expect, it } from 'vitest'
import { classShares } from '@/lib/mapa/classShares'
import type { RasterClass } from '@/types/mapa'

const classes: RasterClass[] = [
  { value: 3, label: 'Formação Florestal', color: '#1f8d49' },
  { value: 15, label: 'Pastagem', color: '#edde8e' },
  { value: 21, label: 'Mosaico de Usos', color: '#ffefc3' },
]

describe('classShares', () => {
  it('converts areas in m² to hectares and shares of the total', () => {
    const shares = classShares({ '3': 400_000, '15': 600_000 }, classes)

    expect(shares).toEqual([
      { value: 15, label: 'Pastagem', color: '#edde8e', areaHa: 60, share: 60 },
      { value: 3, label: 'Formação Florestal', color: '#1f8d49', areaHa: 40, share: 40 },
    ])
  })

  it('drops classes absent from the data instead of listing them at zero', () => {
    const shares = classShares({ '3': 1_000_000 }, classes)

    expect(shares.map((s) => s.value)).toEqual([3])
  })

  it('collects codes missing from the configuration so the shares still add to 100', () => {
    // Without the remainder the percentages silently stop summing to 100.
    const shares = classShares({ '3': 500_000, '99': 500_000 }, classes)

    expect(shares).toEqual([
      { value: 3, label: 'Formação Florestal', color: '#1f8d49', areaHa: 50, share: 50 },
      { value: -1, label: 'Não classificadas', color: '#9e9e9e', areaHa: 50, share: 50 },
    ])
    expect(shares.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(100)
  })

  it('breaks ties by class value so the order is deterministic', () => {
    const shares = classShares({ '3': 500_000, '15': 500_000 }, classes)

    expect(shares.map((s) => s.value)).toEqual([3, 15])
  })

  it('returns an empty list when there is no area at all', () => {
    expect(classShares({}, classes)).toEqual([])
    expect(classShares({ '3': 0 }, classes)).toEqual([])
  })
})
