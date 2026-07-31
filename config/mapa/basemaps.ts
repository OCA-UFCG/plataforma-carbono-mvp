import type { Basemap } from '@/types/mapa'

/**
 * Basemap providers, all treated uniformly as raster XYZ tiles.
 * This keeps the MapView code simple: swapping basemaps is just
 * a source/layer replacement, no style diff, no layer re-add.
 */
export const basemaps: Record<string, Basemap> = {
  'carto-positron': {
    id:          'carto-positron',
    name:        'Carto Positron',
    url:         'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom:     19,
  },

  'carto-dark': {
    id:          'carto-dark',
    name:        'Carto Dark Matter',
    url:         'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom:     19,
  },

  'osm': {
    id:          'osm',
    name:        'OpenStreetMap',
    url:         'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom:     19,
  },

  'esri-imagery': {
    id:          'esri-imagery',
    name:        'Esri World Imagery (Satélite)',
    url:         'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri, Source: Esri, Maxar, Earthstar Geographics',
    maxZoom:     19,
  },

  'esri-topo': {
    id:          'esri-topo',
    name:        'Esri World Topo',
    url:         'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri, Esri, USGS, NOAA',
    maxZoom:     19,
  },

  'esri-relief': {
    id:          'esri-relief',
    name:        'Esri Shaded Relief',
    url:         'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri, Source: Esri',
    maxZoom:     13,
  },

  // NOTE: Google Maps tile endpoints are commonly used in prototypes but their
  // ToS technically require the Google Maps JavaScript API. Use with care.
  'google-sat': {
    id:          'google-sat',
    name:        'Google Satélite',
    url:         'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '© Google',
    maxZoom:     20,
  },
}

export const defaultBasemapId = 'carto-positron'
