import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { LOCALE_COOKIE, readSiteLocale } from '@/lib/locale'

// next-intl's request config, found by the plugin in next.config.ts. There is
// no locale in the URL: the language is the NEXT_LOCALE cookie the header's
// switch writes. The messages hold the interface labels kept in code; the copy
// editors write comes from Contentful in the same language
// (lib/content/site/fetch.ts).
export default getRequestConfig(async () => {
  const locale = readSiteLocale((await cookies()).get(LOCALE_COOKIE)?.value)

  return { locale, messages: (await import(`../messages/${locale}.json`)).default }
})
