# Automatic territorial report — design

Status: approved design, ready for an implementation plan.
Date: 2026-09-12.

Written in English, per `CLAUDE.md`. UI strings stay in Portuguese because the
product is for a Brazilian audience, and quoted verbatim here when cited.
Domain terms the codebase already uses untranslated (`recorte`, `feição`,
`fitofisionomia`) stay untranslated.

## Goal

Generate, for one territorial `recorte` feature and one year, a printable
institutional document that gathers several carbon layers: for each one a
picture of the requested year, the zonal historical series, a deterministic
narrative, a map image and the methodological note.

The reference is the municipal report of `SAP-frontend`
(`src/{config,contracts,services,utils,components}/municipalReport*`,
`src/services/buildDoc/*`, `src/components/MunicipalReport/*`). This design
reuses its anatomy and its failure model, and departs from it wherever the two
platforms differ.

### The difference that drives the whole design

SAP reads **precomputed** municipal aggregations (Contentful/Drive pipeline).
This platform computes **live on Earth Engine** over a geometry. A six-layer
report is about twelve GEE calls, and a zonal statistic that takes seconds over
a municipality takes tens of seconds over a state. So the report cannot be one
request returning one whole contract, the way SAP's is.

## Decisions

| Decision | Choice |
|---|---|
| Unit | A `recorte` feature chosen in a form (município, estado, terra indígena, quilombola, assentamento, bioma). Not the drawn polygon. |
| Content | A curated eligible set in config, with the user checking which of those enter one generation (cap: 8). |
| Text | Deterministic narrative generated in code from the data. No CMS, no Google Docs. |
| File output | A4 HTML page plus the browser's print-to-PDF. |
| Historical series | Yes: the yearly-series path gains a zonal reducer. |
| Map image | Client-side MapLibre canvas capture, queued (SAP's mechanism). |
| Feature identity | Slug of the label, with an ordinal suffix for homonyms. |
| Assembly | Server service, one route call per analysis, client assembles ("approach C"). |

### Why approach C

- `GET .../base` returns the document shell with no GEE work.
- `GET .../analise` returns one measured analysis.
- The client draws the document immediately and fills sections as they arrive,
  with limited concurrency.

What this buys: geometry never travels from the client, which is already the
rule here (`clipRegistry`, `stocksRegistry`); each call is short, cacheable and
retryable on its own; the per-analysis `status` that SAP has falls out
naturally instead of being partial-error handling; the map capture queue lines
up with the analysis queue; and a later server-side PDF is this same service
called N times, not a reimplementation.

What it costs: N round trips, and the whole document is not a single server
JSON (a future scheduler would iterate the service).

Rejected: **one request, one contract** (SAP verbatim) — a single request of
~12 live GEE calls risks platform timeouts and shows a blank screen while it
runs. **Client fan-out over `/api/gee/*`** — `stats` requires `geometry` in the
body, so the browser would have to load the 1.1 MB `municipios.geojson` to
extract one feature and POST the polygon back, which is the hole `clipRegistry`
closes and is incompatible with a server-resolved slug.

## Feature identity

The recorte GeoJSONs in `public/data/vector/` carry **only the label** as a
property (`name_muni`, `abbrev_state`, `name_indigenous_land`, `name_quilombo`,
`nome_proje`) — no official code. Labels are not unique: 34 duplicate
municipality names, 213 duplicate settlement names, 2 indigenous lands, 1
quilombo.

So the id is the slug of the label plus an ordinal suffix, in file order, for
collisions: `campina-grande`, and `sao-domingos-2` / `sao-domingos-3`. The
suffix order is the same index order `FloatingSearchBar` already relies on.

Known limitation, recorded as a follow-up: regenerating the vectors in a
different order can migrate a homonym's suffix, silently repointing an old
link. The proper fix is to preserve `code_muni`/`abbrev_state` in
`scripts/build-recortes.py` (which today does `keep = [label]` and drops
everything else) and to give `assentamentos`, which comes from INSA outside
that script, the same treatment.

## Contract — `types/relatorio.ts` (new file)

A new file rather than growing `types/mapa.ts`, which is already the shared-type
file for the map module.

The key adaptation from SAP: every SAP `snapshot` is a class distribution,
because all its layers are categorical. Here `RasterStatsResult` already spans
the four shapes this platform produces (`categorical`, `continuous`,
`timeseries`, `stocks`), so the report **reuses that union verbatim** instead of
inventing a parallel shape. That is the largest reuse win in the plan:
`StatsChart.tsx` and `exportAnalysis.ts` already render and serialize all four,
including the `estoque_carbono` breakdown by pool and by fitofisionomia.

```ts
export type ReportAnalysisStatus = 'available' | 'unavailable' | 'year_not_found'

export interface ReportRecorte {
  layerId:     string   // 'municipios'
  layerName:   string   // 'Municípios'
  featureId:   string   // 'campina-grande'
  featureName: string   // 'Campina Grande'
  areaHa:      number   // geodesic, via @turf/area
  bbox:        [number, number, number, number]
}

/** Everything known about an analysis before touching Earth Engine. */
export interface ReportAnalysisDescriptor {
  layerId:        string
  name:           string
  unit?:          string
  signedFlux?:    boolean
  source:         string    // from LAYER_META, not duplicated in the report config
  methodology:    string    // the longer paragraph, from the report config
  sectionColor:   string
  availableYears: string[]  // years of gee.temporal, empty when static
  requestedYear:  string | null   // null on the layers with no series
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
  snapshot:  RasterStatsResult | null   // the existing four-shape union
  series:    TimeSeriesPoint[]          // zonal mean per year
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

## Curated config — `config/mapa/reportLayers.ts` (new file)

The equivalent of SAP's `MUNICIPAL_REPORT_LAYERS` plus its `presentation`
block.

```ts
export interface ReportLayerConfig {
  layerId:     string
  order:       number
  sectionColor: string
  /** Sentence fragment completing "…% da área analisada ___". */
  coverageContext: string
  methodology: string
  /** Narrative vocabulary for the trend sentence. */
  trend?: { phenomenon: string; increaseTerm: string; decreaseTerm: string }
  /** Floor scale for the series, coarser than the snapshot's. Optional. */
  seriesScale?: number
}
```

`source` is **not** declared here: it comes from `LAYER_META[layerId].source`
in `config/mapa/layerMeta.ts`, which already has it.

Eligible set, with `estoque_carbono` always first because it is the only layer
whose result is the decomposed stock report: `estoque_carbono`, `solo_carbono`,
`biomassa_esa_lenhosa`, `gfw_netflux`, `lulc_mapbiomas`, `fogo_frequencia`,
`gpp_modis`, `npp_modis`, `chirps_precip`, `ndvi_modis`.

Cap of 8 checked layers per generation, because each one costs two GEE calls.

## Recorte registry — `lib/mapa/recorteRegistry.ts` (new file)

Sibling of `clipRegistry.ts`, same pattern: server-only, reads from `public/`,
caches in a `Map`.

- `listRecortes()` — the vector layers that serve as report units.
- `listFeicoes(recorteId)` — `[{ id, name }]`, ids per the identity rule above.
- `getFeicao(recorteId, feicaoId)` — `{ geometry, bbox, areaHa, name }`, area
  geodesic via `@turf/area` (already a dependency).

`bioma` as a unit uses the native `clipAsset` or the 53 KB
`limite_caatinga_clip.geojson`, never the full 2.3 MB file — the same
preference order `clipRegistry` documents.

## Preparatory refactors

The logic the report needs lives **inside** the route handlers, not in `lib/`.
Two behavior-preserving extractions come first.

1. `app/api/gee/stats/route.ts` (~260 lines) → extract the body into
   `lib/mapa/zonalStats.ts` as
   `computeZonalStats(ee, { asset, geometry, colorType, classify, breaks, layerId, temporalDate })`.
   The route is left in the shape `CLAUDE.md` describes: validate, allowlist,
   authenticate, call, respond. `tests/app/statsRoute.test.ts` already mocks
   `buildEeImage` and `buildStockReport`, so it is the regression net.
2. `app/api/gee/timeseries/route.ts` → extract the year-stacking into
   `lib/mapa/zonalSeries.ts`, with the geometry as a parameter instead of a
   fixed `ee.Geometry.Point` and the reducer becoming `mean` on the zonal path.
   The route keeps its point path unchanged.

   **Invariant to preserve:** every year must be built through `buildEeImage`.
   The current code already does; an implementation that built its own
   `ee.Image` would show LST near 15000 in the chart while the map shows
   degrees Celsius.

3. `components/mapa/StatsChart.tsx` reads everything from the store
   (`rasterStats`, plus "the visible raster" to find classes and unit). In an
   N-section report "the visible raster" means nothing. So `StatsChart` takes
   `{ theme, stats, layer, caption }` as props, and a thin
   `ActiveStatsChart({ theme })` reads the store and delegates —
   `ResultsSidebar` keeps its current call site. `StockReportView.tsx` already
   takes props and is reused untouched.

4. The pt-BR formatting helpers currently private to
   `lib/mapa/exportAnalysis.ts` (`num`, `slug`, `isoDate`) move to
   `lib/mapa/format.ts`, shared by the CSV, the narrative and the document.

   One distinction the shared module has to keep: `num` sets
   `useGrouping: false` on purpose, because a thousands dot makes a script
   importer ambiguous. Prose needs the opposite. So the module exports
   `numeroCsv` (decimal comma, no grouping — what `exportAnalysis` keeps using)
   and `numero` (decimal comma with grouping — for the narrative and the
   document). Sharing a single function would silently strip the thousands dot
   from every sentence.

## Service — `lib/mapa/reportService.ts` (new file, server-only)

`buildReportShell(recorteId, feicaoId, year, layerIds)` — no GEE call. Resolves
the feature in `recorteRegistry`, intersects `layerIds` with
`config/mapa/reportLayers.ts` (rejecting anything outside the curated set), and
per layer builds the descriptor, with `availableYears` coming from `paradas()`
in `lib/mapa/temporal.ts`.

`buildReportAnalysis(recorteId, feicaoId, year, layerId)` — the two GEE calls:

1. Snapshot, via `computeZonalStats`, which already branches on its own for
   `stocks`, Jenks, categorical and continuous.
2. Series, via `computeZonalSeries`, with `bestEffort: true` and `tileScale: 4`
   as `stockReport.ts` does, at a scale coarser than the snapshot's
   (`seriesScale` in config, defaulting to a floor above the asset scale).

Year resolution, following SAP for the same reason:

- A layer with no `gee.temporal` is static: `requestedYear: null`,
  `availableYears: []`, `series: []`.
- A temporal layer missing the requested year returns
  `status: 'year_not_found'` with `availableYears` filled and
  `snapshot: null` — rather than falling back to the nearest year and showing a
  wrong number without saying so.

The series error is caught **separately** from the snapshot error, so a series
that times out still yields the snapshot.

## Routes

- `GET /api/mapa/relatorio/base?recorte=&feicao=&ano=&camadas=` → `ReportShell`
- `GET /api/mapa/relatorio/analise?recorte=&feicao=&ano=&camada=` → `ReportAnalysis`
- `GET /api/mapa/relatorio/feicoes?recorte=` → `[{ id, name }]`, to fill the form's
  picker. `FloatingSearchBar` downloads the whole GeoJSON to search; pulling
  1.1 MB of municipalities just to populate a select would repeat that for no
  reason.

All three: `getAuthenticatedRequest(req)` then `unauthorizedResponse()` first,
Node runtime, `force-dynamic`, `rateLimit(clientIp(req))`.

Two deliberate departures from the `/api/gee/*` convention, with their reasons:

- **GET instead of POST.** The `/api/gee/*` routes are POST because they carry
  geometry and `visParams` in the body. Nothing but short ids travels here, so
  GET gives free HTTP caching per (recorte, feição, ano, camada) — the same key
  shape the store already uses in `statsCache`. A `lib/mapa/reportCache.ts`
  with a TTL, modelled on `tileCache.ts`, makes regenerating the same report
  instant.
- **No `isAllowedAsset`.** Not a relaxation: these routes accept no asset at
  all. The client sends `camada`; the server resolves the asset from
  `layers.json`, exactly as `stocksRegistry` resolves the `stocks` block. The
  equivalent check becomes "is this `layerId` in `reportLayers`", which is
  strictly tighter than the allowlist.

## Narrative — `lib/mapa/reportNarrative.ts` (new file)

A pure function — no GEE, no `server-only` — taking the measured analysis and
returning the three sentences, so the test is trivial.

One shape per snapshot kind:

- `continuous` — mean with minimum and maximum.
- `categorical` — dominant class and percentage, using `coverageContext`.
- `stocks` — total in t C, with the leading pool and leading fitofisionomia.
- `timeseries` — no situation sentence (the kind never reaches a snapshot here).

`trend` compares the effective year with the previous stop, using
`increaseTerm`/`decreaseTerm`. `context` walks the whole series: first and last
year, extremes with their years, and the mean.

Two reuses instead of reinvention, which is what keeps the document from
contradicting the panel:

- Layers with `signedFlux` take their vocabulary from `lib/mapa/carbonFlux.ts`
  (`describeFlux` → `"sequestrou"` / `"emitiu"`, magnitude with no sign), not a
  raw minus sign in a sentence.
- Number formatting comes from `lib/mapa/format.ts` (see refactor 4).

## Client document

### A fourth sibling root layout, not a subroute of `/mapa`

`app/(mapa)/layout.tsx` sets `overflow: 'hidden'` and `height: '100dvh'` inline
on the `<body>`, and `mapa.css` repeats it. A document that scrolls and prints
does not fit there. So `app/(relatorio)/` becomes a fourth sibling root layout,
following the pattern `CLAUDE.md` documents: it owns its `<html>`, `<body>` and
`relatorio.css`, with Libre Franklin (the module typeface) and the
`@media print` block with `@page { size: A4 }`.

It repeats the `(mapa)` session guard: `getAuthenticatedSession()` and
`redirect('/login?redirect=...')`.

**The crossing rule applies:** the link from the map to the report is
`<a href>` / `window.open`, never `next/link`.

### No monthly accent in the document

The document's identity is the fixed OCA olive-green plus each section's
`sectionColor` from config. The month accent is out of place here: the same
report for the same municipality generated in March and in September has to be
the same document, not two differently coloured pieces in someone's archive.

### Entry point

A new overlay in `components/mapa/overlays/`, in the shape of the six that
already exist: picks the recorte, searches the feature, picks the year, checks
up to 8 curated layers, and opens
`/relatorio?recorte=&feicao=&ano=&camadas=` in another tab.

### Components — `components/relatorio/`

`ReportDocument` (identification header, sections, methodological notes from
`methodology` plus `LAYER_META[id].source`, footer) and `ReportSection` per
analysis, in the anatomy SAP proved: narrative, dominant-value card, snapshot
table, map and series side by side, historical reading.

Map capture: `ReportMapPreview.tsx` and `useReportMapCaptureQueue.ts` come from
SAP nearly verbatim — `preserveDrawingBuffer: true`, `fitBounds` on the
feature's `bbox`, `canvas.toDataURL('image/png')` on `idle`, one section at a
time in the queue. The adaptation is the `tileUrl`, which here comes from
`/api/gee/tile` with the `clipId` and is already cached for 90 min by
`tileCache.ts`.

Printing with animation on comes out blank, so charts on the report path get
`isAnimationActive={false}` and a fixed height, instead of a
`ResponsiveContainer` measuring a container that print reflows.

## Error degradation

| Failure | Behavior |
|---|---|
| Invalid recorte, feição or year | 400/404 on `base`; the page shows one message and attempts no analysis |
| One analysis fails on GEE | That section becomes `status: 'unavailable'` with a retry button; the rest of the document stands and prints |
| Temporal layer missing the year | `year_not_found`, and the section lists the years that exist |
| Series times out but the snapshot does not | The service catches the series error separately and returns `series: []`; the section shows the snapshot and says the series did not come out |
| Map capture fails | Placeholder in the frame with the caption preserved; the document stays printable |
| Session expires mid-generation | A 401 on a section becomes a single re-authentication notice, not N notices |

## Testing

Vitest, node environment, in the shape of `tests/lib/` and
`tests/app/statsRoute.test.ts`.

- `tests/lib/recorteRegistry.test.ts` — slug, stable suffix for the 34
  homonymous municipalities and 213 settlements, unknown id returns null,
  `bioma` resolving through `clipAsset`/`_clip`.
- `tests/lib/reportNarrative.test.ts` — the densest: one case per snapshot
  kind, `describeFlux` vocabulary (`"sequestrou"` on a negative value), no
  sentence when `year_not_found`, pt-BR formatting.
- `tests/lib/zonalSeries.test.ts` — years stacked through `buildEeImage` (with
  `ee` mocked), gap-series filtering, year cap.
- `tests/lib/reportService.test.ts` — rejects a `layerId` outside
  `reportLayers`; a static layer yields `requestedYear: null` and an empty
  series; a series failure preserves the snapshot.
- `tests/app/reportRoutes.test.ts` — 401 before any GEE work, 429 on the rate
  limit, 400/404 on invalid input.
- `tests/app/statsRoute.test.ts` must keep passing after the extraction.

Two notes for whoever writes these:

- `vitest.config.ts` includes `tests/**/*.test.ts` only — no `.tsx`. Every test
  above is a `.ts` test of a `lib/` module or a route, so none of them needs a
  config change; a component test would.
- `recorteRegistry` and `reportService` are `server-only`, which vitest
  resolves through the existing `tests/stubs/server-only.ts` alias.

One addition to the existing gate: `npm run contrast`
(`tsx scripts/check-contrast.mts`) today checks only the 12 monthly accents,
and report sections put white text over `sectionColor`. The chosen
`sectionColor` values join that 4.5:1 check, for consistency with the care
`carbonFlux.ts` already documents about WCAG 1.4.1.

CI runs only `npm ci`, `build` and `contrast`, so `npm test` and `npm run lint`
run locally.

## Out of scope

- The drawn polygon as a report unit. The chosen unit is a `recorte` feature;
  a shareable, cacheable URL is what that buys, and a drawn geometry has
  neither.
- Server-side PDF. The A4 HTML plus browser print is the output. The service
  shape leaves the door open: a server PDF is this service called N times.
- Scheduling and emailing reports.
- Editable text in a CMS. The narrative is deterministic and in code; SAP shows
  a code fallback has to exist regardless, so this is the fallback promoted to
  the whole answer.

## Follow-ups

- Preserve `code_muni` / `abbrev_state` in `scripts/build-recortes.py` and give
  `assentamentos` a stable code, then migrate feature identity from slug to
  code. Until then, regenerating the vectors can migrate a homonym's suffix.
- Measure the zonal series over a large recorte (a whole state, 40 stops). If
  the floor scale plus `bestEffort` is not enough, the series becomes its own
  cached artifact rather than part of the analysis call.

## New and touched files

New:

```
types/relatorio.ts
config/mapa/reportLayers.ts
lib/mapa/recorteRegistry.ts
lib/mapa/reportService.ts
lib/mapa/reportNarrative.ts
lib/mapa/reportCache.ts
lib/mapa/zonalStats.ts          (extracted)
lib/mapa/zonalSeries.ts         (extracted)
lib/mapa/format.ts              (extracted)
app/api/mapa/relatorio/base/route.ts
app/api/mapa/relatorio/analise/route.ts
app/api/mapa/relatorio/feicoes/route.ts
app/(relatorio)/layout.tsx
app/(relatorio)/relatorio/page.tsx
app/relatorio.css
components/relatorio/ReportDocument.tsx
components/relatorio/ReportSection.tsx
components/relatorio/ReportMapPreview.tsx
components/relatorio/useReportMapCaptureQueue.ts
components/mapa/overlays/ReportForm.tsx
tests/lib/recorteRegistry.test.ts
tests/lib/reportNarrative.test.ts
tests/lib/zonalSeries.test.ts
tests/lib/reportService.test.ts
tests/app/reportRoutes.test.ts
```

Touched:

```
app/api/gee/stats/route.ts        (thinned by the extraction)
app/api/gee/timeseries/route.ts   (thinned; point path unchanged)
components/mapa/StatsChart.tsx    (props instead of store reads)
components/mapa/ResultsSidebar.tsx (calls ActiveStatsChart)
lib/mapa/exportAnalysis.ts        (imports the shared formatters)
scripts/check-contrast.mts        (section colors join the check)
DOCUMENTACAO.md                   (a section on the report, in Portuguese)
```

No new dependency: `@turf/area`, `recharts`, `maplibre-gl` and
`@google/earthengine` are already there.
