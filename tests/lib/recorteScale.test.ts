import { describe, expect, it } from 'vitest'
import {
  bandOf,
  parseYearStats,
  recorteScale,
  recorteScaleKey,
  STATIC_KEY,
  type YearStats,
} from '@/lib/mapa/recorteScale'

const stats = (p2: number | null, p98: number | null, min = p2, max = p98): YearStats =>
  ({ min, max, p2, p98 })
const stock = { gee: { visParams: { min: 0, max: 160 } } }
const netFlux = { signedFlux: true, gee: { visParams: { min: -100, max: 300 } } }

describe('recorteScale', () => {
  it('stretches a static layer from its p2 to its p98, and keeps its real extremes', () => {
    expect(recorteScale(stock, { [STATIC_KEY]: stats(12, 48, 3, 90) })).toEqual({
      stretch: { min: 12, max: 48 },
      range: { min: 3, max: 90 },
    })
  })

  it('takes the lowest p2 and the highest p98 across the years of a series', () => {
    const out = recorteScale(stock, { '2010': stats(10, 40), '2020': stats(5, 30), '2021': stats(15, 60) })

    expect(out.stretch).toEqual({ min: 5, max: 60 })
    expect(out.range).toEqual({ byYear: {
      '2010': { min: 10, max: 40 }, '2020': { min: 5, max: 30 }, '2021': { min: 15, max: 60 },
    } })
  })

  it('ignores a year with no valid pixel', () => {
    const out = recorteScale(stock, { '2010': stats(null, null), '2020': stats(5, 30) })

    expect(out.stretch).toEqual({ min: 5, max: 30 })
    expect(out.range).toEqual({ byYear: { '2020': { min: 5, max: 30 } } })
  })

  it('keeps the biome scale when no year has a pixel', () => {
    expect(recorteScale(stock, { '2010': stats(null, null) })).toEqual({ stretch: null, range: null })
    expect(recorteScale(stock, { [STATIC_KEY]: stats(null, null) })).toEqual({ stretch: null, range: null })
  })

  it('keeps the biome scale when the spread is degenerate', () => {
    expect(recorteScale(stock, { [STATIC_KEY]: stats(7, 7) }).stretch).toBeNull()
  })

  it('scales a signed flux by one factor, so zero keeps its place on the palette', () => {
    // k = max(-20 / -100, 30 / 300) = 0.2
    const { stretch } = recorteScale(netFlux, { [STATIC_KEY]: stats(-20, 30) })

    expect(stretch!.min).toBeCloseTo(-20)
    expect(stretch!.max).toBeCloseTo(60)
    // The palette's white sits at 1/4 of the bar, where zero falls on -100..300.
    expect((0 - stretch!.min) / (stretch!.max - stretch!.min)).toBeCloseTo(0.25)
  })

  it('keeps zero on the bar for a feature that only emits', () => {
    // k = max(5 / -100, 150 / 300) = 0.5
    const { stretch } = recorteScale(netFlux, { [STATIC_KEY]: stats(5, 150) })

    expect(stretch!.min).toBeCloseTo(-50)
    expect(stretch!.max).toBeCloseTo(150)
  })

  it('keeps zero on the bar for a feature that only removes', () => {
    // k = max(-60 / -100, -10 / 300) = 0.6
    const { stretch } = recorteScale(netFlux, { [STATIC_KEY]: stats(-60, -10) })

    expect(stretch!.min).toBeCloseTo(-60)
    expect(stretch!.max).toBeCloseTo(180)
  })
})

describe('parseYearStats', () => {
  it('reads the four outputs of each band of the reduction', () => {
    expect(parseYearStats({ y2010_min: 1, y2010_max: 9, y2010_p2: 2, y2010_p98: 8 }, ['2010']))
      .toEqual({ '2010': { min: 1, max: 9, p2: 2, p98: 8 } })
  })

  it('turns a missing or null output into null', () => {
    const empty = { min: null, max: null, p2: null, p98: null }

    expect(parseYearStats({ y2010_min: null }, ['2010'])).toEqual({ '2010': empty })
    expect(parseYearStats(null, [STATIC_KEY])).toEqual({ [STATIC_KEY]: empty })
  })
})

describe('keys', () => {
  it('names the layer, the recorte and the feature', () => {
    expect(recorteScaleKey('estoque_carbono', 'municipios', 174)).toBe('estoque_carbono|municipios|174')
  })

  it('prefixes a band name so a year is never a bare number', () => {
    expect(bandOf('2010')).toBe('y2010')
    expect(bandOf(STATIC_KEY)).toBe('ystatic')
  })
})
