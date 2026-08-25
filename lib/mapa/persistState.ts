import type { LayerConfig, RasterLayerConfig } from '@/types/mapa'
import { defaultBasemapId, basemaps } from '@/config/mapa/basemaps'
import { paradas } from '@/lib/mapa/temporal'

/** Chave e versão do estado guardado. Payload de outra versão é descartado. */
export const PERSIST_KEY = 'cc_mapa_v1'
export const PERSIST_VERSION = 1

export interface PersistedView {
  center: [number, number]
  zoom: number
}

interface PersistedLayer {
  id: string
  visible: boolean
  opacity: number
}

export interface PersistedState {
  version: number
  layers: PersistedLayer[]
  basemapId: string
  temporalDate: Record<string, string>
  view: PersistedView | null
  drawing: GeoJSON.Feature | null
}

export interface LiveState {
  layers: LayerConfig[]
  basemapId: string
  temporalDate: Record<string, string>
  view: PersistedView | null
  drawing: GeoJSON.Feature | null
}

export interface RestoredState {
  layers: LayerConfig[]
  /** Rasters GEE que estavam ligados, a religar por `activateDynamicLayer`. */
  activateLayerIds: string[]
  basemapId: string
  temporalDate: Record<string, string>
  view: PersistedView | null
  drawing: GeoJSON.Feature | null
}

export function buildPersisted(live: LiveState): PersistedState {
  return {
    version: PERSIST_VERSION,
    layers: live.layers.map((l) => ({ id: l.id, visible: l.visible, opacity: l.opacity })),
    basemapId: live.basemapId,
    temporalDate: live.temporalDate,
    view: live.view,
    drawing: live.drawing,
  }
}

function clampOpacity(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.min(100, Math.max(0, v))
}

/**
 * Aplica visibilidade, opacidade e ordem guardadas sobre a configuração atual.
 * A ordem guardada manda, e camadas acrescentadas ao `layers.json` depois do
 * último acesso entram no fim, em vez de sumirem do painel.
 */
function restoreLayers(stored: unknown[], config: LayerConfig[]): LayerConfig[] {
  const porId = new Map(config.map((l) => [l.id, l]))
  const out: LayerConfig[] = []

  for (const entry of stored) {
    if (!isRecord(entry) || typeof entry.id !== 'string') continue
    const base = porId.get(entry.id)
    if (!base) continue          // camada saiu do layers.json entre deploys
    porId.delete(entry.id)
    out.push({
      ...base,
      visible: typeof entry.visible === 'boolean' ? entry.visible : base.visible,
      opacity: clampOpacity(entry.opacity, base.opacity),
    })
  }

  for (const restante of config) {
    if (porId.has(restante.id)) out.push(restante)
  }
  return out
}

function restoreView(stored: unknown): PersistedView | null {
  if (!isRecord(stored)) return null
  const { center, zoom } = stored
  if (!Array.isArray(center) || center.length !== 2) return null
  const [lon, lat] = center
  if (typeof lon !== 'number' || typeof lat !== 'number') return null
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
  if (Math.abs(lon) > 180 || Math.abs(lat) > 90) return null
  if (typeof zoom !== 'number' || !Number.isFinite(zoom)) return null
  return { center: [lon, lat], zoom }
}

// Confere só o formato. A geometria em si volta pelo mesmo handler que trata um
// desenho novo, que já lida com polígono, linha e ponto.
function restoreDrawing(stored: unknown): GeoJSON.Feature | null {
  if (!isRecord(stored)) return null
  if (stored.type !== 'Feature') return null
  if (!isRecord(stored.geometry) || typeof stored.geometry.type !== 'string') return null
  return stored as unknown as GeoJSON.Feature
}

function isGeeRaster(l: LayerConfig): l is RasterLayerConfig {
  return l.type === 'raster' && (l as RasterLayerConfig).source === 'gee'
}

/**
 * Conserva apenas anos que são parada real da camada. Um ano fora da série
 * pediria ao GEE um tile vazio, e a régua abriria numa posição inexistente.
 */
function restoreTemporalDate(
  stored: unknown,
  config: LayerConfig[],
): Record<string, string> {
  if (!isRecord(stored)) return {}
  const out: Record<string, string> = {}

  for (const [layerId, date] of Object.entries(stored)) {
    if (typeof date !== 'string') continue
    const layer = config.find((l) => l.id === layerId)
    if (!layer || !isGeeRaster(layer)) continue
    const temporal = layer.gee?.temporal
    if (!temporal || !paradas(temporal).includes(date)) continue
    out[layerId] = date
  }
  return out
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Traduz o payload guardado para um estado aplicável, conferindo tudo contra a
 * configuração atual. `layers.json` muda entre deploys, então nada que venha do
 * localStorage é aceito sem confronto com o que existe hoje.
 */
export function sanitizePersisted(raw: unknown, config: LayerConfig[]): RestoredState | null {
  if (!isRecord(raw)) return null
  if (raw.version !== PERSIST_VERSION) return null
  if (!Array.isArray(raw.layers)) return null

  const basemapId =
    typeof raw.basemapId === 'string' && raw.basemapId in basemaps
      ? raw.basemapId
      : defaultBasemapId

  const layers = restoreLayers(raw.layers, config)

  // Um raster GEE ligado precisa passar por `activateDynamicLayer` para ganhar
  // tile; restaurá-lo já visível o deixaria aceso no painel e ausente do mapa.
  const activateLayerIds = layers.filter((l) => l.visible && isGeeRaster(l)).map((l) => l.id)
  const paraAtivar = new Set(activateLayerIds)

  return {
    layers: layers.map((l) => (paraAtivar.has(l.id) ? { ...l, visible: false } : l)),
    activateLayerIds,
    basemapId,
    temporalDate: restoreTemporalDate(raw.temporalDate, config),
    view: restoreView(raw.view),
    drawing: restoreDrawing(raw.drawing),
  }
}

// Fronteira com o localStorage. Fica isolada aqui para o resto do módulo, que
// é onde mora a lógica, continuar puro e verificável em teste.

export function readPersisted(config: LayerConfig[]): RestoredState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage?.getItem(PERSIST_KEY)
    return raw ? sanitizePersisted(JSON.parse(raw), config) : null
  } catch {
    // JSON corrompido, ou localStorage bloqueado pelo navegador: abrir na
    // configuração padrão é melhor do que quebrar o módulo.
    return null
  }
}

export function writePersisted(live: LiveState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage?.setItem(PERSIST_KEY, JSON.stringify(buildPersisted(live)))
  } catch {
    // Cota estourada ou modo privativo: perder a continuidade é aceitável.
  }
}
