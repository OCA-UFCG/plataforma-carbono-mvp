// Rounds the coordinates of the clip GeoJSONs to 5 decimal places.
// 5 places are worth ~1.1 m at the equator, below a pixel at any zoom the map
// reaches, so the stroke on screen does not change; what drops is the file size.
// It does not simplify geometry: no vertex is removed. Usage: npm run trim
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'vector')
const DECIMALS = 5

const round = (n) => Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS

// Coordinates are nested arrays of varying depth depending on the geometry type
// (Point up to MultiPolygon), so the recursion handles them all at once.
function trimCoords(coords) {
  return typeof coords[0] === 'number'
    ? coords.map(round)
    : coords.map(trimCoords)
}

// GeometryCollection stores `geometries` instead of `coordinates`, and the
// simplified clip of the biome uses exactly that type. Without this branch the
// file would go through unnoticed.
function trimGeometry(g) {
  if (!g) return
  if (g.type === 'GeometryCollection') g.geometries?.forEach(trimGeometry)
  else if (g.coordinates) g.coordinates = trimCoords(g.coordinates)
}

let totalBefore = 0
let totalAfter = 0

for (const name of readdirSync(DIR).filter((f) => f.endsWith('.geojson'))) {
  const file = path.join(DIR, name)
  const before = statSync(file).size
  const fc = JSON.parse(readFileSync(file, 'utf-8'))

  if (fc.type === 'FeatureCollection') fc.features?.forEach((f) => trimGeometry(f.geometry))
  else if (fc.type === 'Feature') trimGeometry(fc.geometry)
  else trimGeometry(fc)

  writeFileSync(file, JSON.stringify(fc))
  const after = statSync(file).size
  totalBefore += before
  totalAfter += after
  const kb = (b) => Math.round(b / 1024)
  console.log(`${name.padEnd(34)} ${String(kb(before)).padStart(5)} KB -> ${String(kb(after)).padStart(5)} KB`)
}

const saved = Math.round((1 - totalAfter / totalBefore) * 100)
console.log(`\ntotal: ${Math.round(totalBefore / 1024)} KB -> ${Math.round(totalAfter / 1024)} KB (${saved}% menor)`)
