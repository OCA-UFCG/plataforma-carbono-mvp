// Groups of MapBiomas classes the land use step of the Territórios story talks
// about. Thirty classes do not fit a sentence or a 1985 x 2024 chart; these
// four do, and the map paints the raster with the same groups and colors, so
// the chart doubles as the map legend.
//
// Every class code of lulc_mapbiomas in config/mapa/layers.json belongs to
// exactly one group (tests/lib/territoriosStoryValues.test.ts checks it). A
// code the collection gains before that file catches up falls into "outros",
// so the shares still add up to 100.

import { LAND_USE_COLORS } from '@/config/territorios/palette'

export interface LandUseGroup {
  id:     string
  label:  string
  codes:  number[]
  color:  string
  /** Counts as "vegetação nativa" in the sentences and the summary. */
  native: boolean
}

export const NATIVE_GROUP_ID = 'nativa'
export const FARMING_GROUP_ID = 'agropecuaria'
export const URBAN_GROUP_ID = 'urbana'
export const UNCLASSIFIED_GROUP_ID = 'outros'

// Urban area (24) stands apart from the other non-vegetated classes: in
// Campina Grande it went from 5.4% to 13.0%, a change "outros" would hide.
export const LAND_USE_GROUPS: LandUseGroup[] = [
  {
    id: NATIVE_GROUP_ID, label: 'Vegetação nativa',
    codes: [3, 4, 5, 6, 49, 11, 12, 32, 50], color: LAND_USE_COLORS.nativa, native: true,
  },
  {
    id: FARMING_GROUP_ID, label: 'Agropecuária',
    codes: [9, 15, 18, 20, 21, 35, 39, 40, 41, 46, 47, 48, 62], color: LAND_USE_COLORS.agropecuaria, native: false,
  },
  {
    id: URBAN_GROUP_ID, label: 'Área urbana',
    codes: [24], color: LAND_USE_COLORS.urbana, native: false,
  },
  {
    id: UNCLASSIFIED_GROUP_ID, label: 'Água e outras áreas',
    codes: [23, 25, 29, 30, 31, 33, 75], color: LAND_USE_COLORS.outros, native: false,
  },
]

const GROUP_BY_CODE = new Map(
  LAND_USE_GROUPS.flatMap((group) => group.codes.map((code) => [code, group] as const)),
)

const UNCLASSIFIED = LAND_USE_GROUPS.find((g) => g.id === UNCLASSIFIED_GROUP_ID)!

export function landUseGroupOf(code: number): LandUseGroup {
  return GROUP_BY_CODE.get(code) ?? UNCLASSIFIED
}
