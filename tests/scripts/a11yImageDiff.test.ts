import { describe, expect, it } from 'vitest'
import { diffImages, type RgbaImage } from '@/scripts/a11y/imageDiff'

function img(width: number, height: number, fill: [number, number, number, number]): RgbaImage {
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < data.length; i += 4) data.set(fill, i)
  return { width, height, data }
}

function pixel(image: RgbaImage, index: number) {
  return Array.from(image.data.slice(index * 4, index * 4 + 4))
}

describe('diffImages', () => {
  it('finds no difference between identical images', () => {
    const result = diffImages(img(2, 2, [10, 20, 30, 255]), img(2, 2, [10, 20, 30, 255]))
    expect(result.kind).toBe('pixels')
    if (result.kind === 'pixels') expect(result.differing).toBe(0)
  })

  it('counts and paints each differing pixel', () => {
    const after = img(2, 2, [10, 20, 30, 255])
    after.data.set([10, 21, 30, 255], 4) // pixel (1, 0)
    const result = diffImages(img(2, 2, [10, 20, 30, 255]), after)
    if (result.kind !== 'pixels') throw new Error('expected a pixel diff')
    expect(result.differing).toBe(1)
    expect(pixel(result.diff, 1)).toEqual([255, 0, 0, 255])
  })

  it('leaves unchanged pixels grey, never red', () => {
    const after = img(2, 2, [10, 20, 30, 255])
    after.data.set([200, 0, 0, 255], 4)
    const result = diffImages(img(2, 2, [10, 20, 30, 255]), after)
    if (result.kind !== 'pixels') throw new Error('expected a pixel diff')
    for (const index of [0, 2, 3]) {
      const [r, g, b, a] = pixel(result.diff, index)
      expect(r).toBe(g)
      expect(g).toBe(b)
      expect(a).toBe(255)
    }
  })

  it('counts an alpha-only change', () => {
    const result = diffImages(img(1, 1, [10, 20, 30, 255]), img(1, 1, [10, 20, 30, 254]))
    if (result.kind !== 'pixels') throw new Error('expected a pixel diff')
    expect(result.differing).toBe(1)
  })

  it('reports a size change instead of comparing', () => {
    expect(diffImages(img(2, 2, [0, 0, 0, 255]), img(2, 3, [0, 0, 0, 255]))).toEqual({
      kind: 'size',
      before: [2, 2],
      after: [2, 3],
    })
  })
})
