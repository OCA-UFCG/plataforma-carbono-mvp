# Automatic Territorial Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, for one territorial `recorte` feature and one year, a printable A4 document gathering several carbon layers — each with a snapshot of the requested year, the zonal historical series, a deterministic narrative, a map image and a methodological note.

**Architecture:** A server service is called once per analysis. `GET /api/mapa/relatorio/base` returns the document shell with no Earth Engine work; `GET /api/mapa/relatorio/analise` returns one measured analysis. The client draws the document immediately and fills sections as they arrive, with limited concurrency. Geometry never travels from the client: the server resolves `recorteId` + `feicaoId` to a geometry, the same way `clipRegistry` and `stocksRegistry` already resolve ids. The document lives in a fourth sibling root layout, `app/(relatorio)/`, because `app/(mapa)/layout.tsx` zeroes the body scroll and a printable document has to scroll.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Zustand, MapLibre GL 5, Recharts 3, `@google/earthengine` (server-only), `@turf/area`, Vitest (node environment). No new dependency.

**Spec:** `docs/superpowers/specs/2026-09-12-relatorio-automatico-design.md`

## Global Constraints

- Code, comments and documentation in English. Portuguese prose docs (`DOCUMENTACAO.md`, `README.md`, `REVISAO_TECNICA.md`) stay in Portuguese.
- User-facing UI strings stay in Portuguese. An English comment quotes them verbatim when it cites one (`"Área desenhada"`, `"Não classificadas"`), and keeps domain terms untranslated (`recorte`, `fitofisionomia`, `mata branca`).
- There is no `app/layout.tsx` and adding one would break root-layout isolation. Every link crossing a route-group boundary uses `<a href>`, never `next/link`.
- Every new API route calls `getAuthenticatedRequest(req)` and returns `unauthorizedResponse()` first, before any other work. `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`.
- `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` are server-only; never prefixed `NEXT_PUBLIC_`.
- Error messages from API routes stay generic. They must not leak the credentials path.
- Every path that builds an `ee.Image` goes through `buildEeImage` (`lib/mapa/geeImage.ts`), so tile, stats, point value and series share one unit and one mask. An implementation that builds its own `ee.Image` returns raw units and diverges from the map.
- Do not write `[data-month]` blocks in CSS.
- `vitest.config.ts` includes `tests/**/*.test.ts` only — no `.tsx`. Every test in this plan is a `.ts` test of a `lib/` module, a `config/` module or a route.
- `server-only` modules resolve in tests through the existing `tests/stubs/server-only.ts` alias.
- CI runs `npm ci`, `npm run build` and `npm run contrast`. It does **not** run `npm test` or `npm run lint`, so run both locally before every commit.
- Minimum contrast for text over a colored surface: 4.5:1 (WCAG 1.4.1 / 1.4.3).

---

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `lib/mapa/format.ts` | pt-BR number, slug and date formatting, shared by the CSV, the narrative and the document |
| `lib/mapa/recorteRegistry.ts` | server-only: resolves a `recorte` layer id + feature id to a name, geometry, bbox and area |
| `types/relatorio.ts` | the report contract |
| `config/mapa/reportLayers.ts` | the curated eligible layers, their order and their editorial metadata |
| `lib/mapa/classShares.ts` | class area map to a sorted share list, with the unclassified remainder |
| `lib/mapa/zonalStats.ts` | the zonal statistics computation, extracted from the stats route |
| `lib/mapa/zonalSeries.ts` | the yearly-series computation, extracted from the timeseries route, with a zonal reducer added |
| `lib/mapa/reportNarrative.ts` | pure deterministic narrative from a measured analysis |
| `lib/mapa/reportCache.ts` | in-memory TTL cache of measured analyses |
| `lib/mapa/reportService.ts` | server-only: builds the shell, and one analysis at a time |
| `app/api/mapa/relatorio/feicoes/route.ts` | feature picker list for the form |
| `app/api/mapa/relatorio/base/route.ts` | document shell |
| `app/api/mapa/relatorio/analise/route.ts` | one measured analysis |
| `app/(relatorio)/layout.tsx` | fourth sibling root layout: own `<html>`, `<body>`, font and CSS |
| `app/relatorio.css` | document styles plus the `@media print` block |
| `app/(relatorio)/relatorio/page.tsx` | reads search params, mounts the client |
| `components/relatorio/ReportClient.tsx` | fetches the shell, then the analyses with limited concurrency, holds state |
| `components/relatorio/ReportDocument.tsx` | identification header, sections, methodological notes, footer |
| `components/relatorio/ReportSection.tsx` | one analysis: narrative, value card, table, map and series, historical reading |
| `components/relatorio/ReportMapPreview.tsx` | one MapLibre map, captured to PNG on `idle` |
| `components/relatorio/useReportMapCaptureQueue.ts` | serializes the captures so N WebGL contexts never open at once |
| `components/mapa/overlays/ReportForm.tsx` | entry point in the map: recorte, feature, year, layers, generate |

**Modified:**

| File | Change |
|---|---|
| `lib/mapa/exportAnalysis.ts` | imports the shared formatters instead of its private copies |
| `app/api/gee/stats/route.ts` | thinned: validate, allowlist, authenticate, call `computeZonalStats`, respond |
| `app/api/gee/timeseries/route.ts` | thinned; the point path stays byte-for-byte equivalent |
| `config/mapa/platforms.ts` | gains `buildReportTheme()`: the fixed OCA identity, light mode, no month accent |
| `scripts/check-contrast.mts` | the report theme and the ten section colors join the 4.5:1 gate |
| `components/mapa/StatsChart.tsx` | takes `stats` / `layer` as props; a thin `ActiveStatsChart` reads the store |
| `components/mapa/ResultsSidebar.tsx` | calls `ActiveStatsChart` |
| `components/mapa/Mapa.tsx` | mounts `ReportForm` |
| `DOCUMENTACAO.md` | a Portuguese section describing the report |

---

## Task 1: Shared pt-BR formatters

`lib/mapa/exportAnalysis.ts` keeps `num`, `slug` and `isoDate` private. The narrative and the document need the same formatting, and a second copy is how the CSV and the prose start disagreeing.

One distinction the shared module must keep: `num` sets `useGrouping: false` on purpose, because a thousands dot makes a script importer ambiguous. Prose needs the opposite. So the module exports **two** number functions, and sharing a single one would silently strip the thousands dot from every sentence.

**Files:**
- Create: `lib/mapa/format.ts`
- Modify: `lib/mapa/exportAnalysis.ts` (remove the private `num`, `slug`, `isoDate`; import them)
- Test: `tests/lib/format.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `numeroCsv(value: number): string` — decimal comma, up to 4 digits, **no** grouping.
  - `numero(value: number, digits?: number): string` — decimal comma, `digits` default 1, **with** grouping.
  - `slug(value: string): string` — lowercase, accents stripped, non-alphanumerics collapsed to `-`, no leading or trailing `-`.
  - `isoDate(d: Date): string` — `YYYY-MM-DD` in local time.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isoDate, numero, numeroCsv, slug } from '@/lib/mapa/format'

describe('numeroCsv', () => {
  it('uses a decimal comma and no thousands separator', () => {
    // No grouping on purpose: the dot would be ambiguous for a script importer.
    expect(numeroCsv(4760.1234)).toBe('4760,1234')
    expect(numeroCsv(1234567)).toBe('1234567')
  })

  it('caps at four decimal digits', () => {
    expect(numeroCsv(0.123456)).toBe('0,1235')
  })
})

describe('numero', () => {
  it('groups thousands and defaults to one decimal digit', () => {
    expect(numero(4760123.45)).toBe('4.760.123,5')
  })

  it('honours an explicit digit count', () => {
    expect(numero(4760123.45, 0)).toBe('4.760.123')
    expect(numero(0.12345, 3)).toBe('0,123')
  })
})

describe('slug', () => {
  it('strips accents and collapses separators', () => {
    expect(slug('São Domingos')).toBe('sao-domingos')
    expect(slug('PA ESTRELA DO NORTE')).toBe('pa-estrela-do-norte')
    expect(slug('Carbono Orgânico do Solo (0-30 cm)')).toBe('carbono-organico-do-solo-0-30-cm')
  })
})

describe('isoDate', () => {
  it('pads month and day', () => {
    expect(isoDate(new Date(2026, 8, 7))).toBe('2026-09-07')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/format.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/mapa/format"`.

- [ ] **Step 3: Write the implementation**

Create `lib/mapa/format.ts`:

```ts
// pt-BR formatting shared by the CSV export, the report narrative and the
// report document, so the three never disagree on the same number.

import { normalizeSearch } from '@/lib/mapa/normalizeSearch'

/**
 * Number for a spreadsheet cell: decimal comma, and no thousands separator.
 *
 * The missing thousands dot is deliberate. Excel in Portuguese reads the comma
 * as the decimal mark, and a dot on top of it leaves a script importer unable
 * to tell a grouping mark from a decimal point.
 */
export function numeroCsv(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 4, useGrouping: false })
}

/**
 * Number for prose and for the document: decimal comma with the thousands dot.
 *
 * The opposite choice from `numeroCsv`, for the opposite reason: a total like
 * 4.760.123 is unreadable as a bare run of digits in a sentence.
 */
export function numero(value: number, digits = 1): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** Filename- and URL-safe form of a label. */
export function slug(value: string): string {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Local-time `YYYY-MM-DD`. */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/format.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Point `exportAnalysis.ts` at the shared module**

In `lib/mapa/exportAnalysis.ts`, delete the private `num`, `slug` and `isoDate` functions, add the import, and rename the call sites of `num` to `numeroCsv`:

```ts
import { isoDate, numeroCsv, slug } from '@/lib/mapa/format'
```

The only call site of `num` is inside `cell`:

```ts
function cell(value: string | number | null | undefined): string {
  if (typeof value === 'number') return numeroCsv(value)
  const text = value ?? ''
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
```

Keep the `normalizeSearch` import only if something else in the file still uses it; if nothing does, remove it, because `slug` moved out.

- [ ] **Step 6: Verify the CSV export did not change**

Run: `npx vitest run tests/lib/exportAnalysis.test.ts tests/lib/format.test.ts`
Expected: PASS. The existing CSV assertions are the proof the extraction preserved behavior — if any number changed shape, grouping leaked in.

- [ ] **Step 7: Lint and commit**

```bash
npm run lint
git add lib/mapa/format.ts lib/mapa/exportAnalysis.ts tests/lib/format.test.ts
git commit -m "refactor: share the pt-BR formatters between CSV and prose"
```

---

## Task 2: Recorte registry

The report needs **one** feature's geometry. `clipRegistry.ts` resolves a whole layer (every feature merged) to clip a raster, so it cannot serve this; the new registry is its sibling.

Three facts about the data, verified before writing this task, that the implementation has to respect:

1. No vector layer declares `labelField` — all six declare `hoverLabelField` (`name_muni`, `abbrev_state`, `name_indigenous_land`, `name_quilombo`, `nome_proje`, and `Bioma` for the biome).
2. Labels are not unique: `São Domingos` sits at file indices 19, 211 and 791 of `municipios.geojson`; there are 34 such municipality names and 213 settlement names.
3. `limite_caatinga_clip.geojson` (53 KB) has **empty** `properties`, while the full `limite_caatinga.geojson` (2.3 MB) carries `{ "Bioma": "Caatinga" }`. So preferring the simplified file — which is what keeps a biome-wide report from clipping against a ~105k-vertex boundary — means the label cannot come from the feature. A recorte with exactly one feature is therefore named by its layer, which also gives the biome a sensible id.

**Files:**
- Create: `lib/mapa/recorteRegistry.ts`
- Test: `tests/lib/recorteRegistry.test.ts`

**Interfaces:**
- Consumes: `slug` from `lib/mapa/format.ts` (Task 1); `computeBbox` from `lib/mapa/computeBbox.ts`; the default export of `@turf/area`.
- Produces:

```ts
export interface RecorteInfo { layerId: string; layerName: string; labelField: string }
export interface FeicaoInfo { id: string; name: string }
export interface FeicaoResolvida {
  id:       string
  name:     string
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }
  bbox:     [number, number, number, number]
  areaHa:   number
  /** 'simplified' when it came from a `_clip` file; the document footnotes it. */
  boundary: 'full' | 'simplified'
}
export function listRecortes(): RecorteInfo[]
export function listFeicoes(recorteId: string): FeicaoInfo[]
export function getFeicao(recorteId: string, feicaoId: string): FeicaoResolvida | null
```

- [ ] **Step 1: Write the failing test**

Create `tests/lib/recorteRegistry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getFeicao, listFeicoes, listRecortes } from '@/lib/mapa/recorteRegistry'

describe('listRecortes', () => {
  it('lists the vector layers that can be a report unit, with the field that names a feature', () => {
    // No layer declares `labelField`; all six carry `hoverLabelField`.
    expect(listRecortes()).toEqual(expect.arrayContaining([
      { layerId: 'municipios', layerName: 'Municípios', labelField: 'name_muni' },
      { layerId: 'estados', layerName: 'Estados', labelField: 'abbrev_state' },
      { layerId: 'bioma', layerName: 'Bioma Caatinga', labelField: 'Bioma' },
    ]))
  })

  it('offers no dead option: every listed recorte resolves to at least one feature', () => {
    for (const recorte of listRecortes()) {
      expect(listFeicoes(recorte.layerId).length).toBeGreaterThan(0)
    }
  })
})

