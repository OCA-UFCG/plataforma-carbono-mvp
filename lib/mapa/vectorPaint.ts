import type maplibregl from 'maplibre-gl'

// A vector fill brightens under the cursor only. The selected feature used to
// take the same bump, which covered the raster inside it with the recorte's
// color; the selection spotlight (lib/mapa/selectionSpotlight.ts) marks it now.
// That holds under the cursor too: the bump over the focused feature read as
// it going dark.
export function vectorFillOpacity(opacity: number): maplibregl.ExpressionSpecification {
  return [
    'case',
    ['all',
      ['boolean', ['feature-state', 'hover'], false],
      ['!', ['boolean', ['feature-state', 'selected'], false]],
    ],
    (opacity / 100) * 0.7,
    (opacity / 100) * 0.35,
  ]
}
