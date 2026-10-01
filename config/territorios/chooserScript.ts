// Logic behind the words of the screens around the Territórios story: the
// opening with the type cards, the chooser where one territory of a type is
// picked on the map, by location or by name, and the step rail. The strings
// themselves live in translations/<locale>/: TerritoriosIntro.json,
// TerritoriosChooser.json, TerritoriosRail.json and TerritoriosTypes.json.
// The story's own sentences live in TerritoriosStory.json.
//
// Each function takes the translate function of its own namespace and the
// locale, so it stays pure.

import { fixed, listText, type Translate } from '@/lib/territorios/i18n'

/** `t` of TerritoriosIntro: "Em breve: a, b e c", the labels lowercased. */
export function soonText(labels: readonly string[], t: Translate, locale: string): string {
  return t('soon', { labels: listText(labels.map((label) => label.toLowerCase()), locale) })
}

/** `t` of TerritoriosChooser. */
export function distanceText(km: number, t: Translate, locale: string): string {
  return km < 0.1
    ? t('distance.lessThan', { km: fixed(0.1, 1, locale) })
    : t('distance.about', { km: fixed(km, km < 10 ? 1 : 0, locale) })
}

/** `t` of TerritoriosChooser: "{n} municípios com área na Caatinga." */
export function searchCountText(n: number, plural: string, t: Translate, locale: string): string {
  return t('searchCount', { count: fixed(n, 0, locale), plural })
}

/** `t` of TerritoriosChooser: "1 resultado", "12 resultados". */
export function searchResultsText(n: number, t: Translate, locale: string): string {
  return t(n === 1 ? 'searchResults.one' : 'searchResults.many', { count: fixed(n, 0, locale) })
}

/**
 * The line under the name on the confirm card and on the final sheet. The
 * recorte files are clipped to the biome, so the area is only the part inside
 * it; without "na Caatinga" a state's figure would read as its whole area. The
 * biome's own detail leaves it out. `t` of TerritoriosChooser.
 */
export function confirmDetailText(
  unitLabel: string,
  context: string | undefined,
  area: string,
  t: Translate,
  biome = false,
): string {
  return [unitLabel, context, biome ? area : t('confirmInBiome', { area })].filter(Boolean).join(', ')
}
