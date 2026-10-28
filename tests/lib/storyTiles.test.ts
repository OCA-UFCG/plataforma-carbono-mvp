import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { LAND_USE_YEARS, STORY_THEMES } from '@/config/territorios/story'
import { themeRaster, type TileRequest } from '@/lib/territorios/mapStyle'
import { isStoryTileRequest } from '@/lib/territorios/storyTiles'
import type { RasterLayerConfig } from '@/types/mapa'

// A request as POST /api/gee/tile parses it: StoryMap sends JSON.stringify(request).
const asBody = (request: TileRequest) => JSON.parse(JSON.stringify(request))

const story = (theme: Parameters<typeof themeRaster>[0], year?: string) => asBody(themeRaster(theme, year).request)

describe('isStoryTileRequest', () => {
  it('accepts every request the story map makes', () => {
    for (const theme of STORY_THEMES) expect(isStoryTileRequest(story(theme.id)), theme.id).toBe(true)
    for (const year of LAND_USE_YEARS) expect(isStoryTileRequest(story('uso', year)), year).toBe(true)
  })

  it('ignores the order of the keys', () => {
    const { visParams, ...rest } = story('chuva')
    expect(isStoryTileRequest({ visParams, ...rest })).toBe(true)
  })

  it('refuses any change to a story request', () => {
    const chuva = story('chuva')
    for (const body of [
      { ...chuva, temporalDate: '2000-01-01' },
      { ...chuva, visParams: { ...chuva.visParams, max: chuva.visParams.max + 1 } },
      { ...chuva, clipId: 'bioma' },
      { ...chuva, classify: { numClasses: 5, method: 'jenks' } },
      story('uso', '2000'),
    ]) {
      expect(isStoryTileRequest(body), JSON.stringify(body).slice(0, 80)).toBe(false)
    }
  })

  it('refuses the layers the story does not draw', () => {
    const storyLayers = new Set(STORY_THEMES.map((t) => t.layerId))
    const others = (appConfig.layers as RasterLayerConfig[]).filter((l) => l.gee?.asset && !storyLayers.has(l.id))
    expect(others.length).toBeGreaterThan(0)
    for (const layer of others) {
      expect(isStoryTileRequest({ asset: layer.gee!.asset, visParams: layer.gee!.visParams }), layer.id).toBe(false)
    }
  })

  it('refuses what is not a request', () => {
    for (const body of [null, undefined, 'chuva', [], {}]) expect(isStoryTileRequest(body)).toBe(false)
  })
})
