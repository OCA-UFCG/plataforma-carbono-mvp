'use client'

import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { Fmt } from '@/lib/territorios/i18n'

/**
 * What the pure text and number functions of lib/territorios take: the current
 * language and the TerritoriosStory messages. Stable between renders, so it can
 * sit in a dependency list.
 */
export function useStoryFmt(): Fmt {
  const locale = useLocale()
  const t = useTranslations('TerritoriosStory')
  return useMemo(() => ({ locale, t: (key, values) => t(key, values) }), [locale, t])
}
