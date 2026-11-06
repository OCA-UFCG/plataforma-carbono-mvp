import type { ReactElement } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import type { SiteLocale } from '@/lib/locale'
import en from '@/messages/en.json'
import pt from '@/messages/pt.json'

export const MESSAGES = { pt, en }

// A component that reads its labels with useTranslations, inside the provider
// the root layouts render: on the server, vitest resolves next-intl's client
// build, which needs one.
export function withIntl(element: ReactElement, locale: SiteLocale = 'pt'): ReactElement {
  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      {element}
    </NextIntlClientProvider>
  )
}
