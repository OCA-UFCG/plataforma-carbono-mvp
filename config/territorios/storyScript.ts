// Structure behind the words of the Territórios story. The sentences
// themselves live in translations/<locale>/, one file per screen:
//
//   TerritoriosStory.json   the steps' questions and answers, the final sheet,
//                           "Sobre os dados", the figures' words and units and
//                           the map legends (lib/territorios/storyText.ts and
//                           storyValues.ts fill them in)
//   TerritoriosCharts.json  the charts' labels and accessible descriptions
//   TerritoriosUi.json      buttons, states and banners of the story screens
//   TerritoriosMap.json     the maps' own strings
//
// A step shows a question of at most ten words, a big figure and an answer of
// at most twenty, and compares the territory with the whole Caatinga in the
// words "acima", "abaixo" and "perto". Sources, periods, definitions and
// caveats wait in "Sobre os dados", at the end.

import { displayName } from '@/lib/territorios/featureIds'
import type { Translate } from '@/lib/territorios/i18n'

export const TERRITORY_SCRIPT = {
  /** `context` is the state; left out for a state, whose name already is one. */
  title: (name: string, context?: string) => (context ? `${displayName(name)} (${context})` : displayName(name)),
}

/**
 * The states the Caatinga spans: each one has a `states.<UF>` message in
 * TerritoriosStory.json, the phrase "na Paraíba" takes for the sentence
 * "Área dentro da Caatinga, na Paraíba." A context the table does not know
 * leaves the state out of the sentence.
 */
export const STATE_CODES = ['AL', 'BA', 'CE', 'MA', 'MG', 'PB', 'PE', 'PI', 'RN', 'SE'] as const

/**
 * MapLibre's control strings, from the `locale` block of TerritoriosMap.json.
 * StoryMap turns wheel zoom off, so a one-finger pan is the only gesture the
 * map blocks; the desktop message shows for it on a touch screen with a mouse,
 * and "Ctrl + scroll" would name a gesture that does nothing.
 */
export function mapLocale(t: Translate): Record<string, string> {
  const twoFingers = t('locale.twoFingers')
  return {
    'Map.Title':                                  t('locale.mapTitle'),
    'NavigationControl.ZoomIn':                   t('locale.zoomIn'),
    'NavigationControl.ZoomOut':                  t('locale.zoomOut'),
    'AttributionControl.ToggleAttribution':       t('locale.toggleAttribution'),
    'CooperativeGesturesHandler.WindowsHelpText': twoFingers,
    'CooperativeGesturesHandler.MacHelpText':     twoFingers,
    'CooperativeGesturesHandler.MobileHelpText':  twoFingers,
  }
}
