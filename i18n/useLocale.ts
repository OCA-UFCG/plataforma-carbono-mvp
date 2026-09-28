'use client'

import { useSyncExternalStore } from 'react'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// The cookie is the source of truth. Reading it through useSyncExternalStore
// keeps the server render and the hydration pass on DEFAULT_LOCALE (no
// mismatch) and then switches to the stored value on the client.
function readCookie(): Locale {
  const entry = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
  const value = entry?.slice(LOCALE_COOKIE.length + 1)
  return isLocale(value) ? value : DEFAULT_LOCALE
}

function writeCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
  listeners.forEach((listener) => listener())
}

// The chosen language and its setter. Persisted in a cookie so it survives
// reloads and is shared across the route groups.
export function useLocale(): [Locale, (locale: Locale) => void] {
  const locale = useSyncExternalStore(subscribe, readCookie, () => DEFAULT_LOCALE)
  return [locale, writeCookie]
}
