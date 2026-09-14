// Server-only registry of individual recorte features. The client sends a
// recorte layer id and a feature id; the server resolves the geometry here.
//
// Sibling of clipRegistry.ts, which resolves a whole layer (every feature
// merged) so a raster can be clipped to it. The report needs the opposite:
// one feature.
//
// The GeoJSONs in public/data/vector carry only a label as a property, and the
// labels are not unique (34 homonymous municipalities, 213 settlements). So the
// id is the slug of the label plus an ordinal suffix, in file order.
// Regenerating the vectors in a different order can migrate a suffix; the fix
// is to preserve `code_muni` in scripts/build-recortes.py and key on the
// official code, recorded as a follow-up in the design doc.

import 'server-only'

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { area as turfArea } from '@turf/area'
import appConfig from '@/config/mapa/layers.json'
import { computeBbox } from '@/lib/mapa/computeBbox'
import { slug } from '@/lib/mapa/format'

type Bbox = [number, number, number, number]
type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }

export interface RecorteInfo {
  layerId:    string
  layerName:  string
  labelField: string
}

export interface FeicaoInfo {
  id:   string
  name: string
  /**
   * Value of the layer's `contextField`, the state for every recorte that
   * declares one. Present because the name alone does not identify a feature:
   * three municipalities here are called "Bom Jesus". Kept apart from `name`
   * rather than folded into it, so the report narrative can still open a
   * sentence with "Em Bom Jesus," while the picker and the document heading
   * spell out which one.
   */
  context?: string
}

export interface FeicaoResolvida {
  id:       string
  name:     string
  geometry: Geometry
  bbox:     Bbox
  areaHa:   number
  /** The layer's `contextField` value, as in FeicaoInfo. */
  context?: string
  /** 'simplified' when it came from a `_clip` file; the document footnotes it. */
  boundary: 'full' | 'simplified'
}

interface VectorEntry {
  id:               string
  name:             string
  type:             string
  url?:             string
  labelField?:      string
  hoverLabelField?: string
  contextField?:    string
}

interface IndexedFeicao extends FeicaoInfo {
  geometry: Geometry
}

interface RecorteIndex {
  feicoes:  IndexedFeicao[]
  boundary: 'full' | 'simplified'
}

const indexCache = new Map<string, RecorteIndex | null>()

function vectorLayers(): VectorEntry[] {
  return (appConfig.layers as VectorEntry[]).filter((l) => l.type === 'vector')
}

/**
 * Property that names a feature. `labelField` is the persistent map label and
 * `hoverLabelField` the popup one; either identifies the feature, so whichever
 * is declared wins, with the persistent label preferred. Today all six vector
 * layers declare only the hover one.
 */
function labelFieldOf(layer: VectorEntry): string | undefined {
  return layer.labelField ?? layer.hoverLabelField
}

/** The recorte layers that can be a report unit: the vectors that have a label. */
export function listRecortes(): RecorteInfo[] {
  return vectorLayers().flatMap((layer) => {
    const labelField = labelFieldOf(layer)
    if (!labelField || !layer.url) return []
    return [{ layerId: layer.id, layerName: layer.name, labelField }]
  })
}

/**
 * Pull the polygonal geometry out of a feature. Usually the geometry already
 * is a Polygon or MultiPolygon, but `limite_caatinga_clip.geojson` (the only
 * `_clip` file today) wraps the simplified boundary in a GeometryCollection
 * alongside a handful of stray LineStrings — simplification slivers left by
 * the tool that produced it. The Polygon inside is the real boundary; the
 * lines carry no area and are dropped.
 */
function extractPolygonal(geometry: unknown): Geometry | null {
  const g = geometry as { type?: string; geometries?: unknown[] } | null
  if (!g) return null
  if (g.type === 'Polygon' || g.type === 'MultiPolygon') return g as Geometry
  if (g.type === 'GeometryCollection' && Array.isArray(g.geometries)) {
    for (const inner of g.geometries) {
      const found = extractPolygonal(inner)
      if (found) return found
    }
  }
  return null
}

function buildIndex(recorteId: string): RecorteIndex | null {
  const layer = vectorLayers().find((l) => l.id === recorteId)
  const labelField = layer ? labelFieldOf(layer) : undefined
  if (!layer?.url || !labelField) return null
  const contextField = layer.contextField

  // Prefer the pre-simplified `<name>_clip.geojson`, the same preference order
  // clipRegistry documents and for the same reason: the full biome boundary is
  // 2,3 MB and ~105k vertices, and reducing a raster over it costs tens of
  // seconds. Only the biome has such a file today.
  const coarseUrl = layer.url.replace(/\.geojson$/, '_clip.geojson')
  const coarsePath = path.join(process.cwd(), 'public', coarseUrl)
  const usesCoarse = existsSync(coarsePath)
  const filePath = usesCoarse ? coarsePath : path.join(process.cwd(), 'public', layer.url)

  let geojson: { features?: { geometry: unknown; properties?: Record<string, unknown> }[] }
  try {
    geojson = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }

  const features = geojson.features ?? []
  // Ordinal suffix per slug, assigned in file order: the first occurrence keeps
  // the bare slug, so the common case reads as a plain name in the URL.
  const seen = new Map<string, number>()
  const feicoes: IndexedFeicao[] = []

  for (const feature of features) {
    const geometry = extractPolygonal(feature.geometry)
    if (!geometry) continue

    const raw = feature.properties?.[labelField]
    // A single-feature recorte is named by its layer. The simplified biome file
    // has empty properties, so there is no label to read, and "Bioma Caatinga"
    // is the right name anyway. Restricted to one feature on purpose: applying
    // it to a multi-feature layer would collapse every id into one.
    const name = typeof raw === 'string' && raw.trim()
      ? raw.trim()
      : features.length === 1 ? layer.name : null
    if (!name) continue

    const base = slug(name)
    if (!base) continue
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)

    const rawContext = contextField ? feature.properties?.[contextField] : undefined
    const context = typeof rawContext === 'string' && rawContext ? rawContext : undefined

    feicoes.push({
      id: count === 1 ? base : `${base}-${count}`,
      name,
      ...(context ? { context } : {}),
      geometry,
    })
  }

  return { feicoes, boundary: usesCoarse ? 'simplified' : 'full' }
}

function index(recorteId: string): RecorteIndex | null {
  const cached = indexCache.get(recorteId)
  if (cached !== undefined) return cached
  const built = buildIndex(recorteId)
  indexCache.set(recorteId, built)
  return built
}

/** Features of a recorte, for the report form's picker. */
export function listFeicoes(recorteId: string): FeicaoInfo[] {
  return (index(recorteId)?.feicoes ?? []).map(({ id, name, context }) => ({
    id,
    name,
    ...(context ? { context } : {}),
  }))
}

/** One feature's geometry, bbox and geodesic area, or null when unknown. */
export function getFeicao(recorteId: string, feicaoId: string): FeicaoResolvida | null {
  const entry = index(recorteId)
  const found = entry?.feicoes.find((f) => f.id === feicaoId)
  if (!entry || !found) return null

  // @turf/area returns m² on the ellipsoid. The document works in hectares, the
  // unit whoever deals with carbon and land use already thinks in.
  const areaM2 = turfArea({ type: 'Feature', geometry: found.geometry, properties: {} })

  return {
    id:       found.id,
    name:     found.name,
    ...(found.context ? { context: found.context } : {}),
    geometry: found.geometry,
    bbox:     computeBbox(found.geometry),
    areaHa:   areaM2 / 10_000,
    boundary: entry.boundary,
  }
}
