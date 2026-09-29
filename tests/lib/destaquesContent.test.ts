import { describe, expect, it } from 'vitest'
import { DESTAQUES } from '@/lib/content/destaques'
import pt from '@/translations/pt/Destaques.json'
import en from '@/translations/en/Destaques.json'

describe('destaques content', () => {
  it('ships the four cards the design lays out', () => {
    expect(DESTAQUES).toHaveLength(4)
  })

  it('has copy for every card in every language', () => {
    for (const { Destaques } of [pt, en]) {
      for (const { id } of DESTAQUES) {
        expect(Object.keys(Destaques.items[id]).sort(), id).toEqual(['label', 'text', 'unit', 'value'])
      }
    }
  })

  it('separates the figure from its unit, so the card can size them apart', () => {
    // The design sets the number at display size and the unit at body size.
    const { items } = pt.Destaques
    expect(items.population.value).toBe('26')
    expect(items.population.unit).toBe('milhões')
    expect(items.capacity.value).toBe('1,5–5')
    expect(items.capacity.unit).toBe('t CO₂/ha/ano')
  })

  it('writes figures in each language\'s own notation', () => {
    for (const d of DESTAQUES) {
      expect(pt.Destaques.items[d.id].value).not.toMatch(/\d\.\d/) // a decimal point would be en-US
      expect(en.Destaques.items[d.id].value).not.toMatch(/\d,\d/) // a decimal comma would be pt-BR
    }
  })
})