describe('listFeicoes', () => {
  it('slugifies the label into the id', () => {
    expect(listFeicoes('estados')).toEqual(expect.arrayContaining([
      { id: 'pb', name: 'PB' },
      { id: 'mg', name: 'MG' },
    ]))
  })

  it('suffixes homonyms in file order, the first occurrence keeping the bare slug', () => {
    const saoDomingos = listFeicoes('municipios').filter((f) => f.name === 'São Domingos')

    // Three municipalities share this name, at file indices 19, 211 and 791.
    expect(saoDomingos.map((f) => f.id)).toEqual([
      'sao-domingos', 'sao-domingos-2', 'sao-domingos-3',
    ])
  })

  it('never repeats an id within a recorte', () => {
    for (const recorte of listRecortes()) {
      const ids = listFeicoes(recorte.layerId).map((f) => f.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('names a single-feature recorte after its layer', () => {
    // The simplified biome file has empty properties, so the label cannot come
    // from the feature; the layer name does, and gives a readable id.
    expect(listFeicoes('bioma')).toEqual([
      { id: 'bioma-caatinga', name: 'Bioma Caatinga' },
    ])
  })

  it('returns an empty list for an unknown recorte', () => {
    expect(listFeicoes('nao-existe')).toEqual([])
  })
})

describe('getFeicao', () => {
  it('resolves a feature to a geometry, a bbox and a geodesic area in hectares', () => {
    const feicao = getFeicao('municipios', 'campina-grande')

    expect(feicao).not.toBeNull()
    expect(feicao!.name).toBe('Campina Grande')
    expect(feicao!.geometry.type).toMatch(/^(Polygon|MultiPolygon)$/)
    expect(feicao!.bbox).toHaveLength(4)
    expect(feicao!.boundary).toBe('full')
    // Campina Grande covers roughly 59.000 ha. The bound is loose on purpose:
    // it only has to catch a unit slip (m² left as m²) or a broken geometry.
    expect(feicao!.areaHa).toBeGreaterThan(20_000)
    expect(feicao!.areaHa).toBeLessThan(200_000)
  })

  it('reports the simplified boundary when it came from a _clip file', () => {
    const bioma = getFeicao('bioma', 'bioma-caatinga')

    expect(bioma).not.toBeNull()
    expect(bioma!.boundary).toBe('simplified')
    // The Caatinga covers about 84,4 million ha.
    expect(bioma!.areaHa).toBeGreaterThan(60_000_000)
    expect(bioma!.areaHa).toBeLessThan(110_000_000)
  })

  it('keeps a homonym suffix pointing at a distinct geometry', () => {
    const first = getFeicao('municipios', 'sao-domingos')
    const second = getFeicao('municipios', 'sao-domingos-2')

    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    expect(first!.bbox).not.toEqual(second!.bbox)
  })

  it('returns null for an unknown recorte or feature', () => {
    expect(getFeicao('nao-existe', 'campina-grande')).toBeNull()
    expect(getFeicao('municipios', 'nao-existe')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/recorteRegistry.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/mapa/recorteRegistry"`.

- [ ] **Step 3: Write the implementation**

Create `lib/mapa/recorteRegistry.ts`:

```ts
// Server-only registry of individual recorte features. The client sends a
// recorte layer id and a feature id; the server resolves the geometry here.
//
// Sibling of clipRegistry.ts, which resolves a whole layer (every feature
// merged) so a raster can be clipped to it. The report needs the opposite:
// one feature.
//
// The GeoJSONs in public/data/vector carry only a label as a property, and the
// labels are not unique (34 homonymous municipalities, 213 settlements). So the
// id is the slug of the label plus an ordinal suffix, in file order.
// Regenerating the vectors in a different order can migrate a suffix; the fix
// is to preserve `code_muni` in scripts/build-recortes.py and key on the
// official code, recorded as a follow-up in the design doc.

import 'server-only'

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import area from '@turf/area'
import appConfig from '@/config/mapa/layers.json'
import { computeBbox } from '@/lib/mapa/computeBbox'
import { slug } from '@/lib/mapa/format'

type Bbox = [number, number, number, number]
type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }

export interface RecorteInfo {
  layerId:    string
  layerName:  string
  labelField: string
}

export interface FeicaoInfo {
  id:   string
  name: string
}

export interface FeicaoResolvida {
  id:       string
  name:     string
  geometry: Geometry
  bbox:     Bbox
  areaHa:   number
  /** 'simplified' when it came from a `_clip` file; the document footnotes it. */
  boundary: 'full' | 'simplified'
}

interface VectorEntry {
  id:               string
  name:             string
  type:             string
  url?:             string
  labelField?:      string
  hoverLabelField?: string
}

interface IndexedFeicao extends FeicaoInfo {
  geometry: Geometry
}

interface RecorteIndex {
  feicoes:  IndexedFeicao[]
  boundary: 'full' | 'simplified'
}

const indexCache = new Map<string, RecorteIndex | null>()

function vectorLayers(): VectorEntry[] {
  return (appConfig.layers as VectorEntry[]).filter((l) => l.type === 'vector')
}

/**
 * Property that names a feature. `labelField` is the persistent map label and
 * `hoverLabelField` the popup one; either identifies the feature, so whichever
 * is declared wins, with the persistent label preferred. Today all six vector
 * layers declare only the hover one.
 */
function labelFieldOf(layer: VectorEntry): string | undefined {
  return layer.labelField ?? layer.hoverLabelField
}

/** The recorte layers that can be a report unit: the vectors that have a label. */
export function listRecortes(): RecorteInfo[] {
  return vectorLayers().flatMap((layer) => {
    const labelField = labelFieldOf(layer)
    if (!labelField || !layer.url) return []
    return [{ layerId: layer.id, layerName: layer.name, labelField }]
  })
}

function buildIndex(recorteId: string): RecorteIndex | null {
  const layer = vectorLayers().find((l) => l.id === recorteId)
  const labelField = layer ? labelFieldOf(layer) : undefined
  if (!layer?.url || !labelField) return null

  // Prefer the pre-simplified `<name>_clip.geojson`, the same preference order
  // clipRegistry documents and for the same reason: the full biome boundary is
  // 2,3 MB and ~105k vertices, and reducing a raster over it costs tens of
  // seconds. Only the biome has such a file today.
  const coarseUrl = layer.url.replace(/\.geojson$/, '_clip.geojson')
  const coarsePath = path.join(process.cwd(), 'public', coarseUrl)
  const usesCoarse = existsSync(coarsePath)
  const filePath = usesCoarse ? coarsePath : path.join(process.cwd(), 'public', layer.url)

  let geojson: { features?: { geometry: unknown; properties?: Record<string, unknown> }[] }
  try {
    geojson = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }

  const features = geojson.features ?? []
  // Ordinal suffix per slug, assigned in file order: the first occurrence keeps
  // the bare slug, so the common case reads as a plain name in the URL.
  const seen = new Map<string, number>()
  const feicoes: IndexedFeicao[] = []

  for (const feature of features) {
    const geometry = feature.geometry as Geometry | null
    if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) continue

    const raw = feature.properties?.[labelField]
    // A single-feature recorte is named by its layer. The simplified biome file
    // has empty properties, so there is no label to read, and "Bioma Caatinga"
    // is the right name anyway. Restricted to one feature on purpose: applying
    // it to a multi-feature layer would collapse every id into one.
    const name = typeof raw === 'string' && raw.trim()
      ? raw.trim()
      : features.length === 1 ? layer.name : null
    if (!name) continue

    const base = slug(name)
    if (!base) continue
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)

    feicoes.push({ id: count === 1 ? base : `${base}-${count}`, name, geometry })
  }

  return { feicoes, boundary: usesCoarse ? 'simplified' : 'full' }
}

function index(recorteId: string): RecorteIndex | null {
  const cached = indexCache.get(recorteId)
  if (cached !== undefined) return cached
  const built = buildIndex(recorteId)
  indexCache.set(recorteId, built)
  return built
}

/** Features of a recorte, for the report form's picker. */
export function listFeicoes(recorteId: string): FeicaoInfo[] {
  return (index(recorteId)?.feicoes ?? []).map(({ id, name }) => ({ id, name }))
}

/** One feature's geometry, bbox and geodesic area, or null when unknown. */
export function getFeicao(recorteId: string, feicaoId: string): FeicaoResolvida | null {
  const entry = index(recorteId)
  const found = entry?.feicoes.find((f) => f.id === feicaoId)
  if (!entry || !found) return null

  // @turf/area returns m² on the ellipsoid. The document works in hectares, the
  // unit whoever deals with carbon and land use already thinks in.
  const areaM2 = area({ type: 'Feature', geometry: found.geometry, properties: {} } as never)

  return {
    id:       found.id,
    name:     found.name,
    geometry: found.geometry,
    bbox:     computeBbox(found.geometry),
    areaHa:   areaM2 / 10_000,
    boundary: entry.boundary,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/recorteRegistry.test.ts`
Expected: PASS, 11 tests.

If the `São Domingos` order differs, do **not** loosen the assertion to make it green — read the real order out of `public/data/vector/municipios.geojson` and fix the expectation. What the test protects is that the order is deterministic, not which order it is.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add lib/mapa/recorteRegistry.ts tests/lib/recorteRegistry.test.ts
git commit -m "feat: resolve a single recorte feature server-side"
```

---

## Task 3: Contract, curated config and the fixed report theme

Three pieces that only declare things, and one gate extension. They go together because the config's section colors are meaningless until the contrast check binds them, and the contract is what every later task types against.

The document's identity is the fixed OCA olive-green plus the per-section colors — never the month accent. The same report for the same municipality generated in March and in September has to be the same document, not two differently colored pieces in someone's archive. And it is always light mode: the page is white paper.

The ten section colors and the fixed theme below were all verified at 4.5:1 against white with the repo's own `contrast()` before being written here; the check added in this task is what keeps them that way.

Two facts worth knowing before writing the config, both about which layers can have a series:

- **`estoque_carbono` and `gfw_netflux` are static** — neither declares `gee.temporal`. That is not an oversight in the selection: the stock is a single inventory image and the three GFW layers are cumulative in one band, as `DOCUMENTACAO.md` records. The two carry no `trend` block, and the service leaves their `availableYears` and `series` empty.
- **A zonal mean is meaningless for `lulc_mapbiomas`.** Its pixel values *are* MapBiomas class codes, so averaging them is arithmetic on labels: a region half `Pastagem` (15) and half `Formação Florestal` (3) would report 9, which is `Silvicultura`. So the config declares `seriesKind: 'none'` there and the section carries the snapshot only. The other categorical layers are unaffected: `gpp_modis` and `npp_modis` hold raw GPP/NPP values and are classified by Jenks downstream, so their mean is a real quantity.

Net effect: seven of the ten curated layers get a series and a trend.

**Files:**
- Create: `types/relatorio.ts`
- Create: `config/mapa/reportLayers.ts`
- Modify: `config/mapa/platforms.ts` (add `buildReportTheme`)
- Modify: `scripts/check-contrast.mts` (add the report block)
- Test: `tests/config/reportLayers.test.ts`

**Interfaces:**
- Consumes: `RasterStatsResult`, `TimeSeriesPoint`, `RasterClass`, `PlatformTheme` from `types/mapa.ts`; `buildAccent`, `buildFluxInks` from `config/mapa/platforms.ts`.
- Produces:

```ts
// types/relatorio.ts
export type ReportAnalysisStatus = 'available' | 'unavailable' | 'year_not_found'
export interface ReportRecorte { ... }
export interface ReportAnalysisDescriptor { ... }
export interface ReportShell { ... }
export interface ReportNarrative { ... }
export interface ReportAnalysis extends ReportAnalysisDescriptor { ... }
export interface ReportData { ... }

// config/mapa/reportLayers.ts
export interface ReportLayerConfig { ... }
export const REPORT_LAYERS: readonly ReportLayerConfig[]
export const MAX_REPORT_LAYERS = 8
export function getReportLayer(layerId: string): ReportLayerConfig | undefined

// config/mapa/platforms.ts
export function buildReportTheme(): PlatformTheme
```

- [ ] **Step 1: Write the failing test**

Create `tests/config/reportLayers.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { MAX_REPORT_LAYERS, REPORT_LAYERS, getReportLayer } from '@/config/mapa/reportLayers'
import { buildReportTheme } from '@/config/mapa/platforms'
import { contrast } from '@/lib/color'

const MIN_CONTRAST = 4.5

describe('REPORT_LAYERS', () => {
  it('only names raster layers that exist in layers.json', () => {
    const rasters = new Set(
      appConfig.layers.filter((l) => l.type === 'raster').map((l) => l.id),
    )

    for (const entry of REPORT_LAYERS) {
      expect(rasters.has(entry.layerId)).toBe(true)
    }
  })

  it('has a LAYER_META entry for every eligible layer, since source comes from there', () => {
    for (const entry of REPORT_LAYERS) {
      expect(LAYER_META[entry.layerId]?.source).toBeTruthy()
    }
  })

  it('puts the decomposed stock layer first', () => {
    // estoque_carbono is the only layer whose result is the stock report, and
    // it is the centerpiece of a carbon document.
    const ordered = [...REPORT_LAYERS].sort((a, b) => a.order - b.order)
    expect(ordered[0].layerId).toBe('estoque_carbono')
  })

  it('has unique ids and unique order values', () => {
    const ids = REPORT_LAYERS.map((e) => e.layerId)
    const orders = REPORT_LAYERS.map((e) => e.order)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('carries white-legible section colors', () => {
    // Each section heading is white text on sectionColor.
    for (const entry of REPORT_LAYERS) {
      expect(contrast(entry.sectionColor, '#ffffff')).toBeGreaterThanOrEqual(MIN_CONTRAST)
    }
  })

  it('offers at least as many layers as one generation may select', () => {
    expect(REPORT_LAYERS.length).toBeGreaterThanOrEqual(MAX_REPORT_LAYERS)
  })

  it('declares no zonal-mean series for a layer whose pixels are class codes', () => {
    // Averaging MapBiomas codes 3 and 15 yields 9, which is Silvicultura.
    expect(getReportLayer('lulc_mapbiomas')?.seriesKind).toBe('none')
    // gpp_modis holds raw GPP and is classified downstream, so its mean is real.
    expect(getReportLayer('gpp_modis')?.seriesKind ?? 'mean').toBe('mean')
  })

  it('gives a trend block to every layer that can have a series', () => {
    const rasters = new Map(appConfig.layers.map((l) => [l.id, l]))

    for (const entry of REPORT_LAYERS) {
      const temporal = Boolean(
        (rasters.get(entry.layerId) as { gee?: { temporal?: unknown } } | undefined)?.gee?.temporal,
      )
      const canHaveSeries = temporal && entry.seriesKind !== 'none'
      // A trend sentence with nothing to compare against is dead config.
      expect(Boolean(entry.trend)).toBe(canHaveSeries)
    }
  })
})

describe('getReportLayer', () => {
  it('resolves an eligible layer and rejects anything else', () => {
    expect(getReportLayer('estoque_carbono')).toMatchObject({ layerId: 'estoque_carbono' })
    // A layer that exists but is not curated must not be reportable.
    expect(getReportLayer('estoque_c_agb')).toBeUndefined()
    expect(getReportLayer('nao-existe')).toBeUndefined()
  })
})

describe('buildReportTheme', () => {
  it('is the fixed OCA identity, in light mode, independent of the month', () => {
    const theme = buildReportTheme()

    expect(theme.colors.accent).toBe('#5f7030')
    // Light neutrals: a printed document is on white paper.
    expect(theme.colors.bgCard).toBe('#ffffff')
  })

  it('keeps its inks legible on the document surfaces', () => {
    const { colors } = buildReportTheme()

    expect(contrast(colors.accentInk, '#ffffff')).toBeGreaterThanOrEqual(MIN_CONTRAST)
    expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(MIN_CONTRAST)
    expect(contrast(colors.emissionInk, '#ffffff')).toBeGreaterThanOrEqual(MIN_CONTRAST)
    expect(contrast(colors.removalInk, '#ffffff')).toBeGreaterThanOrEqual(MIN_CONTRAST)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/config/reportLayers.test.ts`
Expected: FAIL — `Failed to resolve import "@/config/mapa/reportLayers"`.

- [ ] **Step 3: Write the contract**

Create `types/relatorio.ts`:

```ts
// Contract of the automatic territorial report.
//
// The snapshot of an analysis is a `RasterStatsResult`, the very union the
// zonal statistics already return, instead of a parallel shape. That is what
// lets StatsChart, StockReportView and exportAnalysis serve the document
// unchanged, including the `estoque_carbono` breakdown by pool and by
// fitofisionomia.

import type { RasterStatsResult, TimeSeriesPoint } from '@/types/mapa'

export type ReportAnalysisStatus = 'available' | 'unavailable' | 'year_not_found'

export interface ReportRecorte {
  layerId:     string   // 'municipios'
  layerName:   string   // 'Municípios'
  featureId:   string   // 'campina-grande'
  featureName: string   // 'Campina Grande'
  areaHa:      number
  bbox:        [number, number, number, number]
  /** 'simplified' when the boundary came from a `_clip` file. */
  boundary:    'full' | 'simplified'
}

/** Everything known about an analysis before touching Earth Engine. */
export interface ReportAnalysisDescriptor {
  layerId:        string
  name:           string
  unit?:          string
  signedFlux?:    boolean
  /** From LAYER_META, not duplicated in the report config. */
  source:         string
  /** The longer paragraph, from the report config. */
  methodology:    string
  sectionColor:   string
  /** Years of `gee.temporal`, as 4-digit strings. Empty when the layer is static. */
  availableYears: string[]
  /** null on the layers with no series. */
  requestedYear:  string | null
  effectiveYear:  string | null
}

export interface ReportShell {
  schemaVersion: 1
  generatedAt:   string
  recorte:       ReportRecorte
  requestedYear: string
  analyses:      ReportAnalysisDescriptor[]
}

export interface ReportNarrative {
  situation: string | null
  trend:     string | null
  context:   string | null
}

export interface ReportAnalysis extends ReportAnalysisDescriptor {
  status:    ReportAnalysisStatus
  snapshot:  RasterStatsResult | null
  /** Zonal mean per year. Empty for a static layer or a failed series. */
  series:    TimeSeriesPoint[]
  narrative: ReportNarrative
}

/** The assembled document: the shell joined with its N analyses. */
export interface ReportData {
  schemaVersion: 1
  generatedAt:   string
  recorte:       ReportRecorte
  requestedYear: string
  analyses:      ReportAnalysis[]
}
```

- [ ] **Step 4: Write the curated config**

Create `config/mapa/reportLayers.ts`:

```ts
// Which layers may enter the report, in what order, and the editorial metadata
// each section needs. The panel listing and the GEE pipeline stay in
// layers.json; this file is presentation and prose only.
//
// `source` is deliberately absent: it lives in LAYER_META, which already has
// it, and a second copy would drift.
//
// Every `sectionColor` carries white heading text, so each one is checked at
// 4.5:1 against white by tests/config/reportLayers.test.ts and by
// `npm run contrast`.

export interface ReportLayerConfig {
  layerId:      string
  order:        number
  sectionColor: string
  /** Fragment completing "…% da área analisada ___". */
  coverageContext: string
  /** Methodological note printed at the end of the document. */
  methodology:  string
  /** Vocabulary of the trend sentence. Absent where a trend reads badly. */
  trend?: {
    phenomenon:   string
    increaseTerm: string
    decreaseTerm: string
  }
  /**
   * Whether a zonal mean is a meaningful series for this layer. Defaults to
   * 'mean'.
   *
   * 'none' for a layer whose pixel values are class codes: the mean of
   * MapBiomas codes 3 and 15 is 9, which is a third class. A share-per-class
   * series would be the real answer there, and costs one grouped reduction per
   * year; it is recorded as a follow-up in the design doc.
   */
  seriesKind?: 'mean' | 'none'
  /**
   * Floor scale in metres for the series. Forty stops reduced over a whole
   * state at native resolution does not return.
   *
   * A floor, never a fixed value: the effective scale is
   * `max(seriesScale ?? 0, asset.scale ?? 500)`, so it can only coarsen. CHIRPS
   * is natively 5566 m, and a literal 300 there would ask Earth Engine to
   * resample finer than the data for no gain.
   */
  seriesScale?: number
}

export const MAX_REPORT_LAYERS = 8

export const REPORT_LAYERS: readonly ReportLayerConfig[] = [
  {
    layerId: 'estoque_carbono', order: 10, sectionColor: '#2F5D2A',
    coverageContext: 'nesta fitofisionomia',
    methodology: 'Estoques do Quarto Inventário Nacional, rasterizados a 100 m e somados sobre os cinco reservatórios. O total é densidade multiplicada pela área geodésica do pixel, e fecha com o vetor original em 0,03%.',
    // No `trend`: the layer has no `gee.temporal`, so there is no previous
    // stop to compare against and a trend sentence would have nothing to say.
  },
  {
    layerId: 'solo_carbono', order: 20, sectionColor: '#5A4632',
    coverageContext: 'nesta faixa de teor',
    methodology: 'Carbono orgânico do solo de 0 a 30 cm, MapBiomas Solo coleção 2, 30 m.',
    trend: { phenomenon: 'carbono do solo', increaseTerm: 'aumento', decreaseTerm: 'redução' },
    seriesScale: 300,
  },
  {
    layerId: 'biomassa_esa_lenhosa', order: 30, sectionColor: '#2E6B4F',
    coverageContext: 'nesta faixa de biomassa',
    methodology: 'Biomassa aérea da vegetação lenhosa, ESA CCI Biomass. A série tem lacuna: 2007, 2010 e de 2015 em diante.',
    trend: { phenomenon: 'biomassa', increaseTerm: 'aumento', decreaseTerm: 'redução' },
  },
  {
    layerId: 'gfw_netflux', order: 40, sectionColor: '#1F5E73',
    coverageContext: 'nesta faixa de fluxo',
    methodology: 'Fluxo líquido de carbono florestal, Global Forest Watch. Valor negativo é remoção da atmosfera e positivo é emissão; o documento troca o sinal por uma palavra.',
    // No `trend`: the three GFW layers are cumulative in a single band and
    // carry no `gee.temporal`.
  },
  {
    layerId: 'lulc_mapbiomas', order: 50, sectionColor: '#8A5A16',
    coverageContext: 'nesta classe de uso e cobertura',
    methodology: 'Uso e cobertura da terra, MapBiomas coleção 10.1, 30 m, série anual de 1985 em diante.',
    // The pixel values are class codes, so their mean is not a quantity.
    seriesKind: 'none',
  },
  {
    layerId: 'fogo_frequencia', order: 60, sectionColor: '#9B3218',
    coverageContext: 'nesta faixa de recorrência',
    methodology: 'Frequência de fogo acumulada desde 1985, MapBiomas Fogo coleção 3. Áreas nunca queimadas entram como zero.',
    trend: { phenomenon: 'recorrência de fogo', increaseTerm: 'aumento', decreaseTerm: 'redução' },
    seriesScale: 300,
  },
  {
    layerId: 'gpp_modis', order: 70, sectionColor: '#41682A',
    coverageContext: 'nesta classe de produtividade',
    methodology: 'Produtividade primária bruta, MODIS MOD17A2HGF, classificada em cinco classes por Jenks sobre o bioma.',
    trend: { phenomenon: 'produtividade bruta', increaseTerm: 'aumento', decreaseTerm: 'redução' },
  },
  {
    layerId: 'npp_modis', order: 80, sectionColor: '#37613B',
    coverageContext: 'nesta classe de produtividade',
    methodology: 'Produtividade primária líquida, MODIS MOD17A3HGF, classificada em cinco classes por Jenks sobre o bioma.',
    trend: { phenomenon: 'produtividade líquida', increaseTerm: 'aumento', decreaseTerm: 'redução' },
  },
  {
    layerId: 'chirps_precip', order: 90, sectionColor: '#2B4C7E',
    coverageContext: 'nesta faixa de precipitação',
    methodology: 'Precipitação anual acumulada, CHIRPS diário somado no ano.',
    trend: { phenomenon: 'precipitação', increaseTerm: 'aumento', decreaseTerm: 'redução' },
  },
  {
    layerId: 'ndvi_modis', order: 100, sectionColor: '#4A6A1F',
    coverageContext: 'nesta faixa de vigor',
    methodology: 'NDVI, MODIS MOD13Q1, média das composições de 16 dias do ano.',
    trend: { phenomenon: 'vigor da vegetação', increaseTerm: 'aumento', decreaseTerm: 'redução' },
  },
] as const

/** The report config of a layer, or undefined when it is not eligible. */
export function getReportLayer(layerId: string): ReportLayerConfig | undefined {
  return REPORT_LAYERS.find((entry) => entry.layerId === layerId)
}
```

- [ ] **Step 5: Add the fixed report theme**

Append to `config/mapa/platforms.ts`:

```ts
/**
 * Brand green of the OCA logo, the accent of the printed document.
 *
 * The document does not wear the month accent on purpose: the same report for
 * the same municipality generated in March and in September has to be the same
 * document, not two differently colored pieces in someone's archive. And it is
 * always light mode, because the page is white paper.
 */
const OCA_OLIVE = '#5f7030'

export function buildReportTheme(): PlatformTheme {
  return {
    id: 'carbono-relatorio',
    name: 'Carbono Caatinga',
    fullName: 'Observatório da Caatinga, OCA',
    footer: 'OCA / UFCG-INSA',
    colors: { ...lightNeutrals, ...buildAccent(OCA_OLIVE, false), ...buildFluxInks(false) },
  }
}
```

- [ ] **Step 6: Extend the contrast gate**

Append to `scripts/check-contrast.mts`, before the final `console.log` of the failure count, and add `REPORT_LAYERS` plus `buildReportTheme` to the imports at the top:

```ts
// The report document does not rotate with the month: it wears the fixed OCA
// accent on white paper, and each section heading is white text on its own
// `sectionColor`. Both go through the same 4.5:1 gate as the monthly accents,
// because a heading nobody can read is a heading nobody can read whether the
// color came from a month or from a config file.
console.log('\nrelatorio                     cor       vs branco')

const reportTheme = buildReportTheme()
const reportPairs: [string, string, string][] = [
  ['accentInk', reportTheme.colors.accentInk, '#ffffff'],
  ['onAccent', reportTheme.colors.onAccent, reportTheme.colors.accent],
  ['emissionInk', reportTheme.colors.emissionInk, '#ffffff'],
  ['removalInk', reportTheme.colors.removalInk, '#ffffff'],
  ...REPORT_LAYERS.map((entry): [string, string, string] =>
    [`secao ${entry.layerId}`, entry.sectionColor, '#ffffff']),
]

for (const [label, fg, bg] of reportPairs) {
  const ratio = contrast(fg, bg)
  const ok = ratio >= MIN
  if (!ok) failures++
  console.log(
    label.padEnd(30), fg.padEnd(9), ratio.toFixed(2).padStart(9),
    ok ? '' : '  <-- FALHA',
  )
}
```

The imports become:

```ts
import { REPORT_LAYERS } from '@/config/mapa/reportLayers'
import { buildAccent, buildFluxInks, buildReportTheme } from '@/config/mapa/platforms'
```

- [ ] **Step 7: Run the test and the gate**

Run: `npx vitest run tests/config/reportLayers.test.ts`
Expected: PASS, 11 tests.

Run: `npm run contrast`
Expected: exit 0, and a `relatorio` block listing 14 rows, all without `<-- FALHA`.

- [ ] **Step 8: Lint and commit**

```bash
npm run lint
git add types/relatorio.ts config/mapa/reportLayers.ts config/mapa/platforms.ts \
        scripts/check-contrast.mts tests/config/reportLayers.test.ts
git commit -m "feat: report contract, curated layer config and fixed document theme"
```

---
## Task 4: Extract the zonal statistics computation

`app/api/gee/stats/route.ts` holds ~180 lines of Earth Engine work inside the handler. The report needs that work without an HTTP round trip, so it moves to `lib/`, leaving the route in the shape `CLAUDE.md` describes: validate, allowlist, authenticate, call, respond.

This is a **behavior-preserving** extraction. Every status the route returns today (400 on a stock mismatch, 422 on too few or zero valid pixels, 500 on an unresolvable band name) has to keep coming out with the same code and the same message, so the outcome is a discriminated union rather than a thrown error.

Two details worth preserving exactly rather than tidying:

- The route echoes `breaks` in the Jenks categorical response. `lib/mapa/getRasterStats.ts` ignores it — it reads `payload.areas` only — but it is on the wire and something else may come to rely on it, so the outcome carries it and the route keeps sending it.
- The comment on `providedBreaks` says "sane, ascending", while the check is numeric-and-finite only. Preserve the check as it is. Adding an ascending test here would be a silent behavior change inside a task whose whole job is to change nothing.

**Files:**
- Create: `lib/mapa/zonalStats.ts`
- Modify: `app/api/gee/stats/route.ts`
- Test: `tests/lib/zonalStats.test.ts`

**Interfaces:**
- Consumes: `buildEeImage`, `bandaDoAno`, `GeeAssetConfig` from `lib/mapa/geeImage.ts`; `evaluate` from `lib/mapa/geeEvaluate.ts`; `jenksBreaks` from `lib/mapa/jenks.ts`; `getStocks` from `lib/mapa/stocksRegistry.ts`; `buildStockReport` from `lib/mapa/stockReport.ts`.
- Produces:

```ts
export interface ZonalStatsInput {
  asset:         GeeAssetConfig
  geometry:      { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }
  temporalDate?: string
  classify?:     { numClasses: number; method: 'jenks' }
  breaks?:       unknown
  colorType?:    'categorical' | 'continuous'
  layerId?:      string
}
export type ZonalStatsOutcome =
  | { ok: true; result: RasterStatsResult; breaks?: number[] }
  | { ok: false; error: string; status: number }
export async function computeZonalStats(
  ee: any, input: ZonalStatsInput,
): Promise<ZonalStatsOutcome>
```

- [ ] **Step 1: Write the failing test**

Create `tests/lib/zonalStats.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  evaluate: vi.fn<(obj: unknown) => Promise<unknown>>(),
  buildStockReport: vi.fn(async () => ({
    totalTc: 12, areaHa: 1, unit: 't C', pools: [], classes: [],
  })),
}))

vi.mock('@/lib/mapa/geeEvaluate', () => ({ evaluate: mocks.evaluate, GEE_TIMEOUT_MS: 1000 }))
vi.mock('@/lib/mapa/stockReport', () => ({ buildStockReport: mocks.buildStockReport }))
vi.mock('@/lib/mapa/geeImage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/geeImage')>(),
  buildEeImage: vi.fn(() => eeStub()),
}))

import { computeZonalStats } from '@/lib/mapa/zonalStats'

/**
 * Self-returning stub: every property access and every call yields the same
 * object, so any Earth Engine chain (`ee.Image(id).select(b).multiply(x)`,
 * `ee.Reducer.sum().repeat(3).group({})`) resolves without describing it.
 * What the test then pins is the branching and the shape of the result, which
 * is what an extraction can break; Earth Engine itself is not under test.
 */
function eeStub(): any {
  const handler: ProxyHandler<any> = { get: () => stub, apply: () => stub }
  const stub: any = new Proxy(function noop() {}, handler)
  return stub
}

const geometry = {
  type: 'Polygon' as const,
  coordinates: [[[-40, -8], [-40, -7], [-39, -7], [-40, -8]]],
}
const stockAsset = {
  type: 'image' as const,
  id: 'projects/ee-arturlourenco/assets/caatinga_estoques', band: 'b1', scale: 100,
}
const continuousAsset = {
  type: 'image' as const,
  id: 'projects/mapbiomas-public/assets/brazil/soil/collection2/mapbiomas_soil_collection2_soc_t_ha_000_030cm',
  band: 'prediction_2023', scale: 30,
}

describe('computeZonalStats stock branch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the stock report for the configured layer', async () => {
    const outcome = await computeZonalStats(eeStub(), {
      asset: stockAsset, geometry, layerId: 'estoque_carbono',
    })

    expect(outcome).toMatchObject({ ok: true, result: { kind: 'stocks', report: { totalTc: 12 } } })
    expect(mocks.buildStockReport).toHaveBeenCalledOnce()
  })

  it('rejects a stock layer id paired with a different band', async () => {
    const outcome = await computeZonalStats(eeStub(), {
      asset: { ...stockAsset, band: 'b2' }, geometry, layerId: 'estoque_carbono',
    })

    expect(outcome).toEqual({ ok: false, error: 'layerId does not match the asset', status: 400 })
    expect(mocks.buildStockReport).not.toHaveBeenCalled()
  })
})

describe('computeZonalStats continuous branch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps the reducer keys onto ContinuousStats', async () => {
    mocks.evaluate.mockResolvedValueOnce({
      prediction_2023_mean: 24.3,
      prediction_2023_min: 11.2,
      prediction_2023_max: 48.9,
      prediction_2023_median: 22.5,
      prediction_2023_stdDev: 4.25,
      prediction_2023_count: 1200,
      prediction_2023_sum: 29160,
    })

    const outcome = await computeZonalStats(eeStub(), { asset: continuousAsset, geometry })

    expect(outcome).toEqual({
      ok: true,
      result: {
        kind: 'continuous',
        stats: { min: 11.2, max: 48.9, mean: 24.3, median: 22.5, std: 4.25, count: 1200, sum: 29160 },
      },
    })
  })

  it('reports 422 when the geometry holds no valid pixel', async () => {
    mocks.evaluate.mockResolvedValueOnce({})

    const outcome = await computeZonalStats(eeStub(), { asset: continuousAsset, geometry })

    expect(outcome).toEqual({
      ok: false, error: 'No valid pixels in the given geometry', status: 422,
    })
  })
})

describe('computeZonalStats categorical branch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sums area per class and normalizes float class codes to integers', async () => {
    mocks.evaluate.mockResolvedValueOnce({
      groups: [{ class: 3.0, sum: 1000 }, { class: 15, sum: 2500 }, { class: 3, sum: 500 }],
    })

    const outcome = await computeZonalStats(eeStub(), {
      asset: { type: 'image', id: 'x', band: 'classification_2024', scale: 30 },
      geometry, colorType: 'categorical',
    })

    expect(outcome).toEqual({
      ok: true, result: { kind: 'categorical', areas: { '3': 1500, '15': 2500 } },
    })
  })

  it('reports 422 when no class came back', async () => {
    mocks.evaluate.mockResolvedValueOnce({ groups: [] })

    const outcome = await computeZonalStats(eeStub(), {
      asset: { type: 'image', id: 'x', band: 'b1', scale: 30 },
      geometry, colorType: 'categorical',
    })

    expect(outcome).toMatchObject({ ok: false, status: 422 })
  })

  it('reuses the biome-wide breaks instead of sampling the feature', async () => {
    mocks.evaluate.mockResolvedValueOnce({ groups: [{ class: 1, sum: 400 }] })

    const outcome = await computeZonalStats(eeStub(), {
      asset: { type: 'image', id: 'x', band: 'Gpp', scale: 500 },
      geometry,
      classify: { numClasses: 5, method: 'jenks' },
      breaks: [228.6304, 293.3043, 351.413, 433.6087],
    })

    expect(outcome).toMatchObject({
      ok: true,
      result: { kind: 'categorical', areas: { '1': 400 } },
      breaks: [228.6304, 293.3043, 351.413, 433.6087],
    })
    // One evaluate only: the grouped reduction. Sampling would add a second.
    expect(mocks.evaluate).toHaveBeenCalledOnce()
  })

  it('ignores malformed client breaks and samples instead', async () => {
    mocks.evaluate
      .mockResolvedValueOnce([1, 2, 3, 4, 5, 6, 7, 8])          // sample values
      .mockResolvedValueOnce({ groups: [{ class: 2, sum: 900 }] }) // grouped areas

    const outcome = await computeZonalStats(eeStub(), {
      asset: { type: 'image', id: 'x', band: 'Gpp', scale: 500 },
      geometry,
      classify: { numClasses: 5, method: 'jenks' },
      breaks: ['nao', 'numerico'],
    })

    expect(outcome).toMatchObject({ ok: true, result: { kind: 'categorical' } })
    expect(mocks.evaluate).toHaveBeenCalledTimes(2)
  })

  it('reports 422 when sampling yields fewer values than classes', async () => {
    mocks.evaluate.mockResolvedValueOnce([1, 2])

    const outcome = await computeZonalStats(eeStub(), {
      asset: { type: 'image', id: 'x', band: 'Gpp', scale: 500 },
      geometry,
      classify: { numClasses: 5, method: 'jenks' },
    })

    expect(outcome).toEqual({
      ok: false, error: 'Not enough valid pixels (got 2)', status: 422,
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/zonalStats.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/mapa/zonalStats"`.

- [ ] **Step 3: Write the extracted module**

Create `lib/mapa/zonalStats.ts` by moving the body of the current handler, unchanged except that every `NextResponse.json({ error }, { status })` becomes `{ ok: false, error, status }` and every success becomes `{ ok: true, result }`:

```ts
// Zonal statistics of a raster over a (multi)polygon.
//
// Extracted from app/api/gee/stats/route.ts so the report service can run the
// same computation without an HTTP round trip. The route keeps validation,
// the asset allowlist and authentication; this module is the Earth Engine work.
//
// Errors come back as a value, not as a throw, because the route has to answer
// with the same status codes it always did (400 on a stock mismatch, 422 on too
// few valid pixels, 500 on an unresolvable band name).

import { bandaDoAno, buildEeImage, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import { jenksBreaks } from '@/lib/mapa/jenks'
import { getStocks } from '@/lib/mapa/stocksRegistry'
import { buildStockReport } from '@/lib/mapa/stockReport'
import type { RasterStatsResult } from '@/types/mapa'

export interface ZonalStatsInput {
  asset:         GeeAssetConfig
  geometry:      { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }
  temporalDate?: string
  classify?:     { numClasses: number; method: 'jenks' }
  /** Raw from the client: sanitized here, so every caller gets the same check. */
  breaks?:       unknown
  colorType?:    'categorical' | 'continuous'
  /** When the layer declares `gee.stocks`, the result is the stock report. */
  layerId?:      string
}

export type ZonalStatsOutcome =
  | { ok: true; result: RasterStatsResult; breaks?: number[] }
  | { ok: false; error: string; status: number }

/**
 * Only trust client-supplied breaks when they are a non-empty array of finite
 * numbers. Kept exactly as the route had it: the ascending order the old
 * comment mentions was never actually checked, and adding the check here would
 * change behavior inside an extraction.
 */
function sanitizeBreaks(breaks: unknown): number[] | undefined {
  return Array.isArray(breaks) &&
    breaks.length > 0 &&
    breaks.every((n) => typeof n === 'number' && Number.isFinite(n))
    ? (breaks as number[])
    : undefined
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeZonalStats(ee: any, input: ZonalStatsInput): Promise<ZonalStatsOutcome> {
  const { asset, geometry, temporalDate, classify, colorType, layerId } = input
  const providedBreaks = sanitizeBreaks(input.breaks)

  const image  = buildEeImage(ee, asset, temporalDate)
  const region = ee.Geometry(geometry)
  const scale  = asset.scale ?? 500

  // Stock report: the layer declares which bands are pools and which asset
  // brings the phytophysiognomy, and the result is the total broken down along
  // both axes. It comes before the other branches because it replaces the
  // statistics of the visible band, it does not complement them.
  const stocks = layerId ? getStocks(layerId) : null
  if (stocks) {
    if (stocks.assetId !== asset.id || stocks.assetBand !== asset.band) {
      return { ok: false, error: 'layerId does not match the asset', status: 400 }
    }
    const report = await buildStockReport(
      ee, ee.Image(stocks.assetId), region, stocks.cfg, stocks.legenda, stocks.scale,
    )
    return { ok: true, result: { kind: 'stocks', report } }
  }

  // Resolve band name
  let bandName = temporalDate && asset.bandPattern
    ? bandaDoAno(asset.bandPattern, temporalDate.slice(0, 4))
    : asset.band
  if (!bandName) {
    const bands = await evaluate<string[]>(image.bandNames())
    bandName = bands?.[0]
  }
  if (!bandName) {
    return { ok: false, error: 'Could not determine band name', status: 500 }
  }

  // Categorical branch: Jenks classify -> area per class
  if (classify?.method === 'jenks' && classify.numClasses >= 2) {
    const numClasses = classify.numClasses

    // Prefer the biome-wide breaks from /api/gee/tile so the chart classes
    // match the map colors and legend exactly. Only fall back to sampling this
    // feature when the caller did not supply them.
    let breaks: number[]
    if (providedBreaks) {
      breaks = providedBreaks
    } else {
      const sample = image.sample({
        region, scale, numPixels: 5000, seed: 42, geometries: false,
      })
      const values = await evaluate<number[]>(sample.aggregate_array(bandName))

      if (!values || values.length < numClasses) {
        return {
          ok: false,
          error: `Not enough valid pixels (got ${values?.length ?? 0})`,
          status: 422,
        }
      }
      breaks = jenksBreaks(values, numClasses)
    }

    let classified = ee.Image.constant(1).toInt()
    for (let i = 0; i < breaks.length; i++) {
      classified = classified.where(image.gt(breaks[i]), i + 2)
    }
    classified = classified.updateMask(image.mask())

    // Area (m²) per class via pixelArea summed and grouped by class. Robust to
    // bestEffort rescaling (area is conserved), where a pixel count would be
    // wrong whenever GEE coarsens the scale for a large region.
    const areaImg = ee.Image.pixelArea().addBands(classified)
    const grouped = areaImg.reduceRegion({
      reducer:    ee.Reducer.sum().group({ groupField: 1, groupName: 'class' }),
      geometry:   region,
      scale,
      maxPixels:  1e9,
      bestEffort: true,
    })

    const raw = await evaluate<{ groups?: { class: number; sum: number }[] }>(grouped)
    const areas: Record<string, number> = {}
    for (const g of raw.groups ?? []) {
      areas[String(Math.trunc(Number(g.class)))] = g.sum
    }

    return { ok: true, result: { kind: 'categorical', areas }, breaks }
  }

  // Raw categorical branch: area per class code on the original image. Used
  // when the layer is already classified (integer pixel values matching the
  // classes in layers.json) and no Jenks is required.
  if (colorType === 'categorical') {
    const areaImg = ee.Image.pixelArea().addBands(image)
    const grouped = areaImg.reduceRegion({
      reducer:    ee.Reducer.sum().group({ groupField: 1, groupName: 'class' }),
      geometry:   region,
      scale,
      maxPixels:  1e9,
      bestEffort: true,
    })

    const raw = await evaluate<{ groups?: { class: number; sum: number }[] }>(grouped)
    const areas: Record<string, number> = {}
    for (const g of raw.groups ?? []) {
      // Normalize "1.0" -> "1" so the legend lookup by integer value works.
      const intKey = String(Math.trunc(Number(g.class)))
      areas[intKey] = (areas[intKey] ?? 0) + g.sum
    }

    if (Object.keys(areas).length === 0) {
      return { ok: false, error: 'No valid pixels in the given geometry', status: 422 }
    }

    return { ok: true, result: { kind: 'categorical', areas } }
  }

  // Continuous branch: numeric stats
  const combined = ee.Reducer.mean()
    .combine({ reducer2: ee.Reducer.minMax(), sharedInputs: true })
    .combine({ reducer2: ee.Reducer.median(), sharedInputs: true })
    .combine({ reducer2: ee.Reducer.stdDev(), sharedInputs: true })
    .combine({ reducer2: ee.Reducer.count(),  sharedInputs: true })
    .combine({ reducer2: ee.Reducer.sum(),    sharedInputs: true })

  const reduced = image.reduceRegion({
    reducer:    combined,
    geometry:   region,
    scale,
    maxPixels:  1e9,
    bestEffort: true,
  })

  const raw = await evaluate<Record<string, number | null>>(reduced)

  const get = (suffix: string): number | undefined => {
    const v = raw[`${bandName}_${suffix}`]
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined
  }

  const mean   = get('mean')
  const min    = get('min')
  const max    = get('max')
  const median = get('median')
  const std    = get('stdDev')
  const count  = get('count')
  const sum    = get('sum')

  if (mean === undefined || min === undefined || max === undefined || count === undefined) {
    return { ok: false, error: 'No valid pixels in the given geometry', status: 422 }
  }

  return {
    ok: true,
    result: { kind: 'continuous', stats: { min, max, mean, median, std, count, sum } },
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/zonalStats.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Thin the route down to its HTTP job**

Replace the body of `POST` in `app/api/gee/stats/route.ts` from `const ee = getEe()` onward, and drop the imports that moved out (`bandaDoAno`, `jenksBreaks`, `evaluate`, `getStocks`, `buildStockReport`). Keep `buildEeImage`'s type import for `ReqBody`.

```ts
  const ee = getEe()

  try {
    const outcome = await computeZonalStats(ee, {
      asset:        body.asset,
      geometry:     body.geometry,
      temporalDate: body.temporalDate,
      classify:     body.classify,
      breaks:       body.breaks,
      colorType:    body.colorType,
      layerId:      body.layerId,
    })

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status })
    }

    const { result } = outcome
    if (result.kind === 'stocks') {
      return NextResponse.json({ kind: 'stocks', report: result.report })
    }
    if (result.kind === 'categorical') {
      // `breaks` is echoed for wire compatibility: the client ignores it today,
      // but it has always been part of the Jenks response.
      return NextResponse.json({
        kind: 'categorical',
        areas: result.areas,
        ...(outcome.breaks ? { breaks: outcome.breaks } : {}),
      })
    }
    return NextResponse.json({ kind: 'continuous', stats: result.stats })
  } catch (err) {
    console.error('[/api/gee/stats] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
```

Add the import:

```ts
import { computeZonalStats } from '@/lib/mapa/zonalStats'
```

- [ ] **Step 6: Verify the route did not change behavior**

Run: `npx vitest run tests/app/statsRoute.test.ts tests/lib/zonalStats.test.ts`
Expected: PASS. `tests/app/statsRoute.test.ts` is the regression net for this task — it asserts the 401, the stock 200 and the stock 400 straight through the route. If it fails, the extraction changed something.

Run: `npm run build`
Expected: success. A leftover unused import would fail lint, and a type mismatch between the outcome and `RasterStatsResult` would fail the build.

- [ ] **Step 7: Lint and commit**

```bash
npm run lint
git add lib/mapa/zonalStats.ts app/api/gee/stats/route.ts tests/lib/zonalStats.test.ts
git commit -m "refactor: extract the zonal statistics computation out of the route"
```

---

## Task 5: Extract the yearly series and add a zonal reducer

`app/api/gee/timeseries/route.ts` builds the series **at a point**: `ee.Geometry.Point([lon, lat])` reduced with `Reducer.first()`. The report needs the same series over a recorte, reduced with `mean`.

The clever part of the existing implementation is what must survive: one year per band, all read in a single `reduceRegion`, each band built through `buildEeImage`. That last point is the one `CLAUDE.md` puts in bold — a path that built its own `ee.Image` would show LST near 15000 in the chart while the map shows degrees Celsius.

**Files:**
- Create: `lib/mapa/zonalSeries.ts`
- Modify: `app/api/gee/timeseries/route.ts`
- Test: `tests/lib/zonalSeries.test.ts`

**Interfaces:**
- Consumes: `buildEeImage`, `GeeAssetConfig` from `lib/mapa/geeImage.ts`; `evaluate` from `lib/mapa/geeEvaluate.ts`.
- Produces:

```ts
export const MAX_ANOS = 50
export function anosDoIntervalo(r: unknown): number[] | null
export type SeriesRegion =
  | { kind: 'point'; lon: number; lat: number }
  | { kind: 'zonal'; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }; scale?: number }
export interface ZonalSeriesInput {
  asset:  GeeAssetConfig
  anos:   number[]
  region: SeriesRegion
}
export async function computeSeries(
  ee: any, input: ZonalSeriesInput,
): Promise<TimeSeriesPoint[]>
```

- [ ] **Step 1: Write the failing test**

Create `tests/lib/zonalSeries.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  evaluate: vi.fn<(obj: unknown) => Promise<unknown>>(),
  buildEeImage: vi.fn(() => eeStub()),
}))

vi.mock('@/lib/mapa/geeEvaluate', () => ({ evaluate: mocks.evaluate, GEE_TIMEOUT_MS: 1000 }))
vi.mock('@/lib/mapa/geeImage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/geeImage')>(),
  buildEeImage: mocks.buildEeImage,
}))

import { anosDoIntervalo, computeSeries, MAX_ANOS } from '@/lib/mapa/zonalSeries'

/** Self-returning stub; see the note in tests/lib/zonalStats.test.ts. */
function eeStub(): any {
  const handler: ProxyHandler<any> = { get: () => stub, apply: () => stub }
  const stub: any = new Proxy(function noop() {}, handler)
  return stub
}

const imageAsset = {
  type: 'image' as const,
  id: 'projects/mapbiomas-public/assets/x',
  bandPattern: 'classification_{ano}',
  scale: 30,
}
const collectionAsset = {
  type: 'imageCollection' as const,
  id: 'UCSB-CHG/CHIRPS/DAILY', band: 'precipitation', reducer: 'sum' as const, scale: 5566,
}
const polygon = {
  type: 'Polygon' as const,
  coordinates: [[[-40, -8], [-40, -7], [-39, -7], [-40, -8]]],
}

describe('anosDoIntervalo', () => {
  it('expands an ISO range into years', () => {
    expect(anosDoIntervalo(['2020-01-01', '2023-01-01'])).toEqual([2020, 2021, 2022, 2023])
  })

  it('rejects a malformed, inverted or oversized range', () => {
    expect(anosDoIntervalo('2020')).toBeNull()
    expect(anosDoIntervalo(['2023-01-01', '2020-01-01'])).toBeNull()
    expect(anosDoIntervalo(['1900-01-01', '2100-01-01'])).toBeNull()
    expect(anosDoIntervalo([`${2000}-01-01`, `${2000 + MAX_ANOS}-01-01`])).toBeNull()
  })
})

describe('computeSeries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds one band per year through buildEeImage and reads them in one evaluate', async () => {
    mocks.evaluate.mockResolvedValueOnce({ a2021: 10, a2022: 20, a2023: 30 })

    const series = await computeSeries(eeStub(), {
      asset: imageAsset,
      anos: [2021, 2022, 2023],
      region: { kind: 'zonal', geometry: polygon, scale: 300 },
    })

    expect(series).toEqual([
      { date: '2021-01-01', value: 10 },
      { date: '2022-01-01', value: 20 },
      { date: '2023-01-01', value: 30 },
    ])
    // One image per year, each through buildEeImage: that is what keeps the
    // chart in the same unit and under the same mask as the map.
    expect(mocks.buildEeImage).toHaveBeenCalledTimes(3)
    expect(mocks.buildEeImage.mock.calls.map((c) => c[2])).toEqual([
      '2021-01-01', '2022-01-01', '2023-01-01',
    ])
    expect(mocks.evaluate).toHaveBeenCalledOnce()
  })

  it('turns a missing or non-finite year into null instead of zero', async () => {
    // A zero here would be read as a real measurement of no rain.
    mocks.evaluate.mockResolvedValueOnce({ a2021: 10, a2022: null })

    const series = await computeSeries(eeStub(), {
      asset: imageAsset,
      anos: [2021, 2022, 2023],
      region: { kind: 'point', lon: -39.5, lat: -7.5 },
    })

    expect(series).toEqual([
      { date: '2021-01-01', value: 10 },
      { date: '2022-01-01', value: null },
      { date: '2023-01-01', value: null },
    ])
  })

  it('drops years a gapped collection does not have, before assembling', async () => {
    // ESA CCI only has 2007, 2010 and 2015 onward: asking for an empty year
    // makes the reducer return a band-less image and the whole assembly fail.
    mocks.evaluate
      .mockResolvedValueOnce([2015, 2016])                    // years present
      .mockResolvedValueOnce({ a2015: 26.5, a2016: 27.1 })    // the reduction

    const series = await computeSeries(eeStub(), {
      asset: collectionAsset,
      anos: [2014, 2015, 2016],
      region: { kind: 'zonal', geometry: polygon },
    })

    expect(series).toEqual([
      { date: '2015-01-01', value: 26.5 },
      { date: '2016-01-01', value: 27.1 },
    ])
  })

  it('returns an empty series when a gapped collection has none of the years', async () => {
    mocks.evaluate.mockResolvedValueOnce([])

    const series = await computeSeries(eeStub(), {
      asset: collectionAsset,
      anos: [2001, 2002],
      region: { kind: 'zonal', geometry: polygon },
    })

    expect(series).toEqual([])
    // No point reducing anything: the availability query settles it.
    expect(mocks.evaluate).toHaveBeenCalledOnce()
  })

  it('skips the availability query for a band-pattern asset', async () => {
    // The year is in the band name, so there is no collection to interrogate.
    mocks.evaluate.mockResolvedValueOnce({ a2023: 5 })

    await computeSeries(eeStub(), {
      asset: imageAsset,
      anos: [2023],
      region: { kind: 'zonal', geometry: polygon },
    })

    expect(mocks.evaluate).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/zonalSeries.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/mapa/zonalSeries"`.

- [ ] **Step 3: Write the extracted and extended module**

Create `lib/mapa/zonalSeries.ts`:

```ts
// Yearly series of a raster, at a point or over a region.
//
// Extracted from app/api/gee/timeseries/route.ts, which only ever did the point
// form, and extended with the zonal one the report needs.
//
// What the extraction has to preserve: one year per band, all read in a single
// `reduceRegion` instead of one request per year, and every band built through
// `buildEeImage`. That last point is what makes the chart and the map agree —
// a path that assembled its own ee.Image would return raw DN and show MODIS
// LST near 15000 while the map shows degrees Celsius.

import { buildEeImage, type GeeAssetConfig } from '@/lib/mapa/geeImage'
import { evaluate } from '@/lib/mapa/geeEvaluate'
import type { TimeSeriesPoint } from '@/types/mapa'

// Cap of years per request. MapBiomas covers 1985 to 2024, forty stops, so the
// old twenty-year limit would leave half of the series out.
export const MAX_ANOS = 50

export type SeriesRegion =
  | { kind: 'point'; lon: number; lat: number }
  | {
      kind: 'zonal'
      geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }
      /** Effective scale; the caller coarsens it for a large recorte. */
      scale?: number
    }

export interface ZonalSeriesInput {
  asset:  GeeAssetConfig
  anos:   number[]
  region: SeriesRegion
}

/** Validates an ISO range and returns its years, or null if it breaks the rules. */
export function anosDoIntervalo(r: unknown): number[] | null {
  if (!Array.isArray(r) || r.length !== 2) return null
  const [a, b] = r
  if (typeof a !== 'string' || typeof b !== 'string') return null
  const ini = Number(a.slice(0, 4))
  const fim = Number(b.slice(0, 4))
  if (!Number.isInteger(ini) || !Number.isInteger(fim)) return null
  if (ini < 1970 || fim > 2100 || ini > fim) return null
  if (fim - ini + 1 > MAX_ANOS) return null
  return Array.from({ length: fim - ini + 1 }, (_, i) => ini + i)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeSeries(ee: any, input: ZonalSeriesInput): Promise<TimeSeriesPoint[]> {
  const { asset, anos, region } = input
  if (anos.length === 0) return []

  // A collection with gaps, like ESA CCI, which only has 2007, 2010 and 2015 to
  // 2022: asking for an empty year makes the reducer return an image with no
  // band and the whole assembly fail. A cheap query for the existing years
  // avoids that and, as a bonus, makes the series show only the real stops.
  let anosUteis = anos
  if (!asset.bandPattern && asset.type === 'imageCollection') {
    const disponiveis = await evaluate<number[]>(
      ee.ImageCollection(asset.id)
        .filterDate(`${anos[0]}-01-01`, `${anos[anos.length - 1] + 1}-01-01`)
        .aggregate_array('system:time_start')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => ee.Date(t).get('year'))
        .distinct(),
    )
    const comDado = new Set(disponiveis ?? [])
    anosUteis = anos.filter((a) => comDado.has(a))
    if (anosUteis.length === 0) return []
  }

  // One year per band, each built through the same path that serves the tile,
  // which guarantees the same unit and the same mask in the chart and the map.
  const porAno = anosUteis.map((ano) =>
    buildEeImage(ee, asset, `${ano}-01-01`).rename(`a${ano}`),
  )

  // The point form samples a single pixel, so `first` over one read per band is
  // both correct and the cheapest possible. The zonal form averages the region,
  // and needs the large-region guards the other reductions use.
  const reduceArgs = region.kind === 'point'
    ? {
        reducer:   ee.Reducer.first(),
        geometry:  ee.Geometry.Point([region.lon, region.lat]),
        scale:     asset.scale ?? 500,
        // The cap counts one read per band, and here there is one band per year.
        maxPixels: anosUteis.length,
      }
    : {
        reducer:    ee.Reducer.mean(),
        geometry:   ee.Geometry(region.geometry),
        scale:      region.scale ?? asset.scale ?? 500,
        maxPixels:  1e9,
        bestEffort: true,
        // Forty bands over a state is a lot of tiles in flight; the same guard
        // the stock report uses keeps the request inside the memory limit.
        tileScale:  4,
      }

  const valores = await evaluate<Record<string, unknown>>(
    ee.Image.cat(porAno).reduceRegion(reduceArgs),
  )

  return anosUteis.map((ano) => {
    const bruto = valores?.[`a${ano}`]
    return {
      date:  `${ano}-01-01`,
      // Empty rather than zero: a zero would be read as a real measurement.
      value: typeof bruto === 'number' && Number.isFinite(bruto) ? bruto : null,
    }
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/zonalSeries.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Thin the timeseries route**

In `app/api/gee/timeseries/route.ts`, delete the local `MAX_ANOS` and `anosDoIntervalo`, import them from the module, and replace everything from `const ee = getEe()` to the end of the `try` with the point call:

```ts
import { anosDoIntervalo, computeSeries, MAX_ANOS } from '@/lib/mapa/zonalSeries'
```

```ts
  const ee = getEe()

  try {
    const series = await computeSeries(ee, {
      asset: body.asset,
      anos,
      region: { kind: 'point', lon: body.lon, lat: body.lat },
    })
    return NextResponse.json({ series })
  } catch (err) {
    console.error('[/api/gee/timeseries] error:', err)
    return NextResponse.json({ error: 'Failed to process Earth Engine request' }, { status: 500 })
  }
}
```

The validation above it is unchanged, including the 400 whose message interpolates `MAX_ANOS` — it now reads the imported constant, so the number in the message and the number enforced stay the same one.

- [ ] **Step 6: Verify**

Run: `npm test`
Expected: PASS, the whole suite. Nothing else imports the timeseries route, so the suite plus the build is the net here.

Run: `npm run build`
Expected: success.

- [ ] **Step 7: Lint and commit**

```bash
npm run lint
git add lib/mapa/zonalSeries.ts app/api/gee/timeseries/route.ts tests/lib/zonalSeries.test.ts
git commit -m "feat: yearly series over a region, extracted from the point route"
```

---
## Task 6: Class shares and the deterministic narrative

The narrative is the piece with the most room to be quietly wrong, and the easiest to test: it is a pure function from a measured analysis to three sentences. No Earth Engine, no `server-only`.

Two reuses instead of reinvention, which is what keeps the document from contradicting the panel:

- Layers with `signedFlux` take their vocabulary from `describeFlux` in `lib/mapa/carbonFlux.ts` — `"sequestrou"` / `"emitiu"` with the sign dropped — instead of putting a raw minus sign in a sentence. That module already documents why the panel does it that way.
- Numbers come from `numero` in `lib/mapa/format.ts` (Task 1), so the prose and the CSV never disagree.

Every sentence opens with `Em <feição>`, and not with an article. The recorte types differ in gender and article — *o* município, *a* terra indígena, *o* assentamento, *o* bioma — and a preposition table keyed by recorte type is a thing that drifts the moment a seventh recorte arrives. `Em` is correct for all of them.

**Files:**
- Create: `lib/mapa/classShares.ts`
- Create: `lib/mapa/reportNarrative.ts`
- Test: `tests/lib/classShares.test.ts`
- Test: `tests/lib/reportNarrative.test.ts`

**Interfaces:**
- Consumes: `numero` from `lib/mapa/format.ts`; `describeFlux` from `lib/mapa/carbonFlux.ts`; `ReportLayerConfig` from `config/mapa/reportLayers.ts`; `ReportNarrative`, `ReportAnalysisStatus`, `ReportRecorte` from `types/relatorio.ts`; `RasterClass`, `RasterStatsResult`, `TimeSeriesPoint` from `types/mapa.ts`.
- Produces:

```ts
// lib/mapa/classShares.ts
export interface ClassShare {
  value:  number
  label:  string
  color:  string
  areaHa: number
  /** Percent of the total area, 0..100. */
  share:  number
}
export function classShares(
  areas: Record<string, number>, classes: RasterClass[],
): ClassShare[]

// lib/mapa/reportNarrative.ts
export interface NarrativeInput {
  recorte:       ReportRecorte
  layerName:     string
  unit?:         string
  signedFlux?:   boolean
  classes?:      RasterClass[]
  config:        ReportLayerConfig
  status:        ReportAnalysisStatus
  effectiveYear: string | null
  snapshot:      RasterStatsResult | null
  series:        TimeSeriesPoint[]
}
export function buildNarrative(input: NarrativeInput): ReportNarrative
```

- [ ] **Step 1: Write the failing test for the shares**

Create `tests/lib/classShares.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { classShares } from '@/lib/mapa/classShares'
import type { RasterClass } from '@/types/mapa'

const classes: RasterClass[] = [
  { value: 3, label: 'Formação Florestal', color: '#1f8d49' },
  { value: 15, label: 'Pastagem', color: '#edde8e' },
  { value: 21, label: 'Mosaico de Usos', color: '#ffefc3' },
]

describe('classShares', () => {
  it('converts areas in m² to hectares and shares of the total', () => {
    const shares = classShares({ '3': 400_000, '15': 600_000 }, classes)

    expect(shares).toEqual([
      { value: 15, label: 'Pastagem', color: '#edde8e', areaHa: 60, share: 60 },
      { value: 3, label: 'Formação Florestal', color: '#1f8d49', areaHa: 40, share: 40 },
    ])
  })

  it('drops classes absent from the data instead of listing them at zero', () => {
    const shares = classShares({ '3': 1_000_000 }, classes)

    expect(shares.map((s) => s.value)).toEqual([3])
  })

  it('collects codes missing from the configuration so the shares still add to 100', () => {
    // Without the remainder the percentages silently stop summing to 100.
    const shares = classShares({ '3': 500_000, '99': 500_000 }, classes)

    expect(shares).toEqual([
      { value: 3, label: 'Formação Florestal', color: '#1f8d49', areaHa: 50, share: 50 },
      { value: -1, label: 'Não classificadas', color: '#9e9e9e', areaHa: 50, share: 50 },
    ])
    expect(shares.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(100)
  })

  it('breaks ties by class value so the order is deterministic', () => {
    const shares = classShares({ '3': 500_000, '15': 500_000 }, classes)

    expect(shares.map((s) => s.value)).toEqual([3, 15])
  })

  it('returns an empty list when there is no area at all', () => {
    expect(classShares({}, classes)).toEqual([])
    expect(classShares({ '3': 0 }, classes)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/classShares.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/mapa/classShares"`.

- [ ] **Step 3: Write the shares module**

Create `lib/mapa/classShares.ts`:

```ts
// Turns the area-per-class map the zonal statistics return into a sorted list
// of shares, with the labels and colors of the layer configuration.
//
// The trailing remainder is the point of the module: codes present in the data
// but absent from `layers.json` exist (a collection gains a class before the
// config catches up), and without collecting them the percentages stop adding
// up to 100 with no sign that anything is missing.

import type { RasterClass } from '@/types/mapa'

export interface ClassShare {
  value:  number
  label:  string
  color:  string
  areaHa: number
  /** Percent of the total area, 0..100. */
  share:  number
}

/** Sentinel value of the remainder bucket: no real class code is negative. */
const UNCLASSIFIED_VALUE = -1

export function classShares(
  areas: Record<string, number>,
  classes: RasterClass[],
): ClassShare[] {
  const totalM2 = Object.values(areas).reduce((a, b) => a + b, 0)
  if (totalM2 <= 0) return []

  const out: ClassShare[] = []
  for (const cls of classes) {
    const m2 = areas[String(cls.value)] ?? 0
    if (m2 <= 0) continue
    out.push({
      value:  cls.value,
      label:  cls.label,
      color:  cls.color,
      areaHa: m2 / 10_000,
      share:  (m2 / totalM2) * 100,
    })
  }

  const knownM2 = classes.reduce((a, cls) => a + (areas[String(cls.value)] ?? 0), 0)
  const restoM2 = totalM2 - knownM2
  if (restoM2 > 0) {
    // "Não classificadas": the same label the CSV export uses, so the file and
    // the document name the leftover the same way.
    out.push({
      value:  UNCLASSIFIED_VALUE,
      label:  'Não classificadas',
      color:  '#9e9e9e',
      areaHa: restoM2 / 10_000,
      share:  (restoM2 / totalM2) * 100,
    })
  }

  // Descending share, with the class value breaking ties so two classes of
  // equal area always come out in the same order.
  return out.sort((a, b) => b.share - a.share || a.value - b.value)
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/lib/classShares.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing test for the narrative**

Create `tests/lib/reportNarrative.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildNarrative, type NarrativeInput } from '@/lib/mapa/reportNarrative'
import { getReportLayer } from '@/config/mapa/reportLayers'
import type { ReportRecorte } from '@/types/relatorio'
import type { RasterClass } from '@/types/mapa'

const recorte: ReportRecorte = {
  layerId: 'municipios', layerName: 'Municípios',
  featureId: 'campina-grande', featureName: 'Campina Grande',
  areaHa: 59_412, bbox: [-36, -7.4, -35.7, -7.1], boundary: 'full',
}

function input(over: Partial<NarrativeInput>): NarrativeInput {
  return {
    recorte,
    layerName: 'Carbono Orgânico do Solo (0-30 cm)',
    unit: 't C/ha',
    config: getReportLayer('solo_carbono')!,
    status: 'available',
    effectiveYear: '2023',
    snapshot: null,
    series: [],
    ...over,
  }
}

const lulcClasses: RasterClass[] = [
  { value: 3, label: 'Formação Florestal', color: '#1f8d49' },
  { value: 15, label: 'Pastagem', color: '#edde8e' },
]

describe('buildNarrative situation', () => {
  it('states mean and range for a continuous layer', () => {
    const { situation } = buildNarrative(input({
      snapshot: {
        kind: 'continuous',
        stats: { min: 11.2, max: 48.9, mean: 24.3, median: 22.5, std: 4.25, count: 1200 },
      },
    }))

    expect(situation).toBe(
      'Em Campina Grande, o Carbono Orgânico do Solo (0-30 cm) tem média de 24,3 t C/ha em 2023, variando de 11,2 a 48,9 t C/ha.',
    )
  })

  it('drops the sign and carries the direction in a word for a signed flux', () => {
    // The source follows the atmospheric convention: negative is removal. A
    // minus sign in a sentence reads as the opposite of what it deserves.
    const { situation } = buildNarrative(input({
      layerName: 'Fluxo Líquido de Carbono Florestal (GFW)',
      unit: 'Mg CO2e/ha',
      signedFlux: true,
      config: getReportLayer('gfw_netflux')!,
      effectiveYear: null,
      snapshot: {
        kind: 'continuous',
        stats: { min: -8.4, max: 3.1, mean: -1.23, count: 900 },
      },
    }))

    expect(situation).toBe(
      'Em Campina Grande, o Fluxo Líquido de Carbono Florestal (GFW) indica que a área sequestrou, em média, 1,23 Mg CO2e/ha.',
    )
    expect(situation).not.toContain('-1,23')
  })

  it('names the dominant class and its share for a categorical layer', () => {
    const { situation } = buildNarrative(input({
      layerName: 'Uso e Cobertura (MapBiomas 2024)',
      unit: undefined,
      classes: lulcClasses,
      config: getReportLayer('lulc_mapbiomas')!,
      effectiveYear: '2024',
      snapshot: { kind: 'categorical', areas: { '15': 600_000, '3': 400_000 } },
    }))

    expect(situation).toBe(
      'Em Campina Grande, a classe predominante de Uso e Cobertura (MapBiomas 2024) é Pastagem, com 60,0% da área analisada nesta classe de uso e cobertura, em 2024.',
    )
  })

  it('states the total, the density and both leading axes for a stock report', () => {
    const { situation } = buildNarrative(input({
      layerName: 'Estoque de Carbono (Quarto Inventário Nacional)',
      unit: 't C/ha',
      config: getReportLayer('estoque_carbono')!,
      effectiveYear: null,
      snapshot: {
        kind: 'stocks',
        report: {
          totalTc: 2_345_678, areaHa: 59_412, unit: 't C',
          pools: [
            { band: 'b1', label: 'Biomassa acima do solo', tc: 1_130_000 },
            { band: 'b2', label: 'Carbono do solo', tc: 1_215_678 },
          ],
          classes: [
            { codigo: 1, sigla: 'Ta', tc: 1_032_098, areaHa: 26_000, porPool: {} },
            { codigo: 2, sigla: 'Sa', tc: 500_000, areaHa: 15_000, porPool: {} },
          ],
        },
      },
    }))

    expect(situation).toBe(
      'Em Campina Grande, o estoque total de carbono é de 2.345.678 t C sobre 59.412 ha, uma densidade média de 39,5 t C/ha. O reservatório Carbono do solo responde por 51,8% do total, e a fitofisionomia Ta por 44,0%.',
    )
  })

  it('says nothing at all when the analysis is not available', () => {
    for (const status of ['unavailable', 'year_not_found'] as const) {
      expect(buildNarrative(input({ status, snapshot: null }))).toEqual({
        situation: null, trend: null, context: null,
      })
    }
  })
})

describe('buildNarrative trend', () => {
  const series = [
    { date: '2021-01-01', value: 22.0 },
    { date: '2022-01-01', value: 23.0 },
    { date: '2023-01-01', value: 24.3 },
  ]

  it('compares the effective year with the previous stop', () => {
    const { trend } = buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 24.3, count: 10 } },
      series,
    }))

    expect(trend).toBe(
      'Em relação a 2022, houve aumento de 1,3 t C/ha, ou 5,7%.',
    )
  })

  it('uses the configured decrease term when the value fell', () => {
    const { trend } = buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 21.0, count: 10 } },
      series: [...series.slice(0, 2), { date: '2023-01-01', value: 21.0 }],
    }))

    expect(trend).toBe('Em relação a 2022, houve redução de 2,0 t C/ha, ou 8,7%.')
  })

  it('calls a sub-half-percent move stable rather than inventing a trend', () => {
    const { trend } = buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 23.05, count: 10 } },
      series: [...series.slice(0, 2), { date: '2023-01-01', value: 23.05 }],
    }))

    expect(trend).toBe('Em relação a 2022, o valor permaneceu estável.')
  })

  it('is null with no previous stop, with a gap at the previous stop, or with no trend vocabulary', () => {
    // First year of the series: nothing behind it.
    expect(buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 22, count: 10 } },
      effectiveYear: '2021', series,
    })).trend).toBeNull()

    // Previous stop is nodata: a delta against null is not a trend.
    expect(buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 24.3, count: 10 } },
      series: [{ date: '2022-01-01', value: null }, { date: '2023-01-01', value: 24.3 }],
    })).trend).toBeNull()

    // lulc_mapbiomas declares no trend block, because its series is meaningless.
    expect(buildNarrative(input({
      config: getReportLayer('lulc_mapbiomas')!,
      classes: lulcClasses,
      snapshot: { kind: 'categorical', areas: { '15': 10 } },
      effectiveYear: '2024',
      series: [{ date: '2023-01-01', value: 9 }, { date: '2024-01-01', value: 10 }],
    })).trend).toBeNull()
  })
})

