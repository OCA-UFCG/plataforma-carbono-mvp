import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Hero from '@/components/marketing/Hero'
import { INICIO_HERO } from '@/lib/content/inicio'
import { copyDefaults } from '@/lib/content/site/model'
import type { SiteLocale } from '@/lib/locale'
import { withIntl } from '@/tests/helpers/intl'

function render(locale: SiteLocale = 'pt') {
  return renderToStaticMarkup(withIntl(createElement(Hero, { copy: copyDefaults(INICIO_HERO) }), locale))
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
    expect(render('en')).toContain('aria-label="Pause the photo rotation"')
  })
})
