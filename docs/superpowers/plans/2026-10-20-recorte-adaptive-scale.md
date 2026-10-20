# Recorte-adaptive layer scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a feature of a Território recorte is selected in `/mapa`, continuous rasters are redrawn on that feature's own color scale, and the legend says so; categorical legends list only the classes present in the feature.

**Architecture:** A new session-protected route `POST /api/gee/scale` resolves the layer and the feature on the server and returns, from one Earth Engine reduction, the feature's stretch (lowest p2 to highest p98 across the years) and its per-year real min/max, cached per layer and feature. The client fetches the scale for each visible continuous GEE raster, then requests a tile from the unchanged `/api/gee/tile` with only `visParams.min/max` replaced. A pure `activeRaster` rule decides which tile and which scale are on screen, for both `MapView` and the legend.

**Tech Stack:** Next.js 16 (App Router, Node runtime routes), React 19, Zustand 5, MapLibre GL 5, `@google/earthengine`, Vitest 4 (node environment).

**Spec:** `docs/superpowers/specs/2026-10-20-recorte-adaptive-scale-design.md`

## Global Constraints

- Work in the worktree `/tmp/claude-1002/-home-ezequias-oca-plataforma-carbono-mvp/edc1ac9f-c483-4e9c-a085-f1a7717d93b7/scratchpad/recorte-scale`, on branch `feat/recorte-adaptive-scale`. Every path below is relative to it; `$W` names it in commands.
- Code, comments and docs in English. User-facing strings stay Portuguese; the only new one is `Escala ajustada a {nome}`.
- Every Earth Engine image goes through `buildEeImage` (`lib/mapa/geeImage.ts`) — no route builds its own `ee.Image`.
- The new API route calls `getAuthenticatedRequest(req)` and returns `unauthorizedResponse()` before any work. Error messages stay generic (`'Failed to process Earth Engine request'`, `'Earth Engine unavailable'`).
- The asset is read from `config/mapa/layers.json` on the server, never from the request body.
- `/api/gee/tile` and the Territórios story are not modified.
- Commit messages: conventional prefix (`feat:`, `test:`, `docs:`), English, **no `Co-Authored-By` or any Claude attribution trailer**.
- CI does not run `npm test` or `npm run lint`: run both locally before the PR.
- Never `pkill -f`; stop a dev server by its pid.

## Review Focus

1. **The selection changes while a scale is loading.** A late answer for feature A must never paint the map or the legend while feature B is selected — pinned in Task 5 (`pendingRecorteWork` ignores another feature's key) and Task 6 (`activeRaster` ignores another feature's entry).
2. **The year is stepped before the recorte tile for that year exists.** The map and the legend must show the biome tile of the *new* year, not the recorte tile of the old one — pinned in Task 6 (`activeRaster` test "a year stepped…").
3. **A series with gaps (`biomassa_esa_lenhosa`, 10 declared dates).** The reduction must cover exactly the declared years, not the full `dateRange` — pinned in Task 4 (service test on the years passed to the reduction).
4. **A one-sided signed flux** (a feature that only emits or only removes). Zero must stay on the bar, at the palette's white — pinned in Task 1 (two `recorteScale` tests).
5. **The basemap is swapped while a recorte scale is on screen.** The style reload re-adds every source through `addLayerToMap`, which must re-add the *recorte* tile — pinned in Task 8 (rendered check step).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/mapa/recorteScale.ts` (new, pure) | Types (`Stretch`, `ScaleRange`, `ScaleResponse`, `YearStats`, `RecorteScaleEntry`), `recorteScaleKey`, `bandOf`, `parseYearStats`, `recorteScale`. Shared by server and client. |
| `lib/mapa/recorteRegistry.ts` | + `getFeicaoByIndex` (feature by file position = MapLibre `generateId`). |
| `lib/mapa/recorteScaleCompute.ts` (new, server-only) | The one GEE reduction: stacked years → per-year min/max/p2/p98. |
| `lib/mapa/recorteScaleService.ts` (new, server-only) | Which layers/features can re-scale; response cache (24 h) and in-flight dedupe. |
| `app/api/gee/scale/route.ts` (new) | HTTP: auth, rate limit, validation, cache hit, 503/500. |
| `lib/mapa/tileCache.ts` | `MAX_ENTRIES` 200 → 1000. |
| `types/mapa.ts` | `SelectedRecorte`, `SelectedGeometry.recorte`. |
| `lib/mapa/store.ts` | `recorteScales`, `recorteTileUrls`. |
| `lib/mapa/recorteScaleRunner.ts` (new) | `pendingRecorteWork` (pure) + `runRecorteScales` (fetches scale, then tile). |
| `lib/mapa/activeRaster.ts` (new, pure) | Which tile and which scale are on screen. |
| `components/mapa/MapView.tsx` | Attach `recorte` to the selection; `activeRaster` in the add path; tile-sync effect; runner effect. |
| `lib/mapa/presentClasses.ts` (new, pure) | Categorical classes present in the feature. |
| `components/mapa/overlays/FloatingLegend.tsx` | Recorte scale on the continuous bar, caption, filtered classes. |
| `CLAUDE.md` | `/api/gee/scale` in the GEE routes section. |

---

### Task 1: Pure scale math

**Files:**
- Create: `lib/mapa/recorteScale.ts`
- Test: `tests/lib/recorteScale.test.ts`

**Interfaces:**
- Consumes: `DataRange` from `lib/mapa/dataRange.ts` (`{ min: number; max: number }`).
- Produces (later tasks import these exact names):
  - `interface Stretch { min: number; max: number }`
  - `type ScaleRange = DataRange | { byYear: Record<string, DataRange> }`
  - `interface ScaleResponse { stretch: Stretch | null; range: ScaleRange | null }`
  - `interface YearStats { min: number | null; max: number | null; p2: number | null; p98: number | null }`
  - `type RecorteScaleEntry = { status: 'loading' } | { status: 'ready'; stretch: Stretch | null; range: ScaleRange | null } | { status: 'error' }`
  - `const STATIC_KEY = 'static'`
  - `recorteScaleKey(layerId: string, recorteId: string, feicaoIndex: number): string`
  - `bandOf(key: string): string`
  - `parseYearStats(raw: Record<string, unknown> | null, keys: string[]): Record<string, YearStats>`
  - `recorteScale(layer: { signedFlux?: boolean; gee?: { visParams?: { min?: number; max?: number } } }, byYear: Record<string, YearStats>): ScaleResponse`

- [ ] **Step 0: Prepare the worktree**

```bash
df -h / | tail -1          # needs ~1.5 GB free
cd $W && npm ci
cp /home/ezequias/oca/plataforma-carbono-mvp/.env.local $W/.env.local   # gitignored; needed by Task 8
```

Expected: `npm ci` finishes without errors; `git -C $W status --short` shows nothing (`.env.local` is ignored).

- [ ] **Step 1: Write the failing test**

`tests/lib/recorteScale.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  bandOf,
  parseYearStats,
  recorteScale,
  recorteScaleKey,
  STATIC_KEY,
  type YearStats,
} from '@/lib/mapa/recorteScale'

const stats = (p2: number | null, p98: number | null, min = p2, max = p98): YearStats =>
  ({ min, max, p2, p98 })
const stock = { gee: { visParams: { min: 0, max: 160 } } }
const netFlux = { signedFlux: true, gee: { visParams: { min: -100, max: 300 } } }

describe('recorteScale', () => {
  it('stretches a static layer from its p2 to its p98, and keeps its real extremes', () => {
    expect(recorteScale(stock, { [STATIC_KEY]: stats(12, 48, 3, 90) })).toEqual({
      stretch: { min: 12, max: 48 },
      range: { min: 3, max: 90 },
    })
  })

  it('takes the lowest p2 and the highest p98 across the years of a series', () => {
    const out = recorteScale(stock, { '2010': stats(10, 40), '2020': stats(5, 30), '2021': stats(15, 60) })

    expect(out.stretch).toEqual({ min: 5, max: 60 })
    expect(out.range).toEqual({ byYear: {
      '2010': { min: 10, max: 40 }, '2020': { min: 5, max: 30 }, '2021': { min: 15, max: 60 },
    } })
  })

  it('ignores a year with no valid pixel', () => {
    const out = recorteScale(stock, { '2010': stats(null, null), '2020': stats(5, 30) })

    expect(out.stretch).toEqual({ min: 5, max: 30 })
    expect(out.range).toEqual({ byYear: { '2020': { min: 5, max: 30 } } })
  })

  it('keeps the biome scale when no year has a pixel', () => {
    expect(recorteScale(stock, { '2010': stats(null, null) })).toEqual({ stretch: null, range: null })
    expect(recorteScale(stock, { [STATIC_KEY]: stats(null, null) })).toEqual({ stretch: null, range: null })
  })

  it('keeps the biome scale when the spread is degenerate', () => {
    expect(recorteScale(stock, { [STATIC_KEY]: stats(7, 7) }).stretch).toBeNull()
  })

  it('scales a signed flux by one factor, so zero keeps its place on the palette', () => {
    // k = max(-20 / -100, 30 / 300) = 0.2
    const { stretch } = recorteScale(netFlux, { [STATIC_KEY]: stats(-20, 30) })

    expect(stretch!.min).toBeCloseTo(-20)
    expect(stretch!.max).toBeCloseTo(60)
    // The palette's white sits at 1/4 of the bar, where zero falls on -100..300.
    expect((0 - stretch!.min) / (stretch!.max - stretch!.min)).toBeCloseTo(0.25)
  })

  it('keeps zero on the bar for a feature that only emits', () => {
    // k = max(5 / -100, 150 / 300) = 0.5
    const { stretch } = recorteScale(netFlux, { [STATIC_KEY]: stats(5, 150) })

    expect(stretch!.min).toBeCloseTo(-50)
    expect(stretch!.max).toBeCloseTo(150)
  })

  it('keeps zero on the bar for a feature that only removes', () => {
    // k = max(-60 / -100, -10 / 300) = 0.6
    const { stretch } = recorteScale(netFlux, { [STATIC_KEY]: stats(-60, -10) })

    expect(stretch!.min).toBeCloseTo(-60)
    expect(stretch!.max).toBeCloseTo(180)
  })
})

