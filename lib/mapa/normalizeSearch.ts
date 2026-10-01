import { intlLocale } from '@/lib/mapa/locale'

/**
 * Lowercases and strips accents so "Sao Joao" finds "São João". The locale
 * matters only for the case mapping (`toLocaleLowerCase`), and Portuguese is the
 * default; pass `tx.locale` from the component.
 */
export function normalizeSearch(value: string, locale = 'pt') {
  return value
    .toLocaleLowerCase(intlLocale(locale))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
