import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { LAYER_INFO } from '@/config/mapa/layerInfo'
import type { LayerConfig } from '@/types/mapa'

const layers = appConfig.layers as LayerConfig[]

describe('LAYER_INFO', () => {
  it('describes only layers that exist, and every layer the panel offers', () => {
    const ids = new Set(layers.map((l) => l.id))
    expect(Object.keys(LAYER_INFO).filter((id) => !ids.has(id))).toEqual([])
    expect(layers.filter((l) => !l.hidden && !LAYER_INFO[l.id]).map((l) => l.id)).toEqual([])
  })

  it('carries no pending marker into the interface', () => {
    const text = JSON.stringify(LAYER_INFO)
    expect(text).not.toMatch(/conferir/i)
    expect(text).not.toMatch(/\bTODO\b/)
  })

  it('keeps coverage a percentage and gives the license a link', () => {
    for (const [id, info] of Object.entries(LAYER_INFO)) {
      if (info.coverage != null) expect(info.coverage, id).toBeGreaterThan(0)
      if (info.coverage != null) expect(info.coverage, id).toBeLessThanOrEqual(100)
      if (info.license) expect(info.license.url, id).toMatch(/^https:\/\//)
    }
  })
})
