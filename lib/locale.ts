// The languages the site is written in. The visitor's choice travels in the
// NEXT_LOCALE cookie, the name next-intl reads by default, and a visitor without
// one reads Portuguese.
export const SITE_LOCALES = ['pt', 'en'] as const

export type SiteLocale = (typeof SITE_LOCALES)[number]

export const LOCALE_COOKIE = 'NEXT_LOCALE'

// The `lang` attribute of the text in each language.
export const HTML_LANG: Record<SiteLocale, string> = { pt: 'pt-BR', en: 'en' }

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60

export function readSiteLocale(value: string | undefined): SiteLocale {
  return value === 'en' ? 'en' : 'pt'
}

// The language in a list of cookies as the browser keeps it, "a=1; b=2".
export function localeFromCookies(cookies: string): SiteLocale {
  const pair = cookies
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))

  return readSiteLocale(pair?.slice(LOCALE_COOKIE.length + 1))
}

// The cookie the header's switch writes: for every path, so a choice made on
// one page holds on the others, and for a year, so it outlives the session.
export function localeCookie(locale: SiteLocale): string {
  return `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
}
