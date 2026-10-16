import { afterEach, describe, expect, it, vi } from 'vitest'
import { clientAddress, clientIp, createRateLimiter } from '@/lib/rateLimit'
import { rateLimit } from '@/lib/mapa/rateLimit'

afterEach(() => {
  vi.useRealTimers()
})

describe('createRateLimiter', () => {
  it('allows max requests per window, then answers with the seconds to wait', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 })
    expect(limiter.consume('a').ok).toBe(true)
    vi.setSystemTime(10_000)
    expect(limiter.consume('a').ok).toBe(true)
    expect(limiter.consume('a')).toEqual({ ok: false, retryAfter: 50 })
    vi.setSystemTime(60_001)
    expect(limiter.consume('a').ok).toBe(true)
  })

  it('keeps one budget per key and one per limiter', () => {
    const first = createRateLimiter({ windowMs: 60_000, max: 1 })
    const second = createRateLimiter({ windowMs: 60_000, max: 1 })
    expect(first.consume('a').ok).toBe(true)
    expect(first.consume('a').ok).toBe(false)
    expect(first.consume('b').ok).toBe(true)
    expect(second.consume('a').ok).toBe(true)
  })

  it('forgets everything on clear', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 })
    limiter.consume('a')
    limiter.clear()
    expect(limiter.consume('a').ok).toBe(true)
  })
})

describe('the map limiter', () => {
  it('still allows 60 requests per minute per IP', () => {
    for (let i = 0; i < 60; i++) expect(rateLimit('192.0.2.60').ok).toBe(true)
    expect(rateLimit('192.0.2.60').ok).toBe(false)
  })
})

describe('client address', () => {
  const req = (headers: Record<string, string>) => new Request('http://localhost/', { headers })

  it('takes the first x-forwarded-for hop, then x-real-ip', () => {
    expect(clientAddress(req({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7')
    expect(clientAddress(req({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2')
    expect(clientAddress(req({}))).toBeNull()
  })

  it('keeps the map limiter\'s "unknown" fallback', () => {
    expect(clientIp(req({}))).toBe('unknown')
  })
})
