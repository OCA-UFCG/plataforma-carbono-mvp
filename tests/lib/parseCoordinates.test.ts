import { describe, expect, it } from 'vitest'
import {
  CAATINGA_BBOX,
  buildCoordinatePolygon,
  buildCoordinateRectangle,
  buildCoordinatePoint,
  caatingaCoverage,
  formatDms,
  parseDegrees,
  parseLatLonPair,
  parseVertexList,
} from '@/lib/mapa/parseCoordinates'

describe('parseDegrees', () => {
  describe('decimal degrees', () => {
    it('reads a signed decimal', () => {
      expect(parseDegrees('-7.21', 'lat')).toBeCloseTo(-7.21, 10)
    })

    it('reads an explicit plus sign', () => {
      expect(parseDegrees('+7.21', 'lat')).toBeCloseTo(7.21, 10)
    })

    it('accepts a comma as the decimal separator', () => {
      // Brazilian keyboards and spreadsheets produce "-7,21".
      expect(parseDegrees('-7,21', 'lat')).toBeCloseTo(-7.21, 10)
    })

    it('reads a hemisphere suffix as the sign', () => {
      expect(parseDegrees('7.21 S', 'lat')).toBeCloseTo(-7.21, 10)
    })

    it('accepts the suffix glued to the number', () => {
      expect(parseDegrees('7.21S', 'lat')).toBeCloseTo(-7.21, 10)
    })

    it('accepts the hemisphere before the number', () => {
      expect(parseDegrees('S 7.21', 'lat')).toBeCloseTo(-7.21, 10)
    })

    it('accepts a degree sign before the hemisphere', () => {
      expect(parseDegrees('7.21°S', 'lat')).toBeCloseTo(-7.21, 10)
    })

    it('reads W as a negative longitude', () => {
      expect(parseDegrees('35.88 W', 'lon')).toBeCloseTo(-35.88, 10)
    })

    it('reads the Portuguese O (oeste) as a negative longitude', () => {
      expect(parseDegrees('35.88 O', 'lon')).toBeCloseTo(-35.88, 10)
    })

    it('reads the Portuguese L (leste) as a positive longitude', () => {
      expect(parseDegrees('35.88 L', 'lon')).toBeCloseTo(35.88, 10)
    })
  })

  describe('degrees, minutes and seconds', () => {
    it('reads a full DMS value', () => {
      expect(parseDegrees('7°12\'36"S', 'lat')).toBeCloseTo(-7.21, 10)
    })

    it('ignores spacing between the parts', () => {
      expect(parseDegrees('7° 12\' 36" S', 'lat')).toBeCloseTo(-7.21, 10)
    })

    it('reads DMS written with plain spaces and no symbols', () => {
      expect(parseDegrees('7 12 36 S', 'lat')).toBeCloseTo(-7.21, 10)
    })

    it('reads degrees and decimal minutes', () => {
      expect(parseDegrees('7°12.6\'S', 'lat')).toBeCloseTo(-7.21, 10)
    })

    it('reads decimal seconds', () => {
      expect(parseDegrees('7°12\'36.5"S', 'lat')).toBeCloseTo(-(7 + 12 / 60 + 36.5 / 3600), 10)
    })

    it('takes a leading minus as the sign when there is no hemisphere', () => {
      expect(parseDegrees('-7°12\'36"', 'lat')).toBeCloseTo(-7.21, 10)
    })

    it('rejects minutes of 60 or more', () => {
      expect(parseDegrees('7°60\'00"S', 'lat')).toBeNull()
    })

    it('rejects seconds of 60 or more', () => {
      expect(parseDegrees('7°12\'60"S', 'lat')).toBeNull()
    })
  })

  describe('sign and hemisphere together', () => {
    it('accepts a minus that agrees with the hemisphere', () => {
      expect(parseDegrees('-7.21 S', 'lat')).toBeCloseTo(-7.21, 10)
    })

    it('rejects a minus that contradicts the hemisphere', () => {
      // Silently flipping the sign here would drop the point in the wrong
      // hemisphere, thousands of kilometres from what the user typed.
      expect(parseDegrees('-7.21 N', 'lat')).toBeNull()
    })
  })

  describe('domain of each axis', () => {
    it('rejects a latitude beyond 90', () => {
      expect(parseDegrees('91', 'lat')).toBeNull()
    })

    it('accepts a longitude beyond 90', () => {
      expect(parseDegrees('-120.5', 'lon')).toBeCloseTo(-120.5, 10)
    })

    it('rejects a longitude beyond 180', () => {
      expect(parseDegrees('181', 'lon')).toBeNull()
    })

    it('rejects a latitude hemisphere on a longitude', () => {
      expect(parseDegrees('35.88 S', 'lon')).toBeNull()
    })

    it('rejects a longitude hemisphere on a latitude', () => {
      expect(parseDegrees('7.21 W', 'lat')).toBeNull()
    })
  })

  describe('unreadable input', () => {
    it('rejects an empty string', () => {
      expect(parseDegrees('', 'lat')).toBeNull()
    })

    it('rejects whitespace only', () => {
      expect(parseDegrees('   ', 'lat')).toBeNull()
    })

    it('rejects text', () => {
      expect(parseDegrees('Campina Grande', 'lat')).toBeNull()
    })

    it('rejects trailing garbage after a readable number', () => {
      expect(parseDegrees('7.21 abc', 'lat')).toBeNull()
    })

    it('rejects more than three numeric parts', () => {
      expect(parseDegrees('7 12 36 40', 'lat')).toBeNull()
    })
  })
})

