// Relatório de estoque de carbono sobre uma geometria: total, decomposição por
// reservatório e por fitofisionomia, numa chamada só ao Earth Engine.
//
// A conta é sempre densidade vezes área do pixel. O `pixelArea()` devolve área
// geodésica real no elipsoide, o que importa num bioma que se estende por 13
// graus de latitude: assumir área constante superestimaria o total em cerca de
// 0,7% (medido contra o inventário).

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
  sum:    number[]   // um total por reservatório, na ordem de `pools`
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
 * Cruza os reservatórios com a classe e devolve a tabela completa.
 *
 * `ee` e `geometry` são `any` porque @google/earthengine não traz tipos.
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

  // Densidade (t C/ha) x área (ha) = estoque (t C) por pixel.
  const tcPorPixel = stockImage.select(bands).multiply(haPorPixel)

  // Uma passada só: soma cada reservatório e a área, agrupando pela classe.
  // A área entra como banda extra para o relatório poder mostrar densidade por
  // fitofisionomia sem uma segunda consulta.
  // O nome não pode começar com sublinhado: o Earth Engine recusa.
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
