// Verifica no Google Earth Engine os asset IDs candidatos para as camadas de
// carbono. Autentica com a service account de GOOGLE_APPLICATION_CREDENTIALS e,
// para cada candidato, imprime as bandas (ou o erro). Uso: node scripts/verify-assets.mjs
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ee = require('@google/earthengine')

// Carrega o caminho da credencial do .env.local (sem depender de dotenv)
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

// image = ee.Image direto; ic = primeira imagem de uma ImageCollection.
// Os assets EM USO em config/webgis/layers.json estão marcados com [EM USO].
const CANDIDATES = [
  // Solo (MapBiomas Solo)
  ['image', 'projects/mapbiomas-public/assets/brazil/soil/collection2/mapbiomas_soil_collection2_soc_t_ha_000_030cm'], // [EM USO]
  ['image', 'projects/mapbiomas-public/assets/brazil/soil/collection2/mapbiomas_soil_collection2_stocks_v001'],
  ['image', 'projects/mapbiomas-public/assets/brazil/soil/collection3/mapbiomas_soil_collection3_stocks_v1'],
  ['image', 'projects/mapbiomas-public/assets/brazil/soil/collection2/mapbiomas_soil_collection2_carbon_stock_0_30cm_v1'],
  ['image', 'projects/soilgrids-isric/ocs_mean'],
  // LULC MapBiomas
  ['image', 'projects/mapbiomas-public/assets/brazil/lulc/collection10_1/mapbiomas_brazil_collection10_1_coverage_v1'], // [EM USO]
  ['image', 'projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1'],
  // Fogo MapBiomas
  ['image', 'projects/mapbiomas-public/assets/brazil/fire/collection3/mapbiomas_fire_collection3_fire_frequency_v1'], // [EM USO]
  ['image', 'projects/mapbiomas-public/assets/brazil/fire/collection3/mapbiomas_fire_collection3_annual_burned_coverage_v1'],
  // Biomassa
  ['image', 'NASA/ORNL/biomass_carbon_density/v1'],
  ['image', 'LARSE/GEDI/GEDI04_B_002'],
  ['ic', 'ESA/CCI/FireCCI/5_1'],
  ['image', 'projects/sat-io/open-datasets/ESA_CCI_AGB/CCI_BIOMASS_100m_AGB_V4_1'],
  // Produtividade / fluxo
  ['ic', 'MODIS/061/MOD17A2HGF'],
  ['ic', 'MODIS/061/MOD17A3HGF'],
  ['image', 'projects/sat-io/open-datasets/forest_carbon_fluxes/net_flux'],
  ['image', 'projects/sat-io/open-datasets/forest_carbon_fluxes/gross_emissions'],
  ['image', 'projects/sat-io/open-datasets/forest_carbon_fluxes/gross_removals'],
  // Fogo MODIS
  ['ic', 'MODIS/061/MCD64A1'],
]

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
    console.log('EE inicializado. Verificando', CANDIDATES.length, 'assets...\n')
    for (const c of CANDIDATES) {
      const r = await check(c)
      if (r.ok) console.log('OK  ', r.id, '\n     bandas:', JSON.stringify(r.bands))
      else console.log('FALHA', r.id, '\n     ', r.error)
    }
    process.exit(0)
  }, (err) => { console.error('initialize falhou:', err); process.exit(1) })
}, (err) => { console.error('auth falhou:', err); process.exit(1) })
