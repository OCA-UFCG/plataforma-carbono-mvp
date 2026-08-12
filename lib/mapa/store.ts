import { create } from 'zustand'
import type {
  LayerConfig,
  DrawMode,
  PixelValueResult,
  RasterLayerConfig,
  RasterStatsResult,
} from '@/types/mapa'
import appConfig from '@/config/mapa/layers.json'
import { defaultBasemapId } from '@/config/mapa/basemaps'
import { isMonthPref, type MonthPref } from '@/lib/phenology'
import { paradaInicial } from '@/lib/mapa/temporal'

const DARK_MODE_KEY = 'cc_dark_mode_v1'
const DARK_MODE_KEY_LEGADA = 'websig-dark-mode'

// Store shape

interface MapaStore {
  layers: LayerConfig[]
  drawMode: DrawMode
  drawnArea: number | null
  drawnLength: number | null
  rasterStats: RasterStatsResult | null
  pixelValue: PixelValueResult | null
  // Zonal-stats request lifecycle (separate from layer tile loading), so the
  // sidebar can show a spinner during the GEE call and a message on failure.
  statsLoading: boolean
  statsError: string | null
  // Human label for what's being analysed (e.g. "Campina Grande"), shown in
  // the results card so the numbers are never ambiguous about their source.
  analysisLabel: string | null
  // Kind of cut the analysis came from (e.g. "Municípios", "Área desenhada"),
  // rendered as the chip above the label in the results panel.
  analysisKind: string | null
  clearSignal: number
  basemapId: string
  darkMode: boolean
  // Mes que veste a interface ('auto' segue a data) + flag de welcome visto.
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
  setOpacity:    (id: string, opacity: number) => void
  reorderLayer:  (id: string, toIndex: number) => void

  setDrawMode:    (mode: DrawMode) => void
  setDrawnArea:   (area: number | null) => void
  setDrawnLength: (length: number | null) => void
  setRasterStats: (stats: RasterStatsResult | null) => void
  setPixelValue:  (value: PixelValueResult | null) => void
  setStatsLoading:  (v: boolean) => void
  setStatsError:    (v: string | null) => void
  setAnalysisLabel: (v: string | null) => void
  setAnalysisKind:  (v: string | null) => void
  setBasemap:     (id: string) => void
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
  layers: appConfig.layers as LayerConfig[],
  drawMode: null,
  drawnArea: null,
  drawnLength: null,
  rasterStats: null,
  pixelValue: null,
  statsLoading: false,
  statsError: null,
  analysisLabel: null,
  analysisKind: null,
  clearSignal: 0,
  basemapId: defaultBasemapId,
  // Modo escuro: hidrata do localStorage no cliente e, sem nenhuma marca
  // guardada, acompanha a preferencia do sistema operacional.
  // LEGADO: ate 2026-07 a chave era 'websig-dark-mode'. Ela ainda e lida uma
  // vez para nao descartar a escolha de quem ja usava a plataforma; a partir do
  // primeiro toque no botao, so a chave nova e escrita.
  darkMode: typeof window !== 'undefined'
    ? (() => {
        const stored = window.localStorage?.getItem(DARK_MODE_KEY)
          ?? window.localStorage?.getItem(DARK_MODE_KEY_LEGADA)
        if (stored === 'true') return true
        if (stored === 'false') return false
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
      })()
    : false,
  // Chave nova (v2) porque a v1 guardava estacao ('chuva'/'transicao'/'seca'),
  // que nao existe mais; isMonthPref descarta o valor velho em vez de aceitar
  // um mes invalido vindo do localStorage.
  month: (() => {
    if (typeof window === 'undefined') return 'auto'
    const stored = window.localStorage?.getItem('cc_month_v2')
    return isMonthPref(stored) ? stored : 'auto'
  })(),
  welcomeSeen: typeof window !== 'undefined'
    && window.localStorage?.getItem('cc_welcome_v1') === '1',

  fetchedTileUrls:  {},
  loadingLayers:    {},
  layerErrors:      {},
  jenksBreaks:      {},
  temporalTileUrls: {},
  temporalDate:     {},
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
      layers: s.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    }))
  },

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
  setRasterStats: (stats)  => set({ rasterStats: stats }),
  setPixelValue:  (value)  => set({ pixelValue: value }),
  setStatsLoading:  (v)    => set({ statsLoading: v }),
  setStatsError:    (v)    => set({ statsError: v }),
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
  clearDrawings:  ()       =>
    set((s) => ({
      drawnArea: null,
      drawnLength: null,
      drawMode: null,
      rasterStats: null,
      pixelValue: null,
      statsLoading: false,
      statsError: null,
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
          layers: s.layers.map((l) => (l.id === id ? { ...l, visible: true } : l)),
        }))
      } else {
        // Static: single cached URL
        set((s) => ({
          fetchedTileUrls: { ...s.fetchedTileUrls, [id]: tileUrl },
          loadingLayers:   omitKey(s.loadingLayers, id),
          layers: s.layers.map((l) => (l.id === id ? { ...l, visible: true } : l)),
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

// Helper: return a new object with `key` removed
function omitKey<T extends Record<string, unknown>>(obj: T, key: string): T {
  if (!(key in obj)) return obj
  const copy = { ...obj }
  delete copy[key]
  return copy
}

// Export map config so MapView can read center/zoom/basemap
export const mapConfig = appConfig.map
