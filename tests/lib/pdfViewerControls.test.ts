import { describe, expect, it } from 'vitest'
import { formatZoom, nextZoomStep, parsePageInput } from '@/lib/marketing/pdfViewerControls'

describe('nextZoomStep', () => {
  it('moves one step up and down from a step', () => {
    expect(nextZoomStep(0.75, 1)).toBe(1)
    expect(nextZoomStep(0.75, -1)).toBe(0.5)
  })

  it('moves to the nearest step from an off-step fit', () => {
    expect(nextZoomStep(0.95, 1)).toBe(1)
    expect(nextZoomStep(0.95, -1)).toBe(0.75)
  })

  it('treats a float a hair off a step as that step', () => {
    expect(nextZoomStep(0.7500001, 1)).toBe(1)
    expect(nextZoomStep(0.7499999, -1)).toBe(0.5)
  })

  it('stops at the ends of the range', () => {
    expect(nextZoomStep(0.5, -1)).toBeNull()
    expect(nextZoomStep(3, 1)).toBeNull()
  })

  it('comes back into the range from outside it', () => {
    expect(nextZoomStep(0.3, 1)).toBe(0.5)
    expect(nextZoomStep(4, -1)).toBe(3)
  })
})

describe('parsePageInput', () => {
  it('accepts a page within the document', () => {
    expect(parsePageInput('10', 20)).toBe(10)
    expect(parsePageInput(' 3 ', 20)).toBe(3)
  })

  it('rejects anything else', () => {
    for (const value of ['0', '21', '999', 'abc', '', '2.5', '1e1', '-1']) {
      expect(parsePageInput(value, 20), value).toBeNull()
    }
  })
})

describe('formatZoom', () => {
  it('rounds to a whole percentage', () => {
    expect(formatZoom(0.9512)).toBe('95%')
    expect(formatZoom(0.75)).toBe('75%')
  })
})