describe('buildNarrative context', () => {
  it('summarises the whole series with its extremes and their years', () => {
    const { context } = buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 24.3, count: 10 } },
      series: [
        { date: '2020-01-01', value: 19.2 },
        { date: '2021-01-01', value: 27.4 },
        { date: '2022-01-01', value: 23.0 },
        { date: '2023-01-01', value: 24.3 },
      ],
    }))

    expect(context).toBe(
      'Na série de 2020 a 2023, a média é 23,5 t C/ha, com máximo de 27,4 em 2021 e mínimo de 19,2 em 2020.',
    )
  })

  it('is null for a series too short to summarise', () => {
    expect(buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 24.3, count: 10 } },
      series: [{ date: '2023-01-01', value: 24.3 }],
    })).context).toBeNull()
  })

  it('ignores nodata years when computing the extremes', () => {
    const { context } = buildNarrative(input({
      snapshot: { kind: 'continuous', stats: { min: 1, max: 2, mean: 24.3, count: 10 } },
      series: [
        { date: '2021-01-01', value: null },
        { date: '2022-01-01', value: 20.0 },
        { date: '2023-01-01', value: 24.0 },
      ],
    }))

    expect(context).toBe(
      'Na série de 2022 a 2023, a média é 22,0 t C/ha, com máximo de 24,0 em 2023 e mínimo de 20,0 em 2022.',
    )
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run tests/lib/reportNarrative.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/mapa/reportNarrative"`.

- [ ] **Step 7: Write the narrative module**

Create `lib/mapa/reportNarrative.ts`:

```ts
// Deterministic prose for one report section, from the numbers already measured.
//
// A pure function on purpose: no Earth Engine, no `server-only`, no clock. The
// sentences are the part of the document most able to be quietly wrong, and
// this way the whole of it is covered by a unit test.
//
// Every sentence opens with "Em <feição>" rather than with an article. The
// recorte types differ in gender and article — o município, a terra indígena,
// o assentamento, o bioma — and a preposition table keyed by recorte type
// drifts the moment a seventh recorte arrives.

import { describeFlux } from '@/lib/mapa/carbonFlux'
import { classShares } from '@/lib/mapa/classShares'
import { numero } from '@/lib/mapa/format'
import type { ReportLayerConfig } from '@/config/mapa/reportLayers'
import type {
  ReportAnalysisStatus,
  ReportNarrative,
  ReportRecorte,
} from '@/types/relatorio'
import type { RasterClass, RasterStatsResult, TimeSeriesPoint } from '@/types/mapa'

export interface NarrativeInput {
  recorte:       ReportRecorte
  layerName:     string
  unit?:         string
  signedFlux?:   boolean
  classes?:      RasterClass[]
  config:        ReportLayerConfig
  status:        ReportAnalysisStatus
  effectiveYear: string | null
  snapshot:      RasterStatsResult | null
  series:        TimeSeriesPoint[]
}

/** Below this relative move, a difference is noise rather than a trend. */
const STABLE_THRESHOLD = 0.005

const EMPTY: ReportNarrative = { situation: null, trend: null, context: null }

/** " em 2023", or nothing at all on a layer with no year. */
function atYear(year: string | null): string {
  return year ? ` em ${year}` : ''
}

function withUnit(value: number, unit: string | undefined, digits = 1): string {
  return unit ? `${numero(value, digits)} ${unit}` : numero(value, digits)
}

function situationContinuous(input: NarrativeInput, stats: { mean: number; min: number; max: number }) {
  const { recorte, layerName, unit, signedFlux, effectiveYear } = input

  if (signedFlux) {
    // The magnitude and the verb come from the module that owns this
    // convention, so the document and the panel say the same word.
    const flux = describeFlux(stats.mean)
    if (!flux.label) return null
    return `Em ${recorte.featureName}, o ${layerName} indica que a área ${flux.label}, em média, ${withUnit(flux.magnitude, unit, 2)}${atYear(effectiveYear)}.`
  }

  return `Em ${recorte.featureName}, o ${layerName} tem média de ${withUnit(stats.mean, unit)}${atYear(effectiveYear)}, variando de ${numero(stats.min)} a ${withUnit(stats.max, unit)}.`
}

function situationCategorical(input: NarrativeInput, areas: Record<string, number>) {
  const { recorte, layerName, classes, config, effectiveYear } = input
  const dominant = classShares(areas, classes ?? [])[0]
  if (!dominant) return null

  return `Em ${recorte.featureName}, a classe predominante de ${layerName} é ${dominant.label}, com ${numero(dominant.share)}% da área analisada ${config.coverageContext}${atYear(effectiveYear)}.`
}

function situationStocks(input: NarrativeInput, report: Extract<RasterStatsResult, { kind: 'stocks' }>['report']) {
  const { recorte } = input
  if (report.totalTc <= 0 || report.areaHa <= 0) return null

  const topPool = [...report.pools].sort((a, b) => b.tc - a.tc)[0]
  // `classes` already arrives sorted by decreasing stock from the report.
  const topClass = report.classes[0]
  const density = report.totalTc / report.areaHa

  const parts = [
    `Em ${recorte.featureName}, o estoque total de carbono é de ${numero(report.totalTc, 0)} ${report.unit} sobre ${numero(report.areaHa, 0)} ha, uma densidade média de ${numero(density)} ${report.unit}/ha.`,
  ]
  if (topPool && topClass) {
    parts.push(
      `O reservatório ${topPool.label} responde por ${numero((topPool.tc / report.totalTc) * 100)}% do total, e a fitofisionomia ${topClass.sigla} por ${numero((topClass.tc / report.totalTc) * 100)}%.`,
    )
  }
  return parts.join(' ')
}

function buildSituation(input: NarrativeInput): string | null {
  const { snapshot } = input
  if (!snapshot) return null

  switch (snapshot.kind) {
    case 'continuous':  return situationContinuous(input, snapshot.stats)
    case 'categorical': return situationCategorical(input, snapshot.areas)
    case 'stocks':      return situationStocks(input, snapshot.report)
    // A point series never reaches a report snapshot; the report's series lives
    // in its own field.
    case 'timeseries':  return null
  }
}

function buildTrend(input: NarrativeInput): string | null {
  const { config, unit, effectiveYear, series } = input
  // No vocabulary means the layer's series cannot carry a trend: either it is
  // static, or its mean is not a quantity (see `seriesKind` in the config).
  if (!config.trend || !effectiveYear) return null

  const index = series.findIndex((p) => p.date.slice(0, 4) === effectiveYear)
  if (index < 1) return null

  const current = series[index].value
  const previous = series[index - 1].value
  const previousYear = series[index - 1].date.slice(0, 4)
  // A delta against nodata is not a trend.
  if (current === null || previous === null) return null

  const delta = current - previous
  const relative = previous === 0 ? (delta === 0 ? 0 : Infinity) : Math.abs(delta / previous)
  if (relative < STABLE_THRESHOLD) {
    return `Em relação a ${previousYear}, o valor permaneceu estável.`
  }

  const term = delta > 0 ? config.trend.increaseTerm : config.trend.decreaseTerm
  const magnitude = withUnit(Math.abs(delta), unit)
  // The percentage is dropped when the previous value is zero, where it would
  // be a division by zero dressed up as a statistic.
  const percentage = previous === 0 ? '' : `, ou ${numero(relative * 100)}%`

  return `Em relação a ${previousYear}, houve ${term} de ${magnitude}${percentage}.`
}

function buildContext(input: NarrativeInput): string | null {
  const { config, unit, series } = input
  if (!config.trend) return null

  const measured = series.filter((p): p is { date: string; value: number } => p.value !== null)
  if (measured.length < 2) return null

  const mean = measured.reduce((sum, p) => sum + p.value, 0) / measured.length
  const highest = measured.reduce((best, p) => (p.value > best.value ? p : best))
  const lowest = measured.reduce((best, p) => (p.value < best.value ? p : best))
  const firstYear = measured[0].date.slice(0, 4)
  const lastYear = measured[measured.length - 1].date.slice(0, 4)

  return `Na série de ${firstYear} a ${lastYear}, a média é ${withUnit(mean, unit)}, com máximo de ${numero(highest.value)} em ${highest.date.slice(0, 4)} e mínimo de ${numero(lowest.value)} em ${lowest.date.slice(0, 4)}.`
}

/** The three sentences of a section, each null when it has nothing to say. */
export function buildNarrative(input: NarrativeInput): ReportNarrative {
  // An unavailable analysis says nothing: the section prints the status and the
  // years that do exist instead, and inventing prose over a gap is worse than
  // silence.
  if (input.status !== 'available') return EMPTY

  return {
    situation: buildSituation(input),
    trend:     buildTrend(input),
    context:   buildContext(input),
  }
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npx vitest run tests/lib/reportNarrative.test.ts`
Expected: PASS, 12 tests.

The expected strings in the test were written by hand. If one fails only on punctuation or on a rounded digit, read the actual output and decide which is right — but keep them exact. A loosened assertion here is exactly how a sentence starts reading wrong without anybody noticing.

- [ ] **Step 9: Lint and commit**

```bash
npm run lint
git add lib/mapa/classShares.ts lib/mapa/reportNarrative.ts \
        tests/lib/classShares.test.ts tests/lib/reportNarrative.test.ts
git commit -m "feat: deterministic narrative and class shares for the report"
```

---

## Task 7: Report cache and report service

The service is where the pieces meet: the registry resolves the geometry, the config says which layers are eligible, `computeZonalStats` measures the year, `computeSeries` measures the series, and the narrative turns both into prose.

The series error is caught **separately** from the snapshot error. That is the whole point of splitting the work per analysis: a series that times out over a whole state still leaves a section with its snapshot, its map and its situation sentence, instead of losing the section.

**Files:**
- Create: `lib/mapa/reportCache.ts`
- Create: `lib/mapa/reportService.ts`
- Test: `tests/lib/reportService.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2, 3, 4, 5 and 6; `paradas` and `ano` from `lib/mapa/temporal.ts`; `initGee` and `getEe` from `lib/mapa/geeAuth.ts`; `LAYER_META` from `config/mapa/layerMeta.ts`.
- Produces:

```ts
// lib/mapa/reportCache.ts
export function getCachedAnalysis(key: string): ReportAnalysis | undefined
export function setCachedAnalysis(key: string, analysis: ReportAnalysis): void
export function analysisCacheKey(
  recorteId: string, feicaoId: string, year: string, layerId: string,
): string

// lib/mapa/reportService.ts
export class ReportNotFoundError extends Error {}
export class ReportBadRequestError extends Error {}
export function buildReportShell(input: {
  recorteId: string; feicaoId: string; year: string; layerIds: string[]; now?: () => Date
}): ReportShell
export async function buildReportAnalysis(input: {
  recorteId: string; feicaoId: string; year: string; layerId: string
}): Promise<ReportAnalysis>
```

- [ ] **Step 1: Write the failing test**

Create `tests/lib/reportService.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ZonalStatsOutcome } from '@/lib/mapa/zonalStats'
import type { TimeSeriesPoint } from '@/types/mapa'

const mocks = vi.hoisted(() => ({
  computeZonalStats: vi.fn<() => Promise<ZonalStatsOutcome>>(),
  computeSeries: vi.fn<() => Promise<TimeSeriesPoint[]>>(),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({
  initGee: vi.fn(async () => {}),
  getEe: vi.fn(() => ({})),
}))
vi.mock('@/lib/mapa/zonalStats', () => ({ computeZonalStats: mocks.computeZonalStats }))
vi.mock('@/lib/mapa/zonalSeries', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/zonalSeries')>(),
  computeSeries: mocks.computeSeries,
}))

import {
  buildReportAnalysis,
  buildReportShell,
  ReportBadRequestError,
  ReportNotFoundError,
} from '@/lib/mapa/reportService'

const base = { recorteId: 'municipios', feicaoId: 'campina-grande', year: '2023' }

describe('buildReportShell', () => {
  it('identifies the recorte and orders the analyses by the configured order', () => {
    const shell = buildReportShell({
      ...base,
      layerIds: ['solo_carbono', 'estoque_carbono'],
      now: () => new Date('2026-09-12T12:00:00.000Z'),
    })

    expect(shell.schemaVersion).toBe(1)
    expect(shell.generatedAt).toBe('2026-09-12T12:00:00.000Z')
    expect(shell.requestedYear).toBe('2023')
    expect(shell.recorte).toMatchObject({
      layerId: 'municipios', layerName: 'Municípios',
      featureId: 'campina-grande', featureName: 'Campina Grande',
      boundary: 'full',
    })
    // estoque_carbono has the lowest `order`, whatever order the caller asked in.
    expect(shell.analyses.map((a) => a.layerId)).toEqual(['estoque_carbono', 'solo_carbono'])
  })

  it('fills the descriptor from layers.json, LAYER_META and the report config', () => {
    const shell = buildReportShell({ ...base, layerIds: ['solo_carbono'] })
    const [analysis] = shell.analyses

    expect(analysis).toMatchObject({
      layerId: 'solo_carbono',
      name: 'Carbono Orgânico do Solo (0-30 cm)',
      unit: 't C/ha',
      sectionColor: '#5A4632',
      requestedYear: '2023',
      effectiveYear: '2023',
    })
    expect(analysis.source).toBeTruthy()
    expect(analysis.methodology).toBeTruthy()
    expect(analysis.availableYears).toContain('2023')
  })

  it('marks a static layer as having no year and no series', () => {
    const shell = buildReportShell({ ...base, layerIds: ['estoque_carbono'] })
    const [analysis] = shell.analyses

    // No `gee.temporal`: there is nothing for a year to select.
    expect(analysis.requestedYear).toBeNull()
    expect(analysis.effectiveYear).toBeNull()
    expect(analysis.availableYears).toEqual([])
  })

  it('leaves effectiveYear null when the requested year is not a stop', () => {
    const shell = buildReportShell({ ...base, year: '1990', layerIds: ['solo_carbono'] })
    const [analysis] = shell.analyses

    expect(analysis.requestedYear).toBe('1990')
    expect(analysis.effectiveYear).toBeNull()
    expect(analysis.availableYears.length).toBeGreaterThan(0)
  })

  it('rejects a layer that is not in the curated set', () => {
    // estoque_c_agb exists in layers.json but was not curated for the report.
    expect(() => buildReportShell({ ...base, layerIds: ['estoque_c_agb'] }))
      .toThrow(ReportBadRequestError)
    expect(() => buildReportShell({ ...base, layerIds: [] }))
      .toThrow(ReportBadRequestError)
  })

  it('rejects an unknown recorte or feature', () => {
    expect(() => buildReportShell({ ...base, recorteId: 'nao-existe', layerIds: ['solo_carbono'] }))
      .toThrow(ReportNotFoundError)
    expect(() => buildReportShell({ ...base, feicaoId: 'nao-existe', layerIds: ['solo_carbono'] }))
      .toThrow(ReportNotFoundError)
  })
})

describe('buildReportAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.computeZonalStats.mockResolvedValue({
      ok: true,
      result: {
        kind: 'continuous',
        stats: { min: 11.2, max: 48.9, mean: 24.3, median: 22.5, std: 4.25, count: 1200 },
      },
    })
    mocks.computeSeries.mockResolvedValue([
      { date: '2022-01-01', value: 23.0 },
      { date: '2023-01-01', value: 24.3 },
    ])
  })

  it('measures the year and the series and narrates both', async () => {
    const analysis = await buildReportAnalysis({ ...base, layerId: 'solo_carbono' })

    expect(analysis.status).toBe('available')
    expect(analysis.snapshot).toMatchObject({ kind: 'continuous' })
    expect(analysis.series).toHaveLength(2)
    expect(analysis.narrative.situation).toContain('Em Campina Grande')
    expect(analysis.narrative.trend).toContain('Em relação a 2022')
  })

  it('coarsens the series scale to the configured floor, never finer than native', async () => {
    await buildReportAnalysis({ ...base, layerId: 'solo_carbono' })

    // solo_carbono is 30 m native with a 300 m floor for the series.
    expect(mocks.computeSeries.mock.calls[0][1]).toMatchObject({
      region: { kind: 'zonal', scale: 300 },
    })
  })

  it('keeps the snapshot when the series fails', async () => {
    mocks.computeSeries.mockRejectedValueOnce(new Error('ee.evaluate timed out after 65000ms'))

    const analysis = await buildReportAnalysis({ ...base, layerId: 'solo_carbono' })

    // Losing the series must not lose the section.
    expect(analysis.status).toBe('available')
    expect(analysis.snapshot).toMatchObject({ kind: 'continuous' })
    expect(analysis.series).toEqual([])
    expect(analysis.narrative.situation).toBeTruthy()
    expect(analysis.narrative.trend).toBeNull()
  })

  it('reports the analysis unavailable when the snapshot fails', async () => {
    mocks.computeZonalStats.mockResolvedValueOnce({
      ok: false, error: 'No valid pixels in the given geometry', status: 422,
    })

    const analysis = await buildReportAnalysis({ ...base, layerId: 'solo_carbono' })

    expect(analysis.status).toBe('unavailable')
    expect(analysis.snapshot).toBeNull()
    expect(analysis.narrative).toEqual({ situation: null, trend: null, context: null })
  })

  it('reports year_not_found without calling Earth Engine at all', async () => {
    const analysis = await buildReportAnalysis({ ...base, year: '1990', layerId: 'solo_carbono' })

    expect(analysis.status).toBe('year_not_found')
    expect(analysis.availableYears.length).toBeGreaterThan(0)
    // Asking for a year the collection does not have is settled from config.
    expect(mocks.computeZonalStats).not.toHaveBeenCalled()
    expect(mocks.computeSeries).not.toHaveBeenCalled()
  })

  it('skips the series for a static layer and for one whose mean is meaningless', async () => {
    mocks.computeZonalStats.mockResolvedValue({
      ok: true, result: { kind: 'categorical', areas: { '15': 600_000, '3': 400_000 } },
    })

    const lulc = await buildReportAnalysis({ ...base, year: '2024', layerId: 'lulc_mapbiomas' })
    expect(lulc.series).toEqual([])

    mocks.computeZonalStats.mockResolvedValue({
      ok: true,
      result: {
        kind: 'stocks',
        report: { totalTc: 10, areaHa: 1, unit: 't C', pools: [], classes: [] },
      },
    })
    const estoque = await buildReportAnalysis({ ...base, layerId: 'estoque_carbono' })
    expect(estoque.series).toEqual([])

    expect(mocks.computeSeries).not.toHaveBeenCalled()
  })

  it('serves a repeated request from the cache', async () => {
    await buildReportAnalysis({ ...base, layerId: 'solo_carbono' })
    await buildReportAnalysis({ ...base, layerId: 'solo_carbono' })

    expect(mocks.computeZonalStats).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/reportService.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/mapa/reportService"`.

- [ ] **Step 3: Write the cache**

Create `lib/mapa/reportCache.ts`:

```ts
// In-memory cache of measured analyses, in the shape of tileCache.ts.
//
// Regenerating the same report for the same recorte, year and layer is the
// common case — someone reloads the tab, or prints after reading — and each
// miss is two Earth Engine reductions.

import type { ReportAnalysis } from '@/types/relatorio'

const TTL_MS = 90 * 60 * 1000

interface Entry {
  analysis:  ReportAnalysis
  expiresAt: number
}

const cache = new Map<string, Entry>()

export function analysisCacheKey(
  recorteId: string,
  feicaoId: string,
  year: string,
  layerId: string,
): string {
  return `${recorteId}|${feicaoId}|${year}|${layerId}`
}

export function getCachedAnalysis(key: string): ReportAnalysis | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return undefined
  }
  return entry.analysis
}

export function setCachedAnalysis(key: string, analysis: ReportAnalysis): void {
  // An unavailable analysis is not cached: the cause is usually transient (a
  // timeout, a rate limit upstream), and caching it would hold a broken
  // section for ninety minutes.
  if (analysis.status === 'unavailable') return
  cache.set(key, { analysis, expiresAt: Date.now() + TTL_MS })
}
```

- [ ] **Step 4: Write the service**

Create `lib/mapa/reportService.ts`:

```ts
// Builds the report: the shell with no Earth Engine work, and then one analysis
// at a time.
//
// One analysis per call on purpose. Six layers are about twelve live Earth
// Engine reductions, and a zonal statistic that takes seconds over a
// municipality takes tens of seconds over a state; a single request for the
// whole document would time out and show a blank page while it ran. Splitting
// it also makes each analysis independently cacheable and retryable, and turns
// partial failure into a status on a section instead of an error on the page.

import 'server-only'

import appConfig from '@/config/mapa/layers.json'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { getReportLayer, MAX_REPORT_LAYERS, REPORT_LAYERS } from '@/config/mapa/reportLayers'
import { getEe, initGee } from '@/lib/mapa/geeAuth'
import { getFeicao } from '@/lib/mapa/recorteRegistry'
import { buildNarrative } from '@/lib/mapa/reportNarrative'
import {
  analysisCacheKey,
  getCachedAnalysis,
  setCachedAnalysis,
} from '@/lib/mapa/reportCache'
import { ano, paradas } from '@/lib/mapa/temporal'
import { computeSeries } from '@/lib/mapa/zonalSeries'
import { computeZonalStats } from '@/lib/mapa/zonalStats'
import type { RasterLayerConfig } from '@/types/mapa'
import type {
  ReportAnalysis,
  ReportAnalysisDescriptor,
  ReportRecorte,
  ReportShell,
} from '@/types/relatorio'

/** The recorte, the feature or the layer does not exist. */
export class ReportNotFoundError extends Error {}
/** The request is well-formed but asks for something the report does not offer. */
export class ReportBadRequestError extends Error {}

function rasterLayer(layerId: string): RasterLayerConfig {
  const layer = (appConfig.layers as RasterLayerConfig[]).find(
    (l) => l.id === layerId && l.type === 'raster',
  )
  if (!layer) throw new ReportNotFoundError('Layer not found.')
  return layer
}

function resolveRecorte(recorteId: string, feicaoId: string): ReportRecorte {
  const layer = appConfig.layers.find((l) => l.id === recorteId && l.type === 'vector')
  if (!layer) throw new ReportNotFoundError('Recorte not found.')

  const feicao = getFeicao(recorteId, feicaoId)
  if (!feicao) throw new ReportNotFoundError('Feature not found.')

  return {
    layerId:     recorteId,
    layerName:   layer.name,
    featureId:   feicao.id,
    featureName: feicao.name,
    areaHa:      feicao.areaHa,
    bbox:        feicao.bbox,
    boundary:    feicao.boundary,
  }
}

/** Years the layer can be asked for, as 4-digit strings. Empty when static. */
function availableYearsOf(layer: RasterLayerConfig): string[] {
  return layer.gee?.temporal ? paradas(layer.gee.temporal).map(ano) : []
}

function describe(layerId: string, requestedYear: string): ReportAnalysisDescriptor {
  const config = getReportLayer(layerId)
  if (!config) {
    throw new ReportBadRequestError('Layer is not eligible for the report.')
  }
  const layer = rasterLayer(layerId)
  const availableYears = availableYearsOf(layer)
  const isTemporal = availableYears.length > 0

  return {
    layerId,
    name:           layer.name,
    unit:           layer.unit,
    signedFlux:     layer.signedFlux,
    source:         LAYER_META[layerId]?.source ?? '',
    methodology:    config.methodology,
    sectionColor:   config.sectionColor,
    availableYears,
    // A static layer has no year to select, so the requested one does not
    // apply to it rather than being missing from it.
    requestedYear:  isTemporal ? requestedYear : null,
    effectiveYear:  isTemporal
      ? (availableYears.includes(requestedYear) ? requestedYear : null)
      : null,
  }
}

/** The document shell: identification plus the ordered descriptors. No GEE call. */
export function buildReportShell(input: {
  recorteId: string
  feicaoId:  string
  year:      string
  layerIds:  string[]
  now?:      () => Date
}): ReportShell {
  const { recorteId, feicaoId, year, layerIds } = input

  if (layerIds.length === 0) {
    throw new ReportBadRequestError('No layer was selected.')
  }
  if (layerIds.length > MAX_REPORT_LAYERS) {
    throw new ReportBadRequestError(
      `At most ${MAX_REPORT_LAYERS} layers can be selected.`,
    )
  }

  const recorte = resolveRecorte(recorteId, feicaoId)
  const order = new Map(REPORT_LAYERS.map((entry) => [entry.layerId, entry.order]))
  const selected = [...new Set(layerIds)].sort(
    (a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity),
  )

  return {
    schemaVersion: 1,
    generatedAt:   (input.now ?? (() => new Date()))().toISOString(),
    recorte,
    requestedYear: year,
    analyses:      selected.map((layerId) => describe(layerId, year)),
  }
}

/** One measured analysis: the year's snapshot, the series, and the prose. */
export async function buildReportAnalysis(input: {
  recorteId: string
  feicaoId:  string
  year:      string
  layerId:   string
}): Promise<ReportAnalysis> {
  const { recorteId, feicaoId, year, layerId } = input

  const cacheKey = analysisCacheKey(recorteId, feicaoId, year, layerId)
  const cached = getCachedAnalysis(cacheKey)
  if (cached) return cached

  const config = getReportLayer(layerId)
  if (!config) throw new ReportBadRequestError('Layer is not eligible for the report.')

  const recorte = resolveRecorte(recorteId, feicaoId)
  const feicao = getFeicao(recorteId, feicaoId)!
  const descriptor = describe(layerId, year)
  const layer = rasterLayer(layerId)
  const asset = layer.gee?.asset
  if (!asset) throw new ReportNotFoundError('Layer has no GEE asset.')

  const empty = (status: ReportAnalysis['status']): ReportAnalysis => ({
    ...descriptor,
    status,
    snapshot:  null,
    series:    [],
    narrative: { situation: null, trend: null, context: null },
  })

  // A temporal layer asked for a year it does not have is settled here, from
  // config, without spending a reduction. The section lists the years that do
  // exist instead of falling back to the nearest one and showing a number that
  // answers a different question.
  if (descriptor.availableYears.length > 0 && !descriptor.effectiveYear) {
    const result = empty('year_not_found')
    setCachedAnalysis(cacheKey, result)
    return result
  }

  await initGee()
  const ee = getEe()
  const temporalDate = descriptor.effectiveYear ? `${descriptor.effectiveYear}-01-01` : undefined

  const outcome = await computeZonalStats(ee, {
    asset,
    geometry:  feicao.geometry,
    temporalDate,
    classify:  layer.gee?.classify,
    breaks:    layer.gee?.classify?.breaks,
    colorType: layer.colorType,
    layerId:   layer.gee?.stocks ? layerId : undefined,
  })

  if (!outcome.ok) {
    console.error(`[reportService] ${layerId}: ${outcome.error} (${outcome.status})`)
    // Not cached: the cause is usually transient, and the section offers a retry.
    return empty('unavailable')
  }

  // The series is optional in a way the snapshot is not. Forty stops reduced
  // over a whole state can exceed the Earth Engine deadline, and losing it must
  // not lose the section: the snapshot, the map and the situation sentence
  // stand on their own.
  let series: ReportAnalysis['series'] = []
  const canHaveSeries =
    config.seriesKind !== 'none' &&
    descriptor.availableYears.length > 1 &&
    Boolean(layer.gee?.temporal)

  if (canHaveSeries) {
    try {
      series = await computeSeries(ee, {
        asset,
        anos: descriptor.availableYears.map(Number),
        region: {
          kind:     'zonal',
          geometry: feicao.geometry,
          // A floor, never a fixed value: it can only coarsen. CHIRPS is
          // natively 5566 m, and a literal 300 there would resample finer than
          // the data for no gain.
          scale:    Math.max(config.seriesScale ?? 0, asset.scale ?? 500),
        },
      })
    } catch (err) {
      console.warn(`[reportService] ${layerId}: série indisponível`, err)
    }
  }

  const analysis: ReportAnalysis = {
    ...descriptor,
    status:    'available',
    snapshot:  outcome.result,
    series,
    narrative: buildNarrative({
      recorte,
      layerName:     descriptor.name,
      unit:          descriptor.unit,
      signedFlux:    descriptor.signedFlux,
      classes:       layer.classes,
      config,
      status:        'available',
      effectiveYear: descriptor.effectiveYear,
      snapshot:      outcome.result,
      series,
    }),
  }

  setCachedAnalysis(cacheKey, analysis)
  return analysis
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run tests/lib/reportService.test.ts`
Expected: PASS, 13 tests.

The cache test asserts one `computeZonalStats` call across two identical requests, so it depends on module state surviving between the two — which it does, inside one test file. If the whole file is run after another that populated the same key, clear the cache by giving that test its own feature id rather than by exporting a reset.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add lib/mapa/reportCache.ts lib/mapa/reportService.ts tests/lib/reportService.test.ts
git commit -m "feat: report service, one analysis at a time"
```

---

## Task 8: The three report routes

Thin HTTP wrappers: authenticate, rate limit, validate, call the service, answer.

Two deliberate departures from the `/api/gee/*` convention, both worth writing down in the route files themselves so the next reader does not "fix" them:

- **GET, not POST.** The `/api/gee/*` routes are POST because they carry a geometry and a `visParams` block in the body. Nothing but short ids travels here, so GET buys HTTP caching per (recorte, feição, ano, camada) — the same key shape the store already uses in `statsCache`.
- **No `isAllowedAsset`.** Not a relaxation: these routes accept no asset at all. The client sends `camada`; the server resolves the asset from `layers.json`, exactly as `stocksRegistry` resolves the `stocks` block. The equivalent check is "is this layer in `REPORT_LAYERS`", which is strictly tighter than the allowlist, and the service raises `ReportBadRequestError` when it is not.

**Files:**
- Create: `app/api/mapa/relatorio/feicoes/route.ts`
- Create: `app/api/mapa/relatorio/base/route.ts`
- Create: `app/api/mapa/relatorio/analise/route.ts`
- Test: `tests/app/reportRoutes.test.ts`

**Interfaces:**
- Consumes: `buildReportShell`, `buildReportAnalysis`, `ReportNotFoundError`, `ReportBadRequestError` from `lib/mapa/reportService.ts`; `listFeicoes` from `lib/mapa/recorteRegistry.ts`; `getAuthenticatedRequest`, `unauthorizedResponse` from `lib/auth.ts`; `rateLimit`, `clientIp` from `lib/mapa/rateLimit.ts`.
- Produces: `GET` handlers. Response bodies: `{ feicoes }`, the `ReportShell`, and the `ReportAnalysis`.

- [ ] **Step 1: Write the failing test**

Create `tests/app/reportRoutes.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequest: vi.fn<() => Promise<{ uid: string } | null>>(async () => ({ uid: 'u' })),
  rateLimit: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  buildReportAnalysis: vi.fn(async () => ({ layerId: 'solo_carbono', status: 'available' })),
}))

vi.mock('@/lib/auth', () => ({
  getAuthenticatedRequest: mocks.getAuthenticatedRequest,
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}))
vi.mock('@/lib/mapa/rateLimit', () => ({
  rateLimit: mocks.rateLimit,
  clientIp: () => '127.0.0.1',
}))
vi.mock('@/lib/mapa/reportService', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/reportService')>(),
  buildReportAnalysis: mocks.buildReportAnalysis,
}))

import { GET as getBase } from '@/app/api/mapa/relatorio/base/route'
import { GET as getAnalise } from '@/app/api/mapa/relatorio/analise/route'
import { GET as getFeicoes } from '@/app/api/mapa/relatorio/feicoes/route'

function req(path: string, query: Record<string, string>) {
  const url = new URL(`http://localhost${path}`)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  return new Request(url)
}

const baseQuery = {
  recorte: 'municipios', feicao: 'campina-grande', ano: '2023',
  camadas: 'estoque_carbono,solo_carbono',
}
const analiseQuery = {
  recorte: 'municipios', feicao: 'campina-grande', ano: '2023', camada: 'solo_carbono',
}

describe('GET /api/mapa/relatorio/base', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'u' })
    mocks.rateLimit.mockReturnValue({ ok: true, retryAfter: 0 })
  })

  it('requires an authenticated session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)

    const res = await getBase(req('/api/mapa/relatorio/base', baseQuery))

    expect(res.status).toBe(401)
  })

  it('returns 429 when the rate limit is spent', async () => {
    mocks.rateLimit.mockReturnValueOnce({ ok: false, retryAfter: 30 })

    const res = await getBase(req('/api/mapa/relatorio/base', baseQuery))

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  it('returns the shell for a valid request', async () => {
    const res = await getBase(req('/api/mapa/relatorio/base', baseQuery))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      schemaVersion: 1,
      recorte: { featureName: 'Campina Grande' },
      analyses: [{ layerId: 'estoque_carbono' }, { layerId: 'solo_carbono' }],
    })
  })

  it('rejects malformed parameters with 400', async () => {
    const cases: Record<string, string>[] = [
      { ...baseQuery, ano: '23' },
      { ...baseQuery, ano: 'dois-mil' },
      { ...baseQuery, recorte: 'muni cipios' },
      { ...baseQuery, camadas: '' },
      { ...baseQuery, camadas: Array.from({ length: 9 }, (_, i) => `c${i}`).join(',') },
    ]

    for (const query of cases) {
      const res = await getBase(req('/api/mapa/relatorio/base', query))
      expect(res.status).toBe(400)
    }
  })

  it('rejects a layer outside the curated set with 400', async () => {
    const res = await getBase(req('/api/mapa/relatorio/base', {
      ...baseQuery, camadas: 'estoque_c_agb',
    }))

    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown recorte or feature', async () => {
    for (const query of [
      { ...baseQuery, recorte: 'nao-existe' },
      { ...baseQuery, feicao: 'nao-existe' },
    ]) {
      const res = await getBase(req('/api/mapa/relatorio/base', query))
      expect(res.status).toBe(404)
    }
  })
})

describe('GET /api/mapa/relatorio/analise', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'u' })
    mocks.rateLimit.mockReturnValue({ ok: true, retryAfter: 0 })
  })

  it('requires an authenticated session before doing any work', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)

    const res = await getAnalise(req('/api/mapa/relatorio/analise', analiseQuery))

    expect(res.status).toBe(401)
    expect(mocks.buildReportAnalysis).not.toHaveBeenCalled()
  })

  it('returns the measured analysis', async () => {
    const res = await getAnalise(req('/api/mapa/relatorio/analise', analiseQuery))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ layerId: 'solo_carbono' })
  })

  it('answers 200 for an unavailable analysis, so one failure does not sink the document', async () => {
    mocks.buildReportAnalysis.mockResolvedValueOnce({
      layerId: 'solo_carbono', status: 'unavailable',
    } as never)

    const res = await getAnalise(req('/api/mapa/relatorio/analise', analiseQuery))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ status: 'unavailable' })
  })

  it('rejects a missing or malformed camada with 400', async () => {
    for (const query of [
      { recorte: 'municipios', feicao: 'campina-grande', ano: '2023' },
      { ...analiseQuery, camada: 'solo carbono' },
    ]) {
      const res = await getAnalise(req('/api/mapa/relatorio/analise', query))
      expect(res.status).toBe(400)
      expect(mocks.buildReportAnalysis).not.toHaveBeenCalled()
    }
  })
})

describe('GET /api/mapa/relatorio/feicoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'u' })
    mocks.rateLimit.mockReturnValue({ ok: true, retryAfter: 0 })
  })

  it('requires an authenticated session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)

    const res = await getFeicoes(req('/api/mapa/relatorio/feicoes', { recorte: 'estados' }))

    expect(res.status).toBe(401)
  })

  it('lists the features of a recorte', async () => {
    const res = await getFeicoes(req('/api/mapa/relatorio/feicoes', { recorte: 'estados' }))

    expect(res.status).toBe(200)
    const body = await res.json() as { feicoes: { id: string; name: string }[] }
    expect(body.feicoes).toEqual(expect.arrayContaining([{ id: 'pb', name: 'PB' }]))
  })

  it('returns 404 for an unknown recorte', async () => {
    const res = await getFeicoes(req('/api/mapa/relatorio/feicoes', { recorte: 'nao-existe' }))

    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/app/reportRoutes.test.ts`
Expected: FAIL — the three route modules do not resolve.

- [ ] **Step 3: Write the shared validation and the feature list route**

Create `app/api/mapa/relatorio/feicoes/route.ts`:

```ts
/**
 * GET /api/mapa/relatorio/feicoes?recorte=municipios
 *
 * Features of a recorte, for the report form's picker. It exists so the form
 * does not have to download the GeoJSON: FloatingSearchBar pulls the whole
 * 1,1 MB of municipalities to search, and repeating that just to populate a
 * select would be wasteful.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/mapa/rateLimit'
import { listFeicoes } from '@/lib/mapa/recorteRegistry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RECORTE_PATTERN = /^[a-z0-9_-]{1,80}$/u

export async function GET(req: Request) {
  if (!await getAuthenticatedRequest(req)) return unauthorizedResponse()

  const rl = rateLimit(clientIp(req))
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const recorte = new URL(req.url).searchParams.get('recorte')?.trim() ?? ''
  if (!RECORTE_PATTERN.test(recorte)) {
    return NextResponse.json({ error: 'Invalid recorte.' }, { status: 400 })
  }

  const feicoes = listFeicoes(recorte)
  if (feicoes.length === 0) {
    return NextResponse.json({ error: 'Recorte not found.' }, { status: 404 })
  }

  // The vector files are static, so a day of staleness costs nothing and saves
  // the picker a round trip on every form open.
  return NextResponse.json({ feicoes }, {
    headers: { 'Cache-Control': 'private, max-age=86400' },
  })
}
```

- [ ] **Step 4: Write the shell route**

Create `app/api/mapa/relatorio/base/route.ts`:

```ts
/**
 * GET /api/mapa/relatorio/base?recorte=&feicao=&ano=&camadas=
 *
 * The document shell: recorte identification plus the ordered descriptors of
 * the requested analyses. No Earth Engine work, so it answers immediately and
 * the client can draw the document before any measurement arrives.
 *
 * GET rather than POST, unlike /api/gee/*: those carry a geometry and a
 * visParams block in the body, while nothing but short ids travels here, so GET
 * buys HTTP caching per (recorte, feição, ano, camadas).
 *
 * There is no asset allowlist check because the route accepts no asset: the
 * client sends layer ids and the server resolves the assets from layers.json,
 * as stocksRegistry does. The equivalent guard is that the service rejects any
 * layer outside REPORT_LAYERS.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/mapa/rateLimit'
import {
  buildReportShell,
  ReportBadRequestError,
  ReportNotFoundError,
} from '@/lib/mapa/reportService'
import { MAX_REPORT_LAYERS } from '@/config/mapa/reportLayers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RECORTE_PATTERN = /^[a-z0-9_-]{1,80}$/u
const FEICAO_PATTERN  = /^[a-z0-9-]{1,120}$/u
const YEAR_PATTERN    = /^\d{4}$/u
const LAYER_PATTERN   = /^[A-Za-z0-9_-]{1,80}$/u

export async function GET(req: Request) {
  if (!await getAuthenticatedRequest(req)) return unauthorizedResponse()

  const rl = rateLimit(clientIp(req))
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const params = new URL(req.url).searchParams
  const recorteId = params.get('recorte')?.trim() ?? ''
  const feicaoId  = params.get('feicao')?.trim() ?? ''
  const year      = params.get('ano')?.trim() ?? ''
  const layerIds  = (params.get('camadas') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  if (!RECORTE_PATTERN.test(recorteId)) {
    return NextResponse.json({ error: 'Invalid recorte.' }, { status: 400 })
  }
  if (!FEICAO_PATTERN.test(feicaoId)) {
    return NextResponse.json({ error: 'Invalid feature.' }, { status: 400 })
  }
  if (!YEAR_PATTERN.test(year)) {
    return NextResponse.json({ error: 'Invalid year.' }, { status: 400 })
  }
  if (layerIds.length === 0 || layerIds.length > MAX_REPORT_LAYERS) {
    return NextResponse.json(
      { error: `Between 1 and ${MAX_REPORT_LAYERS} layers are required.` },
      { status: 400 },
    )
  }
  if (!layerIds.every((id) => LAYER_PATTERN.test(id))) {
    return NextResponse.json({ error: 'Invalid layer id.' }, { status: 400 })
  }

  try {
    const shell = buildReportShell({ recorteId, feicaoId, year, layerIds })
    return NextResponse.json(shell, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    })
  } catch (err) {
    if (err instanceof ReportNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof ReportBadRequestError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[/api/mapa/relatorio/base] error:', err)
    return NextResponse.json({ error: 'Unable to build the report shell.' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Write the analysis route**

Create `app/api/mapa/relatorio/analise/route.ts`. It repeats the validation deliberately, because a shared helper across route files would put HTTP parsing in `lib/` for two callers:

```ts
/**
 * GET /api/mapa/relatorio/analise?recorte=&feicao=&ano=&camada=
 *
 * One measured analysis: the year's snapshot, the zonal series and the prose.
 * The client calls it once per section, with limited concurrency, so each Earth
 * Engine reduction is its own short request instead of one long one for the
 * whole document.
 *
 * An unavailable analysis comes back 200 with `status: "unavailable"`, not as an
 * error: one layer failing must leave the rest of the document standing. Only a
 * malformed request or an unknown recorte is a 4xx.
 *
 * GET and no asset allowlist, for the reasons written in ../base/route.ts.
 */

import { NextResponse } from 'next/server'
import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/mapa/rateLimit'
import {
  buildReportAnalysis,
  ReportBadRequestError,
  ReportNotFoundError,
} from '@/lib/mapa/reportService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RECORTE_PATTERN = /^[a-z0-9_-]{1,80}$/u
const FEICAO_PATTERN  = /^[a-z0-9-]{1,120}$/u
const YEAR_PATTERN    = /^\d{4}$/u
const LAYER_PATTERN   = /^[A-Za-z0-9_-]{1,80}$/u

export async function GET(req: Request) {
  if (!await getAuthenticatedRequest(req)) return unauthorizedResponse()

  const rl = rateLimit(clientIp(req))
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const params = new URL(req.url).searchParams
  const recorteId = params.get('recorte')?.trim() ?? ''
  const feicaoId  = params.get('feicao')?.trim() ?? ''
  const year      = params.get('ano')?.trim() ?? ''
  const layerId   = params.get('camada')?.trim() ?? ''

  if (!RECORTE_PATTERN.test(recorteId)) {
    return NextResponse.json({ error: 'Invalid recorte.' }, { status: 400 })
  }
  if (!FEICAO_PATTERN.test(feicaoId)) {
    return NextResponse.json({ error: 'Invalid feature.' }, { status: 400 })
  }
  if (!YEAR_PATTERN.test(year)) {
    return NextResponse.json({ error: 'Invalid year.' }, { status: 400 })
  }
  if (!LAYER_PATTERN.test(layerId)) {
    return NextResponse.json({ error: 'Invalid layer id.' }, { status: 400 })
  }

  try {
    const analysis = await buildReportAnalysis({ recorteId, feicaoId, year, layerId })
    return NextResponse.json(analysis, {
      headers: { 'Cache-Control': 'private, max-age=1800' },
    })
  } catch (err) {
    if (err instanceof ReportNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof ReportBadRequestError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    // Deliberately generic: an Earth Engine failure must not leak the
    // credentials path into a response body.
    console.error('[/api/mapa/relatorio/analise] error:', err)
    return NextResponse.json({ error: 'Unable to build the analysis.' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Run it to verify it passes**

Run: `npx vitest run tests/app/reportRoutes.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 7: Verify the whole suite and the build**

Run: `npm test`
Expected: PASS, every file.

Run: `npm run build`
Expected: success, with the three new routes listed as dynamic.

- [ ] **Step 8: Lint and commit**

```bash
npm run lint
git add app/api/mapa/relatorio tests/app/reportRoutes.test.ts
git commit -m "feat: report shell, analysis and feature-list routes"
```

---
## Task 9: Make the charts presentational

`components/mapa/StatsChart.tsx` reads everything from the store, and two of its sub-components find "the visible raster" in `layers` to get the class labels. In an N-section report "the visible raster" means nothing: each section has its own layer and its own stats.

The refactor is narrower than it first looks. `ContinuousStatsView` already takes everything by props, and `StockReportView.tsx` is already presentational. Only `CategoricalChart` and `TimeSeriesChart` reach into the store, and only for `classes`.

**A naming departure from the spec, deliberately.** The spec proposed `StatsChart({ theme, stats, layer })` plus a thin `ActiveStatsChart({ theme })`. Instead the **default export keeps its current name and store-reading behavior**, and the presentational component is a new named export `StatsChartView`. That way `ResultsSidebar.tsx:291` does not change at all, and the `dynamic(() => import('./StatsChart'))` boundary that keeps Recharts out of the initial map bundle stays exactly where it is.

From this task on there is no unit test to write: `vitest.config.ts` includes `tests/**/*.test.ts` only, and adding `.tsx` support to run one render test is more machinery than this earns. The deliverable is verified by the type-check in `npm run build` plus the named manual checks.

**Files:**
- Modify: `components/mapa/StatsChart.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces:

```ts
export interface StatsChartViewProps {
  theme:    PlatformTheme
  stats:    RasterStatsResult
  classes?: RasterClass[]
  unit?:    string
  signedFlux?: boolean
  caption?: string
}
export function StatsChartView(props: StatsChartViewProps): React.ReactElement | null
export default function StatsChart({ theme }: { theme: PlatformTheme }): React.ReactElement | null
```

- [ ] **Step 1: Give the two coupled sub-components their data by props**

In `components/mapa/StatsChart.tsx`, change `CategoricalChart` to take `classes` instead of `layers`:

```ts
function CategoricalChart({
  areas,
  classes,
  theme,
  caption,
}: {
  areas: Record<string, number>  // area in m² per class code
  classes?: RasterClass[]
  theme: PlatformTheme
  caption?: string
}) {
  if (!classes?.length) return null

  const totalM2 = Object.values(areas).reduce((a, b) => a + b, 0)
  if (totalM2 === 0) return null

  const rows: CategoricalRow[] = classes
```

and leave the rest of its body untouched, replacing the remaining `raster.classes` references with `classes`.

Change `TimeSeriesChart` the same way:

```ts
function TimeSeriesChart({
  series,
  classes,
  theme,
  caption,
}: {
  series: TimeSeriesPoint[]
  classes?: RasterClass[]
  theme: PlatformTheme
  caption?: string
}) {
  const hasClasses = Boolean(classes?.length)
```

and replace `raster!.classes!` with `classes!` in the two places that use it.

- [ ] **Step 2: Add the presentational dispatcher**

Add, above the default export:

```ts
export interface StatsChartViewProps {
  theme:       PlatformTheme
  stats:       RasterStatsResult
  classes?:    RasterClass[]
  unit?:       string
  signedFlux?: boolean
  caption?:    string
}

/**
 * The charts with no store behind them: one result, one layer's metadata.
 *
 * The report needs this shape because it renders N sections at once, each with
 * its own layer, where "the visible raster" the store exposes means nothing.
 */
export function StatsChartView({
  theme, stats, classes, unit, signedFlux, caption,
}: StatsChartViewProps) {
  if (stats.kind === 'stocks') {
    return <StockReportView report={stats.report} theme={theme} caption={caption} />
  }
  if (stats.kind === 'timeseries') {
    return <TimeSeriesChart series={stats.series} classes={classes} theme={theme} caption={caption} />
  }
  if (stats.kind === 'categorical') {
    return <CategoricalChart areas={stats.areas} classes={classes} theme={theme} caption={caption} />
  }
  return (
    <ContinuousStatsView
      stats={stats.stats}
      unit={stats.unit ?? unit}
      theme={theme}
      caption={caption}
      signedFlux={signedFlux}
    />
  )
}
```

- [ ] **Step 3: Reduce the default export to the store read plus a delegation**

Replace the four branches at the end of the default export with a single call, keeping the loading, error and caption logic above it exactly as it is:

```ts
  if (!rasterStats) {
    if (activeRasterLoading) return <SkeletonChart theme={theme} />
    if (statsError) return <ErrorCard message={statsError} />
    return null
  }

  return (
    <StatsChartView
      theme={theme}
      stats={rasterStats}
      classes={activeRaster?.classes}
      unit={activeRaster?.unit}
      signedFlux={activeRaster?.signedFlux}
      caption={caption}
    />
  )
}
```

`activeRaster` is already computed above for the caption. Widen its lookup so a categorical layer still finds its classes — the old `CategoricalChart` required `Array.isArray(l.classes)` in its own search, and that filter now has to live here:

```ts
  const activeRaster = layers.find(
    (l): l is RasterLayerConfig => l.type === 'raster' && l.visible,
  )
```

This is the existing line; it already returns the visible raster whatever its `classes`, which is what `StatsChartView` now needs.

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: success. A missed `raster.classes` reference or a leftover `layers` prop fails here.

Run: `npm run lint`
Expected: clean. An unused `useStore` import inside the sub-components would show up.

Run: `npm test`
Expected: PASS, unchanged.

- [ ] **Step 5: Verify the results panel by hand, all four result kinds**

Run: `npm run dev`, open `http://localhost:3000/mapa`, sign in, and confirm each kind still renders in the results panel exactly as before:

1. **continuous** — turn on `solo_carbono`, click a municipality. Expect the hero mean card plus the 2x2 grid.
2. **categorical** — turn on `lulc_mapbiomas`, click a municipality. Expect the class bars with MapBiomas labels and colors.
3. **stocks** — turn on `estoque_carbono`, click a municipality. Expect the doughnut with the pool and fitofisionomia breakdown.
4. **signed flux** — turn on `gfw_netflux`, click a municipality. Expect "sequestrou" or "emitiu" with no minus sign, and no "Mínimo" cell.

If this machine's Chrome preview reports a 0x0 viewport and takes no screenshot, as `DOCUMENTACAO.md` records, verify by reading the DOM and the network requests instead.

- [ ] **Step 6: Commit**

```bash
git add components/mapa/StatsChart.tsx
git commit -m "refactor: presentational chart view alongside the store-reading one"
```

---

## Task 10: The report route group, the print stylesheet and the client fetcher

`app/(mapa)/layout.tsx` sets `overflow: 'hidden'` and `height: '100dvh'` inline on the `<body>`, and `mapa.css` repeats it. A document that scrolls and prints cannot live under it. So the report gets a **fourth sibling root layout**, following the pattern `CLAUDE.md` documents for the three that exist.

The consequence to respect: the link from the map to the report crosses a route-group boundary, so it is `<a href>` / `window.open` and a full page load. That is the right behavior anyway — the report opens in its own tab.

**Files:**
- Create: `app/(relatorio)/layout.tsx`
- Create: `app/relatorio.css`
- Create: `app/(relatorio)/relatorio/page.tsx`
- Create: `components/relatorio/ReportClient.tsx`

**Interfaces:**
- Consumes: `ReportShell`, `ReportAnalysis` from `types/relatorio.ts`; `getAuthenticatedSession` from `lib/auth.ts`; `buildReportTheme` from `config/mapa/platforms.ts`.
- Produces:

```ts
// components/relatorio/ReportClient.tsx
export interface ReportClientProps {
  recorteId: string; feicaoId: string; year: string; layerIds: string[]
}
export default function ReportClient(props: ReportClientProps): React.ReactElement
```

`ReportClient` holds `shell`, a `Map<string, ReportAnalysis>` of what has arrived, a `Set<string>` of what is still in flight, and per-layer error state with a retry. It renders `ReportDocument` (Task 11) as soon as the shell is in.

- [ ] **Step 1: Write the root layout**

Create `app/(relatorio)/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Libre_Franklin } from 'next/font/google'
import { redirect } from 'next/navigation'
import '../relatorio.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { getAuthenticatedSession } from '@/lib/auth'

// Fourth sibling root layout. The report is a document that scrolls and prints,
// and (mapa)'s layout zeroes the body scroll and pins the height to the
// viewport for the map; sharing it would make the document unreadable. Being a
// sibling root, relatorio.css loads only on the routes of this group.
//
// Consequence: a link from /mapa to here crosses a route-group boundary, so it
// is an <a href> and a full page load, never next/link.
const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-app',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Relatório territorial | Plataforma Carbono Caatinga',
  description: 'Relatório automático de carbono por recorte territorial do bioma Caatinga. OCA, UFCG, INSA.',
  icons: { icon: '/logos/logo_oca.png' },
}

export default async function RelatorioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthenticatedSession()
  if (!session) redirect('/login?redirect=/relatorio')

  return (
    <html lang="pt-BR" className={libreFranklin.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
```

Note there is no `Analytics` here: the map layout mounts it, and a printable document does not need a second page-view beacon. If the team wants report generations counted, that is a deliberate follow-up, not a silent copy.

- [ ] **Step 2: Write the stylesheet**

Create `app/relatorio.css`. The tokens are the fixed OCA identity, matching `buildReportTheme()`, and there are no `[data-month]` blocks:

```css
/*
 * Styles of the printable report. Sibling of mapa.css and globals.css: it
 * loads only under app/(relatorio), so nothing here can reach the map or the
 * landing page.
 *
 * The palette is fixed, not monthly. The same report for the same municipality
 * generated in March and in September has to be the same document.
 */

:root {
  --paper: #f7f6f2;
  --card: #ffffff;
  --silver: #d8d5cb;
  --ink: #26241d;
  --body: #57544a;
  --trunk: #6f6c63;
  --acc: #5f7030;
  --accBg: #eff1ea;
  --mist: #eceae3;

  /* A4 minus the printed margins, so the screen preview is the printed width. */
  --page-width: 180mm;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-app), system-ui, sans-serif;
  font-feature-settings: 'lnum' 1, 'tnum' 1;
  line-height: 1.5;
}

.report-paper {
  width: min(100%, var(--page-width));
  margin: 24px auto;
  padding: 14mm 15mm;
  background: var(--card);
  border: 1px solid var(--silver);
}

.report-section { break-inside: avoid-page; margin-top: 32px; }
.report-block { break-inside: avoid; }
.report-heading { break-after: avoid; }

.report-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--card);
  border-bottom: 1px solid var(--silver);
}

.report-visual-grid { display: grid; gap: 0; }

@media screen and (min-width: 768px) {
  .report-visual-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}

@media print {
  @page {
    size: A4;
    margin: 14mm 15mm;
  }

  /* The @page margin is the printed one, so the element drops its own. */
  .report-paper {
    width: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
  }

  /* Toolbar, retry buttons and anything else interactive leave the paper. */
  .report-no-print { display: none !important; }

  body { background: #ffffff; }

  /* Print reflows the container, and a two-column visual pair collapsed into
   * one column wastes half a page. */
  .report-visual-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  }

  /* Recharts draws into an SVG that scales, but a captured map is a bitmap and
   * has to be told not to overflow the narrower printed column. */
  .report-map-frame img { max-width: 100%; height: auto; }
}
```

- [ ] **Step 3: Write the page**

Create `app/(relatorio)/relatorio/page.tsx`:

```tsx
import ReportClient from '@/components/relatorio/ReportClient'

interface ReportPageParams {
  recorte?: string | string[]
  feicao?:  string | string[]
  ano?:     string | string[]
  camadas?: string | string[]
}

function single(value?: string | string[]): string {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: Promise<ReportPageParams>
}) {
  const params = await searchParams

  // The parameters go through unvalidated on purpose: the routes validate them
  // and answer 400/404, and the client renders that answer. Duplicating the
  // patterns here would give two places to keep in sync.
  return (
    <ReportClient
      recorteId={single(params.recorte)}
      feicaoId={single(params.feicao)}
      year={single(params.ano)}
      layerIds={single(params.camadas).split(',').filter(Boolean)}
    />
  )
}
```

- [ ] **Step 4: Write the client fetcher**

Create `components/relatorio/ReportClient.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReportDocument from './ReportDocument'
import { buildReportTheme } from '@/config/mapa/platforms'
import type { ReportAnalysis, ReportShell } from '@/types/relatorio'

export interface ReportClientProps {
  recorteId: string
  feicaoId:  string
  year:      string
  layerIds:  string[]
}

/**
 * How many analyses are measured at once.
 *
 * Two, not more. Each one is up to two live Earth Engine reductions, and the
 * per-IP rate limiter in lib/mapa/rateLimit.ts is shared with the map's own
 * requests; eight in parallel would spend the budget and start answering 429 to
 * the sections still queued.
 */
const CONCURRENCY = 2

type Status = 'loading' | 'ready' | 'error'

export default function ReportClient({ recorteId, feicaoId, year, layerIds }: ReportClientProps) {
  const theme = useMemo(() => buildReportTheme(), [])
  const [shell, setShell] = useState<ReportShell | null>(null)
  const [shellStatus, setShellStatus] = useState<Status>('loading')
  const [shellError, setShellError] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<Map<string, ReportAnalysis>>(new Map())
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())
  const [expired, setExpired] = useState(false)
  const query = useMemo(
    () => ({ recorte: recorteId, feicao: feicaoId, ano: year }),
    [recorteId, feicaoId, year],
  )
  const camadas = useMemo(() => layerIds.join(','), [layerIds])

  useEffect(() => {
    const controller = new AbortController()

    async function loadShell() {
      setShellStatus('loading')
      try {
        const params = new URLSearchParams({ ...query, camadas })
        const res = await fetch(`/api/mapa/relatorio/base?${params}`, { signal: controller.signal })
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload?.error ?? `Erro ${res.status}`)
        }
        setShell(await res.json() as ReportShell)
        setShellStatus('ready')
      } catch (err) {
        if (controller.signal.aborted) return
        setShellError(err instanceof Error ? err.message : 'Falha ao montar o relatório.')
        setShellStatus('error')
      }
    }

    void loadShell()
    return () => controller.abort()
  }, [query, camadas])

  const fetchAnalysis = useCallback(async (layerId: string, signal?: AbortSignal) => {
    setPending((prev) => new Set(prev).add(layerId))
    setErrors((prev) => {
      const next = new Map(prev)
      next.delete(layerId)
      return next
    })

    try {
      const params = new URLSearchParams({ ...query, camada: layerId })
      const res = await fetch(`/api/mapa/relatorio/analise?${params}`, { signal })
      // A session that expired mid-generation would otherwise raise the same
      // notice once per section.
      if (res.status === 401) {
        setExpired(true)
        return
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error ?? `Erro ${res.status}`)
      }
      const analysis = await res.json() as ReportAnalysis
      setAnalyses((prev) => new Map(prev).set(layerId, analysis))
    } catch (err) {
      if (signal?.aborted) return
      setErrors((prev) => new Map(prev).set(
        layerId,
        err instanceof Error ? err.message : 'Falha ao carregar esta análise.',
      ))
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(layerId)
        return next
      })
    }
  }, [query])

  // The queue runs once per shell. A ref guards it because the effect's
  // dependencies include a callback that changes with the query, and
  // re-entering would measure everything twice.
  const startedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!shell) return
    const signature = `${camadas}|${query.recorte}|${query.feicao}|${query.ano}`
    if (startedRef.current === signature) return
    startedRef.current = signature

    const controller = new AbortController()
    const queue = shell.analyses.map((a) => a.layerId)

    async function worker() {
      for (;;) {
        const layerId = queue.shift()
        if (!layerId || controller.signal.aborted) return
        await fetchAnalysis(layerId, controller.signal)
      }
    }

    void Promise.all(Array.from({ length: CONCURRENCY }, worker))
    return () => controller.abort()
  }, [shell, camadas, query, fetchAnalysis])

  if (shellStatus === 'error') {
    return (
      <main className="report-paper">
        <h1>Não foi possível montar o relatório</h1>
        <p>{shellError}</p>
        <p className="report-no-print">
          <a href="/mapa">Voltar aos mapas</a>
        </p>
      </main>
    )
  }

  if (!shell) {
    return <main className="report-paper"><p>Montando o relatório…</p></main>
  }

  return (
    <ReportDocument
      theme={theme}
      shell={shell}
      analyses={analyses}
      pending={pending}
      errors={errors}
      expired={expired}
      onRetry={(layerId) => void fetchAnalysis(layerId)}
    />
  )
}
```

- [ ] **Step 5: Let the login page redirect back to a report**

`app/(auth)/login/page.tsx` holds a private `getRedirect` that allowlists `/`, `/mapa` and `/mapa/`. A `redirect=/relatorio?...` target is silently rewritten to `/`, so anyone whose session expired while reading a report would be dropped on the landing page and lose the URL.

The allowlist is there to stop an open redirect, so it stays an allowlist. It moves to `lib/auth.ts`, where it gains a test — it is a security control and it has none today.

Add to `lib/auth.ts`:

```ts
/**
 * Post-login destination, restricted to the app's own routes.
 *
 * An allowlist rather than a "starts with /" check: `//evil.com` is a
 * protocol-relative URL that a naive prefix test lets through. Each entry is
 * matched exactly, or with the separator that has to follow it, so
 * `/relatoriofalso` does not pass as `/relatorio`.
 */
export function safeRedirect(value: string | string[] | undefined): string {
  if (typeof value !== 'string') return '/'
  for (const base of ['/mapa', '/relatorio']) {
    if (value === base || value.startsWith(`${base}/`) || value.startsWith(`${base}?`)) {
      return value
    }
  }
  return '/'
}
```

Then in `app/(auth)/login/page.tsx`, delete the private `getRedirect` and use it:

```ts
import { getAuthenticatedSession, safeRedirect } from '@/lib/auth'
```

```ts
  const redirectTo = safeRedirect((await searchParams).redirect)
```

Create `tests/lib/safeRedirect.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { safeRedirect } from '@/lib/auth'

describe('safeRedirect', () => {
  it('keeps the app routes, with a path or a query after them', () => {
    expect(safeRedirect('/')).toBe('/')
    expect(safeRedirect('/mapa')).toBe('/mapa')
    expect(safeRedirect('/mapa/qualquer')).toBe('/mapa/qualquer')
    expect(safeRedirect('/relatorio')).toBe('/relatorio')
    expect(safeRedirect('/relatorio?recorte=municipios&feicao=campina-grande'))
      .toBe('/relatorio?recorte=municipios&feicao=campina-grande')
  })

  it('refuses anything that could leave the site', () => {
    // A protocol-relative URL is the case a "starts with /" test lets through.
    expect(safeRedirect('//evil.com')).toBe('/')
    expect(safeRedirect('https://evil.com')).toBe('/')
    expect(safeRedirect('/relatoriofalso')).toBe('/')
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect(['/mapa'])).toBe('/')
  })
})
```

Run: `npx vitest run tests/lib/safeRedirect.test.ts`
Expected: PASS, 2 tests.

Note `lib/auth.ts` is imported by the layout above, which is a server component, and `safeRedirect` is a pure string function, so no `server-only` boundary is crossed by testing it.

- [ ] **Step 6: Type-check with a temporary stub, then remove it**

`ReportDocument` arrives in Task 11. To close this task on its own, create `components/relatorio/ReportDocument.tsx` with the full props and a minimal body, which Task 11 then fills in:

```tsx
'use client'

import type { PlatformTheme } from '@/types/mapa'
import type { ReportAnalysis, ReportShell } from '@/types/relatorio'

export interface ReportDocumentProps {
  theme:    PlatformTheme
  shell:    ReportShell
  analyses: Map<string, ReportAnalysis>
  pending:  Set<string>
  errors:   Map<string, string>
  expired:  boolean
  onRetry:  (layerId: string) => void
}

export default function ReportDocument({ shell, analyses }: ReportDocumentProps) {
  return (
    <main className="report-paper">
      <h1>{shell.recorte.featureName}</h1>
      <p>{analyses.size} de {shell.analyses.length} análises carregadas.</p>
    </main>
  )
}
```

Run: `npm run build`
Expected: success.

Run: `npm run lint`
Expected: clean.

- [ ] **Step 7: Verify the route group is isolated**

Run: `npm run dev` and check three things:

1. `http://localhost:3000/relatorio?recorte=municipios&feicao=campina-grande&ano=2023&camadas=estoque_carbono,solo_carbono` renders the placeholder and counts up to 2 as the analyses arrive.
2. The page **scrolls**. If it does not, `mapa.css` leaked in, which means an `app/layout.tsx` appeared or the group is nested wrongly.
3. `http://localhost:3000/mapa` still fills the viewport with no scrollbar, and the landing page at `/` still scrolls. Those two are the proof the new root layout did not disturb its siblings.
4. Signed out, `/relatorio?...` redirects to `/login?redirect=/relatorio`, and signing in lands back on `/relatorio` rather than on `/`.

- [ ] **Step 8: Commit**

```bash
npm test
git add app/\(relatorio\) app/relatorio.css components/relatorio \
        app/\(auth\)/login/page.tsx lib/auth.ts tests/lib/safeRedirect.test.ts
git commit -m "feat: report route group, print stylesheet and client fetcher"
```

---
## Task 11: The document and its sections

Replaces the Task 10 stub with the real document, in the anatomy the SAP report proved: identification header, one section per analysis (narrative, dominant-value card, snapshot table, map and series side by side, historical reading), methodological notes, footer.

The section reuses `StatsChartView` from Task 9 for the snapshot, which is what brings the stock doughnut, the class bars and the continuous grid in without writing any of them again, and feeds the yearly series to the same component as `{ kind: 'timeseries' }`.

**Files:**
- Modify: `components/relatorio/ReportDocument.tsx` (replace the stub)
- Create: `components/relatorio/ReportSection.tsx`

**Interfaces:**
- Consumes: `ReportDocumentProps` from Task 10; `StatsChartView` from `components/mapa/StatsChart.tsx`; `classShares` from `lib/mapa/classShares.ts`; `numero` from `lib/mapa/format.ts`; `describeFlux` from `lib/mapa/carbonFlux.ts`; `LAYER_META` from `config/mapa/layerMeta.ts`.
- Produces:

```ts
export interface ReportSectionProps {
  theme:    PlatformTheme
  index:    number
  recorte:  ReportRecorte
  descriptor: ReportAnalysisDescriptor
  analysis: ReportAnalysis | undefined
  pending:  boolean
  error:    string | null
  onRetry:  () => void
  mapSrc:   string | undefined
  mapActive: boolean
  onMapCapture: (src: string | null) => void
}
export default function ReportSection(props: ReportSectionProps): React.ReactElement
```

- [ ] **Step 1: Write the section**

Create `components/relatorio/ReportSection.tsx`:

```tsx
'use client'

import { StatsChartView } from '@/components/mapa/StatsChart'
import ReportMapPreview from './ReportMapPreview'
import { classShares } from '@/lib/mapa/classShares'
import { numero } from '@/lib/mapa/format'
import { describeFlux } from '@/lib/mapa/carbonFlux'
import appConfig from '@/config/mapa/layers.json'
import type { PlatformTheme, RasterLayerConfig } from '@/types/mapa'
import type {
  ReportAnalysis,
  ReportAnalysisDescriptor,
  ReportRecorte,
} from '@/types/relatorio'

export interface ReportSectionProps {
  theme:        PlatformTheme
  index:        number
  recorte:      ReportRecorte
  descriptor:   ReportAnalysisDescriptor
  analysis:     ReportAnalysis | undefined
  pending:      boolean
  error:        string | null
  onRetry:      () => void
  mapSrc:       string | undefined
  mapActive:    boolean
  onMapCapture: (src: string | null) => void
}

function layerOf(layerId: string): RasterLayerConfig | undefined {
  return (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === layerId)
}

/** The headline number of a section, or null when the shape has none. */
function heroValue(analysis: ReportAnalysis, layer?: RasterLayerConfig) {
  const snapshot = analysis.snapshot
  if (!snapshot) return null

  if (snapshot.kind === 'stocks') {
    return {
      label: 'Estoque total',
      value: `${numero(snapshot.report.totalTc, 0)} ${snapshot.report.unit}`,
    }
  }
  if (snapshot.kind === 'categorical') {
    const dominant = classShares(snapshot.areas, layer?.classes ?? [])[0]
    return dominant
      ? { label: dominant.label, value: `${numero(dominant.share)}%` }
      : null
  }
  if (snapshot.kind === 'continuous') {
    const unit = analysis.unit ? ` ${analysis.unit}` : ''
    if (analysis.signedFlux) {
      // The sign leaves and the direction becomes a word, as the panel does.
      const flux = describeFlux(snapshot.stats.mean)
      return { label: flux.label || 'Média', value: `${numero(flux.magnitude, 2)}${unit}` }
    }
    return { label: 'Média', value: `${numero(snapshot.stats.mean)}${unit}` }
  }
  return null
}

export default function ReportSection({
  theme, index, recorte, descriptor, analysis, pending, error, onRetry,
  mapSrc, mapActive, onMapCapture,
}: ReportSectionProps) {
  const layer = layerOf(descriptor.layerId)
  const c = theme.colors
  const year = descriptor.effectiveYear ?? descriptor.requestedYear
  const hero = analysis ? heroValue(analysis, layer) : null

  return (
    <section className="report-section">
      <h2
        style={{
          margin: 0, padding: '10px 20px', fontSize: 20, fontWeight: 700,
          color: '#ffffff', background: descriptor.sectionColor,
        }}
      >
        {index + 1}. {descriptor.name}
      </h2>

      {pending && !analysis && (
        <p className="report-block" style={{ padding: 20, color: c.trunk }}>
          Calculando esta análise no Earth Engine…
        </p>
      )}

      {error && !analysis && (
        <div className="report-block" style={{ padding: 20, border: `1px solid ${c.border}` }}>
          <p style={{ margin: 0, fontWeight: 700, color: c.text }}>
            Não foi possível carregar esta análise.
          </p>
          <p style={{ margin: '4px 0 0', color: c.trunk }}>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="report-no-print"
            style={{
              marginTop: 12, padding: '6px 14px', cursor: 'pointer',
              color: c.onAccent, background: c.accent,
              border: 'none', borderRadius: 4, font: 'inherit',
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {analysis && analysis.status !== 'available' && (
        <div className="report-block" style={{ padding: 20, border: `1px solid ${c.border}` }}>
          <p style={{ margin: 0, fontWeight: 700, color: c.text }}>
            {analysis.status === 'year_not_found'
              ? `Esta camada não tem dado para ${descriptor.requestedYear}.`
              : 'Esta análise não está disponível.'}
          </p>
          {analysis.availableYears.length > 0 && (
            <p style={{ margin: '4px 0 0', color: c.trunk }}>
              Anos disponíveis: {analysis.availableYears.join(', ')}.
            </p>
          )}
        </div>
      )}

      {analysis?.status === 'available' && (
        <>
          <div
            className="report-block"
            style={{
              display: 'grid', gridTemplateColumns: hero ? '1fr 210px' : '1fr',
              marginTop: 20, border: `1px solid ${c.border}`,
            }}
          >
            <div style={{ padding: 20 }}>
              <p style={{ margin: 0, fontWeight: 700, color: c.text }}>
                Situação{' '}
                <span style={{ fontWeight: 400, color: c.trunk }}>
                  {recorte.featureName}
                </span>
              </p>
              {analysis.narrative.situation && (
                <p style={{ margin: '8px 0 0', textAlign: 'justify', color: c.body }}>
                  {analysis.narrative.situation}
                </p>
              )}
              <dl
                style={{
                  display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr',
                  margin: '16px 0 0', paddingTop: 12,
                  borderTop: `1px solid ${c.border}`, fontSize: 13,
                }}
              >
                <div>
                  <dt style={{ fontWeight: 700, color: c.trunk }}>Ano analisado</dt>
                  <dd style={{ margin: 0 }}>{year ?? 'sem série temporal'}</dd>
                </div>
                <div>
                  <dt style={{ fontWeight: 700, color: c.trunk }}>Série disponível</dt>
                  <dd style={{ margin: 0 }}>
                    {analysis.series.length > 1
                      ? `${analysis.series[0].date.slice(0, 4)}–${analysis.series[analysis.series.length - 1].date.slice(0, 4)}`
                      : 'não se aplica'}
                  </dd>
                </div>
              </dl>
            </div>
            {hero && (
              <div
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '24px 16px', textAlign: 'center',
                  color: c.onAccent, background: descriptor.sectionColor,
                }}
              >
                <strong style={{ fontSize: 15 }}>{hero.label}</strong>
                <span style={{ marginTop: 6, fontSize: 26, fontWeight: 700 }}>{hero.value}</span>
              </div>
            )}
          </div>

          <div className="report-visual-block" style={{ marginTop: 24 }}>
            <h3 className="report-heading" style={{ margin: 0, fontSize: 16, color: c.trunk }}>
              Retrato espacial e distribuição
            </h3>
            <div
              className="report-visual-grid"
              style={{ marginTop: 10, border: `1px solid ${c.border}` }}
            >
              <div style={{ borderRight: `1px solid ${c.border}` }}>
                <div
                  style={{
                    padding: '8px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600,
                    color: c.trunk, background: c.mist, borderBottom: `1px solid ${c.border}`,
                  }}
                >
                  {year ? `Imagem de ${year}` : 'Imagem da camada'}
                </div>
                <ReportMapPreview
                  layerId={descriptor.layerId}
                  bbox={recorte.bbox}
                  year={descriptor.effectiveYear}
                  active={mapActive}
                  imageSrc={mapSrc}
                  onCapture={onMapCapture}
                />
              </div>
              <div>
                <div
                  style={{
                    padding: '8px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600,
                    color: c.trunk, background: c.mist, borderBottom: `1px solid ${c.border}`,
                  }}
                >
                  Distribuição sobre {recorte.featureName}
                </div>
                <div style={{ padding: 12 }}>
                  <StatsChartView
                    theme={theme}
                    stats={analysis.snapshot!}
                    classes={layer?.classes}
                    unit={analysis.unit}
                    signedFlux={analysis.signedFlux}
                  />
                </div>
              </div>
            </div>
          </div>

          {analysis.series.length > 1 && (
            <div className="report-visual-block" style={{ marginTop: 24 }}>
              <h3 className="report-heading" style={{ margin: 0, fontSize: 16, color: c.trunk }}>
                Série histórica
              </h3>
              <div style={{ marginTop: 10, padding: 12, border: `1px solid ${c.border}` }}>
                {/* The yearly series is fed to the same component as a
                    `timeseries` result, which it already knows how to draw. */}
                <StatsChartView
                  theme={theme}
                  stats={{ kind: 'timeseries', series: analysis.series }}
                  unit={analysis.unit}
                  signedFlux={analysis.signedFlux}
                />
              </div>
            </div>
          )}

          {(analysis.narrative.trend || analysis.narrative.context) && (
            <div
              className="report-block"
              style={{ marginTop: 20, padding: 20, border: `1px solid ${c.border}` }}
            >
              <h3 className="report-heading" style={{ margin: 0, fontSize: 15, color: c.trunk }}>
                Leitura histórica
              </h3>
              {analysis.narrative.trend && (
                <p style={{ margin: '10px 0 0', textAlign: 'justify', color: c.body }}>
                  <strong>Tendência recente:</strong> {analysis.narrative.trend}
                </p>
              )}
              {analysis.narrative.context && (
                <p style={{ margin: '10px 0 0', textAlign: 'justify', color: c.body }}>
                  <strong>Contexto da série:</strong> {analysis.narrative.context}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Write the document**

Replace `components/relatorio/ReportDocument.tsx` wholesale:

```tsx
'use client'

import { useState } from 'react'
import ReportSection from './ReportSection'
import { useReportMapCaptureQueue } from './useReportMapCaptureQueue'
import { numero } from '@/lib/mapa/format'
import { LAYER_META } from '@/config/mapa/layerMeta'
import type { PlatformTheme } from '@/types/mapa'
import type { ReportAnalysis, ReportShell } from '@/types/relatorio'

export interface ReportDocumentProps {
  theme:    PlatformTheme
  shell:    ReportShell
  analyses: Map<string, ReportAnalysis>
  pending:  Set<string>
  errors:   Map<string, string>
  expired:  boolean
  onRetry:  (layerId: string) => void
}

export default function ReportDocument({
  theme, shell, analyses, pending, errors, expired, onRetry,
}: ReportDocumentProps) {
  const c = theme.colors
  const [captured, setCaptured] = useState<Map<string, string | null>>(new Map())
  // The captures are serialized: six MapLibre instances rendering at once
  // exhausts the browser's WebGL contexts and some of them come back blank.
  const { activeKey, onCaptured } = useReportMapCaptureQueue(
    shell.analyses.map((a) => a.layerId),
    (layerId) => analyses.get(layerId)?.status === 'available',
  )
  const generatedAt = new Date(shell.generatedAt).toLocaleDateString('pt-BR')
  const done = shell.analyses.filter((a) => analyses.has(a.layerId)).length

  return (
    <>
      <div className="report-toolbar report-no-print">
        <span style={{ fontSize: 14, color: c.trunk }}>
          {done} de {shell.analyses.length} análises prontas
        </span>
        <span style={{ display: 'flex', gap: 12 }}>
          <a href="/mapa" style={{ color: c.accentInk, fontSize: 14 }}>Voltar aos mapas</a>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={done < shell.analyses.length}
            style={{
              padding: '6px 14px', font: 'inherit', fontSize: 14, borderRadius: 4,
              border: 'none', cursor: done < shell.analyses.length ? 'default' : 'pointer',
              color: c.onAccent, background: c.accent,
              opacity: done < shell.analyses.length ? 0.5 : 1,
            }}
          >
            Imprimir ou salvar em PDF
          </button>
        </span>
      </div>

      {expired && (
        <p
          className="report-no-print"
          style={{ margin: 0, padding: '10px 16px', background: c.accentBg, color: c.accentInk }}
        >
          Sua sessão expirou.{' '}
          <a href={`/login?redirect=${encodeURIComponent(`/relatorio${window.location.search}`)}`}>
            Entrar novamente
          </a>{' '}
          para completar o relatório.
        </p>
      )}

      <main className="report-paper">
        <header>
          <div
            style={{
              padding: '12px 20px', textAlign: 'center',
              color: c.onAccent, background: c.accent,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 21, textTransform: 'uppercase' }}>
              Relatório territorial de carbono
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.85 }}>
              Plataforma Carbono Caatinga — Observatório da Caatinga, OCA / UFCG-INSA
            </p>
          </div>

          <dl
            className="report-block"
            style={{
              display: 'grid', gap: 0, gridTemplateColumns: '170px 1fr',
              margin: '20px 0 0', border: `1px solid ${c.border}`, fontSize: 14,
            }}
          >
            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.trunk, background: c.mist }}>
              Área de análise
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              <strong>{shell.recorte.featureName}</strong> — {shell.recorte.layerName}
            </dd>

            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.trunk, background: c.mist }}>
              Área
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              {numero(shell.recorte.areaHa, 0)} ha
              {shell.recorte.boundary === 'simplified' && (
                <span style={{ color: c.trunk }}> (limite simplificado)</span>
              )}
            </dd>

            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.trunk, background: c.mist }}>
              Ano de referência
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              {shell.requestedYear}
            </dd>

            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.trunk, background: c.mist }}>
              Gerado em
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              {generatedAt}
            </dd>

            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.trunk, background: c.mist }}>
              Variáveis
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              {shell.analyses.map((a) => a.name).join(' · ')}
            </dd>
          </dl>
        </header>

        {shell.analyses.map((descriptor, index) => (
          <ReportSection
            key={descriptor.layerId}
            theme={theme}
            index={index}
            recorte={shell.recorte}
            descriptor={descriptor}
            analysis={analyses.get(descriptor.layerId)}
            pending={pending.has(descriptor.layerId)}
            error={errors.get(descriptor.layerId) ?? null}
            onRetry={() => onRetry(descriptor.layerId)}
            mapSrc={captured.get(descriptor.layerId) ?? undefined}
            mapActive={activeKey === descriptor.layerId}
            onMapCapture={(src) => {
              setCaptured((prev) => new Map(prev).set(descriptor.layerId, src))
              onCaptured(descriptor.layerId)
            }}
          />
        ))}

        <section className="report-section" style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${c.border}` }}>
          <h2 className="report-heading" style={{ margin: 0, fontSize: 18, color: c.trunk }}>
            Notas metodológicas e fontes
          </h2>
          <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6, color: c.body }}>
            {shell.analyses.map((descriptor) => (
              <p key={descriptor.layerId} style={{ margin: '0 0 8px' }}>
                <strong>{descriptor.name}:</strong> {descriptor.methodology}{' '}
                Fonte: {LAYER_META[descriptor.layerId]?.source ?? descriptor.source}.
              </p>
            ))}
            <p style={{ margin: '16px 0 0', color: c.trunk }}>
              Documento gerado automaticamente a partir de estatística zonal calculada no
              Google Earth Engine sobre o recorte indicado. Os números refletem os dados
              disponíveis na data de geração.
            </p>
          </div>
        </section>

        <footer style={{ marginTop: 40, paddingTop: 12, borderTop: `1px solid ${c.border}`, fontSize: 11, color: c.trunk }}>
          Plataforma Carbono Caatinga · OCA / UFCG-INSA · gerado em {generatedAt}
        </footer>
      </main>
    </>
  )
}
```

