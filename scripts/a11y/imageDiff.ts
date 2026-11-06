/** A decoded image: `data` holds 4 bytes (r, g, b, a) per pixel, row by row. */
export type RgbaImage = { width: number; height: number; data: Uint8Array }

export type ImageDiff =
  | { kind: 'size'; before: [number, number]; after: [number, number] }
  | { kind: 'pixels'; differing: number; diff: RgbaImage }

/**
 * Compares two screenshots exactly: the guard's promise is that a change is
 * invisible pixel for pixel (spec decision 2), so any channel of any pixel
 * counts. The diff image paints differing pixels opaque red over a faded grey
 * of the after image, so the change stands out against the page's shape.
 * Images of different sizes are not compared: the page grew or shrank.
 */
export function diffImages(before: RgbaImage, after: RgbaImage): ImageDiff {
  if (before.width !== after.width || before.height !== after.height) {
    return { kind: 'size', before: [before.width, before.height], after: [after.width, after.height] }
  }

  const data = new Uint8Array(after.data.length)
  let differing = 0
  for (let i = 0; i < data.length; i += 4) {
    const same =
      before.data[i] === after.data[i] &&
      before.data[i + 1] === after.data[i + 1] &&
      before.data[i + 2] === after.data[i + 2] &&
      before.data[i + 3] === after.data[i + 3]
    if (same) {
      const luma = 0.299 * after.data[i] + 0.587 * after.data[i + 1] + 0.114 * after.data[i + 2]
      const grey = 255 - Math.round((255 - luma) * 0.25)
      data.set([grey, grey, grey, 255], i)
    } else {
      differing++
      data.set([255, 0, 0, 255], i)
    }
  }
  return { kind: 'pixels', differing, diff: { width: after.width, height: after.height, data } }
}
