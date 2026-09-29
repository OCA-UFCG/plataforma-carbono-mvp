// Number formatting of the results panel, in the user's language.
//
// Totals reach billions of tonnes over a state, which nobody reads as a bare
// run of digits, so any mass unit written in tonnes steps up to kt and Mt, the
// same way the stock report's `formatarTc` does.
//
// Every helper takes the `MapaText` as its last parameter (`useMapaText()` in a
// component), and reads Portuguese when omitted.

import { intlLocale } from '@/lib/mapa/locale'
import { PT_TEXT, type MapaText } from '@/lib/mapa/text'

const formats = new Map<string, Intl.NumberFormat>()

/** `Intl.NumberFormat` with a fixed number of fraction digits, cached per locale. */
function nf(locale: string, min: number, max: number): Intl.NumberFormat {
  const key = `${locale}|${min}|${max}`
  let format = formats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: min, maximumFractionDigits: max })
    formats.set(key, format)
  }
  return format
}

const nf0 = (locale: string) => nf(locale, 0, 0)
const nf1 = (locale: string) => nf(locale, 1, 1)

export interface Formatted {
  value: string
  unit: string
}

/** Digits for a value by order of magnitude: 1234 → 0, 12,3 → 1, 0,45 → 2. */
export function adaptive(n: number, tx: MapaText = PT_TEXT): string {
  if (!Number.isFinite(n)) return tx.t('MapaResults.format.notAvailable')
  if (n === 0) return '0'
  const a = Math.abs(n)
  const digits = a >= 100 ? 0 : a >= 1 ? 1 : 2
  return nf(tx.locale, digits, digits).format(n)
}

/** A band edge: whole numbers without decimals ("30", not "30,0"). */
export function edge(n: number, tx: MapaText = PT_TEXT): string {
  return Number.isInteger(n) ? nf0(tx.locale).format(n) : adaptive(n, tx)
}

/**
 * A quantity in its unit, scaled when the unit is a mass in tonnes: "t C" goes
 * to "kt C" and "Mt C", "t CO2e/ano" to "Mt CO2e/ano". Any other unit is left
 * as it is.
 */
export function quantity(value: number, unit: string, tx: MapaText = PT_TEXT): Formatted {
  const locale = tx.locale
  if (/^t(\s|\/|$)/.test(unit)) {
    const a = Math.abs(value)
    if (a >= 1e6) return { value: nf1(locale).format(value / 1e6), unit: `M${unit}` }
    if (a >= 1e3) return { value: nf1(locale).format(value / 1e3), unit: `k${unit}` }
    return { value: nf0(locale).format(value), unit }
  }
  return { value: adaptive(value, tx), unit }
}

/** Hectares; anything below one hectare reads as such rather than as "0 ha". */
export function hectares(ha: number, tx: MapaText = PT_TEXT): string {
  if (ha > 0 && ha < 1) return tx.t('MapaResults.format.hectaresUnderOne')
  return `${nf0(tx.locale).format(ha)} ha`
}

/**
 * Hectares for the panel's narrow columns: "< 1 ha", "123 mil ha", "10,1 mi ha".
 * The spelled-out forms of `hectares` overflow a 72 px column.
 */
export function hectaresShort(ha: number, tx: MapaText = PT_TEXT): string {
  const a = Math.abs(ha)
  if (ha > 0 && ha < 1) return tx.t('MapaResults.format.hectaresShortUnderOne')
  if (a >= 999_500) return tx.t('MapaResults.format.hectaresMillion', { value: nf1(tx.locale).format(ha / 1e6) })
  if (a >= 99_999.5) return tx.t('MapaResults.format.hectaresThousand', { value: nf0(tx.locale).format(ha / 1e3) })
  return hectares(ha, tx)
}

/** A share for the panel's figures: "< 0,1%" where running text says "menos de 0,1%". */
export function percentShort(share: number, tx: MapaText = PT_TEXT): string {
  return share > 0 && share < 0.1
    ? tx.t('MapaResults.format.percentShortUnder', { value: nf1(tx.locale).format(0.1) })
    : percent(share, tx)
}

/**
 * "Fonte: GEDI L4B." from the layer's source line, without the resolution the
 * layer sheet shows ("GEDI L4B, 1 km") nor the year before it, which the
 * results already show beside the layer name.
 */
export function sourceNote(source: string | undefined, tx: MapaText = PT_TEXT): string | null {
  if (!source) return null
  return tx.t('MapaResults.format.source', { source: source.replace(/(,\s*\d{4})?,\s*[\d.,]+\s*k?m$/, '') })
}

/** The layer name without its trailing parenthetical, whose source and year the result shows elsewhere. */
export function layerTitle(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '')
}

/** A share in percent (0..100); a positive share below 0,1 is not written as zero. */
export function percent(share: number, tx: MapaText = PT_TEXT): string {
  if (share > 0 && share < 0.1) {
    return tx.t('MapaResults.format.percentUnder', { value: nf1(tx.locale).format(0.1) })
  }
  return `${nf1(tx.locale).format(share)}%`
}

/**
 * "Dado em 87% da área analisada.", only when part of the polygon has no data.
 * `subject` names what the covered part is when the gap is not missing data
 * (non-woody land, land outside the GFW forest); it defaults to "Dado" / "Data".
 */
export function coverageNote(
  validHa: number,
  polygonHa: number | null,
  subject?: string,
  tx: MapaText = PT_TEXT,
): string | null {
  if (!polygonHa || polygonHa <= 0 || validHa <= 0) return null
  const share = (validHa / polygonHa) * 100
  if (share >= 99.5) return null
  return tx.t('MapaResults.format.coverage', {
    subject: subject ?? tx.t('MapaResults.format.coverageSubject'),
    share: percent(Math.min(share, 100), tx),
  })
}
