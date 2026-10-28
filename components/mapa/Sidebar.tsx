'use client'

import { useEffect, useState } from 'react'
import { IcX, IcChevronLeft, IcGrip } from './icons'
import { useStore } from '@/lib/mapa/store'
import { orderThemes } from '@/lib/mapa/layerOrder'
import { keepSlot, slotBefore, type DropSlot } from '@/lib/mapa/dropSlot'
import { normalizeSearch } from '@/lib/mapa/normalizeSearch'
import { COLUMN_WIDTH } from '@/lib/mapa/layout'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { THEMES, TERRITORY_THEME_ID, type SubthemeInfo, type ThemeInfo } from '@/config/mapa/groups'
import type { LayerConfig, PlatformTheme } from '@/types/mapa'
import styles from './Sidebar.module.css'

interface Props {
  theme: PlatformTheme
  /** Open ficha, owned by Mapa.tsx: only it can widen `leftEdge` to reserve the
   *  column the ficha occupies. Toggling is the caller's business too. */
  infoId: string | null
  onInfo: (id: string) => void
  onCollapse: () => void
}

export default function Sidebar({ theme, infoId, onInfo, onCollapse }: Props) {
  const layers = useStore((s) => s.layers)
  const themeOrder = useStore((s) => s.themeOrder)
  const subthemeOrder = useStore((s) => s.subthemeOrder)
  const moveTheme = useStore((s) => s.moveTheme)
  // The panel shows the user's order, which is also the map's draw order.
  const orderedThemes = orderThemes(THEMES, themeOrder, subthemeOrder)
  const showOnlyMunicipios = useStore((s) => s.showOnlyMunicipios)
  const clearThematicLayers = useStore((s) => s.clearThematicLayers)
  const [query, setQuery] = useState('')

  const normalizedQuery = normalizeSearch(query.trim())
  const matchesQuery = (layer: LayerConfig, q = normalizedQuery) => {
    if (!q) return true
    // Description and source left the list, but stay searchable: whoever looks
    // for "MODIS" expects to find it, even without the word showing in the row.
    const meta = LAYER_META[layer.id]
    return [layer.name, layer.type, meta?.description, meta?.source, meta?.kind]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizeSearch(value).includes(q))
  }
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

  // One theme open at a time keeps the list from getting too long.
  const [abertoTemaId, setAbertoTemaId] = useState<string | null>(THEMES[0]?.id ?? null)

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

  // Searching opens the first theme with a result, otherwise the search would
  // find layers that remain hidden in closed themes. This happens while typing,
  // not on render: deriving the open card from the search froze the button,
  // because the click changed the state and the render discarded it.
  const aoBuscar = (valor: string) => {
    setQuery(valor)
    const q = normalizeSearch(valor.trim())
    if (!q) return
    const primeiro = orderedThemes.flatMap((tema) => tema.subthemes.map((subtema) => ({ tema, subtema })))
      .find(({ tema, subtema }) => layers.some((l) => l.theme === tema.id && l.subtheme === subtema.id && matchesQuery(l, q)))
    setAbertoTemaId(primeiro?.tema.id ?? null)
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
      id="painel-camadas"
      style={{
        display: 'flex',
        ...(narrow
          ? { position: 'absolute', zIndex: 10, top: 0, left: 0, bottom: 0, width: 'min(320px, 88vw)', maxHeight: '100%' }
            // The first column of Mapa.tsx's row, the whole height under the
            // site header (Figma 19413:54279).
          : { position: 'relative', flex: 'none', width: COLUMN_WIDTH, height: '100%' }),
        fontFamily: 'var(--font-app), sans-serif',
      }}
    >
      {/* Panel chrome; overflow:hidden clips the drawer's rounded corners. The
          ficha is not in here: it is a sibling column rendered by Mapa.tsx. */}
      <div
        style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          ...(narrow
            ? {
                background: c.glassBg, backdropFilter: 'blur(11px)', WebkitBackdropFilter: 'blur(11px)',
                border: `1px solid ${c.glassBd}`, boxShadow: 'var(--sh-panel)', borderRadius: '0 16px 16px 0',
              }
            : { background: c.bgCard, borderRight: `1px solid ${c.border}` }),
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: `1px solid ${c.border}`, flex: 'none' }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.14em', color: c.dim, textTransform: 'uppercase' }}>Temas</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: c.accentInk, background: c.accentBg, borderRadius: 999, padding: '2px 8px' }}>
            {activeCount} ativa{activeCount === 1 ? '' : 's'}
          </span>
          <button
            className="ui-press"
            onClick={showOnlyMunicipios}
            title="Desativar todas as camadas e voltar à vista do bioma"
            style={{
              marginLeft: 'auto', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 999,
              cursor: 'pointer', color: c.textDim, fontSize: 12, fontWeight: 700, padding: '2px 9px',
            }}
          >
            Início
          </button>
          <button onClick={onCollapse} aria-label="Recolher painel" title="Recolher"
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
                {thematicCount === 1 ? '1 camada temática ligada' : `${thematicCount} camadas temáticas ligadas`}
              </span>
              {/* The grips only show from the second raster on; this says what they do. */}
              {reorderable && (
                <span style={{ fontSize: 12, fontWeight: 500, color: c.textDim, lineHeight: 1.35 }}>
                  Arraste temas e subcategorias pela alça ⠿ para mudar a ordem no mapa
                </span>
              )}
            </span>
            <button onClick={clearThematicLayers}
              aria-label="Desligar as camadas temáticas"
              title="Desligar todas as camadas, exceto as de Território"
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: c.accent, color: c.onAccent, border: 'none', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: '6px 12px' }}>
              <IcX size={12} />
              Desligar
            </button>
          </div>
        )}

        {/* Body. Also the themes' drop zone, all of it: overshooting up past the
            first thematic theme (into the search box or Território) reads as the
            first slot, and below the last as the end. */}
        <div
          onDragOver={onThemeDragOver}
          onDragLeave={onThemeDragLeave}
          onDrop={onThemeDrop}
          style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
        >
          <div className={styles.search}>
            <div className={styles.searchBox}>
              <input
                className={`${styles.searchInput} text-ui-regular`}
                value={query}
                onChange={(event) => aoBuscar(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setQuery('')
                }}
                aria-label="Buscar camadas"
                placeholder="Buscar Camadas"
              />
              {query ? (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => setQuery('')}
                  aria-label="Limpar busca de camadas"
                  title="Limpar busca"
                >
                  <IcX size={14} />
                </button>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- static SVG icon
                <img className={styles.searchIcon} src="/icons/mapa/search.svg" alt="" width={16} height={16} />
              )}
            </div>
          </div>
          {normalizedQuery && porTema.length === 0 ? (
            <div role="status" className={`${styles.noResults} text-body`}>
              Nenhuma camada encontrada.
            </div>
          ) : (
            porTema.map(({ tema, subtemas }, i) => {
              // Território is fixed on top: no grip and no slot of its own.
              const thematic = tema.id !== TERRITORY_THEME_ID
              return (
                <div
                  key={tema.id}
                  className={styles.theme}
                  data-theme-id={thematic ? tema.id : undefined}
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
                  {thematic && themeDrop?.before === tema.id && <DropIndicator />}
                  <ThemeSection
                    tema={tema}
                    subtemas={subtemas}
                    infoId={infoId}
                    onInfo={onInfo}
                    open={abertoTemaId === tema.id}
                    onToggle={() => setAbertoTemaId((atual) => (atual === tema.id ? null : tema.id))}
                    reorderable={reorderable && thematic}
                  />
                  {i === porTema.length - 1 && themeDrop?.before === null && <DropIndicator bottom />}
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

/**
 * One theme (Figma "Grupo de camadas", 19430:58769): its header and, open,
 * every subtheme's name over its layers. Only the theme folds; its subthemes
 * all show, as in the design.
 */
function ThemeSection({
  tema, subtemas, infoId, onInfo, open, onToggle, reorderable,
}: {
  tema: ThemeInfo
  subtemas: { subtema: SubthemeInfo; itens: LayerConfig[] }[]
  infoId: string | null; onInfo: (id: string) => void
  open: boolean; onToggle: () => void
  /** Grips on this theme and on its subthemes; always false for Território. */
  reorderable: boolean
}) {
  const ativas = subtemas.flatMap(({ itens }) => itens).filter((layer) => layer.visible).length
  const moveSubtheme = useStore((s) => s.moveSubtheme)
  // The subtheme being dragged, and the slot its drop would use.
  const [subDrag, setSubDrag] = useState<string | null>(null)
  const [subDrop, setSubDrop] = useState<DropSlot>(null)
  const clearSubDrag = () => {
    setSubDrag(null)
    setSubDrop(null)
  }

  // The whole block, header and list, is the subthemes' drop zone:
  // overshooting up into the header reads as the first slot. A theme drag
  // passes through to the panel body, which handles it.
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
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <div data-theme-card style={{ position: 'relative' }}>
        {reorderable && <Grip kind="theme" />}
        <button
          type="button"
          className={styles.themeHeader}
          onClick={onToggle}
          aria-expanded={open}
          style={{ background: tema.tint }}
        >
          {tema.icon
            // eslint-disable-next-line @next/next/no-img-element -- static SVG icon
            ? <img className={styles.themeIcon} src={tema.icon} alt="" width={24} height={24} />
            : <span className={styles.themeIcon} style={{ width: 24 }} />}
          <span className={`${styles.themeTitle} text-subtle-semibold`}>{tema.label}</span>
          <span className={`${styles.badge} text-ui-badge`} data-count={ativas} aria-label={`${ativas} ligada${ativas === 1 ? '' : 's'}`}>
            {ativas}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
          <img className={styles.arrow} src="/icons/mapa/keyboard-arrow-up.svg" alt="" width={24} height={24} />
        </button>
      </div>
      {open && subtemas.map(({ subtema, itens }, i) => (
        <div
          key={subtema.id}
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
          {subDrop?.before === subtema.id && <DropIndicator />}
          <div data-subtheme-header className={styles.subtheme}>
            {reorderable && <Grip kind="subtheme" />}
            {subtema.label}
          </div>
          {itens.map((layer) => (
            <LayerRow key={layer.id} layer={layer} infoOpen={infoId === layer.id} onInfo={onInfo} />
          ))}
          {i === subtemas.length - 1 && subDrop?.before === null && <DropIndicator bottom />}
        </div>
      ))}
    </div>
  )
}

/**
 * Drag handle for a theme or a subtheme. It sits beside the header, over its
 * left edge, not inside it: a press on it must not toggle the section, and
 * Firefox does not start a drag from inside a button. It is the only
 * draggable element, so a drag never starts from anywhere else.
 */
function Grip({ kind }: { kind: 'theme' | 'subtheme' }) {
  return (
    <span
      draggable
      data-grip={kind}
      aria-hidden="true"
      title="Arraste para reordenar"
      style={{
        position: 'absolute', left: 1, top: '50%', transform: 'translateY(-50%)', zIndex: 1,
        color: 'var(--am-400)', display: 'flex', cursor: 'grab', padding: '6px 1px',
      }}
    >
      <IcGrip size={13} />
    </span>
  )
}

/** Where a dragged theme or subtheme would land: a line on the section's edge. */
function DropIndicator({ bottom = false }: { bottom?: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        [bottom ? 'bottom' : 'top']: -1.5,
        left: 4,
        right: 4,
        height: 3,
        borderRadius: 99,
        background: 'var(--role-marca-ancora-padrao)',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    />
  )
}

// Layer row

/** One layer (Figma "Camada", 19421:55562): switch, name over unit, ficha button. */
function LayerRow({
  layer, infoOpen, onInfo,
}: {
  layer: LayerConfig
  infoOpen: boolean
  onInfo: (id: string) => void
}) {
  const toggleLayer     = useStore((s) => s.toggleLayer)
  const setOpacity      = useStore((s) => s.setOpacity)
  const clearLayerError = useStore((s) => s.clearLayerError)
  const isLoading       = useStore((s) => !!s.loadingLayers[layer.id])
  const errorMsg        = useStore((s) => s.layerErrors[layer.id])

  const unit = layer.type === 'vector' ? undefined : layer.unit

  return (
    <div className={styles.layer}>
      <div className={styles.layerMain}>
        {isLoading ? (
          <span className={`${styles.loading} text-ui-badge`} aria-label={`Carregando ${layer.name}`}>…</span>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={layer.visible}
            aria-label={`${layer.visible ? 'Ocultar' : 'Exibir'} camada ${layer.name}`}
            className={styles.switch}
            onClick={() => toggleLayer(layer.id)}
          >
            <span className={styles.knob} />
          </button>
        )}
        <span className={styles.names}>
          {/* The design cuts a long name with an ellipsis; the whole of it is
              in the title, and in the ficha. */}
          <span className={`${styles.name} text-subtle-semibold`} title={layer.name}>{layer.name}</span>
          {unit && <span className={styles.unit}>{unit}</span>}
        </span>
        <button
          type="button"
          className={styles.info}
          onClick={() => onInfo(layer.id)}
          aria-label={`Ficha da camada ${layer.name}`}
          aria-expanded={infoOpen}
          title="Ficha da camada"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
          <img src="/icons/mapa/info.svg" alt="" width={24} height={24} />
        </button>
      </div>

      {errorMsg && (
        <div className={`${styles.error} text-subtle`}>
          <span>{errorMsg}</span>
          <button type="button" onClick={() => clearLayerError(layer.id)} title="Dispensar" aria-label="Dispensar erro"><IcX size={12} /></button>
        </div>
      )}

      {layer.visible && (
        <div className={`${styles.extra} text-ui-badge`}>
          <span>Opacidade</span>
          <input type="range" min={0} max={100} value={layer.opacity}
            aria-label={`Opacidade de ${layer.name}`}
            onChange={(e) => setOpacity(layer.id, Number(e.target.value))} />
          <span>{layer.opacity}%</span>
        </div>
      )}
    </div>
  )
}
