import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { CHOOSER } from '@/config/territorios/chooserScript'
import {
  LAND_USE_YEARS,
  RAIN_FIRST_YEAR,
  RAIN_LAST_YEAR,
  STORY_THEMES,
  TERRITORY_TYPES,
  storyTheme,
} from '@/config/territorios/story'
import { STATE_LOCATIVE } from '@/config/territorios/storyScript'
import { listFeicoes } from '@/lib/mapa/recorteRegistry'
import { ano, paradas } from '@/lib/mapa/temporal'
import type { LayerConfig } from '@/types/mapa'

const layers = appConfig.layers as LayerConfig[]

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
})

describe('STATE_LOCATIVE', () => {
  it('places every state a territory of an enabled type names', () => {
    for (const type of TERRITORY_TYPES.filter((t) => t.id !== 'bioma')) {
      for (const feature of listFeicoes(type.recorteId)) {
        for (const uf of feature.context?.split('/') ?? []) expect(STATE_LOCATIVE[uf], `${type.id} ${uf}`).toBeTruthy()
      }
    }
  })

  it('has the nine states the answer of the biome counts', () => {
    // ANSWER_SCRIPT.territorio.biome: "A Caatinga inteira, em nove estados."
    expect(listFeicoes('estados')).toHaveLength(9)
    expect(Object.keys(STATE_LOCATIVE)).toHaveLength(9)
  })
})

describe('TERRITORY_TYPES', () => {
  it('points every type at a vector layer', () => {
    expect(TERRITORY_TYPES.map((t) => t.id)).toEqual([
      'bioma', 'estado', 'municipio', 'terra_indigena', 'territorio_quilombola', 'assentamento',
    ])
    for (const type of TERRITORY_TYPES) {
      expect(layers.find((l) => l.id === type.recorteId)?.type).toBe('vector')
    }
  })

  // The RIFF/WEBP signature, the first chunk and the frame size, as
  // tests/lib/sobrePhotos.test.ts reads them: a simple lossy 'VP8 ' file has
  // no room for EXIF, so no phone metadata (GPS included) rides along.
  it('gives every type its card\'s photo at 2x the 405x202 frame (Figma 19254:37356), without metadata', () => {
    for (const type of TERRITORY_TYPES) {
      const buf = readFileSync(path.join(process.cwd(), 'public', type.image))
      expect(type.image, type.id).toMatch(/^\/images\/territorios\/[a-z-]+\.webp$/)
      expect({
        format: `${buf.toString('ascii', 0, 4)}/${buf.toString('ascii', 8, 16)}`,
        width:  buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
      }, type.id).toEqual({ format: 'RIFF/WEBPVP8 ', width: 811, height: 404 })
    }
  })
})

describe('CHOOSER', () => {
  it('never prints a zero distance for a territory the location is not in', () => {
    expect(CHOOSER.distance(0.04)).toBe('a menos de 0,1 km')
    expect(CHOOSER.distance(0.1)).toBe('a 0,1 km')
    expect(CHOOSER.distance(12.4)).toBe('a 12 km')
  })

  it('has a lead for overlapping territories on every type the chooser opens', () => {
    for (const type of TERRITORY_TYPES.filter((t) => t.id !== 'bioma')) {
      expect(CHOOSER.overlapLead[type.id]).toBeTruthy()
    }
  })
})
