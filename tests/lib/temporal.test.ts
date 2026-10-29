import { describe, expect, it } from 'vitest'
import { labelSide } from '@/lib/mapa/temporal'

describe('labelSide', () => {
  it('keeps the label left of the thumb, as Figma draws it, when it fits', () => {
    expect(labelSide(0.5, 285, 52)).toBe('left')
    expect(labelSide(1, 285, 52)).toBe('left')
  })

  it('flips the label right of the thumb near the first year', () => {
    expect(labelSide(0, 285, 52)).toBe('right')
    expect(labelSide(0.21, 285, 52)).toBe('right') // 0.21 × 265 − 5 = 50.65 < 52
    expect(labelSide(0.22, 285, 52)).toBe('left')  // 0.22 × 265 − 5 = 53.3 ≥ 52
  })

  it('takes the roomier side when neither fits, on the narrowest track', () => {
    expect(labelSide(0.4, 122, 52)).toBe('right') // 35.8 on the left, 56.2 on the right
    expect(labelSide(0.5, 122, 52)).toBe('left')  // 46 on each side: a tie stays left
  })

  it('stays left before the track is measured', () => {
    expect(labelSide(0, 0, 0)).toBe('left')
  })
})
