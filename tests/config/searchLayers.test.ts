import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import type { LayerConfig, VectorLayerConfig } from '@/types/mapa'

const vectors = (appConfig.layers as LayerConfig[]).filter(
  (l): l is VectorLayerConfig => l.type === 'vector',
)

describe('the vocabulary the search shows for each recorte', () => {
  it('covers every vector layer', () => {
    expect(vectors.length).toBeGreaterThan(0)
    for (const layer of vectors) {
      expect(layer.unitName, `${layer.id} declares no unitName`).toBeTruthy()
    }
  })

  it('reads as a word, not as a GeoJSON key', () => {
    // The descriptor used to be the raw field key -- "Municípios › name_muni".
    // This is that mistake written down so it cannot come back. Testing the
    // shape rather than comparing against the declared fields, because the
    // biome layer's property is genuinely spelled "Bioma", which is also the
    // right word for the reader.
    for (const layer of vectors) {
      expect(layer.unitName, `${layer.id}: unitName looks like a field key`).toMatch(
        /^\p{Lu}/u,
      )
      expect(layer.unitName, `${layer.id}: unitName has an underscore`).not.toContain('_')
    }
  })

  it('names one feature, not the collection', () => {
    // A row describes a single result, so the plural layer name is the wrong
    // word for it: "Assentamentos (INCRA)" above one settlement.
    for (const layer of vectors) {
      expect(layer.unitName, `${layer.id} reuses the layer name`).not.toBe(layer.name)
    }
  })
})
