import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { vectorDataUrl } from '@/lib/mapa/vectorDataUrl'
import type { LayerConfig, VectorLayerConfig } from '@/types/mapa'

const vectors = (appConfig.layers as LayerConfig[]).filter(
  (l): l is VectorLayerConfig => l.type === 'vector',
)

describe('vectorDataUrl', () => {
  it('asks for a different URL than the one the poisoned entries are stored under', () => {
    // The whole point: a browser holding /data/vector/estados.geojson from
    // before the header was fixed must not be able to answer this request from
    // that entry. If these two were ever equal the bug would be back.
    for (const layer of vectors) {
      expect(vectorDataUrl(layer.url), layer.id).not.toBe(layer.url)
    }
  })

  it('keeps the path intact, changing only the query', () => {
    // The server resolves `layer.url` against the filesystem, so anything that
    // altered the path itself would turn a cache fix into a 404.
    for (const layer of vectors) {
      const [path] = vectorDataUrl(layer.url).split('?')
      expect(path, layer.id).toBe(layer.url)
    }
  })

  it('appends to a URL that already carries a query', () => {
    expect(vectorDataUrl('/data/vector/x.geojson?a=1')).toMatch(
      /^\/data\/vector\/x\.geojson\?a=1&v=\d+$/,
    )
  })
})
