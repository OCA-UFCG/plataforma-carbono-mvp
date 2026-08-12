import { describe, expect, it } from 'vitest'
import { summarizeStockGroups, type StocksConfig } from '@/lib/mapa/stockReport'

const cfg: StocksConfig = {
  pools: [
    { band: 'agb', label: 'Biomassa acima do solo' },
    { band: 'solo', label: 'Carbono do solo' },
  ],
  classAsset: 'classes', classBand: 'class', legend: 'fitofisionomia.json', unit: 't C',
}

describe('summarizeStockGroups', () => {
  it('sums pools and classes into the same total', () => {
    const report = summarizeStockGroups([
      { classe: 2, sum: [30, 10, 5] },
      { classe: 1, sum: [20, 40, 10] },
    ], cfg, [
      { codigo: 1, sigla: 'Ta', cor: '#000000' },
      { codigo: 2, sigla: 'TN', cor: '#ffffff' },
    ])

    expect(report.totalTc).toBe(100)
    expect(report.areaHa).toBe(15)
    expect(report.pools.map((pool) => pool.tc)).toEqual([50, 50])
    expect(report.classes.map((entry) => entry.tc)).toEqual([60, 40])
    expect(report.classes.map((entry) => entry.sigla)).toEqual(['Ta', 'TN'])
  })

  it('keeps unknown codes and returns zero totals for an empty result', () => {
    const unknown = summarizeStockGroups([{ classe: 99.8, sum: [5, 0, 2] }], cfg, [])
    const empty = summarizeStockGroups(undefined, cfg, [])

    expect(unknown.classes[0]).toMatchObject({ codigo: 99, sigla: '99', tc: 5, areaHa: 2 })
    expect(empty).toMatchObject({ totalTc: 0, areaHa: 0, classes: [] })
    expect(empty.pools.map((pool) => pool.tc)).toEqual([0, 0])
  })
})