describe('parseLatLonPair', () => {
  it('splits a decimal pair on the comma', () => {
    expect(parseLatLonPair('-7.21, -35.88')).toEqual([-35.88, -7.21])
  })

  it('splits on a semicolon', () => {
    expect(parseLatLonPair('-7.21; -35.88')).toEqual([-35.88, -7.21])
  })

  it('splits a decimal pair on whitespace', () => {
    expect(parseLatLonPair('-7.21 -35.88')).toEqual([-35.88, -7.21])
  })

  it('splits a DMS pair after the latitude hemisphere', () => {
    // DMS contains its own spaces, so whitespace alone cannot separate the
    // pair: the N/S letter closing the latitude is the split point.
    const pair = parseLatLonPair('7°12\'36"S 35°52\'48"O')
    expect(pair?.[1]).toBeCloseTo(-7.21, 10)
    expect(pair?.[0]).toBeCloseTo(-35.88, 10)
  })

  it('splits a symbol-free DMS pair after the latitude hemisphere', () => {
    const pair = parseLatLonPair('7 12 36 S 35 52 48 O')
    expect(pair?.[1]).toBeCloseTo(-7.21, 10)
    expect(pair?.[0]).toBeCloseTo(-35.88, 10)
  })

  it('returns lon/lat in the GeoJSON order, not the typed order', () => {
    // The form labels ask for latitude first; GeoJSON wants [lon, lat].
    expect(parseLatLonPair('-7.21, -35.88')).toEqual([-35.88, -7.21])
  })

  it('rejects a single value', () => {
    expect(parseLatLonPair('-7.21')).toBeNull()
  })

  it('rejects a third value', () => {
    expect(parseLatLonPair('-7.21, -35.88, 12')).toBeNull()
  })

  it('rejects a pair whose longitude is unreadable', () => {
    expect(parseLatLonPair('-7.21, oeste')).toBeNull()
  })
})

