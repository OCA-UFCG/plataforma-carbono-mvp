import type { SiteLocale } from '@/lib/locale'

// Contentful answers a Date field as an ISO string, "2025-05-14T00:00:00.000Z"
// for a date with no time. The calendar date is read off the string rather
// than through Date: formatted in the Northeast's UTC-3, midnight UTC would
// print the day before, and a value written with its own offset keeps the day
// the editor chose.
export type CalendarDate = { year: string; month: string; day: string }

export function calendarDate(value?: string | null): CalendarDate | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null

  const [, year, month, day] = match
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null

  return { year, month, day }
}

const MONTHS: Record<SiteLocale, readonly string[]> = {
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

// "17 set 2026" in Portuguese, "17 Sep 2026" in English.
export function dayMonthYear({ year, month, day }: CalendarDate, locale: SiteLocale): string {
  return `${Number(day)} ${MONTHS[locale][Number(month) - 1]} ${year}`
}
