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

Only the platform requires a Firebase session: `/mapa`, `/relatorio` and the admins' `/aprovacoes`. The marketing pages, the Territórios story (`/territorios`), `/login` and the access flow in `app/(auth)/` (`/cadastro`, `/cadastro/confirmacao`, `/aguardando-liberacao`, `/esqueci-senha`, `/redefinir-senha`) are public, and logging in lands on the map unless the `redirect` names a private route (`safeRedirect`, `lib/auth.ts`). The flow: the client authenticates against Firebase (`lib/firebase.ts`) → `POST /api/session` exchanges the idToken for a 24 h HttpOnly `session` cookie (`lib/auth.ts`, `lib/firebase-admin.ts`) → the private pages and the platform's API routes (`/api/gee/*`, `/api/mapa/relatorio/*`) verify that cookie before doing any work. Two sets of exceptions serve visitors without a session, so do not add the session check to them. For the public story, `/api/territorios/*` takes only the per-IP rate limit, and `/api/gee/tile` serves without a session exactly the requests the story map makes (`lib/territorios/storyTiles.ts`). For the access flow, `/api/signup/*` (except `/api/signup/approve`, which checks the session and the admin list) and `/api/password-reset/*` take the origin check and rate limits instead (`rejectUntrustedOrLimited`, `lib/access/http.ts`). When adding any other API route, call `getAuthenticatedRequest(req)` and return `unauthorizedResponse()` first. `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` are server-only; never prefix them with `NEXT_PUBLIC_`.

**Access gate and signup** (`docs/signup.md`). With `PLATFORM_ACCESS_GUARD_ENABLED=true`, a session needs the `caativar` custom claim on the account (`lib/access/claims.ts`): `createSessionCookie` refuses to mint a cookie without it and `verifySessionCookie` drops a cookie that lacks it, so every layout and route inherits the gate. Every account signup creates carries a `caativar: { access: 'requested' }` marker until access is granted, and a marked account gets no session even with the switch off (beta and prod share the Firebase accounts, not the switch). `approveAccess` is the only writer of the claim; Firestore's `access-requests` collection is the audit record and never authorizes. The switch also opens signup (the signup routes answer 404 while it is off), and turning it on before `scripts/backfill-access-claims.mjs` locks every existing account out. Signup creates the account without a password; whoever reads the mailbox chooses it on the confirmation page. Admins (`ACCESS_ADMIN_EMAILS`) decide requests at `/aprovacoes`. Email goes through `lib/mailer.ts`, and nothing may log a confirmation or reset code.

### `config/mapa/layers.json` is the source of truth

The ~21 layers are declared in JSON, not in code. That file governs far more than the panel listing:

- **Security allowlist**: the `/api/gee/*` routes accept an asset config from the client, but `lib/mapa/geeAllowlist.ts` only admits `id::band` pairs present in `layers.json`. Without it the service account would become a proxy to any Earth Engine asset. Layers with `asset.bandPattern` get their year range expanded into the allowlist at load time — forgetting that yields a 403 when stepping through time.
- **Behavior branches by block**: `gee.temporal` makes a layer year-navigable; `gee.classify` applies Jenks classification; `gee.stocks` makes a click open the carbon stock report (`lib/mapa/stockReport.ts`) instead of the visible band's statistics. The routes branch on the presence of the block.
- **Physical scaling**: `multiplier`/`offset`/`validMin`/`validMax` are applied inside `lib/mapa/geeImage.ts` (`buildEeImage`). **Tile, stats, point value and time series must all go through `buildEeImage`** — any path that builds its own `ee.Image` returns raw units and diverges from the map.
- **Order matters**: vectors sit above rasters, which is what lets a click on a feature compute statistics for the raster beneath it. The store's `layers` is derived by `lib/mapa/layerOrder.ts`: vectors on top in `layers.json` order, then rasters by the user's theme order and subtheme order (`themeOrder` / `subthemeOrder`, dragged by grips in the sidebar and persisted). Every thematic subtheme is exclusive, so that fixes the order of the visible rasters. Among vectors, though, order does *not* decide which one a click belongs to: overlapping recortes are resolved by `pickPriority` (higher = finer = wins, `lib/mapa/pickVector.ts`), because `bioma` is `layers[0]` and contains every other recorte (all but the edges of the municipalities that cross it, which are kept whole: `clippedToBiome: false`), so "topmost wins" would make it swallow every click. Between recortes of one priority, which nest both ways (an APA holds whole settlements, a park lies inside an indigenous land), the smaller feature wins, measured whole on the source GeoJSON (`fullFeatureArea` in `MapView.tsx`): a rendered feature is clipped to its tile, so its area changes with zoom. Order only breaks what is left, equal areas or an area still loading.
- **Panel navigation**: layers declare only `theme`/`subtheme`; the accordion structure and order live in `config/mapa/groups.ts`, where `exclusive: true` makes a choice replace the previous one in that subtheme.

Sensitive configuration never travels from the client: the server resolves `clipId` → geometry in `lib/mapa/clipRegistry.ts` and `layerId` → `stocks` block in `lib/mapa/stocksRegistry.ts`, rejecting with 400 when the id does not match the asset sent.

