import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pendingChoropleths, runChoropleths } from '@/lib/mapa/choroplethRunner'
import { choroplethKey } from '@/lib/mapa/choropleth'
import { useStore } from '@/lib/mapa/store'
import type { RasterLayerConfig, VectorLayerConfig } from '@/types/mapa'

const raster = (id: string, over: Partial<RasterLayerConfig> = {}): RasterLayerConfig => ({
  id, name: id, type: 'raster', visible: true, opacity: 80,
  colorType: 'continuous', source: 'gee', clipToLayerId: 'bioma',
  gee: { asset: { type: 'image', id: `projects/x/${id}` }, visParams: { min: 0, max: 100, palette: ['#000', '#fff'] } },
  ...over,
})
const municipios: VectorLayerConfig = {
  id: 'municipios', name: 'Municípios', type: 'vector', url: '/x.geojson', visible: true, opacity: 80,
  color: '#000', pickPriority: 20, choropleth: { caption: 'Escala municipal' },
}
const estoque = raster('estoque')

describe('pendingChoropleths', () => {
  it('asks for every visible continuous raster drawn by the finest recorte', () => {
    const gpp = raster('gpp')
    expect(pendingChoropleths([municipios, estoque, gpp], {})).toEqual([
      { layer: estoque, recorteId: 'municipios', key: choroplethKey('estoque', 'municipios') },
      { layer: gpp, recorteId: 'municipios', key: choroplethKey('gpp', 'municipios') },
    ])
  })

  it('asks for nothing already asked, answered or failed, nor without a recorte', () => {
    const key = choroplethKey('estoque', 'municipios')
    expect(pendingChoropleths([municipios, estoque], { [key]: { status: 'loading' } })).toEqual([])
    expect(pendingChoropleths([municipios, estoque], { [key]: { status: 'error' } })).toEqual([])
    expect(pendingChoropleths([{ ...municipios, visible: false }, estoque], {})).toEqual([])
  })
})

describe('runChoropleths', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    useStore.setState({ layers: [municipios, estoque], choropleths: {} })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    consoleError.mockRestore()
  })

  it('stores the answer under the layer and recorte', async () => {
    const answer = { keys: ['static'], values: [[1, 2]], range: { min: 1, max: 2 } }
    const fetchMock = vi.fn(async () => Response.json(answer))
    vi.stubGlobal('fetch', fetchMock)

    runChoropleths()

    await vi.waitFor(() => expect(useStore.getState().choropleths[choroplethKey('estoque', 'municipios')])
      .toEqual({ status: 'ready', ...answer }))
    expect(fetchMock).toHaveBeenCalledWith('/api/gee/choropleth', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ layerId: 'estoque', recorteId: 'municipios' }),
    }))
  })

  it('asks a failed recorte again once it is turned on again, and not before', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const key = choroplethKey('estoque', 'municipios')

    runChoropleths()
    await vi.waitFor(() => expect(useStore.getState().choropleths[key]).toEqual({ status: 'error' }))
    runChoropleths()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    useStore.getState().toggleLayer('municipios')   // off
    useStore.getState().toggleLayer('municipios')   // on again: drops the failure
    runChoropleths()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
