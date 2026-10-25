// Fixed color classes of an emissions layer, one set per layer for every year
// and every level, so a color means the same t CO2e/ha on the municipal, state
// and biome maps and across the year slider.
//
// The breaks come from the municipal values of every year: quantiles of the
// positive ones (emissions spread over two orders of magnitude, so equal
// intervals would paint almost every municipality the first color), and of the
// negative ones when removals are common enough to deserve their own range.
// The colors are those of the platform's signed carbon flux layer
// (gfw_netflux): greens below zero, warm tones above.

/** Ascending upper limits and one color per class: `cores[i]` covers values below `limites[i]`. */
export interface ClassesEmissoes {
  limites: number[]
  cores: string[]
}

const POSITIVAS = ['#fddbc7', '#f4a582', '#ef8a62', '#d6604d', '#b2182b', '#67001f']
const NEGATIVAS = ['#1b7837', '#7fbf7b', '#d9f0d3']
const NEGATIVA_UNICA = '#7fbf7b'
const QUANTIS_POSITIVOS = [0.2, 0.4, 0.6, 0.8, 0.95]
const QUANTIS_NEGATIVOS = [0.9, 0.5]
/** Below this share of negative values, removals get a single class. */
const PARCELA_MINIMA_NEGATIVA = 0.05

function quantil(ordenados: number[], q: number): number {
  const pos = (ordenados.length - 1) * q
  const base = Math.floor(pos)
  const resto = pos - base
  const proximo = ordenados[base + 1] ?? ordenados[base]
  return ordenados[base] + resto * (proximo - ordenados[base])
}

/** A class boundary and the color of the class that starts at it. */
interface Quebra {
  limite: number
  cor: string
}

const arredondar = (v: number, digitos: number) => (v === 0 ? 0 : Number(v.toPrecision(digitos)))

/**
 * Rounded to the fewest significant digits that keep every break apart. Ties
 * left at six digits (a quantile repeated in the data) are dropped together
 * with their color, so there is always one color more than breaks.
 */
function montar(corInicial: string, quebras: Quebra[]): ClassesEmissoes {
  let escolhidas = quebras
  for (let digitos = 2; digitos <= 6; digitos++) {
    const r = quebras.map((q) => ({ ...q, limite: arredondar(q.limite, digitos) }))
    escolhidas = r.filter((q, i) => i === 0 || q.limite > r[i - 1].limite)
    if (escolhidas.length === quebras.length) break
  }
  const limites: number[] = []
  const cores = [corInicial]
  for (const q of escolhidas) {
    if (limites.length > 0 && q.limite <= limites[limites.length - 1]) continue
    limites.push(q.limite)
    cores.push(q.cor)
  }
  return { limites, cores }
}

export function classesEmissoes(valores: number[]): ClassesEmissoes {
  const finitos = valores.filter(Number.isFinite)
  const positivos = finitos.filter((v) => v > 0).sort((a, b) => a - b)
  const negativos = finitos.filter((v) => v < 0).map((v) => -v).sort((a, b) => a - b)

  const quebrasPositivas: Quebra[] = positivos.length > 0
    ? QUANTIS_POSITIVOS.map((q, i) => ({ limite: quantil(positivos, q), cor: POSITIVAS[i + 1] }))
    : []
  const parcelaNegativa = finitos.length > 0 ? negativos.length / finitos.length : 0

  if (negativos.length === 0) return montar(POSITIVAS[0], quebrasPositivas)
  const zero = { limite: 0, cor: POSITIVAS[0] }
  if (parcelaNegativa < PARCELA_MINIMA_NEGATIVA) return montar(NEGATIVA_UNICA, [zero, ...quebrasPositivas])
  const quebrasNegativas = QUANTIS_NEGATIVOS.map((q, i) => ({ limite: -quantil(negativos, q), cor: NEGATIVAS[i + 1] }))
  return montar(NEGATIVAS[0], [...quebrasNegativas, zero, ...quebrasPositivas])
}

/** The class of a value, as the map's step expression picks it. */
export function classeDe(valor: number, { limites }: ClassesEmissoes): number {
  const i = limites.findIndex((limite) => valor < limite)
  return i === -1 ? limites.length : i
}
