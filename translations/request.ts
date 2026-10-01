import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from './config'
import { loadMessages } from './messages'

// No i18n routing: the language is the cookie written by the header's language
// switch (translations/actions.ts), not a URL segment.
export default getRequestConfig(async () => {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isLocale(stored) ? stored : DEFAULT_LOCALE
  return { locale, messages: await loadMessages(locale) }
})
