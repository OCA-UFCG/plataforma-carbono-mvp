'use client'

import { useEffect, useState } from 'react'
import {
  IcLayers, IcBox, IcChevronDown, IcChevronUp, IcInfo, IcX, IcChevronLeft,
} from './icons'
import { useStore } from '@/lib/plataforma/store'
import { LAYER_META } from '@/config/plataforma/layerMeta'
import { resolveMonth, PHASES } from '@/lib/phenology'
import type { LayerConfig, RasterLayerConfig, PlatformTheme } from '@/types/plataforma'

interface Props {
  theme: PlatformTheme
  onCollapse: () => void
}

export default function Sidebar({ theme, onCollapse }: Props) {
  const layers = useStore((s) => s.layers)
  const monthPref = useStore((s) => s.month)
  const [infoId, setInfoId] = useState<string | null>(null)

  const vectors = layers.filter((l) => l.type === 'vector')
  const rasters = layers.filter((l) => l.type === 'raster')
  const activeCount = layers.filter((l) => l.visible).length
  const month = resolveMonth(monthPref)

  const c = theme.colors

  // Below 768px the panel becomes an edge-to-edge left drawer.
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div
      style={{
        position: 'absolute', zIndex: 10, display: 'flex',
        ...(narrow
          ? { top: 0, left: 0, bottom: 0, width: 'min(320px, 88vw)', maxHeight: '100%' }
          : { top: 16, left: 16, width: 332, maxHeight: 'calc(100% - 32px)' }),
        fontFamily: 'var(--font-app), sans-serif',
      }}
    >
      {/* Panel chrome, overflow:hidden clips the rounded corners; the ficha
          popover renders OUTSIDE this box so it isn't clipped. */}
      <div
        style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          background: c.glassBg, backdropFilter: 'blur(11px)', WebkitBackdropFilter: 'blur(11px)',
          border: `1px solid ${c.glassBd}`, boxShadow: 'var(--sh-panel)',
          borderRadius: narrow ? '0 16px 16px 0' : 16,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: `1px solid ${c.border}`, flex: 'none' }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: c.dim, textTransform: 'uppercase' }}>Temas</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: c.accentInk, background: c.accentBg, borderRadius: 999, padding: '2px 8px' }}>
            {activeCount} ativa{activeCount === 1 ? '' : 's'}
          </span>
          <button onClick={onCollapse} aria-label="Recolher painel" title="Recolher"
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: c.textDim, padding: 4, display: 'flex' }}>
            <IcChevronLeft size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ThemeSection theme={theme} title="Recortes territoriais" count={vectors.length}
            icon={<IcBox size={15} />} iconColor="#5f7030" layers={vectors} onInfo={setInfoId} defaultOpen />
          <ThemeSection theme={theme} title="Carbono e ambiente" count={rasters.length}
            icon={<IcLayers size={15} />} iconColor={c.terracota} layers={rasters} onInfo={setInfoId} defaultOpen />
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${c.border}`, flex: 'none' }}>
          <div style={{ fontSize: 10.5, fontWeight: 500, color: c.dim, lineHeight: 1.5 }}>
            Mês da interface: <strong style={{ color: c.text, fontWeight: 700 }}>{month.label}</strong>, {PHASES[month.phase].label.toLowerCase()}. As cores acompanham a variação sazonal do bioma, e a dos próprios dados.
          </div>
        </div>
      </div>

      {infoId && <LayerInfoCard theme={theme} layerId={infoId} narrow={narrow} onClose={() => setInfoId(null)} />}
    </div>
  )
}

// Section (accordion)

function ThemeSection({
  theme, title, count, icon, iconColor, layers, onInfo, defaultOpen,
}: {
  theme: PlatformTheme; title: string; count: number; icon: React.ReactNode; iconColor: string
  layers: LayerConfig[]; onInfo: (id: string) => void; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  const c = theme.colors
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ color: iconColor, display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: c.text, letterSpacing: '.02em' }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: c.dim, background: c.mist, borderRadius: 999, padding: '1px 7px' }}>{count}</span>
        <span style={{ marginLeft: 'auto', color: c.textDim, display: 'flex' }}>{open ? <IcChevronUp size={14} /> : <IcChevronDown size={14} />}</span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 7 }}>
          {layers.map((l) => <LayerRow key={l.id} theme={theme} layer={l} onInfo={onInfo} />)}
        </div>
      )}
    </div>
  )
}

// Layer row (card)

function LayerRow({ theme, layer, onInfo }: { theme: PlatformTheme; layer: LayerConfig; onInfo: (id: string) => void }) {
  const toggleLayer     = useStore((s) => s.toggleLayer)
  const setOpacity      = useStore((s) => s.setOpacity)
  const clearLayerError = useStore((s) => s.clearLayerError)
  const isLoading       = useStore((s) => !!s.loadingLayers[layer.id])
  const errorMsg        = useStore((s) => s.layerErrors[layer.id])

  const c = theme.colors
  const meta = LAYER_META[layer.id]
  const unit = layer.type === 'raster' ? (layer as RasterLayerConfig).unit : undefined

  return (
    <div style={{
      background: layer.visible ? c.accentBg : c.bgCard,
      border: `1px solid ${layer.visible ? c.accentBd : c.border}`,
      borderRadius: 11, padding: '9px 10px', transition: 'background .15s, border-color .15s',
    }}>
      {/* line 1: name + description + toggle */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={layer.name}>{layer.name}</div>
          {meta && <div style={{ fontSize: 11.5, fontWeight: 500, color: c.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.description}</div>}
        </div>
        {isLoading ? (
          <span style={{ fontSize: 9.5, fontWeight: 700, color: c.dim, textTransform: 'uppercase', letterSpacing: '.06em', flexShrink: 0, paddingTop: 4 }}>carregando...</span>
        ) : (
          <button
            role="switch" aria-checked={layer.visible}
            aria-label={`${layer.visible ? 'Ocultar' : 'Exibir'} camada ${layer.name}`}
            onClick={() => toggleLayer(layer.id)}
            style={{ flexShrink: 0, width: 36, height: 21, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, position: 'relative', background: layer.visible ? c.accent : '#d8d5c9', transition: 'background .2s' }}
          >
            <span style={{ position: 'absolute', top: 2, left: 2, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: 'transform .2s', transform: layer.visible ? 'translateX(15px)' : 'translateX(0)' }} />
          </button>
        )}
      </div>

      {/* line 2: source chip + unit chip + info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
        {meta && <span style={{ fontSize: 10, fontWeight: 600, color: c.textDim, background: c.chip, borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap' }}>{meta.source}</span>}
        {unit && <span style={{ fontSize: 10, fontWeight: 600, color: c.accentInk, background: c.accentBg, borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap' }}>{unit}</span>}
        <button
          onClick={() => onInfo(layer.id)}
          aria-label={`Ficha da camada ${layer.name}`}
          style={{ marginLeft: 'auto', flexShrink: 0, width: 24, height: 24, borderRadius: 999, border: `1px solid ${c.border}`, background: 'transparent', color: c.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <IcInfo size={13} />
        </button>
      </div>

      {/* error */}
      {errorMsg && (
        <div style={{ marginTop: 7, background: '#fee2e2', color: '#b91c1c', borderRadius: 6, padding: '6px 8px', fontSize: 10, display: 'flex', gap: 6 }}>
          <span style={{ flex: 1, wordBreak: 'break-word' }}>{errorMsg}</span>
          <button onClick={() => clearLayerError(layer.id)} title="Dispensar" aria-label="Dispensar erro" style={{ background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex' }}><IcX size={12} /></button>
        </div>
      )}

      {/* opacity */}
      {layer.visible && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 10, color: c.dim, flexShrink: 0 }}>Opacidade</span>
          <input type="range" min={0} max={100} value={layer.opacity}
            aria-label={`Opacidade de ${layer.name}`}
            onChange={(e) => setOpacity(layer.id, Number(e.target.value))}
            style={{ flex: 1, height: 3, accentColor: c.accent, cursor: 'pointer' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: c.accentInk, width: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{layer.opacity}%</span>
        </div>
      )}
    </div>
  )
}

// Layer info card (ficha)

function LayerInfoCard({ theme, layerId, narrow, onClose }: { theme: PlatformTheme; layerId: string; narrow: boolean; onClose: () => void }) {
  const layers = useStore((s) => s.layers)
  const toggleLayer = useStore((s) => s.toggleLayer)
  const layer = layers.find((l) => l.id === layerId)
  const c = theme.colors
  if (!layer) return null
  const meta = LAYER_META[layerId]
  const raster = layer.type === 'raster' ? (layer as RasterLayerConfig) : null
  const palette = raster?.gee?.visParams?.palette
  const rescale = raster?.rescale

  return (
    <div
      style={{
        position: 'absolute', top: 12,
        // Desktop: anchored to the right edge of the panel, clamped so it never
        // reaches the Results panel. Narrow: overlays the drawer.
        ...(narrow
          ? { left: 8, width: 'calc(100vw - 16px)' }
          : { left: 'calc(100% + 12px)', width: 340, minWidth: 280, maxWidth: 'calc(100vw - 420px)' }),
        background: theme.colors.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, boxShadow: 'var(--sh-pop)',
        padding: 16, zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {meta && <span style={{ fontSize: 10, fontWeight: 700, color: c.dim, background: c.mist, borderRadius: 5, padding: '2px 8px' }}>{meta.kind}</span>}
        {layer.visible && <span style={{ fontSize: 10, fontWeight: 700, color: c.accentInk, background: c.accentBg, borderRadius: 5, padding: '2px 8px' }}>Ativa</span>}
        <button onClick={onClose} aria-label="Fechar ficha" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: c.textDim, padding: 2, display: 'flex' }}><IcX size={15} /></button>
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: c.text, lineHeight: 1.2 }}>{layer.name}</div>
      {meta && <div style={{ fontSize: 11.5, fontWeight: 700, color: c.dim, marginTop: 2 }}>{meta.source}</div>}
      {meta && <p style={{ fontSize: 13, fontWeight: 400, color: c.body, lineHeight: 1.6, margin: '10px 0 0' }}>{meta.description[0].toUpperCase() + meta.description.slice(1)}.</p>}

      {/* legenda */}
      {raster && raster.colorType === 'continuous' && palette && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: c.caption, textTransform: 'uppercase', marginBottom: 6 }}>Legenda</div>
          <div style={{ height: 10, borderRadius: 3, background: `linear-gradient(90deg, ${palette.join(', ')})` }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 10, color: c.dim, fontVariantNumeric: 'tabular-nums' }}>
            <span>{rescale ? rescale[0] : ''}</span>
            <span>{raster.unit}</span>
            <span>{rescale ? rescale[1] : ''}</span>
          </div>
        </div>
      )}
      {raster && raster.colorType === 'categorical' && raster.classes && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: c.caption, textTransform: 'uppercase', marginBottom: 6 }}>Classes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 10px', maxHeight: 180, overflowY: 'auto' }}>
            {raster.classes.slice(0, 30).map((cl) => (
              <div key={cl.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: cl.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, color: c.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cl.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => toggleLayer(layer.id)}
        className="ui-press"
        style={{ marginTop: 16, width: '100%', background: layer.visible ? c.mist : c.accent, color: layer.visible ? c.text : '#fff', border: 'none', borderRadius: 999, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
      >
        {layer.visible ? 'Desativar camada' : 'Ativar camada'}
      </button>
    </div>
  )
}
