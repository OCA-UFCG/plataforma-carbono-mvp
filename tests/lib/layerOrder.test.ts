import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import {
  DEFAULT_LAYER_ORDER, DEFAULT_SUBTHEME_ORDER, DEFAULT_THEME_ORDER, applyGroupOrder, applyLayerOrder,
  layerOrderFromGroups, moveInList, sanitizeLayerOrder, sanitizeSubthemeOrder, sanitizeThemeOrder,
} from '@/lib/mapa/layerOrder'
import type { LayerConfig } from '@/types/mapa'

const vector = (id: string): LayerConfig => ({
  id, name: id, type: 'vector', url: `/data/${id}.geojson`, visible: true, opacity: 80,
  color: '#000', theme: 'territorio', subtheme: 'limites',
})
const raster = (id: string, theme: string, subtheme: string): LayerConfig => ({
  id, name: id, type: 'raster', visible: false, opacity: 80, colorType: 'continuous', theme, subtheme,
})
const ids = (layers: LayerConfig[]) => layers.map((layer) => layer.id)

describe('moveInList', () => {
  const list = ['a', 'b', 'c', 'd']

  it('moves an item up, in front of beforeId', () => {
    expect(moveInList(list, 'd', 'b')).toEqual(['a', 'd', 'b', 'c'])
  })

  it('moves an item down, in front of beforeId', () => {
    expect(moveInList(list, 'a', 'd')).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item to the end with null', () => {
    expect(moveInList(list, 'b', null)).toEqual(['a', 'c', 'd', 'b'])
  })

  it('returns the same array when the item keeps its slot', () => {
    expect(moveInList(list, 'b', 'b')).toBe(list)
    expect(moveInList(list, 'b', 'c')).toBe(list)
    expect(moveInList(list, 'd', null)).toBe(list)
  })

  it('returns the same array for an unknown id or beforeId', () => {
    expect(moveInList(list, 'x', 'a')).toBe(list)
    expect(moveInList(list, 'a', 'x')).toBe(list)
  })
})

describe('applyGroupOrder', () => {
  const bioma = vector('bioma')
  const estados = vector('estados')
  const a1 = raster('a1', 'A', 's1')
  const a2 = raster('a2', 'A', 's2')
  const b1 = raster('b1', 'B', 's1')
  const b1bis = raster('b1bis', 'B', 's1')
  const catalog = [bioma, estados, a1, a2, b1, b1bis]

  it('puts the vectors on top in catalog order, then rasters by theme and subtheme', () => {
    const layers = [b1, estados, a2, bioma, a1]
    const out = applyGroupOrder(layers, ['B', 'A'], { A: ['s2', 's1'], B: ['s1'] }, catalog)
    expect(ids(out)).toEqual(['bioma', 'estados', 'b1', 'a2', 'a1'])
  })

  it('breaks ties inside a subtheme by catalog order', () => {
    const out = applyGroupOrder([b1bis, b1], ['A', 'B'], { A: [], B: ['s1'] }, catalog)
    expect(ids(out)).toEqual(['b1', 'b1bis'])
  })

  it('draws an overlay above the other layers of its subtheme, wherever the catalog lists it', () => {
    const shade = { ...raster('shade', 'B', 's1'), overlay: true } as LayerConfig
    const out = applyGroupOrder([b1, a1, shade, b1bis], ['B', 'A'], { A: ['s1'], B: ['s1'] }, [...catalog, shade])
    expect(ids(out)).toEqual(['shade', 'b1', 'b1bis', 'a1'])
  })

  it('returns the same array when the order already holds', () => {
    const layers = [bioma, estados, a1, a2, b1]
    expect(applyGroupOrder(layers, ['A', 'B'], { A: ['s1', 's2'], B: ['s1'] }, catalog)).toBe(layers)
  })

  it('sorts a theme or subtheme missing from the orders after the known ones', () => {
    const stray = raster('stray', 'Z', 's9')
    const out = applyGroupOrder([stray, a1, b1], ['A', 'B'], { A: ['s1'], B: ['s1'] }, [...catalog, stray])
    expect(ids(out)).toEqual(['a1', 'b1', 'stray'])
  })

  it('holds for config/mapa/layers.json with the default orders', () => {
    const config = appConfig.layers as LayerConfig[]
    const once = applyGroupOrder(config, DEFAULT_THEME_ORDER, DEFAULT_SUBTHEME_ORDER)
    // No layer type is dropped: the emissions layers sort with the rasters.
    expect(once).toHaveLength(config.length)
    expect(once.some((layer) => layer.type === 'emissions')).toBe(true)
    const lastVector = once.map((layer) => layer.type).lastIndexOf('vector')
    expect(once.findIndex((layer) => layer.type !== 'vector')).toBe(lastVector + 1)
    expect(applyGroupOrder(once, DEFAULT_THEME_ORDER, DEFAULT_SUBTHEME_ORDER)).toBe(once)
    // Every thematic layer belongs to a known group, so none is silently sorted last.
    for (const layer of once.filter((l) => l.type !== 'vector')) {
      expect(DEFAULT_THEME_ORDER).toContain(layer.theme)
      expect(DEFAULT_SUBTHEME_ORDER[layer.theme!]).toContain(layer.subtheme)
    }
  })

  it('draws the monitoring sites above the polygon recortes and the hillshades above altitude and slope', () => {
    const order = ids(applyGroupOrder(appConfig.layers as LayerConfig[], DEFAULT_THEME_ORDER, DEFAULT_SUBTHEME_ORDER))
    const above = (top: string, below: string) => expect(order.indexOf(top), `${top} over ${below}`).toBeLessThan(order.indexOf(below))
    above('areas_monitoramento', 'bioma')
    for (const overlay of ['hillshade_fabdem', 'sombreado_terreno']) {
      above(overlay, 'altitude_fabdem')
      above(overlay, 'declividade_fabdem')
    }
  })
})