describe('parseVertexList', () => {
  it('reads one vertex per line', () => {
    const result = parseVertexList('-7.0, -36.0\n-7.0, -35.0\n-8.0, -35.0')
    expect(result).toEqual({
      ok: true,
      vertices: [
        [-36, -7],
        [-35, -7],
        [-35, -8],
      ],
    })
  })

  it('ignores blank lines and surrounding whitespace', () => {
    const result = parseVertexList('\n  -7.0, -36.0  \n\n-7.0, -35.0\n-8.0, -35.0\n\n')
    expect(result).toEqual({
      ok: true,
      vertices: [
        [-36, -7],
        [-35, -7],
        [-35, -8],
      ],
    })
  })

  it('drops a closing vertex that repeats the first', () => {
    // Exports often carry the closed ring; the builder closes it again.
    const result = parseVertexList('-7.0, -36.0\n-7.0, -35.0\n-8.0, -35.0\n-7.0, -36.0')
    expect(result).toEqual({
      ok: true,
      vertices: [
        [-36, -7],
        [-35, -7],
        [-35, -8],
      ],
    })
  })

  it('reports the line number of an unreadable vertex', () => {
    const result = parseVertexList('-7.0, -36.0\nlixo\n-8.0, -35.0')
    expect(result).toEqual({ ok: false, error: 'Linha 2: coordenada inválida' })
  })

  it('counts blank lines when numbering, so the number matches the textarea', () => {
    const result = parseVertexList('-7.0, -36.0\n\n\nlixo')
    expect(result).toEqual({ ok: false, error: 'Linha 4: coordenada inválida' })
  })

  it('rejects fewer than three vertices', () => {
    const result = parseVertexList('-7.0, -36.0\n-7.0, -35.0')
    expect(result).toEqual({ ok: false, error: 'Informe ao menos três vértices' })
  })

  it('rejects an empty text', () => {
    expect(parseVertexList('   \n  ')).toEqual({ ok: false, error: 'Informe ao menos três vértices' })
  })
})

describe('formatDms', () => {
  it('formats a southern latitude', () => {
    expect(formatDms(-7.21, 'lat')).toBe('7°12\'36"S')
  })

  it('formats a western longitude with the Portuguese O', () => {
    expect(formatDms(-35.88, 'lon')).toBe('35°52\'48"O')
  })

  it('formats a northern latitude', () => {
    expect(formatDms(7.21, 'lat')).toBe('7°12\'36"N')
  })

  it('formats an eastern longitude with the Portuguese L', () => {
    expect(formatDms(35.88, 'lon')).toBe('35°52\'48"L')
  })

  it('pads minutes and seconds to two digits', () => {
    expect(formatDms(-7.01, 'lat')).toBe('7°00\'36"S')
  })

  it('carries into the minutes when the seconds round up to 60', () => {
    expect(formatDms(-7.999999, 'lat')).toBe('8°00\'00"S')
  })

  it('carries into the degrees when the minutes round up to 60', () => {
    expect(formatDms(-7.9999999, 'lat')).toBe('8°00\'00"S')
  })
})

describe('buildCoordinatePoint', () => {
  it('builds a GeoJSON point at the coordinate', () => {
    const feature = buildCoordinatePoint([-35.88, -7.21])
    expect(feature.geometry).toEqual({ type: 'Point', coordinates: [-35.88, -7.21] })
  })

  it('marks the feature as coming from typed coordinates', () => {
    // MapView reads this to label the results chip "Coordenadas", and it
    // travels with the persisted drawing so a reload keeps the label.
    const feature = buildCoordinatePoint([-35.88, -7.21])
    expect(feature.properties?.ccOrigin).toBe('coordenadas')
  })

  it('labels the feature with the formatted coordinate', () => {
    const feature = buildCoordinatePoint([-35.88, -7.21])
    expect(feature.properties?.ccLabel).toBe('7°12\'36"S, 35°52\'48"O')
  })
})

