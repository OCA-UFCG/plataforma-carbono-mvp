import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { distanceText } from '@/config/territorios/chooserScript'
import { STEP_COLORS } from '@/config/territorios/palette'
import {
  LAND_USE_YEARS,
  RAIN_FIRST_YEAR,
  RAIN_LAST_YEAR,
  STEPS,
  STORY_THEMES,
  TERRITORY_TYPES,
  storyTheme,
} from '@/config/territorios/story'
import { STATE_CODES } from '@/config/territorios/storyScript'
import { contrast } from '@/lib/color'
import { listFeicoes } from '@/lib/mapa/recorteRegistry'
import { ano, paradas } from '@/lib/mapa/temporal'
import { translatorFor, territoriosMessages, type TestLocale } from '../helpers/territoriosI18n'
import type { LayerConfig } from '@/types/mapa'

const MIN_CONTRAST = 4.5

const layers = appConfig.layers as LayerConfig[]

const LOCALES_UNDER_TEST: TestLocale[] = ['pt', 'en']

/** A namespace of the shipped messages, as a plain object. */
function messagesOf(locale: TestLocale, namespace: string): Record<string, Record<string, Record<string, string>>> {
  return (territoriosMessages(locale) as Record<string, Record<string, Record<string, Record<string, string>>>>)[namespace]
}

function yearsOf(layerId: string): string[] {
  const layer = layers.find((l) => l.id === layerId)
  const temporal = layer?.type === 'raster' ? layer.gee?.temporal : undefined
  return temporal ? paradas(temporal).map(ano) : []
}

describe('STORY_THEMES', () => {
  it('names raster layers of layers.json that LAYER_META gives a source', () => {
    for (const theme of STORY_THEMES) {
      const layer = layers.find((l) => l.id === theme.layerId)
      expect(layer?.type).toBe('raster')
      expect(LAYER_META[theme.layerId]?.source).toBeTruthy()
    }
  })

  it('asks the land use and rain layers only for years they have', () => {
    const landUseYears = yearsOf(storyTheme('uso').layerId)
    for (const year of LAND_USE_YEARS) expect(landUseYears).toContain(year)

    const rainYears = yearsOf(storyTheme('chuva').layerId)
    expect(rainYears).toContain(String(RAIN_FIRST_YEAR))
    expect(rainYears).toContain(String(RAIN_LAST_YEAR))
  })

  it('carries white-legible colors', () => {
    // The theme heading and the summary card border carry white text.
    for (const theme of STORY_THEMES) {
      expect(contrast(theme.color, '#ffffff')).toBeGreaterThanOrEqual(MIN_CONTRAST)
    }
  })

  it('takes each color from the palette, so the band and the chart agree', () => {
    for (const theme of STORY_THEMES) expect(theme.color).toBe(STEP_COLORS[theme.id])
  })
})

describe('STATE_CODES', () => {
  it('places every state a territory of an enabled type names', () => {
    for (const type of TERRITORY_TYPES.filter((t) => t.enabled && t.id !== 'bioma')) {
      for (const feature of listFeicoes(type.recorteId!)) {
        for (const uf of feature.context?.split('/') ?? []) {
          expect(STATE_CODES as readonly string[], `${type.id} ${uf}`).toContain(uf)
        }
      }
    }
  })

  it('has the ten states the answer of the biome counts', () => {
    // answers.territorio.biome: "A Caatinga inteira, em dez estados."
    expect(listFeicoes('estados')).toHaveLength(10)
    expect(STATE_CODES).toHaveLength(10)
  })

  it('names every state in every language', () => {
    for (const locale of LOCALES_UNDER_TEST) {
      const states = messagesOf(locale, 'TerritoriosStory').states
      expect(Object.keys(states).sort(), locale).toEqual([...STATE_CODES].sort())
    }
  })
})

describe('TERRITORY_TYPES', () => {
  it('points every enabled type at a vector layer', () => {
    const enabled = TERRITORY_TYPES.filter((t) => t.enabled)
    expect(enabled.map((t) => t.id)).toEqual([
      'bioma', 'estado', 'municipio', 'terra_indigena', 'territorio_quilombola', 'assentamento',
    ])
    for (const type of enabled) {
      expect(layers.find((l) => l.id === type.recorteId)?.type).toBe('vector')
    }
  })

  it('leaves the two types with no data yet disabled and without a layer', () => {
    const disabled = TERRITORY_TYPES.filter((t) => !t.enabled)
    expect(disabled.map((t) => [t.id, t.recorteId])).toEqual([
      ['propriedade_rural', null],
      ['unidade_conservacao', null],
    ])
  })
})

describe('chooser messages', () => {
  it('never prints a zero distance for a territory the location is not in', () => {
    const pt = translatorFor('pt', 'TerritoriosChooser')
    expect(distanceText(0.04, pt, 'pt')).toBe('a menos de 0,1 km')
    expect(distanceText(0.1, pt, 'pt')).toBe('a 0,1 km')
    expect(distanceText(12.4, pt, 'pt')).toBe('a 12 km')

    const en = translatorFor('en', 'TerritoriosChooser')
    expect(distanceText(0.04, en, 'en')).toBe('less than 0.1 km away')
    expect(distanceText(3.26, en, 'en')).toBe('3.3 km away')
  })

  it('has a lead for overlapping territories on every type the chooser opens', () => {
    for (const locale of LOCALES_UNDER_TEST) {
      const { overlapLead } = messagesOf(locale, 'TerritoriosChooser')
      for (const type of TERRITORY_TYPES.filter((t) => t.enabled && t.id !== 'bioma')) {
        expect(overlapLead[type.id], `${locale} ${type.id}`).toBeTruthy()
      }
    }
  })

  it('names every type, and asks the question of every type the chooser opens', () => {
    for (const locale of LOCALES_UNDER_TEST) {
      const { types, steps } = messagesOf(locale, 'TerritoriosTypes')
      for (const type of TERRITORY_TYPES) {
        expect(types[type.id].label, `${locale} ${type.id}`).toBeTruthy()
        expect(types[type.id].unitLabel, `${locale} ${type.id}`).toBeTruthy()
        if (type.searchable) {
          expect(types[type.id].plural, `${locale} ${type.id}`).toBeTruthy()
          expect(types[type.id].searchQuestion, `${locale} ${type.id}`).toBeTruthy()
        }
      }
      expect(Object.keys(steps).sort(), locale).toEqual([...STEPS].sort())
    }
  })
})
