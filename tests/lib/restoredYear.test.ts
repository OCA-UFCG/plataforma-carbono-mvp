import { afterEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '@/lib/mapa/store'
import type { RasterLayerConfig } from '@/types/mapa'

describe('the year a temporal GEE raster opens on', () => {
  const initial = useStore.getState()
  afterEach(() => {
    useStore.setState(initial, true)
    vi.unstubAllGlobals()
  })

  // The years each tile request asked for.
  const requested: string[] = []
  const stubTiles = () => {
    requested.length = 0
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      requested.push(JSON.parse(init.body as string).temporalDate)
      return new Response(JSON.stringify({ tileUrl: 'https://tiles.example/lulc' }))
    })
  }
  const activate = () => {
    const lulc = useStore.getState().layers.find((layer) => layer.id === 'lulc_mapbiomas') as RasterLayerConfig
    return useStore.getState().activateDynamicLayer(lulc)
  }

  // After a reload the store holds the year read from localStorage, and
  // Mapa.tsx switches the raster back on through activateDynamicLayer. Opening
  // on the last year instead would also overwrite the saved one.
  it('is the year it was left on, when the store holds one', async () => {
    stubTiles()
    useStore.setState({ temporalDate: { lulc_mapbiomas: '1985-01-01' } })

    await activate()

    expect(requested).toEqual(['1985-01-01'])
    expect(useStore.getState().temporalDate.lulc_mapbiomas).toBe('1985-01-01')
    expect(useStore.getState().temporalTileUrls.lulc_mapbiomas?.['1985-01-01']).toBe('https://tiles.example/lulc')
  })

  it('is the last year otherwise', async () => {
    stubTiles()

    await activate()

    expect(requested).toEqual(['2024-01-01'])
    expect(useStore.getState().temporalDate.lulc_mapbiomas).toBe('2024-01-01')
  })
})
