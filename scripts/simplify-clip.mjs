// Gera versões grosseiras (poucos vértices) das bordas usadas como recorte
// (clipToLayerId). O getMap do GEE paga ~50s processando a borda detalhada do
// bioma (~105 mil vértices); com a borda simplificada offline cai para ~2s, e
// no zoom do bioma o resultado é visualmente idêntico. Grava `<nome>_clip.geojson`
// ao lado do original. Uso: npm run clip  (ou: node scripts/simplify-clip.mjs [tolerancia_m])

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ee = require('@google/earthengine')

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const TOLERANCE_M = Number(process.argv[2]) || 2000

function loadEnv() {
  try {
    const txt = readFileSync(path.join(ROOT, '.env.local'), 'utf-8')
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
      if (m) process.env[m[1]] ??= m[2].trim()
    }
  } catch {}
}
loadEnv()

const evaluate = (obj) => new Promise((res, rej) => obj.evaluate((v, e) => (e ? rej(e) : res(v))))

function countVertices(coords) {
  if (!Array.isArray(coords)) return 0
  if (typeof coords[0] === 'number') return 1
  let n = 0
  for (const c of coords) n += countVertices(c)
  return n
}

async function main() {
  const config = JSON.parse(readFileSync(path.join(ROOT, 'config', 'webgis', 'layers.json'), 'utf-8'))
  const clipIds = [...new Set(config.layers.map((l) => l.clipToLayerId).filter(Boolean))]
  if (clipIds.length === 0) {
    console.log('Nenhuma camada usa clipToLayerId. Nada a fazer.')
    return
  }

  const key = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'))
  await new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      key,
      () => ee.initialize(null, null, resolve, (e) => reject(e)),
      (e) => reject(e),
    )
  })
  console.log(`EE inicializado. Simplificando bordas de recorte (tolerância ${TOLERANCE_M} m)...\n`)

  for (const id of clipIds) {
    const layer = config.layers.find((l) => l.id === id && l.type === 'vector')
    if (!layer?.url) { console.log(`FALHA ${id}: camada não encontrada`); continue }

    const geo = JSON.parse(readFileSync(path.join(ROOT, 'public', layer.url), 'utf-8'))
    const before = countVertices((geo.features ?? []).map((f) => f.geometry?.coordinates))

    const simplified = ee.FeatureCollection(geo).geometry().simplify(TOLERANCE_M)
    const gj = await evaluate(simplified)
    const after = countVertices(gj.coordinates)

    const fc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: gj }] }
    const outPath = layer.url.replace(/\.geojson$/, '_clip.geojson')
    writeFileSync(path.join(ROOT, 'public', outPath), JSON.stringify(fc), 'utf-8')
    console.log(`OK   ${id}: ${before} -> ${after} vértices  (public${outPath})`)
  }

  console.log('\nPronto. O clipRegistry usará esses arquivos automaticamente.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error('Erro:', err); process.exit(1) })
