'use client'

import { useStore } from '@/lib/mapa/store'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { IcX } from './icons'
import type { LayerConfig, RasterLayerConfig, PlatformTheme } from '@/types/mapa'

/** Width of the ficha column. Mapa.tsx adds this to `leftEdge` while the ficha
 *  is open, which is what steps the left cluster aside instead of letting it
 *  overlap; the two numbers must stay in sync. */
export const FICHA_WIDTH = 340

/**
 * The layer sheet: a sibling panel of Temas, not a popover over it. It renders
 * from Mapa.tsx rather than from inside Sidebar, so it is not trapped in the
 * panel root's stacking context, and the space it occupies is reserved through
 * `leftEdge` rather than contested.
 *
 * Below 768px there is no room for a second column, so it stays an overlay over
 * the drawer -- which already covers the map on its own.
 */
export default function LayerInfoCard({
  theme, layerId, narrow, leftEdge, onClose,
}: {
  theme: PlatformTheme
  layerId: string
  narrow: boolean
  /** Left edge of the cluster, WITHOUT the ficha's own width. */
  leftEdge: number
  onClose: () => void
}) {
  const layers = useStore((s) => s.layers)
  const toggleLayer = useStore((s) => s.toggleLayer)
  const layer = layers.find((l: LayerConfig) => l.id === layerId)
  const c = theme.colors
  if (!layer) return null
  const meta = LAYER_META[layerId]
  const raster = layer.type === 'raster' ? (layer as RasterLayerConfig) : null
  const palette = raster?.gee?.visParams?.palette
  const rescale = raster?.rescale

  return (
    <div
      // Fades in over the same .3s the cluster takes to slide away, so the two
      // never occupy the same pixels, not even mid-animation.
      className="ficha-in"
      style={{
        position: 'absolute', top: 16, zIndex: 16,
        ...(narrow
          ? { left: 8, width: 'calc(100vw - 16px)' }
          : { left: leftEdge + 12, width: FICHA_WIDTH }),
        maxHeight: 'calc(100% - 32px)', overflowY: 'auto',
        background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, boxShadow: 'var(--sh-pop)',
        padding: 16,
        fontFamily: 'var(--font-app), sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {meta && <span style={{ fontSize: 11.5, fontWeight: 700, color: c.dim, background: c.mist, borderRadius: 5, padding: '2px 8px' }}>{meta.kind}</span>}
        {layer.visible && <span style={{ fontSize: 11.5, fontWeight: 700, color: c.accentInk, background: c.accentBg, borderRadius: 5, padding: '2px 8px' }}>Ativa</span>}
        <button onClick={onClose} aria-label="Fechar ficha" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: c.textDim, padding: 2, display: 'flex' }}><IcX size={15} /></button>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: c.text, lineHeight: 1.2 }}>{layer.name}</div>
      {meta && <div style={{ fontSize: 13, fontWeight: 700, color: c.dim, marginTop: 2 }}>{meta.source}</div>}
      {meta && <p style={{ fontSize: 14.5, fontWeight: 400, color: c.body, lineHeight: 1.6, margin: '10px 0 0' }}>{meta.description[0].toUpperCase() + meta.description.slice(1)}.</p>}

      {/* legenda */}
      {raster && raster.colorType === 'continuous' && palette && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', color: c.caption, textTransform: 'uppercase', marginBottom: 6 }}>Legenda</div>
          <div style={{ height: 10, borderRadius: 3, background: `linear-gradient(90deg, ${palette.join(', ')})` }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 11.5, color: c.dim, fontVariantNumeric: 'tabular-nums' }}>
            <span>{rescale ? rescale[0] : ''}</span>
            <span>{raster.unit}</span>
            <span>{rescale ? rescale[1] : ''}</span>
          </div>
        </div>
      )}
      {raster && raster.colorType === 'categorical' && raster.classes && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', color: c.caption, textTransform: 'uppercase', marginBottom: 6 }}>Classes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 10px', maxHeight: 180, overflowY: 'auto' }}>
            {raster.classes.slice(0, 30).map((cl) => (
              <div key={cl.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: cl.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: c.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cl.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => toggleLayer(layer.id)}
        className="ui-press"
        style={{ marginTop: 16, width: '100%', background: layer.visible ? c.mist : c.accent, color: layer.visible ? c.text : '#fff', border: 'none', borderRadius: 999, padding: '9px 0', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}
      >
        {layer.visible ? 'Desativar camada' : 'Ativar camada'}
      </button>
    </div>
  )
}
