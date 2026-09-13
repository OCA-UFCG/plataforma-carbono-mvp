'use client'

import { StatsChartView } from '@/components/mapa/StatsChart'
import { formatarTc } from '@/components/mapa/StockReportView'
import ReportMapPreview from './ReportMapPreview'
import { classShares } from '@/lib/mapa/classShares'
import { numero } from '@/lib/mapa/format'
import { describeFlux } from '@/lib/mapa/carbonFlux'
import appConfig from '@/config/mapa/layers.json'
import type { PlatformTheme, RasterLayerConfig } from '@/types/mapa'
import type {
  ReportAnalysis,
  ReportAnalysisDescriptor,
  ReportRecorte,
} from '@/types/relatorio'

export interface ReportSectionProps {
  theme:        PlatformTheme
  index:        number
  recorte:      ReportRecorte
  descriptor:   ReportAnalysisDescriptor
  analysis:     ReportAnalysis | undefined
  pending:      boolean
  error:        string | null
  onRetry:      () => void
  mapSrc:       string | undefined
  mapActive:    boolean
  onMapCapture: (src: string | null) => void
}

function layerOf(layerId: string): RasterLayerConfig | undefined {
  return (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === layerId)
}

/**
 * Fixed pixel width for the yearly-series chart, replacing
 * `ResponsiveContainer`'s `ResizeObserver`-driven sizing (see the `width`
 * prop on `StatsChartViewProps` in `StatsChart.tsx`).
 *
 * Derived from the screen column, not the printed one, on purpose: sized to
 * the printed (wider, 180mm) column, a fixed-width SVG would overflow the
 * narrower on-screen preview, where nothing clips a horizontal overflow.
 * Sized to the screen column instead, print gets a chart that is a bit
 * narrower than the column it now has, with blank space to its right — a
 * layout that stays intact beats one that is full-width but sometimes
 * clipped or scrolled.
 *
 * `app/relatorio.css` puts this chart in a full-width block (not the
 * two-column `.report-visual-grid`), inside a 12px-padded, 1px-bordered
 * wrapper, inside a `CardBox` with 12px horizontal padding, inside
 * `.report-paper`, whose on-screen width is `min(100%, 180mm)` minus its own
 * 15mm side padding = 150mm, ~567px at 96dpi. 567 - 2*12 (block) - 2*1
 * (border) - 2*12 (CardBox) = 517.
 */
const REPORT_CHART_WIDTH = 517

/** The headline number of a section, or null when the shape has none. */
function heroValue(analysis: ReportAnalysis, layer?: RasterLayerConfig) {
  const snapshot = analysis.snapshot
  if (!snapshot) return null

  if (snapshot.kind === 'stocks') {
    // Same scaling StockReportView's own card uses for this exact number, so
    // the hero and the doughnut section below it agree (`12,3 Mt C`, not
    // `12,3 Mt C` beside a raw `12.345.678 t C`).
    const { valor, unidade } = formatarTc(snapshot.report.totalTc)
    return { label: 'Estoque total', value: `${valor} ${unidade}` }
  }
  if (snapshot.kind === 'categorical') {
    const dominant = classShares(snapshot.areas, layer?.classes ?? [])[0]
    return dominant
      ? { label: dominant.label, value: `${numero(dominant.share)}%` }
      : null
  }
  if (snapshot.kind === 'continuous') {
    const unit = analysis.unit ? ` ${analysis.unit}` : ''
    if (analysis.signedFlux) {
      // The sign leaves and the direction becomes a word, as the panel does.
      const flux = describeFlux(snapshot.stats.mean)
      return { label: flux.label || 'Média', value: `${numero(flux.magnitude, 2)}${unit}` }
    }
    return { label: 'Média', value: `${numero(snapshot.stats.mean)}${unit}` }
  }
  return null
}

