/**
 * Speaks a short outcome to screen readers through the live regions that
 * <Announcer /> (components/a11y/Announcer.tsx) mounts in every root layout.
 *
 * Call it once per outcome ("Camada carregada", "3 recortes encontrados"),
 * never per slider tick, tile or map move. 'assertive' is for errors that
 * block the task; everything else is 'polite'. The visible notices stay as
 * they are: this only speaks them.
 */

export type Politeness = 'polite' | 'assertive'

export const ANNOUNCER_IDS = { polite: 'announcer-polite', assertive: 'announcer-assertive' } as const

// Long enough for screen readers to notice the region emptied, so identical
// text placed back in it is spoken again.
export const ANNOUNCE_DELAY_MS = 100

// How long the text stays in its region. A screen reader takes the text when
// it is set, so emptying the region afterwards cuts nothing off; what it stops
// is a line like "Camada carregada" waiting at the end of <body> for a reader
// in browse mode, long after it stopped being true.
export const ANNOUNCE_CLEAR_MS = 7000

const pending: Record<Politeness, ReturnType<typeof setTimeout> | undefined> = {
  polite: undefined,
  assertive: undefined,
}
const clearing: Record<Politeness, ReturnType<typeof setTimeout> | undefined> = {
  polite: undefined,
  assertive: undefined,
}

function region(politeness: Politeness): { textContent: string | null } | null {
  if (typeof document === 'undefined' || !document) return null
  return document.getElementById(ANNOUNCER_IDS[politeness])
}

export function announce(text: string, politeness: Politeness = 'polite'): void {
  const message = text.trim()
  if (!message) return
  const target = region(politeness)
  if (!target) return

  // Clear, then set after a beat: a region whose text does not change is not
  // spoken again. A newer call within the beat replaces the older one, so a
  // burst of updates reaches the reader as its last outcome only. It also
  // takes over the region from the earlier text's clearing.
  target.textContent = ''
  clearTimeout(pending[politeness])
  clearTimeout(clearing[politeness])
  clearing[politeness] = undefined
  pending[politeness] = setTimeout(() => {
    pending[politeness] = undefined
    const current = region(politeness)
    if (!current) return
    current.textContent = message
    clearing[politeness] = setTimeout(() => {
      clearing[politeness] = undefined
      const spoken = region(politeness)
      if (spoken) spoken.textContent = ''
    }, ANNOUNCE_CLEAR_MS)
  }, ANNOUNCE_DELAY_MS)
}
