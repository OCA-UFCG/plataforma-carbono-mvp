/**
 * Serious or critical axe violations the check forgives, each on one path and
 * only for the nodes its `target` matches (tested against axe's selector of the
 * node, e.g. `button[aria-label="Mostrar Foto 2 da Caatinga"]`). A new node
 * that breaks the same rule on that path is not forgiven. An entry is a known
 * limitation the spec keeps (§8), a fix a later workstream owns, or a reading
 * the spec accepts (§3), and its reason says which. An entry that no longer
 * matches a violation fails the check as stale, so the fix that removes a
 * violation also removes its entry. Never add one only to make a run pass.
 */
export type KnownViolation = { path: string; rule: string; target: RegExp; reason: string }

export const KNOWN_VIOLATIONS: readonly KnownViolation[] = [
  {
    path: '/',
    rule: 'target-size',
    target: /^button\[aria-label="Mostrar Foto \d+ da Caatinga"\]$/,
    reason: 'The hero dots are 6 px; workstream F enlarges their hit area (spec §6 F).',
  },
  // Card links are named by their visible title (aria-labelledby) on purpose,
  // so a screen reader hears "<title>, link" rather than the badge first, and
  // gets the description through aria-describedby (Caminhos.tsx,
  // Comunicacao.tsx, PublicationCard.tsx). axe 4.14 promoted this rule from
  // experimental and wants the badge and description in the name too; spec
  // decision 14 keeps the title, which is the card's visible label, so 2.5.3
  // holds. The targets are those three components' title ids.
  {
    path: '/',
    rule: 'label-content-name-mismatch',
    target: /^a\[aria-labelledby="(caminhos|comunicacao|publicacao)-[a-z0-9-]+-title"\]$/,
    reason: 'Card links named by their visible title; accepted by spec decision 14.',
  },
  {
    path: '/comunicacao',
    rule: 'label-content-name-mismatch',
    target: /^a\[aria-labelledby="(caminhos|comunicacao|publicacao)-[a-z0-9-]+-title"\]$/,
    reason: 'Card links named by their visible title; accepted by spec decision 14.',
  },
  // The related-publications band under a publication draws the same
  // PublicationCard link. axe has no id or attribute to name it by there, so
  // it falls back to the CSS-module class (the hash changes with the build).
  {
    path: '/comunicacao/cartilha-1-o-que-e-credito-de-carbono',
    rule: 'label-content-name-mismatch',
    target: /^(a\[aria-labelledby="publicacao-[a-z0-9-]+-title"\]|\.PublicationCard-module__[\w-]+__surface)$/,
    reason: 'Card links named by their visible title; accepted by spec decision 14.',
  },
]
