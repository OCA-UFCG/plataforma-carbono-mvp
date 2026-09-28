// Server-only registry of individual recorte features. The client sends a
// recorte layer id and a feature id; the server resolves the geometry here.
//
// Sibling of clipRegistry.ts, which resolves a whole layer (every feature
// merged) so a raster can be clipped to it. The report needs the opposite:
// one feature.
//
// Feature ids come from lib/territorios/featureIds.ts, which the Territórios
// chooser also runs over the same GeoJSON in the browser; that file explains
// the slug and ordinal suffix rule.

import 'server-only'

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { area as turfArea } from '@turf/area'
import appConfig from '@/config/mapa/layers.json'
import { computeBbox } from '@/lib/mapa/computeBbox'
import {
  featureEntries,
  labelFieldOf,
  type FeatureLike,
  type PolygonalGeometry,
} from '@/lib/territorios/featureIds'

type Bbox = [number, number, number, number]
type Geometry = PolygonalGeometry

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

/** The recorte layers that can be a report unit: the vectors that have a label. */
export function listRecortes(): RecorteInfo[] {
  return vectorLayers().flatMap((layer) => {
    const labelField = labelFieldOf(layer)
    if (!labelField || !layer.url) return []
    return [{ layerId: layer.id, layerName: layer.name, labelField }]
  })
}

function buildIndex(recorteId: string): RecorteIndex | null {
  const layer = vectorLayers().find((l) => l.id === recorteId)
  const labelField = layer ? labelFieldOf(layer) : undefined
  if (!layer?.url || !labelField) return null

  // Prefer the pre-simplified `<name>_clip.geojson`, the same preference order
  // clipRegistry documents and for the same reason: the full biome boundary is
  // 2,3 MB and ~105k vertices, and reducing a raster over it costs tens of
  // seconds. Only the biome has such a file today.
  const coarseUrl = layer.url.replace(/\.geojson$/, '_clip.geojson')
  const coarsePath = path.join(process.cwd(), 'public', coarseUrl)
  const usesCoarse = existsSync(coarsePath)
  const filePath = usesCoarse ? coarsePath : path.join(process.cwd(), 'public', layer.url)

  let geojson: { features?: FeatureLike[] }
  try {
    geojson = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }

  const feicoes: IndexedFeicao[] = featureEntries(geojson.features ?? [], {
    labelField,
    contextField: layer.contextField,
    layerName:    layer.name,
  })

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
