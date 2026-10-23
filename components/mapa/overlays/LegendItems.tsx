import type { CSSProperties } from 'react'
import { describeFlux, fluxInk, zeroPosition } from '@/lib/mapa/carbonFlux'
import { dataRangeFor } from '@/lib/mapa/dataRange'
import { choroplethPending, choroplethView, type ChoroplethEntry, type ChoroplethRange } from '@/lib/mapa/choropleth'
import type { LayerConfig, PlatformTheme, VectorLayerConfig, RasterLayerConfig } from '@/types/mapa'

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
  layer, theme, temporalDate, layers = [], choropleths = {},
}: {
  layer: RasterLayerConfig
  theme: PlatformTheme
  /** Temporal stop on the map; picks the year's data range. Undefined for a static layer. */
  temporalDate?: string
  /** The layers on the map and the values by feature, to tell whether this layer is drawn by feature. */
  layers?: LayerConfig[]
  choropleths?: Record<string, ChoroplethEntry>
}) {
  const hasClasses = layer.classes && layer.classes.length > 0
  // The same rule MapView draws with, so the legend describes the map on screen.
  const view = choroplethView(layers, layer, choropleths, temporalDate)
  // Said from the moment the recorte is on: the values take a few seconds,
  // and until they land the bar below still describes the pixels.
  const pending = view ? null : choroplethPending(layers, layer, choropleths)

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

      {(view || pending) && (
        <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.colors.caption, lineHeight: 1.3, opacity: view ? 1 : 0.75 }}>
          {view
            ? view.caption
            : `Calculando ${pending!.charAt(0).toLowerCase()}${pending!.slice(1)}…`}
        </span>
      )}

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
        <ContinuousLegend layer={layer} theme={theme} temporalDate={temporalDate} range={view?.range ?? null} />
      )}
    </div>
  )
}

// Continuous raster: gradient from the actual palette + min/max/unit

function ContinuousLegend({
  layer, theme, temporalDate, range,
}: {
  layer: RasterLayerConfig
  theme: PlatformTheme
  temporalDate?: string
  /** The map by feature's range, when the layer is drawn by feature. */
  range: ChoroplethRange | null
}) {
  const palette = layer.gee?.visParams?.palette
  const min = range?.min ?? layer.gee?.visParams?.min ?? layer.rescale?.[0]
  const max = range?.max ?? layer.gee?.visParams?.max ?? layer.rescale?.[1]
  // Drawn by feature, the bar runs over the features' values and its ends say
  // so. In pixels, the ends print the real extremes of the data while the bar
  // keeps the color stretch, so values past it share the end color.
  const real = range ? null : dataRangeFor(layer.id, temporalDate)
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
