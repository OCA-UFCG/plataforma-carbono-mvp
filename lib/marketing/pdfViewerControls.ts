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

// What the page field does when the reader presses Enter (`submit`) or leaves
// it (`blur`): the page to go to, or null to stay put, and what the field shows
// afterwards. Leaving the field on the page already shown must not navigate:
// pdf.js scrolls back to the top of that page even when the number is the
// same, which would throw away the reader's position every time focus moves
// through the toolbar. Enter always navigates, so it can re-align a page.
export function resolvePageField(
  value: string,
  pageCount: number,
  currentPage: number,
  trigger: 'submit' | 'blur',
): { navigate: number | null; field: string } {
  const target = parsePageInput(value, pageCount)

  if (target === null || (trigger === 'blur' && target === currentPage)) {
    return { navigate: null, field: String(currentPage) }
  }

  return { navigate: target, field: String(target) }
}

// The share of the PDF downloaded so far, as a whole percentage, or null when
// the server did not say how big the file is. Contentful's CDN hides the
// header pdf.js needs to fetch only the first page's bytes, so a publication
// loads whole before anything shows, and this is what the reader has to say
// meanwhile (docs: DOCUMENTACAO.md, "Conteúdo editorial da landing").
export function loadProgress(loaded: number, total: number): number | null {
  if (!Number.isFinite(total) || total <= 0) return null

  return Math.min(100, Math.floor((loaded / total) * 100))
}

// How many digits the page field is sized for: the document's page count, so
// the field stays as narrow as the Figma's (33px for one digit) and grows only
// for longer documents. Two until the count is known, which covers most
// publications without the field changing width when the PDF arrives.
export function pageFieldDigits(pageCount: number): number {
  return pageCount > 0 ? String(pageCount).length : 2
}

export function formatZoom(scale: number): string {
  return `${Math.round(scale * 100)}%`
}
