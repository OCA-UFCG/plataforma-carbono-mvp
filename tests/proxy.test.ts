import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { config, proxy } from '@/proxy'
import { REQUEST_PATH_HEADER } from '@/lib/marketing/requestPath'
import { SOBRE_PAGES } from '@/lib/marketing/nav'

// The marketing layout reads the requested path from this header to send the
// login page back to it (app/(marketing)/layout.tsx). NextResponse.next()
// carries overridden request headers as x-middleware-request-<name>.
function forwardedPath(response: Response): string | null {
  return response.headers.get(`x-middleware-request-${REQUEST_PATH_HEADER}`)
}

describe('proxy', () => {
  it('runs on every marketing page', () => {
    for (const url of ['/', '/comunicacao', ...SOBRE_PAGES.map((p) => p.href)]) {
      expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(true)
    }
  })

  it('stays off the maps, the report, the login and the API', () => {
    for (const url of ['/mapa', '/relatorio', '/login', '/api/session', '/api/gee/tile']) {
      expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(false)
    }
  })

  it('forwards the requested path, overwriting one the client sent', () => {
    const request = new NextRequest('https://caativar.test/sobre/caatinga?x=1', {
      headers: { [REQUEST_PATH_HEADER]: '//evil.com' },
    })
    expect(forwardedPath(proxy(request))).toBe('/sobre/caatinga')
  })
})
