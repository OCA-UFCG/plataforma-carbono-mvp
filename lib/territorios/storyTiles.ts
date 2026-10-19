import 'server-only'

import { isDeepStrictEqual } from 'node:util'
import { LAND_USE_YEARS, STORY_THEMES } from '@/config/territorios/story'
import { themeRaster, type TileRequest } from '@/lib/territorios/mapStyle'

// Every tile request the Territórios story map can make (StoryMap.tsx): each
// theme at its map year, and land use at each year of its switch. The story is
// public and draws through /api/gee/tile, so these are what that route serves
// without a session; any other raster of the platform still needs a login.
//
// Taken through JSON as the body arrives: the round trip drops the undefined
// fields (temporalDate, classify) that a parsed body never has.
const STORY_TILE_REQUESTS: TileRequest[] = STORY_THEMES
  .flatMap((theme) => theme.id === 'uso'
    ? LAND_USE_YEARS.map((year) => themeRaster(theme.id, year))
    : [themeRaster(theme.id)])
  .map(({ request }) => JSON.parse(JSON.stringify(request)))

/** Whether a POST /api/gee/tile body is exactly one the story map sends. */
export function isStoryTileRequest(body: unknown): boolean {
  return STORY_TILE_REQUESTS.some((request) => isDeepStrictEqual(body, request))
}