- [ ] **Step 3: Type-check**

`useReportMapCaptureQueue` and `ReportMapPreview` land in Task 12. To close this task, create both with their real signatures and a minimal body, which Task 12 fills in:

`components/relatorio/useReportMapCaptureQueue.ts`:

```ts
'use client'

import { useCallback, useMemo, useState } from 'react'

export function useReportMapCaptureQueue(
  layerIds: string[],
  isReady: (layerId: string) => boolean,
) {
  const [finished, setFinished] = useState<Set<string>>(new Set())
  const activeKey = useMemo(
    () => layerIds.find((id) => isReady(id) && !finished.has(id)) ?? null,
    [layerIds, isReady, finished],
  )
  const onCaptured = useCallback((layerId: string) => {
    setFinished((prev) => new Set(prev).add(layerId))
  }, [])

  return { activeKey, onCaptured }
}
```

`components/relatorio/ReportMapPreview.tsx`:

```tsx
'use client'

export interface ReportMapPreviewProps {
  layerId:   string
  bbox:      [number, number, number, number]
  year:      string | null
  active:    boolean
  imageSrc?: string
  onCapture: (src: string | null) => void
}

export default function ReportMapPreview({ imageSrc }: ReportMapPreviewProps) {
  return (
    <div className="report-map-frame" style={{ height: 230 }}>
      {imageSrc && <img src={imageSrc} alt="" />}
    </div>
  )
}
```

