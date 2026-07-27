// Arredonda as coordenadas dos GeoJSON de recorte para 5 casas decimais.
// 5 casas valem ~1,1 m no equador, abaixo de um pixel em qualquer zoom que o
// mapa alcanca, entao o traco na tela nao muda; o que cai e o peso do arquivo.
// Nao simplifica geometria: nenhum vertice e removido. Uso: npm run trim
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'vector')
const DECIMALS = 5

const round = (n) => Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS

// As coordenadas sao arrays aninhados de profundidade variavel conforme o tipo
// de geometria (Point ate MultiPolygon), entao a recursao trata todos de uma vez.
function trimCoords(coords) {
  return typeof coords[0] === 'number'
    ? coords.map(round)
    : coords.map(trimCoords)
}

// GeometryCollection guarda `geometries` no lugar de `coordinates`, e o recorte
// simplificado do bioma usa justamente esse tipo. Sem este ramo o arquivo passa
// batido sem aviso.
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
