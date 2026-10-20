# Layer colors and legend adapt to the selected recorte — design

**Date:** 2026-10-20
**Status:** approved in conversation, section by section, before any code was written.

## 1. Goal

> "Cores da camada e a legenda devem se adaptar ao recorte que tá sendo utilizado (atualmente
> sempre usa o de bioma)"

Every raster in `/mapa` is drawn with one scale, calibrated for the whole Caatinga:

- every raster declares `clipToLayerId: "bioma"`, and its colors stretch over the fixed
  `gee.visParams.min/max`;
- the continuous legend prints, at the ends of its bar, the real minimum and maximum of the
  biome (`config/mapa/dataRanges.json`, written by `npm run ranges` over `limite_caatinga`);
- the categorical legends (MapBiomas, degradação) always list every class.

Selecting a feature (a click or a search on a município, estado, terra indígena…) dims the rest
of the map and fills the results panel, but the raster and its legend stay on the biome's scale.
Inside a municipality whose values all fall in the bottom fifth of the biome's range, the map is
a single color.

After this work, selecting a feature re-colors the continuous rasters on that feature's own scale
and the legend says so; the categorical legends list only the classes present in the feature.

## 2. Decisions

Settled with the user before any code was written.

| # | Question | Decision |
|---|---|---|
| 1 | What is "the recorte in use"? | **The selected feature** of a Território recorte (click or search). Deselecting returns to the biome scale. A drawn area does not adapt the scale; turning a recorte layer on does not either. |
| 2 | What happens to the raster outside the feature? | **The whole biome is redrawn on the feature's scale.** Only `min`/`max` change, not the clip. Outside the feature colors may saturate, but that area is already dimmed by the selection spotlight and keeps its context. |
| 3 | Temporal layers: one scale for all years or one per year? | **One scale for the whole series**, computed over every year inside the feature, so a color means the same value at every year of the slider — as the biome scale does today. |
| 4 | Categorical layers? | **Colors unchanged; the legend lists only the classes with area inside the feature**, from the composition the results panel already computes. |
| 5 | Compute the scale on demand or offline? | **On demand on the server**, cached per layer and feature. Precomputing thousands of features × 27 layers × years offline was rejected: hours of batch work, a very large JSON, and a rerun on every data update. |
| 6 | Behavior details (presented as part 1 and approved) | A caption `"Escala ajustada a {nome}"` under the layer name while the recorte scale is on screen. The biome tile stays on screen until the recorte one is ready. Any failure falls back silently to the biome scale. `hillshade_fabdem` adapts like any other continuous GEE layer. |
| 7 | On a year step, what shows until the new year's recorte tile arrives? (settled after the final review) | **The nearest year's recorte tile.** The stretch is the same for every year, so the recorte colors stay on screen instead of flashing the biome scale on every step. The biome tile is shown only before the first recorte tile of a selection arrives. |

## 3. Behavior

When a feature of a Território recorte is selected and installed as the analysis selection (the
path that fills the results panel):

**Continuous GEE rasters.**

- **Scale.** The tile still covers the biome, but is requested with the feature's scale: from the
  lowest 2nd percentile to the highest 98th percentile across the years of the series, measured
  inside the feature.
- **Legend.** The bar keeps its palette. Its ends print the feature's real minimum and maximum for
  the year on screen, following today's convention: bar = stretch, ends = real extremes.
