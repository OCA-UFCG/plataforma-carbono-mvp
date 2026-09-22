# Multi-layer results panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `/mapa` results panel show one card per visible raster instead of a single measurement whose layer is unstated.

**Architecture:** The store stops holding one result (`rasterStats`, `pixelValue`, `statsLoading`, `statsError`) and holds `results: Record<string, LayerResult>` keyed by layer id. The four copies of the compute block inside `MapView.tsx` move into `lib/mapa/analysisRunner.ts`, which fans out over every visible raster; the reactive effect becomes a pure per-layer diff (`pendingAnalyses`). The panel renders one collapsible `LayerResultCard` per visible raster, reusing the already store-free `StatsChartView`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Zustand, MapLibre + mapbox-gl-draw, Recharts (lazy), vitest (node environment).

**Spec:** `docs/superpowers/specs/2026-09-22-multi-layer-results-design.md`

## Global Constraints

- Code, comments and documentation in **English**. UI strings stay in **Portuguese** — the product is Brazilian. An English comment quoting a UI label keeps it verbatim (`"Área desenhada"`, `"Valor do pixel"`).
- The platform name is **Caativar**, feminine in Portuguese copy.
- Never add `app/layout.tsx`; the three root layouts stay siblings. No link here crosses a route group, so this constraint only forbids new shared layout files.
- Every path that builds an `ee.Image` must go through `buildEeImage` — this plan adds **no** server code and calls only the existing `/api/gee/*` routes, so it inherits that for free.
- `npm test` and `npm run lint` are **not** run by CI (`.github/workflows/ci.yml` runs `npm ci`, `npm run build`, `npm run contrast`). Run all four locally.
- Number formatting in prose/UI uses `numero(value, digits)` from `lib/mapa/format.ts` (pt-BR, decimal comma, thousands dot). CSV cells use `numeroCsv` (decimal comma, **no** grouping).
- Commits follow the repo's conventional style (`feat:`, `fix:`, `docs:`, `refactor:`), lowercase, no co-author trailers.
- Work on branch `feat/multi-layer-results-panel`, which already exists and holds the spec commit.

## Task order and why the build stays green

Tasks 1–6 are additive: nothing existing changes behaviour, and `npm run build` passes after each. Task 7 is the flip — it is deliberately atomic, because a half-flipped panel does not compile.

---

### Task 1: `LayerResult` in the store

**Files:**
- Modify: `types/mapa.ts` (append after `RasterStatsResult`, ~line 220)
- Modify: `lib/mapa/store.ts`
- Test: `tests/lib/analysisContent.test.ts` (create)

**Interfaces:**
- Produces: `LayerResult` (type), `MapaStore['results']`, `setLayerResult(result: LayerResult): void`, `clearResults(): void`, `hasAnalysisContent(s): boolean`.
- Consumes: nothing.

The old singular fields (`rasterStats`, `pixelValue`, `statsLoading`, `statsError`) **stay untouched** in this task. Task 7 removes them.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/analysisContent.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { hasAnalysisContent } from '@/lib/mapa/store'
import type { LayerConfig, LayerResult } from '@/types/mapa'


const raster: LayerConfig = {
  id: 'estoque_carbono', name: 'Estoque de carbono', type: 'raster',
  visible: true, opacity: 80, colorType: 'continuous',
}
const hidden: LayerConfig = { ...raster, id: 'ndvi_modis', visible: false }

const ready: LayerResult = {
  layerId: 'estoque_carbono', status: 'ready',
  stats: { kind: 'continuous', stats: { min: 1, max: 9, mean: 5, count: 10 } },
  pixelValue: null, error: null,
}

const empty = { drawnArea: null, drawnLength: null, results: {}, layers: [raster] }

