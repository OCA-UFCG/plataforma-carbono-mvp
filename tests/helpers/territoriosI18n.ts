// Translators for the Territórios tests: the real messages of
// translations/<locale>/Territorios*.json, so a test of the Portuguese copy
// reads what the app ships.

import fs from 'node:fs'
import path from 'node:path'
import { createTranslator } from 'next-intl'
import type { Fmt, Translate } from '@/lib/territorios/i18n'

export type TestLocale = 'pt' | 'en'

const TRANSLATIONS_DIR = path.resolve(import.meta.dirname, '../../translations')

const NAMESPACES = [
  'TerritoriosCharts',
  'TerritoriosChooser',
  'TerritoriosIntro',
  'TerritoriosMap',
  'TerritoriosMetadata',
  'TerritoriosRail',
  'TerritoriosStory',
  'TerritoriosTypes',
  'TerritoriosUi',
] as const

export type TerritoriosNamespace = (typeof NAMESPACES)[number]

/** Every Territorios namespace of a locale, merged the way translations/messages.ts does. */
export function territoriosMessages(locale: TestLocale): Record<string, unknown> {
  return Object.assign(
    {},
    ...NAMESPACES.map((ns) => JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, locale, `${ns}.json`), 'utf-8'))),
  )
}

export function translatorFor(locale: TestLocale, namespace: TerritoriosNamespace): Translate {
  // The messages are untyped JSON: next-intl's key typing has nothing to check against.
  const t = createTranslator({ locale, messages: territoriosMessages(locale) as never, namespace: namespace as never }) as unknown as Translate
  return (key, values) => t(key, values)
}

/** What the pure functions of lib/territorios take. */
export function fmtFor(locale: TestLocale): Fmt {
  return { locale, t: translatorFor(locale, 'TerritoriosStory') }
}
