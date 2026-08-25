// Stops of a time-navigable layer. A single source for the store, which picks
// the opening year, and for the date control, which draws the slider.

export interface TemporalConfig {
  dateRange: [string, string]
  dates?:    string[]
}

/**
 * Available years, in ascending order, as ISO dates of January 1st.
 * Series with gaps declare `dates`; the rest fill the interval.
 */
export function paradas(temporal: TemporalConfig): string[] {
  if (temporal.dates?.length) return [...temporal.dates].sort()
  const ini = Number(temporal.dateRange[0].slice(0, 4))
  const fim = Number(temporal.dateRange[1].slice(0, 4))
  if (!Number.isInteger(ini) || !Number.isInteger(fim) || fim < ini) return []
  return Array.from({ length: fim - ini + 1 }, (_, i) => `${ini + i}-01-01`)
}

/**
 * Year the layer opens on. It is the most recent one, not the first, so that
 * turning a layer on shows the same picture it showed before it gained time.
 */
export function paradaInicial(temporal: TemporalConfig): string | undefined {
  const lista = paradas(temporal)
  return lista[lista.length - 1]
}

/** Label of a stop. */
export function ano(parada: string): string {
  return parada.slice(0, 4)
}
