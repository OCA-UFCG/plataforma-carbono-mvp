'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/lib/mapa/store'
import { paradas, ano } from '@/lib/mapa/temporal'
import type { PlatformTheme, RasterLayerConfig } from '@/types/mapa'

interface Props {
  theme: PlatformTheme
}

/** Espera antes de buscar o tile enquanto a alça está sendo arrastada. */
const ESPERA_MS = 400

/**
 * Régua de anos das camadas navegáveis no tempo. Aparece sozinha quando há uma
 * camada temporal visível e some quando não há. Fica acima da barra de desenho
 * e das coordenadas, que também ocupam o centro inferior do mapa.
 */
export default function TemporalSlider({ theme }: Props) {
  const layers         = useStore((s) => s.layers)
  const temporalDate   = useStore((s) => s.temporalDate)
  const setTemporalDate = useStore((s) => s.setTemporalDate)
  const loadingLayers  = useStore((s) => s.loadingLayers)
  const c = theme.colors

  // Primeira camada temporal visível, na ordem em que o painel as lista.
  const camada = layers.find(
    (l): l is RasterLayerConfig =>
      l.type === 'raster' && l.visible && !!l.gee?.temporal,
  )
  const temporal = camada?.gee?.temporal
  // Sem o memo, a lista nova a cada render desestabiliza o commit debounced.
  const anos = useMemo(() => (temporal ? paradas(temporal) : []), [temporal])
  const atual = camada ? temporalDate[camada.id] : undefined
  // Enquanto a camada ainda não gravou a data, a régua acompanha o ano em que
  // o store abre, que é o último, e não o primeiro.
  const achado = anos.indexOf(atual ?? '')
  const indiceReal = achado >= 0 ? achado : anos.length - 1

  // Índice que a alça mostra enquanto arrasta, antes de o tile ser pedido.
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

  // Cancela um commit agendado se o componente sair antes de a espera vencer.
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
        position: 'absolute', bottom: 88, left: '50%', transform: 'translateX(-50%)',
        zIndex: 14, display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 14,
        background: c.glassBg, border: `1px solid ${c.glassBd}`,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 6px 20px rgba(0,0,0,.14)',
        fontFamily: 'var(--font-app), sans-serif',
        maxWidth: 'min(560px, calc(100vw - 32px))',
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
