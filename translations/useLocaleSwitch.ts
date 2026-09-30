'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { setLocale } from './actions'
import { LOCALE_COOKIE, LOCALE_MAX_AGE, type Locale } from './config'

// Shared by every language switch (the marketing header's, the map's ...): the
// active locale, and a `choose` that stores the language in the cookie (server
// action). The action's response already carries the re-rendered RSC payload of
// the current route, so the text and the <html lang> change without a
// router.refresh() and without a second render of every layout. Client state,
// like an open panel, survives it.
export function useLocaleSwitch() {
  const active = useLocale() as Locale
  const [pending, startTransition] = useTransition()

  function choose(locale: Locale) {
    if (locale === active) return
    startTransition(async () => {
      try {
        await setLocale(locale)
      } catch {
        // A rejected action -- a stale Server Action id after a deploy, or a
        // network blip -- is rethrown by React from the transition, and the app
        // has no error boundary: the map and its results would be replaced by
        // Next's "Application error". The cookie is not HttpOnly, so the switch
        // still does what it promises by writing it here and reloading.
        document.cookie =
          `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax`
        window.location.reload()
      }
    })
  }

  return { active, pending, choose }
}
