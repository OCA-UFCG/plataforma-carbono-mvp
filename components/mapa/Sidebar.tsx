'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  IcChevronDown, IcChevronUp, IcInfo, IcX, IcChevronLeft, IcSearch, IcGrip,
} from './icons'
import { useStore } from '@/lib/mapa/store'
import { orderThemes } from '@/lib/mapa/layerOrder'
import { keepSlot, slotBefore, type DropSlot } from '@/lib/mapa/dropSlot'
import { normalizeSearch } from '@/lib/mapa/normalizeSearch'
import { layerKindLabel, layerMetaText } from '@/config/mapa/layerMeta'
import { localizedThemes, TERRITORY_THEME_ID, type SubthemeInfo, type ThemeInfo } from '@/config/mapa/groups'
import { layerName, layerUnit, storedText } from '@/lib/mapa/text'
import { useMapaText } from '@/lib/mapa/useMapaText'
import type { LayerConfig, RasterLayerConfig, PlatformTheme } from '@/types/mapa'

interface Props {
  theme: PlatformTheme
  /** Open ficha, owned by Mapa.tsx: only it can widen `leftEdge` to reserve the
   *  column the ficha occupies. Toggling is the caller's business too. */
  infoId: string | null
  onInfo: (id: string) => void
  onCollapse: () => void
}

