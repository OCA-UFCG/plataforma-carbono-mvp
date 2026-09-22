import { describe, expect, it } from 'vitest'
import { hasAnalysisContent } from '@/lib/mapa/store'
import type { LayerConfig, LayerResult } from '@/types/mapa'


const raster: LayerConfig = {
  id: 'estoque_carbono', name: 'Estoque de carbono', type: 'raster',
  visible: true, opacity: 80, colorType: 'continuous',
}
const hidden: LayerConfig = { ...raster, id: 'ndvi_modis', visible: false }

const ready: LayerResult = {
  layerId: 'estoque_carbono', status: 'ready',
  stats: { kind: 'continuous', stats: { min: 1, max: 9, mean: 5, count: 10 } },
  pixelValue: null, error: null,
}

const empty = { drawnArea: null, drawnLength: null, results: {}, layers: [raster] }

describe('hasAnalysisContent', () => {
  it('is false with no measurement and no result', () => {
    expect(hasAnalysisContent(empty)).toBe(false)
  })

  it('is true for a drawn area even before any layer answers', () => {
    expect(hasAnalysisContent({ ...empty, drawnArea: 621.4 })).toBe(true)
  })

  it('is true for a drawn length', () => {
    expect(hasAnalysisContent({ ...empty, drawnLength: 12.5 })).toBe(true)
  })

  it('is true when a visible raster has a result', () => {
    expect(hasAnalysisContent({ ...empty, results: { estoque_carbono: ready } })).toBe(true)
  })

  // A result left behind by a layer the user switched off must not keep the
  // panel open: the card is gone, so the panel has nothing to show.
  it('ignores a result whose layer is no longer visible', () => {
    expect(hasAnalysisContent({
      ...empty,
      layers: [hidden],
      results: { ndvi_modis: { ...ready, layerId: 'ndvi_modis' } },
    })).toBe(false)
  })
})
