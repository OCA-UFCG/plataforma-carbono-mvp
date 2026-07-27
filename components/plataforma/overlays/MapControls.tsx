'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import type maplibregl from 'maplibre-gl'
import { useStore } from '@/lib/plataforma/store'
import { basemaps } from '@/config/plataforma/basemaps'
import {
  IcPlus, IcMinus, IcLocate, IcMaximize, IcNorth, IcMap, IcPen,
} from '../icons'
import type { PlatformTheme } from '@/types/plataforma'

interface Props {
  mapRef: RefObject<maplibregl.Map | null>
  theme: PlatformTheme
  /** right offset (px), 396 when Results is open, 14 when closed. */
  rightOffset: number
  drawOpen: boolean
  onToggleDraw: () => void
}

/**
 * Cluster de controles do mapa (topo-direita, empilhado, pills de vidro 38px),
 * conforme o handoff: grupo de zoom (+/−), grupo de visão (geolocalizar /
 * tela-cheia / norte), seletor de basemap, e o botão de desenho (lápis). A
 * posição `right` é dinâmica e transiciona com a abertura do painel Resultados.
 */
export default function MapControls({ mapRef, theme, rightOffset, drawOpen, onToggleDraw }: Props) {
  const c = theme.colors
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

  // Shared glass pill styles
  const pill: React.CSSProperties = {
    width: 38, borderRadius: 999, background: c.glassBg,
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    border: `1px solid ${c.glassBd}`, boxShadow: 'var(--sh-ctrl)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    color: c.textDim, padding: '2px 0',
  }
  const cell: React.CSSProperties = {
    height: 34, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', background: 'transparent', border: 'none', color: 'inherit', padding: 0,
  }
  const divider = <div style={{ width: 18, height: 1, background: c.border }} />

  return (
    <div
      style={{
        position: 'absolute', top: 14, right: rightOffset, zIndex: 12,
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
        transition: 'right .3s',
      }}
    >
      {/* zoom */}
      <div style={pill}>
        <button style={cell} onClick={zoomIn} aria-label="Aproximar" title="Aproximar"><IcPlus size={15} /></button>
        {divider}
        <button style={cell} onClick={zoomOut} aria-label="Afastar" title="Afastar"><IcMinus size={15} /></button>
      </div>

      {/* view: geolocate / fullscreen / north */}
      <div style={pill}>
        <button style={cell} onClick={locate} aria-label="Minha localização" title="Minha localização"><IcLocate size={15} /></button>
        {divider}
        <button style={cell} onClick={toggleFullscreen} aria-label={isFull ? 'Sair da tela cheia' : 'Tela cheia'} title={isFull ? 'Sair da tela cheia' : 'Tela cheia'}><IcMaximize size={15} /></button>
        {divider}
        <button style={{ ...cell, transform: `rotate(${-bearing}deg)`, transition: 'transform .1s linear' }} onClick={resetNorth} aria-label="Orientar para o norte" title="Orientar para o norte"><IcNorth size={15} color="currentColor" /></button>
      </div>

      {/* basemap */}
      <div ref={bmRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setBmOpen((v) => !v)}
          aria-label="Mapa base" title="Mapa base"
          aria-haspopup="menu" aria-expanded={bmOpen}
          style={{
            width: 38, height: 38, borderRadius: 999,
            background: bmOpen ? c.accent : c.glassBg,
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${bmOpen ? 'transparent' : c.glassBd}`, boxShadow: 'var(--sh-ctrl)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: bmOpen ? c.onAccent : c.textDim, cursor: 'pointer',
          }}
        >
          <IcMap size={15} />
        </button>
        {bmOpen && (
          <div
            style={{
              position: 'absolute', top: 0, right: 46, minWidth: 176,
              background: c.glassBg, backdropFilter: 'blur(11px)', WebkitBackdropFilter: 'blur(11px)',
              border: `1px solid ${c.glassBd}`, borderRadius: 12, boxShadow: 'var(--sh-pop)',
              padding: 6, display: 'flex', flexDirection: 'column', gap: 4,
              fontFamily: 'var(--font-app), sans-serif',
            }}
          >
            {Object.values(basemaps).map((b) => {
              const active = b.id === basemapId
              return (
                <button
                  key={b.id}
                  onClick={() => { setBasemap(b.id); setBmOpen(false) }}
                  style={{
                    background: active ? c.accent : 'transparent', color: active ? c.onAccent : c.text,
                    border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer',
                    textAlign: 'left', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                  }}
                >
                  {b.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* draw, active state is the fixed "ink" chip from the handoff (#26241d
          in light; adapts via c.text/c.bg so it stays legible in dark). */}
      <button
        onClick={onToggleDraw}
        aria-label="Ferramentas de desenho" title="Ferramentas de desenho"
        aria-pressed={drawOpen}
        style={{
          width: 38, height: 38, borderRadius: 999,
          background: drawOpen ? c.text : c.glassBg,
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${drawOpen ? c.text : c.glassBd}`,
          boxShadow: 'var(--sh-ctrl)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: drawOpen ? c.bg : c.textDim, cursor: 'pointer', transition: 'background .3s',
        }}
      >
        <IcPen size={15} />
      </button>
    </div>
  )
}
