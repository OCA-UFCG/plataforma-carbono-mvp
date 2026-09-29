// Locale helpers with no dependencies, so the lowest-level formatters can use
// them without pulling in the translation plumbing of text.ts.

/** BCP 47 tag `Intl.*` and `toLocaleString` should get for a message locale ('pt' | 'en'). */
export function intlLocale(locale?: string): string {
  return locale === 'en' || locale === 'en-US' ? 'en-US' : 'pt-BR'
}

/**
 * Number in the user's language, for the places that used `toLocaleString('pt-BR')`.
 * Takes the locale code (`tx.locale`), not a `MapaText`.
 */
export function formatNumber(
  value: number,
  locale: string | undefined,
  options?: Intl.NumberFormatOptions,
): string {
  return value.toLocaleString(intlLocale(locale), options)
}
