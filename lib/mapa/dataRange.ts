// Real minimum and maximum of each continuous layer over the Caatinga, which
// the legend prints at the ends of the color bar. The colors keep their own
// calibrated stretch (visParams), so values past its ends still exist on the
// map and share the end color; without these labels the legend reads as if
// they did not.
//
// The values come from config/mapa/dataRanges.json, written by
// `npm run ranges` (scripts/compute-data-ranges.mts).

import ranges from '@/config/mapa/dataRanges.json'

export interface DataRange { min: number; max: number }

type LayerRanges = DataRange | { byYear: Record<string, DataRange> }

export interface DataRangesFile {
  _meta?: Record<string, unknown>
  layers: Record<string, LayerRanges>
}

/** Years a temporal layer steps through, as "YYYY". */
export function layerYears(temporal: { dateRange: [string, string]; dates?: string[] }): string[] {
  if (temporal.dates?.length) return temporal.dates.map((d) => d.slice(0, 4))
  const first = Number(temporal.dateRange[0].slice(0, 4))
  const last = Number(temporal.dateRange[1].slice(0, 4))
  return Array.from({ length: last - first + 1 }, (_, i) => String(first + i))
}

/**
 * Range of a layer, of the year on screen when the layer is temporal. Null
 * when the layer was not measured, so the legend keeps its stretch labels.
 */
export function dataRangeFor(
  layerId: string,
  temporalDate?: string,
  file: DataRangesFile = ranges as DataRangesFile,
): DataRange | null {
  const entry = file.layers[layerId]
  if (!entry) return null
  if ('byYear' in entry) return temporalDate ? entry.byYear[temporalDate.slice(0, 4)] ?? null : null
  return entry
}
