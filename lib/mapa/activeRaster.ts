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
  if (entry?.status !== 'ready' || !entry.stretch) return { tileUrl: biome, scale: null }

  const scale = { stretch: entry.stretch, range: entry.range, recorteName: recorte.name }
  const tiles = state.recorteTileUrls[key]
  const tileUrl = tiles?.[date ?? STATIC_KEY]
  if (tileUrl) return { tileUrl, scale }

  // A year stepped before its recorte tile arrived: the nearest year's recorte
  // tile stands in, since the stretch is the same for every year, instead of
  // flashing the biome scale until the new one lands. Before any recorte tile
  // has arrived (the first selection), the biome tile stays.
  const standIn = nearestYearTile(tiles, date)
  if (standIn) return { tileUrl: standIn, scale }
  return { tileUrl: biome, scale: null }
}

function nearestYearTile(tiles: Record<string, string> | undefined, date: string | undefined): string | undefined {
  if (!tiles || !date) return undefined
  const year = Number(date.slice(0, 4))
  let nearest: string | undefined
  let gap = Infinity
  for (const [stop, url] of Object.entries(tiles)) {
    const distance = Math.abs(Number(stop.slice(0, 4)) - year)
    if (distance < gap) {
      nearest = url
      gap = distance
    }
  }
  return nearest
}
