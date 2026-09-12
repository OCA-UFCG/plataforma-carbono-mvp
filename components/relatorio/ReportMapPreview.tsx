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

    const finish = (src: string | null) => {
      if (cancelled || capturedRef.current) return
      capturedRef.current = true
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
            base: { type: 'raster', tiles: [basemap.url], tileSize: 256, attribution: basemap.attribution },
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

      map.on('error', () => finish(null))
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
      controller.abort()
      map?.remove()
    }
  }, [active, imageSrc, layerId, year, bbox, layer])

  if (imageSrc) {
    return (
      <div className="report-map-frame" style={{ height: 230, overflow: 'hidden' }}>
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
        height: 230, fontSize: 13, color: '#6f6c63',
      }}
    >
      {unavailable && 'Imagem do mapa indisponível.'}
    </div>
  )
}
