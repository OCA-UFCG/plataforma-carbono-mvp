import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasTrustedOrigin } from '@/lib/access/trustedOrigin'

afterEach(() => {
  vi.unstubAllEnvs()
})

const post = (url: string, headers: Record<string, string>) => new Request(url, { method: 'POST', headers })
const URL_LOCAL = 'http://localhost:3000/api/signup'

describe('hasTrustedOrigin', () => {
  it('accepts a same-origin request from the browser', () => {
    expect(hasTrustedOrigin(post(URL_LOCAL, { 'sec-fetch-site': 'same-origin', origin: 'http://localhost:3000' }))).toBe(true)
  })

  it('refuses a cross-site request whatever its other headers say', () => {
    expect(hasTrustedOrigin(post(URL_LOCAL, { 'sec-fetch-site': 'cross-site', origin: 'http://localhost:3000' }))).toBe(false)
    expect(hasTrustedOrigin(post(URL_LOCAL, { origin: 'https://evil.example' }))).toBe(false)
    expect(hasTrustedOrigin(post(URL_LOCAL, { referer: 'https://evil.example/page' }))).toBe(false)
    expect(hasTrustedOrigin(post(URL_LOCAL, { origin: 'null' }))).toBe(false)
  })

  it('refuses a request without any of the three headers', () => {
    expect(hasTrustedOrigin(post(URL_LOCAL, {}))).toBe(false)
  })

  it('trusts APP_BASE_URL behind a proxy that rewrites the request host', () => {
    const proxied = post('http://0.0.0.0:3000/api/signup', {
      'sec-fetch-site': 'same-origin',
      origin: 'https://caativar.example.org',
      referer: 'https://caativar.example.org/cadastro',
    })
    vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org/')
    expect(hasTrustedOrigin(proxied)).toBe(true)
    vi.stubEnv('APP_BASE_URL', '')
    expect(hasTrustedOrigin(proxied)).toBe(false)
  })
})
