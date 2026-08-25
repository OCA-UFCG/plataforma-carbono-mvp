// Computes the Jenks breaks over the biome for each classified layer and writes
// them into config/webgis/layers.json (gee.classify.breaks). Run it once, or
// whenever the data or numClasses changes, so the tile route can skip live
// sampling ("Jenks offline"). Usage: npm run breaks  (or: node scripts/compute-breaks.mjs)

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ee = require('@google/earthengine')

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// Simplification tolerance of the clip (must match the tile route's).
const CLIP_SIMPLIFY_M = 500

// --- .env.local (GOOGLE_APPLICATION_CREDENTIALS) ---
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

// --- Jenks (copy of lib/jenks.ts) ---
function jenksBreaks(data, numClasses) {
  const sorted = data.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  const n = sorted.length
  if (n === 0) return []
  if (n <= numClasses) return [...new Set(sorted)].slice(0, numClasses - 1)

  const k = numClasses
  const lcl = Array.from({ length: n + 1 }, () => new Float64Array(k + 1))
  const vc = Array.from({ length: n + 1 }, () => {
    const a = new Float64Array(k + 1)
    a.fill(Infinity)
    return a
  })
  for (let i = 1; i <= k; i++) { lcl[1][i] = 1; vc[1][i] = 0 }
  for (let l = 2; l <= n; l++) {
    let sum = 0, sumSq = 0, w = 0
    for (let m = 1; m <= l; m++) {
      const val = sorted[l - m]
      w++; sum += val; sumSq += val * val
      const variance = sumSq - (sum * sum) / w
      if (m < l) {
        for (let j = 2; j <= k; j++) {
          const candidate = variance + vc[l - m][j - 1]
          if (candidate < vc[l][j]) { lcl[l][j] = l - m + 1; vc[l][j] = candidate }
        }
      }
    }
    lcl[l][1] = 1
    vc[l][1] = sumSq - (sum * sum) / w
  }
  const breaks = []
  let cursor = n
  for (let j = k; j >= 2; j--) {
    const lower = lcl[cursor][j]
    breaks.unshift(sorted[lower - 1])
    cursor = lower - 1
  }
  return breaks
}

// --- buildEeImage (replica of lib/geeImage.ts, non-temporal branch) ---
function buildEeImage(asset) {
  const hasRange = asset.validMin !== undefined || asset.validMax !== undefined
  const maskValid = (img) => {
    if (!hasRange) return img
    let mask = img.mask()
    if (asset.validMin !== undefined) mask = mask.and(img.gte(asset.validMin))
    if (asset.validMax !== undefined) mask = mask.and(img.lte(asset.validMax))
    return img.updateMask(mask)
  }
  if (asset.type === 'imageCollection') {
    let col = ee.ImageCollection(asset.id)
    if (asset.filterDate) col = col.filterDate(asset.filterDate[0], asset.filterDate[1])
    if (asset.band) col = col.select(asset.band)
    if (hasRange) col = col.map(maskValid)
    switch (asset.reducer ?? 'mean') {
      case 'median': return col.median()
      case 'min':    return col.min()
      case 'max':    return col.max()
      case 'first':  return col.first()
      default:       return col.mean()
    }
  }
  let img = ee.Image(asset.id)
  if (asset.band) img = img.select(asset.band)
  return maskValid(img)
}

// --- bbox of a GeoJSON (recursive walk) ---
function computeBbox(geojson) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
  const visit = (c) => {
    if (!Array.isArray(c)) return
    if (typeof c[0] === 'number' && typeof c[1] === 'number') {
      if (c[0] < minLon) minLon = c[0]
      if (c[1] < minLat) minLat = c[1]
      if (c[0] > maxLon) maxLon = c[0]
      if (c[1] > maxLat) maxLat = c[1]
      return
    }
    for (const x of c) visit(x)
  }
  for (const f of geojson.features ?? [geojson]) visit(f.geometry?.coordinates ?? f.coordinates)
  return [minLon, minLat, maxLon, maxLat]
}

const evaluate = (obj) => new Promise((res, rej) => obj.evaluate((v, e) => (e ? rej(e) : res(v))))

async function main() {
  const layersPath = path.join(ROOT, 'config', 'webgis', 'layers.json')
  const config = JSON.parse(readFileSync(layersPath, 'utf-8'))

  const bioma = config.layers.find((l) => l.id === 'bioma')
  if (!bioma?.url) throw new Error('camada "bioma" não encontrada em layers.json')
  const biomaGeo = JSON.parse(readFileSync(path.join(ROOT, 'public', bioma.url), 'utf-8'))
  const bbox = computeBbox(biomaGeo)

  const jenksLayers = config.layers.filter((l) => l.gee?.classify?.method === 'jenks')
  if (jenksLayers.length === 0) {
    console.log('Nenhuma camada Jenks em layers.json. Nada a fazer.')
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
  console.log('EE inicializado. Calculando breaks sobre o bioma...\n')

  const clipRegion = ee.FeatureCollection(biomaGeo).geometry().simplify(CLIP_SIMPLIFY_M)
  const sampleRegion = ee.Geometry.Rectangle(bbox)

  for (const layer of jenksLayers) {
    const asset = layer.gee.asset
    const numClasses = layer.gee.classify.numClasses
    const image = buildEeImage(asset).clip(clipRegion)
    const sample = image.sample({
      region: sampleRegion,
      scale: asset.scale ?? 500,
      numPixels: 5000,
      seed: 42,
      geometries: false,
    })
    const values = await evaluate(sample.aggregate_array(asset.band))
    if (!values || values.length < numClasses) {
      console.log(`FALHA ${layer.id}: poucos pixels (${values?.length ?? 0})`)
      continue
    }
    const breaks = jenksBreaks(values, numClasses).map((b) => Number(b.toFixed(4)))
    layer.gee.classify.breaks = breaks
    console.log(`OK   ${layer.id} (${numClasses} classes) -> breaks: [${breaks.join(', ')}]`)
  }

  writeFileSync(layersPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  console.log('\nconfig/webgis/layers.json atualizado.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error('Erro:', err); process.exit(1) })
