import { describe, expect, it } from 'vitest'
import { setLayerVisibility } from '@/lib/mapa/store'
import type { LayerConfig } from '@/types/mapa'

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
