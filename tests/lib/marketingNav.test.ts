import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAPA_URL } from '@/lib/config'
import {
  FOOTER_LINKS,
  HEADER_LINKS,
  SECTION_IDS,
  SOBRE_PAGES,
  activeNavHref,
} from '@/lib/marketing/nav'

// Reads the id of the outermost <section>/<header>/<footer> a marketing
// component actually renders, the same way tests/lib/marketingPalette.test.ts
// reads tokens straight out of globals.css: the check must fail if a component
// renames or drops its own section id, not just if two constants in nav.ts
// happen to disagree with each other.
//
// Scoped to the wrapper tag on purpose. A section is free to carry internal ids
// for its own markup — the mobile menu panel's aria-controls, the ARIA tabs
// pattern on Plataforma — and none of those must count as a "section id" or
// this test would fail the moment a filled-in section adds one.
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

// A route of the marketing group exists when its page file does: "/" is
// app/(marketing)/page.tsx, "/sobre/caatinga" is app/(marketing)/sobre/caatinga/page.tsx.
function routeExists(route: string): boolean {
  return existsSync(path.join(process.cwd(), 'app/(marketing)', route, 'page.tsx'))
}

describe('marketing nav registry', () => {
  it('SECTION_IDS matches exactly the ids the section components render', () => {
    expect(new Set(SECTION_IDS)).toEqual(renderedSectionIds())
  })

  it('gives every Sobre page a route', () => {
    expect(SOBRE_PAGES.map((p) => p.href)).toEqual([
      '/sobre',
      '/sobre/caatinga',
      '/sobre/carbono-e-comunidades',
      '/sobre/como-funciona',
    ])
    for (const page of SOBRE_PAGES) {
      expect(routeExists(page.href), `${page.href} has no page.tsx`).toBe(true)
    }
  })

  // The header and footer render on every marketing page, so a bare "#id" would
  // only work on the landing. Every internal link is a route, or a landing
  // anchor spelled "/#id" whose section the landing actually renders.
  it('points every internal link at a route or a landing section', () => {
    for (const link of [...HEADER_LINKS, ...FOOTER_LINKS]) {
      if (link.external) continue
      expect(link.href.startsWith('#'), `${link.href} is a bare anchor`).toBe(false)
      if (link.href.startsWith('/#')) {
        expect(SECTION_IDS).toContain(link.href.slice(2))
      } else {
        expect(routeExists(link.href), `${link.href} has no page.tsx`).toBe(true)
      }
    }
  })

  it('sends external links away from the marketing route group', () => {
    for (const link of [...HEADER_LINKS, ...FOOTER_LINKS]) {
      if (!link.external) continue
      expect(link.href).toBe(MAPA_URL)
    }
  })

  it('labels the navigation in Portuguese', () => {
    expect(HEADER_LINKS.map((l) => l.label)).toEqual([
      'Início',
      'Sobre a plataforma',
      'Comunicação',
    ])
    expect(SOBRE_PAGES.map((p) => p.label)).toEqual([
      'Conheça a plataforma',
      'Conheça a Caatinga',
      'Entenda essa relação',
      'Como funciona',
    ])
  })
})

describe('activeNavHref', () => {
  it('marks the header entry that owns the current route', () => {
    expect(activeNavHref('/')).toBe('/')
    expect(activeNavHref('/sobre')).toBe('/sobre')
    expect(activeNavHref('/sobre/como-funciona')).toBe('/sobre')
    expect(activeNavHref('/comunicacao')).toBe('/comunicacao')
  })

  it('marks nothing for a route no entry owns', () => {
    expect(activeNavHref('/sobrefalso')).toBeNull()
    expect(activeNavHref('/outra')).toBeNull()
  })
})
