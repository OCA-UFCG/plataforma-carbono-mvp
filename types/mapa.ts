// Layer configs (shape of layers.json)

export interface RasterClass {
  value: number
  label: string
  color: string   // hex  e.g. "#202f1c"
}

export interface VectorLayerConfig {
  id: string
  name: string
  type: 'vector'
  /** Panel theme and subtheme, defined in config/mapa/groups.ts. */
  theme?: string
  subtheme?: string
  url: string
  visible: boolean
  opacity: number          // 0-100
  color: string            // hex, used for fill + outline
  labelField?: string      // property name rendered as a persistent symbol label
  hoverLabelField?: string // property name shown in a popup on mouse hover
  // Native GEE FeatureCollection asset id used to clip rasters to this region
  // (server-side). When set, the tile route clips to the indexed asset (fast,
  // full detail) instead of the local GeoJSON.
  clipAsset?: string
  // Dynamic source support
  // 'pmtiles' -> url points to a .pmtiles file; requires `sourceLayer`
  // 'wfs'     -> data is fetched from `wfsUrl`/`wfsTypeName` on every map
  //             move, filtered to the current viewport bbox
  source?: 'pmtiles' | 'wfs'
  sourceLayer?: string     // layer name inside the tileset (required for pmtiles)
  promoteId?: string       // property to use as feature ID (for feature-state)
  // WFS viewport-loading fields (only read when source === 'wfs')
  wfsUrl?:         string  // base GeoServer OWS endpoint
  wfsTypeName?:    string  // "namespace:featuretype"
  minZoomForLoad?: number  // don't fetch features below this zoom level
  maxFeatures?:    number  // hard cap per request (default 5000)
}

export interface RasterLayerConfig {
  id: string
  name: string
  type: 'raster'
  /** Panel theme and subtheme, defined in config/mapa/groups.ts. */
  theme?: string
  subtheme?: string
  // `url` is optional for dynamic sources (e.g. GEE) where the tile URL is
  // fetched on demand and cached in the store via `fetchedTileUrls[id]`.
  url?: string
  visible: boolean
  opacity: number   // 0-100
  nodata?: string | number
  colorType: 'categorical' | 'continuous'
  // categorical:
  classes?: RasterClass[]
  // continuous:
  colormapName?: string          // TiTiler preset name, e.g. "rdylgn"
  rescale?: [number, number]     // [min, max]
  unit?: string

  // Dynamic source support
  // When `source` is 'gee', the tile URL is resolved via `/api/gee/tile`
  // at activation time and cached in the store. The full asset pipeline
  // is declared in `gee.asset`.
  source?: 'titiler' | 'gee'
  clipToLayerId?: string         // vector layer id whose bbox clips the GEE image
  gee?: {
    asset: {
      type:        'image' | 'imageCollection'
      id:          string
      band?:       string
      filterDate?: [string, string]
      reducer?:    'mean' | 'median' | 'min' | 'max' | 'first' | 'sum'
      scale?:      number
      validMin?:    number
      validMax?:    number
      scaleFactor?: number
      multiplier?:  number
      offset?:      number
      unmaskValue?: number
      // Series whose year is in the band name, not in the dates of a collection
      // (MapBiomas writes `classification_1985` to `classification_2024` in a
      // single image). With this, the chosen date selects the year's band instead
      // of filtering the collection, and it also holds for `image` assets.
      bandPattern?: string          // "classification_{ano}"
    }
    visParams?: {
      min?:    number
      max?:    number
      palette?: string[]
    }
    classify?: {
      numClasses: number
      method:     'jenks'
      // Pre-computed Jenks breaks (numClasses-1 values). When present, the tile
      // route reuses them instead of sampling the raster live ("Jenks offline").
      // Regenerate with `npm run breaks` after changing the data or numClasses.
      breaks?:    number[]
    }
    // The presence of this block is what makes the layer time-navigable. The
    // step is always yearly: the layer in a given year is the same computation
    // the static version does, only with the year varying.
    temporal?: {
      dateRange: [string, string]   // ["1985-01-01", "2024-01-01"], always January 1st
      dates?:    string[]           // explicit stops, for series with gaps (ESA CCI)
    }
    // The presence of this block swaps the ordinary zonal statistics for the
    // stock report: instead of the mean of the visible band, the server returns
    // the total in tC broken down by pool and by phytophysiognomy. The displayed
    // layer is the sum of the pools; the other bands only feed the breakdown.
    stocks?: {
      pools:      { band: string; label: string }[]  // summed bands, in display order
      classAsset: string        // class code asset, aligned with the stock one
      classBand:  string
      legend:     string        // legend file in config/mapa/
      unit:       string        // unit of the total, e.g. "t C"
    }
  }
}