Run: `npm run build`
Expected: success.

Run: `npm run lint`
Expected: clean. `ReportSection` imports only what it uses — `maplibre-gl` is `ReportMapPreview`'s dependency, not this file's, and the report page is already a client bundle of its own, so no `dynamic` boundary is needed here.

- [ ] **Step 4: Verify the document by hand**

Run: `npm run dev` and open
`http://localhost:3000/relatorio?recorte=municipios&feicao=campina-grande&ano=2023&camadas=estoque_carbono,solo_carbono,lulc_mapbiomas,gfw_netflux`

Check:

1. The header table fills in, and `estoque_carbono` is the first section whatever order the URL asked in.
2. Sections appear in `Calculando…` and fill in one after another, two at a time.
3. `estoque_carbono` shows the stock doughnut and "Estoque total" in the hero card, with no "Série histórica" block (it is static).
4. `gfw_netflux` shows "sequestrou" or "emitiu" and **no minus sign**.
5. `lulc_mapbiomas` shows the class bars and **no** "Série histórica" block (`seriesKind: 'none'`).
6. `solo_carbono` shows the continuous grid, a series chart and a "Leitura histórica" block.
7. Ask for a year the series lacks — `&ano=1990` — and the section says so and lists the available years, instead of showing a number.
8. Print preview (Ctrl+P): A4, the toolbar gone, the two-column visual pair still two columns, no section split mid-table.

