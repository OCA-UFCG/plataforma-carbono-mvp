# Map by feature of the finest active recorte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** With Municípios (or Estados) on, every visible continuous Earth Engine layer in `/mapa` is drawn as a map by feature — one color per municipality, its mean value — on a legend running from the lowest to the highest feature value; Municípios wins over Estados; without either, today's pixels on the biome scale.

**Architecture:** A new session-protected route `POST /api/gee/choropleth { layerId, recorteId }` reduces every year of a layer over every feature of the recorte in one Earth Engine `reduceRegions` (cached a day) and returns `values[year][featureIndex]` plus the range. The client fetches it when the recorte or the raster turns on, and MapView draws a MapLibre `fill` layer on the recorte's own GeoJSON source, colored from feature states, right above the raster it replaces. One pure module (`lib/mapa/choropleth.ts`) decides which recorte applies, the colors and the legend, for both MapView and the legend.

**Tech Stack:** Next.js 16 (Node runtime routes), React 19, Zustand 5, MapLibre GL 5, `@google/earthengine`, Vitest 4 (node environment).

**Spec:** `docs/superpowers/specs/2026-10-21-recorte-choropleth-design.md`

## Global Constraints

- Work in the worktree `/tmp/claude-1002/-home-ezequias-oca-plataforma-carbono-mvp/edc1ac9f-c483-4e9c-a085-f1a7717d93b7/scratchpad/recorte-scale`, branch `feat/recorte-adaptive-scale` (PR #122). Paths below are relative to it; `$W` names it. The merge base with `main` is `579a5f9`.
- Code, comments and docs in English. User-facing strings stay Portuguese; the new ones are `"Escala estadual"`, `"Escala municipal"` (in `layers.json`) and `"Calculando escala municipal…"` (built from them).
- Every Earth Engine image goes through `buildEeImage`. The asset is read from `layers.json` on the server, never from the request body.
- The new route calls `getAuthenticatedRequest(req)` → `unauthorizedResponse()` first; error messages stay generic (`'Earth Engine unavailable'`, `'Failed to process Earth Engine request'`).
- `/api/gee/tile`, the Territórios story and the territorial report are not modified.
- Commits: conventional prefix, English, **no `Co-Authored-By` or any Claude attribution trailer**.
- `tsc --noEmit` and `npm run lint` have a baseline on `main`: 5 type errors in `tests/lib/{contentfulSpace,layerVisibility,reportService,zonalSeries}.test.ts` and 5 lint problems (3 errors in `Mapa.tsx`/`FloatingSearchBar.tsx`, 2 warnings in MapView's init effect). The gate is **no new ones**.
- A dev server may be running from this worktree on :3100 (pid in `ss -ltnp`); `npm run build` needs it stopped. Stop servers by pid, never `pkill -f`.

## Review Focus

1. **Switching recorte while drawn by feature** (Municípios turned off with Estados on, or on over Estados): the fill must move to the other recorte's source, not keep the old one — pinned in Task 8 (rendered step) and Task 3 (`choroplethRecorte` priority test).
2. **The raster's opacity slider moved while drawn by feature:** the pixels must stay hidden and the fill must follow the opacity — pinned in Task 7 (implementation re-zeroes after the layer sync) and Task 8 (rendered step).
3. **A page reload with Municípios and a raster restored on:** the fill must come back once the raster's tile and the values arrive — pinned in Task 8 (rendered step).
4. **Year steps on a temporal layer:** colors must change with no request — pinned in Task 8 (network step) and Task 3 (`choroplethView` picks the year's row).
5. **A feature without a value** (tiny municipality at 1 km, or no data): it must show no fill, not the palette's first color — pinned in Task 3 (`choroplethColor` transparent branch test).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/mapa/choropleth.ts` (new, pure) | Types; `STATIC_KEY`, `bandOf`, `roundValue`; `choroplethKey`; `isChoroplethLayer`, `choroplethRecorte`; `choroplethRange` (signed-flux rule); `choroplethColor`; `choroplethView`, `choroplethPending`; `withoutChoroplethErrors`. |
| `lib/mapa/choroplethCompute.ts` (new, server-only) | The one `reduceRegions`; the empty-year guard `yearBand`; `parseChoropleth`. |
| `lib/mapa/choroplethService.ts` (new, server-only) | Allowlist of layers and recortes; cache and in-flight dedupe; assembles the response. |
| `app/api/gee/choropleth/route.ts` (new) | HTTP. |
| `lib/mapa/recorteRegistry.ts` | + `featureGeometries(recorteId)`. |
| `config/mapa/layers.json`, `types/mapa.ts` | `choropleth: { caption }` on estados and municipios. |
| `lib/mapa/store.ts` | `choropleths`; turning a choropleth recorte on drops its errors. |
| `lib/mapa/choroplethRunner.ts` (new) | `pendingChoropleths` (pure) + `runChoropleths`. |
| `components/mapa/MapView.tsx` | Runner effect; draw effect; z-order. |
| `components/mapa/overlays/FloatingLegend.tsx` | Range, caption, "Calculando…". |
| `CLAUDE.md` | `/api/gee/choropleth` in the GEE routes section. |
| Removed | Everything of the per-feature design (Task 2). |

---

### Task 1: Measure the reduction on the real Earth Engine (spike, nothing committed)

**Files:** a throwaway probe under the scratchpad, outside the worktree.

**Interfaces:**
- Produces: the value of `CHOROPLETH_MIN_SCALE_M` (Task 4) and confirmation of the output naming and null handling `parseChoropleth` relies on. Record both in the ledger.

- [ ] **Step 1: Write the probe**

```bash
W=/tmp/claude-1002/-home-ezequias-oca-plataforma-carbono-mvp/edc1ac9f-c483-4e9c-a085-f1a7717d93b7/scratchpad/recorte-scale
G=$W/../gee-probe; mkdir -p $G
cat > $G/tsconfig.json <<EOF
{ "extends": "$W/tsconfig.json",
  "compilerOptions": { "baseUrl": "$W", "paths": { "@/*": ["./*"], "server-only": ["tests/stubs/server-only.ts"] } } }
EOF
cat > $G/choropleth.mts <<'EOF'
// Throwaway: time reduceRegions over every municipality, and check its output.
import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local', 'utf-8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m) process.env[m[1]] ??= m[2].trim()
}
const W = process.cwd()
const { initGee, getEe } = await import(`${W}/lib/mapa/geeAuth.ts`)
const { buildEeImage, yearWindow } = await import(`${W}/lib/mapa/geeImage.ts`)
const { layerYears } = await import(`${W}/lib/mapa/dataRange.ts`)
const { featureEntries, labelFieldOf } = await import(`${W}/lib/territorios/featureIds.ts`)
const config = JSON.parse(readFileSync('config/mapa/layers.json', 'utf-8'))
const muni = config.layers.find((l: any) => l.id === 'municipios')
const geo = JSON.parse(readFileSync(`public${muni.url}`, 'utf-8'))
const entries = featureEntries(geo.features, { labelField: labelFieldOf(muni)!, layerName: muni.name })
await initGee(); const ee = getEe()
const fc = ee.FeatureCollection(entries.map((e: any) => ee.Feature(ee.Geometry(e.geometry), { i: e.index })))
const band = (asset: any, key: string) => {
  const name = `y${key}`
  if (key === 'static') return buildEeImage(ee, asset).rename(name)
  const image = buildEeImage(ee, asset, `${key}-01-01`).rename(name)
  if (asset.type !== 'imageCollection' || asset.bandPattern) return image
  const [from, to] = yearWindow(Number(key))
  return ee.Image(ee.Algorithms.If(ee.ImageCollection(asset.id).filterDate(from, to).size().gt(0), image,
    ee.Image.constant(0).updateMask(0).rename(name)))
}
const scaleM = Number(process.argv[2] ?? 1000)
for (const id of (process.env.PROBE_LAYERS ?? 'estoque_carbono,chirps_precip,solo_carbono').split(',')) {
  const layer = config.layers.find((l: any) => l.id === id)
  const keys = layer.gee.temporal ? layerYears(layer.gee.temporal) : ['static']
  const bands = keys.map((k: string) => `y${k}`)
  const image = ee.Image.cat(keys.map((k: string) => band(layer.gee.asset, k)))
  const reducer = bands.length === 1 ? ee.Reducer.mean().setOutputs(bands) : ee.Reducer.mean()
  const reduced = image.reduceRegions({ collection: fc, reducer, scale: Math.max(layer.gee.asset.scale ?? 500, scaleM), tileScale: 4 })
  const t0 = Date.now()
  const out: any = await new Promise((res) => reduced.select(['i', ...bands], null, false)
    .evaluate((v: any, e: any) => res(e ? { error: String(e) } : v)))
  const secs = ((Date.now() - t0) / 1000).toFixed(1)
  if (out.error) { console.log(id, `FAILED after ${secs} s:`, out.error.slice(0, 200)); continue }
  const feats = out.features ?? []
  const missing = feats.filter((f: any) => bands.some((b: string) => typeof f.properties?.[b] !== 'number')).length
  console.log(id, `${keys.length} key(s), ${feats.length} features, ${secs} s at ${Math.max(layer.gee.asset.scale ?? 500, scaleM)} m;`,
    `features with a missing/null band: ${missing};`, 'sample props:', JSON.stringify(feats[0]?.properties).slice(0, 160),
    'geometry dropped:', feats[0]?.geometry == null)
}
process.exit(0)
EOF
```

- [ ] **Step 2: Run it at 1000 m**

Run: `cd $W && TSX_TSCONFIG_PATH=$G/tsconfig.json timeout 600 npx tsx ../gee-probe/choropleth.mts 1000`
Expected: one line per layer with `1095`-ish features, `geometry dropped: true`, `sample props` holding `i` and `y<key>` names (`ystatic` for `estoque_carbono` — proving `setOutputs`), and a time. Record each time.

- [ ] **Step 3: Decide the scale**

- Every time under ~30 s → `CHOROPLETH_MIN_SCALE_M = 1000`.
- Otherwise rerun with `2000` (and `5000` if needed) and pick the finest value under ~30 s; ledger it as `Task 1: Ruling: CHOROPLETH_MIN_SCALE_M = <v> — <times>`.
- If a feature with a null band shows the property **absent** rather than `null`, that is what `parseChoropleth` already expects (missing → null). If `select` errors on a missing property, ledger it and change `parseChoropleth`'s read to `reduced` without `select`, mapping `ee.Feature(null, f.toDictionary())` instead.

- [ ] **Step 4: Ledger and clean up**

Write the times, the chosen scale and the naming/null findings to the ledger; `rm -rf $W/../gee-probe`. Nothing is committed in this task.

---

### Task 2: Remove the per-feature implementation

**Files:**
- Delete: `app/api/gee/scale/route.ts`, `lib/mapa/activeRaster.ts`, `lib/mapa/presentClasses.ts`, `lib/mapa/recorteScaleRunner.ts`, `lib/mapa/recorteScaleService.ts`, `tests/app/scaleRoute.test.ts`, `tests/lib/activeRaster.test.ts`, `tests/lib/presentClasses.test.ts`, `tests/lib/recorteScaleRunner.test.ts`, `tests/lib/recorteScaleService.test.ts`
- Restore to the merge base: `components/mapa/MapView.tsx`, `components/mapa/overlays/FloatingLegend.tsx`, `lib/mapa/store.ts`, `lib/mapa/tileCache.ts`, `lib/mapa/recorteRegistry.ts`, `tests/lib/recorteRegistry.test.ts`, `types/mapa.ts`, `CLAUDE.md`
- Keep for now: `lib/mapa/recorteScale.ts`, `lib/mapa/recorteScaleCompute.ts` and their tests (Task 4 replaces them), `lib/mapa/geeImage.ts` (`yearWindow`), the docs.

**Interfaces:**
- Produces: a branch whose app behaves exactly as `main`, plus `yearWindow`. Later tasks edit the merge-base versions of MapView, FloatingLegend, store, types and the registry.

- [ ] **Step 1: Remove and restore**

```bash
cd $W
git rm -q app/api/gee/scale/route.ts lib/mapa/activeRaster.ts lib/mapa/presentClasses.ts \
  lib/mapa/recorteScaleRunner.ts lib/mapa/recorteScaleService.ts tests/app/scaleRoute.test.ts \
  tests/lib/activeRaster.test.ts tests/lib/presentClasses.test.ts tests/lib/recorteScaleRunner.test.ts \
  tests/lib/recorteScaleService.test.ts
git checkout 579a5f9 -- components/mapa/MapView.tsx components/mapa/overlays/FloatingLegend.tsx \
  lib/mapa/store.ts lib/mapa/tileCache.ts lib/mapa/recorteRegistry.ts tests/lib/recorteRegistry.test.ts \
  types/mapa.ts CLAUDE.md
git diff --stat 579a5f9 -- . ':!docs'
```

Expected: the stat lists only `lib/mapa/geeImage.ts`, `lib/mapa/recorteScale.ts`, `lib/mapa/recorteScaleCompute.ts`, `tests/lib/recorteScale.test.ts`, `tests/lib/recorteScaleCompute.test.ts`.

- [ ] **Step 2: Verify**

Run: `cd $W && npm test 2>&1 | grep -E "Test Files|Tests  |FAIL"; npx tsc --noEmit 2>&1 | grep -oE "^[^(]+\(" | sort | uniq -c; npm run lint 2>&1 | grep "✖"`
Expected: all test files pass; `tsc` lists only the 4 baseline files; lint `✖ 5 problems (3 errors, 2 warnings)`.

- [ ] **Step 3: Commit**

```bash
git commit -q -m "refactor: remove the per-feature recorte scale

The user rejected re-scaling each raster to the selected feature: the scale
follows the finest active recorte layer instead, drawn as a map by feature
(docs/superpowers/specs/2026-10-21-recorte-choropleth-design.md). The app is
back to main's behavior; yearWindow and the reduction helpers stay for reuse."
```

---

### Task 3: The pure choropleth module

**Files:**
- Create: `lib/mapa/choropleth.ts`
- Modify: `types/mapa.ts` (`VectorLayerConfig`, after `pickPriority?: number`)
- Test: `tests/lib/choropleth.test.ts`

**Interfaces:**
- Consumes: `LayerConfig`, `RasterLayerConfig`, `VectorLayerConfig` (`types/mapa.ts`).
- Produces (exact names later tasks import):
  - `const STATIC_KEY = 'static'`; `bandOf(key: string): string`; `roundValue(v: number): number`
  - `interface ChoroplethRange { min: number; max: number }`
  - `interface ChoroplethResponse { keys: string[]; values: (number | null)[][]; range: ChoroplethRange | null }`
  - `type ChoroplethEntry = { status: 'loading' } | ({ status: 'ready' } & ChoroplethResponse) | { status: 'error' }`
  - `choroplethKey(layerId: string, recorteId: string): string`
  - `isChoroplethLayer(layer: LayerConfig): layer is RasterLayerConfig`
  - `choroplethRecorte(layers: LayerConfig[], layer: LayerConfig): VectorLayerConfig | null`
  - `choroplethRange(layer: RangeLayer, values: (number | null)[][]): ChoroplethRange | null`
  - `choroplethColor(palette: string[], range: ChoroplethRange, stateKey: string): ExpressionSpecification`
  - `interface ChoroplethView { recorte: VectorLayerConfig; caption: string; palette: string[]; range: ChoroplethRange; values: (number | null)[] }`
  - `choroplethView(layers, layer, choropleths, temporalDate?): ChoroplethView | null`
  - `choroplethPending(layers, layer, choropleths): string | null` (the caption)
  - `withoutChoroplethErrors(choropleths, recorteId): Record<string, ChoroplethEntry>`
  - `VectorLayerConfig.choropleth?: { caption: string }`

- [ ] **Step 1: Declare the config field**

In `types/mapa.ts`, after the `pickPriority?: number` line of `VectorLayerConfig`:

```ts
  // A recorte that covers the biome and can draw the continuous layers by
  // feature: each feature filled with its mean value (lib/mapa/choropleth.ts).
  // The finest one on (highest pickPriority) wins. `caption` names the scale
  // under the layer in the legend ("Escala municipal").
  choropleth?: { caption: string }
```

- [ ] **Step 2: Write the failing test**

`tests/lib/choropleth.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  bandOf,
  choroplethColor,
  choroplethKey,
  choroplethPending,
  choroplethRange,
  choroplethRecorte,
  choroplethView,
  roundValue,
  STATIC_KEY,
  withoutChoroplethErrors,
  type ChoroplethEntry,
} from '@/lib/mapa/choropleth'
import type { LayerConfig, RasterLayerConfig, VectorLayerConfig } from '@/types/mapa'

const raster = (id: string, over: Partial<RasterLayerConfig> = {}): RasterLayerConfig => ({
  id, name: id, type: 'raster', visible: true, opacity: 80,
  colorType: 'continuous', source: 'gee', clipToLayerId: 'bioma',
  gee: { asset: { type: 'image', id: `projects/x/${id}` }, visParams: { min: 0, max: 100, palette: ['#000000', '#ffffff'] } },
  ...over,
})
const vector = (id: string, pickPriority: number, over: Partial<VectorLayerConfig> = {}): VectorLayerConfig => ({
  id, name: id, type: 'vector', url: `/data/vector/${id}.geojson`, visible: true, opacity: 80, color: '#000', pickPriority, ...over,
})
const estados = vector('estados', 10, { choropleth: { caption: 'Escala estadual' } })
const municipios = vector('municipios', 20, { choropleth: { caption: 'Escala municipal' } })
const tis = vector('terras_indigenas', 30)
const estoque = raster('estoque')

describe('choroplethRecorte', () => {
  it('draws a continuous raster by the finest choropleth recorte on', () => {
    expect(choroplethRecorte([municipios, estados, estoque], estoque)?.id).toBe('municipios')
    expect(choroplethRecorte([{ ...municipios, visible: false }, estados, estoque], estoque)?.id).toBe('estados')
  })

  it('ignores territories, which only partly cover the biome', () => {
    expect(choroplethRecorte([tis, estados, estoque], estoque)?.id).toBe('estados')
    expect(choroplethRecorte([tis, estoque], estoque)).toBeNull()
  })

  it('leaves categorical, relief, rendering-only and hidden rasters in pixels', () => {
    const layers: LayerConfig[] = [municipios]
    expect(choroplethRecorte(layers, raster('lulc', { colorType: 'categorical' }))).toBeNull()
    expect(choroplethRecorte(layers, raster('relevo', { source: 'dem' }))).toBeNull()
    expect(choroplethRecorte(layers, raster('hillshade', { analysis: false }))).toBeNull()
    expect(choroplethRecorte(layers, raster('off', { visible: false }))).toBeNull()
  })
})

describe('choroplethRange', () => {
  it('runs from the lowest to the highest value over every year and feature', () => {
    expect(choroplethRange(estoque, [[10, null, 40], [5, 30, null]])).toEqual({ min: 5, max: 40 })
  })

  it('is null without a finite value or with no spread', () => {
    expect(choroplethRange(estoque, [[null, null]])).toBeNull()
    expect(choroplethRange(estoque, [[7, 7]])).toBeNull()
  })

  it("keeps a signed flux's zero where the palette puts its white", () => {
    const netFlux = { signedFlux: true, gee: { visParams: { min: -100, max: 300 } } }
    // k = max(-20 / -100, 30 / 300) = 0.2
    const range = choroplethRange(netFlux, [[-20, 30]])!
    expect(range.min).toBeCloseTo(-20)
    expect(range.max).toBeCloseTo(60)
    // A feature set that only emits keeps zero on the bar: k = max(5 / -100, 150 / 300) = 0.5
    expect(choroplethRange(netFlux, [[5, 150]])!.min).toBeCloseTo(-50)
  })
})

describe('choroplethColor', () => {
  it('spreads the palette evenly over the range and leaves a feature without a value unfilled', () => {
    expect(choroplethColor(['#000000', '#808080', '#ffffff'], { min: 10, max: 30 }, 'v_estoque')).toEqual([
      'case',
      ['==', ['typeof', ['feature-state', 'v_estoque']], 'number'],
      ['interpolate', ['linear'], ['feature-state', 'v_estoque'], 10, '#000000', 20, '#808080', 30, '#ffffff'],
      'rgba(0, 0, 0, 0)',
    ])
  })
})

describe('choroplethView', () => {
  const ready = (values: (number | null)[][], keys = [STATIC_KEY]): ChoroplethEntry =>
    ({ status: 'ready', keys, values, range: { min: 0, max: 50 } })

  it("hands MapView and the legend the year on screen's values", () => {
    const gpp = raster('gpp')
    const view = choroplethView([municipios, gpp], gpp, {
      [choroplethKey('gpp', 'municipios')]: ready([[1, 2], [3, 4]], ['2010', '2024']),
    }, '2024-01-01')
    expect(view).toMatchObject({ caption: 'Escala municipal', range: { min: 0, max: 50 }, values: [3, 4] })
    expect(view?.recorte.id).toBe('municipios')
    expect(view?.palette).toEqual(['#000000', '#ffffff'])
  })

  it('reads a static layer under the static key', () => {
    expect(choroplethView([estados, estoque], estoque, { [choroplethKey('estoque', 'estados')]: ready([[9]]) })?.values)
      .toEqual([9])
  })

  it('keeps the pixels while loading, after an error, without a range or without the year', () => {
    const key = choroplethKey('estoque', 'municipios')
    const layers = [municipios, estoque]
    expect(choroplethView(layers, estoque, {})).toBeNull()
    expect(choroplethView(layers, estoque, { [key]: { status: 'loading' } })).toBeNull()
    expect(choroplethView(layers, estoque, { [key]: { status: 'error' } })).toBeNull()
    expect(choroplethView(layers, estoque, { [key]: { status: 'ready', keys: [STATIC_KEY], values: [[1]], range: null } })).toBeNull()
    const gpp = raster('gpp')
    expect(choroplethView([municipios, gpp], gpp,
      { [choroplethKey('gpp', 'municipios')]: ready([[1]], ['2010']) }, '2024-01-01')).toBeNull()
  })

  it("never shows another recorte's values", () => {
    expect(choroplethView([municipios, estoque], estoque, { [choroplethKey('estoque', 'estados')]: ready([[9]]) }))
      .toBeNull()
  })
})

describe('choroplethPending', () => {
  it('names the scale being computed, from the moment the recorte is on', () => {
    const key = choroplethKey('estoque', 'municipios')
    expect(choroplethPending([municipios, estoque], estoque, {})).toBe('Escala municipal')
    expect(choroplethPending([municipios, estoque], estoque, { [key]: { status: 'loading' } })).toBe('Escala municipal')
  })

  it('names nothing once answered, failed, or without a recorte', () => {
    const key = choroplethKey('estoque', 'municipios')
    expect(choroplethPending([municipios, estoque], estoque, { [key]: { status: 'error' } })).toBeNull()
    expect(choroplethPending([municipios, estoque], estoque,
      { [key]: { status: 'ready', keys: [STATIC_KEY], values: [[1]], range: null } })).toBeNull()
    expect(choroplethPending([estoque], estoque, {})).toBeNull()
  })
})

describe('withoutChoroplethErrors', () => {
  it("drops one recorte's failures, so turning it on again retries", () => {
    const entries: Record<string, ChoroplethEntry> = {
      [choroplethKey('a', 'municipios')]: { status: 'error' },
      [choroplethKey('b', 'municipios')]: { status: 'loading' },
      [choroplethKey('a', 'estados')]: { status: 'error' },
    }
    expect(withoutChoroplethErrors(entries, 'municipios')).toEqual({
      [choroplethKey('b', 'municipios')]: { status: 'loading' },
      [choroplethKey('a', 'estados')]: { status: 'error' },
    })
  })
})

describe('helpers', () => {
  it('rounds to four significant digits', () => {
    expect(roundValue(123.456789)).toBe(123.5)
    expect(roundValue(0.000123456)).toBe(0.0001235)
  })

  it('names a band so a year is never a bare number', () => {
    expect(bandOf('2010')).toBe('y2010')
    expect(bandOf(STATIC_KEY)).toBe('ystatic')
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd $W && npx vitest run tests/lib/choropleth.test.ts`
Expected: FAIL — cannot resolve `@/lib/mapa/choropleth`.

- [ ] **Step 4: Write the module**

`lib/mapa/choropleth.ts`:

```ts
// A continuous raster drawn by feature of the finest recorte on (Municípios
// over Estados): each feature filled with its mean value, on a legend running
// from the lowest to the highest feature value. Pure and shared: the server
// builds the values (/api/gee/choropleth); MapView and the legend read them
// through the same rules here, so the legend never describes colors the map
// is not showing.

import type { ExpressionSpecification } from 'maplibre-gl'
import type { LayerConfig, RasterLayerConfig, VectorLayerConfig } from '@/types/mapa'

/** The single "year" of a static layer. */
export const STATIC_KEY = 'static'

export interface ChoroplethRange { min: number; max: number }

export interface ChoroplethResponse {
  /** Years "YYYY" of a temporal layer, or [STATIC_KEY]. */
  keys:   string[]
  /** values[k][featureIndex]: the feature's mean in keys[k]; null where it had none. */
  values: (number | null)[][]
  /** Lowest to highest value over every key and feature; null keeps the pixels. */
  range:  ChoroplethRange | null
}

export type ChoroplethEntry =
  | { status: 'loading' }
  | ({ status: 'ready' } & ChoroplethResponse)
  | { status: 'error' }

export function choroplethKey(layerId: string, recorteId: string): string {
  return `${layerId}|${recorteId}`
}

/** Band name of a year in the stacked image; a band name cannot start with a digit. */
export function bandOf(key: string): string {
  return `y${key}`
}

/** Four significant digits: plenty for a color, and a fraction of the payload. */
export function roundValue(v: number): number {
  return Number(v.toPrecision(4))
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** A raster that can be drawn by feature: continuous, from Earth Engine, a quantity rather than a rendering. */
export function isChoroplethLayer(layer: LayerConfig): layer is RasterLayerConfig {
  return layer.type === 'raster'
    && layer.colorType === 'continuous'
    && layer.source === 'gee'
    && !!layer.gee?.asset
    && layer.analysis !== false
}

/**
 * The recorte a visible raster is drawn by: the visible vector declaring
 * `choropleth` with the highest pickPriority. Territories declare none: they
 * cover parts of the biome only.
 */
export function choroplethRecorte(layers: LayerConfig[], layer: LayerConfig): VectorLayerConfig | null {
  if (!layer.visible || !isChoroplethLayer(layer)) return null
  let finest: VectorLayerConfig | null = null
  for (const candidate of layers) {
    if (candidate.type !== 'vector' || !candidate.visible || !candidate.choropleth) continue
    if (!finest || (candidate.pickPriority ?? 0) > (finest.pickPriority ?? 0)) finest = candidate
  }
  return finest
}

interface RangeLayer {
  signedFlux?: boolean
  gee?: { visParams?: { min?: number; max?: number } }
}

/**
 * Lowest to highest value over every year and feature, so a color means the
 * same value in every year. A signed flux's palette puts its white where zero
 * falls on the biome scale (a quarter of the way on -100..300): both biome ends
 * scaled by one factor keep zero there, and on the bar even when every feature
 * only emits or only removes.
 */
export function choroplethRange(layer: RangeLayer, values: (number | null)[][]): ChoroplethRange | null {
  let low = Infinity
  let high = -Infinity
  for (const row of values) {
    for (const v of row) {
      if (!finite(v)) continue
      if (v < low) low = v
      if (v > high) high = v
    }
  }
  if (!(low < high)) return null

  const min = layer.gee?.visParams?.min
  const max = layer.gee?.visParams?.max
  if (layer.signedFlux && finite(min) && finite(max) && min < 0 && max > 0) {
    const k = Math.max(low / min, high / max)
    return { min: min * k, max: max * k }
  }
  return { min: low, max: high }
}

/**
 * Fill color for a feature-state value: the palette's colors spread evenly
 * from range.min to range.max, as the raster stretches them. A feature without
 * a value gets no fill rather than the palette's first color.
 */
export function choroplethColor(palette: string[], range: ChoroplethRange, stateKey: string): ExpressionSpecification {
  const value: ExpressionSpecification = ['feature-state', stateKey]
  const step = palette.length > 1 ? (range.max - range.min) / (palette.length - 1) : 0
  const stops = palette.flatMap((color, i) => [range.min + step * i, color])
  return [
    'case',
    ['==', ['typeof', value], 'number'],
    ['interpolate', ['linear'], value, ...stops] as unknown as ExpressionSpecification,
    'rgba(0, 0, 0, 0)',
  ]
}

export interface ChoroplethView {
  recorte: VectorLayerConfig
  caption: string
  palette: string[]
  range:   ChoroplethRange
  /** The year on screen's values, by feature index. */
  values:  (number | null)[]
}

/** What a raster shows by feature right now; null when it shows its pixels. */
export function choroplethView(
  layers: LayerConfig[],
  layer: LayerConfig,
  choropleths: Record<string, ChoroplethEntry>,
  temporalDate?: string,
): ChoroplethView | null {
  const recorte = choroplethRecorte(layers, layer)
  const palette = layer.type === 'raster' ? layer.gee?.visParams?.palette : undefined
  if (!recorte?.choropleth || !palette || palette.length < 2) return null

  const entry = choropleths[choroplethKey(layer.id, recorte.id)]
  if (entry?.status !== 'ready' || !entry.range) return null
  const k = entry.keys.indexOf(temporalDate ? temporalDate.slice(0, 4) : STATIC_KEY)
  if (k < 0) return null

  return { recorte, caption: recorte.choropleth.caption, palette, range: entry.range, values: entry.values[k] }
}

/** The caption of a scale still being computed for this raster, from the moment its recorte is on. */
export function choroplethPending(
  layers: LayerConfig[],
  layer: LayerConfig,
  choropleths: Record<string, ChoroplethEntry>,
): string | null {
  const recorte = choroplethRecorte(layers, layer)
  if (!recorte?.choropleth) return null
  const entry = choropleths[choroplethKey(layer.id, recorte.id)]
  return !entry || entry.status === 'loading' ? recorte.choropleth.caption : null
}

/** Drop one recorte's failures, so turning it on again asks again. */
export function withoutChoroplethErrors(
  choropleths: Record<string, ChoroplethEntry>,
  recorteId: string,
): Record<string, ChoroplethEntry> {
  const suffix = `|${recorteId}`
  return Object.fromEntries(Object.entries(choropleths)
    .filter(([key, entry]) => !(key.endsWith(suffix) && entry.status === 'error')))
}
```

- [ ] **Step 5: Run the test, then the type check**

Run: `cd $W && npx vitest run tests/lib/choropleth.test.ts && npx tsc --noEmit 2>&1 | grep -oE "^[^(]+\(" | sort | uniq -c`
Expected: PASS (16 tests); `tsc` lists only the 4 baseline files. If `tsc` rejects the `interpolate` spread typing, keep the cast shown (MapLibre's tuple types do not model variadic stops).

- [ ] **Step 6: Commit**

```bash
cd $W && git add lib/mapa/choropleth.ts tests/lib/choropleth.test.ts types/mapa.ts
git commit -q -m "feat: rules for drawing a continuous layer by feature of the finest recorte"
```

---

### Task 4: The Earth Engine reduction

**Files:**
- Create: `lib/mapa/choroplethCompute.ts`, `tests/lib/choroplethCompute.test.ts`
- Delete: `lib/mapa/recorteScaleCompute.ts`, `lib/mapa/recorteScale.ts`, `tests/lib/recorteScaleCompute.test.ts`, `tests/lib/recorteScale.test.ts`
- Modify: `docs/superpowers/specs/2026-10-21-recorte-choropleth-design.md` §4.2 step 4 (the compact read, see Step 5)

**Interfaces:**
- Consumes: `buildEeImage`, `yearWindow`, `GeeAssetConfig` (`lib/mapa/geeImage.ts`); `evaluate` (`lib/mapa/geeEvaluate.ts`); `bandOf`, `roundValue`, `STATIC_KEY` (Task 3); `CHOROPLETH_MIN_SCALE_M` value from Task 1.
- Produces:
  - `const CHOROPLETH_MIN_SCALE_M: number`
  - `interface ChoroplethFeature { index: number; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown } }`
  - `reduceChoropleth(ee: any, asset: GeeAssetConfig, keys: string[], features: ChoroplethFeature[]): Promise<(number | null)[][]>`
  - `parseChoropleth(out: unknown, keys: string[], features: ChoroplethFeature[]): (number | null)[][]`

- [ ] **Step 1: Write the failing test**

`tests/lib/choroplethCompute.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  evaluate: vi.fn<(obj: unknown) => Promise<unknown>>(),
  buildEeImage: vi.fn((_ee: unknown, _asset: unknown, date?: string) => ({
    rename: (name: string) => ({ name, date }),
  })),
}))

vi.mock('@/lib/mapa/geeEvaluate', () => ({ evaluate: mocks.evaluate, GEE_TIMEOUT_MS: 1000 }))
vi.mock('@/lib/mapa/geeImage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/geeImage')>(),
  buildEeImage: mocks.buildEeImage,
}))

import { CHOROPLETH_MIN_SCALE_M, parseChoropleth, reduceChoropleth } from '@/lib/mapa/choroplethCompute'
import { STATIC_KEY } from '@/lib/mapa/choropleth'

/** Just enough of `ee` to record what the reduction is built from. */
function fakeEe() {
  const reduceRegions = vi.fn((args: unknown) => ({ reduced: args, select: vi.fn((...a: unknown[]) => ({ selected: a })) }))
  const cat = vi.fn((bands: unknown[]) => ({ bands, reduceRegions }))
  const setOutputs = vi.fn((names: string[]) => ({ mean: true, outputs: names }))
  const filterDate = vi.fn((from: string, to: string) => ({
    size: () => ({ gt: (n: number) => ({ imagesIn: [from, to], moreThan: n }) }),
  }))
  const ee = {
    Image: Object.assign((image: unknown) => image, {
      cat,
      constant: (value: number) => ({
        updateMask: (mask: number) => ({ rename: (name: string) => ({ constant: value, masked: mask === 0, name }) }),
      }),
    }),
    ImageCollection: (id: string) => ({ id, filterDate }),
    Algorithms: { If: (c: unknown, a: unknown, b: unknown) => ({ if: c, then: a, else: b }) },
    FeatureCollection: (features: unknown[]) => ({ features }),
    Feature: (geometry: unknown, props: unknown) => ({ geometry, props }),
    Geometry: (g: unknown) => ({ geometry: g }),
    Reducer: { mean: () => ({ mean: true, setOutputs }) },
  }
  return { ee, cat, reduceRegions, setOutputs, filterDate }
}

const polygon = { type: 'Polygon' as const, coordinates: [[[-40, -8], [-40, -7], [-39, -7], [-40, -8]]] }
const features = [{ index: 0, geometry: polygon }, { index: 2, geometry: polygon }]
const collection = { type: 'imageCollection' as const, id: 'projects/x/chirps', band: 'precipitation', scale: 5566 }
const image = { type: 'image' as const, id: 'projects/x/stock', band: 'b1', scale: 100 }

describe('reduceChoropleth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reduces the mean of every year over every feature, tagged with its file position', async () => {
    mocks.evaluate.mockResolvedValueOnce({ features: [] })
    const { ee, reduceRegions } = fakeEe()

    await reduceChoropleth(ee, collection, ['2010', '2020'], features)

    const args = reduceRegions.mock.calls[0][0] as Record<string, unknown>
    expect(args).toMatchObject({ reducer: { mean: true }, scale: 5566, tileScale: 4 })
    expect(args.collection).toEqual({ features: [
      { geometry: { geometry: polygon }, props: { i: 0 } },
      { geometry: { geometry: polygon }, props: { i: 2 } },
    ] })
  })

  it('reads at least at the minimum scale, coarser than a 100 m layer', async () => {
    mocks.evaluate.mockResolvedValueOnce({ features: [] })
    const { ee, reduceRegions } = fakeEe()

    await reduceChoropleth(ee, image, [STATIC_KEY], features)

    expect(reduceRegions.mock.calls[0][0]).toMatchObject({ scale: CHOROPLETH_MIN_SCALE_M })
  })

  it("names a single band's output after the band, not after the reducer", async () => {
    mocks.evaluate.mockResolvedValueOnce({ features: [] })
    const { ee, setOutputs } = fakeEe()

    await reduceChoropleth(ee, image, [STATIC_KEY], features)

    expect(setOutputs).toHaveBeenCalledWith(['ystatic'])
  })

  it("turns a collection's year without images into a masked band", async () => {
    mocks.evaluate.mockResolvedValueOnce({ features: [] })
    const { ee, cat } = fakeEe()

    await reduceChoropleth(ee, collection, ['2010', '2030'], features)

    expect(cat.mock.calls[0][0][1]).toEqual({
      if: { imagesIn: ['2030-01-01', '2031-01-01'], moreThan: 0 },
      then: { name: 'y2030', date: '2030-01-01' },
      else: { constant: 0, masked: true, name: 'y2030' },
    })
  })
})

describe('parseChoropleth', () => {
  it('lays the values out by year and feature index, rounded, null where missing', () => {
    const out = { features: [
      { properties: { i: 2, y2010: 12.34567, y2020: null } },
      { properties: { i: 0, y2010: 1 } },
    ] }

    expect(parseChoropleth(out, ['2010', '2020'], features)).toEqual([
      [1, null, 12.35],
      [null, null, null],
    ])
  })

  it('answers every feature with null when Earth Engine returned nothing', () => {
    expect(parseChoropleth(null, [STATIC_KEY], features)).toEqual([[null, null, null]])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd $W && npx vitest run tests/lib/choroplethCompute.test.ts`
Expected: FAIL — cannot resolve `@/lib/mapa/choroplethCompute`.

- [ ] **Step 3: Write the module**

`lib/mapa/choroplethCompute.ts` (use the scale Task 1 chose for `CHOROPLETH_MIN_SCALE_M`):

```ts
// The one Earth Engine reduction behind /api/gee/choropleth: the mean of every
// year of a layer over every feature of a recorte, in a single evaluate. Each
// year comes from buildEeImage, so the values are in the units the map shows.

import 'server-only'

import { buildEeImage, yearWindow, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import { bandOf, roundValue, STATIC_KEY } from '@/lib/mapa/choropleth'

/**
 * The finest scale the means are read at. Plenty to color a municipality, and
 * what keeps every municipality times up to 40 years inside GEE_TIMEOUT_MS
 * (measured against CHIRPS and solo_carbono over Municípios, see the plan).
 */
export const CHOROPLETH_MIN_SCALE_M = 1000

export interface ChoroplethFeature {
  /** Position in the recorte GeoJSON: the id MapLibre's generateId gives the feature. */
  index:    number
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }
}

export async function reduceChoropleth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ee: any,
  asset: GeeAssetConfig,
  keys: string[],
  features: ChoroplethFeature[],
): Promise<(number | null)[][]> {
  const bands = keys.map(bandOf)
  const image = ee.Image.cat(keys.map((key) => yearBand(ee, asset, key)))
  const collection = ee.FeatureCollection(
    features.map((f) => ee.Feature(ee.Geometry(f.geometry), { i: f.index })))
  // A single-band image names its output after the reducer ("mean"); a stack
  // names one per band.
  const reducer = bands.length === 1 ? ee.Reducer.mean().setOutputs(bands) : ee.Reducer.mean()

  const reduced = image.reduceRegions({
    collection,
    reducer,
    scale:     Math.max(asset.scale ?? 500, CHOROPLETH_MIN_SCALE_M),
    tileScale: 4,
  })
  // Properties only: the geometries already live in the browser. Read with
  // `select`, not a list reducer, which would skip a feature with any null year.
  return parseChoropleth(await evaluate(reduced.select(['i', ...bands], null, false)), keys, features)
}

/** values[k][featureIndex], rounded; null for a feature or year with no value. */
export function parseChoropleth(
  out: unknown,
  keys: string[],
  features: ChoroplethFeature[],
): (number | null)[][] {
  const size = features.reduce((n, f) => Math.max(n, f.index + 1), 0)
  const values = keys.map(() => new Array<number | null>(size).fill(null))
  const rows = (out as { features?: { properties?: Record<string, unknown> }[] } | null)?.features ?? []
  for (const row of rows) {
    const props = row.properties ?? {}
    const i = props.i
    if (typeof i !== 'number' || i < 0 || i >= size) continue
    keys.forEach((key, k) => {
      const v = props[bandOf(key)]
      values[k][i] = typeof v === 'number' && Number.isFinite(v) ? roundValue(v) : null
    })
  }
  return values
}

/**
 * One year's band. A collection's year with no images (a year declared before
 * Earth Engine publishes it) composites to an image with no bands, on which
 * buildEeImage's unit conversion already fails -- and one failing band fails
 * the whole reduction. Such a year is chosen by its image count and becomes a
 * fully masked band, answered with nulls. `ee.Algorithms.If` is lazy: the
 * failing branch is never computed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function yearBand(ee: any, asset: GeeAssetConfig, key: string): any {
  const band = bandOf(key)
  if (key === STATIC_KEY) return buildEeImage(ee, asset).rename(band)

  const image = buildEeImage(ee, asset, `${key}-01-01`).rename(band)
  // A band-per-year image has a band for every declared year.
  if (asset.type !== 'imageCollection' || asset.bandPattern) return image

  const [from, to] = yearWindow(Number(key))
  const hasImages = ee.ImageCollection(asset.id).filterDate(from, to).size().gt(0)
  return ee.Image(ee.Algorithms.If(hasImages, image, ee.Image.constant(0).updateMask(0).rename(band)))
}
```

- [ ] **Step 4: Remove the per-feature reduction and run**

```bash
cd $W && git rm -q lib/mapa/recorteScaleCompute.ts lib/mapa/recorteScale.ts tests/lib/recorteScaleCompute.test.ts tests/lib/recorteScale.test.ts
npx vitest run tests/lib/choroplethCompute.test.ts tests/lib/choropleth.test.ts
```

Expected: PASS (6 + 16 tests).

- [ ] **Step 5: Align the spec's compact read**

In `docs/superpowers/specs/2026-10-21-recorte-choropleth-design.md` §4.2, replace step 4 with:

```markdown
4. **Compact read.** `reduced.select(['i', ...bands], null, false)` — the properties without the
   geometries. Not a `reduceColumns(toList)`: list reducers skip null inputs, which would drop a
   feature with any empty year.
```

- [ ] **Step 6: Commit**

```bash
cd $W && git add lib/mapa/choroplethCompute.ts tests/lib/choroplethCompute.test.ts docs/superpowers/specs/2026-10-21-recorte-choropleth-design.md
git commit -q -m "feat: one Earth Engine reduction for the map by feature"
```

---

### Task 5: Config, service and route

**Files:**
- Modify: `config/mapa/layers.json` (estados ~line 36, municipios ~line 51), `lib/mapa/recorteRegistry.ts` (`IndexedFeicao`, + `featureGeometries`), `CLAUDE.md` (section `### GEE routes`)
- Create: `lib/mapa/choroplethService.ts`, `app/api/gee/choropleth/route.ts`
- Test: `tests/lib/choroplethService.test.ts`, `tests/app/choroplethRoute.test.ts`, `tests/lib/recorteRegistry.test.ts` (append)

**Interfaces:**
- Consumes: Task 3 (`choroplethKey`, `choroplethRange`, `isChoroplethLayer`, `STATIC_KEY`, `ChoroplethResponse`); Task 4 (`reduceChoropleth`, `ChoroplethFeature`); `layerYears` (`lib/mapa/dataRange.ts`); `getEe`, `initGee` (`lib/mapa/geeAuth.ts`).
- Produces:
  - `featureGeometries(recorteId: string): ChoroplethFeature[] | null` (registry)
  - `getChoroplethLayer(layerId: string): RasterLayerConfig | null`
  - `isChoroplethRecorte(recorteId: string): boolean`
  - `cachedChoropleth(key: string): ChoroplethResponse | null`
  - `computeChoropleth(key: string, layer: RasterLayerConfig, recorteId: string): Promise<ChoroplethResponse>`
  - `POST /api/gee/choropleth` `{ layerId, recorteId }` → `ChoroplethResponse`

- [ ] **Step 1: Flag the recortes**

In `config/mapa/layers.json`, in the `estados` block replace

```json
      "pickPriority": 10,
```

with

```json
      "pickPriority": 10,
      "choropleth": { "caption": "Escala estadual" },
```

and in the `municipios` block replace `"pickPriority": 20,` with

```json
      "pickPriority": 20,
      "choropleth": { "caption": "Escala municipal" },
```

Run: `cd $W && node -e 'const c=require("./config/mapa/layers.json"); console.log(c.layers.filter(l=>l.choropleth).map(l=>l.id+":"+l.choropleth.caption).join(", "))'`
Expected: `estados:Escala estadual, municipios:Escala municipal`.

- [ ] **Step 2: Write the failing tests**

Append to `tests/lib/recorteRegistry.test.ts` (and add `featureGeometries` to its import from `@/lib/mapa/recorteRegistry`):

```ts
describe('featureGeometries', () => {
  it('lists every labelled feature with its file position, the id MapLibre generates', () => {
    const states = featureGeometries('estados')!
    // Bahia is the second feature of estados.geojson.
    expect(states.map((f) => f.index)).toContain(1)
    expect(states.find((f) => f.index === 1)?.geometry.type).toMatch(/^(Polygon|MultiPolygon)$/)
    // The two São Domingos sit at file indices 174 and 691 (see listFeicoes).
    expect(featureGeometries('municipios')!.map((f) => f.index)).toEqual(expect.arrayContaining([174, 691]))
  })

  it('returns null for an unknown recorte', () => {
    expect(featureGeometries('nao-existe')).toBeNull()
  })
})
```

`tests/lib/choroplethService.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ reduce: vi.fn() }))

vi.mock('@/lib/mapa/geeAuth', () => ({ initGee: vi.fn(async () => {}), getEe: vi.fn(() => ({})) }))
vi.mock('@/lib/mapa/choroplethCompute', () => ({ reduceChoropleth: mocks.reduce }))

import {
  cachedChoropleth,
  computeChoropleth,
  getChoroplethLayer,
  isChoroplethRecorte,
} from '@/lib/mapa/choroplethService'
import { choroplethKey } from '@/lib/mapa/choropleth'

describe('allowlists', () => {
  it('accepts a continuous Earth Engine quantity', () => {
    expect(getChoroplethLayer('estoque_carbono')?.id).toBe('estoque_carbono')
    expect(getChoroplethLayer('gfw_netflux')?.id).toBe('gfw_netflux')
  })

  it('refuses a categorical layer, relief, a rendering, a vector and an unknown id', () => {
    expect(getChoroplethLayer('lulc_mapbiomas')).toBeNull()
    expect(getChoroplethLayer('sombreado_terreno')).toBeNull()
    expect(getChoroplethLayer('hillshade_fabdem')).toBeNull()
    expect(getChoroplethLayer('municipios')).toBeNull()
    expect(getChoroplethLayer('nao-existe')).toBeNull()
  })

  it('accepts only the recortes that declare choropleth', () => {
    expect(isChoroplethRecorte('municipios')).toBe(true)
    expect(isChoroplethRecorte('estados')).toBe(true)
    expect(isChoroplethRecorte('bioma')).toBe(false)
    expect(isChoroplethRecorte('terras_indigenas')).toBe(false)
  })
})

describe('computeChoropleth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reduces exactly the declared years of a series with gaps, over the recorte features', async () => {
    const layer = getChoroplethLayer('biomassa_esa_lenhosa')!
    mocks.reduce.mockResolvedValueOnce([[1, 2]])

    await computeChoropleth(choroplethKey(layer.id, 'estados'), layer, 'estados')

    expect(mocks.reduce.mock.calls[0][2]).toEqual(
      ['2007', '2010', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022'])
    expect(mocks.reduce.mock.calls[0][3].length).toBe(9)
  })

  it('answers the keys, the values and their range', async () => {
    const layer = getChoroplethLayer('estoque_carbono')!
    mocks.reduce.mockResolvedValueOnce([[10, null, 40]])

    await expect(computeChoropleth(choroplethKey(layer.id, 'estados'), layer, 'estados')).resolves.toEqual({
      keys: ['static'], values: [[10, null, 40]], range: { min: 10, max: 40 },
    })
  })

  it('caches the answer and shares a computation already running', async () => {
    const layer = getChoroplethLayer('altura_dossel')!
    const key = choroplethKey(layer.id, 'estados')
    mocks.reduce.mockResolvedValueOnce([[1, 2]])

    const [a, b] = await Promise.all([computeChoropleth(key, layer, 'estados'), computeChoropleth(key, layer, 'estados')])
    await computeChoropleth(key, layer, 'estados')

    expect(a).toEqual(b)
    expect(cachedChoropleth(key)).toEqual(a)
    expect(mocks.reduce).toHaveBeenCalledOnce()
  })

  it('does not cache a failure', async () => {
    const layer = getChoroplethLayer('biomassa_gedi')!
    const key = choroplethKey(layer.id, 'estados')
    mocks.reduce.mockRejectedValueOnce(new Error('timed out')).mockResolvedValueOnce([[1, 2]])

    await expect(computeChoropleth(key, layer, 'estados')).rejects.toThrow('timed out')
    expect(cachedChoropleth(key)).toBeNull()
    await expect(computeChoropleth(key, layer, 'estados')).resolves.toMatchObject({ range: { min: 1, max: 2 } })
    expect(mocks.reduce).toHaveBeenCalledTimes(2)
  })
})
```

`tests/app/choroplethRoute.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  reduce: vi.fn(),
  initGee: vi.fn(async () => {}),
  getAuthenticatedRequest: vi.fn<() => Promise<{ uid: string } | null>>(async () => ({ uid: 'test-user' })),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({ initGee: mocks.initGee, getEe: vi.fn(() => ({})) }))
vi.mock('@/lib/mapa/choroplethCompute', () => ({ reduceChoropleth: mocks.reduce }))
vi.mock('@/lib/auth', () => ({
  getAuthenticatedRequest: mocks.getAuthenticatedRequest,
  unauthorizedResponse: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}))

import { POST } from '@/app/api/gee/choropleth/route'

function request(body: unknown) {
  return new Request('http://localhost/api/gee/choropleth', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('POST /api/gee/choropleth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires an authenticated session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)

    const response = await POST(request({ layerId: 'estoque_carbono', recorteId: 'municipios' }))

    expect(response.status).toBe(401)
    expect(mocks.reduce).not.toHaveBeenCalled()
  })

  it.each([
    ['a categorical layer', { layerId: 'lulc_mapbiomas', recorteId: 'municipios' }],
    ['a relief layer', { layerId: 'sombreado_terreno', recorteId: 'municipios' }],
    ['a rendering-only layer', { layerId: 'hillshade_fabdem', recorteId: 'municipios' }],
    ['an unknown layer', { layerId: 'nao-existe', recorteId: 'municipios' }],
    ['the biome', { layerId: 'estoque_carbono', recorteId: 'bioma' }],
    ['a territory', { layerId: 'estoque_carbono', recorteId: 'terras_indigenas' }],
    ['a recorte id that is not text', { layerId: 'estoque_carbono', recorteId: 7 }],
  ])('rejects %s with 400', async (_, body) => {
    const response = await POST(request(body))

    expect(response.status).toBe(400)
    expect(mocks.reduce).not.toHaveBeenCalled()
  })

  it('answers the values, then serves them again from the cache without Earth Engine', async () => {
    mocks.reduce.mockResolvedValueOnce([[10, 40]])
    const body = { layerId: 'estoque_carbono', recorteId: 'municipios' }

    const first = await POST(request(body))
    const second = await POST(request(body))

    expect(first.status).toBe(200)
    await expect(first.json()).resolves.toEqual({ keys: ['static'], values: [[10, 40]], range: { min: 10, max: 40 } })
    expect(second.status).toBe(200)
    expect(mocks.reduce).toHaveBeenCalledOnce()
    expect(mocks.initGee).toHaveBeenCalledOnce()
  })

  it('answers 503 when Earth Engine cannot be reached', async () => {
    mocks.initGee.mockRejectedValueOnce(new Error('no credentials'))

    const response = await POST(request({ layerId: 'gpp_modis', recorteId: 'municipios' }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'Earth Engine unavailable' })
  })

  it('answers a generic 500 when the reduction fails', async () => {
    mocks.reduce.mockRejectedValueOnce(new Error('ee.evaluate timed out after 65000ms'))

    const response = await POST(request({ layerId: 'gfw_netflux', recorteId: 'municipios' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed to process Earth Engine request' })
  })
})
```

- [ ] **Step 3: Run them to verify they fail**

Run: `cd $W && npx vitest run tests/lib/recorteRegistry.test.ts tests/lib/choroplethService.test.ts tests/app/choroplethRoute.test.ts`
Expected: FAIL — `featureGeometries is not a function`; cannot resolve the service and the route.

- [ ] **Step 4: Registry**

In `lib/mapa/recorteRegistry.ts`, declare the position on the indexed feature:

```ts
interface IndexedFeicao extends FeicaoInfo {
  /** Position in the GeoJSON, which is also the id MapLibre's `generateId` gives the feature. */
  index:    number
  geometry: Geometry
}
```

and add after `getFeicao`:

```ts
/**
 * Every labelled feature of a recorte with its file position, for the map by
 * feature (lib/mapa/choroplethCompute.ts): the browser numbers the same
 * features by the same position, so the values land on the right polygons.
 */
export function featureGeometries(recorteId: string): { index: number; geometry: Geometry }[] | null {
  const entry = index(recorteId)
  return entry ? entry.feicoes.map((f) => ({ index: f.index, geometry: f.geometry })) : null
}
```

- [ ] **Step 5: Service**

`lib/mapa/choroplethService.ts`:

```ts
// Server side of /api/gee/choropleth: which layers and recortes can be drawn
// by feature, and the values, cached per layer and recorte. The data is
// static, so an answer is reused across users for a day; module scope, like
// tileCache.ts.

import 'server-only'

import appConfig from '@/config/mapa/layers.json'
import { getEe } from '@/lib/mapa/geeAuth'
import { layerYears } from '@/lib/mapa/dataRange'
import type { GeeAssetConfig } from '@/lib/mapa/geeImage'
import { featureGeometries } from '@/lib/mapa/recorteRegistry'
import { reduceChoropleth } from '@/lib/mapa/choroplethCompute'
import { choroplethRange, isChoroplethLayer, STATIC_KEY, type ChoroplethResponse } from '@/lib/mapa/choropleth'
import type { LayerConfig, RasterLayerConfig } from '@/types/mapa'

const LAYERS = appConfig.layers as LayerConfig[]

/** A continuous Earth Engine quantity, which can be drawn by feature. */
export function getChoroplethLayer(layerId: string): RasterLayerConfig | null {
  const layer = LAYERS.find((l) => l.id === layerId)
  return layer && isChoroplethLayer(layer) ? layer : null
}

/** A recorte declaring `choropleth` in layers.json (Estados, Municípios). */
export function isChoroplethRecorte(recorteId: string): boolean {
  return LAYERS.some((l) => l.id === recorteId && l.type === 'vector' && !!l.choropleth)
}

const TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map<string, { value: ChoroplethResponse; expires: number }>()
const inFlight = new Map<string, Promise<ChoroplethResponse>>()

export function cachedChoropleth(key: string): ChoroplethResponse | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    cache.delete(key)
    return null
  }
  return hit.value
}

/**
 * The values of `layer` by feature of `recorteId`, every year at once. A second
 * request for the same key while the first runs waits on the same computation;
 * a failure is not cached. Earth Engine must already be initialized: the route
 * answers 503 itself when it is not.
 */
export function computeChoropleth(
  key: string,
  layer: RasterLayerConfig,
  recorteId: string,
): Promise<ChoroplethResponse> {
  const hit = cachedChoropleth(key)
  if (hit) return Promise.resolve(hit)
  const running = inFlight.get(key)
  if (running) return running

  const gee = layer.gee!
  const run = (async () => {
    const features = featureGeometries(recorteId)
    if (!features) throw new Error(`recorte "${recorteId}" has no features`)
    const keys = gee.temporal ? layerYears(gee.temporal) : [STATIC_KEY]
    const values = await reduceChoropleth(getEe(), gee.asset as GeeAssetConfig, keys, features)
    const value: ChoroplethResponse = { keys, values, range: choroplethRange(layer, values) }
    cache.set(key, { value, expires: Date.now() + TTL_MS })
    return value
  })().finally(() => inFlight.delete(key))

  inFlight.set(key, run)
  return run
}
```

- [ ] **Step 6: Route**

`app/api/gee/choropleth/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { initGee } from '@/lib/mapa/geeAuth'
import { bodyTooLarge } from '@/lib/mapa/geeValidation'
import { rateLimit, clientIp } from '@/lib/mapa/rateLimit'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { choroplethKey } from '@/lib/mapa/choropleth'
import {
  cachedChoropleth,
  computeChoropleth,
  getChoroplethLayer,
  isChoroplethRecorte,
} from '@/lib/mapa/choroplethService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The mean of a continuous layer by feature of a recorte (Estados,
// Municípios), every year at once, for the map by feature. The client sends
// ids only: the asset comes from layers.json and the geometries from the
// recorte's GeoJSON on the server.
interface ReqBody {
  layerId?:   unknown
  recorteId?: unknown
}

export async function POST(req: Request) {
  if (!await getAuthenticatedRequest(req)) return unauthorizedResponse()

  const rl = rateLimit(clientIp(req))
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }
  if (bodyTooLarge(req)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  let body: ReqBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const layer = typeof body.layerId === 'string' ? getChoroplethLayer(body.layerId) : null
  if (!layer) {
    return NextResponse.json({ error: 'layerId must name a continuous GEE layer' }, { status: 400 })
  }
  const { recorteId } = body
  if (typeof recorteId !== 'string' || !isChoroplethRecorte(recorteId)) {
    return NextResponse.json({ error: 'recorteId must name a recorte drawn by feature' }, { status: 400 })
  }

  const key = choroplethKey(layer.id, recorteId)
  const hit = cachedChoropleth(key)
  if (hit) return NextResponse.json(hit)

  try {
    await initGee()
  } catch (err) {
    console.error('[/api/gee/choropleth] auth error:', err)
    return NextResponse.json({ error: 'Earth Engine unavailable' }, { status: 503 })
  }

  try {
    return NextResponse.json(await computeChoropleth(key, layer, recorteId))
  } catch (err) {
    console.error('[/api/gee/choropleth] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
```

- [ ] **Step 7: Document the route**

In `CLAUDE.md`, section `### GEE routes`, change `` `app/api/gee/{tile,stats,point,timeseries}/route.ts` `` to `` `app/api/gee/{tile,stats,point,timeseries,choropleth}/route.ts` `` and append after the routes paragraph:

```markdown
`/api/gee/choropleth` (`{ layerId, recorteId }`, ids only) answers the mean of a continuous layer by feature of a recorte that declares `choropleth` in `layers.json` (Estados, Municípios), every year at once, from one `reduceRegions` (`lib/mapa/choroplethCompute.ts`), cached a day (`lib/mapa/choroplethService.ts`). With such a recorte on, MapView draws the continuous layers by feature of the finest one, on the recorte's own GeoJSON source; the rules live in `lib/mapa/choropleth.ts`, shared by MapView and the legend.
```

- [ ] **Step 8: Run and commit**

Run: `cd $W && npx vitest run tests/lib/recorteRegistry.test.ts tests/lib/choroplethService.test.ts tests/app/choroplethRoute.test.ts && npm test 2>&1 | grep -E "Test Files|Tests  |FAIL"`
Expected: PASS; the whole suite passes.

```bash
cd $W && git add config/mapa/layers.json lib/mapa/recorteRegistry.ts lib/mapa/choroplethService.ts \
  app/api/gee/choropleth/route.ts CLAUDE.md tests/lib/recorteRegistry.test.ts tests/lib/choroplethService.test.ts \
  tests/app/choroplethRoute.test.ts
git commit -q -m "feat: /api/gee/choropleth, a layer's mean by feature of Estados or Municípios"
```

---

### Task 6: Client state and runner

**Files:**
- Modify: `lib/mapa/store.ts` (interface `MapaStore`; initial state; `toggleLayer` ~line 236; `showLayer` ~line 253)
- Create: `lib/mapa/choroplethRunner.ts`
- Test: `tests/lib/choroplethRunner.test.ts`

**Interfaces:**
- Consumes: Task 3 (`ChoroplethEntry`, `ChoroplethResponse`, `choroplethKey`, `choroplethRecorte`, `withoutChoroplethErrors`).
- Produces:
  - store `choropleths: Record<string, ChoroplethEntry>`
  - `interface PendingChoropleth { layer: RasterLayerConfig; recorteId: string; key: string }`
  - `pendingChoropleths(layers: LayerConfig[], choropleths: Record<string, ChoroplethEntry>): PendingChoropleth[]`
  - `runChoropleths(): void`

- [ ] **Step 1: Store field and retry**

In `lib/mapa/store.ts`, add the import:

```ts
import { withoutChoroplethErrors, type ChoroplethEntry } from '@/lib/mapa/choropleth'
```

in `interface MapaStore`, after `temporalDate: Record<string, string> …`:

```ts
  // Each continuous raster's mean by feature of the finest choropleth recorte
  // on, keyed by choroplethKey (layer|recorte). Not persisted.
  choropleths: Record<string, ChoroplethEntry>
```

in the initial state, after `temporalDate:     restaurado?.temporalDate ?? {},`:

```ts
  choropleths:      {},
```

In `toggleLayer`, replace the final `set(...)`:

```ts
    set((s) => ({
      layers: setLayerVisibility(s.layers, id, !layer?.visible),
    }))
```

with

```ts
    // Turning a choropleth recorte on is how its failures are retried.
    const retries = layer?.type === 'vector' && !!layer.choropleth && !layer.visible
    set((s) => ({
      layers: setLayerVisibility(s.layers, id, !layer?.visible),
      ...(retries ? { choropleths: withoutChoroplethErrors(s.choropleths, id) } : {}),
    }))
```

and replace `showLayer`:

```ts
  showLayer: (id) =>
    set((s) => {
      const layer = s.layers.find((l) => l.id === id)
      const retries = layer?.type === 'vector' && !!layer.choropleth && !layer.visible
      return {
        layers: setLayerVisibility(s.layers, id, true),
        ...(retries ? { choropleths: withoutChoroplethErrors(s.choropleths, id) } : {}),
      }
    }),
```

- [ ] **Step 2: Write the failing test**

`tests/lib/choroplethRunner.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pendingChoropleths, runChoropleths } from '@/lib/mapa/choroplethRunner'
import { choroplethKey } from '@/lib/mapa/choropleth'
import { useStore } from '@/lib/mapa/store'
import type { RasterLayerConfig, VectorLayerConfig } from '@/types/mapa'

const raster = (id: string, over: Partial<RasterLayerConfig> = {}): RasterLayerConfig => ({
  id, name: id, type: 'raster', visible: true, opacity: 80,
  colorType: 'continuous', source: 'gee', clipToLayerId: 'bioma',
  gee: { asset: { type: 'image', id: `projects/x/${id}` }, visParams: { min: 0, max: 100, palette: ['#000', '#fff'] } },
  ...over,
})
const municipios: VectorLayerConfig = {
  id: 'municipios', name: 'Municípios', type: 'vector', url: '/x.geojson', visible: true, opacity: 80,
  color: '#000', pickPriority: 20, choropleth: { caption: 'Escala municipal' },
}
const estoque = raster('estoque')

describe('pendingChoropleths', () => {
  it('asks for every visible continuous raster drawn by the finest recorte', () => {
    const gpp = raster('gpp')
    expect(pendingChoropleths([municipios, estoque, gpp], {})).toEqual([
      { layer: estoque, recorteId: 'municipios', key: choroplethKey('estoque', 'municipios') },
      { layer: gpp, recorteId: 'municipios', key: choroplethKey('gpp', 'municipios') },
    ])
  })

  it('asks for nothing already asked, answered or failed, nor without a recorte', () => {
    const key = choroplethKey('estoque', 'municipios')
    expect(pendingChoropleths([municipios, estoque], { [key]: { status: 'loading' } })).toEqual([])
    expect(pendingChoropleths([municipios, estoque], { [key]: { status: 'error' } })).toEqual([])
    expect(pendingChoropleths([{ ...municipios, visible: false }, estoque], {})).toEqual([])
  })
})

describe('runChoropleths', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    useStore.setState({ layers: [municipios, estoque], choropleths: {} })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    consoleError.mockRestore()
  })

  it('stores the answer under the layer and recorte', async () => {
    const answer = { keys: ['static'], values: [[1, 2]], range: { min: 1, max: 2 } }
    const fetchMock = vi.fn(async () => Response.json(answer))
    vi.stubGlobal('fetch', fetchMock)

    runChoropleths()

    await vi.waitFor(() => expect(useStore.getState().choropleths[choroplethKey('estoque', 'municipios')])
      .toEqual({ status: 'ready', ...answer }))
    expect(fetchMock).toHaveBeenCalledWith('/api/gee/choropleth', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ layerId: 'estoque', recorteId: 'municipios' }),
    }))
  })

  it('asks a failed recorte again once it is turned on again, and not before', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const key = choroplethKey('estoque', 'municipios')

    runChoropleths()
    await vi.waitFor(() => expect(useStore.getState().choropleths[key]).toEqual({ status: 'error' }))
    runChoropleths()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    useStore.getState().toggleLayer('municipios')   // off
    useStore.getState().toggleLayer('municipios')   // on again: drops the failure
    runChoropleths()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd $W && npx vitest run tests/lib/choroplethRunner.test.ts`
Expected: FAIL — cannot resolve `@/lib/mapa/choroplethRunner`.

- [ ] **Step 4: Write the runner**

`lib/mapa/choroplethRunner.ts`:

```ts
// The single place that fetches the map by feature: for every visible
// continuous raster drawn by the finest choropleth recorte on, the values of
// every year at once (/api/gee/choropleth), into the store. MapView draws them
// and the legend describes them through lib/mapa/choropleth.ts.

import { useStore } from '@/lib/mapa/store'
import {
  choroplethKey,
  choroplethRecorte,
  type ChoroplethEntry,
  type ChoroplethResponse,
} from '@/lib/mapa/choropleth'
import type { LayerConfig, RasterLayerConfig } from '@/types/mapa'

export interface PendingChoropleth {
  layer:     RasterLayerConfig
  recorteId: string
  key:       string
}

/**
 * What is still to be asked. Pure. A failed entry asks nothing more, so a
 * re-render never re-sends it; turning its recorte on again drops it
 * (`withoutChoroplethErrors` in the store).
 */
export function pendingChoropleths(
  layers: LayerConfig[],
  choropleths: Record<string, ChoroplethEntry>,
): PendingChoropleth[] {
  const out: PendingChoropleth[] = []
  for (const layer of layers) {
    const recorte = choroplethRecorte(layers, layer)
    if (!recorte) continue
    const key = choroplethKey(layer.id, recorte.id)
    if (choropleths[key]) continue
    out.push({ layer: layer as RasterLayerConfig, recorteId: recorte.id, key })
  }
  return out
}

function setEntry(key: string, entry: ChoroplethEntry) {
  useStore.setState((s) => ({ choropleths: { ...s.choropleths, [key]: entry } }))
}

async function fetchChoropleth({ layer, recorteId, key }: PendingChoropleth): Promise<void> {
  setEntry(key, { status: 'loading' })
  try {
    const res = await fetch('/api/gee/choropleth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layerId: layer.id, recorteId }),
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const answer = await res.json() as ChoroplethResponse
    setEntry(key, { status: 'ready', ...answer })
  } catch (err) {
    // The pixels on the biome scale stay; there is nothing to tell the reader.
    console.error('[choropleth]', layer.id, err)
    setEntry(key, { status: 'error' })
  }
}

/** Fetch whatever the rasters on screen still lack. */
export function runChoropleths(): void {
  const { layers, choropleths } = useStore.getState()
  for (const pending of pendingChoropleths(layers, choropleths)) void fetchChoropleth(pending)
}
```

- [ ] **Step 5: Run, type check and commit**

Run: `cd $W && npx vitest run tests/lib/choroplethRunner.test.ts && npx tsc --noEmit 2>&1 | grep -oE "^[^(]+\(" | sort | uniq -c`
Expected: PASS (4 tests); `tsc` baseline only.

```bash
cd $W && git add lib/mapa/store.ts lib/mapa/choroplethRunner.ts tests/lib/choroplethRunner.test.ts
git commit -q -m "feat: fetch the map by feature when its recorte or layer turns on"
```

---

### Task 7: Draw the map by feature in MapView

**Files:**
- Modify: `components/mapa/MapView.tsx` (imports; z-order `sublayers` ~line 1234; after the reactive recompute effect ~line 1536)

**Interfaces:**
- Consumes: `choroplethColor`, `choroplethView` (Task 3); `runChoropleths` (Task 6); store `choropleths`.
- Produces: the `${rasterId}-choropleth` fill layer; nothing other tasks import.

- [ ] **Step 1: Imports**

Next to the other `@/lib/mapa` imports:

```ts
import { choroplethColor, choroplethView } from '@/lib/mapa/choropleth'
import { runChoropleths } from '@/lib/mapa/choroplethRunner'
```

- [ ] **Step 2: Keep the fill right above its raster in the z-order**

In the z-order sync, replace

```ts
          : [`${layer.id}-raster`]
```

with

```ts
          // The map by feature replaces its raster in place, so it sits right above it.
          : [`${layer.id}-raster`, `${layer.id}-choropleth`]
```

- [ ] **Step 3: Runner and draw effects**

Right after the reactive recompute effect (deps `[layers, temporalDate, temporalTileUrls, fetchedTileUrls, selectedGeometry]`), add:

```ts
  // The map by feature of the finest choropleth recorte on: the runner asks
  // only for what is missing, so a re-run on an opacity drag is free.
  useEffect(() => {
    runChoropleths()
  }, [layers])

  // Draws each raster by feature while its values are on hand: a fill on the
  // recorte's own GeoJSON source, colored from feature states, right above
  // the raster, whose pixels are hidden meanwhile. A year step only rewrites
  // the states. Declared after the layer sync, so it runs after updateLayer
  // has reset the raster's opacity, and hides it again.
  const choropleths = useStore((s) => s.choropleths)
  const drawnChoropleths = useRef(new Map<string, { recorteId: string; values: (number | null)[] }>())
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    for (const layer of layers) {
      if (layer.type !== 'raster') continue
      const rasterId = `${layer.id}-raster`
      const fillId = `${layer.id}-choropleth`
      const view = choroplethView(layers, layer, choropleths, temporalDate[layer.id])
      const drawn = drawnChoropleths.current.get(layer.id)

      if (!view || !map.getLayer(rasterId) || !map.getSource(view.recorte.id)) {
        if (map.getLayer(fillId)) map.removeLayer(fillId)
        if (drawn && map.getLayer(rasterId)) {
          map.setPaintProperty(rasterId, 'raster-opacity', layer.visible ? layer.opacity / 100 : 0)
        }
        drawnChoropleths.current.delete(layer.id)
        continue
      }

      const stateKey = `v_${layer.id}`
      const color = choroplethColor(view.palette, view.range, stateKey)
      if (drawn && drawn.recorteId !== view.recorte.id && map.getLayer(fillId)) map.removeLayer(fillId)
      if (!map.getLayer(fillId)) {
        const order = map.getStyle().layers.map((l) => l.id)
        const above = order[order.indexOf(rasterId) + 1]
        map.addLayer({
          id: fillId,
          type: 'fill',
          source: view.recorte.id,
          paint: { 'fill-color': color, 'fill-opacity': layer.opacity / 100 },
        }, above)
      } else {
        map.setPaintProperty(fillId, 'fill-color', color)
        map.setPaintProperty(fillId, 'fill-opacity', layer.opacity / 100)
      }

      if (!drawn || drawn.values !== view.values || drawn.recorteId !== view.recorte.id) {
        view.values.forEach((value, id) => {
          map.setFeatureState({ source: view.recorte.id, id }, { [stateKey]: value })
        })
      }
      map.setPaintProperty(rasterId, 'raster-opacity', 0)
      drawnChoropleths.current.set(layer.id, { recorteId: view.recorte.id, values: view.values })
    }
  }, [layers, choropleths, temporalDate, mapReady])
```

- [ ] **Step 4: Type check, lint, suite, commit**

Run: `cd $W && npx tsc --noEmit 2>&1 | grep -oE "^[^(]+\(" | sort | uniq -c; npm run lint 2>&1 | grep "✖"; npm test 2>&1 | grep -E "Test Files|Tests  |FAIL"`
Expected: `tsc` baseline only; lint `✖ 5 problems (3 errors, 2 warnings)`; suite passes. (MapView has no unit test; Task 9 checks it rendered.)

```bash
cd $W && git add components/mapa/MapView.tsx
git commit -q -m "feat: draw continuous layers by feature of the finest recorte on"
```

---

### Task 8: Legend

**Files:**
- Modify: `components/mapa/overlays/FloatingLegend.tsx` (`RasterLegendItem` ~line 181, its call ~line 134, `ContinuousLegend` ~line 232)

**Interfaces:**
- Consumes: `choroplethView`, `choroplethPending`, `ChoroplethRange` (Task 3); store `layers`, `choropleths`, `temporalDate`.

- [ ] **Step 1: Imports and the item's inputs**

Add:

```ts
import { choroplethPending, choroplethView, type ChoroplethRange } from '@/lib/mapa/choropleth'
```

Change the call to pass the layers the component already holds:

```tsx
            return <RasterLegendItem key={layer.id} layer={layer as RasterLayerConfig} layers={layers} theme={theme} />
```

Replace the head of `RasterLegendItem`:

```tsx
function RasterLegendItem({ layer, theme }: { layer: RasterLayerConfig; theme: PlatformTheme }) {
  const hasClasses = layer.classes && layer.classes.length > 0
```

with

```tsx
function RasterLegendItem({
  layer,
  layers,
  theme,
}: {
  layer: RasterLayerConfig
  layers: LayerConfig[]
  theme: PlatformTheme
}) {
  const hasClasses = layer.classes && layer.classes.length > 0
  // The same rule MapView draws with, so the legend describes the map on screen.
  const choropleths = useStore((s) => s.choropleths)
  const temporalDate = useStore((s) => s.temporalDate[layer.id])
  const view = choroplethView(layers, layer, choropleths, temporalDate)
  // Said from the moment the recorte is on: the values take a few seconds,
  // and until they land the bar below still describes the pixels.
  const pending = view ? null : choroplethPending(layers, layer, choropleths)
```

and add `LayerConfig` to the file's `import type { … } from '@/types/mapa'`.

- [ ] **Step 2: Caption under the layer name, range on the bar**

Right after the layer-name `<span>` (the uppercase eyebrow), add:

```tsx
      {(view || pending) && (
        <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.colors.caption, lineHeight: 1.3, opacity: view ? 1 : 0.75 }}>
          {view
            ? view.caption
            : `Calculando ${pending!.charAt(0).toLowerCase()}${pending!.slice(1)}…`}
        </span>
      )}
```

Pass the range to the bar:

```tsx
        <ContinuousLegend layer={layer} theme={theme} range={view?.range ?? null} />
```

Replace the head of `ContinuousLegend`, from its signature through `const high = real?.max ?? max`, with:

```tsx
function ContinuousLegend({
  layer,
  theme,
  range,
}: {
  layer: RasterLayerConfig
  theme: PlatformTheme
  /** The map by feature's range, when the layer is drawn by feature. */
  range: ChoroplethRange | null
}) {
  const palette = layer.gee?.visParams?.palette
  const min = range?.min ?? layer.gee?.visParams?.min ?? layer.rescale?.[0]
  const max = range?.max ?? layer.gee?.visParams?.max ?? layer.rescale?.[1]
  // Drawn by feature, the bar runs over the features' values and its ends say
  // so. In pixels, the ends print the real extremes of the data while the bar
  // keeps the color stretch, so values past it share the end color.
  const temporalDate = useStore((s) => s.temporalDate[layer.id])
  const real = range ? null : dataRangeFor(layer.id, temporalDate)
  const low = real?.min ?? min
  const high = real?.max ?? max
```

- [ ] **Step 3: Type check, lint, suite, commit**

Run: `cd $W && npx tsc --noEmit 2>&1 | grep -oE "^[^(]+\(" | sort | uniq -c; npm run lint 2>&1 | grep "✖"; npm test 2>&1 | grep -E "Test Files|Tests  |FAIL"`
Expected: baselines only; suite passes.

```bash
cd $W && git add components/mapa/overlays/FloatingLegend.tsx
git commit -q -m "feat: the legend follows the map by feature and says while it computes"
```

---

### Task 9: Rendered check, final verification and the PR

**Files:** none unless a check fails; the PR description.

- [ ] **Step 1: Dev server**

If no server runs from the worktree on :3100 (`ss -ltnp | grep :3100`), start one:

```bash
SP=/tmp/claude-1002/-home-ezequias-oca-plataforma-carbono-mvp/edc1ac9f-c483-4e9c-a085-f1a7717d93b7/scratchpad
cd $W && (nohup npx next dev -p 3100 > $SP/dev-3100.log 2>&1 &)
```

Open `http://localhost:3100/mapa` (Chrome, logged in; 1436 px wide).

- [ ] **Step 2: Estados, then Municípios**

Turn Estoque Total on, then Estados. Expect within seconds: the legend says `Calculando escala estadual…`, then `Escala estadual` with the ends of the state means; the map shows one color per state and no pixels. Network: one `POST /api/gee/choropleth` (200). Then turn Municípios on: `Calculando escala municipal…`, then one color per municipality over the states (Review Focus 1); one more request. Turn Municípios off: back to the states, no request.

- [ ] **Step 3: Year steps, opacity, flux, categorical**

- Turn GPP on with Municípios on; step the year three times: colors change, **no** `/api/gee/choropleth` and **no** `/api/gee/tile` request for the recorte map (Review Focus 4).
- Drag GPP's opacity: the fill follows, the pixels stay hidden (Review Focus 2).
- Turn the net flux on: caption `Escala municipal`, zero tick inside the bar.
- Turn MapBiomas on: it stays in pixels with its full legend, no caption.
- A municipality with no value shows no fill, not the palette's first color (Review Focus 5) — zoom on a small one or check `map.getFeatureState` in the console if none is visible.

- [ ] **Step 4: Selection, reload, off**

- Click a municipality: the results panel opens as before; the map's colors and the legend do not change.
- Reload the page with Municípios and a raster on (restored): the map by feature comes back once the tile and values land (Review Focus 3).
- Turn both recortes off: pixels on the biome scale, the legend as on `main`.

- [ ] **Step 5: Final verification**

Stop the dev server by its pid, then:

Run: `cd $W && npm test 2>&1 | grep -E "Test Files|Tests  "; npx tsc --noEmit 2>&1 | grep -oE "^[^(]+\(" | sort | uniq -c; npm run lint 2>&1 | grep "✖"; npm run build > /dev/null 2>&1; echo "build $?"; npm run contrast 2>&1 | tail -1`
Expected: suite passes; baselines only; `build 0`; `falhas de contraste abaixo de 4.5:1 -> 0`.

- [ ] **Step 6: Push and update PR #122**

```bash
cd $W && git fetch -q && git status -sb | head -1 && git push -q
```

Rewrite the PR title and body through the API (`gh pr edit` fails in this repo): title
`feat: continuous layers drawn by municipality or state when that recorte is on`; body written to `$SP/pr-body.md`, in English — what changes (the behavior of §3 of the spec), how (route, compute, MapLibre fill, one rule module), the user's correction quoted, what was removed from the first attempt, verification (tests, live timing from Task 1, the rendered checks above), notes (#120 interaction, prewarm follow-up). Use:

```bash
gh api -X PATCH repos/OCA-UFCG/plataforma-carbono-mvp/pulls/122 -f title='feat: continuous layers drawn by municipality or state when that recorte is on' -F body=@$SP/pr-body.md --jq .html_url
```
