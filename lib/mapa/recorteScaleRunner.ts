// The single place that fetches a recorte scale and the tiles drawn with it.
//
// For each continuous GEE raster on screen while a recorte feature is selected:
// the scale first (/api/gee/scale), then the tile of the year on screen from
// the unchanged /api/gee/tile with only visParams.min/max replaced. Results go
// to keyed caches in the store; lib/mapa/activeRaster.ts decides what is shown.

import { useStore } from '@/lib/mapa/store'
import {
  recorteScaleKey,
  STATIC_KEY,
  type RecorteScaleEntry,
  type ScaleResponse,
  type Stretch,
} from '@/lib/mapa/recorteScale'
import type { LayerConfig, RasterLayerConfig, SelectedRecorte } from '@/types/mapa'

/** A continuous GEE raster on screen whose colors can follow `recorteId`. */
export function scalesWithRecorte(layer: LayerConfig, recorteId: string): layer is RasterLayerConfig {
  return layer.type === 'raster'
    && layer.visible
    && layer.source === 'gee'
    && layer.colorType === 'continuous'
    && !!layer.gee?.asset
    // The recorte the layer is clipped to already has its scale: the default one.
    && layer.clipToLayerId !== recorteId
}

/** The stop a tile is cached under: the date of a temporal layer, STATIC_KEY otherwise. */
export function dateKeyOf(layer: RasterLayerConfig, temporalDate: Record<string, string>): string | undefined {
  return layer.gee?.temporal ? temporalDate[layer.id] : STATIC_KEY
}

export interface RecorteWork {
  layer:    RasterLayerConfig
  key:      string
  need:     'scale' | 'tile'
  dateKey:  string
  stretch?: Stretch
}

export interface PendingRecorteInput {
  layers:          LayerConfig[]
  recorte:         SelectedRecorte | undefined
  temporalDate:    Record<string, string>
  recorteScales:   Record<string, RecorteScaleEntry>
  recorteTileUrls: Record<string, Record<string, string>>
  /** `${key}@${dateKey}` of the tile requests already running. */
  inFlightTiles:   ReadonlySet<string>
}

/**
 * What the current selection still lacks. Pure: the only rule-holder for when a
 * request is sent. A failed or degenerate scale asks for nothing more, so a
 * re-render never re-sends it; selecting the feature again does.
 */
export function pendingRecorteWork(input: PendingRecorteInput): RecorteWork[] {
  const { recorte } = input
  if (!recorte) return []

  const out: RecorteWork[] = []
  for (const layer of input.layers) {
    if (!scalesWithRecorte(layer, recorte.recorteId)) continue
    const dateKey = dateKeyOf(layer, input.temporalDate)
    if (!dateKey) continue

    const key = recorteScaleKey(layer.id, recorte.recorteId, recorte.feicaoIndex)
    const entry = input.recorteScales[key]
    if (!entry) {
      out.push({ layer, key, need: 'scale', dateKey })
      continue
    }
    if (entry.status !== 'ready' || !entry.stretch) continue
    if (input.recorteTileUrls[key]?.[dateKey]) continue
    if (input.inFlightTiles.has(`${key}@${dateKey}`)) continue
    out.push({ layer, key, need: 'tile', dateKey, stretch: entry.stretch })
  }
  return out
}

const inFlightTiles = new Set<string>()

function setScale(key: string, entry: RecorteScaleEntry) {
  useStore.setState((s) => ({ recorteScales: { ...s.recorteScales, [key]: entry } }))
}

async function fetchScale(layer: RasterLayerConfig, key: string, recorte: SelectedRecorte): Promise<void> {
  setScale(key, { status: 'loading' })
  try {
    const res = await fetch('/api/gee/scale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layerId: layer.id, recorteId: recorte.recorteId, feicaoIndex: recorte.feicaoIndex }),
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const { stretch, range } = await res.json() as ScaleResponse
    setScale(key, { status: 'ready', stretch, range })
    // The tile of whatever year is on screen now, if the feature is still selected.
    if (stretch) runRecorteScales()
  } catch (err) {
    // The map stays on the biome scale; there is nothing to tell the reader.
    console.error('[recorteScale]', layer.id, err)
    setScale(key, { status: 'error' })
  }
}

async function fetchTile(layer: RasterLayerConfig, key: string, dateKey: string, stretch: Stretch): Promise<void> {
  const flight = `${key}@${dateKey}`
  inFlightTiles.add(flight)
  try {
    const res = await fetch('/api/gee/tile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset:        layer.gee!.asset,
        clipId:       layer.clipToLayerId,
        temporalDate: dateKey === STATIC_KEY ? undefined : dateKey,
        visParams:    { ...layer.gee!.visParams, min: stretch.min, max: stretch.max },
        classify:     layer.gee!.classify,
      }),
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const { tileUrl } = await res.json()
    if (typeof tileUrl !== 'string' || !tileUrl) throw new Error('API returned no tileUrl')
    useStore.setState((s) => ({
      recorteTileUrls: { ...s.recorteTileUrls, [key]: { ...s.recorteTileUrls[key], [dateKey]: tileUrl } },
    }))
  } catch (err) {
    // An empty slot keeps the biome tile on screen.
    console.error('[recorteScale] tile', layer.id, err)
  } finally {
    inFlightTiles.delete(flight)
  }
}

/** Fetch whatever the current selection still lacks; a no-op without a recorte. */
export function runRecorteScales(): void {
  const s = useStore.getState()
  const recorte = s.selectedGeometry?.recorte
  if (!recorte) return

  for (const work of pendingRecorteWork({
    layers:          s.layers,
    recorte,
    temporalDate:    s.temporalDate,
    recorteScales:   s.recorteScales,
    recorteTileUrls: s.recorteTileUrls,
    inFlightTiles,
  })) {
    if (work.need === 'scale') void fetchScale(work.layer, work.key, recorte)
    else void fetchTile(work.layer, work.key, work.dateKey, work.stretch!)
  }
}
