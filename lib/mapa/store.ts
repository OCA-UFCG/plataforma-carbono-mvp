import { create } from 'zustand'
import type {
  LayerConfig,
  DrawMode,
  LayerResult,
  PixelValueResult,
  RasterLayerConfig,
  RasterStatsResult,
  SelectedGeometry,
} from '@/types/mapa'
import appConfig from '@/config/mapa/layers.json'
import { defaultBasemapId } from '@/config/mapa/basemaps'
import { isMonthPref, type MonthPref } from '@/lib/phenology'
import { paradaInicial } from '@/lib/mapa/temporal'
import { isExclusiveSubtheme } from '@/config/mapa/groups'
import {
  readPersisted,
  writePersisted,
  type PersistedView,
} from '@/lib/mapa/persistState'

const DARK_MODE_KEY = 'cc_dark_mode_v1'
const DARK_MODE_KEY_LEGADA = 'websig-dark-mode'

// State from the previous session, checked against today's layers.json. Read
// once, at module load, for the initial store values below.
const restaurado = readPersisted(appConfig.layers as LayerConfig[])

/**
 * GEE rasters that were on when the user left. They come back off: only
 * `toggleLayer` fetches the tile, so turning them back on has to go through
 * `activateDynamicLayer`, which Mapa does on mount.
 */
export const camadasARestaurar: string[] = restaurado?.activateLayerIds ?? []

export function setLayerVisibility(layers: LayerConfig[], id: string, visible: boolean) {
  const selected = layers.find((layer) => layer.id === id)
  if (!selected) return layers

  const exclusive = visible && isExclusiveSubtheme(selected.theme, selected.subtheme)
  return layers.map((layer) => {
    if (layer.id === id) return { ...layer, visible }
    if (exclusive && layer.theme === selected.theme && layer.subtheme === selected.subtheme) {
      return { ...layer, visible: false }
    }
    return layer
  })
}

// Store shape

interface MapaStore {
  layers: LayerConfig[]
  drawMode: DrawMode
  drawnArea: number | null
  drawnLength: number | null
  // One result per visible raster, keyed by layer id. Nothing prunes it when a
  // layer is switched off: the panel renders the intersection with the visible
  // rasters, so the card disappears on its own and switching the layer back on
  // reuses the result -- still valid, because every path that changes the
  // geometry clears the whole record first.
  results: Record<string, LayerResult>
  // What the results refer to. MapView kept this in a ref while nothing outside
  // the map needed it; a failed card's "Tentar novamente" does, so it is state.
  selectedGeometry: SelectedGeometry | null
  // Human label for what's being analysed (e.g. "Campina Grande"), shown in
  // the results card so the numbers are never ambiguous about their source.
  analysisLabel: string | null
  // Kind of cut the analysis came from (e.g. "Municípios", "Área desenhada"),
  // rendered as the chip above the label in the results panel.
  analysisKind: string | null
  clearSignal: number
  basemapId: string
  darkMode: boolean
  // Current viewport and drawing. They live in the store so persistence has a
  // single read point; MapView consumes them on mount and feeds them afterwards.
  view: PersistedView | null
  drawing: GeoJSON.Feature | null
  // Month dressing the interface ('auto' follows the date) + welcome-seen flag.
  month: MonthPref
  welcomeSeen: boolean

  // Dynamic layer (GEE) state
  fetchedTileUrls:  Record<string, string>
  loadingLayers:    Record<string, boolean>
  layerErrors:      Record<string, string>
  // Jenks break values per layer, computed once biome-wide by /api/gee/tile.
  // Reused so per-feature stats and point classes match the map colors.
  jenksBreaks:      Record<string, number[]>

  // Temporal layer state
  temporalTileUrls: Record<string, Record<string, string>>  // layerId -> { dateKey -> tileUrl }
  temporalDate:     Record<string, string>                   // layerId -> current dateKey

  // Stats cache (avoids re-fetching stats from GEE/TiTiler)
  // Key format: "layerId:dateOrStatic:geomHash"
  statsCache: Record<string, RasterStatsResult>
  pixelCache: Record<string, PixelValueResult | null>

  toggleLayer:   (id: string) => void
  showLayer:     (id: string) => void
  setOpacity:    (id: string, opacity: number) => void
  reorderLayer:  (id: string, toIndex: number) => void

