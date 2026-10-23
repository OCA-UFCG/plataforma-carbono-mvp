// The single place that fetches the map by feature: for every visible
// continuous raster drawn by the finest choropleth recorte on, the values of
// every year at once (/api/gee/choropleth), into the store. MapView draws them
// and the legend describes them through lib/mapa/choropleth.ts.

import { useStore } from '@/lib/mapa/store'
import {
  choroplethKey,
  choroplethRecorte,
  type ChoroplethEntry,
  type ChoroplethResponse,
} from '@/lib/mapa/choropleth'
import type { LayerConfig, RasterLayerConfig } from '@/types/mapa'

export interface PendingChoropleth {
  layer:     RasterLayerConfig
  recorteId: string
  key:       string
}

/**
 * What is still to be asked. Pure. A failed entry asks nothing more, so a
 * re-render never re-sends it; turning its recorte on again drops it
 * (`withoutChoroplethErrors` in the store).
 */
export function pendingChoropleths(
  layers: LayerConfig[],
  choropleths: Record<string, ChoroplethEntry>,
): PendingChoropleth[] {
  const out: PendingChoropleth[] = []
  for (const layer of layers) {
    const recorte = choroplethRecorte(layers, layer)
    if (!recorte) continue
    const key = choroplethKey(layer.id, recorte.id)
    if (choropleths[key]) continue
    out.push({ layer: layer as RasterLayerConfig, recorteId: recorte.id, key })
  }
  return out
}

function setEntry(key: string, entry: ChoroplethEntry) {
  useStore.setState((s) => ({ choropleths: { ...s.choropleths, [key]: entry } }))
}

async function fetchChoropleth({ layer, recorteId, key }: PendingChoropleth): Promise<void> {
  setEntry(key, { status: 'loading' })
  try {
    const res = await fetch('/api/gee/choropleth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layerId: layer.id, recorteId }),
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const answer = await res.json() as ChoroplethResponse
    setEntry(key, { status: 'ready', ...answer })
  } catch (err) {
    // The pixels on the biome scale stay; there is nothing to tell the reader.
    console.error('[choropleth]', layer.id, err)
    setEntry(key, { status: 'error' })
  }
}

/** Fetch whatever the rasters on screen still lack. */
export function runChoropleths(): void {
  const { layers, choropleths } = useStore.getState()
  for (const pending of pendingChoropleths(layers, choropleths)) void fetchChoropleth(pending)
}
