import { afterEach, describe, expect, it, vi } from 'vitest'
import { hideThematicLayers, setLayerVisibility, useStore } from '@/lib/mapa/store'
import type { LayerConfig, RasterLayerConfig } from '@/types/mapa'

const layers: LayerConfig[] = [
  { id: 'gpp_modis', name: 'GPP MODIS', type: 'raster', visible: true, opacity: 80, colorType: 'continuous', theme: 'carbono', subtheme: 'gpp' },
  { id: 'gpp_pml', name: 'GPP PML', type: 'raster', visible: false, opacity: 80, colorType: 'continuous', theme: 'carbono', subtheme: 'gpp' },
  { id: 'npp', name: 'NPP', type: 'raster', visible: true, opacity: 80, colorType: 'continuous', theme: 'carbono', subtheme: 'npp' },
  { id: 'bioma', name: 'Bioma', type: 'vector', visible: true, opacity: 80, color: '#000', theme: 'territorio', subtheme: 'limites' },
  { id: 'estados', name: 'Estados', type: 'vector', visible: false, opacity: 80, color: '#000', theme: 'territorio', subtheme: 'limites' },
]

describe('setLayerVisibility', () => {
  it('keeps only the selected layer active in an exclusive subtheme', () => {
    const updated = setLayerVisibility(layers, 'gpp_pml', true)

    expect(updated.find((layer) => layer.id === 'gpp_modis')?.visible).toBe(false)
    expect(updated.find((layer) => layer.id === 'gpp_pml')?.visible).toBe(true)
  })

  it('does not disable layers in other subthemes or territorial overlays', () => {
    const updated = setLayerVisibility(layers, 'gpp_pml', true)

    expect(updated.find((layer) => layer.id === 'npp')?.visible).toBe(true)
    expect(updated.find((layer) => layer.id === 'bioma')?.visible).toBe(true)

    const territorial = setLayerVisibility(updated, 'estados', true)
    expect(territorial.find((layer) => layer.id === 'bioma')?.visible).toBe(true)
    expect(territorial.find((layer) => layer.id === 'estados')?.visible).toBe(true)
  })
})

describe('hideThematicLayers', () => {
  const visibilityOf = (list: LayerConfig[]) =>
    Object.fromEntries(list.map((layer) => [layer.id, layer.visible]))

  it('turns off every layer outside the Território theme', () => {
    const updated = visibilityOf(hideThematicLayers(layers))

    expect(updated.gpp_modis).toBe(false)
    expect(updated.npp).toBe(false)
  })

  it('leaves the Território layers as the user set them', () => {
    const updated = visibilityOf(hideThematicLayers(layers))

    expect(updated.bioma).toBe(true)
    expect(updated.estados).toBe(false)
  })
})

describe('clearThematicLayers', () => {
  const initial = useStore.getState()
  afterEach(() => {
    useStore.setState(initial, true)
    vi.unstubAllGlobals()
  })

  it('keeps a GEE raster that was still loading off once its tile arrives', async () => {
    let respond!: (res: Response) => void
    vi.stubGlobal('fetch', () => new Promise<Response>((resolve) => { respond = resolve }))

    const gedi = useStore.getState().layers.find((layer) => layer.id === 'biomassa_gedi') as RasterLayerConfig
    const activation = useStore.getState().activateDynamicLayer(gedi)
    useStore.getState().clearThematicLayers()
    respond(new Response(JSON.stringify({ tileUrl: 'https://tiles.example/gedi' })))
    await activation

    const state = useStore.getState()
    expect(state.layers.find((layer) => layer.id === 'biomassa_gedi')?.visible).toBe(false)
    expect(state.loadingLayers.biomassa_gedi).toBeUndefined()
    // The tile is still cached, so switching the layer back on is instant.
    expect(state.fetchedTileUrls.biomassa_gedi).toBe('https://tiles.example/gedi')
  })
})

describe('showOnlyMunicipios', () => {
  const initial = useStore.getState()
  afterEach(() => {
    useStore.setState(initial, true)
    vi.unstubAllGlobals()
  })

  it('keeps a GEE raster that was still loading off once its tile arrives', async () => {
    let respond!: (res: Response) => void
    vi.stubGlobal('fetch', () => new Promise<Response>((resolve) => { respond = resolve }))

    const gedi = useStore.getState().layers.find((layer) => layer.id === 'biomassa_gedi') as RasterLayerConfig
    const activation = useStore.getState().activateDynamicLayer(gedi)
    useStore.getState().showOnlyMunicipios()
    respond(new Response(JSON.stringify({ tileUrl: 'https://tiles.example/gedi' })))
    await activation

    const state = useStore.getState()
    expect(state.layers.find((layer) => layer.id === 'biomassa_gedi')?.visible).toBe(false)
    expect(state.layers.find((layer) => layer.id === 'municipios')?.visible).toBe(true)
    expect(state.loadingLayers).toEqual({})
    expect(state.fetchedTileUrls.biomassa_gedi).toBe('https://tiles.example/gedi')
  })
})