export default function ReportSection({
  theme, index, recorte, descriptor, analysis, pending, error, onRetry,
  mapSrc, mapActive, onMapCapture,
}: ReportSectionProps) {
  const layer = layerOf(descriptor.layerId)
  const c = theme.colors
  const year = descriptor.effectiveYear ?? descriptor.requestedYear
  const hero = analysis ? heroValue(analysis, layer) : null
  /**
   * The stock report is a two-axis breakdown — by pool and by fitofisionomia,
   * each a doughnut with its own legend — so it takes the full width instead of
   * sharing the row with the map. At half the content column the legend labels
   * are cut to about thirteen characters, and the map's own cell is mostly
   * empty anyway because its frame is a fixed height. The other snapshot kinds
   * are a bar list or a numeric grid and read fine beside the map.
   *
   * Dropping the class rather than overriding `grid-template-columns` inline:
   * the print rule in `app/relatorio.css` carries `!important`, which a normal
   * inline declaration cannot beat, so the two-column layout would come back on
   * paper only.
   */
  const stackedVisuals = analysis?.snapshot?.kind === 'stocks'

  return (
    <section className="report-section">
      <h2
        style={{
          margin: 0, padding: '10px 20px', fontSize: 20, fontWeight: 700,
          color: '#ffffff', background: descriptor.sectionColor,
        }}
      >
        {index + 1}. {descriptor.name}
      </h2>

      {pending && !analysis && (
        <p className="report-block" style={{ padding: 20, color: c.textDim }}>
          Calculando esta análise no Earth Engine…
        </p>
      )}

      {error && !analysis && (
        <div className="report-block" style={{ padding: 20, border: `1px solid ${c.border}` }}>
          <p style={{ margin: 0, fontWeight: 700, color: c.text }}>
            Não foi possível carregar esta análise.
          </p>
          <p style={{ margin: '4px 0 0', color: c.textDim }}>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="report-no-print"
            style={{
              marginTop: 12, padding: '6px 14px', cursor: 'pointer',
              color: c.onAccent, background: c.accent,
              border: 'none', borderRadius: 4, font: 'inherit',
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {analysis && analysis.status !== 'available' && (
        <div className="report-block" style={{ padding: 20, border: `1px solid ${c.border}` }}>
          <p style={{ margin: 0, fontWeight: 700, color: c.text }}>
            {analysis.status === 'year_not_found'
              ? `Esta camada não tem dados para ${descriptor.requestedYear}.`
              : 'Esta análise não está disponível.'}
          </p>
          {analysis.availableYears.length > 0 && (
            <p style={{ margin: '4px 0 0', color: c.textDim }}>
              Anos disponíveis: {analysis.availableYears.join(', ')}.
            </p>
          )}
        </div>
      )}

      {analysis?.status === 'available' && (
        <>
          <div
            className="report-block"
            style={{
              display: 'grid', gridTemplateColumns: hero ? '1fr 210px' : '1fr',
              marginTop: 20, border: `1px solid ${c.border}`,
            }}
          >
            <div style={{ padding: 20 }}>
              <p style={{ margin: 0, fontWeight: 700, color: c.text }}>
                Situação{' '}
                <span style={{ fontWeight: 400, color: c.textDim }}>
                  {recorte.featureName}
                </span>
              </p>
              {analysis.narrative.situation && (
                <p style={{ margin: '8px 0 0', textAlign: 'justify', color: c.body }}>
                  {analysis.narrative.situation}
                </p>
              )}
              <dl
                style={{
                  display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr',
                  margin: '16px 0 0', paddingTop: 12,
                  borderTop: `1px solid ${c.border}`, fontSize: 13,
                }}
              >
                <div>
                  <dt style={{ fontWeight: 700, color: c.textDim }}>Ano analisado</dt>
                  <dd style={{ margin: 0 }}>{year ?? 'sem série temporal'}</dd>
                </div>
                <div>
                  <dt style={{ fontWeight: 700, color: c.textDim }}>Série disponível</dt>
                  <dd style={{ margin: 0 }}>
                    {analysis.series.length > 1
                      ? `${analysis.series[0].date.slice(0, 4)}–${analysis.series[analysis.series.length - 1].date.slice(0, 4)}`
                      : descriptor.seriesExpected
                        ? 'não foi possível calcular'
                        : 'não se aplica'}
                  </dd>
                </div>
              </dl>
            </div>
            {hero && (
              <div
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '24px 16px', textAlign: 'center',
                  color: c.onAccent, background: descriptor.sectionColor,
                }}
              >
                <strong style={{ fontSize: 15 }}>{hero.label}</strong>
                <span style={{ marginTop: 6, fontSize: 26, fontWeight: 700 }}>{hero.value}</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            <h3 className="report-heading" style={{ margin: 0, fontSize: 16, color: c.textDim }}>
              Retrato espacial e distribuição
            </h3>
            <div
              className={stackedVisuals ? undefined : 'report-visual-grid'}
              style={{ marginTop: 10, border: `1px solid ${c.border}` }}
            >
              {/* A flex column so the map sits centred in whatever height the
                  neighbouring panel imposes. The frame is a fixed 300px and the
                  statistics beside it vary with the layer, so the leftover
                  splits above and below instead of hanging under the map. */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  ...(stackedVisuals
                    ? { borderBottom: `1px solid ${c.border}` }
                    : { borderRight: `1px solid ${c.border}` }),
                }}
              >
                <div
                  style={{
                    padding: '8px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600,
                    color: c.textDim, background: c.mist, borderBottom: `1px solid ${c.border}`,
                  }}
                >
                  {year ? `Imagem de ${year}` : 'Imagem da camada'}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <ReportMapPreview
                    layerId={descriptor.layerId}
                    bbox={recorte.bbox}
                    year={descriptor.effectiveYear}
                    active={mapActive}
                    imageSrc={mapSrc}
                    onCapture={onMapCapture}
                  />
                </div>
              </div>
              <div>
                <div
                  style={{
                    padding: '8px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600,
                    color: c.textDim, background: c.mist, borderBottom: `1px solid ${c.border}`,
                  }}
                >
                  Distribuição sobre {recorte.featureName}
                </div>
                <div style={{ padding: 12 }}>
                  <StatsChartView
                    theme={theme}
                    stats={analysis.snapshot!}
                    classes={layer?.classes}
                    unit={analysis.unit}
                    signedFlux={analysis.signedFlux}
                  />
                </div>
              </div>
            </div>
          </div>

          {analysis.series.length > 1 && (
            <div style={{ marginTop: 24 }}>
              <h3 className="report-heading" style={{ margin: 0, fontSize: 16, color: c.textDim }}>
                Série histórica
              </h3>
              <div style={{ marginTop: 10, padding: 12, border: `1px solid ${c.border}` }}>
                {/* The yearly series is fed to the same component as a
                    `timeseries` result, which it already knows how to draw. */}
                <StatsChartView
                  theme={theme}
                  stats={{ kind: 'timeseries', series: analysis.series }}
                  unit={analysis.unit}
                  signedFlux={analysis.signedFlux}
                  // Printing with animation on comes out blank: recharts
                  // animates by mutating SVG attributes from JS, which a
                  // print stylesheet cannot interrupt.
                  animate={false}
                  // A fixed size instead of `ResponsiveContainer`: the content
                  // column is ~150mm on screen and 180mm in print, a 20%
                  // change a `ResizeObserver` does not reliably pick up before
                  // the print snapshot.
                  width={REPORT_CHART_WIDTH}
                />
              </div>
            </div>
          )}

          {(analysis.narrative.trend || analysis.narrative.context) && (
            <div
              className="report-block"
              style={{ marginTop: 20, padding: 20, border: `1px solid ${c.border}` }}
            >
              <h3 className="report-heading" style={{ margin: 0, fontSize: 15, color: c.textDim }}>
                Leitura histórica
              </h3>
              {analysis.narrative.trend && (
                <p style={{ margin: '10px 0 0', textAlign: 'justify', color: c.body }}>
                  <strong>Tendência recente:</strong> {analysis.narrative.trend}
                </p>
              )}
              {analysis.narrative.context && (
                <p style={{ margin: '10px 0 0', textAlign: 'justify', color: c.body }}>
                  <strong>Contexto da série:</strong> {analysis.narrative.context}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
