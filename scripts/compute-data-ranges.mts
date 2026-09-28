// Measures the real minimum and maximum of every continuous raster layer over
// the Caatinga, per year for temporal layers, and writes them to
// config/mapa/dataRanges.json for the legend (lib/mapa/dataRange.ts).
//
// A min/max at native resolution over the whole biome runs past the 5-minute
// limit of an interactive call at 30 m, so it goes through batch exports in two
// steps:
//
//   npm run ranges -- start [ids]  submits one table export per layer (all, or the ids given)
//   npm run ranges -- collect   reads the finished tables and writes the JSON
//
// `collect` reports layers whose task is still running; run it again later.
// Until then such a layer keeps the range already in the JSON.
// The image is built by the same buildEeImage the map uses, clipped by the same
// asset as the tile route, at the layer's native scale (gee.asset.scale).

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildEeImage } from '../lib/mapa/geeImage.ts'
import { layerYears, type DataRange, type DataRangesFile } from '../lib/mapa/dataRange.ts'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ee: any = require('@google/earthengine')

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const LAYERS = path.join(ROOT, 'config', 'mapa', 'layers.json')
const OUT = path.join(ROOT, 'config', 'mapa', 'dataRanges.json')

for (const line of readFileSync(path.join(ROOT, '.env.local'), 'utf-8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
  if (m) process.env[m[1]] ??= m[2].trim()
}

const key = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, 'utf-8'))
const PROJECT: string = key.project_id
const FOLDER = `projects/${PROJECT}/assets/data_ranges`

const config = JSON.parse(readFileSync(LAYERS, 'utf-8'))
const clipAsset: string = config.layers.find((l: { id: string }) => l.id === 'bioma').clipAsset
// Left out on purpose, so their legends keep the stretch labels: their exports
// ran for hours and timed out or were cancelled.
const SKIP = new Set(['solo_carbono', 'fogo_frequencia'])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const continuous = config.layers.filter((l: any) =>
  l.type === 'raster' && l.colorType === 'continuous' && l.gee?.asset && !SKIP.has(l.id))

// What a table measured, set on each of its rows. The tables are named by layer
// id only, in one folder every branch writes to, so a table can hold another
// branch's asset for the same id; collect only trusts rows that match the
// layer's asset block here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const measured = (layer: any) => JSON.stringify(layer.gee.asset)

const call = <T>(fn: (ok: (v: T) => void, fail: (e: unknown) => void) => void) =>
  new Promise<T>((ok, fail) => fn(ok, fail))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rangeTable(layer: any) {
  // The biome outline has ~108k vertices; reducing inside it at 30 m ran past
  // 12 h and timed out, simplified it takes minutes. 500 m matches the
  // tolerance the tile route clips with.
  const region = ee.FeatureCollection(clipAsset).geometry().simplify(500)
  const years: (string | null)[] = layer.gee.temporal ? layerYears(layer.gee.temporal) : [null]
  return ee.FeatureCollection(years.map((year) => {
    const image = buildEeImage(ee, layer.gee.asset, year ? `${year}-01-01` : undefined).rename('v')
    const stats = image.reduceRegion({
      reducer: ee.Reducer.minMax(),
      geometry: region,
      scale: layer.gee.asset.scale,
      maxPixels: 1e13,
      tileScale: 16,
    })
    // A table export rejects features without geometry; the point is a placeholder.
    return ee.Feature(ee.Geometry.Point([0, 0]), stats).set({ year: year ?? 'static', measured: measured(layer) })
  }))
}

async function start(only: string[]) {
  await call((ok) => ee.data.createFolder(FOLDER, false, ok, () => ok(undefined)))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const layer of continuous.filter((l: any) => only.length === 0 || only.includes(l.id))) {
    const assetId = `${FOLDER}/${layer.id}`
    await call((ok) => ee.data.deleteAsset(assetId, ok, () => ok(undefined)))
    const task = ee.batch.Export.table.toAsset({
      collection: rangeTable(layer),
      description: `data_range_${layer.id}`,
      assetId,
    })
    await call((ok, fail) => task.start(ok, fail))
    console.log(`enviada  ${layer.id}`)
  }
}

const round = (n: number) => Number(n.toFixed(4))

async function collect() {
  // A layer whose table can't be used this time keeps what the JSON already
  // has: `start` deletes the old table before exporting, so a collect run
  // before the export finishes would otherwise wipe that layer's range.
  const previous: DataRangesFile = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf-8')) : { layers: {} }
  const layers: DataRangesFile['layers'] = {}
  let pending = 0
  const stale: string[] = []
  let updated = 0
  for (const layer of continuous) {
    const kept = previous.layers[layer.id]
    const keep = (why: string) => {
      if (kept) layers[layer.id] = kept
      console.log(`${why} ${layer.id}${kept ? ' (mantido o valor anterior)' : ''}`)
    }
    const rows = await call<{ features: { properties: Record<string, unknown> }[] }>((ok, fail) =>
      ee.FeatureCollection(`${FOLDER}/${layer.id}`).evaluate((v: never, e: unknown) => (e ? fail(e) : ok(v))),
    ).catch(() => null)
    if (!rows) { pending++; keep('pendente'); continue }
    // Also true of a table exported before `measured` existed: nothing says
    // which asset it read.
    if (rows.features.some(({ properties: p }) => p.measured !== measured(layer))) {
      stale.push(layer.id)
      keep('outro asset')
      continue
    }

    const byYear: Record<string, DataRange> = {}
    for (const { properties: p } of rows.features) {
      if (typeof p.v_min !== 'number' || typeof p.v_max !== 'number') continue
      byYear[String(p.year)] = { min: round(p.v_min), max: round(p.v_max) }
    }
    layers[layer.id] = layer.gee.temporal ? { byYear } : byYear.static
    updated++
    console.log(`ok       ${layer.id} (${Object.keys(byYear).length} valor(es))`)
  }

  writeFileSync(OUT, JSON.stringify({
    _meta: {
      region: `${clipAsset} (simplificado a 500 m)`,
      scale: 'gee.asset.scale de cada camada',
      computedAt: updated ? new Date().toISOString().slice(0, 10) : previous._meta?.computedAt,
    },
    layers,
  }, null, 2) + '\n', 'utf-8')
  console.log(`\n${OUT} gravado${pending ? `; ${pending} camada(s) pendente(s), rode collect de novo` : ''}.`)
  if (stale.length) console.log(`Tabela de outro asset ou sem registro do asset medido: npm run ranges -- start ${stale.join(' ')}`)
}

const mode = process.argv[2]
await call((ok, fail) => ee.data.authenticateViaPrivateKey(key, () => ee.initialize(null, null, ok, fail, null, PROJECT), fail))
if (mode === 'start') await start(process.argv.slice(3))
else if (mode === 'collect') await collect()
else console.log('uso: npm run ranges -- start | collect')
