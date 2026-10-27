'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import type maplibregl from 'maplibre-gl'
import { useStore } from '@/lib/mapa/store'
import { basemaps } from '@/config/mapa/basemaps'
import { IcPen } from '../icons'
import styles from './MapControls.module.css'

interface Props {
  mapRef: RefObject<maplibregl.Map | null>
  /** Distance from the map's right edge (lib/mapa/layout.ts, MAP_INSET). */
  rightOffset: number
  drawOpen: boolean
  onToggleDraw: () => void
}

/** One of Figma's 16px control icons, exported to public/icons/mapa/. */
function Icon({ name }: { name: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static SVG icon
  return <img src={`/icons/mapa/${name}.svg`} alt="" width={16} height={16} />
}

/**
 * Map control stack (Figma 19428:58457), under the "Resultado" button: zoom
 * in and out in one box, then locate, fullscreen and north, then the basemap
 * selector, each a 40px outlined button. The drawing button below them is not
 * in the design; it leaves when the drawing moves into the panel (#141).
 */
export default function MapControls({ mapRef, rightOffset, drawOpen, onToggleDraw }: Props) {
  const basemapId  = useStore((s) => s.basemapId)
  const setBasemap = useStore((s) => s.setBasemap)

  const [bearing, setBearing] = useState(0)
  const [isFull, setIsFull]   = useState(false)
  const [bmOpen, setBmOpen]   = useState(false)
  const bmRef = useRef<HTMLDivElement>(null)

  // North arrow tracks the map bearing.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const onRotate = () => setBearing(map.getBearing())
    onRotate()
    map.on('rotate', onRotate)
    return () => { map.off('rotate', onRotate) }
  }, [mapRef])

  // Fullscreen state mirror.
  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // Close basemap popup on outside click.
  useEffect(() => {
    if (!bmOpen) return
    const onDown = (e: MouseEvent) => {
      if (bmRef.current && !bmRef.current.contains(e.target as Node)) setBmOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [bmOpen])

  const zoomIn  = () => mapRef.current?.zoomIn()
  const zoomOut = () => mapRef.current?.zoomOut()
  const resetNorth = () => mapRef.current?.rotateTo(0, { duration: 400 })
  const locate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 10 }),
      () => { /* permission denied / unavailable, ignore */ },
    )
  }
  const toggleFullscreen = () => {
    const root = document.querySelector('[data-cc-root]') as HTMLElement | null
    if (!document.fullscreenElement) root?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  const fullscreenLabel = isFull ? 'Sair da tela cheia' : 'Tela cheia'
  const drawLabel = drawOpen ? 'Ocultar ferramentas de desenho' : 'Ferramentas de desenho'

  return (
    <div className={styles.stack} style={{ right: rightOffset }}>
      <div className={styles.group}>
        <div className={styles.zoom}>
          <button type="button" className={styles.control} onClick={zoomIn} aria-label="Aproximar" title="Aproximar">
            <Icon name="zoom-in" />
          </button>
          <button type="button" className={styles.control} onClick={zoomOut} aria-label="Afastar" title="Afastar">
            <Icon name="zoom-out" />
          </button>
        </div>
        <button type="button" className={styles.control} onClick={locate} aria-label="Minha localização" title="Minha localização">
          <Icon name="target" />
        </button>
        <button type="button" className={styles.control} onClick={toggleFullscreen} aria-label={fullscreenLabel} title={fullscreenLabel}>
          <Icon name="fullscreen" />
        </button>
        <button
          type="button"
          className={`${styles.control} ${styles.north}`}
          onClick={resetNorth}
          aria-label="Orientar para o norte"
          title="Orientar para o norte"
        >
          <span style={{ display: 'flex', transform: `rotate(${-bearing}deg)` }}>
            <Icon name="navigation" />
          </span>
        </button>
      </div>

      <div ref={bmRef} className={styles.basemap}>
        <button
          type="button"
          className={styles.control}
          onClick={() => setBmOpen((v) => !v)}
          aria-label="Mapa base"
          title="Mapa base"
          aria-haspopup="menu"
          aria-expanded={bmOpen}
        >
          <Icon name="map" />
        </button>
        {bmOpen && (
          <div className={styles.menu} role="menu">
            {Object.values(basemaps).map((b) => (
              <button
                key={b.id}
                type="button"
                role="menuitemradio"
                aria-checked={b.id === basemapId}
                className={`${styles.option} text-ui-medium`}
                onClick={() => { setBasemap(b.id); setBmOpen(false) }}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className={styles.control}
        onClick={onToggleDraw}
        aria-label={drawLabel}
        title={drawLabel}
        aria-pressed={drawOpen}
      >
        <IcPen size={16} />
      </button>
    </div>
  )
}
