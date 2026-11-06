import 'server-only'

import { getLocale } from 'next-intl/server'
import { readSiteLocale, type SiteLocale } from '@/lib/locale'

// The visitor's language for a server component, as i18n/request.ts read it
// from the cookie, narrowed to the site's two.
export async function getSiteLocale(): Promise<SiteLocale> {
  return readSiteLocale(await getLocale())
}
