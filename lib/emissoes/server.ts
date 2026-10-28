import 'server-only'

// Server side of the emissions data: the map layers, resolved from a layer id
// to the `emissoes` block layers.json declares for it and built once per
// process, and the series of one municipality, state or the biome for the
// results panel. The client sends only ids and keys, so the 2 MB emissoes.json
// never leaves the server and no request can ask for a combination no layer
// offers.

import appConfig from '@/config/mapa/layers.json'
import emissoesJson from '@/config/emissoes/emissoes.json'
import { camadaEmissoes } from '@/lib/emissoes/camada'
import { posicoesUsoDaTerra, unidadeEmissoes } from '@/lib/emissoes/unidade'
import type {
  EmissoesCamadaPayload,
  EmissoesCamadaSpec,
  EmissoesFile,
  EmissoesUnidadePayload,
  NivelEmissoes,
} from '@/types/emissoes'

const data = emissoesJson as unknown as EmissoesFile

const SPECS = new Map<string, EmissoesCamadaSpec>(
  (appConfig.layers as { id: string; emissoes?: EmissoesCamadaSpec }[])
    .filter((l) => l.emissoes)
    .map((l) => [l.id, l.emissoes!]),
)

const cache = new Map<string, EmissoesCamadaPayload>()
let posicoes: { seeg: Map<string, number[]>; ct: Map<string, number[]> } | null = null

/** One municipality, state or the biome, or null when the file has no such unit. */
export function getUnidadeEmissoes(nivel: NivelEmissoes, chave: string): EmissoesUnidadePayload | null {
  posicoes ??= { seeg: posicoesUsoDaTerra(data, 'seeg'), ct: posicoesUsoDaTerra(data, 'ct') }
  return unidadeEmissoes(data, nivel, chave, posicoes)
}

/** The layer's answer, or null when no emissions layer has this id. */
export function getCamadaEmissoes(layerId: string): EmissoesCamadaPayload | null {
  const cached = cache.get(layerId)
  if (cached) return cached
  const spec = SPECS.get(layerId)
  if (!spec) return null
  const payload = camadaEmissoes(data, spec)
  cache.set(layerId, payload)
  return payload
}
