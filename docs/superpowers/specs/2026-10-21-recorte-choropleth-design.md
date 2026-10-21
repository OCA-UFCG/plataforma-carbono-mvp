# Layer colors and legend follow the finest active recorte — design

**Date:** 2026-10-21
**Status:** approved in conversation, section by section, before any code was written.
**Supersedes:** `2026-10-20-recorte-adaptive-scale-design.md`. That design re-scaled each raster to the
*selected feature*. It was implemented, then rejected on review by the user:

> "a escala não deve ser ajustada para cada municipio, mas ao ativar a feição de municipio a escala
> deve ser de municipio para todos e não do bioma. a prioridade é sempre da feição menor na hora de
> exibir a escala e as cores respectivamente"

## 1. Goal

> "Cores da camada e a legenda devem se adaptar ao recorte que tá sendo utilizado (atualmente
> sempre usa o de bioma)"

Today every continuous raster in `/mapa` is drawn in pixels on the biome's calibrated scale, and its
legend prints the biome's extremes (`config/mapa/dataRanges.json`), whatever recorte is on.

After this work, turning on the Municípios layer turns every continuous layer into a map *by
municipality*: one color per municipality, its mean value, on a legend that runs from the lowest to
the highest municipal value. Estados does the same by state. The finest of the two that is on wins.

## 2. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | What sets the scale? | **The finest visible recorte layer that covers the biome:** Municípios > Estados > Bioma. Selecting a feature changes nothing. |
| 2 | What does "escala de município" show? | **A map by feature (choropleth):** each feature filled with the color of its mean value; the layer's pixels hidden meanwhile; the legend runs from the lowest to the highest feature value. |
| 3 | Territórios (TI, quilombo, assentamento)? | **Outline only.** They cover parts of the biome, so they never set the scale. |
| 4 | Categorical layers (MapBiomas)? | **Stay in pixels**, full legend. The map by feature applies to continuous layers only. |
| 5 | Where do the feature values come from? | **On demand on the server**, one `reduceRegions` with every year at once, cached; the choropleth is drawn by MapLibre on the GeoJSON the map already loaded. Offline precomputation was rejected: a heavy batch job to rerun on every data or geometry update. |
| 6 | Branch | **Continue on PR #122**, replacing the per-feature code in new commits. |

## 3. Behavior

**Which recorte.** Among the visible vector layers declaring `choropleth` in `layers.json` (Estados
and Municípios), the one with the highest `pickPriority` (municipios 20 > estados 10). None visible →
today's pixels and biome scale.

**With such a recorte on**, every visible continuous GEE raster except the visualization ones
(`analysis: false`, e.g. `hillshade_fabdem`):

- **Map:** each feature of the recorte is filled with the color of its mean value for the year on
  screen, in the layer's own unit; the layer's pixels are hidden while it shows. The layer's opacity
  slider applies to the fill. A feature without a value (no pixel center inside it, or no data) has
  no fill.
- **Legend:** the bar keeps the layer's palette; its ends print the lowest and the highest value
  over every feature and every year, so a color means the same value in every year. Under the
  layer name, the recorte's caption: `"Escala municipal"` / `"Escala estadual"`. A signed flux keeps
  zero at its palette's white (§4.3), and the legend's zero tick follows.
- **Year step:** instant — every year arrived with the first answer.
- **While loading** (the first request of a layer and recorte, a few seconds): the pixels on the
  biome scale stay, and the legend says `"Calculando escala municipal…"` (the caption, lowercased,
  after "Calculando").
- **Failure:** the pixels on the biome scale stay, no error is shown. Turning the recorte on again
  retries.

**Unchanged:** categorical layers, `source: "dem"`, `analysis: false` layers; clicks, selection,
the spotlight and the results panel (still measured in pixels over the selected feature); the
territorial report; the Territórios story. Turning Municípios off falls back to Estados if it is on,
otherwise to the biome pixels.

## 4. Server

