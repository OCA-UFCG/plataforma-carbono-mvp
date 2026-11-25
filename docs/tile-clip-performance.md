# Why stepping a year on the map was slow

Fixed in `fix/tile-clip-to-collection`. This note records where the time went, how the cause was isolated, and the timings before and after.

## The report

> Demora no Panorama de Fogos: selecionar por ano demora muito tempo para carregar para cada ano que temos.

The layer is **Frequência de Fogo acumulada** (`fogo_frequencia`), the only fire layer with a year slider: 39 years, 1985 to 2023. The Territórios story has a fire step, but its map switches year only for land use. So the report is about the slider in `/mapa`.

## Where a year step spends its time

```mermaid
sequenceDiagram
  participant U as Year slider
  participant S as Store (setTemporalDate)
  participant R as /api/gee/tile
  participant EE as Earth Engine
  participant M as MapLibre
  U->>S: commit the year (arrow: at once; drag: after 400 ms)
  S->>R: POST asset + temporalDate + clipId "bioma"
  R->>EE: getMap(band of the year, clipped to the biome)
  Note over R,EE: wait 1: one round trip, a tile URL for that year
  EE-->>R: tile URL
  R-->>S: { tileUrl }
  S->>M: setTiles(tileUrl)
  M->>EE: every tile in view (16 at the opening zoom)
  Note over M,EE: wait 2: Earth Engine renders each tile on request
  EE-->>M: PNG tiles
```

- The slider (`components/mapa/overlays/TemporalSlider.tsx`) commits a year at once from the arrows, and 400 ms after the handle stops when dragged.
- `setTemporalDate` (`lib/mapa/store.ts`) has no tile URL for a year it has not seen, so it asks `/api/gee/tile` for one. Each year is a separate band (`fire_frequency_1985_{ano}`), so each is a separate Earth Engine map.
- The route builds the band with `buildEeImage`, clips it to the biome outline and calls `getMap` (**wait 1**).
- `MapView` swaps the source's tiles (`components/mapa/MapView.tsx`, "Swap temporal tile URLs"), and the browser fetches every tile in view straight from Earth Engine, which renders each one when asked (**wait 2**).

The two waits run one after the other. Going back to a year already seen skips wait 1, because the store keeps the URL and the server caches it for 90 min (`lib/mapa/tileCache.ts`). Earth Engine sends its tiles with `Cache-Control: private, max-age=3600`. For an hour, the browser can therefore answer tiles it already fetched from its own cache. A tile it never fetched, after a pan or a zoom, waits on Earth Engine again.

## The cause: how the route clipped to the biome

Every raster clipped to the biome (`clipToLayerId: "bioma"`) went through this, in `app/api/gee/tile/route.ts`:

```ts
clipRegion = ee.FeatureCollection(clipAssetId).geometry()
image = image.clip(clipRegion)
```

`clipAssetId` is the biome outline asset (`projects/ee-arturlourenco/assets/limite_caatinga`), one feature with 108,092 vertices. `FeatureCollection.geometry()` merges the collection into one computed geometry, and `clip` cuts the image against it.

Isolating it: same layer (`fogo_frequencia`), same year, four ways to build the image. The rest of the request stayed the same.

| Image | getMap | 6 tiles, z6 | 6 tiles, z8 |
|---|---|---|---|
| no clip | 0.7 s | 1.0–1.1 s | 0.8–0.9 s |
| **`clip(fc.geometry())` (before)** | **3.8–7.9 s** | **8.3–9.0 s** | **8.8–12.4 s** |
| `clipToCollection(fc)` (after) | 0.7–0.8 s | 0.8–1.0 s | 1.4 s |
| `updateMask(fc painted to an image)` | 0.7 s | 0.7–0.8 s | 1.2 s |

(Two runs, years 2015 and 2003.) Almost all of both waits was the clip. Fire and land use had the same timings, because they are built the same way (one multi-band image, the year picks the band). The problem was never specific to fire. Fire is simply the layer with the most years to step through.

