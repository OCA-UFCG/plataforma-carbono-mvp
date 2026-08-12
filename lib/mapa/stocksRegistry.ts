// Resolve a configuração de estoque no servidor, a partir do id da camada.
//
// O cliente manda só o id. Aceitar o bloco `stocks` vindo do cliente abriria
// exatamente o buraco que a allowlist fecha: um chamador poderia apontar
// `classAsset` para qualquer asset e usar a service account para lê-lo.

import appConfig from '@/config/mapa/layers.json'
import fitofisionomia from '@/config/mapa/fitofisionomia.json'
import type { StocksConfig, LegendaClasse } from './stockReport'

// Legendas conhecidas, por nome de arquivo. Um mapa estático em vez de import
// dinâmico porque o conjunto é fechado e o bundler resolve em tempo de build.
const LEGENDAS: Record<string, LegendaClasse[]> = {
  'fitofisionomia.json': fitofisionomia.classes,
}

export interface EntradaStocks {
  cfg:     StocksConfig
  legenda: LegendaClasse[]
  /** Asset de estoque da própria camada, para o cálculo reusar. */
  assetId: string
  assetBand?: string
  scale:   number
}

const cache = new Map<string, EntradaStocks | null>()

/** Configuração de estoque de uma camada, ou null se ela não tiver o bloco. */
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
