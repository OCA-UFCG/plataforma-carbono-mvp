# Platform Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A first-visit guided tour of `/mapa`, ported from SEDES's `driver.js` tour, that teaches an invited partner to get from an empty map to a result.

**Architecture:** The steps point at `data-tour="…"` attributes placed on existing platform components. A pure module (`tourSteps.ts`) holds the copy, the step list and the "seen" flag. A DOM module (`tourDom.ts`) reshapes the balloon and opens the collapsed panels the steps point into. A hook (`usePlatformTour.ts`), mounted in `Mapa.tsx`, auto-starts the tour and hands back the replay callback for a "?" button in the map controls.

**Tech Stack:** Next.js App Router client components, `driver.js@1.9.0`, CSS (global sheet scoped by class), vitest in the node environment with `renderToStaticMarkup`.

**Spec:** `docs/superpowers/specs/2026-11-18-platform-tour-design.md`. Reference implementation: `/home/ezequias/oca/SAP-frontend/src/components/PlatformTour/` (`usePlatformTour.ts`, `platformTour.css`).

## Global Constraints

- `driver.js` pinned at exactly `1.9.0` (SEDES's version), in `dependencies`.
- The tour never calls Earth Engine and never changes map state: no `toggleLayer`, no recorte selection, no draw mode. It may open UI folds (layer panel, Território, the first theme).
- Steps target `data-tour` attributes only, never class names.
- "Seen" key: `caativar.platformTour.v1.seen`, value `"1"`, in `localStorage`; marked when the tour opens; a storage error reads as seen.
- Auto-start only when `window.innerWidth >= 768`, 800 ms after mount.
- Driver options as SEDES: `disableActiveInteraction: true`, `overlayClickBehavior: 'none'`, `waitForElement: 3000`, `stagePadding: 8`, `stageRadius: 12`, `popoverOffset: 16`, `overlayOpacity: 0.6`, `overlayColor: '#374d15'` (`--role-marca-ancora-pressionado`, the deepest brand green), `popoverClass: 'caativar-tour'`.
- All copy in Portuguese, exactly as in Task 3; code and comments in English (CLAUDE.md).
- No invented numbers in any preview.
- Cross-group links stay `<a href>` (not relevant here, but do not add `next/link` to platform code).

## Review Focus

1. **Panel collapsed when the tour starts** (window 768–1179 px wide, where `Mapa.tsx` starts with the panel closed): steps 2–5 must point at the opened panel, not at nothing. Pinned by the rendered check in Task 4, step 6.
2. **Território folded or another theme open** (the visitor folded it on an earlier visit, or opened "Uso do solo"): the tour opens Território and the first theme before step 2. Pinned by Task 4, step 6.
3. **`localStorage` throws** (blocked site data): no auto-start, the "?" still runs the tour. Pinned by a test in Task 3.
4. **"?" pressed while the tour is pending or running**: exactly one tour on screen; the pending auto-start is cancelled. Pinned by Task 4, step 6.
5. **The first layer is not a measured raster, or has no `LAYER_INFO` entry**: the step 5 preview falls back to `LAYER_META`'s description (as the ficha does) and step 6 drops the layer name instead of breaking. The fallback is pinned by Task 1's tests; the name guard in `renderResultPreview` is DOM-only, so the final review reads it.

---

### Task 1: Share the ficha's headline

The step 5 preview shows what the ficha shows at its top. Move the derivation out of the component so both read one source.

**Files:**
- Create: `lib/mapa/ficha.ts`
- Modify: `components/mapa/LayerInfoCard.tsx:49-51` (the `summary` and `chips` lines)
- Test: `tests/lib/ficha.test.ts`

**Interfaces:**
- Produces: `fichaHeadline(layerId: string): { summary: string; chips: string[] }` — `summary` is `LAYER_INFO[id].summary`, else `LAYER_META[id].description` capitalized with a final period, else `''`; `chips` is `[period, resolution]` from `LAYER_INFO`, empty ones dropped.

- [ ] **Step 1: Write the failing test** — `tests/lib/ficha.test.ts`, with a layer id that has `LAYER_INFO` and one that has only `LAYER_META` (pick both by reading `config/mapa/layerInfo.ts` and `config/mapa/layerMeta.ts`):

```ts
it('takes the summary and the chips from LAYER_INFO', () => {
  const h = fichaHeadline(WITH_INFO)
  expect(h.summary).toBe(LAYER_INFO[WITH_INFO].summary)
  expect(h.chips).toEqual([LAYER_INFO[WITH_INFO].period, LAYER_INFO[WITH_INFO].resolution].filter(Boolean))
})
it('falls back to LAYER_META, capitalized with a period, and no chips', () => {
  const d = LAYER_META[META_ONLY].description
  expect(fichaHeadline(META_ONLY)).toEqual({ summary: d[0].toUpperCase() + d.slice(1) + '.', chips: [] })
})
it('answers empty for an unknown layer', () => {
  expect(fichaHeadline('nope')).toEqual({ summary: '', chips: [] })
})
```

If every layer has `LAYER_INFO`, drop the second case and say so in the commit message.

- [ ] **Step 2: Run it** — `npx vitest run tests/lib/ficha.test.ts`. Expected: FAIL, cannot resolve `@/lib/mapa/ficha`.
- [ ] **Step 3: Implement `fichaHeadline`** in `lib/mapa/ficha.ts` and replace `LayerInfoCard`'s two derivations with one call. `citation` and `sheet` stay in the component.
- [ ] **Step 4: Run** `npx vitest run tests/lib/ficha.test.ts tests/components/layerInfoCard.test.ts`. Expected: PASS (the card's tests are the regression check).
- [ ] **Step 5: Commit** — `refactor: share the ficha's summary and chips with other readers`.

---

### Task 2: Tag the tour's targets and add the replay button

**Files:**
- Modify: `components/mapa/panel/Territory.tsx` (the `<section>`, its fold button, the `drawButtons` div)
- Modify: `components/mapa/Sidebar.tsx` (`ThemeSection`'s header button; `LayerRow`'s root and its "i" button)
- Modify: `components/mapa/overlays/MapControls.tsx`, `MapControls.module.css`
- Modify: `components/mapa/MapView.tsx` (Props and the `<MapControls>` at ~line 1749)
- Modify: `components/mapa/Mapa.tsx` (the map column div)
- Create: `public/icons/mapa/help.svg`
- Test: `tests/components/territory.test.ts`, `tests/components/sidebarThemes.test.ts`, `tests/components/mapControls.test.ts`

**Interfaces:**
- Produces these DOM hooks, which Tasks 3–4 query:

| Attribute | On |
|---|---|
| `data-tour="territory"` | Território's `<section>` |
| `data-tour-reveal="territory"` | Território's fold button (`aria-expanded`) |
| `data-tour="draw"` | the div around "Delimitar recorte" and "Marcar ponto" |
| `data-tour-reveal="theme"` | every theme header button (`aria-expanded`) |
| `data-tour="layer-card"` | every `LayerRow` root |
| `data-tour="layer-info"` + `data-layer-id={layer.id}` | every `LayerRow` "i" button |
| `data-tour="map"` | the map column div in `Mapa.tsx` (the one wrapping `<MapView>`) |
| `data-tour="basemap"` | MapControls' basemap wrapper div (`bmRef`) |
| `data-tour="tour-replay"` | the new "?" button |

- `MapControls` Props gain `onReplayTour?: () => void`; `MapView` Props gain the same and pass it down. The "?" renders only when the prop is given.

- [ ] **Step 1: Write the failing tests.**

`territory.test.ts` (render `Territory` with the existing state helpers):
```ts
it('marks Território and its draw buttons for the tour', () => {
  const html = render()
  expect(html).toMatch(/<section [^>]*data-tour="territory"/)
  expect(html).toMatch(/<button [^>]*data-tour-reveal="territory"[^>]*aria-expanded="true"|aria-expanded="true"[^>]*data-tour-reveal="territory"/)
  expect(html).toMatch(/data-tour="draw"[\s\S]*Delimitar recorte[\s\S]*Marcar ponto/)
})
```
`sidebarThemes.test.ts`:
```ts
it('marks the theme headers, the layer cards and their "i" for the tour', () => {
  expect(markup.match(/data-tour-reveal="theme"/g)?.length).toBe(LISTED_THEME_COUNT)
  expect(markup).toMatch(/data-tour="layer-card"/)
  expect(markup).toMatch(/<button [^>]*data-tour="layer-info"[^>]*data-layer-id="[^"]+"/)
})
```
(`LISTED_THEME_COUNT`: the number of themes the file's fixture lists; read it from the fixture.)

`mapControls.test.ts`:
```ts
it('adds "Tutorial" last when the platform passes the replay', () => {
  const html = renderToStaticMarkup(createElement(MapControls, { mapRef: { current: null }, rightOffset: 40, onReplayTour: () => {} }))
  const labels = [...html.matchAll(/<button [^>]*aria-label="([^"]+)"/g)].map((m) => m[1])
  expect(labels.at(-1)).toBe('Tutorial')
  expect(html).toMatch(/<button [^>]*data-tour="tour-replay"/)
  expect(html).toContain('/icons/mapa/help.svg')
  expect(html).toMatch(/<div [^>]*data-tour="basemap"/)
})
```
The two existing MapControls tests stay as they are: without `onReplayTour` there is no "?".

- [ ] **Step 2: Run** `npx vitest run tests/components/territory.test.ts tests/components/sidebarThemes.test.ts tests/components/mapControls.test.ts`. Expected: the three new tests FAIL, the rest PASS.
- [ ] **Step 3: Add the attributes** of the table. Only attributes: no markup moves, no class changes.
- [ ] **Step 4: Add the "?" button** to `MapControls`, below the basemap wrapper, in the same `styles.control` look: `aria-label="Tutorial"`, `title="Tutorial"`, `data-tour="tour-replay"`, `<Icon name="help" />`. If `.stack`'s 16px gap does not separate it from the basemap, give it its own wrapper like `.basemap`. Thread `onReplayTour` through `MapView`'s Props (optional) to `<MapControls>`.
- [ ] **Step 5: Create `public/icons/mapa/help.svg`** — Material Symbols "help" (outlined, weight 400) at 16×16, fill `#587C22` like `map.svg`:

```svg
<svg width="16" height="16" viewBox="0 -960 960 960" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M478-240q21 0 35.5-14.5T528-290q0-21-14.5-35.5T478-340q-21 0-35.5 14.5T428-290q0 21 14.5 35.5T478-240Zm-36-154h74q0-33 7.5-52t42.5-52q26-26 41-49.5t15-56.5q0-56-41-86t-97-30q-57 0-92.5 30T342-618l66 26q5-18 22.5-39t53.5-21q32 0 48 17.5t16 38.5q0 20-12 37.5T506-526q-44 39-54 59t-10 73Zm38 314q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" fill="#587C22"/></svg>
```
(Checked by eye in Task 4's rendered check: a question mark in a circle.)

- [ ] **Step 6: Run** the three test files again. Expected: PASS.
- [ ] **Step 7: Commit** — `feat: mark the platform's tour targets and add the tour's replay button`.

---

### Task 3: Tour steps, copy and balloon

**Files:**
- Modify: `package.json`, `package-lock.json` (`npm install driver.js@1.9.0 --save-exact`)
- Create: `components/mapa/tour/tourSteps.ts` (pure: copy, steps, seen flag)
- Create: `components/mapa/tour/tourDom.ts` (DOM: balloon renderers, reveal)
- Test: `tests/components/platformTour.test.ts`

**Interfaces:**
- Consumes: Task 1's `fichaHeadline`; Task 2's attributes; `isMeasuredRaster` (`lib/mapa/analysisTargets.ts`); `useStore.getState().layers`.
- Produces, in `tourSteps.ts`:
  - `PLATFORM_TOUR_SEEN_KEY = 'caativar.platformTour.v1.seen'`
  - `hasSeenPlatformTour(): boolean`, `markPlatformTourSeen(): void`
  - `shouldAutoStartTour(): boolean` — `window.innerWidth >= 768 && !hasSeenPlatformTour()`
  - `TOUR_COPY` — the object below
  - `buildTourSteps(): DriveStep[]` — the 8 steps, in order
- Produces, in `tourDom.ts`:
  - `renderPopover(dom: PopoverDOM, opts: HookOpts): void` — SEDES's `renderPopover`: footer `role="none"`, progress dots with the visually hidden text kept
  - `clearDummyElementAria(element?: Element): void` — SEDES's, verbatim in behavior
  - `renderLayerPreview(dom: PopoverDOM): void` — reads `data-layer-id` from the first `[data-tour="layer-info"]`, renders name, chips and `summary` (4-line clamp) below `dom.description`; renders nothing if the id is missing
  - `renderResultPreview(dom: PopoverDOM): void` — below `dom.description`: the first card's layer name as a heading only when `isMeasuredRaster(layer)`, then the `TOUR_COPY.result.items` as a list
  - `revealTourTargets(): boolean` — for `[data-tour-reveal="territory"]` and then the first `[data-tour-reveal="theme"]`, if `aria-expanded="false"`, `flushSync(() => el.click())`; returns whether any opened

`TOUR_COPY` (exact strings; `{{current}}`/`{{total}}` are driver.js placeholders):

```ts
export const TOUR_COPY = {
  start: 'Começar', next: 'Próximo', previous: 'Voltar', done: 'Concluir', close: 'Fechar tutorial',
  progress: 'Passo {{current}} de {{total}}',
  welcome:   { title: 'Boas-vindas à Caativar', description: 'Em menos de um minuto, mostramos como medir o carbono de um lugar da Caatinga.' },
  territory: { title: 'Escolha onde olhar', description: 'Escolha o recorte: o bioma, um estado, um município, um território tradicional ou uma unidade de conservação. Busque pelo nome ou clique direto no mapa.' },
  draw:      { title: 'Ou desenhe a sua área', description: 'Em Delimitar recorte, desenhe um polígono no mapa. Em Marcar ponto, veja o valor de um lugar exato e, nas camadas com série histórica, como ele mudou ao longo dos anos.' },
  layerCard: { title: 'Cada item é uma camada', description: 'O botão à esquerda liga a camada no mapa, e a legenda aparece no canto inferior direito. As camadas ficam agrupadas por tema.' },
  layerInfo: { title: 'O que a camada mostra', description: 'O “i” abre a ficha da camada: o que ela mede, a fonte, o período e como citar. Por exemplo:' },
  result:    { title: 'Veja o resultado', description: 'Com uma camada ligada, clique num recorte no mapa ou desenhe uma área. O painel Resultado se abre à direita com:',
               items: ['Os números da camada no recorte', 'Gráficos, conforme a camada', 'Download em CSV e JPEG'] },
  basemap:   { title: 'Mapa base', description: 'Troque o fundo do mapa: ruas, relevo ou imagem de satélite.' },
  replay:    { title: 'Tudo pronto', description: 'Agora é com você: ligue uma camada e clique num recorte no mapa. Para rever este passo a passo, use o botão “?” ao lado do mapa.' },
} as const
```

Steps (`element` / balloon / hooks):

| # | `element` | `popover` extras |
|---|---|---|
| 1 | none | `nextBtnText: TOUR_COPY.start`, `showButtons: ['next', 'close']`, `onPopoverRender`: `renderPopover` then the logo `<img src="/logos/caativar.svg" alt="Caativar" width="113" height="36">` before `dom.title` |
| 2 | `[data-tour="territory"]` | `side: 'right', align: 'start'` |
| 3 | `[data-tour="draw"]` | `side: 'right', align: 'start'` |
| 4 | `[data-tour="layer-card"]` | `side: 'right', align: 'start'` |
| 5 | `[data-tour="layer-info"]` | `side: 'right', align: 'start'`, `onPopoverRender`: `renderPopover` then `renderLayerPreview` |
| 6 | `[data-tour="map"]` | `onPopoverRender`: `renderPopover` then `renderResultPreview`; side left to driver.js |
| 7 | `[data-tour="basemap"]` | `side: 'left', align: 'start'` |
| 8 | `[data-tour="tour-replay"]` | `side: 'left', align: 'end'` |

A step's own `onPopoverRender` replaces the config's, which is why steps 1, 5 and 6 call `renderPopover` themselves (SEDES does the same).

- [ ] **Step 1: Install** — `npm install driver.js@1.9.0 --save-exact`. Expected: `"driver.js": "1.9.0"` in `dependencies`; `ls node_modules/driver.js/dist/driver.css` exists.
- [ ] **Step 2: Write the failing tests** in `tests/components/platformTour.test.ts` (node environment; stub `window` with `vi.stubGlobal`):

```ts
it('lists the eight steps in the order of the spec', () => {
  expect(buildTourSteps().map((s) => s.element ?? null)).toEqual([
    null, '[data-tour="territory"]', '[data-tour="draw"]', '[data-tour="layer-card"]',
    '[data-tour="layer-info"]', '[data-tour="map"]', '[data-tour="basemap"]', '[data-tour="tour-replay"]',
  ])
  expect(buildTourSteps().map((s) => s.popover?.title)).toEqual([
    'Boas-vindas à Caativar', 'Escolha onde olhar', 'Ou desenhe a sua área', 'Cada item é uma camada',
    'O que a camada mostra', 'Veja o resultado', 'Mapa base', 'Tudo pronto',
  ])
})
it('opens with "Começar" and no way back', () => {
  const [welcome] = buildTourSteps()
  expect(welcome.popover?.nextBtnText).toBe('Começar')
  expect(welcome.popover?.showButtons).toEqual(['next', 'close'])
})
it('starts by itself on a first visit at desktop width', () => {
  stubWindow({ innerWidth: 1280, storage: {} })
  expect(shouldAutoStartTour()).toBe(true)
})
it('does not start by itself once seen, or below 768px', () => {
  stubWindow({ innerWidth: 1280, storage: { [PLATFORM_TOUR_SEEN_KEY]: '1' } })
  expect(shouldAutoStartTour()).toBe(false)
  stubWindow({ innerWidth: 767, storage: {} })
  expect(shouldAutoStartTour()).toBe(false)
})
it('marks the tour seen under the versioned key', () => {
  const storage = {}
  stubWindow({ innerWidth: 1280, storage })
  markPlatformTourSeen()
  expect(storage).toEqual({ 'caativar.platformTour.v1.seen': '1' })
})
it('reads blocked storage as seen, and marking it does not throw', () => {
  stubWindow({ innerWidth: 1280, storage: 'throws' })
  expect(hasSeenPlatformTour()).toBe(true)
  expect(() => markPlatformTourSeen()).not.toThrow()
})
it('keeps every preview free of numbers', () => {
  expect(TOUR_COPY.result.items.join(' ')).not.toMatch(/\d/)
})
```
`stubWindow` is a local helper: a `localStorage` whose `getItem`/`setItem` read and write the given object, or throw when given `'throws'`.

- [ ] **Step 3: Run** `npx vitest run tests/components/platformTour.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 4: Implement `tourSteps.ts`** per the Interfaces block and the steps table. It imports the renderers from `tourDom.ts`.
- [ ] **Step 5: Implement `tourDom.ts`** per the Interfaces block, porting SEDES's `renderProgressDots`, `renderPopover` and `clearDummyElementAria` with the class prefix `caativar-tour-` (`caativar-tour-dots`, `caativar-tour-dot`, `-dot-done`, `-dot-current`, `caativar-tour-sr-only`, `caativar-tour-logo`, `caativar-tour-preview`, `caativar-tour-preview-label`). Build DOM with `createElement`/`textContent`, never `innerHTML`.
- [ ] **Step 6: Run** `npx vitest run tests/components/platformTour.test.ts` and `npx tsc --noEmit`. Expected: PASS, no type errors.
- [ ] **Step 7: Commit** — `feat: write the platform tour's steps and balloon`.

---

### Task 4: Run the tour on the platform

**Files:**
- Create: `components/mapa/tour/usePlatformTour.ts`
- Create: `components/mapa/tour/platformTour.css`
- Modify: `components/mapa/Mapa.tsx` (mount the hook; pass `onReplayTour` to `<MapView>`)
- Modify: `CLAUDE.md` (one paragraph under "Map client")

**Interfaces:**
- Consumes: Task 3's `buildTourSteps`, `shouldAutoStartTour`, `markPlatformTourSeen`, `TOUR_COPY`, `renderPopover`, `clearDummyElementAria`, `revealTourTargets`; Task 2's `onReplayTour` prop on `MapView`.
- Produces: `usePlatformTour({ showPanel }: { showPanel: () => void }): () => void` — returns the replay callback.

- [ ] **Step 1: Implement `usePlatformTour`**, following SEDES's hook:
  - imports `'driver.js/dist/driver.css'` and `'./platformTour.css'`;
  - `start()`: clear the pending timer, `destroy()` any running tour, `flushSync(showPanel)`, `const opened = revealTourTargets()`, then after `opened ? 350 : 0` ms: `markPlatformTourSeen()` and `driver({ steps: buildTourSteps(), showProgress: true, progressText: TOUR_COPY.progress, nextBtnText/prevBtnText/doneBtnText/closeBtnLabel from TOUR_COPY, onPopoverRender: renderPopover, onHighlighted: clearDummyElementAria, …Global Constraints options }).drive()`;
  - on mount, if `shouldAutoStartTour()`, schedule `start()` in 800 ms;
  - on unmount, clear the timer and destroy the tour;
  - keep `showPanel` in a ref so the mount effect runs once whatever identity `Mapa` passes.
- [ ] **Step 2: Write `platformTour.css`**: SEDES's `platformTour.css` re-skinned. Every selector starts with `.driver-popover.caativar-tour`. Map SEDES's colors to tokens: olive → `var(--role-marca-ancora-padrao)`, olive-dark → `var(--role-marca-ancora-hover)`, olive-deep (titles) → `var(--bg-texto-primario)`, cream (close hover, preview background) → `var(--role-marca-ancora-container)`, body text → `var(--bg-texto-secundario)`, borders → `var(--am-200)`. Fonts: titles and text `var(--font-sans, var(--font-fallback))`, buttons `var(--font-ui, var(--font-fallback))`. Buttons use `var(--radius)`. Keep SEDES's enter animation, dot growth, preview unfold, focus-visible outlines and the `prefers-reduced-motion` block. Drop SEDES's sections list and mobile toggle rules (no counterpart).
- [ ] **Step 3: Wire it in `Mapa.tsx`**: `const replayTour = usePlatformTour({ showPanel: () => setPanelOpen(true) })` and `<MapView … onReplayTour={replayTour} />`.
- [ ] **Step 4: Add to CLAUDE.md**, under "Map client", one paragraph: the first-visit tour (`components/mapa/tour/`, `driver.js`) points at `data-tour` attributes, so renaming or removing one leaves a step without a target; it opens folds through `data-tour-reveal`; bump the `v1` in `caativar.platformTour.v1.seen` to show a changed tour to everyone again.
- [ ] **Step 5: Static checks** — `npx tsc --noEmit && npm run lint && npm test`. Expected: all pass.
- [ ] **Step 6: Rendered check.** In the worktree, `npx next dev --webpack -p <free port>` (`ss -ltnp` first; never touch :3000). Log in by the user's Chrome cookie, or mint one with `scripts/a11y/session.mts oca@gmail.com` (cookie file in the scratchpad, mode 600, deleted after). Clear `caativar.platformTour.v1.seen`, then confirm:
  - at 1440 px: the tour opens alone after load; 8 dots; each step highlights its target; step 1 shows the logo; step 5 shows the first layer's name, chips and summary; step 6 shows the list with no numbers; Esc and "×" close it; clicking the dark overlay does nothing; the highlighted switch cannot be clicked;
  - reload: it does not open again; "?" opens it; pressing "?" twice gives one tour (Review Focus 4);
  - at 1024 px with the panel collapsed, Território folded and "Uso do solo" open: "?" opens the panel, Território and "Vegetação" before step 2 (Review Focus 1–2);
  - at 700 px: no auto-start;
  - keyboard only: Tab stays in the balloon, focus ring visible on "×" and the buttons;
  - the network tab shows no `/api/gee/*` call caused by the tour.
  Stop the server by pid.
- [ ] **Step 7: Commit** — `feat: open the platform tour on a first visit and replay it from the map`.

---

### Task 5: Final verification

- [ ] **Step 1:** `npm test && npm run lint && npm run build && npm run contrast` in the worktree (build with `--webpack` if Turbopack refuses the nested worktree). Expected: all green; `contrast` unchanged.
- [ ] **Step 2:** `git diff origin/main --stat` lists only the files named in Tasks 1–4 plus the spec and this plan.
- [ ] **Step 3:** Remove the worktree's `.env.local` and `.next` before handing over.
