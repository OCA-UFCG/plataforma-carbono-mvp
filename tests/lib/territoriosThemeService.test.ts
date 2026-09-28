import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ThemeComputation } from '@/lib/territorios/computeTheme'

const mocks = vi.hoisted(() => ({
  initGee: vi.fn(async () => {}),
  computeTheme: vi.fn<() => Promise<ThemeComputation>>(),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({
  initGee: mocks.initGee,
  getEe: () => ({}),
}))
vi.mock('@/lib/territorios/computeTheme', () => ({
  computeTheme: mocks.computeTheme,
}))

import precomputedJson from '@/config/territorios/precomputed.json'
import { BIOMA_FEATURE_ID, BIOMA_RECORTE_ID } from '@/config/territorios/story'
import {
  degradationChart,
  fluxChart,
  landUseChart,
  rainChart,
  stockChart,
} from '@/lib/territorios/storyValues'
import { getTerritory, getTheme } from '@/lib/territorios/themeService'
import type { PrecomputedFile, ThemeData } from '@/types/territorios'

const rain: ThemeComputation = {
  status: 'available',
  origin: 'zonal',
  coarseScaleM: null,
  data: { theme: 'chuva', series: [{ date: '2024-01-01', value: 950 }] },
}

// The cache lives for the whole module, so each case asks for a theme no
// other case touches.
beforeEach(() => {
  vi.clearAllMocks()
  mocks.computeTheme.mockResolvedValue(rain)
})

describe('getTheme', () => {
  it('serves a precomputed biome theme without Earth Engine', async () => {
    const res = await getTheme(BIOMA_RECORTE_ID, BIOMA_FEATURE_ID, 'degradacao')

    expect(res).toMatchObject({ status: 'available', origin: 'precomputed' })
    expect(res.data?.theme).toBe('degradacao')
    expect(mocks.computeTheme).not.toHaveBeenCalled()
    expect(mocks.initGee).not.toHaveBeenCalled()
  })

  it('computes a live theme once and serves the second call from the cache', async () => {
    const first = await getTheme('municipios', 'campina-grande', 'chuva')
    const second = await getTheme('municipios', 'campina-grande', 'chuva')

    expect(first).toMatchObject({ recorteId: 'municipios', featureId: 'campina-grande', theme: 'chuva', ...rain })
    expect(second).toEqual(first)
    expect(mocks.computeTheme).toHaveBeenCalledTimes(1)
  })

  it('does not cache an unavailable answer, so the next call computes again', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.computeTheme.mockRejectedValueOnce(new Error('ee.evaluate timed out after 65000ms'))

    const failed = await getTheme('municipios', 'campina-grande', 'estoque')
    const retried = await getTheme('municipios', 'campina-grande', 'estoque')

    expect(failed).toMatchObject({ status: 'unavailable', origin: null, data: null })
    expect(retried.status).toBe('available')
    expect(mocks.computeTheme).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('caches a no_pixels answer', async () => {
    mocks.computeTheme.mockResolvedValueOnce({ status: 'no_pixels', origin: 'point', coarseScaleM: null, data: null })

    const first = await getTheme('municipios', 'campina-grande', 'fluxo')
    const second = await getTheme('municipios', 'campina-grande', 'fluxo')

    expect(first.status).toBe('no_pixels')
    expect(second).toEqual(first)
    expect(mocks.computeTheme).toHaveBeenCalledTimes(1)
  })
})

describe('biome reference', () => {
  const themes = (precomputedJson as unknown as PrecomputedFile).entries[`${BIOMA_RECORTE_ID}|${BIOMA_FEATURE_ID}`].themes
  function biomeData<K extends keyof typeof themes>(theme: K) {
    return themes[theme]!.data as Extract<ThemeData, { theme: K }>
  }

  it('fills every value from the precomputed biome answers', () => {
    const { biome } = getTerritory('municipios', 'campina-grande')

    expect(biome.stockDensityTcHa).toBeCloseTo(55.10, 2)
    expect(biome.forestSharePct).toBeCloseTo(26.78, 2)
    // Signed: the Caatinga removed more than it emitted.
    expect(biome.fluxPerForestHaMg).toBeCloseTo(-68.13, 2)
    expect(biome.nativeSharePct?.['1985']).toBeCloseTo(70.68, 2)
    expect(biome.nativeSharePct?.['2024']).toBeCloseTo(60.08, 2)
    expect(biome.degradedSharePct).toBeCloseTo(20.94, 2)
    expect(biome.degradationSharesPct?.[0]).toBeCloseTo(1.92, 2)
    expect(Object.values(biome.degradationSharesPct ?? {}).reduce((a, b) => a + b, 0)).toBeCloseTo(100)
    expect(biome.rainMeanMm).toBeCloseTo(701.2, 1)
  })

  it('divides by the same bases as a territory: the biome read as a territory lands on its own reference', () => {
    const caatinga = getTerritory(BIOMA_RECORTE_ID, BIOMA_FEATURE_ID)

    const stock = stockChart(biomeData('estoque').report, caatinga)!
    expect(stock.density.here).toBe(stock.density.reference)

    const flux = fluxChart(biomeData('fluxo'), caatinga)!
    expect(flux.forestShare.here).toBe(flux.forestShare.reference)
    expect(flux.perForestHa?.here).toBeCloseTo(flux.perForestHa!.reference!, 10)

    const landUse = landUseChart(biomeData('uso'), caatinga)!
    expect(landUse.here).toEqual(landUse.reference)

    const degradation = degradationChart(biomeData('degradacao'), caatinga)!
    expect(degradation.here).toEqual(degradation.reference)

    const rain = rainChart(biomeData('chuva').series, caatinga)!
    expect(rain.mean.here).toBe(rain.mean.reference)
  })
})
