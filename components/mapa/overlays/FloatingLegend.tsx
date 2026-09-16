'use client'

import { useState } from 'react'
import { IcList, IcChevronDown } from '../icons'
import { useStore } from '@/lib/mapa/store'
import { describeFlux, fluxInk, zeroPosition } from '@/lib/mapa/carbonFlux'
import type { PlatformTheme, VectorLayerConfig, RasterLayerConfig } from '@/types/mapa'

interface Props {
  theme: PlatformTheme
  /** right offset (px), matches the control cluster (396 open / 14 closed). */
  rightOffset: number
}

export default function FloatingLegend({ theme, rightOffset }: Props) {
  const layers = useStore((s) => s.layers)
  const [collapsed, setCollapsed] = useState(false)

  const visible = layers.filter((l) => l.visible)

  // Handoff: the legend shows ONLY active layers, when nothing is on it
  // vanishes entirely (like the Results panel), not an empty "no layers" box.
  if (visible.length === 0) return null

  // Collapsed: small button
  if (collapsed) {
    return (
      <div style={{ position: 'absolute', bottom: 14, right: rightOffset, zIndex: 10, transition: 'right .3s' }}>
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
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: theme.colors.text }}>
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
          <span style={{ fontSize: 11, color: theme.colors.textDim, textAlign: 'center', padding: '8px 0' }}>
            Nenhuma camada ativa
          </span>
        ) : (
          visible.map((layer) => {
            if (layer.type === 'vector') {
              return <VectorLegendItem key={layer.id} layer={layer as VectorLayerConfig} theme={theme} />
            }
            return <RasterLegendItem key={layer.id} layer={layer as RasterLayerConfig} theme={theme} />
          })
        )}
      </div>
    </div>
  )
}

// Vector layer: single color swatch + name

function VectorLegendItem({ layer, theme }: { layer: VectorLayerConfig; theme: PlatformTheme }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 13,
          height: 13,
          borderRadius: 3,
          flexShrink: 0,
          background: layer.color,
          border: `1px solid ${layer.color}`,
        }}
      />
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: theme.colors.text,
          // Wraps instead of truncating: the legend is 256px wide and the
          // longer names ("Territórios Quilombolas") lost their tail to an
          // ellipsis, which is the one place the reader checks what is on.
          minWidth: 0,
          overflowWrap: 'anywhere',
          lineHeight: 1.3,
        }}
        title={layer.name}
      >
        {layer.name}
      </span>
    </div>
  )
}

// Raster layer: name + class swatches

function RasterLegendItem({ layer, theme }: { layer: RasterLayerConfig; theme: PlatformTheme }) {
  const hasClasses = layer.classes && layer.classes.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* Layer name, uppercase eyebrow (handoff) */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: theme.colors.textDim,
          // Same reason as the vector item, and worse here: uppercase plus
          // letter-spacing costs width, so "BIOMASSA ACIMA DO SOLO (QUARTO
          // INVENTÁRIO)" was cut roughly in half.
          overflowWrap: 'anywhere',
          lineHeight: 1.4,
        }}
        title={layer.name}
      >
        {layer.name}
      </span>

      {/* Categorical classes */}
      {hasClasses &&
        layer.classes!.map((cls) => (
          <div key={cls.value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 13,
                height: 13,
                borderRadius: 3,
                flexShrink: 0,
                background: cls.color,
              }}
            />
            <span style={{ fontSize: 12.5, fontWeight: 500, color: theme.colors.text }}>{cls.label}</span>
          </div>
        ))}

      {/* Continuous: real palette gradient with min/max + unit */}
      {!hasClasses && layer.colorType === 'continuous' && (
        <ContinuousLegend layer={layer} theme={theme} />
      )}
    </div>
  )
}

// Continuous raster: gradient from the actual palette + min/max/unit

function ContinuousLegend({ layer, theme }: { layer: RasterLayerConfig; theme: PlatformTheme }) {
  const palette = layer.gee?.visParams?.palette
  const min = layer.gee?.visParams?.min ?? layer.rescale?.[0]
  const max = layer.gee?.visParams?.max ?? layer.rescale?.[1]

  // Use the real raster palette so the bar matches the map; fall back to a
  // neutral accent gradient only when no palette is configured.
  const gradient =
    palette && palette.length > 0
      ? `linear-gradient(to right, ${palette.join(', ')})`
      : `linear-gradient(to right, ${theme.colors.accent}, ${theme.colors.text})`

  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

  const endStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: theme.colors.caption,
    fontVariantNumeric: 'tabular-nums',
  }

  // A signed flux crosses zero somewhere along the bar, and that crossing is
  // the whole reading: left of it the area removed carbon, right of it it
  // emitted. So the ends lose the minus sign and name their direction, and a
  // tick marks the equilibrium. The fraction is computed from min/max rather
  // than hardcoded at the middle, because the calibrated range is asymmetric
  // (-100 to 300 puts zero at a quarter of the way).
  const signed = layer.signedFlux === true && min != null && max != null
  const zero = signed ? zeroPosition(min, max) : null

  return (
    <div style={{ marginLeft: 0 }}>
      <div style={{ position: 'relative', height: 9, borderRadius: 99, background: gradient }}>
        {zero !== null && (
          <span
            aria-hidden
            title="Equilíbrio: nem emissão nem sequestro"
            style={{
              position: 'absolute',
              left: `${zero * 100}%`,
              top: -2,
              width: 1.5,
              height: 13,
              background: theme.colors.text,
              opacity: 0.55,
            }}
          />
        )}
      </div>
      {signed ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 4,
            marginTop: 2,
          }}
        >
          <FluxEnd value={min} theme={theme} format={fmt} align="left" />
          {layer.unit && (
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.colors.caption, textAlign: 'center' }}>
              {layer.unit}
            </span>
          )}
          <FluxEnd value={max} theme={theme} format={fmt} align="right" />
        </div>
      ) : (
        (min != null || max != null || layer.unit) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 4,
              marginTop: 2,
            }}
          >
            <span style={endStyle}>{min != null ? fmt(min) : ''}</span>
            {layer.unit && (
              <span style={{ fontSize: 10, fontWeight: 700, color: theme.colors.caption, textAlign: 'center' }}>
                {layer.unit}
              </span>
            )}
            <span style={endStyle}>{max != null ? fmt(max) : ''}</span>
          </div>
        )
      )}
    </div>
  )
}

/** One end of a signed flux scale: the magnitude, then what that side means. */
function FluxEnd({
  value,
  theme,
  format,
  align,
}: {
  value: number
  theme: PlatformTheme
  format: (n: number) => string
  align: 'left' | 'right'
}) {
  const flux = describeFlux(value)
  const ink = fluxInk(flux.direction, theme.colors)

  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'left' ? 'flex-start' : 'flex-end' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: ink, fontVariantNumeric: 'tabular-nums' }}>
        {format(flux.magnitude)}
      </span>
      {flux.noun && (
        <span style={{ fontSize: 9, fontWeight: 700, color: ink }}>{flux.noun}</span>
      )}
    </span>
  )
}
