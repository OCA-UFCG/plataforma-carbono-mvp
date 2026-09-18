import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import type { LayerConfig, RasterLayerConfig } from '@/types/mapa'

// A categorical raster carries its colors twice: the palette Earth Engine paints
// the tile with, indexed by pixel value from `min`, and the `classes` list the
// legend and the charts read. Nothing ties the two together at runtime, so
// inserting a class or reordering the palette shifts every code after it and the
// map paints one class where the legend and the chart name another, with no
// error anywhere.

const categorical = (appConfig.layers as LayerConfig[]).filter(
  (l): l is RasterLayerConfig => l.type === 'raster' && l.colorType === 'categorical' && !!l.classes?.length,
)

/** The value range the tile route hands to getMap: a classified layer is
 * repainted as codes 1..numClasses, the rest use their own visParams. */
function paintedRange(layer: RasterLayerConfig): [number, number] {
  const classify = layer.gee?.classify
  if (classify) return [1, classify.numClasses]
  return [layer.gee?.visParams?.min ?? NaN, layer.gee?.visParams?.max ?? NaN]
}

describe('the palette of a categorical raster agrees with its legend', () => {
  it('covers the categorical layers', () => {
    expect(categorical.length).toBeGreaterThan(0)
  })

  it('has one palette slot per code in the painted range', () => {
    for (const layer of categorical) {
      const [min, max] = paintedRange(layer)
      const palette = layer.gee?.visParams?.palette ?? []
      expect(Number.isInteger(min) && Number.isInteger(max), `${layer.id}: no integer min/max`).toBe(true)
      expect(palette.length, `${layer.id}: palette length`).toBe(max - min + 1)
    }
  })

  it('paints every class with the color its legend shows', () => {
    for (const layer of categorical) {
      const [min, max] = paintedRange(layer)
      const palette = layer.gee?.visParams?.palette ?? []
      for (const c of layer.classes ?? []) {
        expect(c.value >= min && c.value <= max, `${layer.id}: class ${c.value} outside ${min}..${max}`).toBe(true)
        expect(palette[c.value - min]?.toLowerCase(), `${layer.id}: class ${c.value} "${c.label}"`).toBe(
          c.color.toLowerCase(),
        )
      }
    }
  })

  it('declares each code once', () => {
    for (const layer of categorical) {
      const values = (layer.classes ?? []).map((c) => c.value)
      expect(new Set(values).size, `${layer.id}: repeated class value`).toBe(values.length)
    }
  })
})
