'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/lib/mapa/store'
import { paradas, ano } from '@/lib/mapa/temporal'
import { centeredInGutters, gutterMaxWidth } from '@/lib/mapa/gutters'
import type { PlatformTheme, RasterLayerConfig } from '@/types/mapa'

interface Props {
  theme: PlatformTheme
  /** Free-strip anchors; see lib/mapa/gutters. */
  leftEdge: number
  rightOffset: number
}

/** Wait before fetching the tile while the handle is being dragged. */
const ESPERA_MS = 400

/**
 * Year slider of the time-navigable layers. It shows up on its own when there
 * is a visible temporal layer and disappears when there is none. It sits above
 * the drawing toolbar and the coordinates, which also occupy the bottom center
 * of the map.
 */
export default function TemporalSlider({ theme, leftEdge, rightOffset }: Props) {
  const layers         = useStore((s) => s.layers)
  const temporalDate   = useStore((s) => s.temporalDate)
  const setTemporalDate = useStore((s) => s.setTemporalDate)
  const loadingLayers  = useStore((s) => s.loadingLayers)
  const c = theme.colors

  // First visible temporal layer, in the order the panel lists them.
  const camada = layers.find(
    (l): l is RasterLayerConfig =>
      l.type === 'raster' && l.visible && !!l.gee?.temporal,
  )
  const temporal = camada?.gee?.temporal
  // Without the memo, the new list on every render destabilizes the debounced commit.
  const anos = useMemo(() => (temporal ? paradas(temporal) : []), [temporal])
  const atual = camada ? temporalDate[camada.id] : undefined
  // While the layer has not stored a date yet, the slider follows the year the
  // store opens on, which is the last one, not the first.
  const achado = anos.indexOf(atual ?? '')
  const indiceReal = achado >= 0 ? achado : anos.length - 1

  // Index the handle shows while dragging, before the tile is requested.
  const [arrastando, setArrastando] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const comitar = useCallback(
    (i: number) => {
      if (!camada || !anos[i]) return
      setArrastando(null)
      setTemporalDate(camada.id, anos[i])
    },
    [camada, anos, setTemporalDate],
  )

  // Cancels a scheduled commit if the component unmounts before the wait elapses.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  if (!camada || anos.length < 2) return null

  const indice = arrastando ?? indiceReal
  const carregando = !!loadingLayers[camada.id]

  const arrastar = (i: number) => {
    setArrastando(i)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => comitar(i), ESPERA_MS)
  }

  const passo = (delta: number) => {
    const i = Math.min(anos.length - 1, Math.max(0, indice + delta))
    if (timer.current) clearTimeout(timer.current)
    comitar(i)
  }

  const seta = (esquerda: boolean) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={esquerda ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )

  const botao = (esquerda: boolean) => {
    const limite = esquerda ? indice === 0 : indice === anos.length - 1
    return (
      <button
        type="button"
        onClick={() => passo(esquerda ? -1 : 1)}
        disabled={limite}
        aria-label={esquerda ? 'Ano anterior' : 'Próximo ano'}
        style={{
          display: 'grid', placeItems: 'center', width: 26, height: 26,
          borderRadius: 8, border: `1px solid ${c.glassBd}`,
          background: 'transparent', color: limite ? c.textDim : c.text,
          opacity: limite ? 0.4 : 1, cursor: limite ? 'default' : 'pointer',
          padding: 0,
        }}
      >
        {seta(esquerda)}
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'absolute', bottom: 88, ...centeredInGutters(leftEdge, rightOffset),
        zIndex: 14, display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 14,
        background: c.glassBg, border: `1px solid ${c.glassBd}`,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 6px 20px rgba(0,0,0,.14)',
        fontFamily: 'var(--font-app), sans-serif',
        maxWidth: `min(560px, ${gutterMaxWidth(leftEdge, rightOffset)})`,
      }}
    >
      {botao(true)}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 240, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <span
            style={{
              fontSize: 11, fontWeight: 600, color: c.textDim,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {camada.name}
          </span>
          <span
            style={{
              fontSize: 17, fontWeight: 800, color: c.accent,
              fontVariantNumeric: 'lining-nums tabular-nums', lineHeight: 1,
            }}
          >
            {ano(anos[indice])}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={anos.length - 1}
          step={1}
          value={indice}
          onChange={(e) => arrastar(Number(e.target.value))}
          aria-label={`Ano de ${camada.name}`}
          aria-valuetext={ano(anos[indice])}
          style={{ width: '100%', accentColor: c.accent, cursor: 'pointer', margin: 0 }}
        />

        <div
          style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 10, color: c.caption,
            fontVariantNumeric: 'lining-nums tabular-nums',
          }}
        >
          <span>{ano(anos[0])}</span>
          <span style={{ color: carregando ? c.accent : 'transparent' }}>carregando</span>
          <span>{ano(anos[anos.length - 1])}</span>
        </div>
      </div>

      {botao(false)}
    </div>
  )
}
