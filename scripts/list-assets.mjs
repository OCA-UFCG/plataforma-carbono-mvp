// Lists the children of asset directories in GEE to find exact paths.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ee = require('@google/earthengine')
const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
for (const line of txt.split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m) process.env[m[1]] ??= m[2] }

const PARENTS = [
  'projects/mapbiomas-public/assets/brazil/soil',
  'projects/mapbiomas-public/assets/brazil/soil/collection2',
  'projects/sat-io/open-datasets/ESA_CCI_AGB',
]

function listAssets(parent) {
  return new Promise((resolve) => {
    ee.data.listAssets(parent, {}, (res, err) => {
      if (err) return resolve({ parent, error: String(err).slice(0, 140) })
      resolve({ parent, assets: (res?.assets || []).map((a) => `${a.type}  ${a.id || a.name}`) })
    })
  })
}

const key = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'))
ee.data.authenticateViaPrivateKey(key, () => {
  ee.initialize(null, null, async () => {
    for (const p of PARENTS) {
      const r = await listAssets(p)
      console.log('\n==', p)
      if (r.error) console.log('  erro:', r.error)
      else r.assets.forEach((a) => console.log('  ', a))
    }
    process.exit(0)
  }, (e) => { console.error(e); process.exit(1) })
}, (e) => { console.error(e); process.exit(1) })
