import { describe, expect, it } from 'vitest'
import { FOOTER_LINKS, HEADER_LINKS, SECTION_IDS } from '@/lib/marketing/nav'

describe('marketing nav registry', () => {
  // Five sections are being removed from the landing. This is the check that
  // catches a menu entry left pointing at a section that no longer renders.
  it('points every in-page anchor at a section the page renders', () => {
    for (const link of [...HEADER_LINKS, ...FOOTER_LINKS]) {
      if (link.external) continue
      expect(link.href.startsWith('#')).toBe(true)
      expect(SECTION_IDS).toContain(link.href.slice(1))
    }
  })

  it('sends external links away from the marketing route group', () => {
    for (const link of [...HEADER_LINKS, ...FOOTER_LINKS]) {
      if (!link.external) continue
      expect(link.href.startsWith('#')).toBe(false)
    }
  })

  it('labels the navigation in Portuguese', () => {
    expect(HEADER_LINKS.map((l) => l.label)).toEqual([
      'Início',
      'Conheça a plataforma',
      'Comunicação',
    ])
  })
})