describe('default orders', () => {
  it('follow groups.ts, without Território', () => {
    expect(DEFAULT_THEME_ORDER).toEqual(['carbono', 'uso_solo', 'ambiente', 'localidades'])
    expect(DEFAULT_SUBTHEME_ORDER.carbono[0]).toBe('estoques')
    expect(DEFAULT_SUBTHEME_ORDER.territorio).toBeUndefined()
  })
})

describe('sanitizeThemeOrder', () => {
  it('keeps a valid stored order', () => {
    expect(sanitizeThemeOrder(['ambiente', 'carbono', 'uso_solo', 'localidades'])).toEqual(['ambiente', 'carbono', 'uso_solo', 'localidades'])
  })

  it('drops unknown ids, duplicates and Território, and appends what is missing', () => {
    expect(sanitizeThemeOrder(['uso_solo', 'territorio', 'x', 'uso_solo', 42])).toEqual(['uso_solo', 'carbono', 'ambiente', 'localidades'])
  })

  it('falls back to the default for anything that is not a list', () => {
    expect(sanitizeThemeOrder(undefined)).toEqual(DEFAULT_THEME_ORDER)
    expect(sanitizeThemeOrder({ carbono: 1 })).toEqual(DEFAULT_THEME_ORDER)
  })
})

describe('sanitizeSubthemeOrder', () => {
  it('sanitizes each theme and fills the ones not stored', () => {
    const out = sanitizeSubthemeOrder({ carbono: ['fluxos', 'estoques', 'nope'], territorio: ['limites'] })
    expect(out.carbono.slice(0, 3)).toEqual(['fluxos', 'estoques', 'estrutura'])
    expect(out.carbono).toHaveLength(DEFAULT_SUBTHEME_ORDER.carbono.length)
    expect(out.uso_solo).toEqual(DEFAULT_SUBTHEME_ORDER.uso_solo)
    expect(out.territorio).toBeUndefined()
  })

  it('falls back to the default for anything that is not a record', () => {
    expect(sanitizeSubthemeOrder(['carbono'])).toEqual(DEFAULT_SUBTHEME_ORDER)
    expect(sanitizeSubthemeOrder(null)).toEqual(DEFAULT_SUBTHEME_ORDER)
  })
})

