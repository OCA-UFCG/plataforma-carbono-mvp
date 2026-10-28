// The single place that fetches the emissions map layers: for every visible
// one, its values at every level and year at once (/api/mapa/emissoes), into
// the store. MapView draws them and the legend describes them through
// lib/emissoes/mapa.ts.

import { isEmissionsLayer, type EmissoesEntry } from '@/lib/emissoes/mapa'
import { useStore } from '@/lib/mapa/store'
import type { EmissoesCamadaPayload } from '@/types/emissoes'
import type { LayerConfig } from '@/types/mapa'

/**
 * Ids of the visible emissions layers with nothing asked yet. Pure. A failed
 * entry asks nothing more; turning the layer off and on drops it (store).
 */
export function pendingEmissoes(layers: LayerConfig[], emissoes: Record<string, EmissoesEntry>): string[] {
  return layers.filter((l) => isEmissionsLayer(l) && l.visible && !emissoes[l.id]).map((l) => l.id)
}

function setEntry(id: string, entry: EmissoesEntry) {
  useStore.setState((s) => ({ emissoes: { ...s.emissoes, [id]: entry } }))
}

async function fetchEmissoes(id: string): Promise<void> {
  setEntry(id, { status: 'loading' })
  try {
    const res = await fetch(`/api/mapa/emissoes?camada=${encodeURIComponent(id)}`)
    if (!res.ok) throw new Error(`API error ${res.status}`)
    setEntry(id, { status: 'ready', payload: await res.json() as EmissoesCamadaPayload })
  } catch (err) {
    console.error('[emissoes]', id, err)
    setEntry(id, { status: 'error' })
  }
}

/** Fetch whatever the emissions layers on screen still lack. */
export function runEmissoes(): void {
  const { layers, emissoes } = useStore.getState()
  for (const id of pendingEmissoes(layers, emissoes)) void fetchEmissoes(id)
}