  setDrawMode:    (mode: DrawMode) => void
  setDrawnArea:   (area: number | null) => void
  setDrawnLength: (length: number | null) => void
  setLayerResult:      (result: LayerResult) => void
  clearResults:        () => void
  setSelectedGeometry: (geom: SelectedGeometry | null) => void
  setAnalysisLabel: (v: string | null) => void
  setAnalysisKind:  (v: string | null) => void
  setBasemap:     (id: string) => void
  setView:        (v: PersistedView) => void
  setDrawing:     (f: GeoJSON.Feature | null) => void
  toggleDarkMode: () => void
  setMonth:       (m: MonthPref) => void
  setWelcomeSeen: (v: boolean) => void
  clearDrawings:  () => void

  activateDynamicLayer: (layer: RasterLayerConfig) => Promise<void>
  setTemporalDate:      (layerId: string, date: string) => Promise<void>
  clearLayerError:      (id: string) => void
}

// Store

export const useStore = create<MapaStore>((set, get) => ({
  // Initial layers come entirely from config/layers.json
  layers: restaurado?.layers ?? (appConfig.layers as LayerConfig[]),
  drawMode: null,
  drawnArea: null,
  drawnLength: null,
  results: {},
  selectedGeometry: null,
  analysisLabel: null,
  analysisKind: null,
  clearSignal: 0,
  basemapId: restaurado?.basemapId ?? defaultBasemapId,
  // Dark mode: hydrates from localStorage on the client and, with no stored
  // mark, follows the operating system preference.
  // LEGACY: until 2026-07 the key was 'websig-dark-mode'. It is still read once
  // so we do not discard the choice of existing users; from the first tap on
  // the button onwards, only the new key is written.
  darkMode: typeof window !== 'undefined'
    ? (() => {
        const stored = window.localStorage?.getItem(DARK_MODE_KEY)
          ?? window.localStorage?.getItem(DARK_MODE_KEY_LEGADA)
        if (stored === 'true') return true
        if (stored === 'false') return false
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
      })()
    : false,
  // New key (v2) because v1 stored a season ('chuva'/'transicao'/'seca'), which
  // no longer exists; isMonthPref discards the old value instead of accepting
  // an invalid month coming from localStorage.
  month: (() => {
    if (typeof window === 'undefined') return 'auto'
    const stored = window.localStorage?.getItem('cc_month_v2')
    return isMonthPref(stored) ? stored : 'auto'
  })(),
  welcomeSeen: typeof window !== 'undefined'
    && window.localStorage?.getItem('cc_welcome_v1') === '1',

  view:    restaurado?.view ?? null,
  drawing: restaurado?.drawing ?? null,

  fetchedTileUrls:  {},
  loadingLayers:    {},
  layerErrors:      {},
  jenksBreaks:      {},
  temporalTileUrls: {},
  temporalDate:     restaurado?.temporalDate ?? {},
  statsCache:       {},
  pixelCache:       {},

  toggleLayer: (id) => {
    const state = get()
    const layer = state.layers.find((l) => l.id === id)

    // Dynamic (GEE) layer being turned ON for the first time?
    // Delegate to activateDynamicLayer which handles the API fetch +
    // visibility flip on success.
    const isTemporal = layer?.type === 'raster' && !!(layer as RasterLayerConfig).gee?.temporal
    if (
      layer &&
      layer.type === 'raster' &&
      (layer as RasterLayerConfig).source === 'gee' &&
      !layer.visible &&
      !state.fetchedTileUrls[id] &&
      !(isTemporal && state.temporalTileUrls[id])
    ) {
      void state.activateDynamicLayer(layer as RasterLayerConfig)
      return
    }

    set((s) => ({
      layers: setLayerVisibility(s.layers, id, !layer?.visible),
    }))
  },

  showLayer: (id) =>
    set((s) => ({
      layers: setLayerVisibility(s.layers, id, true),
    })),

  setOpacity: (id, opacity) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === id ? { ...l, opacity } : l
      ),
    })),

  reorderLayer: (id, toIndex) =>
    set((s) => {
      const fromIndex = s.layers.findIndex((l) => l.id === id)
      if (fromIndex < 0 || fromIndex === toIndex) return s
      const layers = [...s.layers]
      const [moved] = layers.splice(fromIndex, 1)
      // Removing the source before inserting shifts every index above it down
      // by one, so when dragging downward the target index must be adjusted or
      // the item lands one slot past the drop indicator.
      const adjusted = fromIndex < toIndex ? toIndex - 1 : toIndex
      layers.splice(adjusted, 0, moved)
      return { layers }
    }),

  setDrawMode:    (mode)   => set({ drawMode: mode }),
  setDrawnArea:   (area)   => set({ drawnArea: area }),
  setDrawnLength: (length) => set({ drawnLength: length }),
  // A full replace, not a merge: a layer moving back to 'loading' must drop the
  // previous stop's numbers, or the card would show last year's mean under this
  // year's header while the request is in flight.
  setLayerResult: (result) =>
    set((s) => ({ results: { ...s.results, [result.layerId]: result } })),
  clearResults: () => set({ results: {} }),
  setSelectedGeometry: (geom) => set({ selectedGeometry: geom }),
  setAnalysisLabel: (v)    => set({ analysisLabel: v }),
  setAnalysisKind:  (v)    => set({ analysisKind: v }),
  setBasemap:     (id)     => set({ basemapId: id }),
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem(DARK_MODE_KEY, String(next))
      }
      return { darkMode: next }
    }),
  setMonth: (month) => {
    if (typeof window !== 'undefined') window.localStorage?.setItem('cc_month_v2', month)
    set({ month })
  },
  setWelcomeSeen: (v) => {
    if (typeof window !== 'undefined') window.localStorage?.setItem('cc_welcome_v1', v ? '1' : '0')
    set({ welcomeSeen: v })
  },
  setView:    (v) => set({ view: v }),
  setDrawing: (f) => set({ drawing: f }),
  clearDrawings:  ()       =>
    set((s) => ({
      drawing: null,
      drawnArea: null,
      drawnLength: null,
      drawMode: null,
      results: {},
      selectedGeometry: null,
      analysisLabel: null,
      analysisKind: null,
      clearSignal: s.clearSignal + 1,
    })),

  // Dynamic layer orchestration
  activateDynamicLayer: async (layer) => {
    const id = layer.id

    // Mark loading, clear previous error
    set((s) => ({
      loadingLayers: { ...s.loadingLayers, [id]: true },
      layerErrors:   omitKey(s.layerErrors, id),
    }))

    try {
      if (layer.source !== 'gee') {
        throw new Error(`Unsupported dynamic source: ${layer.source}`)
      }
      if (!layer.gee?.asset) {
        throw new Error(`Layer "${id}" is missing gee.asset`)
      }

      // 1. The clip is identified by id only, the server reads the local
      //    GeoJSON and caches the simplified geometry + bbox, so we avoid
      //    uploading the (multi-MB) boundary on every activation.
      const clipId = layer.clipToLayerId

      // 2. Determine if this is a temporal layer
      const temporal = layer.gee.temporal
      const temporalDate = temporal ? paradaInicial(temporal) : undefined

      // 3. Call the generic tile endpoint
      const res = await fetch('/api/gee/tile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset:        layer.gee.asset,
          clipId,
          temporalDate,
          visParams:    layer.gee.visParams,
          classify:     layer.gee.classify,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error ?? `API error ${res.status}`)
      }

      const { tileUrl, breaks } = await res.json()
      if (typeof tileUrl !== 'string' || !tileUrl) {
        throw new Error('API returned no tileUrl')
      }

      // Capture biome-wide Jenks breaks so per-feature stats and point
      // classes reuse the same cut points as the map colors.
      if (Array.isArray(breaks) && breaks.length > 0) {
        set((s) => ({ jenksBreaks: { ...s.jenksBreaks, [id]: breaks } }))
      }

      // 4. Success: cache URL, flip visible, clear loading
      if (temporal && temporalDate) {
        // Temporal: cache under date key, set initial date
        set((s) => ({
          temporalTileUrls: {
            ...s.temporalTileUrls,
            [id]: { ...s.temporalTileUrls[id], [temporalDate]: tileUrl },
          },
          temporalDate:  { ...s.temporalDate, [id]: temporalDate },
          loadingLayers: omitKey(s.loadingLayers, id),
          layers: setLayerVisibility(s.layers, id, true),
        }))
      } else {
        // Static: single cached URL
        set((s) => ({
          fetchedTileUrls: { ...s.fetchedTileUrls, [id]: tileUrl },
          loadingLayers:   omitKey(s.loadingLayers, id),
          layers: setLayerVisibility(s.layers, id, true),
        }))
      }
    } catch (err) {
      const msg = (err as Error).message ?? String(err)
      console.error('[activateDynamicLayer]', msg)
      set((s) => ({
        loadingLayers: omitKey(s.loadingLayers, id),
        layerErrors:   { ...s.layerErrors, [id]: msg },
      }))
    }
  },

  // Temporal date navigation
  setTemporalDate: async (layerId, date) => {
    // 1. Update selected date immediately (UI stays responsive)
    set((s) => ({ temporalDate: { ...s.temporalDate, [layerId]: date } }))

    // 2. Check cache, if already fetched, nothing more to do
    const cached = get().temporalTileUrls[layerId]?.[date]
    if (cached) return

    // 3. Cache miss, fetch tile URL from GEE for this date
    const layer = get().layers.find((l) => l.id === layerId) as RasterLayerConfig | undefined
    if (!layer?.gee?.asset) return

    set((s) => ({
      loadingLayers: { ...s.loadingLayers, [layerId]: true },
      layerErrors:   omitKey(s.layerErrors, layerId),
    }))

    try {
      const res = await fetch('/api/gee/tile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset:        layer.gee.asset,
          clipId:       layer.clipToLayerId,
          temporalDate: date,
          visParams:    layer.gee.visParams,
          classify:     layer.gee.classify,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error ?? `API error ${res.status}`)
      }

      const { tileUrl } = await res.json()
      if (typeof tileUrl !== 'string' || !tileUrl) {
        throw new Error('API returned no tileUrl')
      }

      set((s) => ({
        temporalTileUrls: {
          ...s.temporalTileUrls,
          [layerId]: { ...s.temporalTileUrls[layerId], [date]: tileUrl },
        },
        loadingLayers: omitKey(s.loadingLayers, layerId),
      }))
    } catch (err) {
      const msg = (err as Error).message ?? String(err)
      console.error('[setTemporalDate]', msg)
      set((s) => ({
        loadingLayers: omitKey(s.loadingLayers, layerId),
        layerErrors:   { ...s.layerErrors, [layerId]: msg },
      }))
    }
  },

  clearLayerError: (id) =>
    set((s) => ({ layerErrors: omitKey(s.layerErrors, id) })),
}))

