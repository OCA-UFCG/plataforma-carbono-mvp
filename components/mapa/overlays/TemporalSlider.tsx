'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useStore } from '@/lib/mapa/store'
import { ano, labelSide, layerTemporal, paradas } from '@/lib/mapa/temporal'
import styles from './TemporalSlider.module.css'

/** Wait before fetching the tile while the handle is being dragged. */
const ESPERA_MS = 400

/**
 * Year control of the time-navigable layers, Figma's "Slider de tempo"
 * (19481:12692): ‹ and › around a track whose year rides beside the thumb.
 * It shows up on its own when there is a visible temporal layer and
 * disappears when there is none. The card draws no title, so the layer it
 * drives is named only to screen readers, in the range's label.
 */
export default function TemporalSlider() {
  const layers         = useStore((s) => s.layers)
  const temporalDate   = useStore((s) => s.temporalDate)
  const setTemporalDate = useStore((s) => s.setTemporalDate)
  const loadingLayers  = useStore((s) => s.loadingLayers)

  // First visible temporal layer, in the order the panel lists them.
  const camada = layers.find((l) => l.visible && !!layerTemporal(l))
  const temporal = camada ? layerTemporal(camada) : undefined
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

  // The label's side depends on two widths: the track follows the map's
  // column, and the label its year. Zero until measured, which keeps the
  // label where the design puts it.
  const shown = !!camada && anos.length >= 2
  const trackRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const [widths, setWidths] = useState({ track: 0, label: 0 })
  useEffect(() => {
    const track = trackRef.current
    const label = labelRef.current
    if (!shown || !track || !label) return
    const observer = new ResizeObserver(() => setWidths({ track: track.clientWidth, label: label.offsetWidth }))
    observer.observe(track)
    observer.observe(label)
    return () => observer.disconnect()
  }, [shown])

  if (!camada || anos.length < 2) return null

  const indice = arrastando ?? indiceReal
  const carregando = !!loadingLayers[camada.id]
  const fraction = indice / (anos.length - 1)
  const side = labelSide(fraction, widths.track, widths.label)

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

  const botao = (esquerda: boolean) => {
    const limite = esquerda ? indice === 0 : indice === anos.length - 1
    const label = esquerda ? 'Ano anterior' : 'Próximo ano'
    return (
      <button
        type="button"
        className={`${styles.step} ${esquerda ? '' : styles.next}`}
        onClick={() => passo(esquerda ? -1 : 1)}
        disabled={limite}
        aria-label={label}
        title={label}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
        <img src="/icons/mapa/keyboard-arrow-left.svg" alt="" width={24} height={24} />
      </button>
    )
  }

  return (
    <div className={styles.card}>
      {botao(true)}

      <div ref={trackRef} className={styles.track} style={{ '--f': fraction } as CSSProperties}>
        <input
          type="range"
          min={0}
          max={anos.length - 1}
          step={1}
          value={indice}
          onChange={(e) => arrastar(Number(e.target.value))}
          aria-label={`Ano de ${camada.name}`}
          aria-valuetext={ano(anos[indice])}
        />
        <span ref={labelRef} className={`${styles.label} text-ui-tab`} data-side={side} aria-hidden="true">
          {ano(anos[indice])}
        </span>
      </div>

      {botao(false)}

      <span className="sr-only" aria-live="polite">{carregando ? 'carregando' : ''}</span>
    </div>
  )
}
