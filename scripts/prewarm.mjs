// Aquece o cache de tile do servidor: dispara um POST /api/gee/tile para cada
// camada raster, populando o cache em memória (lib/tileCache.ts) para que o
// primeiro usuário real já pegue os tiles prontos. Rode com o servidor no ar
// (após `npm run start`). Uso: node scripts/prewarm.mjs [baseUrl]

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.argv[2] || process.env.PREWARM_URL || 'http://localhost:3000'

const config = JSON.parse(readFileSync(path.join(ROOT, 'config', 'webgis', 'layers.json'), 'utf-8'))
const rasters = config.layers.filter((l) => l.type === 'raster' && l.source === 'gee')

console.log(`Aquecendo ${rasters.length} camadas em ${BASE}...`)

for (const layer of rasters) {
  const body = {
    asset: layer.gee.asset,
    clipId: layer.clipToLayerId,
    visParams: layer.gee.visParams,
    classify: layer.gee.classify,
  }
  const t0 = Date.now()
  try {
    const res = await fetch(`${BASE}/api/gee/tile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const dt = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(res.ok ? `OK   ${layer.id} (${dt}s)` : `FALHA ${layer.id}: HTTP ${res.status}`)
  } catch (e) {
    console.log(`FALHA ${layer.id}: ${e.message}`)
  }
}

console.log('Cache aquecido.')
