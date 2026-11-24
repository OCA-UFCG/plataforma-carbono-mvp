import { describe, expect, it } from 'vitest'
import { BANNER_LINK_PATTERN, bannerLink } from '@/lib/content/bannerLink'

// The link of a hero banner's button is typed by an editor and lands in an
// href, so only a path of this site or an https address may get through.
describe('bannerLink', () => {
  it('keeps a site path or an https address, trimmed', () => {
    const kept = [
      ['/', '/'],
      ['/sobre', '/sobre'],
      ['/comunicacao#eventos', '/comunicacao#eventos'],
      ['/sobre/caatinga', '/sobre/caatinga'],
      ['https://www.gov.br/sudene', 'https://www.gov.br/sudene'],
      ['  /sobre ', '/sobre'],
    ]

    for (const [raw, link] of kept) expect(bannerLink(raw), raw).toBe(link)
  })

  it('drops anything else', () => {
    const dropped = [
      '',
      null,
      undefined,
      'sobre',
      'www.site.org',
      'http://site.org',
      '//evil.example',
      '/\\evil.example',
      // A browser deletes tab, LF and CR anywhere in a URL, so each of these
      // is "//evil.example" or "/\\evil.example" to it: another host.
      '/\t/evil.example',
      '/\n/evil.example',
      '/\r\\evil.example',
      '/\t\\evil.example',
      '/sobre\t/x',
      'https://',
      'https:///evil.example',
      'javascript:alert(1)',
      'mailto:a@b.org',
    ]

    for (const raw of dropped) expect(bannerLink(raw), String(raw)).toBeUndefined()
  })

  it('is the rule Contentful enforces', () => {
    expect(new RegExp(BANNER_LINK_PATTERN).test('/sobre')).toBe(true)
    expect(new RegExp(BANNER_LINK_PATTERN).test('//evil.example')).toBe(false)
  })
})
