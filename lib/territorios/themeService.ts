// Territory and theme answers of the Territórios story.
//
// A theme is looked up in three places, cheapest first: the precomputed file
// (the biome, too large to answer live), an in-memory cache, and Earth Engine.
// Only the recortes of the territory types are served, so this cannot be used
// to reduce a raster over any other vector layer.

import 'server-only'

import appConfig from '@/config/mapa/layers.json'
import precomputedJson from '@/config/territorios/precomputed.json'
import { BIOMA_FEATURE_ID, BIOMA_RECORTE_ID, TERRITORY_TYPES } from '@/config/territorios/story'
import { getEe, initGee } from '@/lib/mapa/geeAuth'
import { getFeicao, listFeicoes, type FeicaoResolvida } from '@/lib/mapa/recorteRegistry'
import { rankByArea } from '@/lib/territorios/areaRank'
import { computeTheme } from '@/lib/territorios/computeTheme'
import { ellipsoidAreaHa } from '@/lib/territorios/ellipsoidArea'
import {
  fireAnnualMeanSharePct,
  fireBurnedSharePct,
  fireRecurrenceSharesPct,
  fluxPerForestHa,
  forestSharePct,
  nativeSharePct,
  rainMeanMm,
  stockDensity,
} from '@/lib/territorios/storyValues'
import type {
  BiomeReference,
  PrecomputedFile,
  TerritoryPayload,
  ThemeData,
  ThemeId,
  ThemeResponse,
} from '@/types/territorios'

/** The recorte is not an enabled territory type, or the feature does not exist. */
export class TerritoryNotFoundError extends Error {}

const PRECOMPUTED = precomputedJson as unknown as PrecomputedFile

const TTL_MS = 90 * 60 * 1000
// Same bound as reportCache.ts: recorte x feature x theme across 3,280
// features, each entry holding a series or a stock table.
const MAX_ENTRIES = 500

const cache = new Map<string, { response: ThemeResponse; expiresAt: number }>()

function getCached(key: string): ThemeResponse | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return undefined
  }
  return entry.response
}

function setCached(key: string, response: ThemeResponse): void {
  // 'unavailable' is usually transient (a timeout, a rate limit upstream), and
  // caching it would hold a broken step for ninety minutes.
  if (response.status === 'unavailable') return
  cache.set(key, { response, expiresAt: Date.now() + TTL_MS })
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

function resolve(recorteId: string, featureId: string): { recorteName: string; feicao: FeicaoResolvida } {
  const known = TERRITORY_TYPES.some((t) => t.recorteId === recorteId)
  const layer = appConfig.layers.find((l) => l.id === recorteId && l.type === 'vector')
  if (!known || !layer) throw new TerritoryNotFoundError('Recorte not found.')

  const feicao = getFeicao(recorteId, featureId)
  if (!feicao) throw new TerritoryNotFoundError('Feature not found.')
  return { recorteName: layer.name, feicao }
}

let biomeReference: BiomeReference | undefined
let biomeAreaHa: number | undefined

/**
 * Every value goes through the storyValues function that computes the same
 * value for a territory, so the two divide by one base.
 */
function getBiomeReference(): BiomeReference {
  if (biomeReference) return biomeReference
  const themes = PRECOMPUTED.entries[`${BIOMA_RECORTE_ID}|${BIOMA_FEATURE_ID}`]?.themes
  const dataOf = <K extends ThemeId>(theme: K) => {
    const data = themes?.[theme]?.data
    return data?.theme === theme ? (data as Extract<ThemeData, { theme: K }>) : null
  }

  const stock = dataOf('estoque')
  const flux = dataOf('fluxo')
  const landUse = dataOf('uso')
  const fire = dataOf('fogo')
  const rain = dataOf('chuva')

  const native1985 = landUse ? nativeSharePct(landUse.areas['1985']) : null
  const native2024 = landUse ? nativeSharePct(landUse.areas['2024']) : null

  biomeReference = {
    stockTotalTc:            stock && stock.report.totalTc > 0 ? stock.report.totalTc : null,
    stockDensityTcHa:        stock ? stockDensity(stock.report) : null,
    forestSharePct:          flux ? forestSharePct(flux) : null,
    fluxPerForestHaMg:       flux ? fluxPerForestHa(flux) : null,
    nativeSharePct:          native1985 !== null && native2024 !== null ? { '1985': native1985, '2024': native2024 } : null,
    fireBurnedSharePct:      fire ? fireBurnedSharePct(fire) : null,
    fireRecurrenceSharesPct: fire ? fireRecurrenceSharesPct(fire) : null,
    fireAnnualMeanSharePct:  fire ? fireAnnualMeanSharePct(fire) : null,
    rainMeanMm:              rain ? rainMeanMm(rain.series) : null,
  }
  return biomeReference
}

/** Area of every feature of a recorte, by id, measured as getTerritory measures one. */
const areasByRecorte = new Map<string, Map<string, number>>()

function recorteAreas(recorteId: string): Map<string, number> {
  const cached = areasByRecorte.get(recorteId)
  if (cached) return cached
  const areas = new Map<string, number>()
  for (const { id } of listFeicoes(recorteId)) {
    const feicao = getFeicao(recorteId, id)
    if (feicao) areas.set(id, ellipsoidAreaHa(feicao.geometry))
  }
  areasByRecorte.set(recorteId, areas)
  return areas
}

export function getTerritory(recorteId: string, featureId: string): TerritoryPayload {
  const { recorteName, feicao } = resolve(recorteId, featureId)
  if (biomeAreaHa === undefined) {
    const bioma = getFeicao(BIOMA_RECORTE_ID, BIOMA_FEATURE_ID)
    if (!bioma) throw new Error('Biome feature not found')
    biomeAreaHa = ellipsoidAreaHa(bioma.geometry)
  }

  return {
    recorteId,
    recorteName,
    featureId:   feicao.id,
    featureName: feicao.name,
    ...(feicao.context ? { context: feicao.context } : {}),
    // The registry's spherical area stays the WebSIG's; the visitor reads this one.
    areaHa:      ellipsoidAreaHa(feicao.geometry),
    biomaAreaHa: biomeAreaHa,
    areaRank:    recorteId === BIOMA_RECORTE_ID ? null : rankByArea(recorteAreas(recorteId), feicao.id),
    bbox:        feicao.bbox,
    boundary:    feicao.boundary,
    geometry:    feicao.geometry,
    biome:       getBiomeReference(),
  }
}

export async function getTheme(recorteId: string, featureId: string, theme: ThemeId): Promise<ThemeResponse> {
  const { feicao } = resolve(recorteId, featureId)
  const base = { recorteId, featureId: feicao.id, theme }

  const precomputed = PRECOMPUTED.entries[`${recorteId}|${feicao.id}`]?.themes[theme]
  if (precomputed) {
    return {
      ...base,
      status:       precomputed.status,
      origin:       'precomputed',
      coarseScaleM: precomputed.coarseScaleM,
      data:         precomputed.data,
    }
  }

  const key = `${recorteId}|${feicao.id}|${theme}`
  const cached = getCached(key)
  if (cached) return cached

  let response: ThemeResponse
  try {
    await initGee()
    const result = await computeTheme(getEe(), { theme, geometry: feicao.geometry, areaHa: feicao.areaHa })
    response = { ...base, ...result }
  } catch (err) {
    console.error(`[themeService] ${recorteId}|${feicao.id} ${theme}: ${err instanceof Error ? err.message : err}`)
    response = { ...base, status: 'unavailable', origin: null, coarseScaleM: null, data: null }
  }

  setCached(key, response)
  return response
}
