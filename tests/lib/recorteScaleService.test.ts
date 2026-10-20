import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  reduce: vi.fn(),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({ initGee: vi.fn(async () => {}), getEe: vi.fn(() => ({})) }))
vi.mock('@/lib/mapa/recorteScaleCompute', () => ({ reduceRecorteStats: mocks.reduce }))

import {
  cachedRecorteScale,
  computeRecorteScale,
  getScaleFeicao,
  getScaleLayer,
} from '@/lib/mapa/recorteScaleService'
import { recorteScaleKey } from '@/lib/mapa/recorteScale'

const yearStats = { min: 1, max: 9, p2: 2, p98: 8 }

describe('getScaleLayer', () => {
  it('accepts a continuous Earth Engine raster', () => {
    expect(getScaleLayer('estoque_carbono')?.id).toBe('estoque_carbono')
    expect(getScaleLayer('gfw_netflux')?.id).toBe('gfw_netflux')
  })

  it('refuses a categorical layer, a dem layer, a vector and an unknown id', () => {
    expect(getScaleLayer('lulc_mapbiomas')).toBeNull()
    expect(getScaleLayer('sombreado_terreno')).toBeNull()
    expect(getScaleLayer('municipios')).toBeNull()
    expect(getScaleLayer('nao-existe')).toBeNull()
  })
})

describe('getScaleFeicao', () => {
  const layer = getScaleLayer('estoque_carbono')!

  it('resolves a feature of a Território recorte', () => {
    expect(getScaleFeicao(layer, 'estados', 1)?.name).toBe('Bahia')
  })

  it("refuses the recorte the layer is already clipped to: its scale is the biome's", () => {
    expect(getScaleFeicao(layer, 'bioma', 0)).toBeNull()
  })

  it('refuses a layer that is not a Território recorte, and a position with no feature', () => {
    expect(getScaleFeicao(layer, 'areas_monitoramento', 0)).toBeNull()
    expect(getScaleFeicao(layer, 'estados', 999)).toBeNull()
  })
})

describe('computeRecorteScale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reduces exactly the declared years of a series with gaps', async () => {
    const layer = getScaleLayer('biomassa_esa_lenhosa')!
    const feicao = getScaleFeicao(layer, 'estados', 4)!
    mocks.reduce.mockResolvedValueOnce({ '2010': yearStats })

    await computeRecorteScale(recorteScaleKey(layer.id, 'estados', 4), layer, feicao)

    expect(mocks.reduce.mock.calls[0][2]).toEqual(
      ['2007', '2010', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022'])
  })

  it('reduces a static layer once, under the static key', async () => {
    const layer = getScaleLayer('estoque_carbono')!
    const feicao = getScaleFeicao(layer, 'estados', 2)!
    mocks.reduce.mockResolvedValueOnce({ static: yearStats })

    const out = await computeRecorteScale(recorteScaleKey(layer.id, 'estados', 2), layer, feicao)

    expect(mocks.reduce.mock.calls[0][2]).toEqual(['static'])
    expect(out).toEqual({ stretch: { min: 2, max: 8 }, range: { min: 1, max: 9 } })
  })

  it('caches the answer and shares a computation already running', async () => {
    const layer = getScaleLayer('estoque_carbono')!
    const feicao = getScaleFeicao(layer, 'estados', 3)!
    const key = recorteScaleKey(layer.id, 'estados', 3)
    mocks.reduce.mockResolvedValueOnce({ static: yearStats })

    const [a, b] = await Promise.all([
      computeRecorteScale(key, layer, feicao),
      computeRecorteScale(key, layer, feicao),
    ])
    await computeRecorteScale(key, layer, feicao)

    expect(a).toEqual(b)
    expect(cachedRecorteScale(key)).toEqual(a)
    expect(mocks.reduce).toHaveBeenCalledOnce()
  })

  it('does not cache a failure', async () => {
    const layer = getScaleLayer('estoque_carbono')!
    const feicao = getScaleFeicao(layer, 'estados', 5)!
    const key = recorteScaleKey(layer.id, 'estados', 5)
    mocks.reduce.mockRejectedValueOnce(new Error('timed out')).mockResolvedValueOnce({ static: yearStats })

    await expect(computeRecorteScale(key, layer, feicao)).rejects.toThrow('timed out')
    expect(cachedRecorteScale(key)).toBeNull()
    await expect(computeRecorteScale(key, layer, feicao)).resolves.toMatchObject({ stretch: { min: 2, max: 8 } })
    expect(mocks.reduce).toHaveBeenCalledTimes(2)
  })
})
