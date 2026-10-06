// Where a territory stands among the others of its type by area, for the
// "maior entre os 1.210 municípios" card of the territory tab (Figma 19254:37461).

import type { AreaRank } from '@/types/territorios'

export function rankByArea(areas: ReadonlyMap<string, number>, id: string): AreaRank | null {
  const own = areas.get(id)
  if (own === undefined) return null
  let larger = 0
  for (const area of areas.values()) if (area > own) larger += 1
  return { position: larger + 1, total: areas.size }
}