- [ ] **Step 5: Commit**

```bash
git add components/relatorio
git commit -m "feat: the report document and its sections"
```

---

## Task 12: Map capture

Each section carries an image of the layer over the recorte. It comes from a real MapLibre map: `preserveDrawingBuffer: true`, `fitBounds` on the feature's bbox, and `canvas.toDataURL('image/png')` on the first `idle`. That is the mechanism `SAP-frontend`'s `ReportMapPreview.tsx` uses, adapted to this platform's tile route.

The queue is not optional. A browser gives a page a limited number of live WebGL contexts, and mounting six maps at once makes some of them come back blank — which is exactly why the SAP version serializes the captures.

The tile URL comes from `/api/gee/tile` with the same body the store sends in `setTemporalDate`, so the image in the document is the image on the map, clipped to the biome, at the layer's own `visParams`.

**Files:**
- Modify: `components/relatorio/ReportMapPreview.tsx` (replace the stub)
- Modify: `components/relatorio/useReportMapCaptureQueue.ts` (replace the stub)

**Interfaces:** unchanged from the stubs in Task 11, so `ReportSection` and `ReportDocument` need no edit.

- [ ] **Step 1: Write the real queue**

Replace `components/relatorio/useReportMapCaptureQueue.ts`:

```ts
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** A capture that never settles must not stall every section behind it. */
const CAPTURE_TIMEOUT_MS = 25_000

/**
 * Serializes the map captures: at most one MapLibre instance is mounted at a
 * time, in the document's own section order.
 *
 * A browser caps the live WebGL contexts a page may hold, and six maps
 * rendering at once makes some of them capture a blank canvas. Waiting for one
 * to finish before mounting the next costs wall-clock and buys images that are
 * actually there.
 */
export function useReportMapCaptureQueue(
  layerIds: string[],
  isReady: (layerId: string) => boolean,
) {
  const [finished, setFinished] = useState<Set<string>>(new Set())

  // `isReady` closes over the analyses map and changes identity on every
  // arrival, which would make a dependency on it re-run the timeout effect
  // constantly. The ref keeps the latest without being a dependency.
  const isReadyRef = useRef(isReady)
  useEffect(() => { isReadyRef.current = isReady }, [isReady])

  const activeKey = useMemo(
    () => layerIds.find((id) => isReady(id) && !finished.has(id)) ?? null,
    [layerIds, isReady, finished],
  )

  const onCaptured = useCallback((layerId: string) => {
    setFinished((prev) => (prev.has(layerId) ? prev : new Set(prev).add(layerId)))
  }, [])

  // A map that never reaches `idle` — a tile route failure, a WebGL context
  // lost — would hold the queue forever. The timeout releases the slot and the
  // section keeps its placeholder.
  useEffect(() => {
    if (!activeKey) return
    const timer = setTimeout(() => onCaptured(activeKey), CAPTURE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [activeKey, onCaptured])

  return { activeKey, onCaptured }
}
```

