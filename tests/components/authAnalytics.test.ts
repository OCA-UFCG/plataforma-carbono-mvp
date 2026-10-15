import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const navigation = vi.hoisted(() => ({ pathname: '/login' }))

vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }))
vi.mock('@/components/Analytics', async () => {
  const { createElement: h } = await import('react')
  return { Analytics: () => h('script', { id: 'ga' }) }
})

import { AuthAnalytics } from '@/components/auth/AuthAnalytics'

const renderAt = (pathname: string) => {
  navigation.pathname = pathname
  return renderToStaticMarkup(createElement(AuthAnalytics))
}

afterEach(() => {
  navigation.pathname = '/login'
})

describe('AuthAnalytics', () => {
  it('loads Google Analytics on the access pages that carry no code', () => {
    for (const path of ['/login', '/cadastro', '/aguardando-liberacao', '/esqueci-senha', '/aprovacoes']) {
      expect(renderAt(path)).toContain('id="ga"')
    }
  })

  it('leaves it out of the pages whose URL carries a confirmation or reset code', () => {
    expect(renderAt('/cadastro/confirmacao')).toBe('')
    expect(renderAt('/redefinir-senha')).toBe('')
  })
})
