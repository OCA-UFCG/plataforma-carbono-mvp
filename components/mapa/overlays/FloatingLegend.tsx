'use client'

import { useState, type Ref } from 'react'
import { IcList, IcChevronDown } from '../icons'
import { useStore } from '@/lib/mapa/store'
import { EmissionsLegendItem, VectorLegendItem, RasterLegendItem } from './LegendItems'
import type { PlatformTheme } from '@/types/mapa'

interface Props {
  theme: PlatformTheme
  /** right offset (px), matches the control cluster (396 open / 14 closed). */
  rightOffset: number
  /** Root box, open or collapsed; MapView measures it to keep a fit clear of it. */
  ref?: Ref<HTMLDivElement>
}

export default function FloatingLegend({ theme, rightOffset, ref }: Props) {
  const layers = useStore((s) => s.layers)
  const temporalDate = useStore((s) => s.temporalDate)
  const emissoes = useStore((s) => s.emissoes)
  const layerErrors = useStore((s) => s.layerErrors)
  const [collapsed, setCollapsed] = useState(false)

  const visible = layers.filter((l) => l.visible)

  // Handoff: the legend shows ONLY active layers, when nothing is on it
  // vanishes entirely (like the Results panel), not an empty "no layers" box.
  if (visible.length === 0) return null

  // Collapsed: small button
  if (collapsed) {
    return (
      <div ref={ref} style={{ position: 'absolute', bottom: 14, right: rightOffset, zIndex: 10, transition: 'right .3s' }}>
        <button
          className="ui-press"
          onClick={() => setCollapsed(false)}
          title="Legenda"
          style={{
            width: 38,
            height: 38,
            background: theme.colors.glassBg,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${theme.colors.glassBd}`,
            borderRadius: 999,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxShadow: 'var(--sh-ctrl)',
            color: theme.colors.textDim,
          }}
        >
          <IcList size={13} />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        bottom: 14,
        right: rightOffset,
        zIndex: 10,
        width: 256,
        transition: 'right .3s',
        // Cap height so a long legend (e.g. MapBiomas' 30 classes) can't grow
        // past the viewport on short screens; it scrolls instead.
        maxHeight: 'min(420px, calc(100vh - 200px))',
        background: theme.colors.glassBg,
        backdropFilter: 'blur(11px)',
        WebkitBackdropFilter: 'blur(11px)',
        border: `1px solid ${theme.colors.glassBd}`,
        borderRadius: 14,
        boxShadow: '0 10px 30px -12px rgba(30,28,18,.35)',
        fontFamily: 'var(--font-app), sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderBottom: `1px solid ${theme.colors.border}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: theme.colors.text }}>
          Legenda
        </span>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            color: theme.colors.textDim,
          }}
          title="Minimizar"
        >
          <IcChevronDown size={13} />
        </button>
      </div>

      {/* Content, scrollable */}
      <div
        style={{
          overflowY: 'auto',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {visible.length === 0 ? (
          <span style={{ fontSize: 12.5, color: theme.colors.textDim, textAlign: 'center', padding: '8px 0' }}>
            Nenhuma camada ativa
          </span>
        ) : (
          visible.map((layer) => {
            if (layer.type === 'vector') {
              return <VectorLegendItem key={layer.id} layer={layer} theme={theme} />
            }
            if (layer.type === 'emissions') {
              return (
                <EmissionsLegendItem
                  key={layer.id}
                  layer={layer}
                  theme={theme}
                  temporalDate={temporalDate[layer.id]}
                  layers={layers}
                  emissoes={emissoes}
                  layerErrors={layerErrors}
                />
              )
            }
            return (
              <RasterLegendItem
                key={layer.id}
                layer={layer}
                theme={theme}
                temporalDate={temporalDate[layer.id]}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
