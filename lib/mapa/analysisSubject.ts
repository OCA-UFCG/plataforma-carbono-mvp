// What the results panel calls the thing it analysed ("Município" / "Cidade"),
// in the user's language.
//
// The store keeps `analysisKind` and `analysisLabel` as plain text, written once
// when the user clicks or draws, and a card outlives a language switch. So the
// store holds the canonical Portuguese value (the layer's own `unitName` or
// `name` from layers.json, or one of `ANALYSIS_KINDS`) and the panel calls these
// two functions at render time to turn it into the current language.

import { coordinateLabel } from '@/lib/mapa/parseCoordinates'
import { layerName, layerUnitName, type MapaText } from '@/lib/mapa/text'
import type { LayerConfig } from '@/types/mapa'

/** The kinds MapView stores for a geometry that is not a recorte feature. */
export const ANALYSIS_KINDS = {
  point:       'Ponto desenhado',
  line:        'Linha desenhada',
  area:        'Área desenhada',
  coordinates: 'Coordenadas',
} as const

export type AnalysisKindKey = keyof typeof ANALYSIS_KINDS

/** The `ANALYSIS_KINDS` key a stored kind belongs to, or undefined for a recorte's name. */
export function drawnKindKey(kind: string | null): AnalysisKindKey | undefined {
  return (Object.keys(ANALYSIS_KINDS) as AnalysisKindKey[]).find((key) => ANALYSIS_KINDS[key] === kind)
}

/**
 * The stored kind in the user's language. `drawnKindText` names a drawn shape
 * (it comes from the caller's own messages); a recorte is looked up by its
 * `unitName ?? name` among the layers. Anything unrecognised comes back as is.
 */
export function localizeAnalysisKind(
  kind: string | null,
  layers: LayerConfig[],
  tx: MapaText,
  drawnKindText: (key: AnalysisKindKey) => string,
): string | null {
  if (!kind) return null
  const drawn = drawnKindKey(kind)
  if (drawn) return drawnKindText(drawn)

  const layer = layers.find((candidate) => (
    (candidate.type === 'vector' ? candidate.unitName : undefined) ?? candidate.name
  ) === kind)
  return layer ? layerUnitName(layer, tx) : kind
}

/**
 * The stored label in the user's language. A typed coordinate is rebuilt from
 * the drawing itself; a label that is a layer name (a recorte clicked where the
 * feature has no name of its own) is looked up; a feature name is data and stays.
 */
export function localizeAnalysisLabel(
  label: string | null,
  kind: string | null,
  drawing: GeoJSON.Feature | null,
  layers: LayerConfig[],
  tx: MapaText,
): string | null {
  if (label === null) return null
  if (drawnKindKey(kind) === 'coordinates' && drawing) return coordinateLabel(drawing, tx) ?? label

  const layer = layers.find((candidate) => candidate.name === label)
  return layer ? layerName(layer, tx) : label
}
