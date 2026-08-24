import { describe, expect, it } from 'vitest'
import { sanitizePersisted, buildPersisted, PERSIST_VERSION } from '@/lib/mapa/persistState'
import type { LayerConfig } from '@/types/mapa'

const bioma: LayerConfig = {
  id: 'bioma', name: 'Bioma Caatinga', type: 'vector',
  url: '/data/vector/limite_caatinga.geojson',
  visible: true, opacity: 70, color: '#5f7030',
}

const solo: LayerConfig = {
  id: 'solo_carbono', name: 'Carbono do Solo', type: 'raster',
  visible: false, opacity: 100, colorType: 'continuous', source: 'gee',
  gee: { asset: { type: 'image', id: 'x/y', band: 'b1' } },
}

const fogo: LayerConfig = {
  id: 'fogo_frequencia', name: 'Frequência de Fogo', type: 'raster',
  visible: false, opacity: 100, colorType: 'continuous', source: 'gee',
  gee: {
    asset: { type: 'image', id: 'fire/x', bandPattern: 'fire_frequency_1985_{ano}' },
    temporal: { dateRange: ['1985-01-01', '2023-01-01'] },
  },
}

const config: LayerConfig[] = [bioma, solo, fogo]

describe('sanitizePersisted', () => {
  it('rejects anything that is not a payload of the current version', () => {
    expect(sanitizePersisted(null, config)).toBeNull()
    expect(sanitizePersisted('nonsense', config)).toBeNull()
    expect(sanitizePersisted({ version: PERSIST_VERSION - 1, layers: [] }, config)).toBeNull()
    expect(sanitizePersisted({ layers: [] }, config)).toBeNull()
  })

  it('round-trips a payload built from live state', () => {
    const payload = buildPersisted({
      layers: config,
      basemapId: 'esri-imagery',
      temporalDate: {},
      view: null,
      drawing: null,
    })

    const restored = sanitizePersisted(payload, config)

    expect(restored?.basemapId).toBe('esri-imagery')
    expect(restored?.layers.map((l) => l.id)).toEqual(['bioma', 'solo_carbono', 'fogo_frequencia'])
  })

  it('applies the stored visibility and opacity to the current config', () => {
    const restored = sanitizePersisted(
      {
        version: PERSIST_VERSION,
        layers: [{ id: 'bioma', visible: false, opacity: 35 }],
        basemapId: 'carto-positron',
      },
      config,
    )

    expect(restored?.layers.find((l) => l.id === 'bioma')).toMatchObject({
      visible: false,
      opacity: 35,
    })
  })

  it('drops stored layers that no longer exist in the config', () => {
    const restored = sanitizePersisted(
      {
        version: PERSIST_VERSION,
        layers: [
          { id: 'camada_removida', visible: true, opacity: 100 },
          { id: 'bioma', visible: true, opacity: 70 },
        ],
        basemapId: 'carto-positron',
      },
      config,
    )

    expect(restored?.layers.map((l) => l.id)).toEqual(['bioma', 'solo_carbono', 'fogo_frequencia'])
  })

  it('keeps the stored order and appends layers added since the state was saved', () => {
    const restored = sanitizePersisted(
      {
        version: PERSIST_VERSION,
        layers: [{ id: 'solo_carbono', visible: false, opacity: 100 }],
        basemapId: 'carto-positron',
      },
      config,
    )

    expect(restored?.layers.map((l) => l.id)).toEqual(['solo_carbono', 'bioma', 'fogo_frequencia'])
  })

  it('clamps opacity into 0-100 and ignores non-numeric values', () => {
    const restored = sanitizePersisted(
      {
        version: PERSIST_VERSION,
        layers: [
          { id: 'bioma', visible: true, opacity: 480 },
          { id: 'solo_carbono', visible: true, opacity: 'muito' },
        ],
        basemapId: 'carto-positron',
      },
      config,
    )

    expect(restored?.layers.find((l) => l.id === 'bioma')?.opacity).toBe(100)
    expect(restored?.layers.find((l) => l.id === 'solo_carbono')?.opacity).toBe(100)
  })

  it('falls back to the default basemap when the stored one is unknown', () => {
    const restored = sanitizePersisted(
      { version: PERSIST_VERSION, layers: [], basemapId: 'mapa-que-nao-existe' },
      config,
    )

    expect(restored?.basemapId).toBe('carto-positron')
  })

  // Só `toggleLayer` dispara `activateDynamicLayer`, que busca o tile no GEE.
  // Restaurar um raster GEE já visível o deixaria ligado no painel e invisível
  // no mapa, então ele volta apagado e é religado pelo caminho normal.
  it('returns GEE rasters switched off, listing them for the normal activation path', () => {
    const restored = sanitizePersisted(
      {
        version: PERSIST_VERSION,
        layers: [
          { id: 'solo_carbono', visible: true, opacity: 80 },
          { id: 'bioma', visible: true, opacity: 70 },
        ],
        basemapId: 'carto-positron',
      },
      config,
    )

    expect(restored?.layers.find((l) => l.id === 'solo_carbono')).toMatchObject({
      visible: false,
      opacity: 80,
    })
    expect(restored?.layers.find((l) => l.id === 'bioma')?.visible).toBe(true)
    expect(restored?.activateLayerIds).toEqual(['solo_carbono'])
  })

  it('does not ask to activate GEE rasters that were switched off', () => {
    const restored = sanitizePersisted(
      {
        version: PERSIST_VERSION,
        layers: [{ id: 'solo_carbono', visible: false, opacity: 100 }],
        basemapId: 'carto-positron',
      },
      config,
    )

    expect(restored?.activateLayerIds).toEqual([])
  })

  it('keeps a stored year that is a real stop of that layer', () => {
    const restored = sanitizePersisted(
      {
        version: PERSIST_VERSION,
        layers: [],
        basemapId: 'carto-positron',
        temporalDate: { fogo_frequencia: '2019-01-01' },
      },
      config,
    )

    expect(restored?.temporalDate).toEqual({ fogo_frequencia: '2019-01-01' })
  })

  it('drops a stored year outside the series, which would fetch an empty tile', () => {
    const restored = sanitizePersisted(
      {
        version: PERSIST_VERSION,
        layers: [],
        basemapId: 'carto-positron',
        temporalDate: {
          fogo_frequencia: '2049-01-01',
          solo_carbono: '2020-01-01',
          camada_removida: '2020-01-01',
        },
      },
      config,
    )

    expect(restored?.temporalDate).toEqual({})
  })

  it('restores a valid viewport', () => {
    const restored = sanitizePersisted(
      {
        version: PERSIST_VERSION,
        layers: [],
        basemapId: 'carto-positron',
        view: { center: [-38.5, -7.2], zoom: 9.5 },
      },
      config,
    )

    expect(restored?.view).toEqual({ center: [-38.5, -7.2], zoom: 9.5 })
  })

  it('discards a malformed viewport instead of moving the map nowhere', () => {
    const malformed = [
      { center: [-38.5], zoom: 9.5 },
      { center: [-38.5, -7.2], zoom: Number.NaN },
      { center: ['a', 'b'], zoom: 9.5 },
      { center: [-400, -7.2], zoom: 9.5 },
      'perto de Petrolina',
    ]

    for (const view of malformed) {
      const restored = sanitizePersisted(
        { version: PERSIST_VERSION, layers: [], basemapId: 'carto-positron', view },
        config,
      )
      expect(restored?.view).toBeNull()
    }
  })

  it('restores a drawn feature so the analysis can be recomputed', () => {
    const drawing = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[-38, -7], [-38, -8], [-37, -8], [-38, -7]]] },
      properties: {},
    }

    const restored = sanitizePersisted(
      { version: PERSIST_VERSION, layers: [], basemapId: 'carto-positron', drawing },
      config,
    )

    expect(restored?.drawing).toEqual(drawing)
  })

  it('discards a drawing that is not a GeoJSON feature with a geometry', () => {
    for (const drawing of [{ type: 'Feature' }, { geometry: { type: 'Polygon' } }, 42]) {
      const restored = sanitizePersisted(
        { version: PERSIST_VERSION, layers: [], basemapId: 'carto-positron', drawing },
        config,
      )
      expect(restored?.drawing).toBeNull()
    }
  })
})

