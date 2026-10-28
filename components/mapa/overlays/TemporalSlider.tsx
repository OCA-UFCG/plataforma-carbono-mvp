'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/lib/mapa/store'
import { ano, layerTemporal, paradas } from '@/lib/mapa/temporal'
import styles from './TemporalSlider.module.css'

/** Wait before fetching the tile while the handle is being dragged. */
const ESPERA_MS = 400

/**
 * Year control of the time-navigable layers. It shows up on its own when
 * there is a visible temporal layer and disappears when there is none. It
 * lives at the top of the "Legendas" card (FloatingLegend), which the design
 * leaves room for in any width of the map; the design itself does not draw it
 * (issue #136, question 2, kept as an exception).
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
        <img src="/icons/mapa/keyboard-arrow-left.svg" alt="" width={16} height={16} />
      </button>
    )
  }

  return (
    <div className={styles.year}>
      <div className={styles.head}>
        <span className={`${styles.name} text-ui-badge`} title={camada.name}>{camada.name}</span>
        <span className={`${styles.value} text-h4`}>{ano(anos[indice])}</span>
      </div>

      <div className={styles.track}>
        {botao(true)}
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
        {botao(false)}
      </div>

      <div className={`${styles.ends} text-ui-badge`}>
        <span>{ano(anos[0])}</span>
        <span className={styles.loading} aria-live="polite">{carregando ? 'carregando' : ''}</span>
        <span>{ano(anos[anos.length - 1])}</span>
      </div>
    </div>
  )
}
