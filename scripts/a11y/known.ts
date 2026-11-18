import { PUBLICATION_PATH } from './routes'

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

const CARD_LINK_REASON = 'Card links named by their visible title; accepted by spec decision 14.'

// Card links are named by their visible title (aria-labelledby) on purpose,
// so a screen reader hears "<title>, link" rather than the badge first, and
// gets the description through aria-describedby (Caminhos.tsx,
// Comunicacao.tsx, PublicationCard.tsx). axe 4.14 promoted this rule from
// experimental and wants the badge and description in the name too; spec
// decision 14 keeps the title, which is the card's visible label, so 2.5.3
// holds.
//
// axe reports each flagged node as the shortest selector that is unique in the
// document. A band holding one card has a unique CSS-module class on its link,
// so axe names it by the class; a band holding several cards has no unique
// class, so axe names the link by its title attribute, or by a combinator path
// to it (`li:nth-child(2) > ...`). CARD_LINK_TARGET therefore tests only the
// last compound of the selector (the part after the last space, `>`, `+` or
// `~`), where the link's own attribute or class sits. The class also differs by
// bundler: Turbopack names it `PublicationCard-module__<x>__surface`, webpack
// `PublicationCard_surface__<hash>`, so both forms are accepted.
export const CARD_LINK_TARGET =
  /(?:^|[\s>+~])[^\s>+~]*(?:\[aria-labelledby="(?:caminhos|comunicacao|publicacao)-[a-z0-9-]+-title"\]|\.PublicationCard(?:-module__[\w-]+__surface|_surface__[\w-]+))[^\s>+~]*$/

export const KNOWN_VIOLATIONS: readonly KnownViolation[] = [
  {
    path: '/',
    rule: 'target-size',
    target: /^button\[aria-label="Mostrar Foto \d+ da Caatinga"\]$/,
    reason: 'The hero dots are 6 px; workstream F enlarges their hit area (spec §6 F).',
  },
  {
    path: '/',
    rule: 'label-content-name-mismatch',
    target: CARD_LINK_TARGET,
    reason: CARD_LINK_REASON,
  },
  {
    path: '/comunicacao',
    rule: 'label-content-name-mismatch',
    target: CARD_LINK_TARGET,
    reason: CARD_LINK_REASON,
  },
  // The related-publications band under a publication draws the same
  // PublicationCard link, so the same target applies there. PUBLICATION_PATH is
  // the page the axe check visits (routes.ts), so a renamed slug changes once.
  {
    path: PUBLICATION_PATH,
    rule: 'label-content-name-mismatch',
    target: CARD_LINK_TARGET,
    reason: CARD_LINK_REASON,
  },
]
