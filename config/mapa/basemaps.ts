import type { Basemap } from '@/types/mapa'

/**
 * CARTO began requiring an API key on its raster basemaps in August 2026:
 * requests without one are still answered with HTTP 200, but the PNG itself
 * comes stamped with a repeated "API KEY REQUIRED" watermark. The key is free
 * for non-commercial use (fair use of 5M tile requests a month) and is
 * requested at https://carto.com/basemaps/apikey.
 *
 * Because NEXT_PUBLIC_CARTO_KEY is inlined in the browser bundle at build
 * time, changing it requires a rebuild, not just a restart. The value must be
 * read as a literal `process.env.NEXT_PUBLIC_CARTO_KEY` member expression for
 * Next.js to substitute it, which is why the key is passed in as an argument
 * instead of being looked up inside the function.
 *
 * CARTO also considers the raster basemaps to be on their way out, in favour
 * of the vector service. The same key covers both, so migrating later needs no
 * new credential.
 */
export function cartoTileUrl(
  style: 'light_all' | 'dark_all',
  key: string | undefined,
): string {
  const url = `https://basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`
  const trimmed = key?.trim()

  // An empty `key=` earns the same watermarked tile as sending no parameter at
  // all, so the query string is only added when there is a value to carry.
  return trimmed ? `${url}?key=${encodeURIComponent(trimmed)}` : url
}

const cartoKey = process.env.NEXT_PUBLIC_CARTO_KEY

/**
 * Basemap providers, all treated uniformly as raster XYZ tiles.
 * This keeps the MapView code simple: swapping basemaps is just
 * a source/layer replacement, no style diff, no layer re-add.
 */
export const basemaps: Record<string, Basemap> = {
  'carto-positron': {
    id:          'carto-positron',
    name:        'Carto Positron',
    url:         cartoTileUrl('light_all', cartoKey),
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom:     19,
  },

  'carto-dark': {
    id:          'carto-dark',
    name:        'Carto Dark Matter',
    url:         cartoTileUrl('dark_all', cartoKey),
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