### 4.1 `POST /api/gee/choropleth` (new)

`app/api/gee/choropleth/route.ts`, Node runtime, `force-dynamic`.

```ts
interface ReqBody { layerId: string; recorteId: string }

interface ChoroplethResponse {
  keys:   string[]               // years "YYYY" of a temporal layer, or ["static"]
  values: (number | null)[][]    // values[k][featureIndex], 4 significant digits
  range:  { min: number; max: number } | null   // null → the client keeps the pixels
}
```

Order of checks, as in the other GEE routes: `getAuthenticatedRequest` → 401; rate limit → 429;
`bodyTooLarge` → 413; JSON → 400. Then:

- **Layer:** a `type: "raster"`, `colorType: "continuous"`, `source: "gee"` layer with `gee.asset`
  and `analysis !== false`. The asset comes from `layers.json`, never from the body. Otherwise 400.
- **Recorte:** a vector layer declaring `choropleth`. Otherwise 400.
- Cache hit → 200; `initGee` failure → 503; computation failure → 500, generic messages.

### 4.2 Computation — `lib/mapa/choroplethCompute.ts`

One `evaluate`:

1. **Features.** The recorte's GeoJSON (`public/<url>`) read on the server through
   `featureEntries` (`lib/territorios/featureIds.ts`), each feature tagged with its file position
   `i` — the id MapLibre's `generateId` gives it in the browser. Municípios is 1.1 MB, Estados 318 KB:
   both fit an Earth Engine request.
