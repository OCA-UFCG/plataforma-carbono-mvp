import { readFileSync } from 'node:fs'
import path from 'node:path'
import turfArea from '@turf/area'
import { describe, expect, it } from 'vitest'
import { extractPolygonal, type FeatureLike } from '@/lib/territorios/featureIds'
import { ellipsoidAreaHa } from '@/lib/territorios/ellipsoidArea'

function features(file: string): FeatureLike[] {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'public/data/vector', file), 'utf-8')).features
}

describe('ellipsoidAreaHa', () => {
  it('measures the biome within 0.1% of IBGE (2019), where the sphere reads 0.4% high', () => {
    const geometry = extractPolygonal(features('limite_caatinga_clip.geojson')[0].geometry)!
    const ha = ellipsoidAreaHa(geometry)
    expect(Math.abs(ha / 86_281_800 - 1)).toBeLessThan(0.001)
    expect(turfArea({ type: 'Feature', geometry, properties: {} }) / 10_000 / ha).toBeGreaterThan(1.003)
  })

  it('measures Campina Grande as Earth Engine pixelArea does (59,298.7 ha)', () => {
    const feature = features('municipios.geojson').find((f) => f.properties?.name_muni === 'Campina Grande')!
    expect(Math.abs(ellipsoidAreaHa(extractPolygonal(feature.geometry)!) / 59_298.7 - 1)).toBeLessThan(0.002)
  })

  it('subtracts holes', () => {
    const square = (d: number) => [[-d, -d], [d, -d], [d, d], [-d, d], [-d, -d]]
    const whole = ellipsoidAreaHa({ type: 'Polygon', coordinates: [square(1)] })
    const hole = ellipsoidAreaHa({ type: 'Polygon', coordinates: [square(0.5)] })
    expect(ellipsoidAreaHa({ type: 'Polygon', coordinates: [square(1), square(0.5)] })).toBeCloseTo(whole - hole, 3)
  })
})