Earth Engine's own guidance points the same way. [Coding best practices](https://developers.google.com/earth-engine/guides/best_practices) recommends `clipToCollection()` when clipping with a complex collection and warns against `featureCollection.geometry()` on large or complex collections. The [`ee.Image.clip` reference](https://developers.google.com/earth-engine/apidocs/ee-image-clip) says to use `clipToCollection` to clip to a FeatureCollection. We timed the two calls but did not look at what Earth Engine does inside them.

### Same pixels

`clipToCollection` draws exactly what `clip(fc.geometry())` drew. For both `fogo_frequencia` and `lulc_mapbiomas`, these tiles came out byte-identical:

- the 24 z7 tiles that cover the whole biome, and so its whole outline;
- 9 tiles at z9 and 4 at z11;
- 16 z12 tiles centred on vertices of the outline, where an edge difference would show.

## The fix

```ts
const fc = ee.FeatureCollection(clipAssetId)
image = image.clipToCollection(fc)
// Only used by the live-Jenks fallback (offline breaks skip sampling).
sampleRegion = fc.geometry()
```

The merged geometry is still built for the live-Jenks sampling region, but only as an unevaluated expression. No layer reaches that path today, because no layer declares `classify`. `tests/app/tileRoute.test.ts` fails if the asset clip goes back to `image.clip`.

## Timings before and after

### Fire, nine years

| | Before: median (max) | After: median (max) | Faster |
|---|---|---|---|
| Wait 1: the route (`getMap`) | 5.0 s (8.3 s) | 0.7 s (0.9 s) | 7.3× |
| Wait 2: tiles of the opening view | 10.5 s (13.6 s) | 1.0 s (1.3 s) | 11× |
| **A year step (wait 1 + wait 2)** | **14.7 s (20.4 s)** | **1.7 s (2.0 s)** | **8.7×** |
| The same tiles again, without the browser's cache | 9.0 s (9.9 s) | 1.1 s (1.6 s) | 7.8× |
| Tiles of a zoomed-in view | 8.9 s (12.9 s) | 1.0 s (1.3 s) | 8.8× |

"The same tiles again" is Earth Engine rendering tiles it has just served. Within the hour, a browser would usually answer those from its own cache. The row shows what a tile costs once that cache has expired.

<details>
<summary>Each year, in seconds: route + opening view = step; the same tiles again; zoomed view</summary>

| Year | Before | After |
|---|---|---|
| 1985 | 7.6 + 11.1 = 18.7; 9.7; 7.8 | 0.7 + 1.2 = 2.0; 1.1; 1.1 |
| 1990 | 3.6 + 10.5 = 14.1; 7.0; 8.9 | 0.6 + 0.5 = 1.2; 0.5; 1.0 |
| 1995 | 7.4 + 10.4 = 17.8; 6.3; 8.2 | 0.6 + 1.3 = 1.9; 1.6; 1.1 |
| 2000 | 8.3 + 12.0 = 20.4; 7.8; 12.9 | 0.7 + 0.6 = 1.3; 1.1; 0.5 |
| 2005 | 3.8 + 8.6 = 12.4; 9.2; 8.3 | 0.6 + 1.3 = 2.0; 1.2; 0.5 |
| 2010 | 3.5 + 10.8 = 14.3; 9.1; 12.8 | 0.7 + 0.8 = 1.5; 1.1; 0.7 |
| 2015 | 5.1 + 9.5 = 14.7; 9.0; 9.3 | 0.9 + 0.8 = 1.7; 1.3; 0.5 |
| 2020 | 5.0 + 13.6 = 18.7; 9.9; 8.9 | 0.7 + 1.0 = 1.7; 1.1; 1.2 |
| 2023 | 4.1 + 8.7 = 12.9; 8.4; 12.0 | 0.6 + 1.3 = 1.9; 1.5; 1.3 |

</details>

### Other layers