describe('parseYearStats', () => {
  it('reads the four outputs of each band of the reduction', () => {
    expect(parseYearStats({ y2010_min: 1, y2010_max: 9, y2010_p2: 2, y2010_p98: 8 }, ['2010']))
      .toEqual({ '2010': { min: 1, max: 9, p2: 2, p98: 8 } })
  })

  it('turns a missing or null output into null', () => {
    const empty = { min: null, max: null, p2: null, p98: null }

    expect(parseYearStats({ y2010_min: null }, ['2010'])).toEqual({ '2010': empty })
    expect(parseYearStats(null, [STATIC_KEY])).toEqual({ [STATIC_KEY]: empty })
  })
})

describe('keys', () => {
  it('names the layer, the recorte and the feature', () => {
    expect(recorteScaleKey('estoque_carbono', 'municipios', 174)).toBe('estoque_carbono|municipios|174')
  })

  it('prefixes a band name so a year is never a bare number', () => {
    expect(bandOf('2010')).toBe('y2010')
    expect(bandOf(STATIC_KEY)).toBe('ystatic')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd $W && npx vitest run tests/lib/recorteScale.test.ts`
Expected: FAIL — cannot resolve `@/lib/mapa/recorteScale`.

- [ ] **Step 3: Write the implementation**

`lib/mapa/recorteScale.ts`:

```ts
// The color scale of a continuous raster inside one feature of a recorte: what
// the map recolors with and the legend prints while that feature is selected.
// Pure and shared: the server builds it from one reduction (/api/gee/scale),
// and the client keys its caches with the same `recorteScaleKey`.

import type { DataRange } from '@/lib/mapa/dataRange'

export interface Stretch { min: number; max: number }

/** Same shape as an entry of config/mapa/dataRanges.json, so `dataRangeFor` reads it. */
export type ScaleRange = DataRange | { byYear: Record<string, DataRange> }

export interface ScaleResponse {
  /** Null keeps the biome scale: no valid pixel, or a degenerate spread. */
  stretch: Stretch | null
  /** Real extremes for the legend's ends; null when no year had a pixel. */
  range:   ScaleRange | null
}

/** One year of the reduction; null where the year had no valid pixel. */
export interface YearStats { min: number | null; max: number | null; p2: number | null; p98: number | null }

export type RecorteScaleEntry =
  | { status: 'loading' }
  | { status: 'ready'; stretch: Stretch | null; range: ScaleRange | null }
  | { status: 'error' }

/** The single "year" of a static layer. */
export const STATIC_KEY = 'static'

export function recorteScaleKey(layerId: string, recorteId: string, feicaoIndex: number): string {
  return `${layerId}|${recorteId}|${feicaoIndex}`
}

/** Band name of a year in the stacked image; a band name cannot start with a digit. */
export function bandOf(key: string): string {
  return `y${key}`
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** The reduction's `<band>_min`, `_max`, `_p2` and `_p98` outputs, per year. */
export function parseYearStats(raw: Record<string, unknown> | null, keys: string[]): Record<string, YearStats> {
  const read = (key: string, output: string) => {
    const v = raw?.[`${bandOf(key)}_${output}`]
    return finite(v) ? v : null
  }
  return Object.fromEntries(keys.map((key) => [key, {
    min: read(key, 'min'), max: read(key, 'max'), p2: read(key, 'p2'), p98: read(key, 'p98'),
  }]))
}

interface ScaleLayer {
  signedFlux?: boolean
  gee?: { visParams?: { min?: number; max?: number } }
}

export function recorteScale(layer: ScaleLayer, byYear: Record<string, YearStats>): ScaleResponse {
  const years = Object.entries(byYear)

  const ranges: Record<string, DataRange> = {}
  for (const [year, s] of years) {
    if (finite(s.min) && finite(s.max)) ranges[year] = { min: s.min, max: s.max }
  }
  const range: ScaleRange | null = STATIC_KEY in byYear
    ? ranges[STATIC_KEY] ?? null
    : Object.keys(ranges).length > 0 ? { byYear: ranges } : null

  const lows = years.map(([, s]) => s.p2).filter(finite)
  const highs = years.map(([, s]) => s.p98).filter(finite)
  if (lows.length === 0 || highs.length === 0) return { stretch: null, range }

  return { stretch: stretchOf(layer, Math.min(...lows), Math.max(...highs)), range }
}

function stretchOf(layer: ScaleLayer, low: number, high: number): Stretch | null {
  if (!(low < high)) return null

  // A signed flux's palette puts its neutral white where zero falls on the
  // biome scale (a quarter of the way on -100..300). Scaling both ends by one
  // factor keeps zero there, and on the bar even when the feature only emits
  // or only removes.
  const min = layer.gee?.visParams?.min
  const max = layer.gee?.visParams?.max
  if (layer.signedFlux && finite(min) && finite(max) && min < 0 && max > 0) {
    const k = Math.max(low / min, high / max)
    return { min: min * k, max: max * k }
  }
  return { min: low, max: high }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd $W && npx vitest run tests/lib/recorteScale.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
cd $W && git add lib/mapa/recorteScale.ts tests/lib/recorteScale.test.ts
git commit -m "feat: recorte color scale math"
```

---

### Task 2: Resolve a feature by its file position

**Files:**
- Modify: `lib/mapa/recorteRegistry.ts` (`IndexedFeicao` near line 75; `getFeicao` near line 150)
- Test: `tests/lib/recorteRegistry.test.ts` (append)

**Interfaces:**
- Consumes: `featureEntries` (already returns `index` per entry).
- Produces: `getFeicaoByIndex(recorteId: string, position: number): FeicaoResolvida | null`.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/recorteRegistry.test.ts`, and add `getFeicaoByIndex` to its import line (`import { getFeicao, getFeicaoByIndex, listFeicoes, listRecortes } from '@/lib/mapa/recorteRegistry'`):

```ts
describe('getFeicaoByIndex', () => {
  it('resolves a feature by its position in the file, the id MapLibre generates', () => {
    // The two São Domingos sit at file indices 174 and 691 (see listFeicoes).
    expect(getFeicaoByIndex('municipios', 174)).toMatchObject({ id: 'sao-domingos', context: 'BA' })
    expect(getFeicaoByIndex('municipios', 691)).toMatchObject({ id: 'sao-domingos-2', context: 'PB' })
  })

  it('resolves the same feature getFeicao does', () => {
    // Bahia is the second feature of estados.geojson.
    expect(getFeicaoByIndex('estados', 1)).toEqual(getFeicao('estados', 'bahia'))
  })

  it('returns null for a position past the end or an unknown recorte', () => {
    expect(getFeicaoByIndex('estados', 999)).toBeNull()
    expect(getFeicaoByIndex('nao-existe', 0)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd $W && npx vitest run tests/lib/recorteRegistry.test.ts -t getFeicaoByIndex`
Expected: FAIL — `getFeicaoByIndex is not a function`.

- [ ] **Step 3: Write the implementation**

In `lib/mapa/recorteRegistry.ts`, declare the position on the indexed feature:

```ts
interface IndexedFeicao extends FeicaoInfo {
  /** Position in the GeoJSON, which is also the id MapLibre's `generateId` gives the feature. */
  index:    number
  geometry: Geometry
}
```

Replace `getFeicao` with a shared resolver and the two lookups:

```ts
function resolved(entry: RecorteIndex, found: IndexedFeicao): FeicaoResolvida {
  // @turf/area returns m² on the ellipsoid. The document works in hectares, the
  // unit whoever deals with carbon and land use already thinks in.
  const areaM2 = turfArea({ type: 'Feature', geometry: found.geometry, properties: {} })

  return {
    id:       found.id,
    name:     found.name,
    ...(found.context ? { context: found.context } : {}),
    geometry: found.geometry,
    bbox:     computeBbox(found.geometry),
    areaHa:   areaM2 / 10_000,
    boundary: entry.boundary,
  }
}

/** One feature's geometry, bbox and geodesic area, or null when unknown. */
export function getFeicao(recorteId: string, feicaoId: string): FeicaoResolvida | null {
  const entry = index(recorteId)
  const found = entry?.feicoes.find((f) => f.id === feicaoId)
  return entry && found ? resolved(entry, found) : null
}

/**
 * The same, by position in the file: what a click on the map knows, since the
 * map's sources number features with `generateId`. An unlabelled feature has
 * no entry, so it resolves to null.
 */
export function getFeicaoByIndex(recorteId: string, position: number): FeicaoResolvida | null {
  const entry = index(recorteId)
  const found = entry?.feicoes.find((f) => f.index === position)
  return entry && found ? resolved(entry, found) : null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd $W && npx vitest run tests/lib/recorteRegistry.test.ts`
Expected: PASS (all, old and new).

- [ ] **Step 5: Commit**

```bash
cd $W && git add lib/mapa/recorteRegistry.ts tests/lib/recorteRegistry.test.ts
git commit -m "feat: resolve a recorte feature by its file position"
```

---

### Task 3: The Earth Engine reduction

**Files:**
- Create: `lib/mapa/recorteScaleCompute.ts`
- Test: `tests/lib/recorteScaleCompute.test.ts`

**Interfaces:**
- Consumes: `buildEeImage` (`lib/mapa/geeImage.ts`), `evaluate` (`lib/mapa/geeEvaluate.ts`), `analysisScale(nativeScale, regionM2, budget)` (`lib/mapa/layerResult.ts`), `bandOf`, `parseYearStats`, `STATIC_KEY`, `YearStats` (Task 1).
- Produces:
  - `const SCALE_PIXEL_BUDGET = 5e7`
  - `reduceRecorteStats(ee: any, asset: GeeAssetConfig, keys: string[], geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }, regionM2: number): Promise<Record<string, YearStats>>`

- [ ] **Step 1: Write the failing test**

`tests/lib/recorteScaleCompute.test.ts`:

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

import { analysisScale } from '@/lib/mapa/layerResult'
import { reduceRecorteStats, SCALE_PIXEL_BUDGET } from '@/lib/mapa/recorteScaleCompute'
import { STATIC_KEY } from '@/lib/mapa/recorteScale'

/** Just enough of `ee` to record what the reduction is built from. */
function fakeEe() {
  const reduceRegion = vi.fn((args: unknown) => ({ reduction: args }))
  const cat = vi.fn((bands: unknown[]) => ({ bands, reduceRegion }))
  const ee = {
    Image: { cat },
    Reducer: {
      minMax: () => ({ combine: (opts: unknown) => ({ minMaxWith: opts }) }),
      percentile: (ps: number[]) => ({ percentile: ps }),
    },
    Geometry: (g: unknown) => ({ geometry: g }),
  }
  return { ee, cat, reduceRegion }
}

const asset = { type: 'imageCollection' as const, id: 'projects/x/esa', band: 'agb', scale: 100 }
const geometry = { type: 'Polygon' as const, coordinates: [[[-40, -8], [-40, -7], [-39, -7], [-40, -8]]] }

describe('reduceRecorteStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stacks one band per year, each built by buildEeImage at January 1st', async () => {
    mocks.evaluate.mockResolvedValueOnce({})
    const { ee, cat } = fakeEe()

    await reduceRecorteStats(ee, asset, ['2010', '2020'], geometry, 1e9)

    expect(mocks.buildEeImage.mock.calls.map((c) => c[2])).toEqual(['2010-01-01', '2020-01-01'])
    expect(cat).toHaveBeenCalledWith([
      { name: 'y2010', date: '2010-01-01' },
      { name: 'y2020', date: '2020-01-01' },
    ])
  })

  it('builds a static layer without a date', async () => {
    mocks.evaluate.mockResolvedValueOnce({})
    const { ee } = fakeEe()

    await reduceRecorteStats(ee, asset, [STATIC_KEY], geometry, 1e9)

    expect(mocks.buildEeImage.mock.calls[0][2]).toBeUndefined()
  })

  it('shares the pixel budget across the years, so a long series is read coarser', async () => {
    mocks.evaluate.mockResolvedValueOnce({})
    const { ee, reduceRegion } = fakeEe()
    const years = Array.from({ length: 39 }, (_, i) => String(1985 + i))
    const regionM2 = 5.6e11   // roughly Bahia's share of the Caatinga

    await reduceRecorteStats(ee, { ...asset, scale: 30 }, years, geometry, regionM2)

    const scale = analysisScale(30, regionM2, SCALE_PIXEL_BUDGET / 39)
    expect(scale).toBeGreaterThan(analysisScale(30, regionM2))
    expect(reduceRegion).toHaveBeenCalledWith(expect.objectContaining({ scale, bestEffort: true }))
  })

  it('returns the numbers of each year, null where the year had none', async () => {
    mocks.evaluate.mockResolvedValueOnce({ y2010_min: 1, y2010_max: 9, y2010_p2: 2, y2010_p98: 8 })
    const { ee } = fakeEe()

    await expect(reduceRecorteStats(ee, asset, ['2010', '2020'], geometry, 1e9)).resolves.toEqual({
      '2010': { min: 1, max: 9, p2: 2, p98: 8 },
      '2020': { min: null, max: null, p2: null, p98: null },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd $W && npx vitest run tests/lib/recorteScaleCompute.test.ts`
Expected: FAIL — cannot resolve `@/lib/mapa/recorteScaleCompute`.

- [ ] **Step 3: Write the implementation**

`lib/mapa/recorteScaleCompute.ts`:

```ts
// The one Earth Engine reduction behind a recorte scale (/api/gee/scale): the
// minimum, maximum and 2nd and 98th percentiles of every year of a layer inside
// one feature, in a single evaluate. Each year is built by buildEeImage, so the
// numbers are in the units the tiles are drawn in.

import 'server-only'

import { buildEeImage, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import { analysisScale } from '@/lib/mapa/layerResult'
import { bandOf, parseYearStats, STATIC_KEY, type YearStats } from '@/lib/mapa/recorteScale'

/**
 * Pixels the whole reduction may read, shared by its bands. A band per year
 * costs as much as a reduction of its own, so the results panel's per-band
 * PIXEL_BUDGET would let `solo_carbono` (39 years at 30 m) run past
 * GEE_TIMEOUT_MS over a large state. Tuned against Bahia in the rendered check.
 */
export const SCALE_PIXEL_BUDGET = 5e7

export async function reduceRecorteStats(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ee: any,
  asset: GeeAssetConfig,
  keys: string[],
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown },
  regionM2: number,
): Promise<Record<string, YearStats>> {
  const bands = keys.map((key) =>
    buildEeImage(ee, asset, key === STATIC_KEY ? undefined : `${key}-01-01`).rename(bandOf(key)))

  const reduction = ee.Image.cat(bands).reduceRegion({
    reducer:    ee.Reducer.minMax().combine({ reducer2: ee.Reducer.percentile([2, 98]), sharedInputs: true }),
    geometry:   ee.Geometry(geometry),
    scale:      analysisScale(asset.scale ?? 500, regionM2, SCALE_PIXEL_BUDGET / keys.length),
    maxPixels:  1e9,
    tileScale:  4,
    bestEffort: true,
  })

  return parseYearStats(await evaluate<Record<string, unknown> | null>(reduction), keys)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd $W && npx vitest run tests/lib/recorteScaleCompute.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd $W && git add lib/mapa/recorteScaleCompute.ts tests/lib/recorteScaleCompute.test.ts
git commit -m "feat: one Earth Engine reduction for a recorte scale"
```

---

### Task 4: Service, route and tile cache

**Files:**
- Create: `lib/mapa/recorteScaleService.ts`, `app/api/gee/scale/route.ts`
- Modify: `lib/mapa/tileCache.ts:17`, `CLAUDE.md` (section "GEE routes")
- Test: `tests/lib/recorteScaleService.test.ts`, `tests/app/scaleRoute.test.ts`

**Interfaces:**
- Consumes: `reduceRecorteStats` (Task 3); `getFeicaoByIndex`, `listRecortes`, `FeicaoResolvida` (Task 2 / existing); `recorteScale`, `recorteScaleKey`, `STATIC_KEY`, `ScaleResponse` (Task 1); `layerYears` (`lib/mapa/dataRange.ts`); `initGee`, `getEe` (`lib/mapa/geeAuth.ts`).
- Produces:
  - `getScaleLayer(layerId: string): RasterLayerConfig | null`
  - `getScaleFeicao(layer: RasterLayerConfig, recorteId: string, feicaoIndex: number): FeicaoResolvida | null`
  - `cachedRecorteScale(key: string): ScaleResponse | null`
  - `computeRecorteScale(key: string, layer: RasterLayerConfig, feicao: FeicaoResolvida): Promise<ScaleResponse>`
  - `POST /api/gee/scale` with body `{ layerId: string; recorteId: string; feicaoIndex: number }` → `ScaleResponse` JSON.

- [ ] **Step 1: Write the failing service test**

`tests/lib/recorteScaleService.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  reduce: vi.fn(),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({ initGee: vi.fn(async () => {}), getEe: vi.fn(() => ({})) }))
vi.mock('@/lib/mapa/recorteScaleCompute', () => ({ reduceRecorteStats: mocks.reduce }))

import {
  cachedRecorteScale,
  computeRecorteScale,
  getScaleFeicao,
  getScaleLayer,
} from '@/lib/mapa/recorteScaleService'
import { recorteScaleKey } from '@/lib/mapa/recorteScale'

const yearStats = { min: 1, max: 9, p2: 2, p98: 8 }

describe('getScaleLayer', () => {
  it('accepts a continuous Earth Engine raster', () => {
    expect(getScaleLayer('estoque_carbono')?.id).toBe('estoque_carbono')
    expect(getScaleLayer('gfw_netflux')?.id).toBe('gfw_netflux')
  })

  it('refuses a categorical layer, a dem layer, a vector and an unknown id', () => {
    expect(getScaleLayer('lulc_mapbiomas')).toBeNull()
    expect(getScaleLayer('sombreado_terreno')).toBeNull()
    expect(getScaleLayer('municipios')).toBeNull()
    expect(getScaleLayer('nao-existe')).toBeNull()
  })
})

describe('getScaleFeicao', () => {
  const layer = getScaleLayer('estoque_carbono')!

  it('resolves a feature of a Território recorte', () => {
    expect(getScaleFeicao(layer, 'estados', 1)?.name).toBe('Bahia')
  })

  it("refuses the recorte the layer is already clipped to: its scale is the biome's", () => {
    expect(getScaleFeicao(layer, 'bioma', 0)).toBeNull()
  })

  it('refuses a layer that is not a Território recorte, and a position with no feature', () => {
    expect(getScaleFeicao(layer, 'areas_monitoramento', 0)).toBeNull()
    expect(getScaleFeicao(layer, 'estados', 999)).toBeNull()
  })
})

describe('computeRecorteScale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reduces exactly the declared years of a series with gaps', async () => {
    const layer = getScaleLayer('biomassa_esa_lenhosa')!
    const feicao = getScaleFeicao(layer, 'estados', 4)!
    mocks.reduce.mockResolvedValueOnce({ '2010': yearStats })

    await computeRecorteScale(recorteScaleKey(layer.id, 'estados', 4), layer, feicao)

    expect(mocks.reduce.mock.calls[0][2]).toEqual(
      ['2007', '2010', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022'])
  })

  it('reduces a static layer once, under the static key', async () => {
    const layer = getScaleLayer('estoque_carbono')!
    const feicao = getScaleFeicao(layer, 'estados', 2)!
    mocks.reduce.mockResolvedValueOnce({ static: yearStats })

    const out = await computeRecorteScale(recorteScaleKey(layer.id, 'estados', 2), layer, feicao)

    expect(mocks.reduce.mock.calls[0][2]).toEqual(['static'])
    expect(out).toEqual({ stretch: { min: 2, max: 8 }, range: { min: 1, max: 9 } })
  })

  it('caches the answer and shares a computation already running', async () => {
    const layer = getScaleLayer('estoque_carbono')!
    const feicao = getScaleFeicao(layer, 'estados', 3)!
    const key = recorteScaleKey(layer.id, 'estados', 3)
    mocks.reduce.mockResolvedValueOnce({ static: yearStats })

    const [a, b] = await Promise.all([
      computeRecorteScale(key, layer, feicao),
      computeRecorteScale(key, layer, feicao),
    ])
    await computeRecorteScale(key, layer, feicao)

    expect(a).toEqual(b)
    expect(cachedRecorteScale(key)).toEqual(a)
    expect(mocks.reduce).toHaveBeenCalledOnce()
  })

  it('does not cache a failure', async () => {
    const layer = getScaleLayer('estoque_carbono')!
    const feicao = getScaleFeicao(layer, 'estados', 5)!
    const key = recorteScaleKey(layer.id, 'estados', 5)
    mocks.reduce.mockRejectedValueOnce(new Error('timed out')).mockResolvedValueOnce({ static: yearStats })

    await expect(computeRecorteScale(key, layer, feicao)).rejects.toThrow('timed out')
    expect(cachedRecorteScale(key)).toBeNull()
    await expect(computeRecorteScale(key, layer, feicao)).resolves.toMatchObject({ stretch: { min: 2, max: 8 } })
    expect(mocks.reduce).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd $W && npx vitest run tests/lib/recorteScaleService.test.ts`
Expected: FAIL — cannot resolve `@/lib/mapa/recorteScaleService`.

- [ ] **Step 3: Write the service**

`lib/mapa/recorteScaleService.ts`:

```ts
// Server side of /api/gee/scale: which layers and features can re-scale, and
// the scale itself, cached per layer and feature. The data is static, so an
// answer is reused across users for a day; module scope, like tileCache.ts.

import 'server-only'

import appConfig from '@/config/mapa/layers.json'
import { getEe } from '@/lib/mapa/geeAuth'
import { layerYears } from '@/lib/mapa/dataRange'
import type { GeeAssetConfig } from '@/lib/mapa/geeImage'
import { getFeicaoByIndex, listRecortes, type FeicaoResolvida } from '@/lib/mapa/recorteRegistry'
import { reduceRecorteStats } from '@/lib/mapa/recorteScaleCompute'
import { recorteScale, STATIC_KEY, type ScaleResponse } from '@/lib/mapa/recorteScale'
import type { RasterLayerConfig } from '@/types/mapa'

/** A continuous Earth Engine raster, whose colors can follow a recorte. */
export function getScaleLayer(layerId: string): RasterLayerConfig | null {
  const layer = (appConfig.layers as { id: string; type: string }[])
    .find((l) => l.id === layerId && l.type === 'raster') as RasterLayerConfig | undefined
  if (!layer || layer.colorType !== 'continuous' || layer.source !== 'gee' || !layer.gee?.asset) return null
  return layer
}

/**
 * The selected feature, when its recorte can re-scale the layer. The recorte
 * the layer is clipped to (the biome) is refused: its scale is the default one.
 */
export function getScaleFeicao(
  layer: RasterLayerConfig,
  recorteId: string,
  feicaoIndex: number,
): FeicaoResolvida | null {
  if (recorteId === layer.clipToLayerId) return null
  if (!listRecortes().some((r) => r.layerId === recorteId)) return null
  return getFeicaoByIndex(recorteId, feicaoIndex)
}

const TTL_MS = 24 * 60 * 60 * 1000
const MAX_ENTRIES = 5000

const cache = new Map<string, { value: ScaleResponse; expires: number }>()
const inFlight = new Map<string, Promise<ScaleResponse>>()

export function cachedRecorteScale(key: string): ScaleResponse | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    cache.delete(key)
    return null
  }
  return hit.value
}

/**
 * The scale of `layer` inside `feicao`. A second request for the same key while
 * the first runs (a double click, two users) waits on the same computation. A
 * failure is not cached, so the next selection tries again. Earth Engine must
 * already be initialized: the route answers 503 itself when it is not.
 */
export function computeRecorteScale(
  key: string,
  layer: RasterLayerConfig,
  feicao: FeicaoResolvida,
): Promise<ScaleResponse> {
  const hit = cachedRecorteScale(key)
  if (hit) return Promise.resolve(hit)
  const running = inFlight.get(key)
  if (running) return running

  const gee = layer.gee!
  const run = (async () => {
    const keys = gee.temporal ? layerYears(gee.temporal) : [STATIC_KEY]
    const byYear = await reduceRecorteStats(
      getEe(), gee.asset as GeeAssetConfig, keys, feicao.geometry, feicao.areaHa * 10_000)
    const value = recorteScale(layer, byYear)
    cache.set(key, { value, expires: Date.now() + TTL_MS })
    if (cache.size > MAX_ENTRIES) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
    return value
  })().finally(() => inFlight.delete(key))

  inFlight.set(key, run)
  return run
}
```

- [ ] **Step 4: Run the service test**

Run: `cd $W && npx vitest run tests/lib/recorteScaleService.test.ts`
Expected: PASS (9 tests). If `getScaleFeicao(layer, 'estados', 2..5)` returns null for any state, check `estados.geojson` order (`0` Minas Gerais … `8` Ceará) — every state there is labelled.

- [ ] **Step 5: Write the failing route test**

`tests/app/scaleRoute.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  reduce: vi.fn(),
  initGee: vi.fn(async () => {}),
  getAuthenticatedRequest: vi.fn<() => Promise<{ uid: string } | null>>(async () => ({ uid: 'test-user' })),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({ initGee: mocks.initGee, getEe: vi.fn(() => ({})) }))
vi.mock('@/lib/mapa/recorteScaleCompute', () => ({ reduceRecorteStats: mocks.reduce }))
vi.mock('@/lib/auth', () => ({
  getAuthenticatedRequest: mocks.getAuthenticatedRequest,
  unauthorizedResponse: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}))

import { POST } from '@/app/api/gee/scale/route'

function request(body: unknown) {
  return new Request('http://localhost/api/gee/scale', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

const yearStats = { min: 1, max: 9, p2: 2, p98: 8 }

describe('POST /api/gee/scale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires an authenticated session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)

    const response = await POST(request({ layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: 174 }))

    expect(response.status).toBe(401)
    expect(mocks.reduce).not.toHaveBeenCalled()
  })

  it.each([
    ['a categorical layer', { layerId: 'lulc_mapbiomas', recorteId: 'municipios', feicaoIndex: 174 }],
    ['a dem layer', { layerId: 'sombreado_terreno', recorteId: 'municipios', feicaoIndex: 174 }],
    ['an unknown layer', { layerId: 'nao-existe', recorteId: 'municipios', feicaoIndex: 174 }],
    ['the biome recorte', { layerId: 'estoque_carbono', recorteId: 'bioma', feicaoIndex: 0 }],
    ['a recorte that is not a Território', { layerId: 'estoque_carbono', recorteId: 'areas_monitoramento', feicaoIndex: 0 }],
    ['a position with no feature', { layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: 99999 }],
    ['a negative position', { layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: -1 }],
    ['a fractional position', { layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: 1.5 }],
    ['a position sent as text', { layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: '174' }],
  ])('rejects %s with 400', async (_, body) => {
    const response = await POST(request(body))

    expect(response.status).toBe(400)
    expect(mocks.reduce).not.toHaveBeenCalled()
  })

  it('answers the scale, then serves it again from the cache without Earth Engine', async () => {
    mocks.reduce.mockResolvedValueOnce({ static: yearStats })
    const body = { layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: 174 }

    const first = await POST(request(body))
    const second = await POST(request(body))

    expect(first.status).toBe(200)
    await expect(first.json()).resolves.toEqual({ stretch: { min: 2, max: 8 }, range: { min: 1, max: 9 } })
    expect(second.status).toBe(200)
    expect(mocks.reduce).toHaveBeenCalledOnce()
    expect(mocks.initGee).toHaveBeenCalledOnce()
  })

  it('answers 503 when Earth Engine cannot be reached', async () => {
    mocks.initGee.mockRejectedValueOnce(new Error('no credentials'))

    const response = await POST(request({ layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: 691 }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'Earth Engine unavailable' })
  })

  it('answers a generic 500 when the reduction fails', async () => {
    mocks.reduce.mockRejectedValueOnce(new Error('ee.evaluate timed out after 65000ms'))

    const response = await POST(request({ layerId: 'gfw_netflux', recorteId: 'municipios', feicaoIndex: 174 }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed to process Earth Engine request' })
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `cd $W && npx vitest run tests/app/scaleRoute.test.ts`
Expected: FAIL — cannot resolve `@/app/api/gee/scale/route`.

- [ ] **Step 7: Write the route**

`app/api/gee/scale/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { initGee } from '@/lib/mapa/geeAuth'
import { bodyTooLarge } from '@/lib/mapa/geeValidation'
import { rateLimit, clientIp } from '@/lib/mapa/rateLimit'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { recorteScaleKey } from '@/lib/mapa/recorteScale'
import {
  cachedRecorteScale,
  computeRecorteScale,
  getScaleFeicao,
  getScaleLayer,
} from '@/lib/mapa/recorteScaleService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The color scale of a continuous raster inside the feature selected on the
// map. The client sends ids only: the asset comes from layers.json and the
// geometry from the recorte registry, so the route cannot be pointed at any
// other image or region.
interface ReqBody {
  layerId?:     unknown
  recorteId?:   unknown
  feicaoIndex?: unknown   // position in the recorte GeoJSON = MapLibre generateId
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

  const layer = typeof body.layerId === 'string' ? getScaleLayer(body.layerId) : null
  if (!layer) {
    return NextResponse.json({ error: 'layerId must name a continuous GEE layer' }, { status: 400 })
  }

  const { recorteId, feicaoIndex } = body
  if (
    typeof recorteId !== 'string'
    || typeof feicaoIndex !== 'number' || !Number.isInteger(feicaoIndex) || feicaoIndex < 0
  ) {
    return NextResponse.json({ error: 'unknown recorte feature' }, { status: 400 })
  }
  const feicao = getScaleFeicao(layer, recorteId, feicaoIndex)
  if (!feicao) {
    return NextResponse.json({ error: 'unknown recorte feature' }, { status: 400 })
  }

  const key = recorteScaleKey(layer.id, recorteId, feicaoIndex)
  const hit = cachedRecorteScale(key)
  if (hit) return NextResponse.json(hit)

  try {
    await initGee()
  } catch (err) {
    console.error('[/api/gee/scale] auth error:', err)
    return NextResponse.json({ error: 'Earth Engine unavailable' }, { status: 503 })
  }

  try {
    return NextResponse.json(await computeRecorteScale(key, layer, feicao))
  } catch (err) {
    console.error('[/api/gee/scale] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
```

- [ ] **Step 8: Run the route test**

Run: `cd $W && npx vitest run tests/app/scaleRoute.test.ts tests/lib/recorteScaleService.test.ts`
Expected: PASS.

- [ ] **Step 9: Raise the tile cache cap**

In `lib/mapa/tileCache.ts`, replace `const MAX_ENTRIES = 200` with:

```ts
// Recorte-scaled tiles (one per layer, feature and year) share this cache with
// the biome tiles that `npm run prewarm` warms; oldest-first eviction at 200
// pushed those out after a few selections. An entry is one URL.
const MAX_ENTRIES = 1000
```

- [ ] **Step 10: Document the route in CLAUDE.md**

In `CLAUDE.md`, section `### GEE routes`, change the first sentence from
`` `app/api/gee/{tile,stats,point,timeseries}/route.ts` — all `POST`, Node runtime, `force-dynamic`. ``
to
`` `app/api/gee/{tile,stats,point,timeseries,scale}/route.ts` — all `POST`, Node runtime, `force-dynamic`. ``
and append this paragraph at the end of that section:

```markdown
`/api/gee/scale` answers the color scale of a continuous raster inside the feature selected on the map (`{ layerId, recorteId, feicaoIndex }`, ids only: the asset comes from `layers.json`, the geometry from `lib/mapa/recorteRegistry.ts` by file position). One reduction over every year (`lib/mapa/recorteScaleCompute.ts`), cached a day per layer and feature (`lib/mapa/recorteScaleService.ts`). The client then asks `/api/gee/tile` for the same layer with only `visParams.min/max` replaced; `lib/mapa/activeRaster.ts` decides which tile and scale are on screen.
```

- [ ] **Step 11: Run the whole suite and commit**

Run: `cd $W && npm test`
Expected: PASS (all files).

```bash
cd $W && git add lib/mapa/recorteScaleService.ts app/api/gee/scale/route.ts lib/mapa/tileCache.ts CLAUDE.md \
  tests/lib/recorteScaleService.test.ts tests/app/scaleRoute.test.ts
git commit -m "feat: /api/gee/scale, the color scale of a layer inside a recorte feature"
```

---

### Task 5: Client state and the scale runner

**Files:**
- Modify: `types/mapa.ts` (`SelectedGeometry`, near line 301), `lib/mapa/store.ts` (interface `MapaStore` near line 110, initial state near line 205)
- Create: `lib/mapa/recorteScaleRunner.ts`
- Test: `tests/lib/recorteScaleRunner.test.ts`

**Interfaces:**
- Consumes: `recorteScaleKey`, `STATIC_KEY`, `RecorteScaleEntry`, `ScaleResponse`, `Stretch` (Task 1); `useStore` (`lib/mapa/store.ts`).
- Produces:
  - `interface SelectedRecorte { recorteId: string; feicaoIndex: number; name: string }` and `SelectedGeometry.recorte?: SelectedRecorte` (`types/mapa.ts`)
  - store fields `recorteScales: Record<string, RecorteScaleEntry>` and `recorteTileUrls: Record<string, Record<string, string>>` (key → dateKey → tileUrl; dateKey is the ISO date of a temporal layer or `STATIC_KEY`)
  - `scalesWithRecorte(layer: LayerConfig, recorteId: string): layer is RasterLayerConfig`
  - `dateKeyOf(layer: RasterLayerConfig, temporalDate: Record<string, string>): string | undefined`
  - `interface RecorteWork { layer: RasterLayerConfig; key: string; need: 'scale' | 'tile'; dateKey: string; stretch?: Stretch }`
  - `pendingRecorteWork(input: PendingRecorteInput): RecorteWork[]`
  - `runRecorteScales(): void`

- [ ] **Step 1: Add the types and the store fields**

In `types/mapa.ts`, above `export interface SelectedGeometry`:

```ts
/** The feature of a Território recorte a selection came from; a drawn area has none. */
export interface SelectedRecorte {
  recorteId:   string
  /** Position in the recorte GeoJSON, the id MapLibre's `generateId` gave the feature. */
  feicaoIndex: number
  /** The analysis label, which the legend names its scale after. */
  name:        string
}
```

and add to `SelectedGeometry`, after `lat?: number`:

```ts
  /**
   * Present when the selection is a feature of a Território recorte: the
   * rasters then take that feature's color scale (lib/mapa/recorteScaleRunner.ts).
   * It lives here so every path that drops the selection drops it too.
   */
  recorte?:     SelectedRecorte
```

In `lib/mapa/store.ts`, add the import:

```ts
import type { RecorteScaleEntry } from '@/lib/mapa/recorteScale'
```

in `interface MapaStore`, after `temporalDate: Record<string, string> …`:

```ts
  // Scale of each continuous raster inside the selected recorte feature, and the
  // tiles drawn with it. Keyed by recorteScaleKey (layer|recorte|feature), so an
  // answer for a feature the user has left only lands in the cache. Not persisted.
  recorteScales:    Record<string, RecorteScaleEntry>
  recorteTileUrls:  Record<string, Record<string, string>>  // key -> { dateKey -> tileUrl }
```

and in the initial state, after `jenksBreaks: {},`:

```ts
  recorteScales:    {},
  recorteTileUrls:  {},
```

(Locate the `temporalTileUrls: {}` / `temporalDate: {}` initializers and put the two lines next to them if they are not right after `jenksBreaks`.)

- [ ] **Step 2: Write the failing runner test**

`tests/lib/recorteScaleRunner.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { pendingRecorteWork, type PendingRecorteInput } from '@/lib/mapa/recorteScaleRunner'
import { recorteScaleKey } from '@/lib/mapa/recorteScale'
import type { LayerConfig, RasterLayerConfig, SelectedRecorte } from '@/types/mapa'

const raster = (id: string, over: Partial<RasterLayerConfig> = {}): RasterLayerConfig => ({
  id, name: id, type: 'raster', visible: true, opacity: 80,
  colorType: 'continuous', source: 'gee', clipToLayerId: 'bioma',
  gee: { asset: { type: 'image', id: `projects/x/${id}` }, visParams: { min: 0, max: 100 } },
  ...over,
})
const temporal = (id: string) => raster(id, {
  gee: {
    asset: { type: 'imageCollection', id: `projects/x/${id}` },
    visParams: { min: 0, max: 100 },
    temporal: { dateRange: ['2001-01-01', '2024-01-01'] },
  },
})

const campina: SelectedRecorte = { recorteId: 'municipios', feicaoIndex: 120, name: 'Campina Grande' }
const keyOf = (layerId: string, recorte = campina) =>
  recorteScaleKey(layerId, recorte.recorteId, recorte.feicaoIndex)

const input = (over: Partial<PendingRecorteInput> = {}): PendingRecorteInput => ({
  layers: [] as LayerConfig[],
  recorte: campina,
  temporalDate: {},
  recorteScales: {},
  recorteTileUrls: {},
  inFlightTiles: new Set<string>(),
  ...over,
})

describe('pendingRecorteWork', () => {
  it('asks for nothing without a recorte selection', () => {
    expect(pendingRecorteWork(input({ layers: [raster('estoque_carbono')], recorte: undefined }))).toEqual([])
  })

  it('asks for the scale of every visible continuous GEE raster', () => {
    const a = raster('estoque_carbono'); const b = temporal('gpp_modis')
    const out = pendingRecorteWork(input({ layers: [a, b], temporalDate: { gpp_modis: '2024-01-01' } }))

    expect(out).toEqual([
      { layer: a, key: keyOf('estoque_carbono'), need: 'scale', dateKey: 'static' },
      { layer: b, key: keyOf('gpp_modis'), need: 'scale', dateKey: '2024-01-01' },
    ])
  })

  it('skips layers whose colors cannot follow the recorte', () => {
    const out = pendingRecorteWork(input({ layers: [
      raster('lulc', { colorType: 'categorical' }),
      raster('relevo', { source: 'dem' }),
      raster('off', { visible: false }),
      raster('clipped-here', { clipToLayerId: 'municipios' }),
      temporal('no-stop-yet'),
    ] }))

    expect(out).toEqual([])
  })

  it('waits while the scale loads, and stops on a failure or a degenerate scale', () => {
    const layers = [raster('a'), raster('b'), raster('c')]
    const out = pendingRecorteWork(input({ layers, recorteScales: {
      [keyOf('a')]: { status: 'loading' },
      [keyOf('b')]: { status: 'error' },
      [keyOf('c')]: { status: 'ready', stretch: null, range: null },
    } }))

    expect(out).toEqual([])
  })

  it('asks for the tile of the year on screen once the scale is ready', () => {
    const layer = temporal('gpp_modis')
    const stretch = { min: 300, max: 900 }
    const out = pendingRecorteWork(input({
      layers: [layer],
      temporalDate: { gpp_modis: '2010-01-01' },
      recorteScales: { [keyOf('gpp_modis')]: { status: 'ready', stretch, range: null } },
      recorteTileUrls: { [keyOf('gpp_modis')]: { '2024-01-01': 'old-year' } },
    }))

    expect(out).toEqual([{ layer, key: keyOf('gpp_modis'), need: 'tile', dateKey: '2010-01-01', stretch }])
  })

  it('asks for nothing when the tile is there or already on its way', () => {
    const ready = { status: 'ready' as const, stretch: { min: 1, max: 2 }, range: null }
    const layers = [raster('a'), raster('b')]

    expect(pendingRecorteWork(input({
      layers,
      recorteScales: { [keyOf('a')]: ready, [keyOf('b')]: ready },
      recorteTileUrls: { [keyOf('a')]: { static: 'url' } },
      inFlightTiles: new Set([`${keyOf('b')}@static`]),
    }))).toEqual([])
  })

  it("never takes another feature's scale for the selected one", () => {
    const other: SelectedRecorte = { recorteId: 'municipios', feicaoIndex: 7, name: 'Patos' }
    const layer = raster('estoque_carbono')
    const out = pendingRecorteWork(input({
      layers: [layer],
      recorteScales: { [keyOf('estoque_carbono', other)]: { status: 'ready', stretch: { min: 1, max: 2 }, range: null } },
      recorteTileUrls: { [keyOf('estoque_carbono', other)]: { static: 'patos-tile' } },
    }))

    expect(out).toEqual([{ layer, key: keyOf('estoque_carbono'), need: 'scale', dateKey: 'static' }])
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd $W && npx vitest run tests/lib/recorteScaleRunner.test.ts`
Expected: FAIL — cannot resolve `@/lib/mapa/recorteScaleRunner`.

- [ ] **Step 4: Write the runner**

`lib/mapa/recorteScaleRunner.ts`:

```ts
// The single place that fetches a recorte scale and the tiles drawn with it.
//
// For each continuous GEE raster on screen while a recorte feature is selected:
// the scale first (/api/gee/scale), then the tile of the year on screen from
// the unchanged /api/gee/tile with only visParams.min/max replaced. Results go
// to keyed caches in the store; lib/mapa/activeRaster.ts decides what is shown.

import { useStore } from '@/lib/mapa/store'
import {
  recorteScaleKey,
  STATIC_KEY,
  type RecorteScaleEntry,
  type ScaleResponse,
  type Stretch,
} from '@/lib/mapa/recorteScale'
import type { LayerConfig, RasterLayerConfig, SelectedRecorte } from '@/types/mapa'

/** A continuous GEE raster on screen whose colors can follow `recorteId`. */
export function scalesWithRecorte(layer: LayerConfig, recorteId: string): layer is RasterLayerConfig {
  return layer.type === 'raster'
    && layer.visible
    && layer.source === 'gee'
    && layer.colorType === 'continuous'
    && !!layer.gee?.asset
    // The recorte the layer is clipped to already has its scale: the default one.
    && layer.clipToLayerId !== recorteId
}

/** The stop a tile is cached under: the date of a temporal layer, STATIC_KEY otherwise. */
export function dateKeyOf(layer: RasterLayerConfig, temporalDate: Record<string, string>): string | undefined {
  return layer.gee?.temporal ? temporalDate[layer.id] : STATIC_KEY
}

export interface RecorteWork {
  layer:    RasterLayerConfig
  key:      string
  need:     'scale' | 'tile'
  dateKey:  string
  stretch?: Stretch
}

export interface PendingRecorteInput {
  layers:          LayerConfig[]
  recorte:         SelectedRecorte | undefined
  temporalDate:    Record<string, string>
  recorteScales:   Record<string, RecorteScaleEntry>
  recorteTileUrls: Record<string, Record<string, string>>
  /** `${key}@${dateKey}` of the tile requests already running. */
  inFlightTiles:   ReadonlySet<string>
}

/**
 * What the current selection still lacks. Pure: the only rule-holder for when a
 * request is sent. A failed or degenerate scale asks for nothing more, so a
 * re-render never re-sends it; selecting the feature again does.
 */
export function pendingRecorteWork(input: PendingRecorteInput): RecorteWork[] {
  const { recorte } = input
  if (!recorte) return []

  const out: RecorteWork[] = []
  for (const layer of input.layers) {
    if (!scalesWithRecorte(layer, recorte.recorteId)) continue
    const dateKey = dateKeyOf(layer, input.temporalDate)
    if (!dateKey) continue

    const key = recorteScaleKey(layer.id, recorte.recorteId, recorte.feicaoIndex)
    const entry = input.recorteScales[key]
    if (!entry) {
      out.push({ layer, key, need: 'scale', dateKey })
      continue
    }
    if (entry.status !== 'ready' || !entry.stretch) continue
    if (input.recorteTileUrls[key]?.[dateKey]) continue
    if (input.inFlightTiles.has(`${key}@${dateKey}`)) continue
    out.push({ layer, key, need: 'tile', dateKey, stretch: entry.stretch })
  }
  return out
}

const inFlightTiles = new Set<string>()

function setScale(key: string, entry: RecorteScaleEntry) {
  useStore.setState((s) => ({ recorteScales: { ...s.recorteScales, [key]: entry } }))
}

async function fetchScale(layer: RasterLayerConfig, key: string, recorte: SelectedRecorte): Promise<void> {
  setScale(key, { status: 'loading' })
  try {
    const res = await fetch('/api/gee/scale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layerId: layer.id, recorteId: recorte.recorteId, feicaoIndex: recorte.feicaoIndex }),
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const { stretch, range } = await res.json() as ScaleResponse
    setScale(key, { status: 'ready', stretch, range })
    // The tile of whatever year is on screen now, if the feature is still selected.
    if (stretch) runRecorteScales()
  } catch (err) {
    // The map stays on the biome scale; there is nothing to tell the reader.
    console.error('[recorteScale]', layer.id, err)
    setScale(key, { status: 'error' })
  }
}

async function fetchTile(layer: RasterLayerConfig, key: string, dateKey: string, stretch: Stretch): Promise<void> {
  const flight = `${key}@${dateKey}`
  inFlightTiles.add(flight)
  try {
    const res = await fetch('/api/gee/tile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset:        layer.gee!.asset,
        clipId:       layer.clipToLayerId,
        temporalDate: dateKey === STATIC_KEY ? undefined : dateKey,
        visParams:    { ...layer.gee!.visParams, min: stretch.min, max: stretch.max },
        classify:     layer.gee!.classify,
      }),
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const { tileUrl } = await res.json()
    if (typeof tileUrl !== 'string' || !tileUrl) throw new Error('API returned no tileUrl')
    useStore.setState((s) => ({
      recorteTileUrls: { ...s.recorteTileUrls, [key]: { ...s.recorteTileUrls[key], [dateKey]: tileUrl } },
    }))
  } catch (err) {
    // An empty slot keeps the biome tile on screen.
    console.error('[recorteScale] tile', layer.id, err)
  } finally {
    inFlightTiles.delete(flight)
  }
}

/** Fetch whatever the current selection still lacks; a no-op without a recorte. */
export function runRecorteScales(): void {
  const s = useStore.getState()
  const recorte = s.selectedGeometry?.recorte
  if (!recorte) return

  for (const work of pendingRecorteWork({
    layers:          s.layers,
    recorte,
    temporalDate:    s.temporalDate,
    recorteScales:   s.recorteScales,
    recorteTileUrls: s.recorteTileUrls,
    inFlightTiles,
  })) {
    if (work.need === 'scale') void fetchScale(work.layer, work.key, recorte)
    else void fetchTile(work.layer, work.key, work.dateKey, work.stretch!)
  }
}
```

- [ ] **Step 5: Run the test and the type check**

Run: `cd $W && npx vitest run tests/lib/recorteScaleRunner.test.ts && npx tsc --noEmit`
Expected: PASS (7 tests); `tsc` exits 0.

- [ ] **Step 6: Commit**

```bash
cd $W && git add types/mapa.ts lib/mapa/store.ts lib/mapa/recorteScaleRunner.ts tests/lib/recorteScaleRunner.test.ts
git commit -m "feat: fetch the recorte scale and its tiles for the selected feature"
```

---

### Task 6: What is on screen, and MapView wiring

**Files:**
- Create: `lib/mapa/activeRaster.ts`
- Modify: `components/mapa/MapView.tsx` (raster add path near line 311; `runFeatureAnalysis` near lines 960–1050; temporal swap effect near line 1509; reactive recompute effect near line 1529)
- Test: `tests/lib/activeRaster.test.ts`

**Interfaces:**
- Consumes: `recorteScaleKey`, `STATIC_KEY`, `RecorteScaleEntry`, `ScaleRange`, `Stretch` (Task 1); store fields and `SelectedRecorte` (Task 5); `runRecorteScales` (Task 5).
- Produces:
  - `interface ActiveRasterInput { selectedGeometry: SelectedGeometry | null; temporalDate: Record<string, string>; fetchedTileUrls: Record<string, string>; temporalTileUrls: Record<string, Record<string, string>>; recorteScales: Record<string, RecorteScaleEntry>; recorteTileUrls: Record<string, Record<string, string>> }`
  - `interface ActiveScale { stretch: Stretch; range: ScaleRange | null; recorteName: string }`
  - `activeRaster(state: ActiveRasterInput, layerId: string): { tileUrl: string | null; scale: ActiveScale | null }`

- [ ] **Step 1: Write the failing test**

`tests/lib/activeRaster.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { activeRaster, type ActiveRasterInput } from '@/lib/mapa/activeRaster'
import { recorteScaleKey } from '@/lib/mapa/recorteScale'
import type { SelectedGeometry } from '@/types/mapa'

const polygon = { type: 'Polygon' as const, coordinates: [[[-40, -8], [-40, -7], [-39, -7], [-40, -8]]] }
const campina = { recorteId: 'municipios', feicaoIndex: 120, name: 'Campina Grande' }
const selected: SelectedGeometry = { geometry: polygon, geometryType: 'polygon', recorte: campina }
const drawn: SelectedGeometry = { geometry: polygon, geometryType: 'polygon' }
const stretch = { min: 10, max: 40 }
const key = (layerId: string, feicaoIndex = 120) => recorteScaleKey(layerId, 'municipios', feicaoIndex)

const input = (over: Partial<ActiveRasterInput> = {}): ActiveRasterInput => ({
  selectedGeometry: null,
  temporalDate: {},
  fetchedTileUrls: { estoque: 'biome-static' },
  temporalTileUrls: { gpp: { '2010-01-01': 'biome-2010', '2024-01-01': 'biome-2024' } },
  recorteScales: {},
  recorteTileUrls: {},
  ...over,
})

describe('activeRaster', () => {
  it('shows the biome tile without a selection', () => {
    expect(activeRaster(input(), 'estoque')).toEqual({ tileUrl: 'biome-static', scale: null })
    expect(activeRaster(input({ temporalDate: { gpp: '2010-01-01' } }), 'gpp'))
      .toEqual({ tileUrl: 'biome-2010', scale: null })
  })

  it('shows the biome tile for a drawn area, which carries no recorte', () => {
    expect(activeRaster(input({
      selectedGeometry: drawn,
      recorteScales: { [key('estoque')]: { status: 'ready', stretch, range: null } },
      recorteTileUrls: { [key('estoque')]: { static: 'recorte-static' } },
    }), 'estoque').tileUrl).toBe('biome-static')
  })

  it('keeps the biome tile while the scale loads, after a failure and for a degenerate scale', () => {
    for (const entry of [
      { status: 'loading' as const },
      { status: 'error' as const },
      { status: 'ready' as const, stretch: null, range: null },
    ]) {
      expect(activeRaster(input({
        selectedGeometry: selected,
        recorteScales: { [key('estoque')]: entry },
        recorteTileUrls: { [key('estoque')]: { static: 'recorte-static' } },
      }), 'estoque')).toEqual({ tileUrl: 'biome-static', scale: null })
    }
  })

  it('keeps the biome tile until the recorte tile arrives', () => {
    expect(activeRaster(input({
      selectedGeometry: selected,
      recorteScales: { [key('estoque')]: { status: 'ready', stretch, range: null } },
    }), 'estoque')).toEqual({ tileUrl: 'biome-static', scale: null })
  })

  it("shows the recorte tile and scale, named after the feature, once both are ready", () => {
    const range = { min: 2, max: 55 }
    expect(activeRaster(input({
      selectedGeometry: selected,
      recorteScales: { [key('estoque')]: { status: 'ready', stretch, range } },
      recorteTileUrls: { [key('estoque')]: { static: 'recorte-static' } },
    }), 'estoque')).toEqual({
      tileUrl: 'recorte-static',
      scale: { stretch, range, recorteName: 'Campina Grande' },
    })
  })

  it('shows the biome tile of a year stepped before its recorte tile exists', () => {
    expect(activeRaster(input({
      selectedGeometry: selected,
      temporalDate: { gpp: '2010-01-01' },
      recorteScales: { [key('gpp')]: { status: 'ready', stretch, range: null } },
      recorteTileUrls: { [key('gpp')]: { '2024-01-01': 'recorte-2024' } },
    }), 'gpp')).toEqual({ tileUrl: 'biome-2010', scale: null })
  })

  it("never shows another feature's scale", () => {
    expect(activeRaster(input({
      selectedGeometry: selected,
      recorteScales: { [key('estoque', 7)]: { status: 'ready', stretch, range: null } },
      recorteTileUrls: { [key('estoque', 7)]: { static: 'patos-static' } },
    }), 'estoque')).toEqual({ tileUrl: 'biome-static', scale: null })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd $W && npx vitest run tests/lib/activeRaster.test.ts`
Expected: FAIL — cannot resolve `@/lib/mapa/activeRaster`.

- [ ] **Step 3: Write the implementation**

`lib/mapa/activeRaster.ts`:

```ts
// One rule for what a GEE raster shows: the selected recorte's tile and scale
// when both are ready for the year on screen, the biome's otherwise. MapView
// draws with it and the legend describes with it, so the legend never claims a
// scale the map is not showing.

import type { SelectedGeometry } from '@/types/mapa'
import {
  recorteScaleKey,
  STATIC_KEY,
  type RecorteScaleEntry,
  type ScaleRange,
  type Stretch,
} from '@/lib/mapa/recorteScale'

export interface ActiveRasterInput {
  selectedGeometry: SelectedGeometry | null
  temporalDate:     Record<string, string>
  fetchedTileUrls:  Record<string, string>
  temporalTileUrls: Record<string, Record<string, string>>
  recorteScales:    Record<string, RecorteScaleEntry>
  recorteTileUrls:  Record<string, Record<string, string>>
}

export interface ActiveScale {
  stretch:     Stretch
  range:       ScaleRange | null
  recorteName: string
}

export interface ActiveRaster {
  tileUrl: string | null
  scale:   ActiveScale | null
}

export function activeRaster(state: ActiveRasterInput, layerId: string): ActiveRaster {
  const date = state.temporalDate[layerId]
  const biome = date && state.temporalTileUrls[layerId]
    ? state.temporalTileUrls[layerId][date] ?? null
    : state.fetchedTileUrls[layerId] ?? null

  const recorte = state.selectedGeometry?.recorte
  if (!recorte) return { tileUrl: biome, scale: null }

  const key = recorteScaleKey(layerId, recorte.recorteId, recorte.feicaoIndex)
  const entry = state.recorteScales[key]
  const tileUrl = state.recorteTileUrls[key]?.[date ?? STATIC_KEY]
  if (entry?.status !== 'ready' || !entry.stretch || !tileUrl) return { tileUrl: biome, scale: null }

  return { tileUrl, scale: { stretch: entry.stretch, range: entry.range, recorteName: recorte.name } }
}
```

- [ ] **Step 4: Run the test**

Run: `cd $W && npx vitest run tests/lib/activeRaster.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Use it in MapView's add path**

In `components/mapa/MapView.tsx`, add the imports next to the other `@/lib/mapa` ones:

```ts
import { activeRaster } from '@/lib/mapa/activeRaster'
import { runRecorteScales } from '@/lib/mapa/recorteScaleRunner'
import { TERRITORY_THEME_ID } from '@/config/mapa/groups'
```

(If `TERRITORY_THEME_ID` is already imported, do not duplicate it; add `SelectedRecorte` to the existing `import type { … } from '@/types/mapa'` list.)

In `addLayerToMap`, replace the block

```ts
    let tileUrl: string | null
    {
      const store = useStore.getState()
      // Temporal layers: look up by current date
      const tempDate = store.temporalDate[l.id]
      if (tempDate && store.temporalTileUrls[l.id]) {
        tileUrl = store.temporalTileUrls[l.id][tempDate] ?? null
      } else {
        tileUrl = store.fetchedTileUrls[l.id] ?? null
      }
    }
```

with

```ts
    // The selected recorte's tile when its scale is ready, the biome's
    // otherwise. A style reload re-adds every source through here, so it must
    // ask the same question the tile-sync effect does.
    const tileUrl = activeRaster(useStore.getState(), l.id).tileUrl
```

- [ ] **Step 6: Attach the recorte to a feature selection**

In `runFeatureAnalysis`, the label is computed inline today:

```ts
        const labelField = vector.hoverLabelField
        const featureName = labelField ? properties?.[labelField] : undefined
        setAnalysisLabel(
          featureName != null && featureName !== '' ? String(featureName) : vector.name,
        )
```

Replace it with:

```ts
        const labelField = vector.hoverLabelField
        const featureName = labelField ? properties?.[labelField] : undefined
        const label = featureName != null && featureName !== '' ? String(featureName) : vector.name
        setAnalysisLabel(label)
```

Then, in the polygon branch at the end of the function, replace

```ts
        if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
          const selected: SelectedGeometry = { geometry: geom, geometryType: 'polygon' }
```

with

```ts
        if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
          // A feature of a Território recorte re-scales the rasters to itself.
          // Plain GeoJSON sources number features by file position
          // (generateId), which is how the server finds it again.
          const index = Number(featureId)
          const recorte: SelectedRecorte | undefined =
            vector.theme === TERRITORY_THEME_ID && !vector.source && Number.isInteger(index) && index >= 0
              ? { recorteId: vector.id, feicaoIndex: index, name: label }
              : undefined
          const selected: SelectedGeometry = {
            geometry: geom, geometryType: 'polygon', ...(recorte ? { recorte } : {}),
          }
```

(`featureId` may be `undefined`; `Number(undefined)` is `NaN`, which fails `Number.isInteger`, so no recorte is attached.)

- [ ] **Step 7: Replace the temporal swap effect with a tile-sync effect, and run the runner**

Delete the effect introduced by the comment `// Swap temporal tile URLs when date changes` (the one with deps `[temporalDate, temporalTileUrls, mapReady]`).

Right after the reactive recomputation effect (the one with deps `[layers, temporalDate, temporalTileUrls, fetchedTileUrls, selectedGeometry]`), add:

```ts
  // The selected recorte's scale for every continuous raster on screen: the
  // runner fetches only what is missing, so a re-run on an opacity drag is free.
  useEffect(() => {
    if (!selectedGeometry?.recorte) return
    runRecorteScales()
  }, [layers, temporalDate, selectedGeometry])

  // Swap a raster's tiles when what it should show changes: a year stepped, or
  // the selected recorte's scale arriving or going away. Compares with the
  // source's current tiles, so a re-run never makes the map refetch.
  const recorteScales   = useStore((s) => s.recorteScales)
  const recorteTileUrls = useStore((s) => s.recorteTileUrls)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const state = useStore.getState()
    for (const layer of state.layers) {
      if (layer.type !== 'raster' || layer.source !== 'gee') continue
      const { tileUrl } = activeRaster(state, layer.id)
      if (!tileUrl) continue
      const source = map.getSource(layer.id) as maplibregl.RasterTileSource | undefined
      if (!source || !('setTiles' in source)) continue
      const next = withRetryProtocol(tileUrl)
      if (source.serialize().tiles?.[0] === next) continue
      source.setTiles([next])
    }
  }, [temporalDate, temporalTileUrls, fetchedTileUrls, recorteScales, recorteTileUrls, selectedGeometry, mapReady])
```

- [ ] **Step 8: Type check, lint and the suite**

Run: `cd $W && npx tsc --noEmit && npm run lint && npm test`
Expected: all exit 0. (MapView has no unit test; its behavior is checked in Task 8.)

- [ ] **Step 9: Commit**

```bash
cd $W && git add lib/mapa/activeRaster.ts tests/lib/activeRaster.test.ts components/mapa/MapView.tsx
git commit -m "feat: draw the selected recorte's scale on the map"
```

---

### Task 7: Legend

**Files:**
- Create: `lib/mapa/presentClasses.ts`
- Modify: `components/mapa/overlays/FloatingLegend.tsx` (`RasterLegendItem` near line 181, `ContinuousLegend` near line 230)
- Test: `tests/lib/presentClasses.test.ts`

**Interfaces:**
- Consumes: `activeRaster`, `ActiveScale` (Task 6); `dataRangeFor`, `DataRangesFile` (`lib/mapa/dataRange.ts`); `LayerResult`, `RasterClass` (`types/mapa.ts`).
- Produces: `presentClasses(classes: RasterClass[], result: LayerResult | undefined, date: string | undefined): RasterClass[]`.

- [ ] **Step 1: Write the failing test**

`tests/lib/presentClasses.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { presentClasses } from '@/lib/mapa/presentClasses'
import type { LayerResult, RasterClass } from '@/types/mapa'

const classes: RasterClass[] = [
  { value: 3, label: 'Formação Florestal', color: '#1f8d49' },
  { value: 4, label: 'Formação Savânica', color: '#7dc975' },
  { value: 15, label: 'Pastagem', color: '#edde8e' },
]

const result = (areas: Record<string, number>, date?: string, status: LayerResult['status'] = 'ready'): LayerResult => ({
  layerId: 'lulc_mapbiomas', date, status,
  stats: { kind: 'categorical', areas }, pixelValue: null, error: null,
})

describe('presentClasses', () => {
  it('keeps the classes with area inside the feature', () => {
    expect(presentClasses(classes, result({ '3': 1200, '15': 40, '4': 0 }, '2024-01-01'), '2024-01-01'))
      .toEqual([classes[0], classes[2]])
  })

  it('lists every class while the result loads, after an error, or without one', () => {
    expect(presentClasses(classes, result({ '3': 1 }, '2024-01-01', 'loading'), '2024-01-01')).toEqual(classes)
    expect(presentClasses(classes, result({ '3': 1 }, '2024-01-01', 'error'), '2024-01-01')).toEqual(classes)
    expect(presentClasses(classes, undefined, '2024-01-01')).toEqual(classes)
  })

  it('lists every class when the result is for another year', () => {
    expect(presentClasses(classes, result({ '3': 1 }, '2010-01-01'), '2024-01-01')).toEqual(classes)
  })

  it('matches a static layer, whose result has no date', () => {
    expect(presentClasses(classes, result({ '4': 5 }), undefined)).toEqual([classes[1]])
  })

  it('lists every class rather than none when no class has area', () => {
    expect(presentClasses(classes, result({}, '2024-01-01'), '2024-01-01')).toEqual(classes)
  })

  it('lists every class for a result that is not a composition', () => {
    const continuous: LayerResult = {
      layerId: 'x', status: 'ready', pixelValue: null, error: null,
      stats: { kind: 'continuous', stats: { min: 1, max: 9, mean: 5, count: 10 } },
    }
    expect(presentClasses(classes, continuous, undefined)).toEqual(classes)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd $W && npx vitest run tests/lib/presentClasses.test.ts`
Expected: FAIL — cannot resolve `@/lib/mapa/presentClasses`.

- [ ] **Step 3: Write the implementation**

`lib/mapa/presentClasses.ts`:

```ts
// The classes of a categorical layer that occur inside the selected feature,
// for the legend. Read from the composition the results panel already
// computes, so it costs no request. On a large state that composition is
// measured coarser, and a class covering very little area can be missing.

import type { LayerResult, RasterClass } from '@/types/mapa'

export function presentClasses(
  classes: RasterClass[],
  result: LayerResult | undefined,
  date: string | undefined,
): RasterClass[] {
  if (!result || result.status !== 'ready' || result.date !== date) return classes
  const stats = result.stats
  if (!stats || stats.kind !== 'categorical') return classes

  const present = classes.filter((c) => (stats.areas[String(c.value)] ?? 0) > 0)
  // A legend with no class at all would read as broken; the full list is honest.
  return present.length > 0 ? present : classes
}
```

- [ ] **Step 4: Run the test**

Run: `cd $W && npx vitest run tests/lib/presentClasses.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Wire the legend**

In `components/mapa/overlays/FloatingLegend.tsx`, add imports:

```ts
import { useShallow } from 'zustand/react/shallow'
import { activeRaster, type ActiveScale } from '@/lib/mapa/activeRaster'
import { presentClasses } from '@/lib/mapa/presentClasses'
```

Replace the head of `RasterLegendItem` — from its signature through `const hasClasses = …` — with:

```tsx
function RasterLegendItem({ layer, theme }: { layer: RasterLayerConfig; theme: PlatformTheme }) {
  // The same inputs MapView draws with, so the legend describes the tile on screen.
  const state = useStore(useShallow((s) => ({
    selectedGeometry: s.selectedGeometry,
    temporalDate:     s.temporalDate,
    fetchedTileUrls:  s.fetchedTileUrls,
    temporalTileUrls: s.temporalTileUrls,
    recorteScales:    s.recorteScales,
    recorteTileUrls:  s.recorteTileUrls,
  })))
  const result = useStore((s) => s.results[layer.id])
  const scale = activeRaster(state, layer.id).scale
  const temporalDate = state.temporalDate[layer.id]

  const hasClasses = layer.classes && layer.classes.length > 0
  // Inside a selected recorte feature, only the classes that occur there.
  const classes = hasClasses && state.selectedGeometry?.recorte
    ? presentClasses(layer.classes!, result, temporalDate)
    : layer.classes
```

Right after the layer-name `<span>` (the uppercase eyebrow), add the caption:

```tsx
      {scale && (
        <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.colors.caption, lineHeight: 1.3 }}>
          Escala ajustada a {scale.recorteName}
        </span>
      )}
```

In the categorical block, render `classes` instead of `layer.classes`:

```tsx
      {hasClasses &&
        classes!.map((cls) => (
```

and pass the scale and the date to the continuous bar:

```tsx
      {!hasClasses && layer.colorType === 'continuous' && layer.source !== 'dem' && (
        <ContinuousLegend layer={layer} theme={theme} scale={scale} temporalDate={temporalDate} />
      )}
```

Replace the head of `ContinuousLegend` — from its signature through `const high = real?.max ?? max` — with:

```tsx
function ContinuousLegend({
  layer,
  theme,
  scale,
  temporalDate,
}: {
  layer: RasterLayerConfig
  theme: PlatformTheme
  scale: ActiveScale | null
  temporalDate: string | undefined
}) {
  const palette = layer.gee?.visParams?.palette
  // The bar's stretch: the selected recorte's while the map shows it, the
  // calibrated biome one otherwise.
  const min = scale?.stretch.min ?? layer.gee?.visParams?.min ?? layer.rescale?.[0]
  const max = scale?.stretch.max ?? layer.gee?.visParams?.max ?? layer.rescale?.[1]
  // The ends print the real extremes of the data -- the feature's, measured
  // with its scale, or the biome's from dataRanges.json -- and fall back to
  // the stretch when that year was not measured.
  const real = scale
    ? scale.range ? dataRangeFor(layer.id, temporalDate, { layers: { [layer.id]: scale.range } }) : null
    : dataRangeFor(layer.id, temporalDate)
  const low = real?.min ?? min
  const high = real?.max ?? max
```

(The rest of `ContinuousLegend` — gradient, `signed`, `zeroPosition(min, max)` — already reads `min`/`max`, so the zero tick follows the recorte stretch with no further change.)

- [ ] **Step 6: Type check, lint and the suite**

Run: `cd $W && npx tsc --noEmit && npm run lint && npm test`
Expected: all exit 0.

- [ ] **Step 7: Commit**

```bash
cd $W && git add lib/mapa/presentClasses.ts tests/lib/presentClasses.test.ts components/mapa/overlays/FloatingLegend.tsx
git commit -m "feat: legend follows the selected recorte's scale and classes"
```

---

### Task 8: Rendered check, budget tuning and final verification

**Files:**
- Modify (only if tuning requires it): `lib/mapa/recorteScaleCompute.ts` (`SCALE_PIXEL_BUDGET`)

**Interfaces:**
- Consumes: everything above. Produces: a verified branch.

- [ ] **Step 1: Start the dev server in the worktree**

```bash
cd $W && (npm run dev -- -p 3100 > /tmp/claude-1002/-home-ezequias-oca-plataforma-carbono-mvp/edc1ac9f-c483-4e9c-a085-f1a7717d93b7/scratchpad/dev-3100.log 2>&1 & echo $! > /tmp/claude-1002/-home-ezequias-oca-plataforma-carbono-mvp/edc1ac9f-c483-4e9c-a085-f1a7717d93b7/scratchpad/dev-3100.pid)
```

Open `http://localhost:3100/mapa` in Chrome (the `session` cookie for `localhost` works on any port; log in through `/login` if needed). Use a 1436 px-wide window.

- [ ] **Step 2: Municipality, static layer**

Turn on `estoque_carbono` and `Municípios`; click a small municipality. Expect, within a few seconds: the colors inside it spread over the whole palette; the legend shows `Escala ajustada a <nome>` and new end values. In DevTools → Network: one `POST /api/gee/scale` (200) and one `POST /api/gee/tile` whose body has `visParams.min/max` different from `0`/`160`.

- [ ] **Step 3: Temporal layer and year steps**

With the same municipality selected, turn on `gpp_modis`. Step the year three times. Expect: no second `/api/gee/scale` for `gpp_modis`; one `/api/gee/tile` per new year; the bar's stretch stays the same across years, while the end values change with the year.

- [ ] **Step 4: Signed flux**

Turn on `gfw_netflux` with the municipality selected. Expect: the zero tick stays at a quarter of the bar, zero still renders white on the map.

- [ ] **Step 5: Largest state, worst case, and budget tuning**

Turn on `Estados` and `solo_carbono`; click Bahia. Time the `/api/gee/scale` request in the Network panel.
- Under ~30 s: keep `SCALE_PIXEL_BUDGET = 5e7`.
- Between 30 s and 65 s, or a 500 in `dev-3100.log` with `timed out`: halve `SCALE_PIXEL_BUDGET` in `lib/mapa/recorteScaleCompute.ts`, restart the server (Step 9's stop command, then Step 1), select another state of comparable size (the cache would answer Bahia), and repeat until it answers under ~30 s. Record the measured times in the commit message.
- While it loads, the biome tile must stay on screen with the biome legend (no caption).

- [ ] **Step 6: Categorical legend on a Terra Indígena**

Turn on `lulc_mapbiomas` and `Terras Indígenas`; click a TI. Expect: once its results card is ready, the legend lists only the classes that appear in the card's composition; stepping the year updates the list after that year's card lands.

- [ ] **Step 7: Every way back to the biome scale**

With a municipality selected and its recorte scale on screen, check each, one at a time:
- the results panel's X → biome colors and legend, no caption;
- drawing a rectangle → biome;
- selecting the biome itself (only `Bioma` on, click it) → nothing changes, and no `/api/gee/scale` request is sent;
- re-selecting the municipality → its scale comes back instantly (no new `/api/gee/scale`).

- [ ] **Step 8: Basemap swap (Review Focus 5)**

With the recorte scale on screen, switch the basemap. Expect: after the style reload the raster comes back on the *recorte* scale, and the legend still shows the caption.

- [ ] **Step 9: Stop the server and run the full verification**

```bash
kill "$(cat /tmp/claude-1002/-home-ezequias-oca-plataforma-carbono-mvp/edc1ac9f-c483-4e9c-a085-f1a7717d93b7/scratchpad/dev-3100.pid)"
cd $W && npm test && npm run lint && npm run build && npm run contrast
```

Expected: all exit 0.

- [ ] **Step 10: Commit the tuning (only if Step 5 changed the budget)**

```bash
cd $W && git add lib/mapa/recorteScaleCompute.ts
git commit -m "fix: recorte scale pixel budget measured against Bahia (<times>)"
```
