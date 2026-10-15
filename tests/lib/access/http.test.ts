import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { codeFailure, readJsonObject, rejectUntrustedOrLimited, rejectWhenSignupClosed } from '@/lib/access/http'
import { accessClientKey, accessRateLimits } from '@/lib/access/rateLimits'

beforeEach(() => {
  for (const limiter of Object.values(accessRateLimits)) limiter.clear()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const trusted = (headers: Record<string, string> = {}) => new Request('http://localhost/api/signup', {
  method: 'POST',
  headers: { 'sec-fetch-site': 'same-origin', 'x-forwarded-for': '203.0.113.7', ...headers },
})

describe('rejectWhenSignupClosed', () => {
  it('answers 404 while signup is closed and nothing while open', () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    const closed = rejectWhenSignupClosed()
    expect(closed?.status).toBe(404)
    expect(closed?.headers.get('Cache-Control')).toBe('no-store')
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    expect(rejectWhenSignupClosed()).toBeNull()
  })
})

describe('rejectUntrustedOrLimited', () => {
  it('refuses an untrusted origin with 403 before spending the budget', () => {
    expect(rejectUntrustedOrLimited(trusted({ 'sec-fetch-site': 'cross-site' }), 'resend')?.status).toBe(403)
    for (let i = 0; i < 10; i++) expect(rejectUntrustedOrLimited(trusted(), 'resend')).toBeNull()
  })

  it("answers 429 with Retry-After once the action's budget is spent, per action and per address", () => {
    for (let i = 0; i < 10; i++) rejectUntrustedOrLimited(trusted(), 'resend')
    const limited = rejectUntrustedOrLimited(trusted(), 'resend')
    expect(limited?.status).toBe(429)
    expect(Number(limited?.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(rejectUntrustedOrLimited(trusted(), 'confirm')).toBeNull()
    expect(rejectUntrustedOrLimited(trusted({ 'x-forwarded-for': '198.51.100.2' }), 'resend')).toBeNull()
  })
})

describe('accessClientKey', () => {
  it('keys by address, falling back to the user agent with an error in the log', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(accessClientKey(trusted())).toBe('ip:203.0.113.7')
    expect(error).not.toHaveBeenCalled()
    const noAddress = new Request('http://localhost/', { headers: { 'user-agent': 'Mozilla/5.0' } })
    expect(accessClientKey(noAddress)).toBe('ua:Mozilla/5.0')
    expect(error).toHaveBeenCalledOnce()
  })
})

describe('readJsonObject', () => {
  it('returns the object, or {} for broken JSON and non-objects', async () => {
    const body = (text: string) => new Request('http://localhost/', { method: 'POST', body: text })
    expect(await readJsonObject(body('{"email":"a@b.co"}'))).toEqual({ email: 'a@b.co' })
    expect(await readJsonObject(body('{broken'))).toEqual({})
    expect(await readJsonObject(body('[1,2]'))).toEqual({})
    expect(await readJsonObject(body('"text"'))).toEqual({})
  })
})

describe('codeFailure', () => {
  it('names the reason in the body, uncached', async () => {
    const res = codeFailure('invalid-code', 410)
    expect(res.status).toBe(410)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.json()).toEqual({ reason: 'invalid-code' })
  })
})
