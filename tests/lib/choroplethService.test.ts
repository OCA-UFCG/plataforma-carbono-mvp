import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ reduce: vi.fn() }))

vi.mock('@/lib/mapa/geeAuth', () => ({ initGee: vi.fn(async () => {}), getEe: vi.fn(() => ({})) }))
vi.mock('@/lib/mapa/choroplethCompute', () => ({ reduceChoropleth: mocks.reduce }))

import {
  cachedChoropleth,
  computeChoropleth,
  getChoroplethLayer,
  isChoroplethRecorte,
} from '@/lib/mapa/choroplethService'
import { choroplethKey } from '@/lib/mapa/choropleth'

describe('allowlists', () => {
  it('accepts a continuous Earth Engine quantity', () => {
    expect(getChoroplethLayer('estoque_carbono')?.id).toBe('estoque_carbono')
    expect(getChoroplethLayer('gfw_netflux')?.id).toBe('gfw_netflux')
  })

  it('refuses a categorical layer, relief, a rendering, a vector and an unknown id', () => {
    expect(getChoroplethLayer('lulc_mapbiomas')).toBeNull()
    expect(getChoroplethLayer('sombreado_terreno')).toBeNull()
    expect(getChoroplethLayer('hillshade_fabdem')).toBeNull()
    expect(getChoroplethLayer('municipios')).toBeNull()
    expect(getChoroplethLayer('nao-existe')).toBeNull()
  })

  it('accepts only the recortes that declare choropleth', () => {
    expect(isChoroplethRecorte('municipios')).toBe(true)
    expect(isChoroplethRecorte('estados')).toBe(true)
    expect(isChoroplethRecorte('bioma')).toBe(false)
    expect(isChoroplethRecorte('terras_indigenas')).toBe(false)
  })
})

describe('computeChoropleth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reduces exactly the declared years of a series with gaps, over the recorte features', async () => {
    const layer = getChoroplethLayer('biomassa_esa_lenhosa')!
    mocks.reduce.mockResolvedValueOnce([[1, 2]])

    await computeChoropleth(choroplethKey(layer.id, 'estados'), layer, 'estados')

    expect(mocks.reduce.mock.calls[0][2]).toEqual(
      ['2007', '2010', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022'])
    expect(mocks.reduce.mock.calls[0][3].length).toBe(9)
  })

  it('answers the keys, the values and their range', async () => {
    const layer = getChoroplethLayer('estoque_carbono')!
    mocks.reduce.mockResolvedValueOnce([[10, null, 40]])

    await expect(computeChoropleth(choroplethKey(layer.id, 'estados'), layer, 'estados')).resolves.toEqual({
      keys: ['static'], values: [[10, null, 40]], range: { min: 10, max: 40 },
    })
  })

  it('caches the answer and shares a computation already running', async () => {
    const layer = getChoroplethLayer('altura_dossel')!
    const key = choroplethKey(layer.id, 'estados')
    mocks.reduce.mockResolvedValueOnce([[1, 2]])

    const [a, b] = await Promise.all([computeChoropleth(key, layer, 'estados'), computeChoropleth(key, layer, 'estados')])
    await computeChoropleth(key, layer, 'estados')

    expect(a).toEqual(b)
    expect(cachedChoropleth(key)).toEqual(a)
    expect(mocks.reduce).toHaveBeenCalledOnce()
  })

  it('does not cache a failure', async () => {
    const layer = getChoroplethLayer('biomassa_gedi')!
    const key = choroplethKey(layer.id, 'estados')
    mocks.reduce.mockRejectedValueOnce(new Error('timed out')).mockResolvedValueOnce([[1, 2]])

    await expect(computeChoropleth(key, layer, 'estados')).rejects.toThrow('timed out')
    expect(cachedChoropleth(key)).toBeNull()
    await expect(computeChoropleth(key, layer, 'estados')).resolves.toMatchObject({ range: { min: 1, max: 2 } })
    expect(mocks.reduce).toHaveBeenCalledTimes(2)
  })
})