- [ ] **Step 2: Write the real preview**

Replace `components/relatorio/ReportMapPreview.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import appConfig from '@/config/mapa/layers.json'
import { basemaps, defaultBasemapId } from '@/config/mapa/basemaps'
import type { RasterLayerConfig } from '@/types/mapa'

export interface ReportMapPreviewProps {
  layerId:   string
  bbox:      [number, number, number, number]
  year:      string | null
  active:    boolean
  imageSrc?: string
  onCapture: (src: string | null) => void
}

const GEE_SOURCE_ID = 'relatorio-gee'
const GEE_LAYER_ID = 'relatorio-gee-layer'

/** Tile URLs are shared across sections and survive a re-render. */
const tileUrlCache = new Map<string, string | null>()

async function resolveTileUrl(
  layer: RasterLayerConfig,
  year: string | null,
  signal: AbortSignal,
): Promise<string | null> {
  const key = `${layer.id}:${year ?? 'static'}`
  const cached = tileUrlCache.get(key)
  if (cached !== undefined) return cached

  // The same body the store sends in setTemporalDate, so the document shows
  // the same rendering the map does: clipped to the biome, at the layer's own
  // visParams, with the offline Jenks breaks when it has them.
  const res = await fetch('/api/gee/tile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset:        layer.gee?.asset,
      clipId:       layer.clipToLayerId,
      temporalDate: year ? `${year}-01-01` : undefined,
      visParams:    layer.gee?.visParams,
      classify:     layer.gee?.classify,
    }),
    signal,
  })
  if (!res.ok) {
    tileUrlCache.set(key, null)
    return null
  }
  const { tileUrl } = await res.json() as { tileUrl?: string }
  const resolved = typeof tileUrl === 'string' && tileUrl ? tileUrl : null
  tileUrlCache.set(key, resolved)
  return resolved
}

export default function ReportMapPreview({
  layerId, bbox, year, active, imageSrc, onCapture,
}: ReportMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const capturedRef = useRef(false)
  const onCaptureRef = useRef(onCapture)
  const [failed, setFailed] = useState(false)

  useEffect(() => { onCaptureRef.current = onCapture }, [onCapture])

  useEffect(() => {
    // Only the section the queue points at mounts a map, and only once.
    if (!active || imageSrc || capturedRef.current) return
    const container = containerRef.current
    if (!container) return

    const controller = new AbortController()
    let map: maplibregl.Map | null = null
    let cancelled = false

    const finish = (src: string | null) => {
      if (cancelled || capturedRef.current) return
      capturedRef.current = true
      if (!src) setFailed(true)
      onCaptureRef.current(src)
      map?.remove()
      map = null
    }

    async function setup() {
      const layer = (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === layerId)
      if (!layer?.gee?.asset) return finish(null)

      let tileUrl: string | null = null
      try {
        tileUrl = await resolveTileUrl(layer, year, controller.signal)
      } catch {
        return finish(null)
      }
      if (cancelled) return
      if (!tileUrl) return finish(null)

      // `basemaps` is a Record keyed by id, not an array.
      const basemap = basemaps[defaultBasemapId]
      if (!basemap) return finish(null)

      map = new maplibregl.Map({
        container,
        // Without this the canvas is cleared before toDataURL can read it and
        // the capture comes back transparent.
        preserveDrawingBuffer: true,
        attributionControl: false,
        interactive: false,
        style: {
          version: 8,
          sources: {
            base: { type: 'raster', tiles: [basemap.url], tileSize: 256, attribution: basemap.attribution },
            [GEE_SOURCE_ID]: { type: 'raster', tiles: [tileUrl], tileSize: 256 },
          },
          layers: [
            { id: 'base-layer', type: 'raster', source: 'base' },
            {
              id: GEE_LAYER_ID, type: 'raster', source: GEE_SOURCE_ID,
              paint: { 'raster-opacity': (layer.opacity ?? 100) / 100 },
            },
          ],
        },
        bounds: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
        fitBoundsOptions: { padding: 16 },
      })

      map.on('error', () => finish(null))
      // `idle` fires when every tile in view has finished loading and nothing
      // is animating, which is the first moment the canvas holds the whole
      // picture.
      map.once('idle', () => {
        try {
          finish(map!.getCanvas().toDataURL('image/png'))
        } catch {
          // A cross-origin tile taints the canvas and toDataURL throws.
          finish(null)
        }
      })
    }

    void setup()

    return () => {
      cancelled = true
      controller.abort()
      map?.remove()
    }
  }, [active, imageSrc, layerId, year, bbox])

  if (imageSrc) {
    return (
      <div className="report-map-frame" style={{ height: 230, overflow: 'hidden' }}>
        <img src={imageSrc} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="report-map-frame"
      style={{
        display: failed ? 'flex' : 'block',
        alignItems: 'center', justifyContent: 'center',
        height: 230, fontSize: 13, color: '#6f6c63',
      }}
    >
      {failed && 'Imagem do mapa indisponível.'}
    </div>
  )
}
```