2. **Image.** One band per year (`layerYears`), each from `buildEeImage` through the empty-year guard
   already on the branch (a collection's year without images becomes a masked band); a static layer
   is a single band.
3. **Reduction.** `image.reduceRegions({ collection, reducer: ee.Reducer.mean(), scale, tileScale: 4 })`
   with `scale = max(asset.scale, 1000)` m. A single-band image names its output `mean`, so the
   reducer gets `setOutputs([band])` then.
4. **Compact read.** `reduceColumns(ee.Reducer.toList(bands + 1), ['i', ...bands])` — the values
   come back without the geometries.

Expected cost: municípios × 40 bands at 1 km ≈ 3.4e7 pixel-bands; to be measured in the plan's
first task (CHIRPS, 40 years; `solo_carbono`, 39 years at 30 m) against `GEE_TIMEOUT_MS`, with the
scale coarsened for long series if needed.

### 4.3 Response math — `lib/mapa/choropleth.ts` (pure, shared)

- `values[k][i]` rounded to 4 significant digits; `null` where the feature had no value.
- `range`: lowest and highest finite value over every key and feature, through the signed-flux rule
  already on the branch (`stretchOf`: for `signedFlux` with a biome scale `min < 0 < max`, both ends
  scaled by `k = max(low / min, high / max)`, keeping zero at the palette's white). No finite value,
  or `low >= high` → `null`.

### 4.4 Cache — `lib/mapa/choroplethService.ts`

In memory, keyed `layerId|recorteId`, TTL 24 h, in-flight dedupe, failures not cached. At most
~20 layers × 2 recortes entries of a few hundred KB.

## 5. Client

### 5.1 Config — `config/mapa/layers.json`

`estados` and `municipios` gain `"choropleth": { "caption": "Escala estadual" }` and
`{ "caption": "Escala municipal" }`; `types/mapa.ts` declares it on `VectorLayerConfig`. The server's
allowlist of recortes and the client's priority read the same field.

### 5.2 One rule — `lib/mapa/choropleth.ts`

```ts
export function choroplethRecorte(layers: LayerConfig[], layer: LayerConfig): VectorLayerConfig | null
```

The visible `choropleth` vector with the highest `pickPriority`, when `layer` is a visible continuous
GEE raster with `analysis !== false`; null otherwise. Also `choroplethKey(layerId, recorteId)` and
`choroplethColor(palette, range, stateKey)` — the MapLibre `interpolate` expression over the
palette's stops from `range.min` to `range.max`, transparent where the state is null.

### 5.3 State and runner

- Store: `choropleths: Record<string, ChoroplethEntry>` keyed by `choroplethKey`;
  `{ status: 'loading' } | { status: 'ready'; keys; values; range } | { status: 'error' }`.
  Turning a `choropleth` recorte on (toggleLayer / showLayer) drops its `error` entries, which is the
  retry.
- `lib/mapa/choroplethRunner.ts`: `pendingChoropleths(input)` (pure) lists the visible eligible
  rasters whose `(layer, active recorte)` has no entry; `runChoropleths()` fetches them. A MapView
  effect runs it on `[layers]`.

### 5.4 Map — `components/mapa/MapView.tsx`

For each visible eligible raster whose entry is `ready` with a `range`:

- a `fill` layer `${rasterId}-choropleth` on the recorte's source (already added: the recorte is
  visible), paint `fill-color: choroplethColor(...)` on the feature-state key `v_${rasterId}`,
  `fill-opacity` the raster's opacity;
- placed right above `${rasterId}-raster` in the z-order sync, so the layer order is kept;
- `${rasterId}-raster` at opacity 0 meanwhile;
- feature states set from `values[keyIndex]` for the year on screen (`STATIC_KEY` for a static
  layer) whenever the entry, the year or the recorte changes — no request;
- removed when the recorte changes or goes away, and the raster's opacity restored.

### 5.5 Legend — `FloatingLegend.tsx`

With `choroplethRecorte` non-null: `ready` → bar with the palette, ends `range.min`/`range.max`,
the recorte's caption, zero tick from `range`; `loading` (or no entry yet) → the biome legend as
today plus `"Calculando escala municipal…"`; `error` or `range: null` → the biome legend as today.

## 6. What leaves the branch

The per-feature design: `/api/gee/scale` and `recorteScaleService.ts`, `recorteScaleRunner.ts`, the
recorte tiles and scale caches in the store, `activeRaster.ts`'s recorte path, `scaleAdjustingTo`,
`presentClasses.ts`, `getFeicaoByIndex`, the `recorte` field on `SelectedGeometry`,
`retryRecorteFailures` in MapView, the tile-cache cap raise (back to 200), and their tests.
Kept and reused: `yearWindow` in `geeImage.ts`, the empty-year guard (`yearBand`), the signed-flux
stretch rule, `bandOf`. `activeRaster.ts` goes too: with no recorte tiles, MapView's tile lookups
return to what `main` has.

## 7. Testing

- **Unit (vitest):** `choroplethCompute` with a fake `ee` (reduceRegions arguments, single-band
  `setOutputs`, `reduceColumns` parsing, empty-year guard); `choropleth.ts` (`choroplethRecorte`
  priority — municípios over estados, territories / categorical / `dem` / `analysis: false` ignored;
  rounding; range; signed flux; color expression); service (cache, dedupe, failure not cached);
  `pendingChoropleths`.
- **Route:** `tests/app/choroplethRoute.test.ts` — 401, 400s (categorical, `dem`, `analysis: false`,
  unknown layer, recorte without `choropleth`), cache hit, 503, 500.
- **Live GEE (plan, first task):** timing and output naming for CHIRPS (40 years), `solo_carbono`
  (39 years at 30 m), `estoque_carbono` (static) over Municípios.
- **Rendered:** Estados on → by state; Municípios on → by municipality and over Estados; year step
  instant; Municípios off → back to Estados / pixels; a selection changes no scale; MapBiomas in
  pixels; caption while loading.
- `npm test`, `npm run lint`, `npm run build`, `npm run contrast`.

## 8. Out of scope

- Prewarming the choropleth cache (`npm run prewarm`) — a follow-up once the timing is known.
- PR #120 (whole municipalities): the values follow whatever geometry the GeoJSON holds; a border
  municipality's mean then includes pixels outside the Caatinga, as the results panel already does.
- The territorial report and the Territórios story.
