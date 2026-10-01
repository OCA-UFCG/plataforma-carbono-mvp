// Removes the drawing from the map and from the store together.
//
// mapbox-gl-draw's API deletes are silent (`suppressAPIEvents` defaults to
// true), so `draw.deleteAll()` never reaches the `draw.delete` handler that
// clears the store's `drawing`. The store is what gets saved, and the saved
// drawing is restored on load: a drawing wiped by a recorte click, a search
// pick or a drawing tool came back on the next reload.

import { useStore } from '@/lib/mapa/store'

export function eraseDrawing(draw: { deleteAll: () => unknown }) {
  draw.deleteAll()
  useStore.getState().setDrawing(null)
}
