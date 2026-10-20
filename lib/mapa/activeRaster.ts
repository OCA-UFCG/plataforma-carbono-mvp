// One rule for what a GEE raster shows: the selected recorte's tile and scale
// when both are ready for the year on screen, the biome's otherwise. MapView
// draws with it and the legend describes with it, so the legend never claims a
// scale the map is not showing.

import type { SelectedGeometry } from '@/types/mapa'
import {
  recorteScaleKey,
  STATIC_KEY,
  type RecorteScaleEntry,
  type ScaleRange,
  type Stretch,
} from '@/lib/mapa/recorteScale'

export interface ActiveRasterInput {
  selectedGeometry: SelectedGeometry | null
  temporalDate:     Record<string, string>
  fetchedTileUrls:  Record<string, string>
  temporalTileUrls: Record<string, Record<string, string>>
  recorteScales:    Record<string, RecorteScaleEntry>
  recorteTileUrls:  Record<string, Record<string, string>>
}

export interface ActiveScale {
  stretch:     Stretch
  range:       ScaleRange | null
  recorteName: string
}

export interface ActiveRaster {
  tileUrl: string | null
  scale:   ActiveScale | null
}

export function activeRaster(state: ActiveRasterInput, layerId: string): ActiveRaster {
  const date = state.temporalDate[layerId]
  const biome = date && state.temporalTileUrls[layerId]
    ? state.temporalTileUrls[layerId][date] ?? null
    : state.fetchedTileUrls[layerId] ?? null

  const recorte = state.selectedGeometry?.recorte
  if (!recorte) return { tileUrl: biome, scale: null }

  const key = recorteScaleKey(layerId, recorte.recorteId, recorte.feicaoIndex)
  const entry = state.recorteScales[key]
  const tileUrl = state.recorteTileUrls[key]?.[date ?? STATIC_KEY]
  if (entry?.status !== 'ready' || !entry.stretch || !tileUrl) return { tileUrl: biome, scale: null }

  return { tileUrl, scale: { stretch: entry.stretch, range: entry.range, recorteName: recorte.name } }
}
