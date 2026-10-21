import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { LAYER_INFO } from '@/config/mapa/layerInfo'
import { LAYER_META } from '@/config/mapa/layerMeta'
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

describe('LAYER_INFO against the rest of the platform', () => {
  it('gives each time series the years its slider offers', () => {
    for (const layer of layers) {
      const temporal = (layer as { gee?: { temporal?: { dateRange?: string[]; dates?: string[] } } }).gee?.temporal
      const info = LAYER_INFO[layer.id]
      if (!temporal || !info) continue
      const span = temporal.dates ?? temporal.dateRange ?? []
      const first = span[0].slice(0, 4)
      const last = span[span.length - 1].slice(0, 4)
      expect(info.period?.startsWith(first) && info.period.endsWith(last), `${layer.id}: ${info.period}, slider ${first}-${last}`).toBe(true)
    }
  })

  it('states the same resolution as the short source the results and the report show', () => {
    for (const [id, info] of Object.entries(LAYER_INFO)) {
      const short = LAYER_META[id]?.source
      if (!info.resolution || !short || !/\d\s*k?m$/.test(short)) continue
      expect(short.endsWith(info.resolution), `${id}: "${short}"`).toBe(true)
    }
  })
})
