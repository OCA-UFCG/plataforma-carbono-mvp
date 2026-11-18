import { afterEach, describe, expect, it, vi } from 'vitest'

// The balloon's renderers read the layers from the store; these tests never
// render a balloon, so an empty store is enough.
vi.mock('@/lib/mapa/store', () => ({
  useStore: { getState: () => ({ layers: [] }) },
}))

import {
  PLATFORM_TOUR_SEEN_KEY,
  TOUR_COPY,
  buildTourSteps,
  hasSeenPlatformTour,
  markPlatformTourSeen,
  shouldAutoStartTour,
} from '@/components/mapa/tour/tourSteps'
import { measurableLayerName } from '@/components/mapa/tour/tourDom'
import type { LayerConfig } from '@/types/mapa'

/** A window of the given width whose localStorage reads and writes `storage`, or throws. */
function stubWindow({ innerWidth, storage }: { innerWidth: number; storage: Record<string, string> | 'throws' }) {
  const localStorage = storage === 'throws'
    ? {
        getItem: () => { throw new Error('SecurityError') },
        setItem: () => { throw new Error('SecurityError') },
      }
    : {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => { storage[key] = value },
      }
  vi.stubGlobal('window', { innerWidth, localStorage })
}

describe('platform tour steps', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('lists the eight steps in the order of the spec', () => {
    expect(buildTourSteps().map((step) => step.element ?? null)).toEqual([
      null, '[data-tour="territory"]', '[data-tour="draw"]', '[data-tour="layer-card"]',
      '[data-tour="layer-info"]', '[data-tour="map"]', '[data-tour="basemap"]', '[data-tour="tour-replay"]',
    ])
    expect(buildTourSteps().map((step) => step.popover?.title)).toEqual([
      'Boas-vindas à Caativar', 'Escolha onde olhar', 'Ou desenhe a sua área', 'Cada item é uma camada',
      'O que a camada mostra', 'Veja o resultado', 'Mapa base', 'Tudo pronto',
    ])
  })

  it('opens with "Começar" and no way back', () => {
    const [welcome] = buildTourSteps()
    expect(welcome.popover?.nextBtnText).toBe('Começar')
    expect(welcome.popover?.showButtons).toEqual(['next', 'close'])
  })

  it('starts by itself on a first visit at desktop width', () => {
    stubWindow({ innerWidth: 1280, storage: {} })
    expect(shouldAutoStartTour()).toBe(true)
  })

  it('does not start by itself once seen, or below 768px', () => {
    stubWindow({ innerWidth: 1280, storage: { [PLATFORM_TOUR_SEEN_KEY]: '1' } })
    expect(shouldAutoStartTour()).toBe(false)
    stubWindow({ innerWidth: 767, storage: {} })
    expect(shouldAutoStartTour()).toBe(false)
  })

  it('marks the tour seen under the versioned key', () => {
    const storage: Record<string, string> = {}
    stubWindow({ innerWidth: 1280, storage })
    markPlatformTourSeen()
    expect(storage).toEqual({ 'caativar.platformTour.v1.seen': '1' })
  })

  it('reads blocked storage as seen, and marking it does not throw', () => {
    stubWindow({ innerWidth: 1280, storage: 'throws' })
    expect(hasSeenPlatformTour()).toBe(true)
    expect(() => markPlatformTourSeen()).not.toThrow()
  })

  it('names an off raster in the result preview, since the tour never turns one on', () => {
    const raster = { id: 'estoque_carbono', name: 'Estoque Total', type: 'raster', visible: false } as LayerConfig
    expect(measurableLayerName(raster)).toBe('Estoque Total')
  })

  it('names no layer the Resultado panel would not measure', () => {
    const vector = { id: 'bioma', name: 'Bioma Caatinga', type: 'vector', visible: true } as LayerConfig
    const unmeasured = { id: 'relevo', name: 'Relevo', type: 'raster', visible: false, analysis: false } as LayerConfig
    expect(measurableLayerName(vector)).toBeNull()
    expect(measurableLayerName(unmeasured)).toBeNull()
    expect(measurableLayerName(undefined)).toBeNull()
  })

  it("sets step 6's balloon beside the middle of the map, clear of the header", () => {
    const result = buildTourSteps()[5]
    expect(result.popover?.side).toBe('left')
    expect(result.popover?.align).toBe('center')
  })

  it('keeps every preview free of numbers', () => {
    expect(TOUR_COPY.result.items.join(' ')).not.toMatch(/\d/)
  })
})
