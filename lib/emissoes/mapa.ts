// Rules of the emissions map layers, shared by MapView (drawing), the legend
// and the year slider. Pure.
//
// The data exist per municipality and as sums by state and for the biome, so a
// layer is drawn on the finest of those three recortes that is on; with none of
// them on, the legend asks for one instead of drawing anything.

import type { ExpressionSpecification } from 'maplibre-gl'
import type { EmissoesCamadaPayload, NivelEmissoes } from '@/types/emissoes'
import type { EmissionsLayerConfig, LayerConfig, VectorLayerConfig } from '@/types/mapa'

/** The recorte layer of each level, in layers.json. */
export const RECORTE_DO_NIVEL: Record<NivelEmissoes, string> = {
  municipios: 'municipios',
  estados: 'estados',
  bioma: 'bioma',
}

export type EmissoesEntry =
  | { status: 'loading' }
  | { status: 'ready'; payload: EmissoesCamadaPayload }
  | { status: 'error' }

export function isEmissionsLayer(layer: LayerConfig): layer is EmissionsLayerConfig {
  return layer.type === 'emissions'
}

/** The level an emissions layer is drawn at: the finest of its recortes that is on. */
export function nivelEmissoes(layers: LayerConfig[]): { nivel: NivelEmissoes; recorte: VectorLayerConfig } | null {
  let best: { nivel: NivelEmissoes; recorte: VectorLayerConfig } | null = null
  for (const [nivel, id] of Object.entries(RECORTE_DO_NIVEL) as [NivelEmissoes, string][]) {
    const recorte = layers.find((l): l is VectorLayerConfig => l.id === id && l.type === 'vector' && l.visible)
    if (!recorte) continue
    if (!best || (recorte.pickPriority ?? 0) > (best.recorte.pickPriority ?? 0)) best = { nivel, recorte }
  }
  return best
}

/** Key of a recorte feature in the payload: IBGE code, state or the biome. */
export function chaveDaFeicao(nivel: NivelEmissoes, properties: Record<string, unknown> | null | undefined): string | null {
  if (nivel === 'bioma') return 'bioma'
  const value = nivel === 'municipios' ? properties?.code_muni : properties?.abbrev_state
  return value == null ? null : String(value)
}

/**
 * The value of each feature of the recorte's GeoJSON in one year, in file
 * order: the index is the id MapLibre gives the feature (`generateId`). A
 * feature without data gets null and is left unpainted.
 */
export function valoresPorFeicao(
  payload: EmissoesCamadaPayload,
  nivel: NivelEmissoes,
  features: GeoJSON.Feature[],
  ano: number,
): (number | null)[] {
  const i = payload.anos.indexOf(ano)
  const tabela = payload.valores[nivel]
  return features.map((f) => {
    const key = chaveDaFeicao(nivel, f.properties as Record<string, unknown> | null)
    const serie = key == null ? undefined : tabela[key]
    return i === -1 || !serie ? null : serie[i]
  })
}

/** The year the layer shows: the one picked on the slider, else the last one. */
export function anoEmissoes(layer: EmissionsLayerConfig, temporalDate: string | undefined): number {
  return Number((temporalDate ?? layer.temporal.dateRange[1]).slice(0, 4))
}

/** Fill color of a feature from its value in feature-state `key`, transparent without one. */
export function corEmissoes(classes: EmissoesCamadaPayload['classes'], key: string): ExpressionSpecification {
  // A step needs at least one break; a layer with a single class paints that color.
  const step: unknown = classes.limites.length === 0
    ? classes.cores[0]
    : ['step', ['feature-state', key], classes.cores[0], ...classes.limites.flatMap((limite, i) => [limite, classes.cores[i + 1]])]
  return [
    'case',
    ['==', ['typeof', ['feature-state', key]], 'number'],
    step,
    'rgba(0,0,0,0)',
  ] as unknown as ExpressionSpecification
}

// As many digits as the breaks carry (classes.ts rounds them to the fewest that keep them apart).
const numero = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 6 })

/** Legend label of each class, in the order of `cores`. */
export function rotulosClasses({ limites }: EmissoesCamadaPayload['classes']): string[] {
  const f = (v: number) => numero.format(v)
  if (limites.length === 0) return ['todos os valores']
  return [
    `abaixo de ${f(limites[0])}`,
    ...limites.slice(1).map((limite, i) => `${f(limites[i])} a ${f(limite)}`),
    `${f(limites[limites.length - 1])} ou mais`,
  ]
}
