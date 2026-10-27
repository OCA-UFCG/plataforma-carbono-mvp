'use client'

import { useEffect, useState } from 'react'
import { IcX, IcChevronLeft } from './icons'
import ActiveLayers from './panel/ActiveLayers'
import { useStore } from '@/lib/mapa/store'
import { normalizeSearch } from '@/lib/mapa/normalizeSearch'
import { COLUMN_WIDTH } from '@/lib/mapa/layout'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { THEMES, type SubthemeInfo, type ThemeInfo } from '@/config/mapa/groups'
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
  const showOnlyMunicipios = useStore((s) => s.showOnlyMunicipios)
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
  // The themes in groups.ts order. They no longer move: the draw order is the
  // layers', set in "Camadas ativas".
  const porTema = THEMES
    .map((tema) => ({
      tema,
      subtemas: tema.subthemes
        .map((subtema) => ({ subtema, itens: visiveis.filter((l) => l.theme === tema.id && l.subtheme === subtema.id) }))
        .filter(({ itens }) => itens.length > 0),
    }))
    .filter(({ subtemas }) => subtemas.length > 0)
  const activeCount = layers.filter((l) => l.visible).length

  // One theme open at a time keeps the list from getting too long.
  const [abertoTemaId, setAbertoTemaId] = useState<string | null>(THEMES[0]?.id ?? null)

  // Searching opens the first theme with a result, otherwise the search would
  // find layers that remain hidden in closed themes. This happens while typing,
  // not on render: deriving the open card from the search froze the button,
  // because the click changed the state and the render discarded it.
  const aoBuscar = (valor: string) => {
    setQuery(valor)
    const q = normalizeSearch(valor.trim())
    if (!q) return
    const primeiro = THEMES.find((tema) => layers.some((l) => l.theme === tema.id && matchesQuery(l, q)))
    setAbertoTemaId(primeiro?.id ?? null)
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

        {/* Body: the layers on, the search and the themes scroll together. */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <ActiveLayers infoId={infoId} onInfo={onInfo} />

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
            porTema.map(({ tema, subtemas }) => (
              <div key={tema.id} className={styles.theme}>
                <ThemeSection
                  tema={tema}
                  subtemas={subtemas}
                  infoId={infoId}
                  onInfo={onInfo}
                  open={abertoTemaId === tema.id}
                  onToggle={() => setAbertoTemaId((atual) => (atual === tema.id ? null : tema.id))}
                />
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}

/**
 * One theme (Figma "Grupo de camadas", 19430:58769): its header and, open,
 * every subtheme's name over its layers. Only the theme folds; its subthemes
 * all show, as in the design.
 */
function ThemeSection({
  tema, subtemas, infoId, onInfo, open, onToggle,
}: {
  tema: ThemeInfo
  subtemas: { subtema: SubthemeInfo; itens: LayerConfig[] }[]
  infoId: string | null; onInfo: (id: string) => void
  open: boolean; onToggle: () => void
}) {
  const ativas = subtemas.flatMap(({ itens }) => itens).filter((layer) => layer.visible).length

  return (
    <div>
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
      {open && subtemas.map(({ subtema, itens }) => (
        <div key={subtema.id}>
          <div className={styles.subtheme}>{subtema.label}</div>
          {itens.map((layer) => (
            <LayerRow key={layer.id} layer={layer} infoOpen={infoId === layer.id} onInfo={onInfo} />
          ))}
        </div>
      ))}
    </div>
  )
}

// Layer row

/**
 * One layer (Figma "Camada", 19421:55562): switch, name over unit, ficha
 * button. Its opacity is in "Camadas ativas" once it is on, and so is its
 * error; an error that keeps it off (a tile that never came) shows here.
 */
function LayerRow({
  layer, infoOpen, onInfo,
}: {
  layer: LayerConfig
  infoOpen: boolean
  onInfo: (id: string) => void
}) {
  const toggleLayer     = useStore((s) => s.toggleLayer)
  const clearLayerError = useStore((s) => s.clearLayerError)
  const isLoading       = useStore((s) => !!s.loadingLayers[layer.id])
  const errorMsg        = useStore((s) => s.layerErrors[layer.id])

  const unit = layer.type === 'vector' ? undefined : layer.unit
  // A recorte has no card in "Camadas ativas": its error stays here.
  const errorHere = errorMsg && (!layer.visible || layer.type === 'vector')

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

      {errorHere && (
        <div className={`${styles.error} text-subtle`}>
          <span>{errorMsg}</span>
          <button type="button" onClick={() => clearLayerError(layer.id)} title="Dispensar" aria-label="Dispensar erro"><IcX size={12} /></button>
        </div>
      )}
    </div>
  )
}
