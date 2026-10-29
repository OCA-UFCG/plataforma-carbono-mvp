'use client'

import { useState } from 'react'
import { keepSlot, slotBefore, type DropSlot } from '@/lib/mapa/dropSlot'

// Drag payload type. Custom, so a release over a text field pastes nothing.
const DRAG_TYPE = 'application/x-caativar-layer'

/** What a card's grip listens to. */
export interface GripHandlers {
  onDragStart: (event: React.DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
}

/**
 * Reordering a list of layer cards ("Camadas ativas", "Recorte em destaque")
 * by dragging a card's grip, or with the arrow keys from it. `ids` is the list
 * top first, each card an element with `data-layer={id}`; `move` puts an id
 * in front of another, or at the end with null (store `moveLayer`).
 */
export function useCardDrag(ids: string[], move: (id: string, beforeId: string | null) => void) {
  // The card being dragged, and the slot its drop would use.
  const [drag, setDrag] = useState<string | null>(null)
  const [drop, setDrop] = useState<DropSlot>(null)
  const clearDrag = () => {
    setDrag(null)
    setDrop(null)
  }

  const list = {
    onDragOver: (event: React.DragEvent<HTMLElement>) => {
      if (!drag || !event.dataTransfer.types.includes(DRAG_TYPE)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      const anchors = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-layer]')].map((card) => {
        const box = card.getBoundingClientRect()
        return { id: card.dataset.layer ?? '', mid: box.top + box.height / 2 }
      })
      setDrop((prev) => keepSlot(prev, slotBefore(event.clientY, anchors)))
    },
    onDragLeave: (event: React.DragEvent<HTMLElement>) => {
      if (drag && !event.currentTarget.contains(event.relatedTarget as Node | null)) setDrop(null)
    },
    onDrop: (event: React.DragEvent<HTMLElement>) => {
      if (!drag || !event.dataTransfer.types.includes(DRAG_TYPE)) return
      event.preventDefault()
      if (drop) move(drag, drop.before)
      clearDrag()
    },
  }

  // The keyboard's way: up goes in front of the card above, down in front of
  // the card after the next one, or to the end.
  const step = (index: number, delta: -1 | 1) => {
    const id = ids[index]
    if (delta === -1 && index > 0) move(id, ids[index - 1])
    if (delta === 1 && index < ids.length - 1) move(id, ids[index + 2] ?? null)
  }

  /** Handlers for the grip of the card `id`, the only draggable element. */
  const grip = (id: string): GripHandlers => ({
    onDragStart: (event: React.DragEvent<HTMLElement>) => {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData(DRAG_TYPE, id)
      const card = event.currentTarget.closest<HTMLElement>('[data-layer]')
      if (card) {
        const box = card.getBoundingClientRect()
        event.dataTransfer.setDragImage(card, event.clientX - box.left, event.clientY - box.top)
      }
      setDrag(id)
    },
    onDragEnd: clearDrag,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'ArrowUp') { event.preventDefault(); step(ids.indexOf(id), -1) }
      if (event.key === 'ArrowDown') { event.preventDefault(); step(ids.indexOf(id), 1) }
    },
  })

  return {
    list,
    grip,
    /** Whether a drop would land in front of the card `id`. */
    dropBefore: (id: string) => drop?.before === id,
    /** Whether a drop would land after the last card. */
    dropAtEnd: drop !== null && drop.before === null,
  }
}
