import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { LAND_USE_GROUPS, landUseGroupOf } from '@/config/territorios/landUseGroups'
import { DEGRADATION_COLORS, FLUX_COLORS } from '@/config/territorios/palette'
import { STORY_THEMES } from '@/config/territorios/story'
import { isValidClassify, isValidVisParams } from '@/lib/mapa/geeValidation'
import {
  CAATINGA_BBOX,
  RAIN_MIN_SPAN_DEG,
  bboxSpanPx,
  frameBbox,
  frameOf,
  themeLegend,
  themeRaster,
  tileRequestKey,
} from '@/lib/territorios/mapStyle'
import type { RasterLayerConfig } from '@/types/mapa'

const layer = (id: string) => (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === id)!

/** The color Earth Engine paints for an integer value: min..max spread evenly over the palette. */
function paintedColor(vis: { min: number; max: number; palette: string[] }, value: number): string {
  const t = (value - vis.min) / (vis.max - vis.min)
  const position = t * (vis.palette.length - 1)
  const index = Math.round(position)
  // On a palette entry exactly, not blended between two.
  expect(Math.abs(position - index)).toBeLessThan(1e-9)
  return vis.palette[index]
}

describe('land use raster', () => {
  const { visParams } = themeRaster('uso').request
  const classes = layer('lulc_mapbiomas').classes!

  it('paints every class of lulc_mapbiomas in the color of its group', () => {
    for (const cls of classes) {
      expect(paintedColor(visParams, cls.value), `code ${cls.value}`).toBe(landUseGroupOf(cls.value).color)
    }
  })

  it('lists in the legend the groups the raster paints, with their chart labels and colors', () => {
    const legend = themeLegend('uso')
    expect(legend.kind).toBe('classes')
    if (legend.kind !== 'classes') return
    const painted = new Set(classes.map((c) => landUseGroupOf(c.value).id))
    const expected = LAND_USE_GROUPS.filter((g) => painted.has(g.id))
    expect(legend.items.map((i) => [i.label, i.color])).toEqual(expected.map((g) => [g.label, g.color]))
  })

  it('requests the band of the year asked for', () => {
    expect(themeRaster('uso').request.temporalDate).toBe('2024-01-01')
    expect(themeRaster('uso', '1985').request.temporalDate).toBe('1985-01-01')
  })
})

describe('degradation raster', () => {
  const { request } = themeRaster('degradacao')

  it('paints each class code in its degradation color', () => {
    for (const code of [0, 1, 2, 3, 4, 5, 6]) {
      expect(paintedColor(request.visParams, code), `code ${code}`).toBe(DEGRADATION_COLORS[code])
    }
  })

  it('fills the masked pixels with code 0, the "Sem dado" share of the chart', () => {
    expect(request.asset.unmaskValue).toBe(0)
  })

  it('reads Conservado first and "Sem dado" last in the legend', () => {
    const legend = themeLegend('degradacao')
    if (legend.kind !== 'classes') throw new Error('expected classes')
    expect(legend.items.map((i) => i.label)).toEqual([
      'Conservado', 'Nível 1 (leve)', 'Nível 2', 'Nível 3', 'Nível 4', 'Nível 5 (grave)', 'Sem dado',
    ])
    expect(legend.items.map((i) => i.color)).toEqual([6, 5, 4, 3, 2, 1, 0].map((c) => DEGRADATION_COLORS[c]))
    // Flat, as the raster paints code 0; only the chart hatches it.
    expect(legend.items.at(-1)).not.toHaveProperty('hatched')
  })
})

describe('flux raster', () => {
  it('paints removals and emissions in two flat colors split at zero', () => {
    const { visParams } = themeRaster('fluxo').request
    expect(visParams.palette).toEqual([FLUX_COLORS.removal, FLUX_COLORS.emission])
    expect(visParams.min).toBeLessThan(0)
    expect(visParams.max).toBeGreaterThan(0)
    // A pixel holds tens of Mg CO2e/ha; the blend band around zero must be far narrower.
    expect(visParams.max - visParams.min).toBeLessThan(0.01)
  })
})

describe('every theme', () => {
  it('sends visParams and classify the tile route accepts', () => {
    for (const theme of STORY_THEMES) {
      const { request } = themeRaster(theme.id)
      expect(isValidVisParams(request.visParams), theme.id).toBe(true)
      expect(isValidClassify(request.classify), theme.id).toBe(true)
    }
  })

  it('keeps the layer visParams for stock and rain', () => {
    for (const [theme, id] of [['estoque', 'estoque_carbono'], ['chuva', 'chirps_precip']] as const) {
      expect(themeRaster(theme).request.visParams).toEqual(layer(id).gee!.visParams)
    }
  })

  it('gives a distinct cache key to each palette and year', () => {
    const keys = [
      ...STORY_THEMES.map((t) => tileRequestKey(themeRaster(t.id).request)),
      tileRequestKey(themeRaster('uso', '1985').request),
    ]
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('leaves the WebSIG palette of the class layers untouched', () => {
    // The server caches tile URLs by visParams too, so a different palette is a different map.
    for (const [theme, id] of [['uso', 'lulc_mapbiomas'], ['degradacao', 'degradacao_terra'], ['fluxo', 'gfw_netflux']] as const) {
      expect(themeRaster(theme).request.visParams).not.toEqual(layer(id).gee!.visParams)
    }
  })
})

describe('framing', () => {
  const campinaGrande: [number, number, number, number] = [-36.12386, -7.38712, -35.70432, -7.15422]

  it('shows the whole biome on the territory step and the territory from the stock step on', () => {
    expect(frameBbox(frameOf('territorio'), campinaGrande)).toEqual(CAATINGA_BBOX)
    expect(frameBbox(frameOf('estoque'), campinaGrande)).toEqual(campinaGrande)
  })

  it('widens a small territory on the rain step around its center', () => {
    const [minX, minY, maxX, maxY] = frameBbox(frameOf('chuva'), campinaGrande)
    expect(maxX - minX).toBeCloseTo(RAIN_MIN_SPAN_DEG)
    expect(maxY - minY).toBeCloseTo(RAIN_MIN_SPAN_DEG)
    expect((minX + maxX) / 2).toBeCloseTo((campinaGrande[0] + campinaGrande[2]) / 2)
    expect(frameBbox('entorno', CAATINGA_BBOX)).toEqual(CAATINGA_BBOX)
  })

  it('measures a territory on screen', () => {
    // At zoom 0 the 512 px world spans 360 degrees of longitude.
    expect(bboxSpanPx([0, 0, 90, 1], 0)).toBeCloseTo(128)
    expect(bboxSpanPx(campinaGrande, 6)).toBeLessThan(bboxSpanPx(campinaGrande, 7))
  })
})
