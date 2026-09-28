// Identity of the features of a recorte, shared by the server registry
// (lib/mapa/recorteRegistry.ts) and the Territórios chooser, which reads the
// same GeoJSON in the browser. Both must derive the same id from the same file,
// or a territory picked on the map would open another one, or none.
//
// Feature labels are not unique (34 homonymous municipalities, 213 settlements)
// and the GeoJSONs in public/data/vector carry no official code. So the id is
// the slug of the label plus an ordinal suffix, in file order. Regenerating the
// vectors in a different order can migrate a suffix; the fix is to key on the
// official code, which scripts/build-recortes.py now preserves but this rule
// does not yet read. Recorded as a follow-up in the design doc.

import { slug } from '@/lib/mapa/format'
import type { PolygonalGeometry } from '@/lib/territorios/interiorPoint'

export type { PolygonalGeometry }

export interface FeatureLike {
  geometry:    unknown
  properties?: Record<string, unknown> | null
}

export interface FeatureEntry {
  /** Position in the file, which is also the id MapLibre's `generateId` gives the feature. */
  index:    number
  id:       string
  name:     string
  /** Value of the layer's `contextField`, the state for every recorte that declares one. */
  context?: string
  geometry: PolygonalGeometry
}

export interface FeatureIdFields {
  labelField:    string
  contextField?: string
  /** Layer name, which names a single-feature recorte whose feature carries no label. */
  layerName?:    string
}

/**
 * Property that names a feature. `labelField` is the persistent map label and
 * `hoverLabelField` the popup one; either identifies the feature, so whichever
 * is declared wins, with the persistent label preferred. Today all six vector
 * layers declare only the hover one.
 */
export function labelFieldOf(layer: { labelField?: string; hoverLabelField?: string }): string | undefined {
  return layer.labelField ?? layer.hoverLabelField
}

/**
 * Pull the polygonal geometry out of a feature. Usually the geometry already
 * is a Polygon or MultiPolygon, but `limite_caatinga_clip.geojson` (the only
 * `_clip` file today) wraps the simplified boundary in a GeometryCollection
 * alongside a handful of stray LineStrings, simplification slivers left by
 * the tool that produced it. The Polygon inside is the real boundary; the
 * lines carry no area and are dropped.
 */
export function extractPolygonal(geometry: unknown): PolygonalGeometry | null {
  const g = geometry as { type?: string; geometries?: unknown[] } | null
  if (!g) return null
  if (g.type === 'Polygon' || g.type === 'MultiPolygon') return g as PolygonalGeometry
  if (g.type === 'GeometryCollection' && Array.isArray(g.geometries)) {
    for (const inner of g.geometries) {
      const found = extractPolygonal(inner)
      if (found) return found
    }
  }
  return null
}

/** The identifiable features of a recorte, in file order. */
export function featureEntries(features: readonly FeatureLike[], fields: FeatureIdFields): FeatureEntry[] {
  const { labelField, contextField, layerName } = fields
  // Ordinal suffix per slug, assigned in file order: the first occurrence keeps
  // the bare slug, so the common case reads as a plain name in the URL.
  const seen = new Map<string, number>()
  const entries: FeatureEntry[] = []

  features.forEach((feature, index) => {
    const geometry = extractPolygonal(feature.geometry)
    if (!geometry) return

    const raw = feature.properties?.[labelField]
    // A single-feature recorte is named by its layer. The simplified biome file
    // has empty properties, so there is no label to read, and "Bioma Caatinga"
    // is the right name anyway. Restricted to one feature on purpose: applying
    // it to a multi-feature layer would collapse every id into one.
    const name = typeof raw === 'string' && raw.trim()
      ? raw.trim()
      : features.length === 1 && layerName ? layerName : null
    if (!name) return

    const base = slug(name)
    if (!base) return
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)

    const rawContext = contextField ? feature.properties?.[contextField] : undefined
    const context = typeof rawContext === 'string' && rawContext ? rawContext : undefined

    entries.push({
      index,
      id: count === 1 ? base : `${base}-${count}`,
      name,
      ...(context ? { context } : {}),
      geometry,
    })
  })

  return entries
}

const LOWERCASE_WORDS = new Set(['a', 'o', 'as', 'os', 'ao', 'aos', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos'])
const ROMAN_NUMERAL = /^(?:I{1,3}|IV|VI{0,3}|IX|XI{0,3})$/
/** Kinds of settlement other than "PA" that head a label; they stay acronyms. */
const SETTLEMENT_KINDS = new Set(['PAE', 'PAQ', 'PDS', 'PE', 'PIC', 'RTRQ'])
/** "PA ", "PA. ", "PCA ": settlement kinds the "Assentamento" label already names. */
const SETTLEMENT_PREFIX = /^PC?A\.?\s+(?:-\s+)?/

/**
 * A feature's label as the visitor reads it. 1,920 of the 1,923 settlement
 * labels come in capitals behind "PA "; the prefix goes and the capitals turn
 * into title case, keeping roman numerals and the other settlement kinds.
 * Labels already in mixed case, like every municipality, pass unchanged.
 * Display only: the id is the slug of the label as the file has it.
 */
export function displayName(label: string): string {
  const name = label.replace(SETTLEMENT_PREFIX, '') || label
  const words = name.split(/\s+/)
  if (words.some((w) => w !== w.toUpperCase() && w !== 'e')) return name
  return name.replace(/\p{L}+/gu, (word, at: number) => {
    const lower = word.toLowerCase()
    if (ROMAN_NUMERAL.test(word) || (at === 0 && SETTLEMENT_KINDS.has(word))) return word
    if (at > 0 && LOWERCASE_WORDS.has(lower)) return lower
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  })
}
