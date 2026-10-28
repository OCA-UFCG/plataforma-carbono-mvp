import { describeFlux, fluxInk, zeroPosition } from '@/lib/mapa/carbonFlux'
import { dataRangeFor } from '@/lib/mapa/dataRange'
import { anoEmissoes, nivelEmissoes, rotulosClasses, type EmissoesEntry } from '@/lib/emissoes/mapa'
import type { EmissionsLayerConfig, LayerConfig, PlatformTheme, VectorLayerConfig, RasterLayerConfig } from '@/types/mapa'
import styles from './LegendItems.module.css'

// Legend entries shared by the floating legend and the JPEG's sheet. They take
// everything from props, store included, so the off-screen sheet renders the
// same legend the reader saw when the button was clicked.

// Vector layer: single color swatch + name

export function VectorLegendItem({
  layer, still = false,
}: {
  layer: VectorLayerConfig
  theme: PlatformTheme
  /** Draws the swatch of a `pulse` layer without its sonar animation. */
  still?: boolean
}) {
  const pulsing = layer.pulse && !still
  return (
    <div className={styles.row}>
      <span
        className={`${styles.swatch} ${layer.pulse ? styles.point : ''} ${pulsing ? 'legend-sonar' : ''}`}
        style={{
          background: layer.color,
          border: `1px solid ${pulsing ? '#fff' : layer.color}`,
          color: layer.color,
        }}
      />
      <span className={`${styles.label} text-ui-badge`} title={layer.name}>{layer.name}</span>
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
    <div className={styles.item}>
      <span className={`${styles.label} text-ui-badge`} title={layer.name}>{layer.name}</span>

      {/* Categorical classes */}
      {hasClasses &&
        layer.classes!.map((cls) => (
          <div key={cls.value} className={styles.row}>
            <span className={styles.swatch} style={{ background: cls.color }} />
            <span className={`${styles.label} text-ui-badge`}>{cls.label}</span>
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

  // A signed flux crosses zero somewhere along the bar, and that crossing is
  // the whole reading: left of it the area removed carbon, right of it it
  // emitted. So the ends lose the minus sign and name their direction, and a
  // tick marks the equilibrium. The fraction is computed from min/max rather
  // than hardcoded at the middle, because the calibrated range is asymmetric
  // (-100 to 300 puts zero at a quarter of the way).
  const signed = layer.signedFlux === true && min != null && max != null
  const zero = signed ? zeroPosition(min, max) : null

  return (
    <>
      <div className={styles.ramp} style={{ background: gradient }}>
        {zero !== null && (
          <span
            aria-hidden
            title="Equilíbrio: nem emissão nem sequestro"
            className={styles.zero}
            style={{ left: `${zero * 100}%` }}
          />
        )}
      </div>
      {signed ? (
        <div className={`${styles.ends} text-ui-badge`}>
          <FluxEnd value={low!} theme={theme} format={fmt} align="left" />
          {layer.unit && <span className={styles.unit}>{layer.unit}</span>}
          <FluxEnd value={high!} theme={theme} format={fmt} align="right" />
        </div>
      ) : (
        (low != null || high != null || layer.unit) && (
          <div className={`${styles.ends} text-ui-badge`}>
            <span>{low != null ? fmt(low) : ''}</span>
            {layer.unit && <span className={styles.unit}>{layer.unit}</span>}
            <span>{high != null ? fmt(high) : ''}</span>
          </div>
        )
      )}
    </>
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
    <span className={styles.fluxEnd} data-align={align} style={{ color: ink }}>
      <span>{format(flux.magnitude)}</span>
      {flux.noun && <span>{flux.noun}</span>}
    </span>
  )
}

// Emissions layer: name, level and year, then its fixed classes. Over the biome
// the map is a single color, so the value itself is written out.

const intensidadeFmt = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 3 })

export function EmissionsLegendItem({
  layer, temporalDate, layers, emissoes, layerErrors = {},
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
  const note = `${styles.note} text-ui-badge`

  return (
    <div className={styles.item}>
      <span className={`${styles.label} text-ui-badge`} title={layer.name}>{layer.name}</span>

      {!nivel ? (
        <span className={note}>Ative Bioma Caatinga, Estados ou Municípios para ver este dado.</span>
      ) : erroRecorte ? (
        <span className={note}>{erroRecorte}</span>
      ) : entry?.status === 'error' ? (
        <span className={note}>Os valores não carregaram; desligue e ligue a camada para tentar de novo.</span>
      ) : !payload ? (
        <span className={note}>Carregando…</span>
      ) : (
        <>
          <span className={note}>{nivel.recorte.name}, {ano}</span>
          {valorBioma != null && (
            <span className={`${styles.value} text-p-ui-semibold`}>
              {intensidadeFmt.format(valorBioma)} {layer.unit}
            </span>
          )}
          {rotulosClasses(payload.classes).map((label, i) => (
            <div key={i} className={styles.row}>
              <span className={styles.swatch} style={{ background: payload.classes.cores[i] }} />
              <span className={`${styles.label} text-ui-badge`}>{label}</span>
            </div>
          ))}
          <span className={note}>{layer.unit}</span>
        </>
      )}
    </div>
  )
}
