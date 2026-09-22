# Multi-layer results panel — design

**Date:** 2026-09-22
**Status:** approved in conversation, section by section, before any code was written.

## 1. Goal

> "Com duas ou mais camadas de dados ativas, não fica claro a qual dataset o valor exibido se
> refere. A janela de resultados deveria apresentar os resultados de todas as camadas ativas."

The results panel (`components/mapa/ResultsSidebar.tsx`) shows exactly one measurement, no
matter how many rasters are on. Every path that computes statistics resolves its target with
the same expression — `layers.find((l) => l.type === 'raster' && l.visible)` — which takes the
topmost visible raster and silently discards the rest. `StatsChart.tsx:106` then builds the
chart caption from that same layer, so with three rasters on, the panel shows one number and
nothing states unambiguously which layer produced it.

Meanwhile `FloatingLegend` already lists *every* visible layer. The inconsistency between the
legend and the results panel is what the report is describing.

After this work, one analysis produces one card per visible raster, each naming its layer, its
year and its unit.

Out of scope: the report module, `config/mapa/layers.json`, the GEE allowlist and the
`/api/gee/*` routes. No new endpoint is needed — the existing ones are already called once per
layer.

## 2. Decisions

Settled with the user before any code was written.

| # | Question | Decision |
|---|---|---|
| 1 | When are the N layers computed? | **All in parallel on the click.** One request per visible raster, each card with its own loading / error / retry, mirroring how the report treats its sections. |
| 2 | How are N results laid out in a 368 px panel? | **Accordion with a summary in the header.** Every card shows its headline number while collapsed; the topmost layer starts expanded. |
| 3 | What does "Baixar CSV" produce? | **One file with every layer:** identification and recorte measurements once, then one block per layer. A single-layer analysis keeps today's filename exactly. |
| 4 | What counts as an "active layer"? | **Visible rasters only.** Vectors are the recorte — they are already named by the chip and the feature label. |
| 5 | Does a layer turned on *after* the selection compute? | **Yes**, automatically. It falls out of the reactive diff in §3.3 at no extra cost. |
| 6 | Does a failed card retry by itself? | **No.** Retry is a button on the card. An automatic retry inside a reactive effect risks a request loop. |

## 3. Architecture

### 3.1 One result per layer, in the store

`lib/mapa/store.ts` today holds a single result in four parallel fields — `rasterStats`,
`pixelValue`, `statsLoading`, `statsError`. They are replaced by one record keyed by layer id:

```ts
export interface LayerResult {
  layerId: string
  /** Temporal stop these numbers refer to; absent for a static layer. */
  date?: string
  status: 'loading' | 'ready' | 'error'
  stats: RasterStatsResult | null
  pixelValue: PixelValueResult | null
  error: string | null
}

results: Record<string, LayerResult>
```

`drawnArea`, `drawnLength`, `analysisLabel` and `analysisKind` are unchanged: they describe the
recorte, not the layer, and are shown once at the top of the panel. `statsCache` and
`pixelCache` are unchanged — they are already keyed per layer and per geometry.

The selected geometry joins them as store state:

```ts
export interface SelectedGeometry {
  geometry:     GeoJSON.Geometry
  geometryType: 'polygon' | 'point'
  lon?:         number
  lat?:         number
}
selectedGeometry: SelectedGeometry | null
```

`MapView` kept it in `selectedGeomRef` because nothing outside the map needed it. A failed
card's "Tentar novamente" does — it re-measures one layer over that geometry — so it becomes
state. Its `vectorLayerId` field is dropped: it is written at three points and read at none.
The type lives in `types/mapa.ts` rather than in the runner, because the store holds a value
of it and the runner imports the store.

New actions: `setLayerResult(layerId, patch)` (merge) and `clearResults()`, which replaces the
`setRasterStats(null); setPixelValue(null); setStatsError(null)` trio, which `MapView.tsx`
spells out at eleven separate points today. `clearDrawings` calls `clearResults`.

Nothing prunes `results` when a layer is switched off. The panel derives what to render from
`layers.filter(raster && visible)` intersected with `results`, so the card disappears on its
own, and switching the layer back on reuses the result — which is still valid, because every
path that changes the geometry clears the whole record first.

### 3.2 `lib/mapa/analysisRunner.ts` — the only place that computes

Today the block *resolve temporal date → read cache → pick between `getRasterStats`,
`getTemporalTimeSeries` and `getRasterPointValue` → write result → catch → finally* is copied
at four points of `MapView.tsx`:

| call site | lines (before) |
|---|---|
| `handleDrawCommit`, Polygon | ~580–615 |
| `handleDrawCommit`, Point | ~620–670 |
| `runFeatureAnalysis` | ~840–985 |
| reactive stats effect | ~1390–1493 |

Multiplying four copies by N layers in place is not viable, so the block moves out of the
component into a module with two entry points:

