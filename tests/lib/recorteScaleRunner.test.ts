import { describe, expect, it } from 'vitest'
import { pendingRecorteWork, type PendingRecorteInput } from '@/lib/mapa/recorteScaleRunner'
import { recorteScaleKey } from '@/lib/mapa/recorteScale'
import type { LayerConfig, RasterLayerConfig, SelectedRecorte } from '@/types/mapa'

const raster = (id: string, over: Partial<RasterLayerConfig> = {}): RasterLayerConfig => ({
  id, name: id, type: 'raster', visible: true, opacity: 80,
  colorType: 'continuous', source: 'gee', clipToLayerId: 'bioma',
  gee: { asset: { type: 'image', id: `projects/x/${id}` }, visParams: { min: 0, max: 100 } },
  ...over,
})
const temporal = (id: string) => raster(id, {
  gee: {
    asset: { type: 'imageCollection', id: `projects/x/${id}` },
    visParams: { min: 0, max: 100 },
    temporal: { dateRange: ['2001-01-01', '2024-01-01'] },
  },
})

const campina: SelectedRecorte = { recorteId: 'municipios', feicaoIndex: 120, name: 'Campina Grande' }
const keyOf = (layerId: string, recorte = campina) =>
  recorteScaleKey(layerId, recorte.recorteId, recorte.feicaoIndex)

const input = (over: Partial<PendingRecorteInput> = {}): PendingRecorteInput => ({
  layers: [] as LayerConfig[],
  recorte: campina,
  temporalDate: {},
  recorteScales: {},
  recorteTileUrls: {},
  inFlightTiles: new Set<string>(),
  ...over,
})

describe('pendingRecorteWork', () => {
  it('asks for nothing without a recorte selection', () => {
    expect(pendingRecorteWork(input({ layers: [raster('estoque_carbono')], recorte: undefined }))).toEqual([])
  })

  it('asks for the scale of every visible continuous GEE raster', () => {
    const a = raster('estoque_carbono'); const b = temporal('gpp_modis')
    const out = pendingRecorteWork(input({ layers: [a, b], temporalDate: { gpp_modis: '2024-01-01' } }))

    expect(out).toEqual([
      { layer: a, key: keyOf('estoque_carbono'), need: 'scale', dateKey: 'static' },
      { layer: b, key: keyOf('gpp_modis'), need: 'scale', dateKey: '2024-01-01' },
    ])
  })

  it('skips layers whose colors cannot follow the recorte', () => {
    const out = pendingRecorteWork(input({ layers: [
      raster('lulc', { colorType: 'categorical' }),
      raster('relevo', { source: 'dem' }),
      raster('off', { visible: false }),
      raster('clipped-here', { clipToLayerId: 'municipios' }),
      temporal('no-stop-yet'),
    ] }))

    expect(out).toEqual([])
  })

  it('waits while the scale loads, and stops on a failure or a degenerate scale', () => {
    const layers = [raster('a'), raster('b'), raster('c')]
    const out = pendingRecorteWork(input({ layers, recorteScales: {
      [keyOf('a')]: { status: 'loading' },
      [keyOf('b')]: { status: 'error' },
      [keyOf('c')]: { status: 'ready', stretch: null, range: null },
    } }))

    expect(out).toEqual([])
  })

  it('asks for the tile of the year on screen once the scale is ready', () => {
    const layer = temporal('gpp_modis')
    const stretch = { min: 300, max: 900 }
    const out = pendingRecorteWork(input({
      layers: [layer],
      temporalDate: { gpp_modis: '2010-01-01' },
      recorteScales: { [keyOf('gpp_modis')]: { status: 'ready', stretch, range: null } },
      recorteTileUrls: { [keyOf('gpp_modis')]: { '2024-01-01': 'old-year' } },
    }))

    expect(out).toEqual([{ layer, key: keyOf('gpp_modis'), need: 'tile', dateKey: '2010-01-01', stretch }])
  })

  it('asks for nothing when the tile is there or already on its way', () => {
    const ready = { status: 'ready' as const, stretch: { min: 1, max: 2 }, range: null }
    const layers = [raster('a'), raster('b')]

    expect(pendingRecorteWork(input({
      layers,
      recorteScales: { [keyOf('a')]: ready, [keyOf('b')]: ready },
      recorteTileUrls: { [keyOf('a')]: { static: 'url' } },
      inFlightTiles: new Set([`${keyOf('b')}@static`]),
    }))).toEqual([])
  })

  it("never takes another feature's scale for the selected one", () => {
    const other: SelectedRecorte = { recorteId: 'municipios', feicaoIndex: 7, name: 'Patos' }
    const layer = raster('estoque_carbono')
    const out = pendingRecorteWork(input({
      layers: [layer],
      recorteScales: { [keyOf('estoque_carbono', other)]: { status: 'ready', stretch: { min: 1, max: 2 }, range: null } },
      recorteTileUrls: { [keyOf('estoque_carbono', other)]: { static: 'patos-tile' } },
    }))

    expect(out).toEqual([{ layer, key: keyOf('estoque_carbono'), need: 'scale', dateKey: 'static' }])
  })
})
