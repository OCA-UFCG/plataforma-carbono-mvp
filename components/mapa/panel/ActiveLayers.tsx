'use client'

import { useStore } from '@/lib/mapa/store'
import { THEMES } from '@/config/mapa/groups'
import type { LayerConfig } from '@/types/mapa'
import { IcX } from '../icons'
import OpacityControl from './OpacityControl'
import { useCardDrag, type GripHandlers } from './useCardDrag'
import cardDrag from './cardDrag.module.css'
import styles from './ActiveLayers.module.css'

const THEME_ICON = new Map(THEMES.map((theme) => [theme.id, theme.icon]))

/** The badge's number: two digits, as the design writes "03", and a bare 0. */
const countLabel = (n: number) => (n === 0 ? '0' : String(n).padStart(2, '0'))

/**
 * "Camadas ativas" (Figma 19430:58765, empty in 19423:57862): the thematic
 * layers on, rasters and emissions alike, in draw order, each a card with its
 * opacity. Dragging a card by its grip, or moving it with the arrow keys from
 * there, changes the draw order on the map (store `moveLayer`). The recortes
 * are not here: they are drawn above every thematic layer, always.
 */
export default function ActiveLayers({ infoId, onInfo }: { infoId: string | null; onInfo: (id: string) => void }) {
  const layers = useStore((s) => s.layers)
  const layerErrors = useStore((s) => s.layerErrors)
  const clearThematicLayers = useStore((s) => s.clearThematicLayers)
  const toggleLayer = useStore((s) => s.toggleLayer)
  const setOpacity = useStore((s) => s.setOpacity)
  const moveLayer = useStore((s) => s.moveLayer)
  const clearLayerError = useStore((s) => s.clearLayerError)

  // `layers` is the draw order, so these come top first.
  const active = layers.filter((layer) => layer.visible && layer.type !== 'vector')
  const n = active.length
  const drag = useCardDrag(active.map((layer) => layer.id), moveLayer)

  return (
    <section className={styles.section} aria-labelledby="camadas-ativas">
      <div className={styles.head}>
        <span className={styles.titleGroup}>
          <h3 id="camadas-ativas" className={`${styles.title} text-ui-bold`}>Camadas ativas</h3>
          <span className={`${styles.badge} text-ui-badge`} data-count={n}>{countLabel(n)}</span>
        </span>
        <button
          type="button"
          className={styles.clear}
          onClick={clearThematicLayers}
          disabled={n === 0}
          title="Desligar todas as camadas, exceto os recortes"
        >
          Limpar
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
          <img src={n === 0 ? '/icons/mapa/delete-forever-disabled.svg' : '/icons/mapa/delete-forever.svg'} alt="" width={24} height={24} />
        </button>
      </div>

      {n === 0 ? (
        <p className={styles.empty}>Ative as camadas para editá-las</p>
      ) : (
        <ol className={styles.list} {...drag.list}>
          {active.map((layer, index) => (
            <Card
              key={layer.id}
              layer={layer}
              error={layerErrors[layer.id]}
              infoOpen={infoId === layer.id}
              dropBefore={drag.dropBefore(layer.id)}
              dropAfter={index === n - 1 && drag.dropAtEnd}
              grip={drag.grip(layer.id)}
              onInfo={() => onInfo(layer.id)}
              onOff={() => toggleLayer(layer.id)}
              onOpacity={(value) => setOpacity(layer.id, value)}
              onDismissError={() => clearLayerError(layer.id)}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

/** One active layer (Figma "Camada", 19422:56093). */
function Card({
  layer, error, infoOpen, dropBefore, dropAfter, grip,
  onInfo, onOff, onOpacity, onDismissError,
}: {
  layer: LayerConfig
  error: string | undefined
  infoOpen: boolean
  dropBefore: boolean
  dropAfter: boolean
  grip: GripHandlers
  onInfo: () => void
  onOff: () => void
  onOpacity: (value: number) => void
  onDismissError: () => void
}) {
  const icon = THEME_ICON.get(layer.theme ?? '')
  const unit = layer.type === 'vector' ? undefined : layer.unit

  return (
    <li className={styles.card} data-layer={layer.id}>
      {dropBefore && <span className={cardDrag.dropLine} data-edge="top" />}
      {/* The only draggable element, so a drag never starts from the track or
          the field. A span, not a button: Firefox starts no drag from inside a
          button. The arrow keys move the card from here too. */}
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

      <div className={styles.body}>
        <div className={styles.top}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
          {icon ? <img className={styles.icon} src={icon} alt="" width={24} height={24} /> : <span className={styles.icon} />}
          <span className={styles.names}>
            <span className={`${styles.name} text-subtle-semibold`} title={layer.name}>{layer.name}</span>
            {unit && <span className={styles.unit}>{unit}</span>}
          </span>
          <button
            type="button"
            className={styles.info}
            onClick={onInfo}
            aria-label={`Ficha da camada ${layer.name}`}
            aria-expanded={infoOpen}
            title="Ficha da camada"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
            <img src="/icons/mapa/info.svg" alt="" width={24} height={24} />
          </button>
        </div>
        <OpacityControl value={layer.opacity} onChange={onOpacity} label={`Opacidade de ${layer.name}`} />
        {error && (
          <div className={`${styles.error} text-subtle`} role="alert">
            <span>{error}</span>
            <button type="button" onClick={onDismissError} title="Dispensar" aria-label="Dispensar erro"><IcX size={12} /></button>
          </div>
        )}
      </div>

      <button type="button" className={styles.off} onClick={onOff} aria-label={`Desligar ${layer.name}`} title="Desligar a camada">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
        <img src="/icons/mapa/close-small.svg" alt="" width={16} height={16} />
      </button>
      {dropAfter && <span className={cardDrag.dropLine} data-edge="bottom" />}
    </li>
  )
}
