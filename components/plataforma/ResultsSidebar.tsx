'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { IcX, IcBarChart } from './icons'
import { useStore } from '@/lib/plataforma/store'
import type { PlatformTheme } from '@/types/plataforma'

// pt-BR number formatting (comma decimal, dot thousands).
const nf    = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const nfInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

// Load StatsChart (and its heavy Recharts dependency) only when the results
// panel actually needs it, keeps Recharts out of the initial map bundle.
const StatsChart = dynamic(() => import('./StatsChart'), {
  ssr: false,
  loading: () => null,
})

interface Props {
  theme: PlatformTheme
  /** Collapse state is lifted so plataforma can shift the map controls/legend. */
  collapsed: boolean
  onSetCollapsed: (v: boolean) => void
}

/**
 * Floating results panel. Appears whenever there's a measurement to show
 * (drawn geometry, or a vector feature clicked over a raster), or when a
 * raster is active but nothing was analysed yet, in which case it shows an
 * onboarding hint.
 *
 * Anatomy: cut chip + feature name, "Área analisada" hero card, length /
 * pixel-value cards, raster statistics, provenance footer. Below 768px it
 * becomes a bottom drawer so it never squeezes the map sideways.
 */
export default function ResultsSidebar({ theme, collapsed, onSetCollapsed }: Props) {
  const drawnArea     = useStore((s) => s.drawnArea)
  const drawnLength   = useStore((s) => s.drawnLength)
  const pixelValue    = useStore((s) => s.pixelValue)
  const rasterStats   = useStore((s) => s.rasterStats)
  const statsLoading  = useStore((s) => s.statsLoading)
  const statsError    = useStore((s) => s.statsError)
  const analysisLabel = useStore((s) => s.analysisLabel)
  const analysisKind  = useStore((s) => s.analysisKind)
  const layers        = useStore((s) => s.layers)

  const c = theme.colors

  const hasContent =
    drawnArea   !== null ||
    drawnLength !== null ||
    pixelValue  !== null ||
    rasterStats !== null ||
    statsLoading ||
    statsError !== null

  // Onboarding hint when a raster is active but nothing was analysed yet.
  const activeRaster = layers.find((l) => l.type === 'raster' && l.visible)
  const showEmptyHint = !hasContent && !!activeRaster

  // Below 768px the panel becomes a bottom drawer over the map.
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!hasContent && !showEmptyHint) return null

  // Collapsed: a pill at the bottom on narrow screens, a slim tab on the right
  // edge on desktop.
  if (collapsed) {
    return (
      <button
        className="ui-press"
        onClick={() => onSetCollapsed(false)}
        aria-label="Mostrar resultados"
        title="Mostrar resultados"
        style={{
          position: 'absolute',
          zIndex: 10,
          background: c.glassBg,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${c.glassBd}`,
          boxShadow: 'var(--sh-ctrl)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: c.accent,
          fontFamily: 'var(--font-app), sans-serif',
          fontSize: 12,
          fontWeight: 700,
          ...(narrow
            ? { left: '50%', bottom: 14, transform: 'translateX(-50%)', height: 38, padding: '0 16px', borderRadius: 999 }
            : { right: 0, top: '50%', transform: 'translateY(-50%)', width: 28, height: 56, padding: 0, borderRadius: '8px 0 0 8px', borderRight: 'none' }),
        }}
      >
        <IcBarChart size={14} />
        {narrow && <span>Resultados</span>}
      </button>
    )
  }

  // Shared card + label styles (handoff typographic scale).
  const card: React.CSSProperties = {
    background: c.accentBg,
    border: `1px solid ${c.accentBd}`,
    borderRadius: 12,
    padding: '12px 14px',
    marginBottom: 8,
  }
  const eyebrow: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    color: c.dim,
  }
  const heroNumber: React.CSSProperties = {
    fontSize: 36,
    fontWeight: 800,
    color: c.text,
    lineHeight: 1.05,
    fontVariantNumeric: 'tabular-nums',
  }
  const heroUnit: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: c.accent,
  }

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 10,
        ...(narrow
          ? { left: 0, right: 0, bottom: 0, maxHeight: '62dvh', borderRadius: '16px 16px 0 0' }
            // Cap height so a tall result never grows down over the bottom-right
            // control cluster (zoom + view/tool pills).
          : { right: 16, top: 16, width: 368, maxHeight: 'calc(100% - 300px)', borderRadius: 16 }),
        background: c.glassBg,
        backdropFilter: 'blur(11px)',
        WebkitBackdropFilter: 'blur(11px)',
        border: `1px solid ${c.glassBd}`,
        boxShadow: 'var(--sh-panel)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-app), sans-serif',
        overflowY: 'auto',
        padding: '14px 14px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 10px' }}>
        <span style={{ ...eyebrow, fontSize: 11 }}>Resultados</span>
        <button
          onClick={() => onSetCollapsed(true)}
          aria-label="Ocultar resultados"
          title="Ocultar resultados"
          style={{
            width: 28, height: 28, borderRadius: 999,
            background: 'transparent',
            border: `1px solid ${c.border}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: c.textDim,
          }}
        >
          <IcX size={14} />
        </button>
      </div>

      {/* Cut chip + feature name */}
      {(analysisKind || analysisLabel) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '0 0 10px' }}>
          {analysisKind && (
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
              color: c.accentInk, background: c.accentBg, border: `1px solid ${c.accentBd}`,
              borderRadius: 5, padding: '2px 8px',
            }}>
              {analysisKind}
            </span>
          )}
          {analysisLabel && (
            <span style={{ fontSize: 13.5, fontWeight: 700, color: c.text }}>{analysisLabel}</span>
          )}
        </div>
      )}

      {/* Área analisada (hero) */}
      {drawnArea !== null && (
        <div style={card}>
          <div style={{ ...eyebrow, marginBottom: 4 }}>Área analisada</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={heroNumber}>{nf.format(drawnArea)}</span>
            <span style={heroUnit}>km²</span>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: c.dim, fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>
            {nfInt.format(drawnArea * 100)} hectares
          </div>
        </div>
      )}

      {/* Comprimento */}
      {drawnLength !== null && (
        <div style={card}>
          <div style={{ ...eyebrow, marginBottom: 4 }}>Comprimento</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ ...heroNumber, fontSize: 28 }}>{nf.format(drawnLength)}</span>
            <span style={{ ...heroUnit, fontSize: 14 }}>km</span>
          </div>
        </div>
      )}

      {/* Valor do pixel */}
      {pixelValue !== null && (
        <div style={card}>
          <div style={{ ...eyebrow, marginBottom: 4 }}>Valor do pixel</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pixelValue.color && (
              <span style={{ width: 14, height: 14, borderRadius: 3, background: pixelValue.color, flexShrink: 0 }} />
            )}
            <span style={{ ...heroNumber, fontSize: 24 }}>
              {pixelValue.value.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
            </span>
            {pixelValue.label && (
              <span style={{ fontSize: 11.5, fontWeight: 600, color: c.dim }}>{pixelValue.label}</span>
            )}
          </div>
        </div>
      )}

      <StatsChart theme={theme} />

      {showEmptyHint && (
        <div style={{
          background: c.bgCard,
          border: `1px dashed ${c.border}`,
          borderRadius: 12,
          padding: '14px 12px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: c.text }}>
            Analisar {activeRaster!.name}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: c.dim, lineHeight: 1.5 }}>
            Clique em um município ou região vetorial sobre o raster (ou desenhe um polígono/ponto com as ferramentas à direita) para ver estatísticas desta camada.
          </span>
        </div>
      )}

      {/* Provenance footer */}
      {hasContent && (
        <div style={{
          marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${c.border}`,
          fontSize: 10, fontWeight: 600, color: c.caption, textAlign: 'center',
        }}>
          Estatística zonal, Google Earth Engine
        </div>
      )}
    </div>
  )
}
