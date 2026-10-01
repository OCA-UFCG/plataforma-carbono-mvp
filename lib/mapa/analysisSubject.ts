// What the results panel calls the thing it analysed ("Município" / "Cidade"),
// in the user's language.
//
// The store keeps the subject as ids (`AnalysisSubject`, types/mapa.ts): the
// shape the user drew or typed, or the recorte layer and the feature's own name.
// A card outlives a language switch, so the panel writes the words when it
// renders, from those ids, in the language of the moment.

import { coordinateLabel } from '@/lib/mapa/parseCoordinates'
import { layerName, layerUnitName, type MapaText } from '@/lib/mapa/text'
import type { AnalysisSubject, DrawnShape, LayerConfig } from '@/types/mapa'

export interface AnalysisSubjectText {
  /** What the subject is: "Área desenhada", "Município". */
  kind:  string | null
  /** Which one: the feature's name, or the typed coordinate. */
  label: string | null
}

/**
 * `drawnShapeText` names a drawn shape (it comes from the caller's own
 * messages). A recorte is named after its layer's unit name; its label is the
 * feature's name, which is data and stays as it is, or the layer's name when
 * the feature has none.
 */
export function describeAnalysisSubject(
  subject: AnalysisSubject | null,
  drawing: GeoJSON.Feature | null,
  layers: LayerConfig[],
  tx: MapaText,
  drawnShapeText: (shape: DrawnShape) => string,
): AnalysisSubjectText {
  if (!subject) return { kind: null, label: null }

  if (subject.kind === 'drawn') {
    // A typed coordinate is labelled with the coordinate itself, rebuilt from
    // the drawing so its hemisphere letters follow the language too.
    const label = subject.shape === 'coordinates' && drawing ? coordinateLabel(drawing, tx) : null
    return { kind: drawnShapeText(subject.shape), label }
  }

  const layer = layers.find((candidate) => candidate.id === subject.layerId)
  if (!layer) return { kind: null, label: subject.featureName }
  return {
    kind:  layerUnitName(layer, tx),
    label: subject.featureName ?? layerName(layer, tx),
  }
}
