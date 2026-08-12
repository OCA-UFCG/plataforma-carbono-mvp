import { describe, expect, it } from 'vitest'
import { getStocks } from '@/lib/mapa/stocksRegistry'

describe('getStocks', () => {
  it('resolves the configured stock layer and its server-side metadata', () => {
    expect(getStocks('estoque_carbono')).toMatchObject({
      assetId: 'projects/ee-arturlourenco/assets/caatinga_estoques',
      assetBand: 'b1',
      scale: 100,
      cfg: { classBand: 'b1', unit: 't C' },
    })
  })

  it('returns null for regular or unknown layers', () => {
    expect(getStocks('solo_carbono')).toBeNull()
    expect(getStocks('nao-existe')).toBeNull()
  })
})
