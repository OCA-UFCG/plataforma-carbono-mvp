// Number formatting of the results panel, pt-BR.
//
// Totals reach billions of tonnes over a state, which nobody reads as a bare
// run of digits, so any mass unit written in tonnes steps up to kt and Mt, the
// same way the stock report's `formatarTc` does.

const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export interface Formatted {
  value: string
  unit: string
}

/** Digits for a value by order of magnitude: 1234 → 0, 12,3 → 1, 0,45 → 2. */
export function adaptive(n: number): string {
  if (!Number.isFinite(n)) return 'n/d'
  if (n === 0) return '0'
  const a = Math.abs(n)
  const digits = a >= 100 ? 0 : a >= 1 ? 1 : 2
  return n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** A band edge: whole numbers without decimals ("30", not "30,0"). */
export function edge(n: number): string {
  return Number.isInteger(n) ? nf0.format(n) : adaptive(n)
}

/**
 * A quantity in its unit, scaled when the unit is a mass in tonnes: "t C" goes
 * to "kt C" and "Mt C", "t CO2e/ano" to "Mt CO2e/ano". Any other unit is left
 * as it is.
 */
export function quantity(value: number, unit: string): Formatted {
  if (/^t(\s|\/|$)/.test(unit)) {
    const a = Math.abs(value)
    if (a >= 1e6) return { value: nf1.format(value / 1e6), unit: `M${unit}` }
    if (a >= 1e3) return { value: nf1.format(value / 1e3), unit: `k${unit}` }
    return { value: nf0.format(value), unit }
  }
  return { value: adaptive(value), unit }
}

/** Hectares; anything below one hectare reads as such rather than as "0 ha". */
export function hectares(ha: number): string {
  if (ha > 0 && ha < 1) return 'menos de 1 ha'
  return `${nf0.format(ha)} ha`
}

/**
 * Hectares for the panel's narrow columns: "< 1 ha", "123 mil ha", "10,1 mi ha".
 * The spelled-out forms of `hectares` overflow a 72 px column.
 */
export function hectaresShort(ha: number): string {
  const a = Math.abs(ha)
  if (ha > 0 && ha < 1) return '< 1 ha'
  if (a >= 999_500) return `${nf1.format(ha / 1e6)} mi ha`
  if (a >= 99_999.5) return `${nf0.format(ha / 1e3)} mil ha`
  return hectares(ha)
}

/** A share for the panel's figures: "< 0,1%" where running text says "menos de 0,1%". */
export function percentShort(share: number): string {
  return share > 0 && share < 0.1 ? '< 0,1%' : percent(share)
}

/**
 * "Fonte: GEDI L4B." from the layer's source line, without the resolution the
 * layer sheet shows ("GEDI L4B, 1 km") nor the year before it, which the
 * results already show beside the layer name.
 */
export function sourceNote(source: string | undefined): string | null {
  if (!source) return null
  return `Fonte: ${source.replace(/(,\s*\d{4})?,\s*[\d.,]+\s*k?m$/, '')}.`
}

/** The layer name without its trailing parenthetical, whose source and year the result shows elsewhere. */
export function layerTitle(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '')
}

/** A share in percent (0..100); a positive share below 0,1 is not written as zero. */
export function percent(share: number): string {
  if (share > 0 && share < 0.1) return 'menos de 0,1%'
  return `${nf1.format(share)}%`
}

/**
 * "Dado em 87% da área analisada.", only when part of the polygon has no data.
 * `subject` names what the covered part is when the gap is not missing data
 * (non-woody land, land outside the GFW forest).
 */
export function coverageNote(validHa: number, polygonHa: number | null, subject = 'Dado'): string | null {
  if (!polygonHa || polygonHa <= 0 || validHa <= 0) return null
  const share = (validHa / polygonHa) * 100
  return share < 99.5 ? `${subject} em ${percent(Math.min(share, 100))} da área analisada.` : null
}
