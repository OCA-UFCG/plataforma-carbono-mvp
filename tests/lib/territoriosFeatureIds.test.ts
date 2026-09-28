import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { listFeicoes } from '@/lib/mapa/recorteRegistry'
import { displayName, featureEntries, labelFieldOf, type FeatureLike } from '@/lib/territorios/featureIds'
import type { VectorLayerConfig } from '@/types/mapa'

// The chooser runs featureEntries over the file the browser downloads and sends
// the id to /api/territorios/territorio, which resolves it with the registry.
// Reading here the file the browser downloads, not the one the registry picks,
// is what proves the two never disagree.

const RECORTES = ['bioma', 'estados', 'municipios', 'terras_indigenas', 'quilombolas', 'assentamentos']

function layerOf(id: string): VectorLayerConfig {
  const layer = (appConfig.layers as VectorLayerConfig[]).find((l) => l.id === id && l.type === 'vector')
  if (!layer) throw new Error(`No vector layer ${id}`)
  return layer
}

/**
 * The chooser's file, `layer.url`, for every recorte it opens. The biome never
 * reaches the chooser; for it, the `_clip` file the registry prefers.
 */
function featuresOf(layer: VectorLayerConfig): FeatureLike[] {
  const clip = `public${layer.url.replace(/\.geojson$/, '_clip.geojson')}`
  const file = layer.id === 'bioma' && existsSync(clip) ? clip : `public${layer.url}`
  return (JSON.parse(readFileSync(file, 'utf8')) as { features: FeatureLike[] }).features
}

const square = (x: number, y: number) => ({
  type: 'Polygon',
  coordinates: [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]],
})

const fields = { labelField: 'nome', contextField: 'uf', layerName: 'Municípios' }

describe('featureEntries against the registry', () => {
  it.each(RECORTES)('gives %s the ids, names and states the registry serves, in the same order', (recorteId) => {
    const layer = layerOf(recorteId)
    const labelField = labelFieldOf(layer)!
    const entries = featureEntries(featuresOf(layer), {
      labelField,
      contextField: layer.contextField,
      layerName:    layer.name,
    })

    expect(entries.map(({ id, name, context }) => ({ id, name, ...(context ? { context } : {}) })))
      .toEqual(listFeicoes(recorteId))
  })

  it.each(RECORTES.filter((id) => id !== 'bioma'))('keeps on %s the file position MapLibre ids the feature by', (recorteId) => {
    const layer = layerOf(recorteId)
    const labelField = labelFieldOf(layer)!
    const features = featuresOf(layer)
    const entries = featureEntries(features, { labelField, contextField: layer.contextField })

    for (const entry of entries) {
      expect(String(features[entry.index].properties?.[labelField]).trim()).toBe(entry.name)
    }
  })
})

describe('featureEntries', () => {
  it('suffixes homonyms in file order, the first keeping the bare slug', () => {
    const entries = featureEntries([
      { geometry: square(0, 0), properties: { nome: 'Bom Jesus', uf: 'PI' } },
      { geometry: square(2, 0), properties: { nome: 'Campina Grande', uf: 'PB' } },
      { geometry: square(4, 0), properties: { nome: 'Bom Jesus', uf: 'RN' } },
      { geometry: square(6, 0), properties: { nome: 'BOM JESUS', uf: 'PB' } },
    ], fields)

    expect(entries.map((e) => [e.id, e.context])).toEqual([
      ['bom-jesus', 'PI'], ['campina-grande', 'PB'], ['bom-jesus-2', 'RN'], ['bom-jesus-3', 'PB'],
    ])
  })

  it('skips a feature with no polygon or no label without spending a suffix or shifting the index', () => {
    const entries = featureEntries([
      { geometry: { type: 'Point', coordinates: [0, 0] }, properties: { nome: 'Sousa' } },
      { geometry: null, properties: { nome: 'Sousa' } },
      { geometry: square(0, 0), properties: { nome: '   ' } },
      { geometry: square(0, 0), properties: { nome: '---' } },
      { geometry: square(0, 0), properties: null },
      { geometry: square(0, 0), properties: { nome: ' Sousa ' } },
    ], fields)

    expect(entries).toEqual([{ index: 5, id: 'sousa', name: 'Sousa', geometry: square(0, 0) }])
  })

  it('reads the polygon inside a GeometryCollection', () => {
    const [entry] = featureEntries([{
      geometry: {
        type: 'GeometryCollection',
        geometries: [{ type: 'LineString', coordinates: [[0, 0], [1, 1]] }, square(0, 0)],
      },
      properties: { nome: 'Patos' },
    }], fields)

    expect(entry.geometry).toEqual(square(0, 0))
  })

  it('names an unlabelled single feature after its layer, and only a single one', () => {
    expect(featureEntries([{ geometry: square(0, 0), properties: {} }], fields).map((e) => e.id))
      .toEqual(['municipios'])
    expect(featureEntries([
      { geometry: square(0, 0), properties: {} },
      { geometry: square(2, 0), properties: {} },
    ], fields)).toEqual([])
  })
})

describe('displayName', () => {
  it('drops the "PA" of a settlement label in capitals and writes it in title case', () => {
    expect(displayName('PA CANDIDO GREGÓRIO')).toBe('Candido Gregório')
    expect(displayName('PA 19 DE MARCO')).toBe('19 de Marco')
    expect(displayName('PA SÃO JOSÉ/CAMPO GRANDE II')).toBe('São José/Campo Grande II')
    expect(displayName('PA ANGICO BRANCO I e II')).toBe('Angico Branco I e II')
    expect(displayName('PA - AGUA BRANCA-II/REMANSO')).toBe('Agua Branca-II/Remanso')
    expect(displayName('PAQ ESP. QUILOMBOLA RUMO AO RIO')).toBe('PAQ Esp. Quilombola Rumo ao Rio')
  })

  it('leaves a label in mixed case as it is', () => {
    expect(displayName('Campina Grande')).toBe('Campina Grande')
    expect(displayName('PA. Riacho dos Bois I')).toBe('Riacho dos Bois I')
    expect(displayName('Olhos Dagua do Basílio')).toBe('Olhos Dagua do Basílio')
  })
})
