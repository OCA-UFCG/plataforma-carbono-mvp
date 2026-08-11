'use client'

import { useEffect, useState } from 'react'
import {
  IcChevronDown, IcChevronUp, IcInfo, IcX, IcChevronLeft, IcSearch, IcGrip,
} from './icons'
import { useStore } from '@/lib/mapa/store'
import { normalizeSearch } from '@/lib/mapa/normalizeSearch'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { GROUPS, type GroupInfo } from '@/config/mapa/groups'
import type { LayerConfig, RasterLayerConfig, PlatformTheme } from '@/types/mapa'

interface Props {
  theme: PlatformTheme
  onCollapse: () => void
}

export default function Sidebar({ theme, onCollapse }: Props) {
  const layers = useStore((s) => s.layers)
  const [infoId, setInfoId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const normalizedQuery = normalizeSearch(query.trim())
  const matchesQuery = (layer: LayerConfig, q = normalizedQuery) => {
    if (!q) return true
    // Descrição e fonte saíram da lista, mas seguem sendo buscáveis: quem
    // procura por "MODIS" espera achar, mesmo sem a palavra aparecer na linha.
    const meta = LAYER_META[layer.id]
    return [layer.name, layer.type, meta?.description, meta?.source, meta?.kind]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizeSearch(value).includes(q))
  }
  const visiveis = layers.filter((l) => matchesQuery(l))
  const porGrupo = GROUPS
    .map((g) => ({ grupo: g, itens: visiveis.filter((l) => l.group === g.id) }))
    .filter((s) => s.itens.length > 0)
  const activeCount = layers.filter((l) => l.visible).length

  // Um card aberto por vez.
  const [abertoId, setAbertoId] = useState<string | null>(GROUPS[0]?.id ?? null)

  // Buscar leva ao primeiro grupo com resultado, senão a busca acharia camadas
  // que continuam escondidas em cards fechados. Isto acontece na digitação, e
  // não no render: derivar o card aberto a partir da busca travava o botão,
  // porque o clique mudava o estado e o render o descartava.
  const aoBuscar = (valor: string) => {
    setQuery(valor)
    const q = normalizeSearch(valor.trim())
    if (!q) return
    const primeiro = GROUPS.find((g) =>
      layers.some((l) => l.group === g.id && matchesQuery(l, q)),
    )
    setAbertoId(primeiro?.id ?? null)
  }

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
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <IcSearch size={15} color={c.textDim} style={{ position: 'absolute', left: 10, pointerEvents: 'none' }} />
            <input
              value={query}
              onChange={(event) => aoBuscar(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setQuery('')
              }}
              aria-label="Buscar camadas"
              placeholder="Buscar camadas"
              style={{ width: '100%', border: `1px solid ${c.border}`, borderRadius: 9, background: c.bgCard, color: c.text, font: 'inherit', fontSize: 12.5, padding: '8px 32px 8px 32px', outlineColor: c.accent }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Limpar busca de camadas"
                title="Limpar busca"
                style={{ position: 'absolute', right: 5, border: 'none', background: 'transparent', color: c.textDim, cursor: 'pointer', padding: 5, display: 'flex' }}
              >
                <IcX size={14} />
              </button>
            )}
          </div>
          {normalizedQuery && porGrupo.length === 0 ? (
            <div role="status" style={{ padding: '14px 4px', color: c.dim, fontSize: 12.5, textAlign: 'center' }}>
              Nenhuma camada encontrada.
            </div>
          ) : (
            porGrupo.map(({ grupo, itens }) => (
              <ThemeSection
                key={grupo.id}
                theme={theme}
                grupo={grupo}
                layers={itens}
                onInfo={setInfoId}
                open={abertoId === grupo.id}
                onToggle={() => setAbertoId((atual) => (atual === grupo.id ? null : grupo.id))}
              />
            ))
          )}
        </div>

      </div>

      {infoId && <LayerInfoCard theme={theme} layerId={infoId} narrow={narrow} onClose={() => setInfoId(null)} />}
    </div>
  )
}

// Section (accordion)