```ts
/** One layer, one geometry. Honours statsCache / pixelCache. Writes its own LayerResult. */
export async function runLayerAnalysis(
  raster: RasterLayerConfig,
  geom: SelectedGeometry,
  date: string | undefined,
  seq: number,
): Promise<void>

/** Fans out over every visible raster; each promise settles and writes its card on its own. */
export function runVisibleRasterAnalyses(geom: SelectedGeometry, seq: number): void
```

No `await Promise.all`: a slow layer must not hold back a fast one. The four call sites above
collapse to one line each.

`statsSeqRef` — the guard that discards a superseded response — moves from a `MapView` ref to a
module-level counter in the runner, with `bumpAnalysisSeq()` / `currentAnalysisSeq()`. The
fan-out has no other way to share it. Every store write still checks `seq === currentAnalysisSeq()`
before landing.

The cache key helper `statsCacheKey` (`MapView.tsx:72`) moves into the runner alongside it.

### 3.3 The reactive effect diffs instead of recomputing

The effect at `MapView.tsx:1390` watches `activeRasterId` plus that one layer's temporal date.
It will watch the whole set instead, through a pure function:

```ts
export function pendingAnalyses(input: {
  rasters: RasterLayerConfig[]              // visible rasters, topmost first
  temporalDate: Record<string, string>
  results: Record<string, LayerResult>
  fetchedTileUrls: Record<string, string>
  temporalTileUrls: Record<string, Record<string, string>>
}): { layer: RasterLayerConfig; date?: string }[]
```

Rules it encodes:

1. A layer whose `results[id]` already covers the same `date` with status `ready` or `loading`
   is skipped — no duplicate request.
2. Status `error` for the same date is **also** skipped. Retry is the card's button; retrying
   inside the effect would loop.
3. A GEE layer with no tile URL yet for its date is skipped and left `loading`. The effect
   depends on `fetchedTileUrls` and `temporalTileUrls`, so it picks the layer up when the URL
   lands. Today's equivalent guard is `hasUrl`; it becomes per-layer instead of blocking
   everything.
4. Everything else is returned, in layer order, and handed to `runLayerAnalysis`.

Three consequences, all wanted: turning on a fourth layer with a feature already selected makes
its card appear and compute; changing one layer's year recomputes only that layer, where today
the whole context key changes and everything is refetched; and a layer still fetching its tile
no longer stalls the others.

### 3.4 One shared "has content" predicate

`Mapa.tsx:46` duplicates the `hasContent` condition of `ResultsSidebar.tsx:54` — its own comment
says so ("Same condition ResultsSidebar renders on"). With `results` the condition gets longer,
and two copies of it will drift. It becomes a single exported selector, used by both:

```ts
export function hasAnalysisContent(s: MapaStore): boolean
```

## 4. UI

### 4.1 `components/mapa/LayerResultCard.tsx` (new)

One collapsible card per visible raster.

- **Header:** layer name, the year when the layer is temporal, the summary line (§4.4), and a
  chevron. The header is the whole answer while collapsed.
- **Body:** `StatsChartView`, plus the "Valor do pixel" card when the analysis was a point.
- **Status:** `loading` renders `SkeletonChart`; `error` renders `ErrorCard` plus a retry button
  that calls `runLayerAnalysis` for that layer alone, over `selectedGeometry` from the store. A visible raster with **no** `results` entry
  at all — just switched on, or still fetching its tile per rule 3 of §3.3 — renders the same
  skeleton, so a card never appears empty while work is pending.

`StatsChartView` is already store-free and already used by `components/relatorio/ReportSection.tsx`
to render N sections each with its own layer metadata. It is the piece this design needs and it
already exists; it is not modified.

### 4.2 `ResultsSidebar.tsx`

Keeps the header, the recorte chip and feature label, "Área analisada", "Comprimento", the
download button and the provenance footer. In place of the single `<StatsChart />` it maps the
visible rasters to `<LayerResultCard>`, in layer order (topmost first).

The "Valor do pixel" card **moves** into `LayerResultCard`. It is the purest instance of the
reported bug: a bare number with no layer beside it.

Expansion state is a local `useState<Set<string>>`, seeded with the topmost visible raster's id.
A layer turned on later enters collapsed, with its summary already readable.

The onboarding hint (`analysisHint`, `lib/mapa/analysisTargets.ts`) is unchanged: it still keys
on "a raster is on but nothing has been analysed".

### 4.3 `StatsChart.tsx`

The default export — the store-bound wrapper starting at line 94 — is deleted. It exists only
because the panel had exactly one result: it reads `rasterStats` from the store and builds its
caption from "the visible raster", a notion this change retires. `StatsChartView`,
`SkeletonChart` and `ErrorCard` stay and are consumed by `LayerResultCard`.

`ReportSection.tsx` imports only the named `StatsChartView` and is unaffected.

