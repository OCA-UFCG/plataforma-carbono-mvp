'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import appConfig from '@/config/mapa/layers.json'
import { basemaps, defaultBasemapId } from '@/config/mapa/basemaps'
import type { RasterLayerConfig } from '@/types/mapa'

export interface ReportMapPreviewProps {
  layerId:   string
  bbox:      [number, number, number, number]
  year:      string | null
  active:    boolean
  imageSrc?: string
  onCapture: (src: string | null) => void
}

const GEE_SOURCE_ID = 'relatorio-gee'
const GEE_LAYER_ID = 'relatorio-gee-layer'

/**
 * Height of the map frame, and therefore of the captured bitmap.
 *
 * Fixed rather than filling its grid cell: the capture happens once, at the
 * container's size when the map goes idle, and at that moment the neighbouring
 * column still holds a loading placeholder. A frame that grew with its
 * neighbour would capture short and then be stretched.
 *
 * 300 rather than the 230 this started at, because the statistics panel beside
 * it runs to roughly 360px for a continuous layer, and the difference showed as
 * a band of empty paper under the map.
 */
const FRAME_HEIGHT = 300

// The primary line of defense against a stuck capture: shorter than the
// queue's own backstop timeout, and owned by the component that can still
// show a placeholder and advance the queue through the normal onCapture path.
const CAPTURE_TIMEOUT_MS = 20_000

/** Tile URLs are shared across sections and survive a re-render. */
const tileUrlCache = new Map<string, string | null>()

async function resolveTileUrl(
  layer: RasterLayerConfig,
  year: string | null,
  signal: AbortSignal,
): Promise<string | null> {
  const key = `${layer.id}:${year ?? 'static'}`
  const cached = tileUrlCache.get(key)
  if (cached !== undefined) return cached

  // The same body the store sends in setTemporalDate, so the document shows
  // the same rendering the map does: clipped to the biome, at the layer's own
  // visParams, with the offline Jenks breaks when it has them.
  const res = await fetch('/api/gee/tile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset:        layer.gee?.asset,
      clipId:       layer.clipToLayerId,
      temporalDate: year ? `${year}-01-01` : undefined,
      visParams:    layer.gee?.visParams,
      classify:     layer.gee?.classify,
    }),
    signal,
  })
  if (!res.ok) {
    tileUrlCache.set(key, null)
    return null
  }
  const { tileUrl } = await res.json() as { tileUrl?: string }
  const resolved = typeof tileUrl === 'string' && tileUrl ? tileUrl : null
  tileUrlCache.set(key, resolved)
  return resolved
}

