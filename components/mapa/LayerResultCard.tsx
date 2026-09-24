'use client'

import dynamic from 'next/dynamic'
import { ErrorCard, SkeletonChart } from './StatsCards'
import FluxValue from './FluxValue'
import { IcChevronDown } from './icons'
import { currentAnalysisSeq, runLayerAnalysis } from '@/lib/mapa/analysisRunner'
import { resultSummary } from '@/lib/mapa/resultSummary'
import type {
  LayerResult, PlatformTheme, RasterLayerConfig, SelectedGeometry,
} from '@/types/mapa'

// Recharts stays out of the initial map bundle: only a card that actually
// opens a chart pulls it in.
const StatsChartView = dynamic(
  () => import('./StatsChart').then((m) => m.StatsChartView),
  { ssr: false, loading: () => null },
)

interface Props {
  layer:    RasterLayerConfig
  result:   LayerResult | undefined
  /** Temporal stop shown beside the layer name; undefined for a static layer. */
  date?:    string
  expanded: boolean
  onToggle: () => void
  theme:    PlatformTheme
  /** Geometry a retry re-measures, from the store. Null while nothing is selected. */
  geometry: SelectedGeometry | null
}

/**
 * One visible raster's result, collapsible.
 *
 * The header carries the whole answer -- layer, year and headline number -- so
 * three layers can be compared without opening three cards, which is the point
 * of the panel showing every active layer at all.
 */
export default function LayerResultCard({
  layer, result, date, expanded, onToggle, theme, geometry,
}: Props) {
  const c = theme.colors
  const summary = resultSummary(layer, result)
  const loading = !result || result.status === 'loading'

  return (
    <div style={{
      background: c.accentBg,
      border: `1px solid ${c.accentBd}`,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
      // The card sits in the panel's scrollable flex column. `overflow: hidden`
      // drops its automatic min-height to 0, so without this several expanded
      // cards would shrink to fit and clip their contents instead of letting
      // the panel scroll.
      flexShrink: 0,
    }}>
      <button
        className="ui-press"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '10px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-app), sans-serif',
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block',
            fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em',
            textTransform: 'uppercase', color: c.dim, overflowWrap: 'anywhere',
          }}>
            {layer.name}{date ? ` · ${date.slice(0, 4)}` : ''}
          </span>
          <span style={{
            display: 'block', marginTop: 3,
            fontSize: 15, fontWeight: 700, color: c.text,
            fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere',
          }}>
            {summary ?? (loading ? 'Calculando…' : '—')}
          </span>
        </span>
        <span style={{
          color: c.textDim, flexShrink: 0, marginTop: 2,
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform .15s',
        }}>
          <IcChevronDown size={14} />
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 12px' }}>
          {loading && <SkeletonChart theme={theme} />}

          {result?.status === 'error' && (
            <>
              <ErrorCard message={result.error ?? 'Falha ao calcular estatísticas.'} />
              {geometry && (
                <button
                  className="ui-press"
                  onClick={() => void runLayerAnalysis(layer, geometry, date, currentAnalysisSeq())}
                  style={{
                    marginTop: 8, width: '100%', height: 32,
                    background: 'transparent', border: `1px solid ${c.border}`,
                    borderRadius: 8, cursor: 'pointer', color: c.accentInk,
                    fontFamily: 'var(--font-app), sans-serif', fontSize: 12, fontWeight: 700,
                  }}
                >
                  Tentar novamente
                </button>
              )}
            </>
          )}

          {result?.status === 'ready' && result.pixelValue && (
            <div style={{ padding: '4px 0 8px' }}>
              {layer.signedFlux ? (
                <FluxValue
                  value={result.pixelValue.value}
                  unit={layer.unit}
                  theme={theme}
                  size={24}
                  format={(m) => m.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {result.pixelValue.color && (
                    <span style={{
                      width: 14, height: 14, borderRadius: 3,
                      background: result.pixelValue.color, flexShrink: 0,
                    }} />
                  )}
                  <span style={{
                    fontSize: 24, fontWeight: 800, color: c.text,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {result.pixelValue.value.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                  </span>
                  {result.pixelValue.label && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: c.dim }}>
                      {result.pixelValue.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {result?.status === 'ready' && result.stats && (
            // No caption: the card header already names the layer and the year.
            <StatsChartView
              theme={theme}
              stats={result.stats}
              classes={layer.classes}
              unit={layer.unit}
              signedFlux={layer.signedFlux}
            />
          )}

          {/* Point sampled over nodata: status is 'ready', but both pixelValue and
              stats are null. This is a real answer, not an error or loading state. */}
          {result?.status === 'ready' && !result.pixelValue && !result.stats && (
            <div style={{
              fontSize: 11.5, fontWeight: 600, color: c.dim,
            }}>
              Sem dado neste ponto.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
