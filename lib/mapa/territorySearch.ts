import { computeBbox } from '@/lib/mapa/computeBbox'
import { matchTerritory, type LabelMatch } from '@/lib/mapa/searchMatch'

/**
 * The search of the panel's "Território" section ("Buscar município, estado ou
 * território", components/mapa/panel/TerritorySearch.tsx): every text property
 * of every recorte feature, matched by `matchTerritory`.
 */

/** One searchable layer, its GeoJSON already downloaded. */
export interface SearchSource {
  layerId: string
  /** What one feature of the layer is called: "Município", not "Municípios". */
  unitName: string
  /** Property that tells homonymous features apart (a municipality's state). */
  contextField?: string
  /**
   * The only properties to match, for a layer whose features carry free text
   * beside their name (the citations and soils of the monitoring sites).
   * Without it every text property matches.
   */
  searchFields?: string[]
  features: GeoJSON.Feature[]
  /** Whether a bare context is a legitimate query for this layer ("RN"). */
  contextIdentifies: boolean
}

export interface SearchResult {
  layerId: string
  unitName: string
  /**
   * Property the match came from. Not shown -- it is a GeoJSON key -- but it
   * keeps two properties of one feature from collapsing into a single row, and
   * gives the row a stable React key.
   */
  fieldName: string
  value: string
  /** The layer's `contextField` value, e.g. the state of a municipality. */
  context?: string
  /** Run of `value` the query matched, for highlighting. */
  match: LabelMatch
  featureIndex: number
  bbox: [number, number, number, number]
}

export const MAX_RESULTS = 20

// Register codes build-recortes.py keeps beside each name (code_muni, cd_sipra,
// cd_cnuc). Nobody searches by them, and as text ("0000.00.0146") they would
// answer any run of digits typed.
const CODE_FIELD = /^(cd|code)_/i

// Matches at the start of the label first, then alphabetical. One collator for
// every comparison: a short query sorts thousands of matches.
const collator = new Intl.Collator('pt-BR')

function byRank(a: Pick<SearchResult, 'value' | 'match'>, b: Pick<SearchResult, 'value' | 'match'>) {
  const aPrefix = a.match.start === 0
  const bPrefix = b.match.start === 0
  if (aPrefix !== bPrefix) return aPrefix ? -1 : 1
  return collator.compare(a.value, b.value)
}

/** The rows for a query, at most `max`; none below two letters. */
export function searchTerritories(query: string, sources: SearchSource[], max = MAX_RESULTS): SearchResult[] {
  const q = query.trim()
  if (q.length < 2) return []

  // Every match of every layer, ranked within its layer. Stopping at a count
  // would leave the layers late in the catalog unread: the conservation units
  // come after 1,994 settlements.
  const ranked: { features: GeoJSON.Feature[]; matches: Omit<SearchResult, 'bbox'>[] }[] = []
  for (const source of sources) {
    const seen = new Set<string>() // dedupe: featureIndex:fieldName
    const matches: Omit<SearchResult, 'bbox'>[] = []
    for (let fi = 0; fi < source.features.length; fi++) {
      const props = source.features[fi].properties
      if (!props) continue
      const rawContext = source.contextField ? props[source.contextField] : undefined
      const context = typeof rawContext === 'string' ? rawContext : undefined

      for (const [key, raw] of Object.entries(props)) {
        // The context narrows a search, it is never a result of its own:
        // listing it would put one row per municipality of a whole state
        // under the heading "abbrev_state".
        if (key === source.contextField || CODE_FIELD.test(key)) continue
        // A citation or a soil type is not a place to go to.
        if (source.searchFields && !source.searchFields.includes(key)) continue
        if (typeof raw !== 'string' || raw === '') continue
        const match = matchTerritory(q, raw, context, { contextIdentifies: source.contextIdentifies })
        if (!match) continue

        const dedupeKey = `${fi}:${key}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        matches.push({
          layerId: source.layerId,
          unitName: source.unitName,
          fieldName: key,
          value: raw,
          context,
          match,
          featureIndex: fi,
        })
      }
    }
    ranked.push({ features: source.features, matches: matches.sort(byRank) })
  }

  // Dealt one row per layer in turn, so every layer with a match gets a share
  // of the rows; those then take the usual order. Bounding boxes only for the
  // rows dealt, as a two-letter query matches most features.
  const found: SearchResult[] = []
  for (let round = 0; found.length < max; round++) {
    const turn = ranked.filter(({ matches }) => round < matches.length)
    if (turn.length === 0) break
    for (const { features, matches } of turn) {
      if (found.length >= max) break
      const m = matches[round]
      try {
        found.push({ ...m, bbox: computeBbox(features[m.featureIndex]) })
      } catch {
        // skip features without valid geometry
      }
    }
  }
  return found.sort(byRank)
}
