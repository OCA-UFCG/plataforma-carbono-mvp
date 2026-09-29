// The `MapaText` of the current request, for route handlers, server components
// and server-side services: the language is the NEXT_LOCALE cookie
// (translations/request.ts), so server-generated text (the report narrative)
// follows the language the reader switched to.

import 'server-only'

import { getLocale, getTranslations } from 'next-intl/server'
import { DEFAULT_LOCALE, isLocale } from '@/translations/config'
import { PT_TEXT, toTranslator, type MapaText } from '@/lib/mapa/text'

export async function getMapaText(): Promise<MapaText> {
  try {
    const raw = await getLocale()
    const locale = isLocale(raw) ? raw : DEFAULT_LOCALE
    const t = await getTranslations()
    return { locale, t: toTranslator(t as never) }
  } catch {
    // Outside a request scope (a script, a test) there is no cookie to read:
    // the default language beats failing a report over its wording.
    return PT_TEXT
  }
}
