import { describe, expect, it } from 'vitest'
import { DESTAQUES } from '@/lib/content/destaques'

describe('destaques content', () => {
  it('ships the four cards the design lays out', () => {
    expect(DESTAQUES).toHaveLength(4)
  })

  it('separates the figure from its unit, so the card can size them apart', () => {
    // The design sets the number at display size and the unit at body size.
    expect(DESTAQUES[0].numero).toBe('26')
    expect(DESTAQUES[0].unidade).toBe('milhões')
    expect(DESTAQUES[3].numero).toBe('1,5–5')
    expect(DESTAQUES[3].unidade).toBe('t CO₂/ha/ano')
  })

  it('writes figures in Brazilian Portuguese notation', () => {
    for (const d of DESTAQUES) {
      expect(d.numero).not.toMatch(/\d\.\d/) // a decimal point would be en-US
    }
  })
})
