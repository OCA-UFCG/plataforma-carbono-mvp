// Locale constants shared by the server (request config, server action) and the
// client (language switch). Keep this file free of server-only imports.
export const LOCALES = ['pt', 'en'] as const

export type Locale = (typeof LOCALES)[number]

// Portuguese is the product's default and the fallback for an absent or
// unrecognised cookie: the audience is Brazilian.
export const DEFAULT_LOCALE: Locale = 'pt'

// The language is a cookie, not a URL segment: there is no [locale] route. It
// is next-intl's conventional cookie name, and one origin serves every route
// group, so a single path=/ cookie is shared by all the root layouts.
export const LOCALE_COOKIE = 'NEXT_LOCALE'

// A year, shared by the server action that writes the cookie and by the client
// fallback of the language switch, so the two never disagree on its lifetime.
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365

// The BCP 47 tag for <html lang>. The locale codes above name the message
// directories (translations/pt/), which is not always what the attribute wants.
export const HTML_LANG: Record<Locale, string> = { pt: 'pt-BR', en: 'en' }

// The options of both language switches (the site header's and the map's), in
// LOCALES order. Endonyms: each language names itself, so the labels are not
// translated; `lang` tells assistive tech which language each label is in.
export const LANGUAGE_OPTIONS: readonly { value: Locale; label: string; lang: string }[] = [
  { value: 'pt', label: 'PT-BR', lang: HTML_LANG.pt },
  { value: 'en', label: 'En', lang: HTML_LANG.en },
]

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