- **Caption.** `"Escala ajustada a {nome}"` sits under the layer name, `{nome}` being the
  analysis label (the feature's name).
- **While loading.** On a new selection the biome tile stays on screen until the recorte tile is
  ready; the tile and the legend switch together. On a year step after that, the nearest year's
  recorte tile stands in until the new year's arrives (decision 7), so the colors never flash back
  to the biome scale.
- **Signed flux (`gfw_netflux`).** The palette puts its white (`#f7f7f7`) at 1/4 of the bar, which
  is where zero falls on the biome's −100…300. The recorte scale keeps that proportion — the biome
  scale times a factor, `[min·k, max·k]` — so zero stays white and the equilibrium tick stays put.

**Categorical rasters.** Colors are unchanged. The legend lists only the classes with area greater
than zero inside the feature, for the year on screen, once that layer's `categorical` result is
ready. Until then it lists every class.

**The biome scale stays (or comes back) when:**

- the selection is dropped (the panel's X, clear, drawing an area, a new search);
- the selected feature belongs to the layer the raster is clipped to (`clipToLayerId`, i.e.
  `bioma`) — the biome scale *is* that feature's scale;
- the recorte lies below the rasters (`belowRaster` in `MapView.tsx`), where a click already
  measures nothing and installs no selection;
- the feature has no valid pixels, or its scale is degenerate (p2 = p98);
- the request fails or times out. No error is shown: the map stays correct, on the biome scale.
  There is no automatic retry; selecting the feature again retries.

**Out of reach by construction.** `sombreado_terreno` (`source: "dem"`, rendered by MapLibre, not
GEE), and the point layer `areas_monitoramento` (no area, not a Território recorte).

## 4. Server

### 4.1 `POST /api/gee/scale` (new)

`app/api/gee/scale/route.ts` — Node runtime, `force-dynamic`, like the other GEE routes.

```ts
interface ReqBody {
  layerId:     string   // continuous GEE raster in layers.json
  recorteId:   string   // Território recorte layer id
  feicaoIndex: number   // feature position in the recorte GeoJSON = MapLibre generateId
}

interface ScaleResponse {
  stretch: { min: number; max: number } | null       // null → keep the biome scale
  range:   DataRange | { byYear: Record<string, DataRange> } | null
}
```

`range` has the shape of an entry of `config/mapa/dataRanges.json`, so the legend reads it with the
existing `dataRangeFor` (§5.4).

Order of checks:

1. `getAuthenticatedRequest(req)` → `unauthorizedResponse()`. The route serves only the
   platform; it is not one of the public exceptions.
2. `rateLimit(clientIp(req))` → 429; `bodyTooLarge` → 413; JSON parse → 400.
3. **Layer.** `layerId` must name a `type: "raster"`, `colorType: "continuous"`,
   `source: "gee"` layer with `gee.asset`. The asset comes from `layers.json`, never from the
   body — the same rule as `lib/mapa/resultsRegistry.ts`. Otherwise 400.
4. **Feature.** `recorteId` must be in `listRecortes()` and differ from the layer's
   `clipToLayerId`; `feicaoIndex` must be a non-negative integer that `getFeicaoByIndex` resolves.
   Otherwise 400.
5. Cache hit (§4.3) → 200.
6. `initGee()` → 503 on failure; compute (§4.2) → 500 with the usual generic message on failure.

### 4.2 Computation

One `evaluate`, built in `lib/mapa/recorteScaleService.ts` (`server-only`):

- **Years.** `layerYears(layer.gee.temporal)` for a temporal layer; a single image for a static
  one.
- **Image.** `buildEeImage(ee, asset, "<year>-01-01")` per year, renamed `y<year>`, stacked with
  `ee.Image.cat`. Going through `buildEeImage` keeps the scale in the same physical units as the
  tiles (CLAUDE.md: every path goes through it).
- **Reduction.** One `reduceRegion` with
  `ee.Reducer.minMax().combine({ reducer2: ee.Reducer.percentile([2, 98]), sharedInputs: true })`
  (the form `zonalStats.ts` uses) over the feature
  geometry, `bestEffort: true`, `tileScale: 4`, `maxPixels: 1e9` — yielding `y<year>_min`,
  `y<year>_max`, `y<year>_p2` and `y<year>_p98` per year.
- **Scale of the reduction.** `analysisScale(asset.scale, regionM2, SCALE_PIXEL_BUDGET / years)`
  (`lib/mapa/layerResult.ts`). The budget is shared across years, because a reduction over 39
  bands costs 39 times one band: `solo_carbono` (39 years at 30 m) over the largest state would
  run past the 65 s `GEE_TIMEOUT_MS` at the panel's per-band budget. `SCALE_PIXEL_BUDGET` starts
  at `5e7` and is tuned in §7.3 against the largest state. A municipality stays at native
  resolution; a large state is measured coarser — the same trade-off the results panel accepts.

The raw per-year numbers become the response through a pure function (§4.4).

### 4.3 Cache

In `recorteScaleService.ts`, module scope like `tileCache.ts`:

- **Response cache.** A `Map` keyed `layerId|recorteId|feicaoIndex`, TTL 24 h (the data is
  static), at most 5000 entries (each is a few numbers per year), oldest dropped first. Failures
  are not cached.
- **In-flight deduplication.** A second request for the same key while the first runs awaits the
  same promise (a double click, two users).

`lib/mapa/tileCache.ts`: `MAX_ENTRIES` goes from 200 to 1000. The cache drops the oldest entry
first, and the recorte tiles would otherwise push out the biome tiles that `npm run prewarm`
warms. An entry is a URL string.

### 4.4 `lib/mapa/recorteScale.ts` (new, pure)

```ts
export interface YearStats { min: number | null; max: number | null; p2: number | null; p98: number | null }

export function recorteScale(
  layer: { gee: { visParams: { min?: number; max?: number } } ; signedFlux?: boolean },
  byYear: Record<string, YearStats>,   // key "static" for a static layer
): ScaleResponse
```

- **`stretch`.** The lowest `p2` and the highest `p98` across years, ignoring years with no
  pixels.
- **Signed flux.** With `signedFlux` and a biome scale with `min < 0 < max`:
  `k = max(p2 / min, p98 / max)` (both ratios positive when the feature spans zero), and
  `stretch = [min·k, max·k]`. This keeps zero at the palette's white.
- **Degenerate.** No year with pixels, or `p2 >= p98` → `stretch: null`. (With `p2 < p98`, `k` is
  always positive, so the signed case needs no check of its own.)
- **`range`.** Per-year `{ min, max }` → `{ byYear }` for a temporal layer, the single entry for a
  static one; years with no pixels are left out.

### 4.5 `lib/mapa/recorteRegistry.ts`

Adds `getFeicaoByIndex(recorteId, index): FeicaoResolvida | null`, beside `getFeicao`.
`featureEntries` already keeps each feature's file position (`FeatureEntry.index`, documented as
the id MapLibre's `generateId` assigns); `IndexedFeicao` declares it so the lookup is typed. A
feature without a label has no entry, so it resolves to null → 400 → biome scale.

### 4.6 What does not change

`/api/gee/tile`: the client requests the recorte tile with the layer's own `visParams` and only
`min`/`max` replaced. The route already validates those (`isValidVisParams`) and already keys its
cache on them. The Territórios story never sends them, so `isStoryTileRequest` is untouched. The
allowlist is untouched: the asset is the same.

## 5. Client

### 5.1 State — `lib/mapa/store.ts`, `types/mapa.ts`

```ts
export interface SelectedRecorte {
  recorteId:   string
  feicaoIndex: number
  name:        string   // the analysis label, for the legend caption
}

export interface SelectedGeometry {
  // …existing fields
  /** Present when the selection is a feature of a Território recorte; a drawn area has none. */
  recorte?: SelectedRecorte
}
```

Because it lives inside the selection, it disappears on every path that already clears the
selection (X, clear, drawing, a new search, a new click) without touching any of them.

Two caches, both keyed `layerId|recorteId|feicaoIndex` (`recorteScaleKey()`):

```ts
recorteScales:   Record<string, RecorteScaleEntry>
recorteTileUrls: Record<string, Record<string, string>>   // key → dateKey ('static' for a static layer) → tileUrl

type RecorteScaleEntry =
  | { status: 'loading' }
  | { status: 'ready'; stretch: { min: number; max: number } | null; range: ScaleResponse['range'] }
  | { status: 'error' }
```

Keyed caches make races harmless: a late answer for a feature the user has left only lands in
the cache and never paints the map, and returning to a feature already seen is instant. Neither
cache is persisted (`persistState.ts`).

### 5.2 `MapView.tsx` — installing the recorte

`runFeatureAnalysis` attaches `recorte` to the `SelectedGeometry` it installs when all hold:

- the vector is a Território recorte (`theme === TERRITORY_THEME_ID`);
- it is a plain GeoJSON source (no `source`), so `featureId` is the file index;
- the geometry is a Polygon or MultiPolygon.

`name` is the label the function already passes to `setAnalysisLabel`. The `belowRaster` early
return already prevents installing a selection, so nothing changes there. The search path goes
through `runFeatureAnalysis` too.

### 5.3 `lib/mapa/recorteScaleRunner.ts` (new) — the only place that fetches

Modeled on `analysisRunner.ts`.

**`pendingRecorteWork(input)`** (pure) takes the visible rasters, `temporalDate`, the selection
and both caches. It returns, per visible continuous GEE raster whose `clipToLayerId` differs from
`recorte.recorteId`, what is still missing:

- the scale, when its key has no entry;
- otherwise, when the scale is `ready` with a non-null `stretch`, the recorte tile of the current
  date (`dateKey`), when absent.

**`runRecorteScales(selection)`** performs that work:

1. `POST /api/gee/scale` → `recorteScales[key]`: `loading`, then `ready` or `error`.
2. `POST /api/gee/tile` with `{ asset, clipId, temporalDate, visParams: { ...layer.gee.visParams,
   min, max } }` → `recorteTileUrls[key][dateKey]`.

A module-scope `Set` of in-flight keys prevents duplicate requests. A tile request that fails
leaves the slot empty, so the biome tile stays.

A `MapView` effect runs it on `[layers, temporalDate, selectedGeometry]`. When a scale lands, the
runner calls itself once more to fetch the tile of the year then on screen. A layer switched on, or
a year stepped, with the feature still selected fetches only what is missing.
`setTemporalDate` keeps fetching the biome tile of the new year as today: it is the fallback while
the recorte tile loads, and `pendingAnalyses` gates the results panel on it.

### 5.4 `lib/mapa/activeRaster.ts` (new, pure) — one rule for what is on screen

```ts
export function activeRaster(state, layerId): {
  tileUrl: string | null
  scale:   { stretch: { min: number; max: number }; range: ScaleResponse['range']; recorteName: string } | null
}
```

**Recorte path.** When the selection has a `recorte` and the layer's scale entry is `ready` with a
`stretch`, it returns that scale with `recorteTileUrls[key][dateKey]`, or, when that year's tile
has not arrived, the recorte tile of the nearest year already fetched (decision 7).

**Biome path.** Otherwise (no recorte tile fetched yet for this selection) it returns the biome tile (`temporalTileUrls[id][date]` or
`fetchedTileUrls[id]`, as today) and `scale: null`.

**Callers.** Every place that decides what is on screen goes through it:

- `MapView`'s add-source path (the lookup near `tileUrl = store.fetchedTileUrls[l.id]`);
- the temporal swap effect, generalized into a "sync active tiles" effect that runs on
  `[temporalDate, temporalTileUrls, fetchedTileUrls, recorteTileUrls, recorteScales,
  selectedGeometry]`. For each visible GEE raster it calls `setTiles` only when the active URL
  differs from the source's current one, so a re-run does not refetch tiles;
- the legend. It therefore claims `"Escala ajustada a…"` only while the map really shows that
  scale.

### 5.5 Legend — `components/mapa/overlays/FloatingLegend.tsx`

**`ContinuousLegend`**, with `activeRaster(...).scale` non-null:

- the bar and palette are unchanged;
- the zero tick (`zeroPosition`) and the flux ends are computed from `scale.stretch` instead of
  `visParams`;
- the ends come from `dataRangeFor(layer.id, temporalDate, { layers: { [layer.id]: scale.range } })`,
  falling back to `scale.stretch` when the year has no range;
- the caption `"Escala ajustada a {recorteName}"` sits under the layer name, in the caption style
  of the legend's ends.

**`RasterLegendItem`, categorical.** When the selection has a `recorte`, the classes go through
`presentClasses(layer.classes, results[layer.id], currentDate)` (new, pure, `lib/mapa/presentClasses.ts`).

- It keeps the classes whose `value` has area > 0 in a `ready` result of kind `categorical`
  whose `date` matches the year on screen.
- In every other case it returns the full list.

**Known limit:** on a large state the panel measures at a coarser scale (`analysisScale`), so a
class covering very little area may be missing from the filtered legend.

## 6. Cost and failure

**Cost of a selection.** With N visible continuous rasters it adds N scale requests and N tile
requests, each a single GEE call. Subthemes are exclusive, so N is usually 1 or 2.

**Cost of a year step.** With a feature selected it adds one tile request per temporal layer;
the scale is already cached.

**Repeated selections.** A second selection of the same feature, by anyone, hits the server
caches.

**Expected latency.** A few seconds for a municipality and longer for a large state, bounded by
`GEE_TIMEOUT_MS`. During that time the biome tile is on screen and the legend describes it.

**Rate limit.** The new route shares the per-IP limiter with the other GEE routes. The extra
requests per selection are of the same order as the results panel's.

**Every failure ends in the biome scale:**

| Failure | Response | Client state |
|---|---|---|
| Scale request fails | 500 / 503 / 429 | `recorteScales[key] = { status: 'error' }` |
| Degenerate scale | `stretch: null` | biome scale |
| Recorte tile fails | — | empty slot, biome tile stays |

None of them shows an error. A failed scale is not retried automatically, which avoids a request
loop inside a reactive effect (the same reasoning as the results panel's decision 6, 2026-09-22
spec).

## 7. Testing

### 7.1 Unit (vitest, `tests/lib/`)

- **`recorteScale.test.ts`:**
  - stretch from the lowest p2 and the highest p98 across years;
  - a year with no pixels is ignored;
  - all years empty → `null`;
  - `p2 == p98` → `null`;
  - signed flux keeps the zero fraction of the biome scale, and `k <= 0` → `null`;
  - `range` as `byYear` for a temporal layer, single entry for a static one.
- **`activeRaster.test.ts`:**
  - the biome tile while the scale or the recorte tile is loading;
  - the recorte tile and scale when both are ready;
  - a year stepped whose recorte tile is not there yet → the nearest year's recorte tile, with the
    recorte scale (decision 7);
  - a selection without `recorte` (a drawn area) → biome;
  - `stretch: null` and `error` → biome.
- **`presentClasses.test.ts`:**
  - filters by area > 0;
  - full list while loading, on error, on a result for another year, and without a recorte.
- **`recorteScaleRunner.test.ts`** (`pendingRecorteWork`):
  - asks only for what is missing;
  - skips the layer's own clip recorte, categorical layers and `dem`;
  - after the scale is ready asks for the tile of the current date;
  - a key for another feature never satisfies the current one.
- **`recorteRegistry`:** `getFeicaoByIndex` resolves by file position, and returns null for an
  unlabelled feature or an index out of range.

### 7.2 Route (`tests/app/scaleRoute.test.ts`)

Follows `tileRoute.test.ts` and `statsRoute.test.ts`. It covers:

- 401 without a session;
- 400 for a categorical layer, a `dem` layer, an unknown layer, the `bioma` recorte, an unknown
  recorte, and a bad or out-of-range index;
- cache hit without a second GEE call;
- concurrent identical requests share one computation;
- a GEE failure is not cached.

### 7.3 Rendered check

Run the dev server in the worktree, logged in, and check:

| Selection | Layers |
|---|---|
| a small município | `estoque_carbono` (static, 100 m), `gpp_modis` (temporal), `gfw_netflux` (signed) |
| the largest state | `solo_carbono` (temporal, 30 m, the worst case) — tune `SCALE_PIXEL_BUDGET` until it answers well under `GEE_TIMEOUT_MS` |
| a terra indígena | `lulc_mapbiomas` (filtered legend) |

For each one check that:

- the caption appears with the scale;
- the colors change;
- stepping the year keeps the scale;
- deselecting returns to the biome scale;
- selecting the bioma itself changes nothing.

`npm test`, `npm run lint`, `npm run build`, `npm run contrast` before the PR.

## 8. Out of scope

- **The territorial report** (`/relatorio`, `ReportMapPreview.tsx`) keeps the biome scale.
- **The Territórios story** (`/territorios`) keeps its fixed tiles.
- **Drawn areas** do not adapt the scale (decision 1).
- **Turning a recorte layer on** without selecting a feature changes nothing (decision 1).
- **The dead Jenks path.** No layer declares `gee.classify` any more, and
  `scripts/compute-breaks.mjs` still points at `config/webgis/`, which no longer exists. Noted
  here; not touched.

## 9. Files

New:

- `app/api/gee/scale/route.ts`
- `lib/mapa/recorteScale.ts`
- `lib/mapa/recorteScaleCompute.ts` — the GEE reduction of §4.2, split from the service so each
  can be tested on its own
- `lib/mapa/recorteScaleService.ts`
- `lib/mapa/recorteScaleRunner.ts`
- `lib/mapa/activeRaster.ts`
- `lib/mapa/presentClasses.ts`
- `tests/app/scaleRoute.test.ts`
- `tests/lib/recorteScale.test.ts`, `recorteScaleCompute.test.ts`, `recorteScaleService.test.ts`
  (cache and in-flight dedupe), `activeRaster.test.ts`, `presentClasses.test.ts`,
  `recorteScaleRunner.test.ts`

Changed:

- `lib/mapa/recorteRegistry.ts` — `getFeicaoByIndex`, `index` on `IndexedFeicao`
- `lib/mapa/tileCache.ts` — `MAX_ENTRIES` 1000
- `lib/mapa/store.ts`, `types/mapa.ts` — `SelectedRecorte`, `recorteScales`, `recorteTileUrls`
- `components/mapa/MapView.tsx` — `recorte` on the selection, `activeRaster` in the tile paths,
  runner effect
- `components/mapa/overlays/FloatingLegend.tsx` — recorte scale, caption, filtered classes
- `CLAUDE.md` — `/api/gee/scale` in the GEE routes list
