import type { Basemap } from '@/types/mapa'

// The story's maps use Esri's light gray canvas instead of the WebSIG's CARTO
// default, which has required an API key since August 2026 and stamps its tiles
// without one. Switch back to basemaps[defaultBasemapId] once the key is set.
export const STORY_BASEMAP: Basemap = {
  id:          'esri-light-gray',
  name:        'Esri World Light Gray Canvas',
  url:         'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors',
  maxZoom:     16,
}
