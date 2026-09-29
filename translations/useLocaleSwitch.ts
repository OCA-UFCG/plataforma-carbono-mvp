'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { setLocale } from './actions'
import type { Locale } from './config'

// Shared by every language switch (the marketing header's, the map's ...): the
// active locale, and a `choose` that stores the language in the cookie (server
// action) and refreshes the route so server components re-render in it. Client
// state, like an open panel, survives the refresh.
export function useLocaleSwitch() {
  const active = useLocale() as Locale
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(locale: Locale) {
    if (locale === active) return
    startTransition(async () => {
      await setLocale(locale)
      router.refresh()
    })
  }

  return { active, pending, choose }
}
