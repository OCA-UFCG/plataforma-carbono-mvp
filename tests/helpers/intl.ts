// The provider the root layouts give the app, for tests that render a component
// reading its text through useTranslations: every namespace of
// translations/messages.ts, read from translations/<locale>/, so a test of the
// copy reads what the app ships.

import fs from 'node:fs'
import path from 'node:path'
import { createElement, type ComponentProps, type ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { NAMESPACES } from '@/translations/messages'
import type { Locale } from '@/translations/config'

const TRANSLATIONS_DIR = path.resolve(import.meta.dirname, '../../translations')

/** Every registered namespace of a locale, merged the way loadMessages does. */
export function appMessages(locale: Locale): Record<string, unknown> {
  return Object.assign(
    {},
    ...NAMESPACES.map((ns) => JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, locale, `${ns}.json`), 'utf-8'))),
  )
}

export function withIntl(children: ReactNode, locale: Locale = 'pt') {
  return createElement(
    NextIntlClientProvider,
    { locale, messages: appMessages(locale) } as ComponentProps<typeof NextIntlClientProvider>,
    children,
  )
}