describe('hasAnalysisContent', () => {
  it('is false with no measurement and no result', () => {
    expect(hasAnalysisContent(empty)).toBe(false)
  })

  it('is true for a drawn area even before any layer answers', () => {
    expect(hasAnalysisContent({ ...empty, drawnArea: 621.4 })).toBe(true)
  })

  it('is true for a drawn length', () => {
    expect(hasAnalysisContent({ ...empty, drawnLength: 12.5 })).toBe(true)
  })

  it('is true when a visible raster has a result', () => {
    expect(hasAnalysisContent({ ...empty, results: { estoque_carbono: ready } })).toBe(true)
  })

  // A result left behind by a layer the user switched off must not keep the
  // panel open: the card is gone, so the panel has nothing to show.
  it('ignores a result whose layer is no longer visible', () => {
    expect(hasAnalysisContent({
      ...empty,
      layers: [hidden],
      results: { ndvi_modis: { ...ready, layerId: 'ndvi_modis' } },
    })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/analysisContent.test.ts`
Expected: FAIL — `hasAnalysisContent is not a function` (and a TS error on `LayerResult`).

- [ ] **Step 3: Add the `LayerResult` type**

In `types/mapa.ts`, immediately after the `RasterStatsResult` union:

```ts
/**
 * One layer's outcome within a single analysis (one click, one geometry).
 *
 * The panel holds one of these per visible raster instead of a single result,
 * so a number is never shown without the layer it came from. `date` is the
 * temporal stop it refers to, and is what tells the reactive diff whether a
 * card is still current (lib/mapa/analysisRunner.ts).
 */
export interface LayerResult {
  layerId: string
  /** Temporal stop these numbers refer to; absent for a static layer. */
  date?: string
  status: 'loading' | 'ready' | 'error'
  stats: RasterStatsResult | null
  pixelValue: PixelValueResult | null
  error: string | null
}

/**
 * The geometry an analysis runs over, and how it was produced.
 *
 * It lives here rather than in analysisRunner.ts because the store holds it and
 * the runner imports the store: a type in the runner would close that loop.
 */
export interface SelectedGeometry {
  geometry:     GeoJSON.Geometry
  geometryType: 'polygon' | 'point'
  lon?:         number
  lat?:         number
}
```

- [ ] **Step 4: Add the record, the actions and the selector to the store**

In `lib/mapa/store.ts`, import the type:

```ts
import type {
  LayerConfig,
  DrawMode,
  LayerResult,
  PixelValueResult,
  RasterLayerConfig,
  RasterStatsResult,
} from '@/types/mapa'
```

In the `MapaStore` interface, below `pixelValue: PixelValueResult | null`:

```ts
  // One result per visible raster, keyed by layer id. Nothing prunes it when a
  // layer is switched off: the panel renders the intersection with the visible
  // rasters, so the card disappears on its own and switching the layer back on
  // reuses the result -- still valid, because every path that changes the
  // geometry clears the whole record first.
  results: Record<string, LayerResult>
  // What the results refer to. MapView kept this in a ref while nothing outside
  // the map needed it; a failed card's "Tentar novamente" does, so it is state.
  selectedGeometry: SelectedGeometry | null
```

And in the action list, below `setPixelValue`:

```ts
  setLayerResult:      (result: LayerResult) => void
  clearResults:        () => void
  setSelectedGeometry: (geom: SelectedGeometry | null) => void
```

In the store body, next to `pixelValue: null`:

```ts
  results: {},
  selectedGeometry: null,
```

And with the other setters:

```ts
  // A full replace, not a merge: a layer moving back to 'loading' must drop the
  // previous stop's numbers, or the card would show last year's mean under this
  // year's header while the request is in flight.
  setLayerResult: (result) =>
    set((s) => ({ results: { ...s.results, [result.layerId]: result } })),
  clearResults: () => set({ results: {} }),
  setSelectedGeometry: (geom) => set({ selectedGeometry: geom }),
```

In `clearDrawings`, add `results: {}` and `selectedGeometry: null` to the object it
sets, right after `pixelValue: null`.

- [ ] **Step 5: Add the shared selector**

At the end of `lib/mapa/store.ts`, before the `omitKey` helper:

```ts
/**
 * Whether the results panel has anything to show.
 *
 * Exported because Mapa.tsx needs the same answer as ResultsSidebar to decide
 * how far to shift the map controls, and two copies of this condition -- which
 * is what the code had -- drift apart.
 */
export function hasAnalysisContent(s: {
  drawnArea:   number | null
  drawnLength: number | null
  results:     Record<string, LayerResult>
  layers:      LayerConfig[]
}): boolean {
  if (s.drawnArea !== null || s.drawnLength !== null) return true
  return s.layers.some(
    (l) => l.type === 'raster' && l.visible && s.results[l.id] !== undefined,
  )
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/lib/analysisContent.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 7: Verify the build still compiles**

Run: `npm run build`
Expected: success — this task only added fields.

- [ ] **Step 8: Commit**

```bash
git add types/mapa.ts lib/mapa/store.ts tests/lib/analysisContent.test.ts
git commit -m "feat: hold one analysis result per layer in the store"
```

---

### Task 2: `pendingAnalyses` — the reactive diff

**Files:**
- Create: `lib/mapa/analysisRunner.ts`
- Test: `tests/lib/analysisRunner.test.ts` (create)

**Interfaces:**
- Consumes: `LayerResult` (Task 1).
- Produces: `PendingAnalysis { layer: RasterLayerConfig; date?: string }`, `pendingAnalyses(input: PendingAnalysesInput): PendingAnalysis[]`.

This is the riskiest logic in the change — it decides what reaches Earth Engine — so it is written test-first and lands on its own.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/analysisRunner.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { pendingAnalyses } from '@/lib/mapa/analysisRunner'
import type { LayerResult, RasterLayerConfig } from '@/types/mapa'

const gee = (id: string, temporal = false): RasterLayerConfig => ({
  id, name: id, type: 'raster', visible: true, opacity: 80,
  colorType: 'continuous', source: 'gee',
  gee: {
    asset: { type: 'image', id: `projects/x/${id}` },
    ...(temporal ? { temporal: { dateRange: ['1985-01-01', '2024-01-01'] as [string, string] } } : {}),
  },
})

const ready = (layerId: string, date?: string): LayerResult => ({
  layerId, date, status: 'ready',
  stats: { kind: 'continuous', stats: { min: 1, max: 9, mean: 5, count: 10 } },
  pixelValue: null, error: null,
})

const input = (over: Partial<Parameters<typeof pendingAnalyses>[0]> = {}) => ({
  rasters: [] as RasterLayerConfig[],
  temporalDate: {} as Record<string, string>,
  results: {} as Record<string, LayerResult>,
  fetchedTileUrls: {} as Record<string, string>,
  temporalTileUrls: {} as Record<string, Record<string, string>>,
  ...over,
})

describe('pendingAnalyses', () => {
  it('returns every visible raster that has a tile and no result yet', () => {
    const a = gee('estoque_carbono')
    const b = gee('biomassa_gedi')
    const out = pendingAnalyses(input({
      rasters: [a, b],
      fetchedTileUrls: { estoque_carbono: 'u1', biomassa_gedi: 'u2' },
    }))

    expect(out).toEqual([{ layer: a, date: undefined }, { layer: b, date: undefined }])
  })

  it('keeps the layer order it was given, topmost first', () => {
    const a = gee('a'); const b = gee('b'); const c = gee('c')
    const out = pendingAnalyses(input({
      rasters: [a, b, c],
      fetchedTileUrls: { a: 'u', b: 'u', c: 'u' },
    }))

    expect(out.map((p) => p.layer.id)).toEqual(['a', 'b', 'c'])
  })

  it('skips a layer whose result already covers the same stop', () => {
    const a = gee('estoque_carbono')
    const out = pendingAnalyses(input({
      rasters: [a],
      fetchedTileUrls: { estoque_carbono: 'u1' },
      results: { estoque_carbono: ready('estoque_carbono') },
    }))

    expect(out).toEqual([])
  })

  it('recomputes a temporal layer whose result is from another year', () => {
    const a = gee('ndvi_modis', true)
    const out = pendingAnalyses(input({
      rasters: [a],
      temporalDate: { ndvi_modis: '2024-01-01' },
      temporalTileUrls: { ndvi_modis: { '2024-01-01': 'u' } },
      results: { ndvi_modis: ready('ndvi_modis', '2023-01-01') },
    }))

    expect(out).toEqual([{ layer: a, date: '2024-01-01' }])
  })

  // Retry is the card's button. An automatic retry inside the reactive effect
  // would fire again on every render that follows the failure.
  it('does not retry a failed layer on its own', () => {
    const a = gee('estoque_carbono')
    const failed: LayerResult = {
      layerId: 'estoque_carbono', status: 'error', stats: null, pixelValue: null,
      error: 'Falha ao calcular estatísticas. Tente novamente.',
    }
    const out = pendingAnalyses(input({
      rasters: [a],
      fetchedTileUrls: { estoque_carbono: 'u1' },
      results: { estoque_carbono: failed },
    }))

    expect(out).toEqual([])
  })

  it('skips a GEE layer whose tile request has not resolved yet', () => {
    const out = pendingAnalyses(input({ rasters: [gee('estoque_carbono')] }))

    expect(out).toEqual([])
  })

  it('skips a temporal layer whose tile for the selected year is missing', () => {
    const a = gee('ndvi_modis', true)
    const out = pendingAnalyses(input({
      rasters: [a],
      temporalDate: { ndvi_modis: '2024-01-01' },
      temporalTileUrls: { ndvi_modis: { '2023-01-01': 'u' } },
    }))

    expect(out).toEqual([])
  })

  it('skips a temporal layer with no stop selected yet', () => {
    const a = gee('ndvi_modis', true)
    const out = pendingAnalyses(input({
      rasters: [a],
      temporalTileUrls: { ndvi_modis: { '2024-01-01': 'u' } },
    }))

    expect(out).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/analysisRunner.test.ts`
Expected: FAIL — cannot resolve `@/lib/mapa/analysisRunner`.

- [ ] **Step 3: Write the minimal implementation**

Create `lib/mapa/analysisRunner.ts`:

```ts
// The single place that turns a selected geometry into layer results.
//
// The compute block -- resolve the temporal stop, read the cache, pick between
// zonal stats, a time series and a point value, write the outcome -- used to be
// copied at four points of MapView.tsx, each of which measured only the topmost
// visible raster. Multiplying four copies by N layers was not viable, so it
// lives here and every caller is one line.

import type { LayerResult, RasterLayerConfig } from '@/types/mapa'

export interface PendingAnalysis {
  layer: RasterLayerConfig
  /** Temporal stop to measure; undefined for a static layer. */
  date?: string
}

export interface PendingAnalysesInput {
  /** Visible rasters, topmost first. */
  rasters:          RasterLayerConfig[]
  temporalDate:     Record<string, string>
  results:          Record<string, LayerResult>
  fetchedTileUrls:  Record<string, string>
  temporalTileUrls: Record<string, Record<string, string>>
}

/**
 * Which layers still owe an answer for the current selection.
 *
 * Pure, and the only rule-holder for when a request is sent: a fresh click
 * clears `results` and gets every layer back, while a layer toggled on or a
 * year stepped returns just that one. Both paths call it, so they cannot drift.
 */
export function pendingAnalyses(input: PendingAnalysesInput): PendingAnalysis[] {
  const { rasters, temporalDate, results, fetchedTileUrls, temporalTileUrls } = input
  const out: PendingAnalysis[] = []

  for (const layer of rasters) {
    const temporal = !!layer.gee?.temporal
    const date = temporal ? temporalDate[layer.id] : undefined

    // A temporal layer with no stop selected has nothing to measure. The stop
    // arrives with activateDynamicLayer, and the effect runs again.
    if (temporal && !date) continue

    // A GEE layer cannot be measured before its tile request resolved: the
    // stats route would answer for an asset the map is not showing yet.
    if (layer.source === 'gee') {
      const tileReady = date
        ? !!temporalTileUrls[layer.id]?.[date]
        : !!fetchedTileUrls[layer.id]
      if (!tileReady) continue
    }

    // A result already covering this stop is not recomputed -- and that
    // includes a failed one. Retry belongs to the card's button; retrying here
    // would fire again on every render after the failure.
    const current = results[layer.id]
    if (current && current.date === date) continue

    out.push({ layer, date })
  }

  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/analysisRunner.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/mapa/analysisRunner.ts tests/lib/analysisRunner.test.ts
git commit -m "feat: add the per-layer analysis diff"
```

---

### Task 3: the runner's imperative half

**Files:**
- Modify: `lib/mapa/analysisRunner.ts`
- Modify: `tests/lib/analysisRunner.test.ts`

**Interfaces:**
- Consumes: `pendingAnalyses` (Task 2), `LayerResult` and `SelectedGeometry` (Task 1), `getRasterStats(layer, feature, temporalDate?)`, `getTemporalTimeSeries(layer, lon, lat)`, `getRasterPointValue(layer, lon, lat, temporalDate?)`, `resolvePixelValue(layer, raw)`.
- Produces: `geomHash(geom)`, `statsCacheKey(layerId, dateOrStatic, geometry)`, `timeSeriesCacheKey(layerId, lon, lat)`, `bumpAnalysisSeq()`, `currentAnalysisSeq()`, `runLayerAnalysis(layer, geom, date, seq)`, `runVisibleRasterAnalyses(geom, seq)`.

`geomHash` and `statsCacheKey` are **moved** from `MapView.tsx:62-79`, unchanged in behaviour, so the existing `statsCache` entries keep the same keys.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/analysisRunner.test.ts`:

```ts
import { geomHash, statsCacheKey, timeSeriesCacheKey } from '@/lib/mapa/analysisRunner'

describe('cache keys', () => {
  const square: GeoJSON.Geometry = {
    type: 'Polygon',
    coordinates: [[[-40, -8], [-39, -8], [-39, -7], [-40, -7], [-40, -8]]],
  }

  it('hashes the same geometry to the same string', () => {
    expect(geomHash(square)).toBe(geomHash(structuredClone(square)))
  })

  it('hashes different geometries apart', () => {
    const other: GeoJSON.Geometry = {
      type: 'Polygon',
      coordinates: [[[-41, -9], [-40, -9], [-40, -8], [-41, -8], [-41, -9]]],
    }
    expect(geomHash(square)).not.toBe(geomHash(other))
  })

  it('writes a static key as layer:static:hash', () => {
    expect(statsCacheKey('estoque_carbono', undefined, square))
      .toBe(`estoque_carbono:static:${geomHash(square)}`)
  })

  it('writes a temporal key with the stop in place of static', () => {
    expect(statsCacheKey('ndvi_modis', '2024-01-01', square))
      .toBe(`ndvi_modis:2024-01-01:${geomHash(square)}`)
  })

  // A point series covers every year at once, so it is cached by position only.
  it('keys a point time series by layer and position, with no date', () => {
    expect(timeSeriesCacheKey('ndvi_modis', -40.5, -7.25))
      .toBe('timeseries:ndvi_modis:-40.5:-7.25')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/analysisRunner.test.ts`
Expected: FAIL — `geomHash` is not exported.

- [ ] **Step 3: Add the cache keys and the sequence guard**

Append to `lib/mapa/analysisRunner.ts` (and extend the imports at the top):

```ts
import { getRasterPointValue } from '@/lib/mapa/getRasterPointValue'
import { getRasterStats, getTemporalTimeSeries } from '@/lib/mapa/getRasterStats'
import { resolvePixelValue } from '@/lib/mapa/resolvePixelValue'
import { useStore } from '@/lib/mapa/store'
```

`SelectedGeometry` comes from `types/mapa.ts` (Task 1) — add it to this file's type
import rather than redeclaring it, since the store holds a value of that type and
the runner imports the store.

```ts
/** Fast, collision-resistant-enough hash of the coordinate JSON. */
export function geomHash(geom: GeoJSON.Geometry): string {
  const str = JSON.stringify('coordinates' in geom ? geom.coordinates : geom)
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return String(h >>> 0)
}

export function statsCacheKey(
  layerId: string,
  dateOrStatic: string | undefined,
  geometry: GeoJSON.Geometry,
): string {
  return `${layerId}:${dateOrStatic ?? 'static'}:${geomHash(geometry)}`
}

/** A point series covers every stop at once, so the date is not part of the key. */
export function timeSeriesCacheKey(layerId: string, lon: number, lat: number): string {
  return `timeseries:${layerId}:${lon}:${lat}`
}

// Discards superseded responses. It was a ref inside MapView while one click
// meant one request; a fan-out has no other way to share it.
let analysisSeq = 0
export function bumpAnalysisSeq(): number { return ++analysisSeq }
export function currentAnalysisSeq(): number { return analysisSeq }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/analysisRunner.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Add `runLayerAnalysis` and the fan-out**

Append to `lib/mapa/analysisRunner.ts`:

```ts
/** A result the caches can answer with, without touching the network. */
function cachedResult(
  layer: RasterLayerConfig,
  geom: SelectedGeometry,
  date: string | undefined,
): LayerResult | null {
  const s = useStore.getState()
  const base = { layerId: layer.id, date, stats: null, pixelValue: null, error: null }

  if (geom.geometryType === 'polygon') {
    const hit = s.statsCache[statsCacheKey(layer.id, date, geom.geometry)]
    return hit ? { ...base, status: 'ready', stats: hit } : null
  }

  if (layer.gee?.temporal) {
    const hit = s.statsCache[timeSeriesCacheKey(layer.id, geom.lon!, geom.lat!)]
    return hit ? { ...base, status: 'ready', stats: hit } : null
  }

  // pixelCache stores `null` for a point over nodata, which is a real answer:
  // only `undefined` means the question was never asked.
  const hit = s.pixelCache[statsCacheKey(layer.id, date, geom.geometry)]
  return hit !== undefined ? { ...base, status: 'ready', pixelValue: hit } : null
}

/**
 * Measure one layer over one geometry and write its card.
 *
 * Also the retry entry point: a failed card calls it again for that layer
 * alone, which is why the sequence number is a parameter rather than taken
 * from the module -- a retry joins the current analysis instead of starting one.
 */
export async function runLayerAnalysis(
  layer: RasterLayerConfig,
  geom:  SelectedGeometry,
  date:  string | undefined,
  seq:   number,
): Promise<void> {
  const base = { layerId: layer.id, date, stats: null, pixelValue: null, error: null }

  const land = (result: LayerResult) => {
    if (seq !== analysisSeq) return   // superseded by a newer selection
    useStore.getState().setLayerResult(result)
  }

  const cached = cachedResult(layer, geom, date)
  if (cached) { land(cached); return }

  land({ ...base, status: 'loading' })

  try {
    if (geom.geometryType === 'polygon') {
      const stats = await getRasterStats(layer, {
        type: 'Feature',
        geometry: geom.geometry as
          | { type: 'Polygon';      coordinates: number[][][] }
          | { type: 'MultiPolygon'; coordinates: number[][][][] },
        properties: {},
      }, date)
      const key = statsCacheKey(layer.id, date, geom.geometry)
      useStore.setState((s) => ({ statsCache: { ...s.statsCache, [key]: stats } }))
      land({ ...base, status: 'ready', stats })
      return
    }

    const { lon, lat } = geom
    if (lon === undefined || lat === undefined) return

    if (layer.gee?.temporal) {
      const series = await getTemporalTimeSeries(layer, lon, lat)
      const stats: RasterStatsResult = { kind: 'timeseries', series }
      const key = timeSeriesCacheKey(layer.id, lon, lat)
      useStore.setState((s) => ({ statsCache: { ...s.statsCache, [key]: stats } }))
      land({ ...base, status: 'ready', stats })
      return
    }

    const raw = await getRasterPointValue(layer, lon, lat, date)
    const pixelValue = raw === null ? null : resolvePixelValue(layer, raw)
    const key = statsCacheKey(layer.id, date, geom.geometry)
    useStore.setState((s) => ({ pixelCache: { ...s.pixelCache, [key]: pixelValue } }))
    land({ ...base, status: 'ready', pixelValue })
  } catch (err) {
    console.error(`[analysisRunner] ${layer.id}`, err)
    const pointValue = geom.geometryType === 'point' && !layer.gee?.temporal
    land({
      ...base,
      status: 'error',
      error: pointValue
        ? 'Falha ao obter o valor do pixel. Tente novamente.'
        : 'Falha ao calcular estatísticas. Tente novamente.',
    })
  }
}

/**
 * Measure every visible raster that still owes an answer.
 *
 * No `Promise.all`: a reduction over a large recorte can take tens of seconds,
 * and a slow layer must not hold back a fast one. Each card lands on its own.
 */
export function runVisibleRasterAnalyses(geom: SelectedGeometry, seq: number): void {
  const state = useStore.getState()
  const rasters = state.layers.filter(
    (l): l is RasterLayerConfig => l.type === 'raster' && l.visible,
  )

  for (const { layer, date } of pendingAnalyses({
    rasters,
    temporalDate:     state.temporalDate,
    results:          state.results,
    fetchedTileUrls:  state.fetchedTileUrls,
    temporalTileUrls: state.temporalTileUrls,
  })) {
    void runLayerAnalysis(layer, geom, date, seq)
  }
}
```

Add `RasterStatsResult` to the type import at the top of the file.

- [ ] **Step 6: Verify nothing regressed**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all pass. Nothing imports the new functions yet.

- [ ] **Step 7: Commit**

```bash
git add lib/mapa/analysisRunner.ts tests/lib/analysisRunner.test.ts
git commit -m "feat: fan an analysis out over every visible raster"
```

---

### Task 4: `resultSummary` — the collapsed card's one line

**Files:**
- Create: `lib/mapa/resultSummary.ts`
- Test: `tests/lib/resultSummary.test.ts` (create)

**Interfaces:**
- Consumes: `LayerResult` (Task 1), `classShares(areas, classes)`, `numero(value, digits)`.
- Produces: `resultSummary(layer: RasterLayerConfig, result: LayerResult | undefined): string | null`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/resultSummary.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resultSummary } from '@/lib/mapa/resultSummary'
import type { LayerResult, RasterLayerConfig } from '@/types/mapa'

const layer = (over: Partial<RasterLayerConfig> = {}): RasterLayerConfig => ({
  id: 'estoque_carbono', name: 'Estoque de carbono', type: 'raster',
  visible: true, opacity: 80, colorType: 'continuous', unit: 't C/ha', ...over,
})

const result = (over: Partial<LayerResult> = {}): LayerResult => ({
  layerId: 'estoque_carbono', status: 'ready',
  stats: null, pixelValue: null, error: null, ...over,
})

describe('resultSummary', () => {
  it('is null while the layer has no result at all', () => {
    expect(resultSummary(layer(), undefined)).toBeNull()
  })

  it('is null while the layer is loading, so the card shows its skeleton', () => {
    expect(resultSummary(layer(), result({ status: 'loading' }))).toBeNull()
  })

  it('is null on error, so the card shows the message instead', () => {
    expect(resultSummary(layer(), result({ status: 'error', error: 'x' }))).toBeNull()
  })

  it('gives the mean with the unit for a continuous layer', () => {
    const summary = resultSummary(layer(), result({
      stats: { kind: 'continuous', stats: { min: 2.1, max: 91, mean: 38.2456, count: 900 } },
    }))

    expect(summary).toBe('média 38,25 t C/ha')
  })

  it('prefers the unit the statistics carry over the layer default', () => {
    const summary = resultSummary(layer(), result({
      stats: { kind: 'continuous', unit: 'Mg/ha', stats: { min: 0, max: 9, mean: 4, count: 9 } },
    }))

    expect(summary).toBe('média 4,00 Mg/ha')
  })

  it('gives the dominant class and its share for a categorical layer', () => {
    const summary = resultSummary(
      layer({
        colorType: 'categorical',
        classes: [
          { value: 1, label: 'Formação florestal', color: '#1f8d49' },
          { value: 2, label: 'Pastagem',           color: '#edde8e' },
        ],
      }),
      result({ stats: { kind: 'categorical', areas: { '1': 750_000, '2': 250_000 } } }),
    )

    expect(summary).toBe('Formação florestal · 75,0%')
  })

  it('gives the last measured year of a series', () => {
    const summary = resultSummary(layer({ unit: 'NDVI' }), result({
      stats: {
        kind: 'timeseries',
        series: [
          { date: '2022-01-01', value: 0.38 },
          { date: '2023-01-01', value: 0.41 },
        ],
      },
    }))

    expect(summary).toBe('2023: 0,41 NDVI')
  })

  // A nodata tail must not be read as the latest measurement.
  it('skips trailing nodata when picking the last year of a series', () => {
    const summary = resultSummary(layer({ unit: 'NDVI' }), result({
      stats: {
        kind: 'timeseries',
        series: [
          { date: '2022-01-01', value: 0.38 },
          { date: '2023-01-01', value: null },
        ],
      },
    }))

    expect(summary).toBe('2022: 0,38 NDVI')
  })

  it('is null for a series with no measurement at all', () => {
    const summary = resultSummary(layer(), result({
      stats: { kind: 'timeseries', series: [{ date: '2023-01-01', value: null }] },
    }))

    expect(summary).toBeNull()
  })

  it('gives the total for a stock report', () => {
    const summary = resultSummary(layer(), result({
      stats: {
        kind: 'stocks',
        report: { totalTc: 4_760_123.4, areaHa: 62_140, unit: 't C', pools: [], classes: [] },
      },
    }))

    expect(summary).toBe('total 4.760.123 t C')
  })

  it('gives the pixel value with its class label for a point analysis', () => {
    const summary = resultSummary(
      layer({ unit: 'classe' }),
      result({ pixelValue: { value: 3, label: 'Pastagem' } }),
    )

    expect(summary).toBe('3,00 classe · Pastagem')
  })

  it('gives the bare pixel value when the layer has no classes', () => {
    const summary = resultSummary(layer(), result({ pixelValue: { value: 38.24 } }))

    expect(summary).toBe('38,24 t C/ha')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/resultSummary.test.ts`
Expected: FAIL — cannot resolve `@/lib/mapa/resultSummary`.

- [ ] **Step 3: Write the implementation**

Create `lib/mapa/resultSummary.ts`:

```ts
// The one line a collapsed result card shows.
//
// The panel's whole point is that a number is never shown without its layer, so
// every card has to answer while closed -- otherwise comparing three layers
// means opening three cards. Pure, because vitest runs in the node environment
// here and this is the part of the card that can be checked directly.

import { classShares } from '@/lib/mapa/classShares'
import { numero } from '@/lib/mapa/format'
import type { LayerResult, RasterLayerConfig } from '@/types/mapa'

export function resultSummary(
  layer: RasterLayerConfig,
  result: LayerResult | undefined,
): string | null {
  // Loading and error have their own treatment inside the card; a summary would
  // compete with the skeleton and with the retry button.
  if (!result || result.status !== 'ready') return null

  const suffix = (unit?: string) => (unit ? ` ${unit}` : '')

  if (result.pixelValue) {
    const { value, label } = result.pixelValue
    const shown = `${numero(value, 2)}${suffix(layer.unit)}`
    return label ? `${shown} · ${label}` : shown
  }

  const stats = result.stats
  if (!stats) return null

  switch (stats.kind) {
    case 'continuous':
      return `média ${numero(stats.stats.mean, 2)}${suffix(stats.unit ?? layer.unit)}`

    case 'categorical': {
      const [dominant] = classShares(stats.areas, layer.classes ?? [])
      return dominant ? `${dominant.label} · ${numero(dominant.share, 1)}%` : null
    }

    case 'timeseries': {
      // Backwards: a series that ends in nodata still has a last measurement,
      // and reporting the nodata year would date the number wrong.
      for (let i = stats.series.length - 1; i >= 0; i--) {
        const point = stats.series[i]
        if (point.value !== null) {
          return `${point.date.slice(0, 4)}: ${numero(point.value, 2)}${suffix(layer.unit)}`
        }
      }
      return null
    }

    case 'stocks':
      return `total ${numero(stats.report.totalTc, 0)} ${stats.report.unit}`
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/resultSummary.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/mapa/resultSummary.ts tests/lib/resultSummary.test.ts
git commit -m "feat: summarise a layer result in one line"
```

---

### Task 5: one CSV covering every layer

**Files:**
- Modify: `lib/mapa/exportAnalysis.ts`
- Modify: `components/mapa/ResultsSidebar.tsx:74-96` (the `handleDownload` call site only)
- Modify: `tests/lib/exportAnalysis.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `LayerSnapshot`, the reshaped `AnalysisSnapshot { analysisKind, analysisLabel, drawnArea, drawnLength, generatedAt, layers: LayerSnapshot[] }`, `buildAnalysisCsv(snap): { filename, csv }`.

The call site is adapted in the same commit so the build stays green; it still passes a single-element `layers` array, built from the old store fields. Task 7 changes only how that array is built.

- [ ] **Step 1: Reshape the existing tests**

In `tests/lib/exportAnalysis.test.ts`, replace the `base` fixture and add a helper. Every existing case then moves its layer-level fields (`layerName`, `layerUnit`, `layerClasses`, `signedFlux`, `year`, `pixelValue`, `stats`) inside `layer({ ... })`:

```ts
import { describe, expect, it } from 'vitest'
import {
  buildAnalysisCsv,
  type AnalysisSnapshot,
  type LayerSnapshot,
} from '@/lib/mapa/exportAnalysis'

const layer = (over: Partial<LayerSnapshot> = {}): LayerSnapshot => ({
  layerName: 'Carbono Orgânico do Solo (0-30 cm)',
  pixelValue: null,
  stats: null,
  ...over,
})

const base: AnalysisSnapshot = {
  analysisKind: 'Município',
  analysisLabel: 'Petrolina',
  drawnArea: null,
  drawnLength: null,
  generatedAt: new Date('2026-08-24T15:00:00Z'),
  layers: [layer()],
}
```

For example, the first case becomes:

```ts
  it('writes continuous statistics as a labelled table in pt-BR numbers', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      layers: [layer({
        layerUnit: 't C/ha',
        stats: {
          kind: 'continuous',
          stats: { min: 1.5, max: 80, mean: 23.456789, median: 20, std: 4.25, count: 1200 },
        },
      })],
    })

    expect(csv).toContain('estatistica;valor;unidade')
    expect(csv).toContain('Média;23,4568;t C/ha')
    expect(csv).toContain('Mínimo;1,5;t C/ha')
    expect(csv).toContain('Contagem de pixels;1200;')
  })
```

Apply the same move to the remaining cases, changing only where the fields sit — every
assertion stays exactly as it is. The file has fifteen, and all of them need it:

| line | case | fields that move into `layer({ ... })` |
|---|---|---|
| 16 | writes continuous statistics as a labelled table in pt-BR numbers | `layerUnit`, `stats` |
| 32 | writes categorical areas in hectares with class labels and share | `layerName`, `layerClasses`, `stats` |
| 48 | buckets class codes missing from the layer config so the shares still sum to 100 | `layerClasses`, `stats` |
| 58 | writes a time series as one row per year, keeping nodata blank | `layerUnit`, `stats` |
| 77 | writes the stock report as a pool table followed by a phytophysiognomy table | `stats` |
| 105 | heads the file with provenance metadata as comment lines | `layerName`, `year` |
| 119 | omits metadata lines that have no value instead of writing empty ones | — (only `analysisLabel`/`analysisKind`, which stay at the top level) |
| 126 | writes drawn measurements and the sampled pixel value as their own block | `layerUnit`, `pixelValue` |
| 143 | quotes values carrying the delimiter so the columns do not shift | `layerClasses`, `stats` |
| 153 | starts with a UTF-8 BOM and separates rows with CRLF so Excel opens it clean | — |
| 161 | names the file after the layer, the cut and the date | — (this is the single-layer guarantee; leave it untouched) |
| 169 | falls back to the cut kind when the feature has no name | `layerName` |
| 180 | states the sign convention in the metadata when the layer is a signed flux | `layerName`, `signedFlux` |
| 190 | omits the sign convention for a layer whose values carry no sign | — |
| 199 | keeps the sign on the exported numbers so a spreadsheet can still sum them | `layerName`, `layerUnit`, `signedFlux`, `pixelValue`, `stats` |

Case 105 asserts on `# Camada:` and `# Ano:`, which moved out of `metadataRows` into
`layerHeaderRows`. Both lines are still in the file, so the assertions hold unchanged.

- [ ] **Step 2: Add the two new cases**

```ts
  it('writes one block per layer, each naming its own layer and year', () => {
    const { csv } = buildAnalysisCsv({
      ...base,
      drawnArea: 621.4,
      layers: [
        layer({
          layerName: 'Estoque de Carbono', layerUnit: 't C/ha', year: '2023',
          stats: { kind: 'continuous', stats: { min: 2, max: 91, mean: 38.2, count: 900 } },
        }),
        layer({
          layerName: 'Biomassa GEDI', layerUnit: 'Mg/ha',
          stats: { kind: 'continuous', stats: { min: 1, max: 60, mean: 14.7, count: 900 } },
        }),
      ],
    })

    expect(csv).toContain('# Camada: Estoque de Carbono')
    expect(csv).toContain('# Ano: 2023')
    expect(csv).toContain('# Camada: Biomassa GEDI')
    expect(csv).toContain('Média;38,2;t C/ha')
    expect(csv).toContain('Média;14,7;Mg/ha')
    // The recorte is identified once, above the per-layer blocks.
    expect(csv.match(/# Recorte: /g)).toHaveLength(1)
    expect(csv.match(/Área analisada;621,4;km²/g)).toHaveLength(1)
  })

  it('names a multi-layer file after the layer count', () => {
    const { filename } = buildAnalysisCsv({
      ...base,
      layers: [layer({ layerName: 'Estoque de Carbono' }), layer({ layerName: 'Biomassa GEDI' })],
    })

    expect(filename).toBe('caativar_2-camadas_petrolina_2026-08-24.csv')
  })
```

The existing case `names the file after the layer, the cut and the date` is now the single-layer guarantee — leave its assertion untouched.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/lib/exportAnalysis.test.ts`
Expected: FAIL — `LayerSnapshot` is not exported, and the new cases do not pass.

- [ ] **Step 4: Reshape `exportAnalysis.ts`**

Replace the `AnalysisSnapshot` interface at the top of `lib/mapa/exportAnalysis.ts` with:

```ts
/** One layer's part of the file: its identity and its numbers. */
export interface LayerSnapshot {
  layerName: string
  layerUnit?: string
  /** Classes of the categorical layer, to translate the code into a label. */
  layerClasses?: RasterClass[]
  /** Year of the current temporal stop, when the layer is time-navigable. */
  year?: string
  /** Layer whose values are a signed flux, negative where carbon was removed. */
  signedFlux?: boolean
  pixelValue: PixelValueResult | null
  stats: RasterStatsResult | null
}

/**
 * Everything an analysis needs to become a file.
 *
 * The recorte is identified once and the layers repeat below it, because the
 * panel now answers for every visible raster and a file per layer would leave
 * whoever wants to compare them joining spreadsheets by hand.
 */
export interface AnalysisSnapshot {
  analysisKind: string | null
  analysisLabel: string | null
  drawnArea: number | null
  drawnLength: number | null
  generatedAt: Date
  layers: LayerSnapshot[]
}
```

Change `metadataRows` to drop the layer lines, which move into the per-layer block:

```ts
function metadataRows(snap: AnalysisSnapshot): string[] {
  const recorte = [snap.analysisKind, snap.analysisLabel].filter(Boolean).join(' - ')
  const out = ['# Caativar']
  if (recorte) out.push(`# Recorte: ${recorte}`)
  out.push(`# Gerado em: ${isoDate(snap.generatedAt)}`)
  out.push('# Fonte: Estatística zonal, Google Earth Engine')
  return out
}

function layerHeaderRows(layer: LayerSnapshot): string[] {
  const out = [`# Camada: ${layer.layerName}`]
  // The panel drops the minus sign and says "sequestrou" in green instead, but
  // the file keeps the sign so a spreadsheet can sum sinks against sources.
  // Spelling the convention out is what stops the two readings from clashing.
  if (layer.signedFlux) {
    out.push('# Convenção: valor negativo = sequestro, positivo = emissão')
  }
  if (layer.year) out.push(`# Ano: ${layer.year}`)
  return out
}
```

Narrow `measurementRows` to the recorte-level measurements, and move the pixel value into the layer block:

```ts
function measurementRows(snap: AnalysisSnapshot): string[] {
  const out: string[] = []
  if (snap.drawnArea !== null) {
    out.push(row(['Área analisada', snap.drawnArea, 'km²']))
    out.push(row(['Área analisada', snap.drawnArea * 100, 'ha']))
  }
  if (snap.drawnLength !== null) out.push(row(['Comprimento', snap.drawnLength, 'km']))
  return out.length ? [row(['medida', 'valor', 'unidade']), ...out] : []
}

function pixelRows(layer: LayerSnapshot): string[] {
  if (layer.pixelValue === null) return []
  const out = [row(['medida', 'valor', 'unidade'])]
  out.push(row(['Valor do pixel', layer.pixelValue.value, layer.layerUnit ?? '']))
  if (layer.pixelValue.label) out.push(row(['Classe do pixel', layer.pixelValue.label, '']))
  return out
}
```

Change `statsRows` to take a `LayerSnapshot` (the four per-kind builders it delegates to are unchanged):

```ts
function statsRows(layer: LayerSnapshot): string[] {
  const unit = layer.layerUnit ?? ''
  switch (layer.stats?.kind) {
    case 'continuous':  return continuousRows(layer.stats, unit)
    case 'categorical': return categoricalRows(layer.stats, layer.layerClasses ?? [])
    case 'timeseries':  return timeSeriesRows(layer.stats, unit)
    case 'stocks':      return stockRows(layer.stats)
    default:            return []
  }
}
```

And rewrite the builder:

```ts
export function buildAnalysisCsv(snap: AnalysisSnapshot): { filename: string; csv: string } {
  const blocks = [metadataRows(snap), measurementRows(snap)]
  for (const layer of snap.layers) {
    blocks.push(layerHeaderRows(layer), pixelRows(layer), statsRows(layer))
  }

  const recorte = snap.analysisLabel ?? snap.analysisKind ?? 'analise'
  // A single layer keeps the name it has always had; only a comparison needs
  // the count, and naming it after the topmost layer would misdescribe the file.
  const subject = snap.layers.length === 1
    ? slug(snap.layers[0].layerName)
    : `${snap.layers.length}-camadas`

  const filename = ['caativar', subject, slug(recorte), isoDate(snap.generatedAt)]
    .join('_') + '.csv'

  return {
    filename,
    csv: BOM + blocks.filter((b) => b.length > 0).map((b) => b.join(EOL)).join(EOL + EOL) + EOL,
  }
}
```

- [ ] **Step 5: Adapt the one call site**

In `components/mapa/ResultsSidebar.tsx`, `handleDownload` becomes:

```ts
  function handleDownload() {
    const { filename, csv } = buildAnalysisCsv({
      analysisKind,
      analysisLabel,
      drawnArea,
      drawnLength,
      generatedAt: new Date(),
      layers: [{
        layerName:    activeRaster?.name ?? 'Análise',
        layerUnit:    activeRaster?.unit,
        layerClasses: activeRaster?.classes,
        signedFlux:   activeRaster?.signedFlux,
        year:         activeRaster ? temporalDate[activeRaster.id]?.slice(0, 4) : undefined,
        pixelValue,
        stats:        rasterStats,
      }],
    })

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
```

- [ ] **Step 6: Run tests and the build**

Run: `npx vitest run tests/lib/exportAnalysis.test.ts && npm run lint && npm run build`
Expected: all pass, including the two new cases.

- [ ] **Step 7: Commit**

```bash
git add lib/mapa/exportAnalysis.ts tests/lib/exportAnalysis.test.ts components/mapa/ResultsSidebar.tsx
git commit -m "feat: export one CSV covering every analysed layer"
```

---

### Task 6: the `LayerResultCard` component

**Files:**
- Create: `components/mapa/LayerResultCard.tsx`
- Modify: `components/mapa/StatsChart.tsx:136,158` (export `ErrorCard` and `SkeletonChart`)

`IcChevronDown` already exists at `components/mapa/icons.tsx:41` and takes `{ size }` — no icon work in this task.

**Interfaces:**
- Consumes: `LayerResult` and `SelectedGeometry` (Task 1), `runLayerAnalysis` and `currentAnalysisSeq` (Task 3), `resultSummary` (Task 4), `StatsChartView`, `ErrorCard`, `SkeletonChart`.
- Produces: `<LayerResultCard layer result expanded onToggle theme retryGeometry />`.

Nothing renders it yet — Task 7 wires it in.

- [ ] **Step 1: Export the two cards `StatsChart.tsx` keeps private**

Change line 136 to `export function ErrorCard(...)` and line 158 to `export function SkeletonChart(...)`. No other edit to that file in this task.

- [ ] **Step 2: Write the component**

Create `components/mapa/LayerResultCard.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { ErrorCard, SkeletonChart } from './StatsChart'
import FluxValue from './FluxValue'
import { IcChevronDown } from './icons'
import { currentAnalysisSeq, runLayerAnalysis } from '@/lib/mapa/analysisRunner'
import { resultSummary } from '@/lib/mapa/resultSummary'
import type {
  LayerResult, PlatformTheme, RasterLayerConfig, SelectedGeometry,
} from '@/types/mapa'

// Recharts stays out of the initial map bundle: only a card that actually
// opens a chart pulls it in.
const StatsChartView = dynamic(
  () => import('./StatsChart').then((m) => m.StatsChartView),
  { ssr: false, loading: () => null },
)

interface Props {
  layer:    RasterLayerConfig
  result:   LayerResult | undefined
  /** Temporal stop shown beside the layer name; undefined for a static layer. */
  date?:    string
  expanded: boolean
  onToggle: () => void
  theme:    PlatformTheme
  /** Geometry a retry re-measures, from the store. Null while nothing is selected. */
  geometry: SelectedGeometry | null
}

/**
 * One visible raster's result, collapsible.
 *
 * The header carries the whole answer -- layer, year and headline number -- so
 * three layers can be compared without opening three cards, which is the point
 * of the panel showing every active layer at all.
 */
export default function LayerResultCard({
  layer, result, date, expanded, onToggle, theme, geometry,
}: Props) {
  const c = theme.colors
  const summary = resultSummary(layer, result)
  const loading = !result || result.status === 'loading'

  return (
    <div style={{
      background: c.accentBg,
      border: `1px solid ${c.accentBd}`,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
    }}>
      <button
        className="ui-press"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '10px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-app), sans-serif',
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block',
            fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em',
            textTransform: 'uppercase', color: c.dim, overflowWrap: 'anywhere',
          }}>
            {layer.name}{date ? ` · ${date.slice(0, 4)}` : ''}
          </span>
          <span style={{
            display: 'block', marginTop: 3,
            fontSize: 15, fontWeight: 700, color: c.text,
            fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere',
          }}>
            {summary ?? (loading ? 'Calculando…' : '—')}
          </span>
        </span>
        <span style={{
          color: c.textDim, flexShrink: 0, marginTop: 2,
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform .15s',
        }}>
          <IcChevronDown size={14} />
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 12px' }}>
          {loading && <SkeletonChart theme={theme} />}

          {result?.status === 'error' && (
            <>
              <ErrorCard message={result.error ?? 'Falha ao calcular estatísticas.'} />
              {geometry && (
                <button
                  className="ui-press"
                  onClick={() => void runLayerAnalysis(layer, geometry, date, currentAnalysisSeq())}
                  style={{
                    marginTop: 8, width: '100%', height: 32,
                    background: 'transparent', border: `1px solid ${c.border}`,
                    borderRadius: 8, cursor: 'pointer', color: c.accentInk,
                    fontFamily: 'var(--font-app), sans-serif', fontSize: 12, fontWeight: 700,
                  }}
                >
                  Tentar novamente
                </button>
              )}
            </>
          )}

          {result?.status === 'ready' && result.pixelValue && (
            <div style={{ padding: '4px 0 8px' }}>
              {layer.signedFlux ? (
                <FluxValue
                  value={result.pixelValue.value}
                  unit={layer.unit}
                  theme={theme}
                  size={24}
                  format={(m) => m.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {result.pixelValue.color && (
                    <span style={{
                      width: 14, height: 14, borderRadius: 3,
                      background: result.pixelValue.color, flexShrink: 0,
                    }} />
                  )}
                  <span style={{
                    fontSize: 24, fontWeight: 800, color: c.text,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {result.pixelValue.value.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                  </span>
                  {result.pixelValue.label && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: c.dim }}>
                      {result.pixelValue.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {result?.status === 'ready' && result.stats && (
            // No caption: the card header already names the layer and the year.
            <StatsChartView
              theme={theme}
              stats={result.stats}
              classes={layer.classes}
              unit={layer.unit}
              signedFlux={layer.signedFlux}
            />
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run lint && npm run build`
Expected: pass. The component is unreferenced, which lint allows for an exported default.

- [ ] **Step 4: Commit**

```bash
git add components/mapa/LayerResultCard.tsx components/mapa/StatsChart.tsx
git commit -m "feat: add the per-layer result card"
```

---

### Task 7: the flip

**Files:**
- Modify: `components/mapa/MapView.tsx` (the four compute sites and the reactive effect)
- Modify: `components/mapa/ResultsSidebar.tsx`
- Modify: `components/mapa/StatsChart.tsx` (delete the default export, lines 94–134)
- Modify: `components/mapa/Mapa.tsx:36-50`
- Modify: `lib/mapa/store.ts` (remove the four singular fields)

`MapView` reads `setSelectedGeometry` and `clearResults` off the store the same way it
already reads `setDrawnArea` — `const setSelectedGeometry = useStore((s) => s.setSelectedGeometry)`
beside the other setter subscriptions at `MapView.tsx:423-424`.

**Interfaces:**
- Consumes: everything produced by Tasks 1–6.
- Produces: the finished behaviour. No new exports.

Atomic on purpose: a half-flipped panel does not compile.

- [ ] **Step 1: Point `MapView` at the runner**

Delete `geomHash` and `statsCacheKey` (`MapView.tsx:62-79`) and import from the runner instead:

```ts
import {
  bumpAnalysisSeq,
  currentAnalysisSeq,
  runVisibleRasterAnalyses,
} from '@/lib/mapa/analysisRunner'
```

**`selectedGeomRef` goes away entirely.** Its `vectorLayerId` field is written at four
points (594, 897, 932) and read at none — dead weight — and the rest of it is exactly
the store's `selectedGeometry`, which the sidebar needs for the retry button. Delete the
ref declaration at `385-391`, replace every `selectedGeomRef.current = null`
(577, 721, 1013, 1124, 1528) with `setSelectedGeometry(null)`, and take the value from
`useStore.getState().selectedGeometry` where the effect read it.

**`statsSeqRef` goes away too** (declared at `434`). `const seq = ++statsSeqRef.current`
(562, 850, 1425) becomes `const seq = bumpAnalysisSeq()`; the bare `statsSeqRef.current++`
(719, 1012, 1122, 1411) becomes `bumpAnalysisSeq()`; and the surviving comparison at `884`
becomes `if (seq !== currentAnalysisSeq()) return`. Every other `seq === statsSeqRef.current`
sits inside a compute block this task deletes.

The four singular setters (`setRasterStats`, `setPixelValue`, `setStatsLoading`,
`setStatsError`) disappear from the component: where they cleared, `clearResults()` takes
over; where they wrote a result, the runner writes it.

In `handleDrawCommit`, the Polygon branch becomes:

```ts
        if (feature.geometry.type === 'Polygon') {
          setDrawnArea(turfArea(feature) / 1_000_000)
          const geom: SelectedGeometry = {
            geometry: feature.geometry,
            geometryType: 'polygon',
          }
          setSelectedGeometry(geom)
          runVisibleRasterAnalyses(geom, seq)
        } else if (feature.geometry.type === 'LineString') {
```

and the Point branch, replacing everything from `const activeRaster` to the end of it:

```ts
        } else if (feature.geometry.type === 'Point') {
          const [lon, lat] = feature.geometry.coordinates as [number, number]
          const geom: SelectedGeometry = {
            geometry: feature.geometry,
            geometryType: 'point',
            lon, lat,
          }
          setSelectedGeometry(geom)
          runVisibleRasterAnalyses(geom, seq)
        }
```

In `runFeatureAnalysis`, delete the `pickStatsTarget` call and its `if (!raster) return`,
then replace the whole `if (geom.type === 'Polygon' || ...) { ... } else if (geom.type === 'Point') { ... }`
block with:

```ts
        if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
          const selected: SelectedGeometry = { geometry: geom, geometryType: 'polygon' }
          setSelectedGeometry(selected)
          setDrawnArea(turfArea({ type: 'Feature', geometry: geom, properties: {} }) / 1_000_000)
          runVisibleRasterAnalyses(selected, seq)
        } else if (geom.type === 'Point') {
          const [lon, lat] = geom.coordinates as [number, number]
          const selected: SelectedGeometry = {
            geometry: geom, geometryType: 'point', lon, lat,
          }
          setSelectedGeometry(selected)
          runVisibleRasterAnalyses(selected, seq)
        }
```

Also delete the two lines above that block that resolved the single raster's stop and
primed the old context key:

```ts
        const tempDate = useStore.getState().temporalDate[raster.id]
        prevStatsContextRef.current = `${raster.id}:${tempDate ?? 'static'}`
```

`pickStatsTarget` (`793-802`) is deleted with them: picking one raster to measure is
precisely the behaviour being removed. **Keep** `topVisibleRasterIndex`, which it called —
`clickableRecortes` in `lib/mapa/analysisTargets.ts` still needs it to decide whether a
click can land anywhere at all, and the onboarding hint is unchanged.

One behavioural consequence to accept deliberately: `runFeatureAnalysis` no longer
returns early when no raster is visible, so a click on a vector with no raster underneath
now highlights and labels the feature and produces no cards, where before it did nothing
at all. That is what the hint already tells the user to expect.

- [ ] **Step 2: Turn the reactive effect into the diff**

Replace the whole effect (`MapView.tsx:1390-1493`) and the `activeRasterId` / `activeTemporalDateKey` / `prevStatsContextRef` block above it with:

```ts
  // Reactive recomputation. Switching a layer on, or stepping a year, leaves the
  // selection in place: `pendingAnalyses` inside runVisibleRasterAnalyses returns
  // only the layers whose stop is not already answered, so a layer that did not
  // change is never re-measured.
  const fetchedTileUrls = useStore((s) => s.fetchedTileUrls)
  const selectedGeometry = useStore((s) => s.selectedGeometry)

  useEffect(() => {
    if (!selectedGeometry) return
    runVisibleRasterAnalyses(selectedGeometry, currentAnalysisSeq())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, temporalDate, temporalTileUrls, fetchedTileUrls, selectedGeometry])
```

Add `currentAnalysisSeq` to the runner import. `results` is deliberately **not** a
dependency and must not be subscribed to here: the effect writes into it, so
depending on it would re-run the effect on every card that lands. `pendingAnalyses`
reads the current `results` through `useStore.getState()` inside the runner, which
is always fresh.

- [ ] **Step 3: Render the cards in `ResultsSidebar`**

Replace the four singular store reads with `results`, and derive the visible rasters:

```ts
  const results = useStore((s) => s.results)
  const layers  = useStore((s) => s.layers)
  const temporalDate = useStore((s) => s.temporalDate)
  const selectedGeometry = useStore((s) => s.selectedGeometry)

  const rasters = layers.filter(
    (l): l is RasterLayerConfig => l.type === 'raster' && l.visible,
  )
  const hasContent = hasAnalysisContent({ drawnArea, drawnLength, results, layers })
```

Add the expansion state, seeded with the topmost raster:

```ts
  // The topmost layer opens; the rest answer from their headers until asked for.
  // `null` means untouched, which is not the same as "all closed": an empty Set
  // has to stay empty, or collapsing the top card would spring it back open.
  const [expanded, setExpanded] = useState<Set<string> | null>(null)
  const topId = rasters[0]?.id
  const isExpanded = (id: string) => (expanded ? expanded.has(id) : id === topId)
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev ?? (topId ? [topId] : []))
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
```

Replace `<StatsChart theme={theme} />` with:

```tsx
      {rasters.map((raster) => (
        <LayerResultCard
          key={raster.id}
          layer={raster}
          result={results[raster.id]}
          date={raster.gee?.temporal ? temporalDate[raster.id] : undefined}
          expanded={isExpanded(raster.id)}
          onToggle={() => toggle(raster.id)}
          theme={theme}
          geometry={selectedGeometry}
        />
      ))}
```

Delete the `{pixelValue !== null && (...)}` card — it lives in `LayerResultCard` now — and the `dynamic(() => import('./StatsChart'))` at the top of the file.

`canDownload` becomes:

```ts
  const measured = rasters.filter((r) => results[r.id]?.status === 'ready')
  const canDownload = hasContent && measured.length > 0
```

and `handleDownload` builds one snapshot per measured layer:

```ts
      layers: measured.map((raster) => ({
        layerName:    raster.name,
        layerUnit:    raster.unit,
        layerClasses: raster.classes,
        signedFlux:   raster.signedFlux,
        year:         temporalDate[raster.id]?.slice(0, 4),
        pixelValue:   results[raster.id]?.pixelValue ?? null,
        stats:        results[raster.id]?.stats ?? null,
      })),
```

`showEmptyHint` keeps its meaning, now written against the derived list:

```ts
  const activeRaster = rasters[0]
  const showEmptyHint = !hasContent && !!activeRaster
```

- [ ] **Step 4: Delete the store-bound `StatsChart`**

Remove the default export at `components/mapa/StatsChart.tsx:94-134`. It reads `rasterStats` from the store and builds its caption from "the visible raster", a notion this change retires. `StatsChartView`, `ErrorCard`, `SkeletonChart` and every chart below them stay. Drop the now-unused `useStore` import if nothing else in the file uses it.

- [ ] **Step 5: Use the shared predicate in `Mapa.tsx`**

Replace `Mapa.tsx:36-50` with:

```ts
  const drawnArea   = useStore((s) => s.drawnArea)
  const drawnLength = useStore((s) => s.drawnLength)
  const results     = useStore((s) => s.results)
  const layers      = useStore((s) => s.layers)

  // Same predicate ResultsSidebar renders on -- shared, because two copies of
  // it is what let the panel and the controls disagree about being open.
  const resultsHasContent = hasAnalysisContent({ drawnArea, drawnLength, results, layers })
  const activeRaster = layers.some((l) => l.type === 'raster' && l.visible)
  const resultsVisible = resultsHasContent || activeRaster
```

- [ ] **Step 6: Remove the singular fields from the store**

Delete `rasterStats`, `pixelValue`, `statsLoading`, `statsError` and their four setters from the `MapaStore` interface, the initial state and the action list in `lib/mapa/store.ts`. In `clearDrawings`, remove the four lines that reset them; `results: {}` (added in Task 1) stays.

- [ ] **Step 7: Verify**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all pass. A TS error naming one of the four deleted fields means a consumer was missed — `grep -rn "rasterStats\|setPixelValue\|statsLoading\|statsError" --include=*.tsx --include=*.ts .` should return nothing outside `node_modules`.

- [ ] **Step 8: Check it in the running app**

Run `npm run dev`, sign in, open `http://localhost:3000/mapa` and confirm:

1. Two rasters on (e.g. Carbono › Estoque total and Carbono › Biomassa) plus Território › Limites de referência; click a municipality. Two cards appear, each naming its layer, both computing in parallel, the top one expanded.
2. Collapse the top card: its headline number stays readable in the header.
3. Switch a third raster on without clicking again: its card appears and computes on its own.
4. Step the year of a temporal layer: only that card recomputes; the others do not flicker.
5. Switch a layer off: its card disappears; switch it back on: the result returns without a new request (Network tab shows none).
6. "Baixar CSV": one file, one `# Recorte:` header, one block per layer.
7. Switch every raster off: the panel falls back to the onboarding hint, unchanged.

- [ ] **Step 9: Commit**

```bash
git add components/mapa/MapView.tsx components/mapa/ResultsSidebar.tsx \
        components/mapa/StatsChart.tsx components/mapa/Mapa.tsx lib/mapa/store.ts
git commit -m "feat: show a result card for every active layer"
```

---

## Verification checklist

- [ ] `npx vitest run` — all suites, including the three new/extended files
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run contrast` (unchanged by this work, but CI runs it)
- [ ] The seven manual checks in Task 7 Step 8