function ThemeSection({
  theme, grupo, layers, onInfo, open, onToggle,
}: {
  theme: PlatformTheme; grupo: GroupInfo
  layers: LayerConfig[]; onInfo: (id: string) => void
  open: boolean; onToggle: () => void
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const allLayers = useStore((s) => s.layers)
  const reorderLayer = useStore((s) => s.reorderLayer)
  const c = theme.colors

  const clearDrag = () => {
    setDraggingId(null)
    setDropIndex(null)
  }

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!draggingId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'

    const cards = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-layer-index]')]
    const nextCard = cards.find((card) =>
      event.clientY < card.getBoundingClientRect().top + card.offsetHeight / 2,
    )
    const nextIndex = nextCard
      ? Number(nextCard.dataset.layerIndex)
      : Number(cards.at(-1)?.dataset.layerIndex) + 1

    setDropIndex(nextIndex)
  }

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (draggingId && dropIndex !== null) reorderLayer(draggingId, dropIndex)
    clearDrag()
  }

  // Camada ligada dentro de card fechado sumiria de vista, então o número
  // aparece no cabeçalho.
  const ativas = layers.filter((l) => l.visible).length

  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '9px 11px', cursor: 'pointer', textAlign: 'left',
          // O fundo é a cor do grupo, discreta quando fechado e firme quando
          // aberto. É onde a foto entra depois.
          background: open ? `${grupo.color}22` : `${grupo.color}12`,
          border: `1px solid ${open ? `${grupo.color}66` : c.border}`,
          borderRadius: 11,
          transition: 'background .16s, border-color .16s',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 800, color: c.text, letterSpacing: '.01em', flex: 1, minWidth: 0 }}>
          {grupo.label}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: c.dim, background: c.mist, borderRadius: 999, padding: '1px 7px', flexShrink: 0 }}>
          {layers.length}
        </span>
        {ativas > 0 && (
          <span
            style={{
              fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0,
              background: grupo.color, borderRadius: 999, padding: '1px 7px',
            }}
          >
            {ativas} ativa{ativas === 1 ? '' : 's'}
          </span>
        )}
        <span style={{ color: c.textDim, display: 'flex', flexShrink: 0 }}>
          {open ? <IcChevronUp size={14} /> : <IcChevronDown size={14} />}
        </span>
      </button>
      {open && (
        <div
          onDragOver={onDragOver}
          onDrop={onDrop}
          // Recuo mais trilho na cor do grupo: sem isso as linhas de camada,
          // que também são caixas arredondadas, passam a leitura de que outros
          // cards abriram abaixo em vez de conteúdo do card aberto.
          style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            margin: '2px 0 10px 9px', paddingLeft: 11,
            borderLeft: `2px solid ${grupo.color}44`,
          }}
        >
          {layers.map((layer) => {
            const index = allLayers.findIndex((item) => item.id === layer.id)
            return (
              <div
                key={layer.id}
                data-layer-index={index}
                style={{ position: 'relative' }}
              >
                {dropIndex === index && <DropIndicator color={c.accent} />}
                <LayerRow
                  theme={theme}
                  layer={layer}
                  onInfo={onInfo}
                  onDragStart={(event) => {
                    if ((event.target as HTMLElement).closest('button, input, select, textarea, a')) {
                      event.preventDefault()
                      return
                    }
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', layer.id)
                    setDraggingId(layer.id)
                  }}
                  onDragEnd={clearDrag}
                />
                {dropIndex === index + 1 && <DropIndicator color={c.accent} bottom />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DropIndicator({ color, bottom = false }: { color: string; bottom?: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        [bottom ? 'bottom' : 'top']: -4,
        left: 4,
        right: 4,
        height: 3,
        borderRadius: 99,
        background: color,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  )
}

// Layer row (card)

function LayerRow({
  theme, layer, onInfo, onDragStart, onDragEnd,
}: {
  theme: PlatformTheme
  layer: LayerConfig
  onInfo: (id: string) => void
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}) {
  const toggleLayer     = useStore((s) => s.toggleLayer)
  const setOpacity      = useStore((s) => s.setOpacity)
  const clearLayerError = useStore((s) => s.clearLayerError)
  const isLoading       = useStore((s) => !!s.loadingLayers[layer.id])
  const errorMsg        = useStore((s) => s.layerErrors[layer.id])

  const c = theme.colors
  const unit = layer.type === 'raster' ? (layer as RasterLayerConfig).unit : undefined

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      // Peso visual menor que o do cabeçalho do card: sem borda e com raio
      // pequeno, para a lista ler como conteúdo e não como outro card.
      style={{
      background: layer.visible ? c.accentBg : 'transparent',
      border: `1px solid ${layer.visible ? c.accentBd : 'transparent'}`,
      borderRadius: 7, padding: '5px 7px', transition: 'background .15s, border-color .15s',
    }}>
      {/* Nome, unidade, ficha e chave, tudo numa linha. Descrição e fonte
          saíram: já estão na ficha, atrás do botão de informação. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          aria-hidden="true"
          title="Arraste para reordenar"
          style={{ color: c.caption, display: 'flex', flexShrink: 0, cursor: 'grab' }}
        >
          <IcGrip size={13} />
        </span>
        <span
          style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          title={layer.name}
        >
          {layer.name}
        </span>
        {unit && (
          <span style={{ fontSize: 9.5, fontWeight: 600, color: c.textDim, background: c.chip, borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {unit}
          </span>
        )}
        <button
          onClick={() => onInfo(layer.id)}
          aria-label={`Ficha da camada ${layer.name}`}
          style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 999, border: 'none', background: 'transparent', color: c.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          <IcInfo size={13} />
        </button>
        {isLoading ? (
          <span style={{ fontSize: 9, fontWeight: 700, color: c.dim, textTransform: 'uppercase', letterSpacing: '.06em', flexShrink: 0 }}>...</span>
        ) : (
          <button
            role="switch" aria-checked={layer.visible}
            aria-label={`${layer.visible ? 'Ocultar' : 'Exibir'} camada ${layer.name}`}
            onClick={() => toggleLayer(layer.id)}
            style={{ flexShrink: 0, width: 32, height: 18, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, position: 'relative', background: layer.visible ? c.accent : '#d8d5c9', transition: 'background .2s' }}
          >
            <span style={{ position: 'absolute', top: 2, left: 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'transform .2s', transform: layer.visible ? 'translateX(14px)' : 'translateX(0)' }} />
          </button>
        )}
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
