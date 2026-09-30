import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { THEMES } from '@/config/mapa/groups'
import {
  DEFAULT_SUBTHEME_ORDER, DEFAULT_THEME_ORDER, applyGroupOrder, moveInList, orderThemes,
  sanitizeSubthemeOrder, sanitizeThemeOrder,
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
    const lastVector = once.map((layer) => layer.type).lastIndexOf('vector')
    expect(once.findIndex((layer) => layer.type === 'raster')).toBe(lastVector + 1)
    expect(applyGroupOrder(once, DEFAULT_THEME_ORDER, DEFAULT_SUBTHEME_ORDER)).toBe(once)
    // Every raster belongs to a known group, so none is silently sorted last.
    for (const layer of once.filter((l) => l.type === 'raster')) {
      expect(DEFAULT_THEME_ORDER).toContain(layer.theme)
      expect(DEFAULT_SUBTHEME_ORDER[layer.theme!]).toContain(layer.subtheme)
    }
  })
})

describe('default orders', () => {
  it('follow groups.ts, without Território', () => {
    expect(DEFAULT_THEME_ORDER).toEqual(['carbono', 'uso_solo', 'ambiente'])
    expect(DEFAULT_SUBTHEME_ORDER.carbono[0]).toBe('estoques')
    expect(DEFAULT_SUBTHEME_ORDER.territorio).toBeUndefined()
  })
})

describe('sanitizeThemeOrder', () => {
  it('keeps a valid stored order', () => {
    expect(sanitizeThemeOrder(['ambiente', 'carbono', 'uso_solo'])).toEqual(['ambiente', 'carbono', 'uso_solo'])
  })

  it('drops unknown ids, duplicates and Território, and appends what is missing', () => {
    expect(sanitizeThemeOrder(['uso_solo', 'territorio', 'x', 'uso_solo', 42])).toEqual(['uso_solo', 'carbono', 'ambiente'])
  })

  it('falls back to the default for anything that is not a list', () => {
    expect(sanitizeThemeOrder(undefined)).toEqual(DEFAULT_THEME_ORDER)
    expect(sanitizeThemeOrder({ carbono: 1 })).toEqual(DEFAULT_THEME_ORDER)
  })
})

describe('sanitizeSubthemeOrder', () => {
  it('sanitizes each theme and fills the ones not stored', () => {
    const out = sanitizeSubthemeOrder({ carbono: ['solo', 'estoques', 'nope'], territorio: ['limites'] })
    expect(out.carbono.slice(0, 3)).toEqual(['solo', 'estoques', 'reservatorios'])
    expect(out.carbono).toHaveLength(DEFAULT_SUBTHEME_ORDER.carbono.length)
    expect(out.uso_solo).toEqual(DEFAULT_SUBTHEME_ORDER.uso_solo)
    expect(out.territorio).toBeUndefined()
  })

  it('falls back to the default for anything that is not a record', () => {
    expect(sanitizeSubthemeOrder(['carbono'])).toEqual(DEFAULT_SUBTHEME_ORDER)
    expect(sanitizeSubthemeOrder(null)).toEqual(DEFAULT_SUBTHEME_ORDER)
  })
})

describe('orderThemes', () => {
  it('keeps Território first and orders the rest, subthemes included', () => {
    const out = orderThemes(THEMES, ['ambiente', 'carbono', 'uso_solo'], {
      ...DEFAULT_SUBTHEME_ORDER,
      ambiente: ['clima', 'vegetacao'],
    })
    expect(out.map((theme) => theme.id)).toEqual(['territorio', 'ambiente', 'carbono', 'uso_solo'])
    expect(out[1].subthemes.map((subtheme) => subtheme.id)).toEqual(['clima', 'vegetacao'])
  })
})