/**
 * Whether the results panel has anything to show.
 *
 * Exported because Mapa.tsx needs the same answer as ResultsSidebar to decide
 * how far to shift the map controls, and two copies of this condition -- which
 * is what the code had -- drift apart.
 */
export function hasAnalysisContent(s: {
  drawnArea:   number | null
  drawnLength: number | null
  results:     Record<string, LayerResult>
  layers:      LayerConfig[]
}): boolean {
  if (s.drawnArea !== null || s.drawnLength !== null) return true
  return s.layers.some(
    (l) => l.type === 'raster' && l.visible && s.results[l.id] !== undefined,
  )
}

// Helper: return a new object with `key` removed
function omitKey<T extends Record<string, unknown>>(obj: T, key: string): T {
  if (!(key in obj)) return obj
  const copy = { ...obj }
  delete copy[key]
  return copy
}

// Export map config so MapView can read center/zoom/basemap
export const mapConfig = appConfig.map

// Persistence: a single subscriber, instead of a setItem scattered across
// toggleLayer, setOpacity, reorderLayer, setBasemap and setTemporalDate. Five
// write points drift out of sync; one subscriber does not. The debounce avoids
// writing on every frame while the user drags the map or the opacity.
if (typeof window !== 'undefined') {
  let pendente: ReturnType<typeof setTimeout> | undefined

  useStore.subscribe((s) => {
    clearTimeout(pendente)
    pendente = setTimeout(() => {
      writePersisted({
        layers: s.layers,
        basemapId: s.basemapId,
        temporalDate: s.temporalDate,
        view: s.view,
        drawing: s.drawing,
      })
    }, 400)
  })
}
