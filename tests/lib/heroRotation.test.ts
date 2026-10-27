import { describe, expect, it } from 'vitest'
import { stepPhotoIndex } from '@/lib/marketing/heroRotation'

describe('stepPhotoIndex', () => {
  it('moves one photo forward and back', () => {
    expect(stepPhotoIndex(1, 1, 4)).toBe(2)
    expect(stepPhotoIndex(2, -1, 4)).toBe(1)
  })

  it('wraps to the first photo after the last', () => {
    expect(stepPhotoIndex(3, 1, 4)).toBe(0)
  })

  it('wraps to the last photo before the first', () => {
    expect(stepPhotoIndex(0, -1, 4)).toBe(3)
  })

  it('stays on the only photo when there is just one', () => {
    expect(stepPhotoIndex(0, 1, 1)).toBe(0)
    expect(stepPhotoIndex(0, -1, 1)).toBe(0)
  })

  it('wraps a delta larger than the count', () => {
    expect(stepPhotoIndex(1, -6, 4)).toBe(3)
    expect(stepPhotoIndex(1, 6, 4)).toBe(3)
  })
})
