import { computeBbox } from '@/lib/mapa/computeBbox'

/**
 * Reading and writing geographic coordinates typed by hand, plus the GeoJSON
 * features built from them.
 *
 * Everything here is WGS84. Two orders coexist and must not be confused: the
 * interface asks for latitude first, because that is how people read and copy
 * a coordinate, while GeoJSON stores `[lon, lat]`. The `LonLat` tuples this
 * module returns are already in GeoJSON order.
 */

export type Axis = 'lat' | 'lon'

/** A coordinate pair in GeoJSON order: `[lon, lat]`, degrees. */
export type LonLat = [number, number]

/** Marks a feature the user typed instead of drawing. See `buildCoordinatePoint`. */
export const COORDINATE_ORIGIN = 'coordenadas'

/**
 * Bounding box of the Caatinga, `[minLon, minLat, maxLon, maxLat]`, derived
 * from `public/data/vector/limite_caatinga.geojson`.
 *
 * Hardcoded on purpose: the boundary file is 2.3 MB and this only drives a
 * warning, so downloading it to decide whether to show one does not pay for
 * itself. Being a box, it is wider than the biome, which is why
 * `caatingaCoverage` feeds a warning and never a rejection.
 */
export const CAATINGA_BBOX: [number, number, number, number] = [
  -45.0781, -16.7126, -35.067, -2.7483,
]

// Parsing

const HEMISPHERES: Record<string, { axis: Axis; sign: 1 | -1 }> = {
  N: { axis: 'lat', sign:  1 },
  S: { axis: 'lat', sign: -1 },
  E: { axis: 'lon', sign:  1 },
  L: { axis: 'lon', sign:  1 },  // leste
  W: { axis: 'lon', sign: -1 },
  O: { axis: 'lon', sign: -1 },  // oeste
}

const MAX_DEGREES: Record<Axis, number> = { lat: 90, lon: 180 }

/** Degree, minute and second marks, including the unicode primes and the
 *  masculine ordinal that keyboards produce instead of the degree sign. */
