import { describe, expect, it } from 'vitest'
import precomputedJson from '@/config/territorios/precomputed.json'
import {
  BIOMA_FEATURE_ID,
  BIOMA_RECORTE_ID,
  LAND_USE_YEARS,
  RAIN_FIRST_YEAR,
  RAIN_LAST_YEAR,
  STORY_THEMES,
} from '@/config/territorios/story'
import { listFeicoes } from '@/lib/mapa/recorteRegistry'
import type { PrecomputedFile } from '@/types/territorios'

const precomputed = precomputedJson as unknown as PrecomputedFile

describe('config/territorios/precomputed.json', () => {
  it('keys every entry by a feature that still resolves, under the same name', () => {
    // A regenerated vector file can shift an ordinal suffix; a stale key would
    // then serve another territory's numbers.
    for (const [key, entry] of Object.entries(precomputed.entries)) {
      const [recorteId, featureId] = key.split('|')
      const feature = listFeicoes(recorteId).find((f) => f.id === featureId)
      expect(feature?.name, key).toBe(entry.featureName)
    }
  })

  it('has all five themes of the biome available', () => {
    const themes = precomputed.entries[`${BIOMA_RECORTE_ID}|${BIOMA_FEATURE_ID}`]?.themes ?? {}

    for (const { id } of STORY_THEMES) {
      expect(themes[id]?.status, id).toBe('available')
      expect(themes[id]?.data?.theme, id).toBe(id)
    }
  })

  it('carries the region areas every share of the biome divides by', () => {
    // A file written before these fields existed would print "cobre 0,0%" and
    // take the degradation shares over the area with data only.
    const themes = precomputed.entries[`${BIOMA_RECORTE_ID}|${BIOMA_FEATURE_ID}`]?.themes ?? {}
    const flux = themes.fluxo?.data
    const degradation = themes.degradacao?.data

    expect(flux?.theme === 'fluxo' && flux.regionAreaHa > 0).toBe(true)
    expect(degradation?.theme === 'degradacao' && (degradation.regionAreaM2 ?? 0) > 0).toBe(true)
  })

  it('carries the rest of what the biome reference reads', () => {
    const themes = precomputed.entries[`${BIOMA_RECORTE_ID}|${BIOMA_FEATURE_ID}`]?.themes ?? {}
    const stock = themes.estoque?.data
    const landUse = themes.uso?.data
    const rain = themes.chuva?.data

    expect(stock?.theme === 'estoque' && stock.report.areaHa > 0).toBe(true)
    for (const year of LAND_USE_YEARS) {
      expect(landUse?.theme === 'uso' && Object.keys(landUse.areas[year]).length > 0, year).toBe(true)
    }
    // The mean spans RAIN_FIRST_YEAR to RAIN_LAST_YEAR, as a territory's does.
    const years = rain?.theme === 'chuva' ? rain.series.filter((p) => p.value !== null).map((p) => Number(p.date.slice(0, 4))) : []
    expect(Math.min(...years)).toBe(RAIN_FIRST_YEAR)
    expect(Math.max(...years)).toBe(RAIN_LAST_YEAR)
  })
})
