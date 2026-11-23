import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Hero from '@/components/marketing/Hero'
import { DEFAULT_BANNERS, type Banner } from '@/lib/content/banners'
import type { SiteLocale } from '@/lib/locale'
import { withIntl } from '@/tests/helpers/intl'

function render(banners: Banner[] = DEFAULT_BANNERS, locale: SiteLocale = 'pt') {
  return renderToStaticMarkup(withIntl(createElement(Hero, { banners }), locale))
}

// The server render is the rotating state: reduced motion is only known in
// the browser, so the toggle starts as "Pausar".
describe('Hero pause toggle', () => {
  it('offers a pause toggle after the dots', () => {
    const markup = render()
    const toggle = markup.match(/<button [^>]*aria-label="Pausar a troca de fotos"[^>]*>/)
    expect(toggle).not.toBeNull()
    expect(toggle![0]).not.toContain('aria-pressed')
    expect(markup.indexOf(toggle![0])).toBeGreaterThan(markup.indexOf('aria-label="Mostrar Foto 4 da Caatinga"'))
  })

  it('keeps the toggle out of the photo picker group', () => {
    const markup = render()
    const start = markup.indexOf('role="group"')
    const group = markup.slice(start, markup.indexOf('</div>', start))
    expect(group.match(/<button/g)).toHaveLength(4)
    expect(group).not.toContain('Pausar')
  })

  it('names the toggle in English', () => {
    expect(render(DEFAULT_BANNERS, 'en')).toContain('aria-label="Pause the photo rotation"')
  })
})

// The banners come from Contentful (lib/content/banners.ts), as many as the
// editors publish.
describe('Hero banners', () => {
  it('renders one card per banner, in order', () => {
    const titles = [...render().matchAll(/<h1[^>]*>([^<]*)<\/h1>/g)].map((match) => match[1])

    expect(titles).toEqual(DEFAULT_BANNERS.map((banner) => banner.title))
  })

  // With one banner there is nothing to pick, step through or pause.
  it('leaves out the picker, the arrows and the pause toggle for a single banner', () => {
    const markup = render([DEFAULT_BANNERS[0]])

    expect(markup).toContain(DEFAULT_BANNERS[0].title)
    expect(markup).not.toContain('role="group"')
    expect(markup).not.toContain('Pausar a troca de fotos')
    expect(markup).not.toContain('Foto anterior')
    expect(markup).not.toContain('Próxima foto')
  })

  it('renders a banner without a button', () => {
    const markup = render([{ ...DEFAULT_BANNERS[0], action: undefined }, DEFAULT_BANNERS[1]])

    expect(markup).not.toContain(DEFAULT_BANNERS[0].action!.label)
    expect(markup).toContain(DEFAULT_BANNERS[1].action!.label)
  })

  it('credits the first photo when it has a credit', () => {
    expect(render()).toContain('Foto: Artur Lourenço')
    expect(render(DEFAULT_BANNERS.slice(0, 2).map((banner) => ({ ...banner, credit: undefined })))).not.toContain('Foto:')
  })

  it('renders every photo even when two banners share one', () => {
    const markup = render([DEFAULT_BANNERS[0], { ...DEFAULT_BANNERS[1], photo: DEFAULT_BANNERS[0].photo }])

    expect(markup.match(/<img /g)).toHaveLength(2)
  })
})
