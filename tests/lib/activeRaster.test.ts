import { describe, expect, it } from 'vitest'
import { activeRaster, type ActiveRasterInput } from '@/lib/mapa/activeRaster'
import { recorteScaleKey } from '@/lib/mapa/recorteScale'
import type { SelectedGeometry } from '@/types/mapa'

const polygon = { type: 'Polygon' as const, coordinates: [[[-40, -8], [-40, -7], [-39, -7], [-40, -8]]] }
const campina = { recorteId: 'municipios', feicaoIndex: 120, name: 'Campina Grande' }
const selected: SelectedGeometry = { geometry: polygon, geometryType: 'polygon', recorte: campina }
const drawn: SelectedGeometry = { geometry: polygon, geometryType: 'polygon' }
const stretch = { min: 10, max: 40 }
const key = (layerId: string, feicaoIndex = 120) => recorteScaleKey(layerId, 'municipios', feicaoIndex)

const input = (over: Partial<ActiveRasterInput> = {}): ActiveRasterInput => ({
  selectedGeometry: null,
  temporalDate: {},
  fetchedTileUrls: { estoque: 'biome-static' },
  temporalTileUrls: { gpp: { '2010-01-01': 'biome-2010', '2024-01-01': 'biome-2024' } },
  recorteScales: {},
  recorteTileUrls: {},
  ...over,
})

describe('activeRaster', () => {
  it('shows the biome tile without a selection', () => {
    expect(activeRaster(input(), 'estoque')).toEqual({ tileUrl: 'biome-static', scale: null })
    expect(activeRaster(input({ temporalDate: { gpp: '2010-01-01' } }), 'gpp'))
      .toEqual({ tileUrl: 'biome-2010', scale: null })
  })

  it('shows the biome tile for a drawn area, which carries no recorte', () => {
    expect(activeRaster(input({
      selectedGeometry: drawn,
      recorteScales: { [key('estoque')]: { status: 'ready', stretch, range: null } },
      recorteTileUrls: { [key('estoque')]: { static: 'recorte-static' } },
    }), 'estoque').tileUrl).toBe('biome-static')
  })

  it('keeps the biome tile while the scale loads, after a failure and for a degenerate scale', () => {
    for (const entry of [
      { status: 'loading' as const },
      { status: 'error' as const },
      { status: 'ready' as const, stretch: null, range: null },
    ]) {
      expect(activeRaster(input({
        selectedGeometry: selected,
        recorteScales: { [key('estoque')]: entry },
        recorteTileUrls: { [key('estoque')]: { static: 'recorte-static' } },
      }), 'estoque')).toEqual({ tileUrl: 'biome-static', scale: null })
    }
  })

  it('keeps the biome tile until the recorte tile arrives', () => {
    expect(activeRaster(input({
      selectedGeometry: selected,
      recorteScales: { [key('estoque')]: { status: 'ready', stretch, range: null } },
    }), 'estoque')).toEqual({ tileUrl: 'biome-static', scale: null })
  })

  it("shows the recorte tile and scale, named after the feature, once both are ready", () => {
    const range = { min: 2, max: 55 }
    expect(activeRaster(input({
      selectedGeometry: selected,
      recorteScales: { [key('estoque')]: { status: 'ready', stretch, range } },
      recorteTileUrls: { [key('estoque')]: { static: 'recorte-static' } },
    }), 'estoque')).toEqual({
      tileUrl: 'recorte-static',
      scale: { stretch, range, recorteName: 'Campina Grande' },
    })
  })

  it('shows the biome tile of a year stepped before its recorte tile exists', () => {
    expect(activeRaster(input({
      selectedGeometry: selected,
      temporalDate: { gpp: '2010-01-01' },
      recorteScales: { [key('gpp')]: { status: 'ready', stretch, range: null } },
      recorteTileUrls: { [key('gpp')]: { '2024-01-01': 'recorte-2024' } },
    }), 'gpp')).toEqual({ tileUrl: 'biome-2010', scale: null })
  })

  it("never shows another feature's scale", () => {
    expect(activeRaster(input({
      selectedGeometry: selected,
      recorteScales: { [key('estoque', 7)]: { status: 'ready', stretch, range: null } },
      recorteTileUrls: { [key('estoque', 7)]: { static: 'patos-static' } },
    }), 'estoque')).toEqual({ tileUrl: 'biome-static', scale: null })
  })
})
