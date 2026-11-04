import { describe, expect, it } from 'vitest'
import { localeCookie, localeFromCookies, readSiteLocale } from '@/lib/locale'

describe('localeFromCookies', () => {
  it('finds the language among the other cookies', () => {
    expect(localeFromCookies('session=abc; NEXT_LOCALE=en; outro=1')).toBe('en')
    expect(localeFromCookies('NEXT_LOCALE=en')).toBe('en')
  })

  it('reads Portuguese without the cookie, or from a cookie that only ends in its name', () => {
    expect(localeFromCookies('')).toBe('pt')
    expect(localeFromCookies('OUTRO_NEXT_LOCALE=en')).toBe('pt')
  })
})

describe('localeCookie', () => {
  // Every path, so the choice made on one page holds on the others, and kept
  // for a year, so it outlives the browser session.
  it('stores the language for the whole site, for a year', () => {
    expect(localeCookie('en')).toBe('NEXT_LOCALE=en; path=/; max-age=31536000; samesite=lax')
  })
})

describe('readSiteLocale', () => {
  it('reads English from the cookie', () => {
    expect(readSiteLocale('en')).toBe('en')
  })

  it('reads Portuguese without a cookie, or with a language the site does not have', () => {
    for (const value of [undefined, '', 'pt', 'fr', 'EN', 'en-US']) {
      expect(readSiteLocale(value), String(value)).toBe('pt')
    }
  })
})
