// Locale plumbing of the Territórios story, kept free of React and next-intl so
// the pure text and number functions of lib/territorios stay pure: they take a
// `Fmt` (the current locale and a translate function) instead of reading a
// global. Components build it with `useStoryFmt`
// (components/territorios/useStoryFmt.ts); the tests build it from
// translations/pt/*.json.

import { intlLocale } from '@/lib/mapa/locale'

/** Same shape as next-intl's `t`, narrowed to the values the story passes (already formatted strings). */
export type Translate = (key: string, values?: Record<string, string | number>) => string

export interface Fmt {
  /** The app locale: 'pt' or 'en'. */
  locale: string
  /** Translates a key of the `TerritoriosStory` namespace. */
  t: Translate
}

// The map module's helpers, not copies of them: a third locale is then added in
// one place, and a number reads the same in the story and in the map. `fixed` is
// `numero` under the name the story's call sites use.
export { intlLocale }
export { numero as fixed } from '@/lib/mapa/format'

/** "a", "a and b", "a, b and c": the locale's own conjunction. */
export function listText(items: readonly string[], locale: string): string {
  return new Intl.ListFormat(intlLocale(locale), { style: 'long', type: 'conjunction' }).format(items)
}