| Layer | Samples | Before: year step, median | After |
|---|---|---|---|
| Uso e Cobertura da Terra (`lulc_mapbiomas`) | 1990, 2005, 2020 | 13.9 s | 2.0 s |
| Precipitação Anual (`chirps3_pr`, the panel's rain layer, one image per year) | 1990, 2005, 2015, 2024 | 22.1 s | 1.9 s |
| NDVI (`ndvi_modis`, mean of the year's 16-day images) | 2005, 2020 | 7.9 s | 2.4 s |
| Precipitação Anual (`chirps_precip`, hidden from the panel, sum of the year's daily images) | 2000, 2005, 2010, 2020 | 8.6 s | 7.9 s |
| Estoque Total (`estoque_carbono`, no slider: first draw) | 1 | 15.6 s | 5.1 s |

`chirps_precip` is the one layer with no clear gain. Its route call got faster, from 1.7–2.5 s to 0.6–0.8 s, but its tiles did not. Before and after overlap: 7.1–12.4 s before, 6.0–10.1 s after. Its tiles sum the year's daily images, and that sum, not the clip, sets how long they take. The layer is hidden from the panel (`hidden: true`).

Thirteen tile requests got a transient error (429 or 5xx) and were retried, all in the before version. None were retried in the after version, and no tile failed in either. The Territórios story map had also run into 429s from slow clipped tiles (`lib/territorios/mapStyle.ts`).

### Method

- **What ran:** the real route code of both versions, `origin/main` at `673fe23` and this branch, in one Node process (vitest) against live Earth Engine. Only the session check, the rate limiter and the server tile cache were stubbed, so every request reached Earth Engine the way a first visit to a year does.
- **Fairness:** each sample ran both versions back to back, alternating which went first, so changes in network or Earth Engine load affected both versions the same way.
- **Per sample:**
  1. Time the route call.
  2. Time the tiles of a 1000 × 800 px map at the opening zoom: zoom 5.2 on [-40, -9], from `config/mapa/layers.json`. MapLibre draws 256 px raster tiles one level above the rounded zoom, so that view is 16 z6 tiles.
  3. Time the same tiles again. Node keeps no HTTP cache, so Earth Engine served them a second time.
  4. Time a zoomed-in view: zoom 8.2 near Petrolina, 15 z9 tiles.

  Tiles were fetched in parallel. A 429 or 5xx was retried after 0.5 s and 1.5 s, as `lib/mapa/tileRetry.ts` does.
- **Runs:** three runs: fire, land use and Estoque Total; then NDVI and `chirps_precip`; then the rain layers. The first attempt at the rain run died on a network error (`getMap` answered HTTP -1) before its first sample, and was run again.
- **Limits:** the timings were taken from a developer machine on 2026-11-24 and 25, not from beta or prod. In prod the route runs on the server and the tiles come from the user's browser. Almost all of both waits is Earth Engine's own work, so the timings should hold there, but that was not measured. Each sample ran once, and Earth Engine's load varies: before the fix, fire year steps ranged from 12.4 s to 20.4 s.

## What the fix covers

- **Wait 1, for all 33 layers clipped to the biome.** Each one's first draw, and each year step of the 16 with a slider, pays for a route call. In every sample that call went from 1.7–8.3 s down to 0.6–0.9 s.
- **Wait 2, depending on what else the layer computes.** For a layer that reads one stored image per year, the clip was nearly all of the tiles' time: the opening view of fire, land use and the panel's rain layer went from 8–16 s to 0.5–1.4 s. Estoque Total, with one sample, went from 10.8 s to 4.4 s. A layer that reduces many images per year keeps that reduction's cost. NDVI, which averages the year's 23 MOD13Q1 composites, went from about 4 s to 2 s. `chirps_precip`, which sums daily images, showed no clear change.

## Not covered

- **The results card.** With a recorte selected, a year step also recomputes the card for the new year (`runVisibleRasterAnalyses`, `components/mapa/MapView.tsx`). That reduces over the selected recorte, not over the biome clip, and was not timed.
- **The Territórios story map** draws its rasters without a clip because the full-detail clip was slow: "4.4 s against 1.4 s without it" (`lib/territorios/mapStyle.ts`). With `clipToCollection` it could clip again. That would be a separate change, since it alters what the story shows.
- **`lib/mapa/clipRegistry.ts`** describes the asset clip as "fast (~2s)", which was not true of `clip(fc.geometry())`. The comment is left as is. It now undersells the speed rather than overselling it.
- **`scripts/compute-breaks.mjs`** clips to a simplified geometry to sample Jenks breaks offline. That cost is paid by a script, not by users.
