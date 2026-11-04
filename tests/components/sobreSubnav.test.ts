import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import SobreSubnav from '@/components/marketing/SobreSubnav'
import { withIntl } from '@/tests/helpers/intl'

// SobreSubnav marks the current page from the pathname; pin it to the
// second entry.
vi.mock('next/navigation', () => ({ usePathname: () => '/sobre/caatinga' }))

describe('SobreSubnav', () => {
  const markup = renderToStaticMarkup(withIntl(createElement(SobreSubnav)))
  const links = markup.match(/<a [^>]*>[^<]*<\/a>/g) ?? []

  it('sets every entry in the Inter tab style of the Figma "tab item"', () => {
    expect(links).toHaveLength(4)
    for (const link of links) expect(link).toMatch(/class="[^"]*\btext-ui-tab\b/)
    expect(markup).not.toContain('text-subtle-medium')
  })

  it('marks only the current page', () => {
    const current = links.filter((link) => link.includes('aria-current="page"'))
    expect(current).toHaveLength(1)
    expect(current[0]).toContain('Conheça a Caatinga')
  })

  it('names the pages and the navigation in English for an English reader', () => {
    const english = renderToStaticMarkup(withIntl(createElement(SobreSubnav), 'en'))
    const labels = (english.match(/<a [^>]*>[^<]*<\/a>/g) ?? []).map((link) => link.replace(/<[^>]+>/g, ''))

    expect(english).toContain('<nav class="')
    expect(english).toMatch(/<nav [^>]*aria-label="About pages"/)
    expect(labels).toEqual(['Get to know the platform', 'Get to know the Caatinga', 'Understand the connection', 'How it works'])
    expect(english).toMatch(/aria-current="page"[^>]*>Get to know the Caatinga</)
  })
})
