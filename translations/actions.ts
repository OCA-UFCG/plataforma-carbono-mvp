'use server'

import { cookies } from 'next/headers'
import { LOCALE_COOKIE, isLocale } from './config'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

// Persists the language chosen in the header switch. The caller refreshes the
// router afterwards so server components re-render with the new cookie.
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return
  ;(await cookies()).set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax',
  })
}
