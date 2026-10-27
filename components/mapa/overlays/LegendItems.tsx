import type { CSSProperties } from 'react'
import { describeFlux, fluxInk, zeroPosition } from '@/lib/mapa/carbonFlux'
import { dataRangeFor } from '@/lib/mapa/dataRange'
import { anoEmissoes, nivelEmissoes, rotulosClasses, type EmissoesEntry } from '@/lib/emissoes/mapa'
import type { EmissionsLayerConfig, LayerConfig, PlatformTheme, VectorLayerConfig, RasterLayerConfig } from '@/types/mapa'

// Legend entries shared by the floating legend and the JPEG's sheet. They take
// everything from props, store included, so the off-screen sheet renders the
// same legend the reader saw when the button was clicked.

// Vector layer: single color swatch + name

export function VectorLegendItem({
  layer, theme, still = false,
}: {
  layer: VectorLayerConfig
  theme: PlatformTheme
  /** Draws the swatch of a `pulse` layer without its sonar animation. */
  still?: boolean
}) {
  const pulsing = layer.pulse && !still
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        className={pulsing ? 'legend-sonar' : undefined}
        style={{
          width: 13,
          height: 13,
          borderRadius: layer.pulse ? '50%' : 3,
          flexShrink: 0,
          background: layer.color,
          border: `1px solid ${pulsing ? '#fff' : layer.color}`,
          color: layer.color,
        }}
      />
      <span
        style={{
          fontSize: 14.5,
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

export function RasterLegendItem({
  layer, theme, temporalDate,
}: {
  layer: RasterLayerConfig
  theme: PlatformTheme
  /** Temporal stop on the map; picks the year's data range. Undefined for a static layer. */
  temporalDate?: string
}) {
  const hasClasses = layer.classes && layer.classes.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* Layer name, uppercase eyebrow (handoff) */}
      <span
        style={{
          fontSize: 11.5,
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
            <span style={{ fontSize: 14, fontWeight: 500, color: theme.colors.text }}>{cls.label}</span>
          </div>
        ))}

      {/* Continuous: real palette gradient with min/max + unit */}
      {!hasClasses && layer.colorType === 'continuous' && layer.source !== 'dem' && (
        <ContinuousLegend layer={layer} theme={theme} temporalDate={temporalDate} />
      )}
    </div>
  )
}

// Continuous raster: gradient from the actual palette + min/max/unit

function ContinuousLegend({
  layer, theme, temporalDate,
}: {
  layer: RasterLayerConfig
  theme: PlatformTheme
  temporalDate?: string
}) {
  const palette = layer.gee?.visParams?.palette
  const min = layer.gee?.visParams?.min ?? layer.rescale?.[0]
  const max = layer.gee?.visParams?.max ?? layer.rescale?.[1]
  // The ends print the real extremes of the data; the bar keeps the color
  // stretch, so values past it share the end color.
  const real = dataRangeFor(layer.id, temporalDate)
  const low = real?.min ?? min
  const high = real?.max ?? max

  // Use the real raster palette so the bar matches the map; fall back to a
  // neutral accent gradient only when no palette is configured.
  const gradient =
    palette && palette.length > 0
      ? `linear-gradient(to right, ${palette.join(', ')})`
      : `linear-gradient(to right, ${theme.colors.accent}, ${theme.colors.text})`

  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

  const endStyle: CSSProperties = {
    fontSize: 11.5,
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
          <FluxEnd value={low!} theme={theme} format={fmt} align="left" />
          {layer.unit && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.colors.caption, textAlign: 'center' }}>
              {layer.unit}
            </span>
          )}
          <FluxEnd value={high!} theme={theme} format={fmt} align="right" />
        </div>
      ) : (
        (low != null || high != null || layer.unit) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 4,
              marginTop: 2,
            }}
          >
            <span style={endStyle}>{low != null ? fmt(low) : ''}</span>
            {layer.unit && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.colors.caption, textAlign: 'center' }}>
                {layer.unit}
              </span>
            )}
            <span style={endStyle}>{high != null ? fmt(high) : ''}</span>
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
      <span style={{ fontSize: 11.5, fontWeight: 700, color: ink, fontVariantNumeric: 'tabular-nums' }}>
        {format(flux.magnitude)}
      </span>
      {flux.noun && (
        <span style={{ fontSize: 11, fontWeight: 700, color: ink }}>{flux.noun}</span>
      )}
    </span>
  )
}

// Emissions layer: name, level and year, then its fixed classes. Over the biome
// the map is a single color, so the value itself is written out.

const intensidadeFmt = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 3 })

export function EmissionsLegendItem({
  layer, theme, temporalDate, layers, emissoes, layerErrors = {},
}: {
  layer: EmissionsLayerConfig
  theme: PlatformTheme
  temporalDate?: string
  layers: LayerConfig[]
  emissoes: Record<string, EmissoesEntry>
  /** Errors of the recortes, for the one the layer is drawn on. */
  layerErrors?: Record<string, string>
}) {
  const nivel = nivelEmissoes(layers)
  const erroRecorte = nivel ? layerErrors[nivel.recorte.id] : undefined
  const entry = emissoes[layer.id]
  const ano = anoEmissoes(layer, temporalDate)
  const payload = entry?.status === 'ready' ? entry.payload : null
  const valorBioma = payload && nivel?.nivel === 'bioma'
    ? payload.valores.bioma.bioma?.[payload.anos.indexOf(ano)]
    : undefined
  const caption = { fontSize: 11.5, fontWeight: 700, color: theme.colors.caption, lineHeight: 1.3 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 800,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: theme.colors.textDim,
          overflowWrap: 'anywhere',
          lineHeight: 1.4,
        }}
        title={layer.name}
      >
        {layer.name}
      </span>

      {!nivel ? (
        <span style={caption}>Ative Bioma Caatinga, Estados ou Municípios para ver este dado.</span>
      ) : erroRecorte ? (
        <span style={caption}>{erroRecorte}</span>
      ) : entry?.status === 'error' ? (
        <span style={caption}>Os valores não carregaram; desligue e ligue a camada para tentar de novo.</span>
      ) : !payload ? (
        <span style={{ ...caption, opacity: 0.75 }}>Carregando…</span>
      ) : (
        <>
          <span style={caption}>{nivel.recorte.name}, {ano}</span>
          {valorBioma != null && (
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.colors.text }}>
              {intensidadeFmt.format(valorBioma)} {layer.unit}
            </span>
          )}
          {rotulosClasses(payload.classes).map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 13, height: 13, borderRadius: 3, flexShrink: 0, background: payload.classes.cores[i] }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: theme.colors.text }}>{label}</span>
            </div>
          ))}
          <span style={{ fontSize: 12, color: theme.colors.textDim }}>{layer.unit}</span>
        </>
      )}
    </div>
  )
}
