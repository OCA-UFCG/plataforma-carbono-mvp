import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { RESULT_PROFILES } from '@/config/mapa/resultProfiles'
import type { LayerConfig, RasterLayerConfig } from '@/types/mapa'

// The profile decides which aggregation a layer's numbers go through, and a
// wrong pairing fails silently: a concentration summed into a "total", a class
// code averaged, a flux unit mislabelled. These checks tie each profile to what
// layers.json says the layer is.

const rasters = (appConfig.layers as LayerConfig[]).filter(
  (l): l is RasterLayerConfig => l.type === 'raster',
)
const byId = new Map(rasters.map((l) => [l.id, l]))

describe('result profiles', () => {
  it('give every raster layer exactly one profile, and name no other layer', () => {
    expect(rasters.length).toBeGreaterThan(0)
    for (const l of rasters) expect(RESULT_PROFILES[l.id], `${l.id} has no result profile`).toBeDefined()
    for (const id of Object.keys(RESULT_PROFILES)) expect(byId.has(id), `${id} is not a raster layer`).toBe(true)
  })

  it('read a pool layer from a source that declares the stock report of the same asset', () => {
    for (const [id, p] of Object.entries(RESULT_PROFILES)) {
      if (p.archetype !== 'stocks') continue
      const source = byId.get(p.source)
      const layer = byId.get(id)!
      expect(source?.gee?.stocks, `${id}: source ${p.source} has no stocks block`).toBeDefined()
      expect(layer.gee?.asset.id).toBe(source?.gee?.asset.id)
      const band = layer.gee?.asset.band
      const known = [source?.gee?.asset.band, ...(source?.gee?.stocks?.pools.map((q) => q.band) ?? [])]
      expect(known, `${id}: band ${band} is neither the total nor a pool`).toContain(band)
    }
  })

  it('total a density only in the unit its per-hectare value implies', () => {
    const totalFor: Record<string, string> = { 't C/ha': 't C', 'Mg C/ha': 't C', 'Mg/ha': 't' }
    for (const [id, p] of Object.entries(RESULT_PROFILES)) {
      if (p.archetype !== 'amount') continue
      const unit = byId.get(id)!.unit ?? ''
      expect(totalFor[unit], `${id}: unit ${unit} is not a per-hectare density`).toBe(p.totalUnit)
      // A total in biomass must say how much of it is carbon.
      if (p.totalUnit === 't') expect(p.carbonFraction, `${id}: biomass without a carbon fraction`).toBeGreaterThan(0)
    }
  })

  it('label a flux total with the gas unit of the layer', () => {
    const totalFor: Record<string, string> = { 'Mg CO2e/ha': 't CO2e', 'Mg CO2/ha': 't CO2' }
    for (const [id, p] of Object.entries(RESULT_PROFILES)) {
      if (p.archetype !== 'flux') continue
      expect(p.totalUnit).toBe(totalFor[byId.get(id)!.unit ?? ''])
      expect(p.signed).toBe(Boolean(byId.get(id)!.signedFlux))
    }
  })

  it('never average or total a class layer, and never give a class profile to a continuous one', () => {
    for (const [id, p] of Object.entries(RESULT_PROFILES)) {
      const layer = byId.get(id)!
      if (p.archetype === 'composition') {
        expect(layer.colorType, `${id}`).toBe('categorical')
        expect(layer.gee?.classify, `${id}: Jenks classes are not class codes`).toBeUndefined()
      } else if (layer.colorType === 'categorical' && !layer.gee?.classify) {
        throw new Error(`${id}: class codes under the ${p.archetype} archetype`)
      }
    }
  })

  it('group every land cover class into exactly one macro group', () => {
    for (const [id, p] of Object.entries(RESULT_PROFILES)) {
      if (p.archetype !== 'composition' || !p.nominal) continue
      const codes = (byId.get(id)!.classes ?? []).map((c) => c.value)
      const grouped = p.nominal.groups.flatMap((g) => g.codes)
      expect(new Set(grouped).size, `${id}: a code sits in two groups`).toBe(grouped.length)
      expect([...grouped].sort((a, b) => a - b)).toEqual([...codes].sort((a, b) => a - b))
      for (const n of p.nominal.native) expect(grouped).toContain(n)
    }
  })

  it('order every level of an ordinal layer, with the severe levels among the degraded', () => {
    for (const [id, p] of Object.entries(RESULT_PROFILES)) {
      if (p.archetype !== 'composition' || !p.ordinal) continue
      const codes = (byId.get(id)!.classes ?? []).map((c) => c.value).sort((a, b) => a - b)
      expect([...p.ordinal.order].sort((a, b) => a - b)).toEqual(codes)
      for (const s of p.ordinal.severe) expect(p.ordinal.degraded).toContain(s)
    }
  })

  it('keep histogram edges ascending', () => {
    for (const [id, p] of Object.entries(RESULT_PROFILES)) {
      if (p.archetype !== 'amount' && p.archetype !== 'distribution') continue
      for (let i = 1; i < p.bins.length; i++) expect(p.bins[i], `${id}`).toBeGreaterThan(p.bins[i - 1])
    }
  })

  it('read fire recurrence from a yearly accumulated band', () => {
    for (const [id, p] of Object.entries(RESULT_PROFILES)) {
      if (p.archetype !== 'recurrence') continue
      const layer = byId.get(id)!
      expect(layer.gee?.asset.bandPattern).toMatch(/\{ano\}$/)
      expect(Number(layer.gee?.temporal?.dateRange[0].slice(0, 4))).toBe(p.firstYear)
    }
  })
})
