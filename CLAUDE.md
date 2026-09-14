# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Write code, comments, and documentation in English. Every source comment is already in English; keep it that way. The Portuguese prose docs (`DOCUMENTACAO.md`, `README.md`, `REVISAO_TECNICA.md`) stay as-is unless asked.

User-facing UI strings stay in Portuguese — the product is for a Brazilian audience. An English comment still quotes those strings verbatim when it cites a UI label or a data value (`"Área desenhada"`, `'chuva'`), and keeps the domain terms the codebase uses untranslated (`recorte`, `mata branca`).

## Commands

```bash
npm run dev              # dev server at http://localhost:3000
npm run build            # production build (standalone output)
npm run lint             # eslint (flat config, eslint-config-next)
npm test                 # vitest run (tests/**/*.test.ts, node environment)
npx vitest run tests/lib/stockReport.test.ts     # a single test file
npx vitest run -t "case name"                    # a single case by name
python tests/scripts/test_build_sif.py           # unit tests of scripts/build-sif.py (stdlib unittest)
npm run contrast         # WCAG contrast check of the 12 monthly accents; runs in CI
```

CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run build` and `npm run contrast` — it does **not** run `npm test` or `npm run lint`, so run those locally.

Data/GEE scripts (require the service account credential): `npm run breaks` (Jenks, writes into `config/mapa/layers.json`), `npm run clip`, `npm run trim`, `npm run prewarm`, `node scripts/verify-assets.mjs`, `node scripts/list-assets.mjs`, `python scripts/build-recortes.py`.

`scripts/build-sif.py` needs no service account, but does need an Earthdata Login in `~/.netrc` plus `earthaccess`, `netCDF4` and `rasterio` (a venv, since Debian/Ubuntu block `pip install` into the system Python). It writes into `data/sif-esdr/` (gitignored).

## Architecture

A single Next.js 16 app (App Router, React 19, strict TS) holding two things in one repo: the institutional marketing pages (`/`) and the Caatinga carbon maps-and-analysis module (`/mapa`). Import alias: `@/*` → repo root.

### Three sibling root layouts, not one shared layout

`app/(marketing)/layout.tsx`, `app/(mapa)/layout.tsx` and `app/(auth)/layout.tsx` each own their `<html>`, `<body>` and global CSS. **There is no `app/layout.tsx`, and adding one would break the isolation.** `mapa.css` kills scrolling (`html, body { overflow: hidden }`) and swaps the typeface; applied to the landing page it would kill its scroll. Practical consequence: **every link crossing a route-group boundary uses `<a href>`, never `next/link`** — the crossing is a full page load.

### Authentication

Everything requires a Firebase session; only `/login` is public. The flow: the client authenticates against Firebase (`lib/firebase.ts`) → `POST /api/session` exchanges the idToken for a 24 h HttpOnly `session` cookie (`lib/auth.ts`, `lib/firebase-admin.ts`) → server-rendered pages and every `/api/gee/*` route verify that cookie before doing any work. When adding an API route, call `getAuthenticatedRequest(req)` and return `unauthorizedResponse()` first. `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` are server-only; never prefix them with `NEXT_PUBLIC_`.

### `config/mapa/layers.json` is the source of truth

The ~21 layers are declared in JSON, not in code. That file governs far more than the panel listing:

- **Security allowlist**: the `/api/gee/*` routes accept an asset config from the client, but `lib/mapa/geeAllowlist.ts` only admits `id::band` pairs present in `layers.json`. Without it the service account would become a proxy to any Earth Engine asset. Layers with `asset.bandPattern` get their year range expanded into the allowlist at load time — forgetting that yields a 403 when stepping through time.
- **Behavior branches by block**: `gee.temporal` makes a layer year-navigable; `gee.classify` applies Jenks classification; `gee.stocks` makes a click open the carbon stock report (`lib/mapa/stockReport.ts`) instead of the visible band's statistics. The routes branch on the presence of the block.
- **Physical scaling**: `multiplier`/`offset`/`validMin`/`validMax` are applied inside `lib/mapa/geeImage.ts` (`buildEeImage`). **Tile, stats, point value and time series must all go through `buildEeImage`** — any path that builds its own `ee.Image` returns raw units and diverges from the map.
- **Order matters**: vectors sit above rasters, which is what lets a click on a feature compute statistics for the raster beneath it. Among vectors, though, order does *not* decide which one a click belongs to: overlapping recortes are resolved by `pickPriority` (higher = finer = wins, `lib/mapa/pickVector.ts`), because `bioma` is `layers[0]` and contains every other recorte, so "topmost wins" would make it swallow every click. Order only breaks ties.
- **Panel navigation**: layers declare only `theme`/`subtheme`; the accordion structure and order live in `config/mapa/groups.ts`, where `exclusive: true` makes a choice replace the previous one in that subtheme.

Sensitive configuration never travels from the client: the server resolves `clipId` → geometry in `lib/mapa/clipRegistry.ts` and `layerId` → `stocks` block in `lib/mapa/stocksRegistry.ts`, rejecting with 400 when the id does not match the asset sent.

### GEE routes

`app/api/gee/{tile,stats,point,timeseries}/route.ts` — all `POST`, Node runtime, `force-dynamic`. Each one: validates input (`lib/mapa/geeValidation.ts`), checks the allowlist, authenticates (`lib/mapa/geeAuth.ts`, with `setDeadline`), builds the image via `buildEeImage`, evaluates with a timeout (`lib/mapa/geeEvaluate.ts`). There is an in-memory per-IP rate limiter (`lib/mapa/rateLimit.ts`) and a server-side `tileUrl` cache with a 90 min TTL (`lib/mapa/tileCache.ts`; the `unmaskValue` flag is part of the cache key, without which the two ESA CCI layers would serve the same tile). Error messages are deliberately generic — they must not leak the credentials path.

`@google/earthengine` is listed in `serverExternalPackages` in `next.config.ts` (CommonJS with Node-only deps; Turbopack cannot bundle it).

### Map client

`app/(mapa)/mapa/page.tsx` does `dynamic(..., { ssr: false })` on `components/mapa/Mapa.tsx` — MapLibre needs WebGL/`window`. Global state is Zustand (`lib/mapa/store.ts`); `MapView.tsx` owns the map, drawing (mapbox-gl-draw) and click-to-stats; results are cached under `layer:static:geometryHash`.

### Monthly theme

The UI accent is the current month's color, derived from a 40-year NDFI series (`lib/phenology.ts`, `lib/ndfi-series.json`, shared by the landing page and the map module — hence `lib/` rather than `lib/mapa/`). `config/mapa/platforms.ts::buildAccent` derives the tones; the module writes the `--acc*` CSS vars inline on its root along with `data-month`. **Do not write `[data-month]` blocks in CSS** — there would be 24 of them and they would drift out of sync with the JS theme. `npm run contrast` runs `buildAccent` across 12 months × 2 modes and fails below 4.5:1.

## Supporting documentation

- `DOCUMENTACAO.md` — full technical inventory: layer table with asset/band/unit, GEE pipeline, data decisions and TODOs. Read it before touching layers.
- `README.md` — Firebase setup, Docker, CI/CD and the required GitHub Actions secrets.
- `REVISAO_TECNICA.md` — the security/bug/performance review already implemented. Paths quoted there predate the merge: read `lib/` as `lib/mapa/`, `config/` as `config/mapa/`, `components/` as `components/mapa/`.
