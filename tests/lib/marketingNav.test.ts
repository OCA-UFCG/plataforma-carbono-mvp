import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { FOOTER_LINKS, HEADER_LINKS, SECTION_IDS } from '@/lib/marketing/nav'

// Reads the id of the outermost <section>/<header>/<footer> a marketing
// component actually renders, the same way tests/lib/marketingPalette.test.ts
// reads tokens straight out of globals.css: the check must fail if a component
// renames or drops its own section id, not just if two constants in nav.ts
// happen to disagree with each other.
//
// Scoped to the wrapper tag on purpose. A section is free to carry internal ids
// for its own markup — Task 3 needs one for the mobile menu panel's
// aria-controls, Task 6 needs several for the ARIA tabs pattern on Plataforma —
// and none of those must count as a "section id" or this test would fail the
// moment a filled-in section adds one.
function wrapperId(source: string): string | null {
  const wrapper = source.match(/<(?:section|header|footer)\b[^>]*>/)
  if (!wrapper) return null

  const id = wrapper[0].match(/\bid="([\w-]+)"/)
  return id ? id[1] : null
}

function renderedSectionIds(): Set<string> {
  const dir = path.join(process.cwd(), 'components/marketing')
  const ids = new Set<string>()

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.tsx')) continue

    const source = readFileSync(path.join(dir, file), 'utf8')
    const id = wrapperId(source)
    if (id) ids.add(id)
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