const MARKS = /[°º'’′"”″]/g

const NUMERIC = /^\d+(?:\.\d+)?$/

/**
 * Read one coordinate of the given axis, in decimal degrees (`-7.21`,
 * `7.21 S`) or in degrees/minutes/seconds (`7°12'36"S`, `7 12 36 S`,
 * `7°12.6'`). Returns null when the text is unreadable, when a part is out of
 * range (minutes or seconds of 60, latitude past 90, longitude past 180), or
 * when the hemisphere letter does not belong to the axis being read.
 */
export function parseDegrees(input: string, axis: Axis): number | null {
  let text = input.trim().toUpperCase()
  if (!text) return null

  // The hemisphere letter may lead or trail. Take at most one, from either
  // end, and let the numeric parse below reject whatever is left over.
  let hemisphere: { axis: Axis; sign: 1 | -1 } | undefined
  const last = HEMISPHERES[text.slice(-1)]
  const first = HEMISPHERES[text.slice(0, 1)]
  if (last) {
    hemisphere = last
    text = text.slice(0, -1)
  } else if (first) {
    hemisphere = first
    text = text.slice(1)
  }
  if (hemisphere && hemisphere.axis !== axis) return null

  // A comma here is a decimal separator: this function reads a single axis,
  // and pairs are split before it is called.
  text = text.replace(MARKS, ' ').replace(/,/g, '.').trim()

  let negative = false
  if (text.startsWith('-')) {
    negative = true
    text = text.slice(1).trim()
  } else if (text.startsWith('+')) {
    text = text.slice(1).trim()
  }

  // A minus and a hemisphere letter may both be present as long as they agree.
  // Letting the letter win would silently move the point to the other
  // hemisphere, thousands of kilometres from what was typed.
  if (hemisphere && negative && hemisphere.sign !== -1) return null

  const parts = text.split(/\s+/).filter(Boolean)
  if (parts.length === 0 || parts.length > 3) return null
  if (!parts.every((p) => NUMERIC.test(p))) return null
  // Only the finest part may be fractional: "7.5°12'" is not a coordinate.
  if (!parts.slice(0, -1).every((p) => Number.isInteger(Number(p)))) return null

  const [degrees, minutes = 0, seconds = 0] = parts.map(Number)
  if (minutes >= 60 || seconds >= 60) return null

  const value = degrees + minutes / 60 + seconds / 3600
  if (value > MAX_DEGREES[axis]) return null

  const sign = hemisphere ? hemisphere.sign : negative ? -1 : 1
  return sign * value
}

/**
 * Read a latitude/longitude pair written on one line and return it in GeoJSON
 * order. Accepts `-7.21, -35.88`, `-7.21; -35.88`, `-7.21 -35.88` and
 * `7°12'36"S 35°52'48"O`.
 */
export function parseLatLonPair(line: string): LonLat | null {
  const halves = splitPair(line.trim())
  if (!halves) return null

  const lat = parseDegrees(halves[0], 'lat')
  const lon = parseDegrees(halves[1], 'lon')
  if (lat === null || lon === null) return null
  return [lon, lat]
}

/**
 * Cut a line into its latitude and longitude halves. Whitespace alone cannot
 * do it, because DMS carries its own spaces, so the separator is looked for in
 * order of how unambiguous it is: an explicit comma or semicolon, then the
 * N/S letter that closes the latitude, then whitespace.
 */
function splitPair(line: string): [string, string] | null {
  const separator = line.search(/[;,]/)
  if (separator >= 0) {
    const head = line.slice(0, separator)
    const tail = line.slice(separator + 1)
    // A second separator means a third value, which is not a coordinate pair.
    if (/[;,]/.test(tail)) return null
    return [head, tail]
  }

  const latHemisphere = line.search(/[NSns]/)
  if (latHemisphere >= 0) {
    return [line.slice(0, latHemisphere + 1), line.slice(latHemisphere + 1)]
  }

  const tokens = line.split(/\s+/).filter(Boolean)
  if (tokens.length !== 2) return null
  return [tokens[0], tokens[1]]
}

export type VertexListResult =
  | { ok: true; vertices: LonLat[] }
  | { ok: false; error: string }

/**
 * Read the polygon textarea: one latitude/longitude pair per line. Blank lines
 * are skipped but still counted, so the line number in an error message is the
 * one the user sees in the textarea. A closing vertex repeating the first is
 * dropped, since the ring is closed when the geometry is built.
 */
export function parseVertexList(text: string): VertexListResult {
  const vertices: LonLat[] = []

  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const vertex = parseLatLonPair(line)
    if (!vertex) return { ok: false, error: `Linha ${i + 1}: coordenada inválida` }
    vertices.push(vertex)
  }

  const first = vertices[0]
  const last = vertices[vertices.length - 1]
  if (vertices.length > 1 && first[0] === last[0] && first[1] === last[1]) {
    vertices.pop()
  }

  if (vertices.length < 3) return { ok: false, error: 'Informe ao menos três vértices' }
  return { ok: true, vertices }
}

// Formatting

const pad = (n: number) => String(n).padStart(2, '0')

/** Write a coordinate as degrees/minutes/seconds, e.g. `7°12'36"S`. */
export function formatDms(value: number, axis: Axis): string {
  const absolute = Math.abs(value)

  let degrees = Math.floor(absolute)
  let minutes = Math.floor((absolute - degrees) * 60)
  let seconds = Math.round(((absolute - degrees) * 60 - minutes) * 60)

  // Rounding the seconds can reach 60, which then carries into the minutes and
  // from there into the degrees: 7.999999 must read 8°00'00", not 7°59'60".
  if (seconds === 60) {
    seconds = 0
    minutes += 1
  }
  if (minutes === 60) {
    minutes = 0
    degrees += 1
  }

  const letter = axis === 'lat'
    ? value < 0 ? 'S' : 'N'
    : value < 0 ? 'O' : 'L'

  return `${degrees}°${pad(minutes)}'${pad(seconds)}"${letter}`
}

