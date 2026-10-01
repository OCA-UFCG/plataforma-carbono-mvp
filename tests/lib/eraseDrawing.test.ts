import { afterEach, describe, expect, it } from 'vitest'
import { eraseDrawing } from '@/lib/mapa/eraseDrawing'
import { useStore } from '@/lib/mapa/store'

const polygon: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'Polygon', coordinates: [[[-40, -8], [-39, -8], [-39, -7], [-40, -8]]] },
}

describe('eraseDrawing', () => {
  const initial = useStore.getState()
  afterEach(() => useStore.setState(initial, true))

  // mapbox-gl-draw's deleteAll emits no draw.delete, so the store -- which is
  // what gets saved -- would keep a drawing the map no longer shows, and a
  // reload would bring it back.
  it('forgets the saved drawing along with the one on the map', () => {
    let emptied = false
    useStore.getState().setDrawing(polygon)

    eraseDrawing({ deleteAll: () => { emptied = true } })

    expect(emptied).toBe(true)
    expect(useStore.getState().drawing).toBeNull()
  })
})
