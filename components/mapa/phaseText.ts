import { phaseLabel, type Phase } from '@/lib/phenology'
import type { MapaText } from '@/lib/mapa/text'

/**
 * A phase name in the middle of a sentence ("Novembro, primeiras chuvas").
 *
 * Portuguese lowercases the whole label, as the map always did. English lowercases
 * only the first letter, so the proper noun in "Caatinga in leaf" survives while
 * "First rains" and "Mata branca" read as running text.
 */
export function phaseInSentence(phase: Phase, tx: MapaText): string {
  const label = phaseLabel(phase, tx)
  if (tx.locale !== 'en') return label.toLowerCase()
  return label.replace(/^(?!Caatinga)(\p{Lu})/u, (first) => first.toLowerCase())
}
