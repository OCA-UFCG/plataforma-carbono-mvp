// Locale plumbing of the Territórios story, kept free of React and next-intl so
// the pure text and number functions of lib/territorios stay pure: they take a
// `Fmt` (the current locale and a translate function) instead of reading a
// global. Components build it with `useStoryFmt`
// (components/territorios/useStoryFmt.ts); the tests build it from
// translations/pt/*.json.

/** Same shape as next-intl's `t`, narrowed to the values the story passes (already formatted strings). */
export type Translate = (key: string, values?: Record<string, string | number>) => string

export interface Fmt {
  /** The app locale: 'pt' or 'en'. */
  locale: string
  /** Translates a key of the `TerritoriosStory` namespace. */
  t: Translate
}

/** The BCP 47 tag `Intl` gets for an app locale. */
export function intlLocale(locale: string): string {
  return locale === 'en' ? 'en-US' : 'pt-BR'
}

/** A number with a fixed count of decimals, grouped and punctuated as the locale writes it. */
export function fixed(value: number, digits: number, locale: string): string {
  return value.toLocaleString(intlLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** "a", "a and b", "a, b and c": the locale's own conjunction. */
export function listText(items: readonly string[], locale: string): string {
  return new Intl.ListFormat(intlLocale(locale), { style: 'long', type: 'conjunction' }).format(items)
}
