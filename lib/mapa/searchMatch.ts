// Matching rule behind the territory search bar.
//
// Feature labels are not unique: inside the Caatinga clip 34 municipality names
// repeat (three "Bom Jesus", in PI, RN and PB) and 213 settlement names do. Each
// feature therefore carries a context property -- the state, declared per layer
// as `contextField` in config/mapa/layers.json -- which the search both shows
// and lets the user type.
//
// It lives outside the component because the rule below has edge cases worth
// testing on their own, and a React effect is no place to keep them.

import { normalizeSearch } from '@/lib/mapa/normalizeSearch'

export interface LabelMatch {
  /** Offset of the matched run inside the label, for highlighting. */
  start: number
  /** Length of the matched run, in label characters. */
  length: number
}

/**
 * Written-out state names, so "Bom Jesus Piauí" narrows the same way
 * "Bom Jesus PI" does. All 27 rather than the 10 the Caatinga spans: the table
 * costs nothing and does not go stale if a layer ever reaches past the biome.
 */
const STATE_NAMES: Record<string, string> = {
  AC: 'Acre',      AL: 'Alagoas',   AM: 'Amazonas',  AP: 'Amapá',
  BA: 'Bahia',     CE: 'Ceará',     DF: 'Distrito Federal',
  ES: 'Espírito Santo',             GO: 'Goiás',     MA: 'Maranhão',
  MG: 'Minas Gerais',               MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso',                PA: 'Pará',      PB: 'Paraíba',
  PE: 'Pernambuco',                 PI: 'Piauí',     PR: 'Paraná',
  RJ: 'Rio de Janeiro',             RN: 'Rio Grande do Norte',
  RO: 'Rondônia',  RR: 'Roraima',   RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina',             SE: 'Sergipe',   SP: 'São Paulo',
  TO: 'Tocantins',
}

/**
 * Whether `hint` names one of the states in `context`.
 *
 * A context holds more than one state when a feature really straddles a border
 * ("CE/PI"), which happens to seven INCRA settlements and one quilombo; either
 * side answers. Prefix rather than equality so the results narrow while the
 * user is still typing the state.
 */
function namesState(hint: string, context: string): boolean {
  return context.split('/').some((part) => {
    const uf = part.trim()
    if (!uf) return false
    if (normalizeSearch(uf).startsWith(hint)) return true
    const spelled = STATE_NAMES[uf.toUpperCase()]
    return spelled !== undefined && normalizeSearch(spelled).startsWith(hint)
  })
}

/**
 * Match `query` against one feature, returning the run of `label` to highlight.
 *
 * The query matches when the label contains it, or when its last word names the
 * feature's state and everything before that word is in the label. Only the
 * label part is ever highlighted -- the state acts as a filter, not as text
 * found in the name.
 *
 * Reading the label first is what keeps "São Domingos" a name rather than a
 * "São" in some state "Domingos". And a single word is never read as a state,
 * which is what stops a bare "PI" from listing all 180 municipalities of Piauí.
 */
export interface MatchOptions {
  /**
   * Whether the context identifies a feature on its own, which makes a bare
   * context a legitimate query. True for the states layer, where there is one
   * feature per abbreviation, and false for every other: "PI" typed against the
   * municipalities would otherwise list the 140 the clip holds. Derive it from
   * the data with `contextIsUnique` rather than declaring it per layer, so it
   * cannot drift away from what the GeoJSON actually contains.
   */
  contextIdentifies?: boolean
}

/**
 * Whether these context values identify their features one to one.
 *
 * Empty counts as false: a layer with no features identifies nothing, and a
 * layer where any feature lacks a context cannot rely on it either.
 */
export function contextIsUnique(contexts: (string | undefined)[]): boolean {
  if (contexts.length === 0) return false
  if (contexts.some((c) => !c)) return false
  return new Set(contexts).size === contexts.length
}

export function matchTerritory(
  query: string,
  label: string,
  context?: string,
  options: MatchOptions = {},
): LabelMatch | null {
  const normQuery = normalizeSearch(query).split(/\s+/).filter(Boolean).join(' ')
  if (!normQuery) return null

  // normalizeSearch only lowercases and drops combining marks, so an offset in
  // the normalized label is the same offset in the original.
  const normLabel = normalizeSearch(label)

  const direct = normLabel.indexOf(normQuery)
  if (direct >= 0) return { start: direct, length: normQuery.length }

  if (!context) return null
  const words = normQuery.split(' ')

  if (words.length < 2) {
    // "RN" has to find Rio Grande do Norte, whose label does not contain those
    // two letters. A zero-length run because nothing in the label matched.
    if (options.contextIdentifies && namesState(normQuery, context)) {
      return { start: 0, length: 0 }
    }
    return null
  }

  const name = words.slice(0, -1).join(' ')
  const start = normLabel.indexOf(name)
  if (start < 0 || !namesState(words[words.length - 1], context)) return null
  return { start, length: name.length }
}
