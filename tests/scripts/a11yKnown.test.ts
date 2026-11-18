import { describe, expect, it } from 'vitest'
import { CARD_LINK_TARGET, KNOWN_VIOLATIONS } from '@/scripts/a11y/known'
import { PUBLICATION_PATH } from '@/scripts/a11y/routes'
import { DEFAULT_CARTILHAS } from '@/lib/content/comunicacao'

describe('CARD_LINK_TARGET', () => {
  it.each([
    'a[aria-labelledby="publicacao-cartilha-1-title"]',
    'a[aria-labelledby="caminhos-mapa-title"]',
    '.PublicationCard-module__Ab3x9q__surface',
    '.PublicationCard_surface__a1B2c',
    'li:nth-child(2) > .PublicationCard-module__Ab3x9q__surface',
    '.list > li > a[aria-labelledby="publicacao-x-title"]',
  ])('matches %s', (selector) => {
    expect(CARD_LINK_TARGET.test(selector)).toBe(true)
  })

  it.each([
    'button[aria-label="Mostrar Foto 2 da Caatinga"]',
    '.PublicationCard-module__Ab3x9q__surface > h3',
    'a[aria-labelledby="outro-x-title"]',
  ])('does not match %s', (selector) => {
    expect(CARD_LINK_TARGET.test(selector)).toBe(false)
  })
})

describe('card link entries', () => {
  const cardEntries = KNOWN_VIOLATIONS.filter((entry) => entry.rule === 'label-content-name-mismatch')

  it('has one entry per card page, all with the shared target and reason', () => {
    expect(cardEntries.map((entry) => entry.path)).toEqual(['/', '/comunicacao', PUBLICATION_PATH])
    for (const entry of cardEntries) {
      expect(entry.target).toBe(CARD_LINK_TARGET)
      expect(entry.reason).toBe('Card links named by their visible title; accepted by spec decision 14.')
    }
  })

  it('names the publication path the shipped first publication lives at', () => {
    expect(PUBLICATION_PATH).toBe(`/comunicacao/${DEFAULT_CARTILHAS[0].slug}`)
  })
})
