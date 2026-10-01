import { describe, expect, it } from 'vitest'
import { expression, latest } from '@maplibre/maplibre-gl-style-spec'
import { vectorFillOpacity } from '@/lib/mapa/vectorPaint'

// Evaluates the real paint expression, the way MapLibre does, for one feature
// in the given feature-state.
function fillOpacity(opacity: number, state: { hover?: boolean; selected?: boolean }) {
  const parsed = expression.createExpression(vectorFillOpacity(opacity), latest.paint_fill['fill-opacity'])
  if (parsed.result !== 'success') throw new Error(JSON.stringify(parsed.value))
  return parsed.value.evaluate({ zoom: 6 }, { type: 'Polygon', properties: {} } as never, state)
}

describe('vectorFillOpacity', () => {
  const resting = 0.8 * 0.35

  it('brightens a recorte under the cursor', () => {
    expect(fillOpacity(80, {})).toBeCloseTo(resting)
    expect(fillOpacity(80, { hover: true })).toBeCloseTo(0.8 * 0.7)
  })

  it('leaves the selected recorte as it is, under the spotlight', () => {
    expect(fillOpacity(80, { selected: true })).toBeCloseTo(resting)
  })

  // The bump covers the raster inside the feature with the recorte's color,
  // which in the focused feature reads as it going dark.
  it('does not bump the selected recorte under the cursor', () => {
    expect(fillOpacity(80, { hover: true, selected: true })).toBeCloseTo(resting)
  })
})
