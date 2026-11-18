import { describe, expect, it } from 'vitest'
import { fichaHeadline } from '@/lib/mapa/ficha'
import { LAYER_INFO } from '@/config/mapa/layerInfo'

describe('fichaHeadline', () => {
  it('takes the summary and the chips from LAYER_INFO', () => {
    const info = LAYER_INFO.estoque_carbono
    const headline = fichaHeadline('estoque_carbono')
    expect(headline.summary).toBe(info.summary)
    expect(headline.chips).toEqual([info.period, info.resolution].filter(Boolean))
  })

  it('answers empty for an unknown layer', () => {
    expect(fichaHeadline('nope')).toEqual({ summary: '', chips: [] })
  })
})