The dynamic import that keeps Recharts out of the initial map bundle stays, retargeted:

```ts
const StatsChartView = dynamic(
  () => import('./StatsChart').then((m) => m.StatsChartView),
  { ssr: false, loading: () => null },
)
```

The card header already names the layer, so the card passes no `caption` to `StatsChartView`;
the report keeps passing its own.

### 4.4 `lib/mapa/resultSummary.ts` (new)

The collapsed header's one-line answer, as a pure function of the layer config plus its
`LayerResult`, one branch per `RasterStatsResult['kind']`:

| kind | summary |
|---|---|
| `continuous` | `média 38,2 tC/ha` |
| `categorical` | dominant class and its share, via the existing `classShares` |
| `timeseries` | last non-null value with its year |
| `stocks` | `total X tC` |
| point analysis | the pixel value with its class label, when there is one |

Pure because vitest runs in the node environment here — this is the part of the card that can
be tested directly.

## 5. CSV

`lib/mapa/exportAnalysis.ts` splits `AnalysisSnapshot` in two levels:

```ts
export interface LayerSnapshot {
  layerName: string
  layerUnit?: string
  layerClasses?: RasterClass[]
  signedFlux?: boolean
  year?: string
  pixelValue: PixelValueResult | null
  stats: RasterStatsResult | null
}

export interface AnalysisSnapshot {
  analysisKind: string | null
  analysisLabel: string | null
  drawnArea: number | null
  drawnLength: number | null
  generatedAt: Date
  layers: LayerSnapshot[]
}
```

`buildAnalysisCsv` keeps its name and emits the identification header and the recorte
measurements once, then one block per layer carrying its own `# Camada:`, `# Ano:` and, where it
applies, the signed-flux convention line. The per-kind row builders (`continuousRows`,
`categoricalRows`, `timeSeriesRows`, `stockRows`) are unchanged; only their input narrows from
`AnalysisSnapshot` to `LayerSnapshot`.

Filename: `caativar_3-camadas_campina-grande_2026-09-22.csv` for several layers; **with exactly
one layer it is byte-for-byte today's name**, `caativar_<camada>_<recorte>_<data>.csv`, so the
common case does not regress.

`ResultsSidebar` is the only consumer (`buildAnalysisCsv` appears nowhere else outside its test).

## 6. Cost and failure

A click on a municipality with three layers on is three parallel `POST /api/gee/stats`, where
today it is one. The in-memory rate limiter allows 60 requests per IP per minute
(`lib/mapa/rateLimit.ts`), and the exclusive subthemes in `config/mapa/groups.ts` cap the
visible rasters at 13, so even the worst case stays well inside the window.

Each card fails alone, with its own message and its own retry, which is the same shape the
report's sections use — a design adopted there precisely because a zonal reduction over a large
recorte can exceed the Earth Engine deadline. No single layer can take the panel down.

## 7. Testing

`npm test` runs vitest in the node environment over `tests/**/*.test.ts`, so the verification
targets the pure functions this design deliberately extracted.

| file | covers |
|---|---|
| `tests/lib/exportAnalysis.test.ts` (extended) | N blocks in one CSV; one layer keeps the old filename and layout |
| `tests/lib/resultSummary.test.ts` (new) | one case per `kind`, including a series with nodata |
| `tests/lib/analysisRunner.test.ts` (new) | `pendingAnalyses`: the four rules of §3.3 |

The third matters most: it decides what reaches Earth Engine, and getting it wrong costs either
duplicate requests or a card stuck on `loading`.

CI (`.github/workflows/ci.yml`) runs only `npm ci`, `npm run build` and `npm run contrast`, so
`npm test` and `npm run lint` are run locally before the PR.

## 8. Out of scope

No comparison or differencing between layers. No user reordering of the cards. No per-card
download. No change to `config/mapa/layers.json`, to the GEE allowlist, to the `/api/gee/*`
routes or to the report module.

## 9. Files

**New:** `lib/mapa/analysisRunner.ts`, `lib/mapa/resultSummary.ts`,
`components/mapa/LayerResultCard.tsx`, `tests/lib/analysisRunner.test.ts`,
`tests/lib/resultSummary.test.ts`.

**Removed:** `MapView`'s `selectedGeomRef` and `statsSeqRef` (replaced by store state and by
the runner's counter), its local `geomHash` / `statsCacheKey` (moved into the runner), its
`pickStatsTarget` (the single-raster pick this change retires), and `StatsChart`'s default
export.

**Modified:** `lib/mapa/store.ts`, `lib/mapa/exportAnalysis.ts`, `components/mapa/MapView.tsx`,
`components/mapa/ResultsSidebar.tsx`, `components/mapa/StatsChart.tsx`,
`components/mapa/Mapa.tsx`, `types/mapa.ts`, `tests/lib/exportAnalysis.test.ts`.
