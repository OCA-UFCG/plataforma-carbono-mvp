// Paradas de uma camada navegável no tempo. Uma fonte só para o store, que
// escolhe o ano de abertura, e para o controle de data, que desenha a régua.

export interface TemporalConfig {
  dateRange: [string, string]
  dates?:    string[]
}

/**
 * Anos disponíveis, em ordem crescente, como datas ISO de 1 de janeiro.
 * Séries com lacuna declaram `dates`; as demais preenchem o intervalo.
 */
export function paradas(temporal: TemporalConfig): string[] {
  if (temporal.dates?.length) return [...temporal.dates].sort()
  const ini = Number(temporal.dateRange[0].slice(0, 4))
  const fim = Number(temporal.dateRange[1].slice(0, 4))
  if (!Number.isInteger(ini) || !Number.isInteger(fim) || fim < ini) return []
  return Array.from({ length: fim - ini + 1 }, (_, i) => `${ini + i}-01-01`)
}

/**
 * Ano em que a camada abre. É o mais recente, e não o primeiro, para que ligar
 * uma camada mostre o mesmo retrato que ela mostrava antes de ganhar o tempo.
 */
export function paradaInicial(temporal: TemporalConfig): string | undefined {
  const lista = paradas(temporal)
  return lista[lista.length - 1]
}

/** Rótulo de uma parada. */
export function ano(parada: string): string {
  return parada.slice(0, 4)
}