export default function Sidebar({ theme, infoId, onInfo, onCollapse }: Props) {
  const t = useTranslations('MapaUiSidebar')
  const tx = useMapaText()
  // The panel navigation with every label in the user's language.
  const themes = useMemo(() => localizedThemes(tx), [tx])
  const layers = useStore((s) => s.layers)
  const themeOrder = useStore((s) => s.themeOrder)
  const subthemeOrder = useStore((s) => s.subthemeOrder)
  const moveTheme = useStore((s) => s.moveTheme)
  // The panel shows the user's order, which is also the map's draw order.
  const orderedThemes = orderThemes(themes, themeOrder, subthemeOrder)
  const showOnlyMunicipios = useStore((s) => s.showOnlyMunicipios)
  const clearThematicLayers = useStore((s) => s.clearThematicLayers)
  const [query, setQuery] = useState('')

  const normalizedQuery = normalizeSearch(query.trim(), tx.locale)
  const matchesQuery = (layer: LayerConfig, q = normalizedQuery) => {
    if (!q) return true
    // Description and source left the list, but stay searchable: whoever looks
    // for "MODIS" expects to find it, even without the word showing in the row.
    // Everything is matched in the language on screen.
    const meta = layerMetaText(layer.id, tx)
    return [layerName(layer, tx), layer.type, meta?.description, meta?.source, meta && layerKindLabel(meta.kind, tx)]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizeSearch(value, tx.locale).includes(q))
  }
  const activeText = (count: number) => t(count === 1 ? 'activeOne' : 'activeMany', { count })
  const visiveis = layers.filter((l) => matchesQuery(l))
  const porTema = orderedThemes
    .map((tema) => ({
      tema,
      subtemas: tema.subthemes
        .map((subtema) => ({ subtema, itens: visiveis.filter((l) => l.theme === tema.id && l.subtheme === subtema.id) }))
        .filter(({ itens }) => itens.length > 0),
    }))
    .filter(({ subtemas }) => subtemas.length > 0)
  const activeCount = layers.filter((l) => l.visible).length
  const thematicCount = layers.filter((l) => l.visible && l.theme !== TERRITORY_THEME_ID).length

  // One theme and one subtheme open at a time keep the list from getting too long.
  const [abertoTemaId, setAbertoTemaId] = useState<string | null>(themes[0]?.id ?? null)
  const [abertoSubtemaKey, setAbertoSubtemaKey] = useState<string | null>(null)

  // Grips only when the order changes something on the map, and not over a
  // filtered list, where reordering would be guesswork.
  const reorderable = thematicCount >= 2 && !normalizedQuery

  // The theme being dragged, and the slot its drop would use.
  const [themeDrag, setThemeDrag] = useState<string | null>(null)
  const [themeDrop, setThemeDrop] = useState<DropSlot>(null)
  const clearThemeDrag = () => {
    setThemeDrag(null)
    setThemeDrop(null)
  }

  const onThemeDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    // A subtheme drag, a file or a text selection: not a theme drop.
    if (!themeDrag || !carries(event, THEME_DRAG_TYPE)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const before = slotBefore(event.clientY, dropAnchors(event.currentTarget, 'data-theme-id', '[data-theme-card]'))
    setThemeDrop((prev) => keepSlot(prev, before))
  }

  // Past the zone's edge a release drops nothing, so the line goes too. A move
  // between two of its children also fires dragleave; the next dragover puts
  // the line back.
  const onThemeDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (themeDrag && !event.currentTarget.contains(event.relatedTarget as Node | null)) setThemeDrop(null)
  }

  const onThemeDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!themeDrag || !carries(event, THEME_DRAG_TYPE)) return
    event.preventDefault()
    if (themeDrop) moveTheme(themeDrag, themeDrop.before)
    clearThemeDrag()
  }

  // Searching leads to the first group with a result, otherwise the search would
  // find layers that remain hidden in closed cards. This happens while typing,
  // not on render: deriving the open card from the search froze the button,
  // because the click changed the state and the render discarded it.
  const aoBuscar = (valor: string) => {
    setQuery(valor)
    const q = normalizeSearch(valor.trim(), tx.locale)
    if (!q) return
    const primeiro = orderedThemes.flatMap((tema) => tema.subthemes.map((subtema) => ({ tema, subtema })))
      .find(({ tema, subtema }) => layers.some((l) => l.theme === tema.id && l.subtheme === subtema.id && matchesQuery(l, q)))
    setAbertoTemaId(primeiro?.tema.id ?? null)
    setAbertoSubtemaKey(primeiro ? `${primeiro.tema.id}:${primeiro.subtema.id}` : null)
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
      {/* Panel chrome; overflow:hidden clips the rounded corners. The ficha is
          not in here: it is a sibling panel rendered by Mapa.tsx. */}
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
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.14em', color: c.dim, textTransform: 'uppercase' }}>{t('title')}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: c.accentInk, background: c.accentBg, borderRadius: 999, padding: '2px 8px' }}>
            {activeText(activeCount)}
          </span>
          <button
            className="ui-press"
            onClick={showOnlyMunicipios}
            title={t('homeTitle')}
            style={{
              marginLeft: 'auto', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 999,
              cursor: 'pointer', color: c.textDim, fontSize: 12, fontWeight: 700, padding: '2px 9px',
            }}
          >
            {t('home')}
          </button>
          <button onClick={onCollapse} aria-label={t('collapseAria')} title={t('collapse')}
            style={{ marginLeft: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: c.textDim, padding: 4, display: 'flex' }}>
            <IcChevronLeft size={16} />
          </button>
        </div>

        {/* Clear strip. Outside the scrolling body so it stays in reach however
            far down the list the user went to switch layers on. */}
        {thematicCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: c.accentBg, borderBottom: `1px solid ${c.accentBd}`, flex: 'none' }}>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>
                {t(thematicCount === 1 ? 'thematicOne' : 'thematicMany', { count: thematicCount })}
              </span>
              {/* The grips only show from the second raster on; this says what they do. */}
              {reorderable && (
                <span style={{ fontSize: 12, fontWeight: 500, color: c.textDim, lineHeight: 1.35 }}>
                  {t('reorderHint')}
                </span>
              )}
            </span>
            <button onClick={clearThematicLayers}
              aria-label={t('clearAria')}
              title={t('clearTitle', { territory: themes.find((item) => item.id === TERRITORY_THEME_ID)?.label ?? '' })}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: c.accent, color: c.onAccent, border: 'none', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: '6px 12px' }}>
              <IcX size={12} />
              {t('clear')}
            </button>
          </div>
        )}

        {/* Body. Also the themes' drop zone, all of it: overshooting up past the
            first thematic card (into the search box or Território) reads as the
            first slot, and below the last as the end. */}
        <div
          onDragOver={onThemeDragOver}
          onDragLeave={onThemeDragLeave}
          onDrop={onThemeDrop}
          style={{ overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <IcSearch size={15} color={c.textDim} style={{ position: 'absolute', left: 10, pointerEvents: 'none' }} />
            <input
              value={query}
              onChange={(event) => aoBuscar(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setQuery('')
              }}
              aria-label={t('search')}
              placeholder={t('search')}
              style={{ width: '100%', border: `1px solid ${c.border}`, borderRadius: 9, background: c.bgCard, color: c.text, font: 'inherit', fontSize: 14, padding: '8px 32px 8px 32px', outlineColor: c.accent }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label={t('clearSearchAria')}
                title={t('clearSearch')}
                style={{ position: 'absolute', right: 5, border: 'none', background: 'transparent', color: c.textDim, cursor: 'pointer', padding: 5, display: 'flex' }}
              >
                <IcX size={14} />
              </button>
            )}
          </div>
          {normalizedQuery && porTema.length === 0 ? (
            <div role="status" style={{ padding: '14px 4px', color: c.dim, fontSize: 14, textAlign: 'center' }}>
              {t('noResults')}
            </div>
          ) : (
            porTema.map(({ tema, subtemas }, i) => {
              // Território is fixed on top: no grip and no slot of its own.
              const thematic = tema.id !== TERRITORY_THEME_ID
              return (
                <div
                  key={tema.id}
                  data-theme-id={thematic ? tema.id : undefined}
                  style={{ position: 'relative' }}
                  onDragStart={(event) => {
                    // Only this theme's grip: a subtheme grip's dragstart bubbles
                    // through here too, and so does a drag of selected text.
                    if (!(event.target as Element).closest?.('[data-grip="theme"]')) return
                    const card = event.currentTarget.querySelector<HTMLElement>('[data-theme-card]') ?? event.currentTarget
                    const box = card.getBoundingClientRect()
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData(THEME_DRAG_TYPE, tema.id)
                    event.dataTransfer.setDragImage(card, event.clientX - box.left, event.clientY - box.top)
                    setThemeDrag(tema.id)
                  }}
                  onDragEnd={clearThemeDrag}
                >
                  {thematic && themeDrop?.before === tema.id && <DropIndicator color={c.accent} gap={10} />}
                  <ThemeSection
                    theme={theme}
                    tema={tema}
                    subtemas={subtemas}
                    infoId={infoId}
                    onInfo={onInfo}
                    open={abertoTemaId === tema.id}
                    openSubthemeKey={abertoSubtemaKey}
                    onToggle={() => setAbertoTemaId((atual) => (atual === tema.id ? null : tema.id))}
                    onToggleSubtheme={(id) => setAbertoSubtemaKey((atual) => (atual === id ? null : id))}
                    reorderable={reorderable && thematic}
                  />
                  {i === porTema.length - 1 && themeDrop?.before === null && <DropIndicator color={c.accent} gap={10} bottom />}
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}

// Section (accordion)

// Drag payload types. Custom, so a release over a text field pastes nothing.
const THEME_DRAG_TYPE = 'application/x-caativar-theme'
const SUBTHEME_DRAG_TYPE = 'application/x-caativar-subtheme'

// Whether a drag carries this payload type. A zone checks it besides its own
// drag state: the state alone would claim the other kind's drag, or a file, if
// a dragend were ever lost, and drop a stale move.
function carries(event: React.DragEvent, type: string) {
  return event.dataTransfer.types.includes(type)
}

// Midpoint of each section a drop can land between, read from its header, so an
// open section's long list does not push its midpoint down.
function dropAnchors(container: HTMLElement, attr: 'data-theme-id' | 'data-subtheme-id', headerSelector: string) {
  return [...container.querySelectorAll<HTMLElement>(`[${attr}]`)].map((item) => {
    const box = (item.querySelector(headerSelector) ?? item).getBoundingClientRect()
    return { id: item.getAttribute(attr) ?? '', mid: box.top + box.height / 2 }
  })
}

function ThemeSection({
  theme, tema, subtemas, infoId, onInfo, open, openSubthemeKey, onToggle, onToggleSubtheme, reorderable,
}: {
  theme: PlatformTheme; tema: ThemeInfo
  subtemas: { subtema: SubthemeInfo; itens: LayerConfig[] }[]
  infoId: string | null; onInfo: (id: string) => void
  open: boolean; openSubthemeKey: string | null; onToggle: () => void; onToggleSubtheme: (id: string) => void
  /** Grips on this card and on its subthemes; always false for Território. */
  reorderable: boolean
}) {
  const t = useTranslations('MapaUiSidebar')
  const layers = subtemas.flatMap(({ itens }) => itens)
  const c = theme.colors
  const ativas = layers.filter((layer) => layer.visible).length
  const moveSubtheme = useStore((s) => s.moveSubtheme)
  // The subtheme being dragged, and the slot its drop would use.
  const [subDrag, setSubDrag] = useState<string | null>(null)
  const [subDrop, setSubDrop] = useState<DropSlot>(null)
  const clearSubDrag = () => {
    setSubDrag(null)
    setSubDrop(null)
  }

  // The whole block, card and list, is the subthemes' drop zone: overshooting
  // up into the card reads as the first slot. A theme drag passes through to
  // the panel body, which handles it.
  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!subDrag || !carries(event, SUBTHEME_DRAG_TYPE)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const before = slotBefore(event.clientY, dropAnchors(event.currentTarget, 'data-subtheme-id', '[data-subtheme-header]'))
    setSubDrop((prev) => keepSlot(prev, before))
  }

  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (subDrag && !event.currentTarget.contains(event.relatedTarget as Node | null)) setSubDrop(null)
  }

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!subDrag || !carries(event, SUBTHEME_DRAG_TYPE)) return
    event.preventDefault()
    if (subDrop) moveSubtheme(tema.id, subDrag, subDrop.before)
    clearSubDrag()
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      // flow-root keeps the open list's bottom margin inside this box. Without
      // it the margin collapses through, and the "end" drop line, drawn in that
      // margin, would sit outside the zone: reaching it would clear it.
      style={{ display: 'flow-root' }}
    >
      <div data-theme-card style={{ position: 'relative' }}>
        {reorderable && <Grip kind="theme" color={c.textDim} />}
        <button
          onClick={onToggle}
          aria-expanded={open}
          style={{
            width: '100%', minHeight: 92, display: 'flex', alignItems: 'center', gap: 9,
            // Room for the grip over the left edge while it shows.
            padding: reorderable ? '10px 11px 10px 26px' : '10px 11px',
            cursor: 'pointer', textAlign: 'left', overflow: 'hidden',
            backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${c.bgCard} ${open ? '74%' : '66%'}, transparent) 0%, color-mix(in srgb, ${c.bgCard} ${open ? '52%' : '44%'}, transparent) 58%, ${tema.color}22 100%), url(${tema.image})`,
            backgroundPosition: 'center, center 62%', backgroundSize: 'cover, cover',
            border: `1px solid ${open ? `${tema.color}66` : c.border}`, borderRadius: 11,
            transition: 'border-color .16s, filter .16s',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800, color: c.text, letterSpacing: '.01em', flex: 1, minWidth: 0 }}>{tema.label}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: c.dim, background: c.mist, borderRadius: 999, padding: '1px 7px', flexShrink: 0 }}>{layers.length}</span>
          {ativas > 0 && <span style={{ fontSize: 11.5, fontWeight: 800, color: '#fff', flexShrink: 0, background: tema.color, borderRadius: 999, padding: '1px 7px' }}>{t(ativas === 1 ? 'activeOne' : 'activeMany', { count: ativas })}</span>}
          <span style={{ color: c.textDim, display: 'flex', flexShrink: 0 }}>{open ? <IcChevronUp size={14} /> : <IcChevronDown size={14} />}</span>
        </button>
      </div>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '4px 0 10px 9px', paddingLeft: 11, borderLeft: `2px solid ${tema.color}44` }}>
          {subtemas.map(({ subtema, itens }, i) => {
            const key = `${tema.id}:${subtema.id}`
            return (
              <div
                key={key}
                data-subtheme-id={subtema.id}
                style={{ position: 'relative' }}
                onDragStart={(event) => {
                  if (!(event.target as Element).closest?.('[data-grip="subtheme"]')) return
                  const header = event.currentTarget.querySelector<HTMLElement>('[data-subtheme-header]') ?? event.currentTarget
                  const box = header.getBoundingClientRect()
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData(SUBTHEME_DRAG_TYPE, subtema.id)
                  event.dataTransfer.setDragImage(header, event.clientX - box.left, event.clientY - box.top)
                  setSubDrag(subtema.id)
                }}
                onDragEnd={clearSubDrag}
              >
                {subDrop?.before === subtema.id && <DropIndicator color={c.accent} gap={4} />}
                <SubthemeSection
                  theme={theme}
                  subtheme={subtema}
                  layers={itens}
                  infoId={infoId}
                  onInfo={onInfo}
                  open={openSubthemeKey === key}
                  onToggle={() => onToggleSubtheme(key)}
                  grip={reorderable}
                />
                {i === subtemas.length - 1 && subDrop?.before === null && <DropIndicator color={c.accent} gap={4} bottom />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SubthemeSection({
  theme, subtheme, layers, infoId, onInfo, open, onToggle, grip,
}: {
  theme: PlatformTheme; subtheme: SubthemeInfo; layers: LayerConfig[]
  infoId: string | null; onInfo: (id: string) => void
  open: boolean; onToggle: () => void
  /** Shows the grip that drags this subtheme within its theme. */
  grip: boolean
}) {
  const t = useTranslations('MapaUiSidebar')
  const c = theme.colors
  const ativas = layers.filter((l) => l.visible).length

  return (
    <div>
      <div data-subtheme-header style={{ position: 'relative' }}>
        {grip && <Grip kind="subtheme" color={c.caption} />}
        <button
          onClick={onToggle}
          aria-expanded={open}
          style={{
            width: '100%', minHeight: 34, display: 'flex', alignItems: 'center', gap: 7,
            padding: grip ? '6px 8px 6px 24px' : '6px 8px',
            cursor: 'pointer', textAlign: 'left', background: open ? c.mist : 'transparent',
            border: 'none', borderRadius: 7,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: c.text, flex: 1, minWidth: 0 }}>{subtheme.label}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: c.dim }}>{layers.length}</span>
          {ativas > 0 && <span style={{ fontSize: 11.5, fontWeight: 800, color: c.accentInk }}>{t(ativas === 1 ? 'activeOne' : 'activeMany', { count: ativas })}</span>}
          <span style={{ color: c.textDim, display: 'flex', flexShrink: 0 }}>{open ? <IcChevronUp size={13} /> : <IcChevronDown size={13} />}</span>
        </button>
      </div>
      {open && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            margin: '2px 0 10px 9px', paddingLeft: 11,
            borderLeft: `2px solid ${c.border}`,
          }}
        >
          {layers.map((layer) => (
            <LayerRow key={layer.id} theme={theme} layer={layer} infoOpen={infoId === layer.id} onInfo={onInfo} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Drag handle for a theme card or a subtheme header. It sits beside the button,
 * over its left edge, not inside it: a press on it must not toggle the section,
 * and Firefox does not start a drag from inside a button. It is the only
 * draggable element, so a drag never starts from anywhere else.
 */
function Grip({ kind, color }: { kind: 'theme' | 'subtheme'; color: string }) {
  const t = useTranslations('MapaUiSidebar')
  return (
    <span
      draggable
      data-grip={kind}
      aria-hidden="true"
      title={t('dragToReorder')}
      style={{
        position: 'absolute', left: 3, top: '50%', transform: 'translateY(-50%)', zIndex: 1,
        color, display: 'flex', cursor: 'grab', padding: '6px 3px',
      }}
    >
      <IcGrip size={13} />
    </span>
  )
}

/** Where a dragged theme or subtheme would land: a line centred in the list's gap. */
function DropIndicator({ color, gap, bottom = false }: { color: string; gap: number; bottom?: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        [bottom ? 'bottom' : 'top']: -(gap / 2 + 1.5),
        left: 4,
        right: 4,
        height: 3,
        borderRadius: 99,
        background: color,
        zIndex: 2,
        pointerEvents: 'none',
      }}
    />
  )
}

// Layer row (card)

function LayerRow({
  theme, layer, infoOpen, onInfo,
}: {
  theme: PlatformTheme
  layer: LayerConfig
  infoOpen: boolean
  onInfo: (id: string) => void
}) {
  const t = useTranslations('MapaUiSidebar')
  const tx = useMapaText()
  const toggleLayer     = useStore((s) => s.toggleLayer)
  const setOpacity      = useStore((s) => s.setOpacity)
  const clearLayerError = useStore((s) => s.clearLayerError)
  const isLoading       = useStore((s) => !!s.loadingLayers[layer.id])
  const errorMsg        = useStore((s) => s.layerErrors[layer.id])

  const c = theme.colors
  const unit = layer.type === 'raster' ? layerUnit(layer as RasterLayerConfig, tx) : undefined
  const name = layerName(layer, tx)

  return (
    <div
      // Lighter visual weight than the card header: no border and a small radius,
      // so the list reads as content and not as another card.
      style={{
      background: layer.visible ? c.accentBg : 'transparent',
      border: `1px solid ${layer.visible ? c.accentBd : 'transparent'}`,
      borderRadius: 7, padding: '5px 7px', transition: 'background .15s, border-color .15s',
    }}>
      {/* Name, unit, sheet and switch, all on one line. Description and source
          are gone: they are already on the sheet, behind the info button. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          // Wraps onto a second line rather than truncating. The unit chip, the
          // info button and the switch keep their place: they are flexShrink: 0
          // and the row centers them against however tall the name gets.
          style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: c.text, overflowWrap: 'anywhere', lineHeight: 1.3 }}
          title={name}
        >
          {name}
        </span>
        {unit && (
          <span style={{ fontSize: 11, fontWeight: 600, color: c.textDim, background: c.chip, borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {unit}
          </span>
        )}
        <button
          onClick={() => onInfo(layer.id)}
          aria-label={t('infoAria', { name })}
          aria-expanded={infoOpen}
          style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 999, border: 'none', background: 'transparent', color: c.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          <IcInfo size={13} />
        </button>
        {isLoading ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: c.dim, textTransform: 'uppercase', letterSpacing: '.06em', flexShrink: 0 }}>...</span>
        ) : (
          <button
            role="switch" aria-checked={layer.visible}
            aria-label={t(layer.visible ? 'hideLayerAria' : 'showLayerAria', { name })}
            onClick={() => toggleLayer(layer.id)}
            style={{ flexShrink: 0, width: 32, height: 18, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, position: 'relative', background: layer.visible ? c.accent : '#d8d5c9', transition: 'background .2s' }}
          >
            <span style={{ position: 'absolute', top: 2, left: 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'transform .2s', transform: layer.visible ? 'translateX(14px)' : 'translateX(0)' }} />
          </button>
        )}
      </div>

      {/* error */}
      {errorMsg && (
        <div style={{ marginTop: 7, background: '#fee2e2', color: '#b91c1c', borderRadius: 6, padding: '6px 8px', fontSize: 11.5, display: 'flex', gap: 6 }}>
          <span style={{ flex: 1, wordBreak: 'break-word' }}>{storedText(errorMsg, tx)}</span>
          <button onClick={() => clearLayerError(layer.id)} title={t('dismiss')} aria-label={t('dismissError')} style={{ background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex' }}><IcX size={12} /></button>
        </div>
      )}

      {/* opacity */}
      {layer.visible && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 11.5, color: c.dim, flexShrink: 0 }}>{t('opacity')}</span>
          <input type="range" min={0} max={100} value={layer.opacity}
            aria-label={t('opacityAria', { name })}
            onChange={(e) => setOpacity(layer.id, Number(e.target.value))}
            style={{ flex: 1, height: 3, accentColor: c.accent, cursor: 'pointer' }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: c.accentInk, width: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{layer.opacity}%</span>
        </div>
      )}
    </div>
  )
}
