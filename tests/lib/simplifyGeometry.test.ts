import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { area } from '@turf/area'
import { simplifyForAnalysis } from '@/lib/mapa/simplifyGeometry'

type Geometry = GeoJSON.Polygon | GeoJSON.MultiPolygon

const countVertices = (c: unknown): number =>
  Array.isArray(c) && c.length && typeof c[0] === 'number'
    ? 1
    : Array.isArray(c) ? c.reduce((n: number, x) => n + countVertices(x), 0) : 0

/** The geometry of the feature of a recorte file that carries `name` as a property. */
function recorte(file: string, name: string): Geometry {
  const collection = JSON.parse(
    readFileSync(path.join(process.cwd(), 'public/data/vector', file), 'utf-8'),
  ) as GeoJSON.FeatureCollection
  const feature = collection.features.find((f) => Object.values(f.properties ?? {}).includes(name))
  if (!feature) throw new Error(`${name} not found in ${file}`)
  return feature.geometry as Geometry
}

const biome = recorte('limite_caatinga.geojson', 'Caatinga')

const square = (x = 0, y = 0, side = 1): number[][] =>
  [[x, y], [x + side, y], [x + side, y + side], [x, y + side], [x, y]]

describe('simplifyForAnalysis', () => {
  // A new object means every guard passed: the area moved by under the bound
  // and no two edges cross.
  it('cuts the biome boundary down and keeps its area', () => {
    const out = simplifyForAnalysis(biome)
    expect(out).not.toBe(biome)
    expect(countVertices(out.coordinates)).toBeLessThan(25_000)
    expect(Math.abs(area(out) - area(biome)) / area(biome)).toBeLessThan(1e-5)
  })

  it('leaves a geometry below the vertex floor untouched', () => {
    const poly: GeoJSON.Polygon = { type: 'Polygon', coordinates: [[[0, 0], [0.5, 0.00001], [1, 0], [1, 1], [0, 1], [0, 0]]] }
    expect(simplifyForAnalysis(poly)).toBe(poly)
  })

  it('never simplifies a thin settlement, however far it is pushed', () => {
    const thin = recorte('assentamentos.geojson', 'PA CANDIDO GREGÓRIO')
    expect(simplifyForAnalysis(thin)).toBe(thin)
    // Forced past the floor, it would lose about 98% of its area.
    expect(simplifyForAnalysis(thin, { minVertices: 0, toleranceM: 250 })).toBe(thin)
  })

  it('refuses a result with edges that cross, even when the area holds', () => {
    // Its area moves by only 0.0044% at 60 m, but two edges end up crossing.
    const apa = recorte('uc_uso_sustentavel.geojson', 'Área de Proteção Ambiental Serra da Ibiapaba')
    expect(simplifyForAnalysis(apa, { minVertices: 0, toleranceM: 60 })).toBe(apa)
  })

  it('does not throw on a malformed geometry, and returns it as it came', () => {
    const emptyPolygon = { type: 'MultiPolygon', coordinates: [[], [square()]] } as GeoJSON.MultiPolygon
    expect(simplifyForAnalysis(emptyPolygon, { minVertices: 0 })).toBe(emptyPolygon)

    const malformed = [
      { type: 'Polygon', coordinates: [] },
      { type: 'Polygon', coordinates: [[]] },
      { type: 'Polygon', coordinates: [[[0, 0], [1, 0]]] },
      { type: 'Polygon', coordinates: [[0, 0]] },
      { type: 'Polygon', coordinates: [[['a', 0], [1, 0], [1, 1], [0, 0]]] },
      { type: 'MultiPolygon', coordinates: [] },
      { type: 'MultiPolygon', coordinates: 'x' },
      { type: 'Point', coordinates: [0, 0] },
      { type: 'Polygon' },
    ] as unknown as GeoJSON.Polygon[]
    for (const g of malformed) {
      expect(() => simplifyForAnalysis(g, { minVertices: 0 })).not.toThrow()
      expect(simplifyForAnalysis(g, { minVertices: 0 })).toBe(g)
    }
  })

  it('gives up on work past its budget instead of blocking', () => {
    // 100k vertices on a spiral send Douglas-Peucker quadratic: measured at
    // 52 s without a bound.
    const ring: number[][] = []
    for (let i = 0; i < 100_000; i++) {
      const angle = i * 0.05
      const radius = 0.01 + i * 1e-5
      ring.push([-40 + radius * Math.cos(angle), -8 + radius * Math.sin(angle)])
    }
    ring.push(ring[0])
    const spiral: GeoJSON.Polygon = { type: 'Polygon', coordinates: [ring] }

    const started = performance.now()
    expect(simplifyForAnalysis(spiral)).toBe(spiral)
    expect(performance.now() - started).toBeLessThan(3000)
  })

  it('honours a smaller evaluation budget', () => {
    expect(simplifyForAnalysis(biome, { maxEvaluations: 1000 })).toBe(biome)
  })

  it('returns the original when every polygon would collapse', () => {
    const speck: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[5, 5], [5.0000001, 5], [5.0000001, 5.0000001], [5, 5]]],
    }
    expect(simplifyForAnalysis(speck, { minVertices: 0 })).toBe(speck)
  })

  it('drops a polygon whose shell collapses and a hole that collapses, keeping the rest', () => {
    const speck = [[5, 5], [5.0000001, 5], [5.0000001, 5.0000001], [5, 5]]
    const holed: GeoJSON.Polygon = { type: 'Polygon', coordinates: [square(0, 0, 1), speck] }
    const out = simplifyForAnalysis(holed, { minVertices: 0 }) as GeoJSON.Polygon
    expect(out).not.toBe(holed)
    expect(out.coordinates).toHaveLength(1)

    const multi: GeoJSON.MultiPolygon = { type: 'MultiPolygon', coordinates: [[square(0, 0, 1)], [speck]] }
    const kept = simplifyForAnalysis(multi, { minVertices: 0 }) as GeoJSON.MultiPolygon
    expect(kept).not.toBe(multi)
    expect(kept.coordinates).toHaveLength(1)
  })
})