describe('buildCoordinateRectangle', () => {
  it('builds a closed five-vertex ring', () => {
    const feature = buildCoordinateRectangle([-36, -8], [-35, -7])
    expect(feature?.geometry.coordinates[0]).toEqual([
      [-36, -8],
      [-35, -8],
      [-35, -7],
      [-36, -7],
      [-36, -8],
    ])
  })

  it('accepts the corners in any order', () => {
    const a = buildCoordinateRectangle([-36, -8], [-35, -7])
    const b = buildCoordinateRectangle([-35, -7], [-36, -8])
    expect(b?.geometry).toEqual(a?.geometry)
  })

  it('accepts the other diagonal', () => {
    const a = buildCoordinateRectangle([-36, -8], [-35, -7])
    const b = buildCoordinateRectangle([-36, -7], [-35, -8])
    expect(b?.geometry).toEqual(a?.geometry)
  })

  it('rejects two corners on the same meridian', () => {
    expect(buildCoordinateRectangle([-36, -8], [-36, -7])).toBeNull()
  })

  it('rejects two corners on the same parallel', () => {
    expect(buildCoordinateRectangle([-36, -8], [-35, -8])).toBeNull()
  })

  it('marks the feature as coming from typed coordinates', () => {
    const feature = buildCoordinateRectangle([-36, -8], [-35, -7])
    expect(feature?.properties?.ccOrigin).toBe('coordenadas')
  })

  it('labels the feature as a rectangle', () => {
    const feature = buildCoordinateRectangle([-36, -8], [-35, -7])
    expect(feature?.properties?.ccLabel).toBe('retângulo')
  })
})

describe('buildCoordinatePolygon', () => {
  it('closes the ring', () => {
    const feature = buildCoordinatePolygon([
      [-36, -7],
      [-35, -7],
      [-35, -8],
    ])
    expect(feature?.geometry.coordinates[0]).toEqual([
      [-36, -7],
      [-35, -7],
      [-35, -8],
      [-36, -7],
    ])
  })

  it('rejects fewer than three vertices', () => {
    expect(buildCoordinatePolygon([[-36, -7], [-35, -7]])).toBeNull()
  })

  it('rejects three collinear vertices', () => {
    // A zero-area ring yields no statistics; it is a typo, not an area.
    expect(buildCoordinatePolygon([[-36, -7], [-35, -7], [-34, -7]])).toBeNull()
  })

  it('labels the feature with its vertex count', () => {
    const feature = buildCoordinatePolygon([
      [-36, -7],
      [-35, -7],
      [-35, -8],
    ])
    expect(feature?.properties?.ccLabel).toBe('polígono · 3 vértices')
  })

  it('marks the feature as coming from typed coordinates', () => {
    const feature = buildCoordinatePolygon([
      [-36, -7],
      [-35, -7],
      [-35, -8],
    ])
    expect(feature?.properties?.ccOrigin).toBe('coordenadas')
  })
})

describe('caatingaCoverage', () => {
  it('reports a point inside the bounding box', () => {
    expect(caatingaCoverage({ type: 'Point', coordinates: [-40, -9] })).toBe('inside')
  })

  it('reports a point outside the bounding box', () => {
    // São Paulo, far outside any Caatinga layer.
    expect(caatingaCoverage({ type: 'Point', coordinates: [-46.6, -23.5] })).toBe('outside')
  })

  it('reports an area straddling the western edge as partial', () => {
    const feature = buildCoordinateRectangle([-46, -10], [-44, -9])
    expect(caatingaCoverage(feature!.geometry)).toBe('partial')
  })

  it('reports an area fully outside as outside', () => {
    const feature = buildCoordinateRectangle([-50, -25], [-48, -23])
    expect(caatingaCoverage(feature!.geometry)).toBe('outside')
  })

  it('reports an area fully inside as inside', () => {
    const feature = buildCoordinateRectangle([-41, -10], [-40, -9])
    expect(caatingaCoverage(feature!.geometry)).toBe('inside')
  })

  it('exposes a bounding box that contains the biome centre', () => {
    const [minLon, minLat, maxLon, maxLat] = CAATINGA_BBOX
    expect(minLon).toBeLessThan(-40)
    expect(maxLon).toBeGreaterThan(-40)
    expect(minLat).toBeLessThan(-9)
    expect(maxLat).toBeGreaterThan(-9)
  })
})
