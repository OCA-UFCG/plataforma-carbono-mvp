'use client'

import { useState } from 'react'
import { useStore } from '@/lib/mapa/store'
import { TERRITORY_THEME_ID } from '@/config/mapa/groups'
import type { LayerConfig } from '@/types/mapa'
import { IcX } from '../icons'
import OpacityControl from './OpacityControl'
import RecortePicker from './RecortePicker'
import TerritorySearch from './TerritorySearch'
import { useCardDrag, type GripHandlers } from './useCardDrag'
import cardDrag from './cardDrag.module.css'
import styles from './Territory.module.css'

/** The folded section's count of recortes on the map. */
export function recorteSummary(n: number): string {
  if (n === 0) return 'Nenhum recorte no mapa'
  return `${n} ${n === 1 ? 'recorte' : 'recortes'} no mapa`
}

/**
 * "Território" (Figma 19423:56814), atop the layer panel: the recortes are
 * chosen in "Escolha o recorte" and listed in "Recorte em destaque", where
 * their draw order and opacity are set; a feature is found in the search or
 * clicked on the map, and shows in the card in focus; "Delimitar recorte" and
 * "Marcar ponto" draw what to analyse instead. Folded (19430:58762) it sums
 * them up. Picking a search result and dropping a selection go through the
 * map (MapView's `selectFeatureRef` and `dismissSelectionRef`, by Mapa.tsx).
 */