// Geometry

type CoordinateFeature<G extends GeoJSON.Geometry> = GeoJSON.Feature<G>

/**
 * Properties every typed geometry carries. `ccOrigin` is what makes MapView
 * label the results chip "Coordenadas" instead of "Área desenhada", and
 * `ccLabel` is the text shown under it. They live on the feature, and not in a
 * call argument, because the drawing is persisted as a GeoJSON feature: read
 * from the properties, the chip survives a reload.
 */
function coordinateProperties(label: string) {
  return { ccOrigin: COORDINATE_ORIGIN, ccLabel: label }
}

/** A point at the given coordinate. */
export function buildCoordinatePoint(point: LonLat): CoordinateFeature<GeoJSON.Point> {
  const [lon, lat] = point
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: coordinateProperties(`${formatDms(lat, 'lat')}, ${formatDms(lon, 'lon')}`),
  }
}

/**
 * An axis-aligned rectangle from two opposite corners, in either order and on
 * either diagonal. Null when the two corners share a meridian or a parallel:
 * the ring would have no area and no statistics to report.
 */
export function buildCoordinateRectangle(
  a: LonLat,
  b: LonLat,
): CoordinateFeature<GeoJSON.Polygon> | null {
  const minLon = Math.min(a[0], b[0])
  const maxLon = Math.max(a[0], b[0])
  const minLat = Math.min(a[1], b[1])
  const maxLat = Math.max(a[1], b[1])
  if (minLon === maxLon || minLat === maxLat) return null

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat],
      ]],
    },
    properties: coordinateProperties('retângulo'),
  }
}

/**
 * A polygon from a list of vertices, which is closed here rather than by the
 * caller. Null for fewer than three vertices or for a ring with no area
 * (collinear vertices), which is a typo rather than an area.
 */
export function buildCoordinatePolygon(
  vertices: LonLat[],
): CoordinateFeature<GeoJSON.Polygon> | null {
  if (vertices.length < 3) return null
  if (Math.abs(ringArea(vertices)) < 1e-12) return null

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[...vertices.map(([lon, lat]) => [lon, lat]), [...vertices[0]]]],
    },
    properties: coordinateProperties(`polígono · ${vertices.length} vértices`),
  }
}

/** Shoelace area of an open ring, in square degrees. Sign follows the winding. */
function ringArea(vertices: LonLat[]): number {
  let sum = 0
  for (let i = 0; i < vertices.length; i++) {
    const [x1, y1] = vertices[i]
    const [x2, y2] = vertices[(i + 1) % vertices.length]
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

// Data coverage

export type Coverage = 'inside' | 'partial' | 'outside'

/**
 * How a geometry sits against `CAATINGA_BBOX`. Every layer is clipped to the
 * biome, so a geometry outside it comes back with no data; this is what lets
 * the form say so instead of leaving an empty result unexplained. The box is
 * wider than the biome, so the answer is a hint and not a verdict.
 */
export function caatingaCoverage(geometry: GeoJSON.Geometry): Coverage {
  const [minLon, minLat, maxLon, maxLat] = computeBbox(geometry)
  const [bMinLon, bMinLat, bMaxLon, bMaxLat] = CAATINGA_BBOX

  const contained =
    minLon >= bMinLon && maxLon <= bMaxLon && minLat >= bMinLat && maxLat <= bMaxLat
  if (contained) return 'inside'

  const intersects =
    minLon <= bMaxLon && maxLon >= bMinLon && minLat <= bMaxLat && maxLat >= bMinLat
  return intersects ? 'partial' : 'outside'
}