### GEE routes

`app/api/gee/{tile,stats,point,timeseries}/route.ts` — all `POST`, Node runtime, `force-dynamic`. Each one: validates input (`lib/mapa/geeValidation.ts`), checks the allowlist, authenticates (`lib/mapa/geeAuth.ts`, with `setDeadline`), builds the image via `buildEeImage`, evaluates with a timeout (`lib/mapa/geeEvaluate.ts`). There is an in-memory per-IP rate limiter (`lib/mapa/rateLimit.ts`) and a server-side `tileUrl` cache with a 90 min TTL (`lib/mapa/tileCache.ts`; the `unmaskValue` flag is part of the cache key, without which the two ESA CCI layers would serve the same tile). Error messages are deliberately generic — they must not leak the credentials path.

`@google/earthengine` is listed in `serverExternalPackages` in `next.config.ts` (CommonJS with Node-only deps; Turbopack cannot bundle it).

### Map client

`app/(mapa)/mapa/page.tsx` does `dynamic(..., { ssr: false })` on `components/mapa/Mapa.tsx` — MapLibre needs WebGL/`window`. Global state is Zustand (`lib/mapa/store.ts`); `MapView.tsx` owns the map, drawing (mapbox-gl-draw) and click-to-stats; results are cached under `layer:static:geometryHash`.

The platform renders the site header (`SiteHeader` with `account`) and, under it, a row of columns (`Mapa.tsx`, widths in `lib/mapa/layout.ts`): the layer panel, the ficha when open, the map and the results. A column that closes leaves the row, and the map takes its width. `app/(mapa)/layout.tsx` loads `globals.css` before `mapa.css`, so the site's tokens and type classes apply there too.

### Institutional copy in Contentful

The words of the marketing pages (`/`, `/sobre/*`, `/comunicacao`) come from Contentful, one content type per section or page, each holding a single entry. The types are declared in `lib/content/` with `defineCopy` (`lib/content/site/model.ts`): each field is a `line`, `paragraph`, `text` (paragraphs split on a blank line) or `list` (one item per line), and its value in the code is both the fallback and what seeds a new space. Pages read them with `loadSiteCopy` (`lib/content/site/fetch.ts`); a failed request, a missing entry or an empty required field falls back to the code, field by field. Images, their alt text, icons, links and interface labels (`"Ver mais"`, `"Plataforma"`) stay in the code, and so does the number of cards in each section.

Changing a field means changing three things together: the definition in `lib/content/`, the content type in the space (`npm run contentful:provision -- --apply` with `CONTENTFUL_MANAGEMENT_TOKEN`; it never overwrites an existing entry) and, when the copy itself changes, the entry. The entry wins over the code, so new copy committed to `lib/content/` does not reach the page until the entry is updated too. `tests/lib/contentfulSpace.test.ts` runs every copy query against the configured space and fails on a missing type or field. Published edits reach the pages within the hour (`REVALIDATE_SECONDS` in `lib/contentful.ts`).

The Territórios story (`/territorios`) reads its copy the same way: one type per tab, plus the presentation over the gallery and the shared part of "Sobre os dados" (`lib/content/territorios.ts`). The page loads it on the server, and `StoryScriptProvider` (`components/territorios/StoryScriptContext.tsx`) turns it into the script `lib/territorios/storyText.ts` fills, through `storyScript()` in `config/territorios/storyScript.ts`; panels read it with `useStoryScript()`. A copy field may declare placeholders (`line('Pergunta', 'Como mudou a vegetação nativa desde {anoInicial}?', { anoInicial: '…' })`). An entry naming any other placeholder, or leaving a brace unpaired, falls back to the code for that field. The years of each series are always placeholders, so a data update reaches the copy. Interface labels, chart descriptions, the summary's badges and the grammar tables stay in `config/territorios/`.

### Platform theme

The platform wears the site's fixed palette, light only: `config/mapa/platforms.ts::buildSiteTheme` derives the accent tones from the site's brand green with `buildAccent`, and `Mapa.tsx` writes them as the `--acc*` CSS vars inline on its root, so the JS theme stays their single source. Until the redesign the accent was the current month's color, derived from a 40-year NDFI series (`lib/phenology.ts`, `lib/ndfi-series.json`), with a month picker and a dark mode. That machinery no longer reaches the screen, but `npm run contrast` still runs `buildAccent` across 12 months × 2 modes, and the carbon flux inks are still derived against the hardest month. The script also checks the site theme and the report theme, and fails below 4.5:1.

## Supporting documentation

- `lib/cenas/REGRAS_CENAS.md` — rules for the Glossário animations (engine, scenes, visual conventions, sources). Read it before touching `lib/cenas/` or `components/glossario/`.
- `DOCUMENTACAO.md` — full technical inventory: layer table with asset/band/unit, GEE pipeline, data decisions and TODOs. Read it before touching layers.
- `README.md` — Firebase setup, Docker, CI/CD and the required GitHub Actions secrets.
- `REVISAO_TECNICA.md` — the security/bug/performance review already implemented. Paths quoted there predate the merge: read `lib/` as `lib/mapa/`, `config/` as `config/mapa/`, `components/` as `components/mapa/`.