export default function Territory({ onSelectFeature, onDismissSelection }: {
  onSelectFeature: (layerId: string, featureIndex: number, bbox: [number, number, number, number]) => void
  onDismissSelection: () => void
}) {
  const layers = useStore((s) => s.layers)
  const selectedGeometry = useStore((s) => s.selectedGeometry)
  const analysisLabel = useStore((s) => s.analysisLabel)
  const analysisKind = useStore((s) => s.analysisKind)
  const drawing = useStore((s) => s.drawing)
  const drawMode = useStore((s) => s.drawMode)
  const setDrawMode = useStore((s) => s.setDrawMode)
  const clearDrawings = useStore((s) => s.clearDrawings)
  const layerErrors = useStore((s) => s.layerErrors)
  const toggleLayer = useStore((s) => s.toggleLayer)
  const setOpacity = useStore((s) => s.setOpacity)
  const moveLayer = useStore((s) => s.moveLayer)
  const clearRecortes = useStore((s) => s.clearRecortes)
  const clearLayerError = useStore((s) => s.clearLayerError)

  const [open, setOpen] = useState(true)

  const recortes = layers.filter((layer) => layer.theme === TERRITORY_THEME_ID)
  // `layers` is the draw order, so these come top first.
  const on = recortes.filter((layer) => layer.visible)
  const n = on.length
  const drag = useCardDrag(on.map((layer) => layer.id), moveLayer)
  // The destaque is the feature in focus, clicked or searched, which the
  // analysis measures; a drawing is not one (issue #136, question 3).
  const destaque = selectedGeometry?.feature ? analysisLabel : null
  // The card in focus names that feature by its kind ("Município em foco"),
  // or a drawing by what it is, and its X drops either: a feature as a click
  // on empty map does, a drawing through the store (#136, question 2).
  const focus = destaque
    ? { label: `${analysisKind ?? 'Recorte'} em foco`, name: destaque }
    : drawing && analysisKind ? { label: 'Em foco', name: analysisKind } : null
  const toggleDraw = (mode: 'polygon' | 'point') => setDrawMode(drawMode === mode ? null : mode)

  return (
    <section className={styles.section} data-open={open} aria-labelledby="territorio">
      <div className={styles.head}>
        <h2 id="territorio" className={`${styles.title} text-h4`}>Território</h2>
        <button
          type="button"
          className={styles.fold}
          aria-expanded={open}
          aria-label={open ? 'Recolher Território' : 'Abrir Território'}
          title={open ? 'Recolher' : 'Abrir'}
          onClick={() => setOpen((value) => !value)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
          <img src="/icons/mapa/keyboard-arrow-up-green.svg" alt="" width={24} height={24} />
        </button>
      </div>

      {open ? (
        <>
          <div className={styles.find}>
            <RecortePicker layers={recortes} onToggle={toggleLayer} />
            <TerritorySearch onSelect={onSelectFeature} />
            <p className={`${styles.orClick} text-subtle`}>Ou clique no mapa.</p>
          </div>
          {focus && (
            <FocusCard
              label={focus.label}
              name={focus.name}
              onClear={() => (drawing ? clearDrawings() : onDismissSelection())}
            />
          )}
          {/* "Delimitar recorte" as the design draws it, and "Marcar ponto",
              which it does not: the way to a point's value and series. Each
              stays armed until pressed again or Esc (DrawHint). */}
          <div className={styles.drawButtons}>
            <button
              type="button"
              className={`${styles.draw} text-ui-medium`}
              aria-pressed={drawMode === 'polygon'}
              onClick={() => toggleDraw('polygon')}
            >
              Delimitar recorte
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
              <img src="/icons/mapa/edit.svg" alt="" width={16} height={16} />
            </button>
            <button
              type="button"
              className={`${styles.draw} text-ui-medium`}
              aria-pressed={drawMode === 'point'}
              onClick={() => toggleDraw('point')}
            >
              Marcar ponto
            </button>
          </div>
          <hr className={styles.rule} />
          <div className={styles.chosen}>
            <div className={styles.chosenHead}>
              <h3 className={`${styles.chosenTitle} text-body`}>Recorte em destaque ({n})</h3>
              <button
                type="button"
                className={styles.clear}
                onClick={clearRecortes}
                disabled={n === 0}
                title="Tirar todos os recortes do mapa"
              >
                Limpar
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
                <img src={n === 0 ? '/icons/mapa/delete-forever-disabled.svg' : '/icons/mapa/delete-forever.svg'} alt="" width={24} height={24} />
              </button>
            </div>
            {n > 0 && (
              <ol className={styles.cards} {...drag.list}>
                {on.map((layer, index) => (
                  <Card
                    key={layer.id}
                    layer={layer}
                    error={layerErrors[layer.id]}
                    dropBefore={drag.dropBefore(layer.id)}
                    dropAfter={index === n - 1 && drag.dropAtEnd}
                    grip={drag.grip(layer.id)}
                    onOff={() => toggleLayer(layer.id)}
                    onOpacity={(value) => setOpacity(layer.id, value)}
                    onDismissError={() => clearLayerError(layer.id)}
                  />
                ))}
              </ol>
            )}
          </div>
        </>
      ) : (
        <TerritorySummary count={n} destaque={destaque} onOpen={() => setOpen(true)} />
      )}
    </section>
  )
}

/** The feature or the drawing in focus (Figma "Município em foco", 19416:55282). */
export function FocusCard({ label, name, onClear }: { label: string; name: string; onClear: () => void }) {
  return (
    <div className={styles.focus}>
      <div className={styles.focusText}>
        <span className={styles.focusLabel}>{label}</span>
        <span className={`${styles.focusName} text-subtle-semibold`} title={name}>{name}</span>
      </div>
      <button
        type="button"
        className={styles.focusClear}
        onClick={onClear}
        aria-label={`Desfazer a seleção de ${name}`}
        title="Desfazer a seleção"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
        <img src="/icons/mapa/close-small.svg" alt="" width={16} height={16} />
      </button>
    </div>
  )
}

/** The folded section (Figma 19430:58762): the count, the destaque and "Alterar". */
export function TerritorySummary({ count, destaque, onOpen }: {
  count: number
  destaque: string | null
  onOpen: () => void
}) {
  return (
    <div className={styles.summary}>
      <div className={styles.summaryText}>
        <span className={styles.summaryCount}>{recorteSummary(count)}</span>
        {destaque && <span className={styles.summaryDestaque}>destaque: {destaque}</span>}
      </div>
      <button type="button" className={`${styles.change} text-ui-medium`} onClick={onOpen}>Alterar</button>
    </div>
  )
}

/** One recorte on the map (Figma "Recorte em destaque", 19416:55095). */
function Card({ layer, error, dropBefore, dropAfter, grip, onOff, onOpacity, onDismissError }: {
  layer: LayerConfig
  error: string | undefined
  dropBefore: boolean
  dropAfter: boolean
  grip: GripHandlers
  onOff: () => void
  onOpacity: (value: number) => void
  onDismissError: () => void
}) {
  return (
    <li className={styles.card} data-layer={layer.id}>
      {dropBefore && <span className={cardDrag.dropLine} data-edge="top" />}
      {/* The only draggable element, so a drag never starts from the track or
          the field; see ActiveLayers for why a span. */}
      <span
        draggable
        role="button"
        tabIndex={0}
        className={cardDrag.grip}
        aria-label={`Mover ${layer.name} na ordem do mapa (setas para cima e para baixo)`}
        title="Arraste para mudar a ordem no mapa"
        {...grip}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
        <img src="/icons/mapa/drag-indicator.svg" alt="" width={24} height={24} />
      </span>

      <div className={styles.cardBody}>
        <span className={`${styles.cardName} text-subtle-semibold`} title={layer.name}>{layer.name}</span>
        <OpacityControl value={layer.opacity} onChange={onOpacity} label={`Opacidade de ${layer.name}`} />
        {error && (
          <div className={`${styles.error} text-subtle`} role="alert">
            <span>{error}</span>
            <button type="button" onClick={onDismissError} title="Dispensar" aria-label="Dispensar erro"><IcX size={12} /></button>
          </div>
        )}
      </div>

      <button type="button" className={styles.bin} onClick={onOff} aria-label={`Tirar ${layer.name} do mapa`} title="Tirar do mapa">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
        <img src="/icons/mapa/delete-forever-heavy.svg" alt="" width={24} height={24} />
      </button>
      {dropAfter && <span className={cardDrag.dropLine} data-edge="bottom" />}
    </li>
  )
}
