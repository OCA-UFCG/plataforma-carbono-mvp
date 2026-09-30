'use server'

import { cookies } from 'next/headers'
import { LOCALE_COOKIE, LOCALE_MAX_AGE, isLocale } from './config'

// Persists the language chosen in the header switch. Next re-renders the route
// after the action, so the caller needs no refresh of its own.
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return
  ;(await cookies()).set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_MAX_AGE,
    sameSite: 'lax',
  })
}
