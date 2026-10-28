import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import SiteHeader from '@/components/marketing/SiteHeader'

// The platform renders the site header with the account slot (Figma
// "Menu-superior" instance 19413:54303); pin the route and the session.
const pathname = vi.hoisted(() => ({ current: '/mapa' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { email: 'pessoa@exemplo.org' }, signOut: vi.fn() }),
}))

function render(props: { account?: boolean } = {}) {
  return renderToStaticMarkup(createElement(SiteHeader, props))
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

  it('leaves "Plataforma" unmarked off the platform', () => {
    pathname.current = '/'
    const plataforma = render().match(/<a [^>]*>Plataforma<\/a>/g) ?? []
    expect(plataforma.length).toBeGreaterThan(0)
    for (const link of plataforma) expect(link).not.toContain('aria-current')
  })
})
