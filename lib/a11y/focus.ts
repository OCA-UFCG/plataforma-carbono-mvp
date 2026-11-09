/**
 * Moves focus to the first candidate able to take it, and returns that element
 * (or null). For when the focused control unmounts or turns disabled, which
 * would otherwise drop focus to <body> and send a keyboard or screen-reader
 * user back to the top of the page.
 *
 * A candidate is skipped when it is missing, no longer in the document, or
 * `:disabled`. Candidates marked `aria-disabled` stay eligible on purpose: a
 * control that must keep focus while it works uses aria-disabled plus
 * aria-busy instead of `disabled` (spec §6 A.2). Whether focus landed is read
 * back from activeElement, because a hidden, inert or display:none element
 * ignores focus() without an error.
 *
 * What the move shows: a control target draws the ring a keyboard user already
 * sees; a heading target carries tabIndex={-1} and `:focus { outline: none }`
 * in its own stylesheet (as .territorios-secao-titulo does), so it draws
 * nothing.
 */
export function focusFirst(
  candidates: ReadonlyArray<HTMLElement | null | undefined>,
  options?: FocusOptions,
): HTMLElement | null {
  for (const el of candidates) {
    if (!el || !el.isConnected || el.matches(':disabled')) continue
    el.focus(options)
    if (el.ownerDocument.activeElement === el) return el
  }
  return null
}
