// Resolves the stock configuration on the server, from the layer id.
//
// The client sends only the id. Accepting the `stocks` block from the client
// would open exactly the hole the allowlist closes: a caller could point
// `classAsset` at any asset and use the service account to read it.

import appConfig from '@/config/mapa/layers.json'
import fitofisionomia from '@/config/mapa/fitofisionomia.json'
import type { StocksConfig, LegendaClasse } from './stockReport'

// Known legends, by file name. A static map instead of a dynamic import because
// the set is closed and the bundler resolves it at build time.
const LEGENDAS: Record<string, LegendaClasse[]> = {
  'fitofisionomia.json': fitofisionomia.classes,
}

export interface EntradaStocks {
  cfg:     StocksConfig
  legenda: LegendaClasse[]
  /** Stock asset of the layer itself, for the computation to reuse. */
  assetId: string
  assetBand?: string
  scale:   number
}

const cache = new Map<string, EntradaStocks | null>()

/** Stock configuration of a layer, or null if it has no such block. */
export function getStocks(layerId: string): EntradaStocks | null {
  const emCache = cache.get(layerId)
  if (emCache !== undefined) return emCache

  const layer = appConfig.layers.find((l) => l.id === layerId) as
    | { gee?: { asset?: { id?: string; band?: string; scale?: number }; stocks?: StocksConfig } }
    | undefined
  const stocks = layer?.gee?.stocks
  const assetId = layer?.gee?.asset?.id

  let entrada: EntradaStocks | null = null
  if (stocks && assetId) {
    const legenda = LEGENDAS[stocks.legend]
    if (!legenda) {
      console.error(`[stocksRegistry] legenda "${stocks.legend}" não registrada`)
    } else {
      entrada = {
        cfg: stocks,
        legenda,
        assetId,
        assetBand: layer?.gee?.asset?.band,
        scale: layer?.gee?.asset?.scale ?? 100,
      }
    }
  }
  cache.set(layerId, entrada)
  return entrada
}
