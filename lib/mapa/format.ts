// Number formatting shared by the CSV export, the report narrative and the
// report document, so the three never disagree on the same number. It follows
// the locale code (`tx.locale`: 'pt' or 'en'); Portuguese when omitted.

import { normalizeSearch } from '@/lib/mapa/normalizeSearch'
import { intlLocale } from '@/lib/mapa/locale'

/**
 * Number for a spreadsheet cell: decimal comma (decimal point in English), and no
 * thousands separator.
 *
 * The missing thousands dot is deliberate. Excel in Portuguese reads the comma
 * as the decimal mark, and a dot on top of it leaves a script importer unable
 * to tell a grouping mark from a decimal point.
 */
export function numeroCsv(value: number, locale = 'pt'): string {
  return value.toLocaleString(intlLocale(locale), { maximumFractionDigits: 4, useGrouping: false })
}

/**
 * Number for prose and for the document: decimal comma with the thousands dot
 * (decimal point with the thousands comma in English).
 *
 * The opposite choice from `numeroCsv`, for the opposite reason: a total like
 * 4.760.123 is unreadable as a bare run of digits in a sentence.
 */
export function numero(value: number, digits = 1, locale = 'pt'): string {
  return value.toLocaleString(intlLocale(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** Filename- and URL-safe form of a label. */
export function slug(value: string): string {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Local-time `YYYY-MM-DD`. */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
