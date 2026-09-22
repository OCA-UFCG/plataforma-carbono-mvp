// Verifies on Google Earth Engine every asset config/mapa/layers.json uses, plus
// a list of candidate asset IDs for future carbon layers. Authenticates with the
// service account from GOOGLE_APPLICATION_CREDENTIALS and prints the bands (or
// the error) for each. Usage: node scripts/verify-assets.mjs
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ee = require('@google/earthengine')

// Loads the credential path from .env.local (without depending on dotenv)
function loadEnv() {
  try {
    const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
      if (m) process.env[m[1]] ??= m[2]
    }
  } catch {}
}
loadEnv()

// Candidates under evaluation, not necessarily in use; the assets in use come
// from layers.json below. image = ee.Image directly; ic = first image of an
// ImageCollection.
const CANDIDATES = [
  // Soil (MapBiomas Solo)
  ['image', 'projects/mapbiomas-public/assets/brazil/soil/collection2/mapbiomas_soil_collection2_soc_t_ha_000_030cm'], // [IN USE]
  ['image', 'projects/mapbiomas-public/assets/brazil/soil/collection2/mapbiomas_soil_collection2_stocks_v001'],
  ['image', 'projects/mapbiomas-public/assets/brazil/soil/collection3/mapbiomas_soil_collection3_stocks_v1'],
  ['image', 'projects/mapbiomas-public/assets/brazil/soil/collection2/mapbiomas_soil_collection2_carbon_stock_0_30cm_v1'],
  ['image', 'projects/soilgrids-isric/ocs_mean'],
  // LULC MapBiomas
  ['image', 'projects/mapbiomas-public/assets/brazil/lulc/collection10_1/mapbiomas_brazil_collection10_1_coverage_v1'], // [IN USE]
  ['image', 'projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1'],
  // Fire MapBiomas
  ['image', 'projects/mapbiomas-public/assets/brazil/fire/collection3/mapbiomas_fire_collection3_fire_frequency_v1'], // [IN USE]
  ['image', 'projects/mapbiomas-public/assets/brazil/fire/collection3/mapbiomas_fire_collection3_annual_burned_coverage_v1'],
  // Biomass
  ['image', 'NASA/ORNL/biomass_carbon_density/v1'],
  ['image', 'LARSE/GEDI/GEDI04_B_002'],
  ['ic', 'ESA/CCI/FireCCI/5_1'],
  ['image', 'projects/sat-io/open-datasets/ESA_CCI_AGB/CCI_BIOMASS_100m_AGB_V4_1'],
  // Productivity / flux
  ['ic', 'MODIS/061/MOD17A2HGF'],
  ['ic', 'MODIS/061/MOD17A3HGF'],
  ['image', 'projects/sat-io/open-datasets/forest_carbon_fluxes/net_flux'],
  ['image', 'projects/sat-io/open-datasets/forest_carbon_fluxes/gross_emissions'],
  ['image', 'projects/sat-io/open-datasets/forest_carbon_fluxes/gross_removals'],
  // Fire MODIS
  ['ic', 'MODIS/061/MCD64A1'],
]

// Every asset the platform reads, taken from layers.json so the list cannot
// drift. A class raster must also have a MODE pyramid: Earth Engine records the
// pyramid policy at ingestion and defaults to MEAN whatever the pixel type, and
// a MEAN pyramid mixes neighbouring class codes whenever the map is zoomed out
// past the native resolution. ee.data.getAsset does not return the policy, so
// it is read from the REST endpoint.
const layers = JSON.parse(readFileSync(new URL('../config/mapa/layers.json', import.meta.url), 'utf-8')).layers
const IN_USE = new Map() // asset id -> id of the class layer that needs MODE, or null
for (const l of layers) {
  const id = l.gee?.asset?.id
  if (id) IN_USE.set(id, l.colorType === 'categorical' && !l.gee.classify ? l.id : (IN_USE.get(id) ?? null))
  if (l.gee?.stocks?.classAsset) IN_USE.set(l.gee.stocks.classAsset, `${l.id} (classAsset)`)
  if (l.clipAsset) IN_USE.set(l.clipAsset, IN_USE.get(l.clipAsset) ?? null)
}

async function checkInUse(id, classLayer) {
  // Legacy ids ("MODIS/061/...", "projects/sat-io/open-datasets/...") are not
  // REST names; the client's own converter maps them.
  const name = ee.rpc_convert.assetIdToAssetName(id)
  const res = await fetch(`https://earthengine.googleapis.com/v1/${name}`, {
    headers: { Authorization: ee.data.getAuthToken() },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = { error: { message: `HTTP ${res.status}, resposta sem JSON` } }
  }
  if (!res.ok || body.error) {
    console.log('FALHA', id, '\n     ', body.error?.message ?? res.status)
    return false
  }
  console.log('OK  ', id, `(${body.type})`)
  if (!classLayer) return true
  // An ImageCollection reports no bands here: the pyramid policy lives on the
  // member images. Reading that as "no offending band" would wave a collection
  // of class codes through unchecked, so the missing case fails closed.
  if (!body.bands) {
    console.log('AVISO', id, `\n      usado pela camada ${classLayer}, com classes, mas a resposta (${body.type}) não traz bandas; pirâmide não conferida`)
    return false
  }
  const notMode = body.bands.filter((b) => (b.pyramidingPolicy ?? 'MEAN') !== 'MODE')
  if (notMode.length === 0) return true
  const policies = [...new Set(notMode.map((b) => b.pyramidingPolicy ?? 'MEAN'))].join(', ')
  console.log('AVISO', id, `\n      usado pela camada ${classLayer}, com classes, mas pyramidingPolicy ${policies}; reingerir com MODE`)
  return false
}

function evaluate(obj) {
  return new Promise((resolve, reject) => obj.evaluate((v, err) => (err ? reject(err) : resolve(v))))
}

async function check([kind, id]) {
  try {
    const img = kind === 'ic' ? ee.ImageCollection(id).first() : ee.Image(id)
    const info = await evaluate(img.bandNames())
    return { id, ok: true, bands: info }
  } catch (err) {
    return { id, ok: false, error: String(err).slice(0, 160) }
  }
}

const key = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'))
ee.data.authenticateViaPrivateKey(key, () => {
  ee.initialize(null, null, async () => {
    console.log('EE inicializado. Verificando', IN_USE.size, 'assets em uso no layers.json...\n')
    let problems = 0
    for (const [id, classLayer] of IN_USE) {
      if (!(await checkInUse(id, classLayer))) problems++
    }
    console.log('\nVerificando', CANDIDATES.length, 'candidatos...\n')
    for (const c of CANDIDATES) {
      const r = await check(c)
      if (r.ok) console.log('OK  ', r.id, '\n     bandas:', JSON.stringify(r.bands))
      else console.log('FALHA', r.id, '\n     ', r.error)
    }
    // Only the assets in use decide the exit code; a missing candidate is news,
    // not a broken platform.
    process.exit(problems ? 1 : 0)
  }, (err) => { console.error('initialize falhou:', err); process.exit(1) })
}, (err) => { console.error('auth falhou:', err); process.exit(1) })
