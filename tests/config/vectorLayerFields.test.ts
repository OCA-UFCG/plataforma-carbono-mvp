import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import type { LayerConfig, VectorLayerConfig } from '@/types/mapa'

// layers.json names the GeoJSON properties the map and the search read, but
// nothing used to check that the shipped files actually carry them. That gap is
// what made the states break silently: the config asked for `name_state` while
// the file the client held had only `abbrev_state`, and every code path answers
// a missing property by falling back -- the hover popup to nothing, the analysis
// label and the report to the layer name, so all ten states read "Estados".
// A missing property is never an error anywhere, so only a test can catch it.

const vectors = (appConfig.layers as LayerConfig[]).filter(
  (l): l is VectorLayerConfig => l.type === 'vector',
)

/** Only plain GeoJSON layers can be read off disk; pmtiles/wfs are remote. */
const fileBacked = vectors.filter((l) => !l.source && l.url.endsWith('.geojson'))

function propertiesOf(layer: VectorLayerConfig): Record<string, unknown>[] {
  const fc = JSON.parse(readFileSync(`public${layer.url}`, 'utf8')) as GeoJSON.FeatureCollection
  return fc.features.map((f) => (f.properties ?? {}) as Record<string, unknown>)
}

describe('every property layers.json names exists in the shipped GeoJSON', () => {
  it('covers the layers this test can reach', () => {
    expect(fileBacked.length).toBeGreaterThan(0)
  })

  it('has the label the map and the report name a feature by', () => {
    for (const layer of fileBacked) {
      const field = layer.labelField ?? layer.hoverLabelField
      if (!field) continue
      const props = propertiesOf(layer)

      // The biome is the documented exception: its simplified file has empty
      // properties and recorteRegistry names that single feature after the
      // layer on purpose.
      if (props.length === 1) continue

      const missing = props.filter((p) => typeof p[field] !== 'string' || !p[field])
      expect(missing.length, `${layer.id}: ${missing.length}/${props.length} features lack "${field}"`).toBe(0)
    }
  })

  it('has the context that tells homonymous features apart', () => {
    for (const layer of fileBacked) {
      if (!layer.contextField) continue
      const props = propertiesOf(layer)
      const field = layer.contextField

      const missing = props.filter((p) => typeof p[field] !== 'string' || !p[field])
      expect(missing.length, `${layer.id}: ${missing.length}/${props.length} features lack "${field}"`).toBe(0)
    }
  })
})
