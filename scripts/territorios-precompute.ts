// Precomputes the biome entry of config/territorios/precomputed.json, which
// /api/territorios/tema serves before trying Earth Engine.
//
// The biome is answered from this file for an immediate response and stable
// numbers: live, its reductions take 3 to 17 s each and the flux and fire ones
// only fit the deadline at 100 m.
//
// Run from landing/ (needs GOOGLE_APPLICATION_CREDENTIALS in .env.local):
//   npx tsx --env-file=.env.local --tsconfig scripts/tsconfig.territorios.json scripts/territorios-precompute.ts
// Theme ids after the script name recompute only those themes and keep the
// others already in the file; a theme no longer in the story is dropped:
//   npx tsx --env-file=.env.local --tsconfig scripts/tsconfig.territorios.json scripts/territorios-precompute.ts fluxo chuva
//
// The dedicated tsconfig points `server-only` at the test stub, so this script
// can import lib/mapa/recorteRegistry.ts as it is.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { BIOMA_FEATURE_ID, BIOMA_RECORTE_ID, STORY_THEMES } from '@/config/territorios/story'
import { getEe, initGee } from '@/lib/mapa/geeAuth'
import { getFeicao } from '@/lib/mapa/recorteRegistry'
import { computeTheme } from '@/lib/territorios/computeTheme'
import type { PrecomputedFile, ThemeId } from '@/types/territorios'

const OUTPUT = path.join(process.cwd(), 'config', 'territorios', 'precomputed.json')
const KEY = `${BIOMA_RECORTE_ID}|${BIOMA_FEATURE_ID}`

/**
 * At 30 m the biome's bounding box holds about 1.9e9 pixels, past the 1e9 of
 * computeZonalStats, and bestEffort would pick a coarser scale the note could
 * not name.
 */
const BIOME_LAND_USE_SCALE_M = 100

async function main(): Promise<number> {
  const known = STORY_THEMES.map((t) => t.id)
  const requested = process.argv.slice(2)
  const unknown = requested.filter((id) => !known.includes(id as ThemeId))
  if (unknown.length > 0) {
    console.error(`Unknown theme: ${unknown.join(', ')}. Expected one of ${known.join(', ')}.`)
    return 1
  }
  const themes = requested.length > 0 ? requested as ThemeId[] : known

  const feicao = getFeicao(BIOMA_RECORTE_ID, BIOMA_FEATURE_ID)
  if (!feicao) {
    console.error(`Feature ${KEY} not found; run from landing/.`)
    return 1
  }

  const file: PrecomputedFile = existsSync(OUTPUT)
    ? JSON.parse(readFileSync(OUTPUT, 'utf-8'))
    : { generatedAt: '', entries: {} }
  const entry = file.entries[KEY] ?? { featureName: feicao.name, themes: {} }
  entry.featureName = feicao.name
  for (const id of Object.keys(entry.themes)) {
    if (!known.includes(id as ThemeId)) delete entry.themes[id as ThemeId]
  }

  await initGee()
  const ee = getEe()

  let failed = 0
  for (const theme of themes) {
    const started = Date.now()
    try {
      const result = await computeTheme(ee, {
        theme,
        geometry:      feicao.geometry,
        areaHa:        feicao.areaHa,
        landUseScaleM: BIOME_LAND_USE_SCALE_M,
      })
      entry.themes[theme] = { status: result.status, coarseScaleM: result.coarseScaleM, data: result.data }
      console.log(`${theme}: ${result.status}, origin ${result.origin}, scale ${result.coarseScaleM ?? 'native'}, ${Date.now() - started} ms`)
    } catch (err) {
      failed++
      console.error(`${theme}: failed after ${Date.now() - started} ms: ${err instanceof Error ? err.message : err}`)
    }
  }

  file.generatedAt = new Date().toISOString()
  file.entries[KEY] = entry
  writeFileSync(OUTPUT, `${JSON.stringify(file, null, 2)}\n`)
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT)}`)
  return failed > 0 ? 1 : 0
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  },
)
