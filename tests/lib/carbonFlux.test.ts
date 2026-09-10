import { describe, expect, it } from 'vitest'
import { describeFlux, fluxInk, zeroPosition } from '@/lib/mapa/carbonFlux'

// Sentinel values, so swapping the red and the green mapping cannot pass by
// coincidence the way two real hexes of the same family might.
const inks = { emissionInk: 'RED', removalInk: 'GREEN', text: 'INK', dim: 'DIM' }

describe('describeFlux', () => {
  it('reads a negative flux as sequestration, dropping the sign from the magnitude', () => {
    expect(describeFlux(-45.2)).toEqual({
      magnitude: 45.2,
      direction: 'removal',
      label: 'sequestrou',
      noun: 'sequestro',
      arrow: '↓',
    })
  })

  it('reads a positive flux as emission', () => {
    expect(describeFlux(120.8)).toEqual({
      magnitude: 120.8,
      direction: 'emission',
      label: 'emitiu',
      noun: 'emissão',
      arrow: '↑',
    })
  })

  it('reads exactly zero as equilibrium, not as a sequestration of nothing', () => {
    expect(describeFlux(0)).toEqual({
      magnitude: 0,
      direction: 'neutral',
      label: 'em equilíbrio',
      noun: 'equilíbrio',
      arrow: '',
    })
  })

  // A missing pixel is not a balanced one: labelling nodata "em equilíbrio"
  // would state a measurement the data never made.
  it('reads a non-finite flux as unknown rather than as equilibrium', () => {
    expect(describeFlux(NaN)).toEqual({
      magnitude: NaN,
      direction: 'unknown',
      label: '',
      noun: '',
      arrow: '',
    })
  })
})

describe('fluxInk', () => {
  it.each([
    ['emission', 'RED'],
    ['removal', 'GREEN'],
    ['neutral', 'INK'],
    ['unknown', 'DIM'],
  ] as const)('paints a %s value with its own ink', (direction, expected) => {
    expect(fluxInk(direction, inks)).toBe(expected)
  })
})

describe('zeroPosition', () => {
  // The calibrated gfw_netflux range. The palette's neutral stop has to land
  // on this fraction, otherwise the white of the bar marks an emission.
  it('places the equilibrium a quarter along the calibrated netflux range', () => {
    expect(zeroPosition(-100, 300)).toBe(0.25)
  })

  it('places the equilibrium at the very start when the range opens at zero', () => {
    expect(zeroPosition(0, 500)).toBe(0)
  })

  it('returns null when the range is entirely above zero', () => {
    expect(zeroPosition(50, 200)).toBeNull()
  })

  it('returns null when the range is entirely below zero', () => {
    expect(zeroPosition(-200, -50)).toBeNull()
  })

  it('returns null for a degenerate range instead of dividing by zero', () => {
    expect(zeroPosition(0, 0)).toBeNull()
  })
})
