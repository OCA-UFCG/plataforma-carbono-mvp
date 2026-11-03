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

const pending: Record<Politeness, ReturnType<typeof setTimeout> | undefined> = {
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
  // burst of updates reaches the reader as its last outcome only.
  target.textContent = ''
  clearTimeout(pending[politeness])
  pending[politeness] = setTimeout(() => {
    pending[politeness] = undefined
    const current = region(politeness)
    if (current) current.textContent = message
  }, ANNOUNCE_DELAY_MS)
}