describe('applyLayerOrder', () => {
  const bioma = vector('bioma')
  const estados = vector('estados')
  const a1 = raster('a1', 'A', 's1')
  const a2 = raster('a2', 'A', 's2')
  const b1 = raster('b1', 'B', 's1')
  const catalog = [bioma, estados, a1, a2, b1]

  it('puts the vectors on top in the layer order, then the thematic layers in it', () => {
    const out = applyLayerOrder([b1, estados, a2, bioma, a1], ['estados', 'bioma', 'b1', 'a1', 'a2'], catalog)
    expect(ids(out)).toEqual(['estados', 'bioma', 'b1', 'a1', 'a2'])
  })

  it('keeps the vectors on top where the order lists a thematic layer before them', () => {
    const out = applyLayerOrder([b1, estados, a2, bioma, a1], ['b1', 'estados', 'a1', 'bioma', 'a2'], catalog)
    expect(ids(out)).toEqual(['estados', 'bioma', 'b1', 'a1', 'a2'])
  })

  it('sorts a layer missing from the order after the known ones, by catalog', () => {
    expect(ids(applyLayerOrder([b1, a2, a1], ['b1'], catalog))).toEqual(['b1', 'a1', 'a2'])
    expect(ids(applyLayerOrder([estados, bioma], [], catalog))).toEqual(['bioma', 'estados'])
  })

  it('returns the same array when the order already holds', () => {
    const layers = [estados, bioma, a1, a2, b1]
    expect(applyLayerOrder(layers, ['estados', 'bioma', 'a1', 'a2', 'b1'], catalog)).toBe(layers)
  })

  it('draws config/mapa/layers.json by default as the group order did', () => {
    const config = appConfig.layers as LayerConfig[]
    expect(ids(applyLayerOrder(config, DEFAULT_LAYER_ORDER)))
      .toEqual(ids(applyGroupOrder(config, DEFAULT_THEME_ORDER, DEFAULT_SUBTHEME_ORDER)))
  })
})

describe('DEFAULT_LAYER_ORDER', () => {
  it('lists every layer of layers.json once, emissions included', () => {
    const config = appConfig.layers as LayerConfig[]
    expect([...DEFAULT_LAYER_ORDER].sort()).toEqual(config.map((layer) => layer.id).sort())
    expect(config.some((layer) => layer.type === 'emissions' && DEFAULT_LAYER_ORDER.includes(layer.id))).toBe(true)
  })

  it('starts with the recortes in catalog order, so the map opens drawn as layers.json lists them', () => {
    const config = appConfig.layers as LayerConfig[]
    const vectors = config.filter((layer) => layer.type === 'vector').map((layer) => layer.id)
    expect(DEFAULT_LAYER_ORDER.slice(0, vectors.length)).toEqual(vectors)
  })
})

describe('layerOrderFromGroups', () => {
  it('turns a stored theme and subtheme order into the layer order it drew', () => {
    const order = layerOrderFromGroups(['uso_solo', 'carbono', 'ambiente', 'localidades'], DEFAULT_SUBTHEME_ORDER)
    expect(order.indexOf('lulc_mapbiomas')).toBeLessThan(order.indexOf('biomassa_gedi'))
    expect([...order].sort()).toEqual([...DEFAULT_LAYER_ORDER].sort())
  })

  it('gives the default order when nothing was stored', () => {
    expect(layerOrderFromGroups(undefined, undefined)).toEqual(DEFAULT_LAYER_ORDER)
  })

  it('keeps the recortes first, in catalog order, as that order drew them', () => {
    const order = layerOrderFromGroups(['uso_solo', 'carbono', 'ambiente', 'localidades'], DEFAULT_SUBTHEME_ORDER)
    expect(order.slice(0, 3)).toEqual(['areas_monitoramento', 'bioma', 'estados'])
  })
})

describe('sanitizeLayerOrder', () => {
  it('keeps a valid stored order', () => {
    const swapped = [DEFAULT_LAYER_ORDER[1], DEFAULT_LAYER_ORDER[0], ...DEFAULT_LAYER_ORDER.slice(2)]
    expect(sanitizeLayerOrder(swapped)).toEqual(swapped)
  })

  it('drops unknown ids and duplicates, and appends the layers missing', () => {
    const out = sanitizeLayerOrder(['municipios', 'gone', 'municipios', 42])
    expect(out[0]).toBe('municipios')
    expect(out).not.toContain('gone')
    expect(out).toHaveLength(DEFAULT_LAYER_ORDER.length)
    expect(out.slice(1)).toEqual(DEFAULT_LAYER_ORDER.filter((id) => id !== 'municipios'))
  })

  it('falls back to the default for anything that is not a list', () => {
    expect(sanitizeLayerOrder(undefined)).toBe(DEFAULT_LAYER_ORDER)
    expect(sanitizeLayerOrder({ a: 1 })).toBe(DEFAULT_LAYER_ORDER)
  })
})
