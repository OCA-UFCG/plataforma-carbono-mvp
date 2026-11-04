import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import SiteHeader from '@/components/marketing/SiteHeader'
import type { SiteLocale } from '@/lib/locale'
import { withIntl } from '@/tests/helpers/intl'

// The platform renders the site header with the account slot (Figma
// "Menu-superior" instance 19413:54303); pin the route and the session.
const pathname = vi.hoisted(() => ({ current: '/mapa' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current, useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { email: 'pessoa@exemplo.org' }, signOut: vi.fn() }),
}))

function render(props: { account?: boolean } = {}, locale: SiteLocale = 'pt') {
  return renderToStaticMarkup(withIntl(createElement(SiteHeader, props), locale))
}

describe('SiteHeader on the platform', () => {
  it('marks "Plataforma" as the current page', () => {
    pathname.current = '/mapa'
    const plataforma = render({ account: true }).match(/<a [^>]*>Plataforma<\/a>/g) ?? []
    // The inline nav and the mobile panel each carry the entry.
    expect(plataforma.length).toBeGreaterThan(0)
    for (const link of plataforma) expect(link).toContain('aria-current="page"')
  })

  it('shows the account e-mail and a "Sair" button', () => {
    pathname.current = '/mapa'
    const markup = render({ account: true })
    expect(markup).toContain('pessoa@exemplo.org')
    expect(markup).toMatch(/<button [^>]*>Sair<\/button>/)
  })
})

describe('SiteHeader on the marketing pages', () => {
  it('keeps the account slot out unless asked for it', () => {
    pathname.current = '/'
    const markup = render()
    expect(markup).not.toContain('pessoa@exemplo.org')
    expect(markup).not.toContain('>Sair<')
  })

  it('offers both languages as buttons, Portuguese pressed', () => {
    pathname.current = '/'
    const markup = render()
    const portugues = markup.match(/<button [^>]*>PT-BR<\/button>/g) ?? []
    const ingles = markup.match(/<button [^>]*>En<\/button>/g) ?? []

    // The inline bar and the mobile panel each carry the switch.
    expect(portugues).toHaveLength(2)
    expect(ingles).toHaveLength(2)
    for (const button of portugues) expect(button).toMatch(/aria-pressed="true"[^>]*lang="pt-BR"|lang="pt-BR"[^>]*aria-pressed="true"/)
    for (const button of ingles) expect(button).toMatch(/aria-pressed="false"[^>]*lang="en"|lang="en"[^>]*aria-pressed="false"/)
    expect(markup).not.toContain('aria-disabled')
  })

  it('speaks English, and says so, for a visitor who chose it', () => {
    pathname.current = '/'
    const markup = render({}, 'en')

    expect(markup).toMatch(/<header [^>]*lang="en"/)
    expect(markup).toContain('aria-label="Main navigation"')
    for (const label of ['Home', 'About', 'Glossary', 'Communication', 'Territory summary', 'Platform']) {
      expect(markup, label).toMatch(new RegExp(`<a [^>]*>${label}</a>`))
    }
    for (const button of markup.match(/<button [^>]*>En<\/button>/g) ?? []) expect(button).toContain('aria-pressed="true"')
    expect(markup).not.toContain('Navegação principal')
  })

  it('leaves "Plataforma" unmarked off the platform', () => {
    pathname.current = '/'
    const plataforma = render().match(/<a [^>]*>Plataforma<\/a>/g) ?? []
    expect(plataforma.length).toBeGreaterThan(0)
    for (const link of plataforma) expect(link).not.toContain('aria-current')
  })
})
