import { describe, expect, it } from 'vitest'
import { HTML_LANG, LANGUAGE_OPTIONS, LOCALES } from '@/translations/config'

describe('LANGUAGE_OPTIONS', () => {
  it('offers every locale once, in LOCALES order, so both language switches list them all', () => {
    expect(LANGUAGE_OPTIONS.map((option) => option.value)).toEqual([...LOCALES])
  })

  it('marks each option with the language it is written in', () => {
    for (const option of LANGUAGE_OPTIONS) expect(option.lang).toBe(HTML_LANG[option.value])
  })
})
