// Pure logic behind the publication reader's toolbar (Figma 19015:13073),
// kept out of the client component so it can be tested without a DOM.

// The zoom steps. pdf.js's own increaseScale() moves 75% -> 90%, off the round
// percentages the toolbar's field shows.
export const ZOOM_STEPS: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

// Float scales that pdf.js computes land a hair off a step; within this, they
// count as on it.
const EPSILON = 1e-3

// The next step strictly above (1) or below (-1) `current`, or null at the end
// of the range. `current` may sit between steps: the reader opens at
// `page-fit`, around 0.95, and "+" from there goes to 1, not to 1.25.
export function nextZoomStep(current: number, direction: 1 | -1): number | null {
  if (direction === 1) return ZOOM_STEPS.find((step) => step > current + EPSILON) ?? null

  return [...ZOOM_STEPS].reverse().find((step) => step < current - EPSILON) ?? null
}

// The page field: a whole page number within the document, or null, in which
// case the field shows the current page again.
export function parsePageInput(value: string, pageCount: number): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null

  const page = Number(trimmed)
  return page >= 1 && page <= pageCount ? page : null
}

export function formatZoom(scale: number): string {
  return `${Math.round(scale * 100)}%`
}
