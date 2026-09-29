// The `MapaText` of the current render, for components (client and server alike).
//
// Deliberately without 'use client': imported by a server component it resolves
// next-intl's server `useTranslations`, and by a client component the client one.
// It must not use React state or memo hooks for the same reason, so the result is
// cached by translator identity instead: a component can put `tx` in a dependency
// list and it only changes when the locale (hence the translator) does.

import { useLocale, useTranslations } from 'next-intl'
import { DEFAULT_LOCALE, isLocale } from '@/translations/config'
import { toTranslator, type MapaText } from '@/lib/mapa/text'

const cache = new WeakMap<object, MapaText>()

export function useMapaText(): MapaText {
  const raw = useLocale()
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE
  // Root translator: keys carry their namespace ("MapaLayers.layers.bioma.name").
  const base = useTranslations()

  let tx = cache.get(base)
  if (!tx || tx.locale !== locale) {
    tx = { locale, t: toTranslator(base as never) }
    cache.set(base, tx)
  }
  return tx
}
