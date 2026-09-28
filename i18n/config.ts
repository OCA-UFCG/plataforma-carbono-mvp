// Locale constants shared by the client (language switch) and, later, the
// server. Keep this file free of server-only imports.
export const LOCALES = ['pt-BR', 'en'] as const

export type Locale = (typeof LOCALES)[number]

// Portuguese is the product's default and the fallback for an absent or
// unrecognised cookie: the audience is Brazilian.
export const DEFAULT_LOCALE: Locale = 'pt-BR'

// next-intl's conventional cookie name. One origin serves every route group, so
// a single path=/ cookie is shared by all the root layouts.
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
