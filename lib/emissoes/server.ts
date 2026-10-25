import 'server-only'

// Server side of the emissions map layers: resolves a layer id to the
// `emissoes` block layers.json declares for it and builds its answer once per
// process. The client sends only the id, so the 2 MB emissoes.json never
// leaves the server and no request can ask for a combination no layer offers.

import appConfig from '@/config/mapa/layers.json'
import emissoesJson from '@/config/emissoes/emissoes.json'
import { camadaEmissoes } from '@/lib/emissoes/camada'
import type { EmissoesCamadaPayload, EmissoesCamadaSpec, EmissoesFile } from '@/types/emissoes'

const data = emissoesJson as unknown as EmissoesFile

const SPECS = new Map<string, EmissoesCamadaSpec>(
  (appConfig.layers as { id: string; emissoes?: EmissoesCamadaSpec }[])
    .filter((l) => l.emissoes)
    .map((l) => [l.id, l.emissoes!]),
)

const cache = new Map<string, EmissoesCamadaPayload>()

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
