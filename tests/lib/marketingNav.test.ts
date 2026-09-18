import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { FOOTER_LINKS, HEADER_LINKS, SECTION_IDS } from '@/lib/marketing/nav'

// Reads the `id="…"` a section component actually renders, the same way
// tests/lib/marketingPalette.test.ts reads tokens straight out of globals.css:
// the check must fail if a component renames or drops its section id, not just
// if two constants in nav.ts happen to disagree with each other.
function renderedSectionIds(): Set<string> {
  const dir = path.join(process.cwd(), 'components/marketing')
  const ids = new Set<string>()

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.tsx')) continue

    const source = readFileSync(path.join(dir, file), 'utf8')
    for (const [, id] of source.matchAll(/\bid="([\w-]+)"/g)) {
      ids.add(id)
    }
  }

  return ids
}

describe('marketing nav registry', () => {
  it('SECTION_IDS matches exactly the ids the section components render', () => {
    expect(new Set(SECTION_IDS)).toEqual(renderedSectionIds())
  })

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