- [ ] **Step 3: Confirm the basemap export shape**

Run: `grep -n "^export" config/mapa/basemaps.ts`

It should print `cartoTileUrl`, `basemaps` (a `Record<string, Basemap>`) and `defaultBasemapId`, which is what the code above uses. `Sidebar.tsx` and `MapView.tsx` already consume them and are the source of truth for the names; if they have moved, fix the import rather than the file.

One thing to watch: the CARTO basemaps go through `cartoTileUrl`, which needs `NEXT_PUBLIC_CARTO_KEY`. If that variable is missing in the environment, the base layer comes back blank while the GEE layer still renders — the capture succeeds and the map looks wrong rather than failing. Check the key is set before concluding the capture is broken.

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: success.

Run: `npm run lint`
Expected: clean.

- [ ] **Step 5: Verify the captures by hand**

Run: `npm run dev` and open the four-layer report URL from Task 11.

1. Sections gain a map image one at a time, top to bottom — never all at once.
2. No blank or transparent map frames. A blank one means `preserveDrawingBuffer` was lost or two maps mounted together.
3. `estoque_carbono` (static) gets an image with no year in the caption; `solo_carbono` gets one captioned with its effective year.
4. In the Network tab, `/api/gee/tile` is called once per distinct layer-and-year, not once per render.
5. Print preview shows the captured images, scaled inside the column and not overflowing.
6. Break a tile deliberately — go offline briefly during one capture — and confirm that section shows "Imagem do mapa indisponível.", the queue moves on, and the rest of the document still prints.

- [ ] **Step 6: Commit**

```bash
git add components/relatorio/ReportMapPreview.tsx components/relatorio/useReportMapCaptureQueue.ts
git commit -m "feat: queued map capture for the report sections"
```

---

## Task 13: Entry point in the map, and the documentation

The last piece is how anyone reaches the report: an overlay in the map, in the shape of the six that already live in `components/mapa/overlays/`.

**Files:**
- Create: `components/mapa/overlays/ReportForm.tsx`
- Modify: `components/mapa/Mapa.tsx`
- Modify: `DOCUMENTACAO.md`

**Interfaces:**
- Consumes: `REPORT_LAYERS`, `MAX_REPORT_LAYERS` from `config/mapa/reportLayers.ts`; `normalizeSearch` from `lib/mapa/normalizeSearch.ts`; `paradas`, `ano` from `lib/mapa/temporal.ts`; `GET /api/mapa/relatorio/feicoes`.
- Produces:

```ts
export interface ReportFormProps { theme: PlatformTheme; open: boolean; onClose: () => void }
export default function ReportForm(props: ReportFormProps): React.ReactElement | null
```

- [ ] **Step 1: Write the form**

Create `components/mapa/overlays/ReportForm.tsx`:

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import appConfig from '@/config/mapa/layers.json'
import { MAX_REPORT_LAYERS, REPORT_LAYERS } from '@/config/mapa/reportLayers'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { normalizeSearch } from '@/lib/mapa/normalizeSearch'
import { ano, paradas } from '@/lib/mapa/temporal'
import type { PlatformTheme, RasterLayerConfig, VectorLayerConfig } from '@/types/mapa'

export interface ReportFormProps {
  theme:   PlatformTheme
  open:    boolean
  onClose: () => void
}

interface Feicao { id: string; name: string }

/** How many matches the search list shows: 1210 municipalities do not fit. */
const MAX_SUGGESTIONS = 40

function recorteOptions(): VectorLayerConfig[] {
  return (appConfig.layers as VectorLayerConfig[]).filter((l) => l.type === 'vector')
}

/**
 * Years any curated layer can be asked for, newest first.
 *
 * The union rather than the intersection: the intersection of ten series is
 * often empty, and a layer that lacks the chosen year says so in its own
 * section instead of removing the year from the form.
 */
function yearOptions(): string[] {
  const years = new Set<string>()
  for (const entry of REPORT_LAYERS) {
    const layer = (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === entry.layerId)
    for (const stop of layer?.gee?.temporal ? paradas(layer.gee.temporal) : []) {
      years.add(ano(stop))
    }
  }
  return [...years].sort().reverse()
}

export default function ReportForm({ theme, open, onClose }: ReportFormProps) {
  const c = theme.colors
  const recortes = useMemo(recorteOptions, [])
  const years = useMemo(yearOptions, [])
  const [recorteId, setRecorteId] = useState('municipios')
  const [feicoes, setFeicoes] = useState<Feicao[]>([])
  const [loadingFeicoes, setLoadingFeicoes] = useState(false)
  const [query, setQuery] = useState('')
  const [feicaoId, setFeicaoId] = useState('')
  const [year, setYear] = useState(() => years[0] ?? '')
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(REPORT_LAYERS.slice(0, 4).map((entry) => entry.layerId)),
  )

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoadingFeicoes(true)
    setFeicaoId('')
    setQuery('')

    fetch(`/api/mapa/relatorio/feicoes?recorte=${encodeURIComponent(recorteId)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { feicoes: [] }))
      .then((body: { feicoes?: Feicao[] }) => setFeicoes(body.feicoes ?? []))
      .catch(() => { if (!controller.signal.aborted) setFeicoes([]) })
      .finally(() => { if (!controller.signal.aborted) setLoadingFeicoes(false) })

    return () => controller.abort()
  }, [open, recorteId])

  const matches = useMemo(() => {
    if (!query.trim()) return feicoes.slice(0, MAX_SUGGESTIONS)
    const needle = normalizeSearch(query)
    return feicoes.filter((f) => normalizeSearch(f.name).includes(needle)).slice(0, MAX_SUGGESTIONS)
  }, [feicoes, query])

  const chosen = feicoes.find((f) => f.id === feicaoId)
  const canGenerate = Boolean(feicaoId) && Boolean(year) && selected.size > 0

  function toggle(layerId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(layerId)) next.delete(layerId)
      else if (next.size < MAX_REPORT_LAYERS) next.add(layerId)
      return next
    })
  }

  function generate() {
    const camadas = REPORT_LAYERS
      .filter((entry) => selected.has(entry.layerId))
      .map((entry) => entry.layerId)
      .join(',')
    const params = new URLSearchParams({ recorte: recorteId, feicao: feicaoId, ano: year, camadas })
    // A full page load, not next/link: /relatorio is another route group with
    // its own root layout, so a client navigation would not apply it.
    window.open(`/relatorio?${params}`, '_blank', 'noopener')
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-label="Gerar relatório territorial"
      style={{
        position: 'absolute', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center',
        background: 'rgba(20,19,14,.45)', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 100%)', maxHeight: '90dvh', overflowY: 'auto',
          padding: 20, borderRadius: 10,
          background: c.bgCard, color: c.text, border: `1px solid ${c.border}`,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Gerar relatório territorial</h2>

        <label style={{ display: 'block', marginTop: 16, fontSize: 13, fontWeight: 600, color: c.textDim }}>
          Recorte
          <select
            value={recorteId}
            onChange={(e) => setRecorteId(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 6, padding: 8, font: 'inherit' }}
          >
            {recortes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>

        <label style={{ display: 'block', marginTop: 14, fontSize: 13, fontWeight: 600, color: c.textDim }}>
          Feição
          <input
            value={chosen ? chosen.name : query}
            onChange={(e) => { setQuery(e.target.value); setFeicaoId('') }}
            placeholder={loadingFeicoes ? 'Carregando…' : 'Buscar por nome'}
            style={{ display: 'block', width: '100%', marginTop: 6, padding: 8, font: 'inherit' }}
          />
        </label>

        {!chosen && matches.length > 0 && (
          <ul
            style={{
              margin: '6px 0 0', padding: 0, listStyle: 'none',
              maxHeight: 180, overflowY: 'auto', border: `1px solid ${c.border}`,
            }}
          >
            {matches.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => { setFeicaoId(f.id); setQuery('') }}
                  style={{
                    display: 'block', width: '100%', padding: '7px 10px', textAlign: 'left',
                    font: 'inherit', background: 'none', border: 'none', cursor: 'pointer', color: c.text,
                  }}
                >
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <label style={{ display: 'block', marginTop: 14, fontSize: 13, fontWeight: 600, color: c.textDim }}>
          Ano de referência
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 6, padding: 8, font: 'inherit' }}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>

        <fieldset style={{ marginTop: 16, padding: 0, border: 'none' }}>
          <legend style={{ padding: 0, fontSize: 13, fontWeight: 600, color: c.textDim }}>
            Variáveis ({selected.size} de até {MAX_REPORT_LAYERS})
          </legend>
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            {REPORT_LAYERS.map((entry) => {
              const layer = (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === entry.layerId)
              const checked = selected.has(entry.layerId)
              const full = !checked && selected.size >= MAX_REPORT_LAYERS
              return (
                <label
                  key={entry.layerId}
                  style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    fontSize: 13, opacity: full ? 0.45 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={full}
                    onChange={() => toggle(entry.layerId)}
                  />
                  <span>
                    <strong style={{ fontWeight: 600 }}>{layer?.name ?? entry.layerId}</strong>
                    <span style={{ color: c.dim }}> — {LAYER_META[entry.layerId]?.description ?? ''}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <p style={{ marginTop: 14, fontSize: 12, color: c.dim }}>
          Cada variável é calculada ao vivo no Earth Engine, então um relatório com
          muitas variáveis leva mais tempo para ficar pronto.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 14px', font: 'inherit', background: 'none', border: `1px solid ${c.border}`, borderRadius: 5, cursor: 'pointer', color: c.text }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate}
            style={{
              padding: '8px 16px', font: 'inherit', border: 'none', borderRadius: 5,
              cursor: canGenerate ? 'pointer' : 'default',
              color: c.onAccent, background: c.accent, opacity: canGenerate ? 1 : 0.5,
            }}
          >
            Gerar relatório
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Mount it in the map**

In `components/mapa/Mapa.tsx`, add the import, a piece of state, a trigger button next to the existing panel toggle, and the overlay:

```tsx
import ReportForm from './overlays/ReportForm'
```

```tsx
  const [reportOpen, setReportOpen] = useState(false)
```

Render the overlay as the last child of the same wrapper that holds `ResultsSidebar`, and add a button to open it near the `IcList` toggle:

```tsx
        <ReportForm theme={theme} open={reportOpen} onClose={() => setReportOpen(false)} />
```

Place the trigger wherever the existing floating controls sit, labelled `Relatório`, with `aria-label="Gerar relatório territorial"`. Match the styling of the button already there rather than inventing a new one.

- [ ] **Step 3: Type-check and verify**

Run: `npm run build` and `npm run lint`
Expected: success and clean.

Run: `npm run dev`, open `/mapa` and check:

1. The trigger opens the dialog; Escape or a click outside closes it.
2. Switching the recorte reloads the feature list, and `/api/mapa/relatorio/feicoes` is called once per switch.
3. Typing `campina` narrows the list; picking a feature fills the field.
4. Checking an 8th variable disables the rest instead of silently dropping one.
5. `Gerar relatório` opens a new tab at `/relatorio?...` with the parameters in the URL, and the document builds.
6. The URL survives a copy-paste into another tab.

- [ ] **Step 4: Document it**

Add a section to `DOCUMENTACAO.md`, in Portuguese like the rest of the file, after `## Estatísticas zonais`. Write it as an explanation of the decisions, not a list of files:

- What the report is, and that its unit is one recorte feature plus one year plus up to 8 curated variables.
- Why it is one request per analysis and not one for the document: twelve live GEE reductions in a single request time out, unlike SAP-frontend, which reads precomputed municipal aggregations.
- That the feature id is the slug of the label with an ordinal suffix for the 34 homonymous municipalities and 213 settlements, and that the real fix is preserving `code_muni` in `build-recortes.py` — regenerating the vectors in another order can migrate a suffix.
- That the report lives in a fourth root layout, `app/(relatorio)/`, because `mapa.css` and the `(mapa)` layout zero the body scroll, and that the link from the map is therefore `<a href>`.
- That the document does not wear the monthly accent, because the same report generated in two months would be two different documents.
- Which curated layers get a series and which do not: `estoque_carbono` and `gfw_netflux` are static, and `lulc_mapbiomas` declares `seriesKind: 'none'` because a mean of MapBiomas class codes is a third class.
- That the series runs at a floor scale coarser than the snapshot, and that losing the series does not lose the section.

Add to the `## TODOs` section, under `Camadas e dados`:

- Preserve `code_muni` / `abbrev_state` in `scripts/build-recortes.py`, give `assentamentos` a stable code, and key the report's feature identity on the official code instead of the slug suffix.
- A share-per-class series for `lulc_mapbiomas`, which would cost one grouped reduction per year.
- Measure the zonal series over a whole state with 40 stops. If the floor scale plus `bestEffort` is not enough, the series becomes its own cached artifact instead of part of the analysis call.

- [ ] **Step 5: Full verification and commit**

```bash
npm test
npm run lint
npm run contrast
npm run build
```

All four must pass. `npm test` and `npm run lint` are the ones CI does not run.

```bash
git add components/mapa/overlays/ReportForm.tsx components/mapa/Mapa.tsx DOCUMENTACAO.md
git commit -m "feat: report entry point in the map, and documentation"
```

---

## Self-review

**Spec coverage.** Every section of the design doc maps to a task: contract and curated config to Task 3; feature identity to Task 2; the four preparatory refactors to Tasks 1, 4, 5 and 9; the service to Task 7; the three routes to Task 8; the narrative to Task 6; the route group, print CSS and client to Task 10; the document to Task 11; the map capture to Task 12; the entry point and docs to Task 13. The error-degradation table is covered across Tasks 7 (series caught separately, `year_not_found`, `unavailable`), 8 (400/404/429, and 200 for an unavailable analysis), 10 (the 401 notice raised once) and 11–12 (the per-section retry and the map placeholder).

**Three deviations from the spec, each with its reason in the task:**

1. `formatNumber.ts` became `format.ts` with **two** number functions. The CSV sets `useGrouping: false` deliberately, so one shared function would have stripped the thousands dot from every sentence. The spec was amended to match before this plan was written.
2. `StatsChart`'s default export keeps its name and its store read, and the presentational component is a new named export `StatsChartView`, instead of the spec's `StatsChart` + `ActiveStatsChart`. This leaves `ResultsSidebar.tsx:291` and the `dynamic` import boundary untouched.
3. Two additions the spec did not foresee, both found while reading the code: `config/mapa/reportLayers.ts` needs `seriesKind`, because a zonal mean of `lulc_mapbiomas` class codes is not a quantity; and `lib/auth.ts` needs `safeRedirect`, because the login page's allowlist would have silently rewritten `/relatorio?...` to `/`.

**Type consistency.** `ReportShell.analyses` is `ReportAnalysisDescriptor[]` and `ReportAnalysis extends ReportAnalysisDescriptor`, so `ReportSection` takes both a descriptor (always present) and an optional analysis. `availableYears` is 4-digit strings everywhere, produced by `paradas().map(ano)` in Task 7 and consumed as `.map(Number)` when calling `computeSeries`. `computeZonalStats` returns `ZonalStatsOutcome` in Tasks 4, 7 and in the test double of Task 7. `computeSeries` takes `{ asset, anos, region }` in Tasks 5 and 7. `useReportMapCaptureQueue(layerIds, isReady)` returns `{ activeKey, onCaptured }` in the stub of Task 11 and in the real one of Task 12, so Task 11 needs no edit.

**What is verified by test and what is not.** Tasks 1 through 8 plus the `safeRedirect` step of Task 10 are covered by Vitest: 89 cases across ten files (6 + 11 + 11 + 9 + 7 + 5 + 12 + 13 + 13 + 2). Tasks 9 through 13 are `.tsx` and `vitest.config.ts` includes only `tests/**/*.test.ts`, so their deliverable is the type-check plus the named manual checks; each of those tasks lists exactly what to look at and what a failure would mean.