export type LayerConfig = VectorLayerConfig | RasterLayerConfig

// App config (full layers.json shape)

export interface AppConfig {
  map: {
    center: [number, number]
    zoom: number
  }
  layers: LayerConfig[]
}

// Drawing

export type DrawMode =
  | 'polygon'
  | 'rectangle'
  | 'linestring'
  | 'point'
  | null

// Measurement results

export interface PixelValueResult {
  value: number
  label?: string
  color?: string
}

export interface ContinuousStats {
  min:     number
  max:     number
  mean:    number
  median?: number
  std?:    number
  mode?:   number
  count:   number
  sum?:    number
}

export interface TimeSeriesPoint {
  date:  string         // "2024-01-01"
  value: number | null  // null = nodata
}

/** Total of a carbon pool over the queried geometry. */
export interface StockPool {
  band:  string
  label: string
  tc:    number
}

/** Total of a phytophysiognomy, broken down by the same pools. */
export interface StockClass {
  codigo: number
  sigla:  string
  tc:     number
  areaHa: number
  porPool: Record<string, number>
}

export interface StockReport {
  totalTc:  number
  areaHa:   number
  unit:     string
  pools:    StockPool[]
  classes:  StockClass[]   // sorted by decreasing stock
}

export type RasterStatsResult =
  // `areas` = area in m² per class code (converted to hectares in the UI).
  | { kind: 'categorical'; areas: Record<string, number> }
  | { kind: 'continuous';  stats:  ContinuousStats; unit?: string }
  | { kind: 'timeseries';  series: TimeSeriesPoint[] }
  | { kind: 'stocks';      report: StockReport }

// Basemap (raster XYZ tiles)

export interface Basemap {
  id: string
  name: string
  url: string          // XYZ template (e.g. https://.../{z}/{x}/{y}.png)
  attribution: string
  maxZoom?: number
}

// Theme / branding

export interface PlatformColors {
  accent:    string   // --acc: seasonal accent (toggles on, active tool, primary btn)
  accentBg:  string   // --accBg: soft bg tint for accent boxes/chips
  accentInk: string   // --accInk: text over accentBg
  accentBd:  string   // --accBd: border of active cards
  accentGrad:string   // --accGrad: brand icon / season dot gradient
  onAccent:  string   // legible foreground over solid --acc (adapts to dark)
  bg:        string   // --paper: page background
  bgCard:    string   // --card: card background
  border:    string   // --silver: borders/dividers
  text:      string   // --ink: primary text
  body:      string   // --body: long-form paragraph text
  textDim:   string   // --trunk: secondary text
  dim:       string   // muted text (descriptions)
  caption:   string   // micro captions
  chip:      string   // rectangular source-chip bg
  mist:      string   // recessed surfaces
  terracota: string   // fixed: draw tool, warm warnings
  acude:     string   // fixed: water, links, info
  glassBg:   string   // floating panel background (glass)
  glassBd:   string   // floating panel border
}

export interface PlatformTheme {
  id: string
  name: string          // short identifier shown in the header
  fullName: string      // long description shown under the name
  footer: string        // footer line, e.g. "OCA / UFCG-INSA"
  colors: PlatformColors
  // Optional dark-mode override. When defined and dark mode is enabled, these
  // colors replace `colors` at the theme level so components stay mode-agnostic.
  darkColors?: PlatformColors
}
