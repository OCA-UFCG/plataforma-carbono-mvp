/**
 * Serious or critical axe violations the check forgives, each on one path. An
 * entry is either a known limitation the spec keeps (§8) or a fix a later
 * workstream owns, and its reason says which. An entry whose violation no
 * longer occurs fails the check as stale, so the fix that removes a violation
 * also removes its entry. Never add one only to make a run pass.
 */
export type KnownViolation = { path: string; rule: string; reason: string }

export const KNOWN_VIOLATIONS: readonly KnownViolation[] = [
  {
    path: '/',
    rule: 'target-size',
    reason: 'The hero dots are 6 px; workstream F enlarges their hit area (spec §6 F).',
  },
  // Card links are named by their visible title (aria-labelledby) on purpose,
  // so a screen reader hears "<title>, link" rather than the badge first
  // (Caminhos.tsx, PublicationCard.tsx). axe 4.14 promoted this rule from
  // experimental and wants the badge and description in the name too. Whether
  // WCAG 2.5.3 asks for that is open with the user (2026-11-03).
  {
    path: '/',
    rule: 'label-content-name-mismatch',
    reason: 'Card links named by their title on purpose; the 2.5.3 reading is open with the user.',
  },
  {
    path: '/comunicacao',
    rule: 'label-content-name-mismatch',
    reason: 'Card links named by their title on purpose; the 2.5.3 reading is open with the user.',
  },
]
