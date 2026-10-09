import { afterEach, describe, expect, it, vi } from 'vitest'
import { hideThematicLayers, setLayerVisibility, useStore } from '@/lib/mapa/store'
import type { LayerConfig, RasterLayerConfig } from '@/types/mapa'

const layers: LayerConfig[] = [
  { id: 'gpp_modis', name: 'GPP MODIS', type: 'raster', visible: true, opacity: 80, colorType: 'continuous', theme: 'carbono', subtheme: 'fluxos' },
  { id: 'gpp_pml', name: 'GPP PML', type: 'raster', visible: false, opacity: 80, colorType: 'continuous', theme: 'carbono', subtheme: 'fluxos' },
  { id: 'gedi', name: 'Biomassa GEDI', type: 'raster', visible: true, opacity: 80, colorType: 'continuous', theme: 'carbono', subtheme: 'estrutura' },
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

    expect(updated.find((layer) => layer.id === 'gedi')?.visible).toBe(true)
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
    expect(updated.gedi).toBe(false)
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

describe('draw order by theme and subtheme', () => {
  const initial = useStore.getState()
  afterEach(() => {
    useStore.setState(initial, true)
    vi.unstubAllGlobals()
  })
  const order = () => useStore.getState().layers.map((layer) => layer.id)
  const topOf = (theme: string) => {
    const o = order()
    return Math.min(...useStore.getState().layers.filter((l) => l.theme === theme).map((l) => o.indexOf(l.id)))
  }

  it('starts in the panel order: Carbono, then Uso do solo, then Ambiente', () => {
    expect(useStore.getState().themeOrder).toEqual(['carbono', 'uso_solo', 'ambiente', 'localidades'])
    expect(order().indexOf('lulc_mapbiomas')).toBeLessThan(order().indexOf('ndvi_modis'))
    expect(order().indexOf('biomassa_gedi')).toBeLessThan(order().indexOf('lulc_mapbiomas'))
  })

  it('draws a theme moved up above the themes it passed', () => {
    useStore.getState().moveTheme('uso_solo', 'carbono')

    expect(useStore.getState().themeOrder).toEqual(['uso_solo', 'carbono', 'ambiente', 'localidades'])
    expect(order().indexOf('lulc_mapbiomas')).toBeLessThan(topOf('carbono'))
  })

  it('draws a subtheme moved up above its sibling', () => {
    expect(order().indexOf('solo_carbono')).toBeLessThan(order().indexOf('biomassa_gedi'))

    useStore.getState().moveSubtheme('carbono', 'estrutura', 'estoques')

    expect(order().indexOf('biomassa_gedi')).toBeLessThan(order().indexOf('solo_carbono'))
  })

  it('keeps the recortes above every raster whatever the order', () => {
    useStore.getState().moveTheme('ambiente', 'carbono')
    const { layers } = useStore.getState()
    const lastVector = layers.map((layer) => layer.type).lastIndexOf('vector')
    expect(layers.findIndex((layer) => layer.type === 'raster')).toBe(lastVector + 1)
  })

  it('leaves the state untouched for a move that changes nothing', () => {
    const before = useStore.getState()
    useStore.getState().moveTheme('carbono', 'uso_solo')
    useStore.getState().moveSubtheme('carbono', 'estoques', 'reservatorios')
    useStore.getState().moveSubtheme('nope', 'x', null)

    expect(useStore.getState().layers).toBe(before.layers)
    expect(useStore.getState().themeOrder).toBe(before.themeOrder)
    expect(useStore.getState().subthemeOrder).toBe(before.subthemeOrder)
  })

  it('does not move a raster the user switches on', () => {
    useStore.setState({ fetchedTileUrls: { biomassa_gedi: 'https://tiles.example/gedi' } })
    const before = order()

    useStore.getState().toggleLayer('biomassa_gedi')

    expect(order()).toEqual(before)
  })

  it.each([
    ['in catalog order', [0, 1]],
    ['in reverse order', [1, 0]],
  ])('keeps the order of GEE rasters restored on reload when their tiles arrive %s', async (_, arrival) => {
    // Mapa.tsx switches restored GEE rasters back on through activateDynamicLayer.
    const pending: Array<(res: Response) => void> = []
    vi.stubGlobal('fetch', () => new Promise<Response>((resolve) => { pending.push(resolve) }))
    const { layers, activateDynamicLayer } = useStore.getState()
    const find = (id: string) => layers.find((layer) => layer.id === id) as RasterLayerConfig
    const before = order()

    const activations = [activateDynamicLayer(find('biomassa_gedi')), activateDynamicLayer(find('lulc_mapbiomas'))]
    for (const i of arrival) {
      pending[i](new Response(JSON.stringify({ tileUrl: `https://tiles.example/${i}` })))
      await activations[i]
    }

    expect(order()).toEqual(before)
  })
})
