import { describe, expect, it } from 'vitest'
import { DIMENSOES } from '@/lib/content/dimensoes'
import { AMEACAS } from '@/lib/content/ameacas'
import { FRENTES } from '@/lib/content/frentes'

describe('parked landing content', () => {
  it('keeps the seven dimensoes in their published order', () => {
    // The first four describe ecological functions the biome performs by its own
    // process; the next three, uses society makes of its territory. The section
    // introduction depends on that split, so the order is part of the content.
    expect(DIMENSOES).toHaveLength(7)
    expect(DIMENSOES[0].num).toBe('48%')
    expect(DIMENSOES[0].titulo).toBe('Da remoção bruta de carbono do país')
    expect(DIMENSOES[0].fonte).toBe('DA COSTA et al. (2025); MENDES et al. (2023; 2025)')
  })

  it('carries a source citation on every dimensao', () => {
    for (const d of DIMENSOES) {
      expect(d.fonte.trim()).not.toBe('')
    }
  })

  it('keeps the six frentes', () => {
    expect(FRENTES).toHaveLength(6)
  })

  it('preserves all ten ameacas entries', () => {
    expect(AMEACAS).toHaveLength(10)
    expect(AMEACAS[0].num).toBe('8,6 mi ha')
    expect(AMEACAS[0].fonte).toBe('MAPBIOMAS, Coleção 9 (2025)')
  })

  it('names frentes icons as strings, keeping the data module free of React', () => {
    expect(FRENTES[0].icon).toBe('FaLayerGroup')
  })
})
