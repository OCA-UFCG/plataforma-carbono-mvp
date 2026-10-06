import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { INICIO_DESTAQUES, destaquesCards } from '@/lib/content/destaques'
import { copyDefaults } from '@/lib/content/site/model'

const DESTAQUES = destaquesCards(copyDefaults(INICIO_DESTAQUES))

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

  it('gives every card its own icon', () => {
    expect(new Set(DESTAQUES.map((d) => d.icone)).size).toBe(4)
  })

  // Four paths are not four icons: the files were once four copies of the
  // same "Map" glyph. The design now draws a different one per card.
  it('draws a different glyph on every card', () => {
    const svgs = DESTAQUES.map((d) => readFileSync(path.join(process.cwd(), 'public', d.icone), 'utf8'))
    expect(new Set(svgs).size).toBe(4)
  })
})