export default function ReportMapPreview({
  layerId, bbox, year, active, imageSrc, onCapture,
}: ReportMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const capturedRef = useRef(false)
  const onCaptureRef = useRef(onCapture)
  const [failed, setFailed] = useState(false)

  useEffect(() => { onCaptureRef.current = onCapture }, [onCapture])

  // Resolved at render time rather than discovered inside the effect: a
  // missing layer/asset can never produce a map, and deciding that here means
  // the effect's early guard never needs to write local state synchronously
  // (react-hooks/set-state-in-effect) before its first await.
  const layer = useMemo(
    () => (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === layerId),
    [layerId],
  )
  const layerUnavailable = !layer?.gee?.asset

  useEffect(() => {
    // Only the section the queue points at mounts a map, and only once.
    if (!active || imageSrc || capturedRef.current) return
    const container = containerRef.current
    if (!container) return

    // Known synchronously from the `layer` memo above — release the queue
    // slot without touching local state; `layerUnavailable` already drives
    // the "indisponível" render for this case.
    if (!layer?.gee?.asset) {
      capturedRef.current = true
      onCaptureRef.current(null)
      return
    }

    const controller = new AbortController()
    let map: maplibregl.Map | null = null
    let cancelled = false

    // A map that never reaches `idle` — a tile route failure, a lost WebGL
    // context — must not hold this section blank forever: this timer finishes
    // with the visible placeholder and advances the queue through the normal
    // onCapture path. `finish`'s own `capturedRef` guard makes a late `idle`
    // after this fires a harmless no-op. Declared before `finish` so the
    // handle exists for `finish` to clear.
    const timeoutId = setTimeout(() => finish(null), CAPTURE_TIMEOUT_MS)

    const finish = (src: string | null) => {
      if (cancelled || capturedRef.current) return
      capturedRef.current = true
      clearTimeout(timeoutId)
      if (!src) setFailed(true)
      onCaptureRef.current(src)
      map?.remove()
      map = null
    }

    async function setup() {
      let tileUrl: string | null = null
      try {
        tileUrl = await resolveTileUrl(layer!, year, controller.signal)
      } catch {
        return finish(null)
      }
      if (cancelled) return
      if (!tileUrl) return finish(null)

      // `basemaps` is a Record keyed by id, not an array.
      const basemap = basemaps[defaultBasemapId]
      if (!basemap) return finish(null)

      map = new maplibregl.Map({
        // Narrowed by the guard above; the nested async function does not
        // retain that narrowing across the closure boundary.
        container: container!,
        // Without this the canvas is cleared before toDataURL can read it and
        // the capture comes back transparent. This maplibre-gl version nests
        // the WebGL context attribute rather than taking it as a top-level
        // MapOptions field.
        canvasContextAttributes: { preserveDrawingBuffer: true },
        attributionControl: false,
        interactive: false,
        style: {
          version: 8,
          sources: {
            base: {
              type: 'raster', tiles: [basemap.url], tileSize: 256,
              attribution: basemap.attribution,
              // As MapView.tsx does for the same basemap: without it, a small
              // quilombo or terra indígena fitted into this small frame
              // requests tiles past z19, which CARTO does not have.
              maxzoom: basemap.maxZoom,
            },
            [GEE_SOURCE_ID]: { type: 'raster', tiles: [tileUrl], tileSize: 256 },
          },
          layers: [
            { id: 'base-layer', type: 'raster', source: 'base' },
            {
              id: GEE_LAYER_ID, type: 'raster', source: GEE_SOURCE_ID,
              paint: { 'raster-opacity': (layer!.opacity ?? 100) / 100 },
            },
          ],
        },
        bounds: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
        fitBoundsOptions: { padding: 16 },
      })

      // MapLibre emits 'error' for every individual tile fetch failure, not
      // only for fatal errors — a single 404 must not replace the whole
      // section's map. A tile-fetch failure carries `sourceId` and/or `tile`
      // on the event (added as the error propagates up from the source, see
      // TileManager -> Style -> Map in maplibre-gl); the type only declares
      // `error`, so this reads the runtime-only fields through a cast.
      // MapView.tsx registers no handler at all and tolerates exactly this.
      map.on('error', (e) => {
        const { sourceId, tile } = e as maplibregl.ErrorEvent & { sourceId?: string; tile?: unknown }
        if (sourceId || tile) return
        finish(null)
      })
      // `idle` fires when every tile in view has finished loading and nothing
      // is animating, which is the first moment the canvas holds the whole
      // picture.
      map.once('idle', () => {
        try {
          finish(map!.getCanvas().toDataURL('image/png'))
        } catch {
          // A cross-origin tile taints the canvas and toDataURL throws.
          finish(null)
        }
      })
    }

    void setup()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
      map?.remove()
    }
  }, [active, imageSrc, layerId, year, bbox, layer])

  if (imageSrc) {
    return (
      <div className="report-map-frame" style={{ height: FRAME_HEIGHT, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imageSrc is a captured data: URI, not an optimizable asset */}
        <img src={imageSrc} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }

  const unavailable = failed || layerUnavailable

  return (
    <div
      ref={containerRef}
      className="report-map-frame"
      style={{
        display: unavailable ? 'flex' : 'block',
        alignItems: 'center', justifyContent: 'center',
        height: FRAME_HEIGHT, fontSize: 13, color: '#6f6c63',
      }}
    >
      {unavailable && 'Imagem do mapa indisponível.'}
    </div>
  )
}
