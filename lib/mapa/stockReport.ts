// Carbon stock report over a geometry: total, breakdown by pool and by
// phytophysiognomy, in a single call to Earth Engine.
//
// The math is always density times pixel area. `pixelArea()` returns the real
// geodesic area on the ellipsoid, which matters in a biome that spans 13
// degrees of latitude: assuming a constant area would overestimate the total by
// about 0.7% (measured against the inventory).

import { evaluate } from './geeEvaluate'

export interface StocksConfig {
  pools:      { band: string; label: string }[]
  classAsset: string
  classBand:  string
  legend:     string
  unit:       string
}

export interface LegendaClasse {
  codigo: number
  sigla:  string
  cor:    string
}

interface GrupoBruto {
  classe: number
  sum:    number[]   // one total per pool, in the order of `pools`
}

export function summarizeStockGroups(
  groups: GrupoBruto[] | undefined,
  cfg: StocksConfig,
  legenda: LegendaClasse[],
) {
  const bands = cfg.pools.map((p) => p.band)
  const porSigla = new Map(legenda.map((c) => [c.codigo, c.sigla]))
  const totalPorPool = new Map(bands.map((b) => [b, 0]))
  let totalTc = 0
  let areaHa = 0

  const classes = (groups ?? []).map((g) => {
    const porPool: Record<string, number> = {}
    let tc = 0
    bands.forEach((b, i) => {
      const v = Number(g.sum[i]) || 0
      porPool[b] = v
      tc += v
      totalPorPool.set(b, (totalPorPool.get(b) ?? 0) + v)
    })
    const ha = Number(g.sum[bands.length]) || 0
    totalTc += tc
    areaHa += ha
    const codigo = Math.trunc(Number(g.classe))
    return { codigo, sigla: porSigla.get(codigo) ?? String(codigo), tc, areaHa: ha, porPool }
  })

  classes.sort((a, b) => b.tc - a.tc)
  return {
    totalTc,
    areaHa,
    unit: cfg.unit,
    pools: cfg.pools.map((p) => ({ band: p.band, label: p.label, tc: totalPorPool.get(p.band) ?? 0 })),
    classes,
  }
}

/**
 * Crosses the pools with the class and returns the complete table.
 *
 * `ee` and `geometry` are `any` because @google/earthengine ships no types.
 */
export async function buildStockReport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ee: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stockImage: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geometry: any,
  cfg: StocksConfig,
  legenda: LegendaClasse[],
  scale: number,
) {
  const bands = cfg.pools.map((p) => p.band)
  const classe = ee.Image(cfg.classAsset).select(cfg.classBand)
  const haPorPixel = ee.Image.pixelArea().divide(1e4)

  // Density (t C/ha) x area (ha) = stock (t C) per pixel.
  const tcPorPixel = stockImage.select(bands).multiply(haPorPixel)

  // A single pass: sums each pool and the area, grouping by class.
  // The area goes in as an extra band so the report can show density per
  // phytophysiognomy without a second query.
  // The name cannot start with an underscore: Earth Engine rejects it.
  const empilhado = tcPorPixel.addBands(haPorPixel.rename('areaHa')).addBands(classe)
  const nSomas = bands.length + 1

  const bruto = await evaluate<{ groups?: GrupoBruto[] }>(
    empilhado.reduceRegion({
      reducer: ee.Reducer.sum().repeat(nSomas)
        .group({ groupField: nSomas, groupName: 'classe' }),
      geometry,
      scale,
      maxPixels:  1e10,
      bestEffort: true,
      tileScale:  4,
    }),
  )

  return summarizeStockGroups(bruto?.groups, cfg, legenda)
}
