import { ANNOUNCER_IDS } from '@/lib/a11y/announce'
import { VISUALLY_HIDDEN } from '@/lib/a11y/visuallyHidden'

/**
 * The two live regions announce() (lib/a11y/announce.ts) writes into, mounted
 * once per root layout as the last child of <body>.
 *
 * They are always mounted and start empty because many screen readers skip a
 * live region that is already filled when it appears; a notice that mounts
 * together with its text is never spoken. No role: plain live regions are the
 * most reliably spoken, and role="alert" would prefix every message.
 */
export function Announcer() {
  return (
    <>
      <div id={ANNOUNCER_IDS.polite} aria-live="polite" aria-atomic="true" style={VISUALLY_HIDDEN} />
      <div id={ANNOUNCER_IDS.assertive} aria-live="assertive" aria-atomic="true" style={VISUALLY_HIDDEN} />
    </>
  )
}
