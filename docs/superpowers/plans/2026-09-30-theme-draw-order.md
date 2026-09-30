# Map Draw Order by Theme and Subtheme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user set the map's raster draw order by dragging theme cards and subtheme headers in the sidebar, replacing the within-subtheme layer drag that almost never changed the map.

**Architecture:** The store's `layers` array stays the draw order (`layers[0]` on top). Two new pieces of state, `themeOrder` and `subthemeOrder`, are the user's order. `layers` is always derived from them by a pure function in `lib/mapa/layerOrder.ts`: vectors first in `layers.json` order, then rasters by theme, subtheme and catalog order. The sidebar renders and drags in that order, and both orders are persisted.

**Tech Stack:** Next.js 16 (App Router), React 19, strict TypeScript, Zustand, native HTML5 drag-and-drop, Vitest 4 (node environment).

**Spec:** `docs/superpowers/specs/2026-09-30-theme-draw-order-design.md`

## Global Constraints

- Work in the worktree `/home/ezequias/oca/worktrees/theme-draw-order`, on branch `feat/theme-draw-order`. The main checkout belongs to someone else's work: never switch its branch.
- Code, comments and docs in English. UI strings stay in Portuguese, verbatim: the grip title is `"Arraste para reordenar"`, and the hint is `"Arraste temas e subcategorias pela alça ⠿ para mudar a ordem no mapa"`.
- Import alias `@/*` maps to the repo root. Tests are `tests/**/*.test.ts` in the node environment (no DOM), run with `npx vitest run <file>`.
- No new dependencies.
- CI runs only `npm run build` and `npm run contrast`. Run `npm test` locally before each commit that touches code.
- Baselines on `origin/main`, which a task must not worsen:
  - `npx tsc --noEmit -p .` reports 5 errors, all in `tests/lib/{contentfulSpace,layerVisibility,reportService,zonalSeries}.test.ts`;
  - `npm run lint` reports 3 errors in `components/mapa/overlays/FloatingSearchBar.tsx` and 2 warnings in `components/mapa/MapView.tsx`.
- Commits: conventional prefixes, English, **no `Co-Authored-By` or other attribution trailer**.
- Invariant: in `layers`, every vector precedes every raster, and the vectors are in `config/mapa/layers.json` order.
- Território (`TERRITORY_THEME_ID`) is never in `themeOrder`, has no grip and always renders first.
- Only a grip is `draggable`. Drag payloads use `application/x-caativar-theme` / `application/x-caativar-subtheme`, never `text/plain`.

## Review Focus

1. A theme drag passing over an open theme's subtheme block (a nested drop zone) must still show the theme line and drop as a theme. Pinned in Task 5's browser script.
2. A subtheme dragged out of its theme's block, onto another theme card or out of the panel: the line clears and a release there changes nothing. Pinned in Task 5's browser script.
3. A drag of selected text in a card or header must not start a reorder, although it bubbles through the same `onDragStart`. Pinned in Task 5's browser script.
4. A press or a drag on a grip must never open or close the card or header it sits on. Pinned in Task 5's manual check.
5. Grips and hint must disappear while a layer search is typed, and below two thematic layers on. Pinned in Task 5's manual check.

---

### Task 1: `lib/mapa/layerOrder.ts`, the group order rules

**Files:**
- Create: `lib/mapa/layerOrder.ts`
- Test: `tests/lib/layerOrder.test.ts`

**Interfaces:**
- Consumes: `THEMES`, `TERRITORY_THEME_ID`, `ThemeInfo` from `@/config/mapa/groups`; `LayerConfig` from `@/types/mapa`; `config/mapa/layers.json`.
- Produces:
  - `DEFAULT_THEME_ORDER: string[]`, which is `['carbono', 'uso_solo', 'ambiente']` today;
  - `DEFAULT_SUBTHEME_ORDER: Record<string, string[]>`;
  - `moveInList(list: string[], id: string, beforeId: string | null): string[]`, returning the same array when nothing moves;
  - `applyGroupOrder(layers: LayerConfig[], themeOrder: string[], subthemeOrder: Record<string, string[]>, catalog?: readonly LayerConfig[]): LayerConfig[]`, returning the same array when the order holds;
  - `sanitizeThemeOrder(stored: unknown): string[]`;
  - `sanitizeSubthemeOrder(stored: unknown): Record<string, string[]>`;
  - `orderThemes(themes: ThemeInfo[], themeOrder: string[], subthemeOrder: Record<string, string[]>): ThemeInfo[]`.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/layerOrder.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { THEMES } from '@/config/mapa/groups'
import {
  DEFAULT_SUBTHEME_ORDER, DEFAULT_THEME_ORDER, applyGroupOrder, moveInList, orderThemes,
  sanitizeSubthemeOrder, sanitizeThemeOrder,
} from '@/lib/mapa/layerOrder'
import type { LayerConfig } from '@/types/mapa'

const vector = (id: string): LayerConfig => ({
  id, name: id, type: 'vector', url: `/data/${id}.geojson`, visible: true, opacity: 80,
  color: '#000', theme: 'territorio', subtheme: 'limites',
})
const raster = (id: string, theme: string, subtheme: string): LayerConfig => ({
  id, name: id, type: 'raster', visible: false, opacity: 80, colorType: 'continuous', theme, subtheme,
})
const ids = (layers: LayerConfig[]) => layers.map((layer) => layer.id)

describe('moveInList', () => {
  const list = ['a', 'b', 'c', 'd']

  it('moves an item up, in front of beforeId', () => {
    expect(moveInList(list, 'd', 'b')).toEqual(['a', 'd', 'b', 'c'])
  })

  it('moves an item down, in front of beforeId', () => {
    expect(moveInList(list, 'a', 'd')).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item to the end with null', () => {
    expect(moveInList(list, 'b', null)).toEqual(['a', 'c', 'd', 'b'])
  })

  it('returns the same array when the item keeps its slot', () => {
    expect(moveInList(list, 'b', 'b')).toBe(list)
    expect(moveInList(list, 'b', 'c')).toBe(list)
    expect(moveInList(list, 'd', null)).toBe(list)
  })

  it('returns the same array for an unknown id or beforeId', () => {
    expect(moveInList(list, 'x', 'a')).toBe(list)
    expect(moveInList(list, 'a', 'x')).toBe(list)
  })
})

describe('applyGroupOrder', () => {
  const bioma = vector('bioma')
  const estados = vector('estados')
  const a1 = raster('a1', 'A', 's1')
  const a2 = raster('a2', 'A', 's2')
  const b1 = raster('b1', 'B', 's1')
  const b1bis = raster('b1bis', 'B', 's1')
  const catalog = [bioma, estados, a1, a2, b1, b1bis]

  it('puts the vectors on top in catalog order, then rasters by theme and subtheme', () => {
    const layers = [b1, estados, a2, bioma, a1]
    const out = applyGroupOrder(layers, ['B', 'A'], { A: ['s2', 's1'], B: ['s1'] }, catalog)
    expect(ids(out)).toEqual(['bioma', 'estados', 'b1', 'a2', 'a1'])
  })

  it('breaks ties inside a subtheme by catalog order', () => {
    const out = applyGroupOrder([b1bis, b1], ['A', 'B'], { A: [], B: ['s1'] }, catalog)
    expect(ids(out)).toEqual(['b1', 'b1bis'])
  })

  it('returns the same array when the order already holds', () => {
    const layers = [bioma, estados, a1, a2, b1]
    expect(applyGroupOrder(layers, ['A', 'B'], { A: ['s1', 's2'], B: ['s1'] }, catalog)).toBe(layers)
  })

  it('sorts a theme or subtheme missing from the orders after the known ones', () => {
    const stray = raster('stray', 'Z', 's9')
    const out = applyGroupOrder([stray, a1, b1], ['A', 'B'], { A: ['s1'], B: ['s1'] }, [...catalog, stray])
    expect(ids(out)).toEqual(['a1', 'b1', 'stray'])
  })

  it('holds for config/mapa/layers.json with the default orders', () => {
    const config = appConfig.layers as LayerConfig[]
    const once = applyGroupOrder(config, DEFAULT_THEME_ORDER, DEFAULT_SUBTHEME_ORDER)
    const lastVector = once.map((layer) => layer.type).lastIndexOf('vector')
    expect(once.findIndex((layer) => layer.type === 'raster')).toBe(lastVector + 1)
    expect(applyGroupOrder(once, DEFAULT_THEME_ORDER, DEFAULT_SUBTHEME_ORDER)).toBe(once)
    // Every raster belongs to a known group, so none is silently sorted last.
    for (const layer of once.filter((l) => l.type === 'raster')) {
      expect(DEFAULT_THEME_ORDER).toContain(layer.theme)
      expect(DEFAULT_SUBTHEME_ORDER[layer.theme!]).toContain(layer.subtheme)
    }
  })
})

describe('default orders', () => {
  it('follow groups.ts, without Território', () => {
    expect(DEFAULT_THEME_ORDER).toEqual(['carbono', 'uso_solo', 'ambiente'])
    expect(DEFAULT_SUBTHEME_ORDER.carbono[0]).toBe('estoques')
    expect(DEFAULT_SUBTHEME_ORDER.territorio).toBeUndefined()
  })
})

describe('sanitizeThemeOrder', () => {
  it('keeps a valid stored order', () => {
    expect(sanitizeThemeOrder(['ambiente', 'carbono', 'uso_solo'])).toEqual(['ambiente', 'carbono', 'uso_solo'])
  })

  it('drops unknown ids, duplicates and Território, and appends what is missing', () => {
    expect(sanitizeThemeOrder(['uso_solo', 'territorio', 'x', 'uso_solo', 42])).toEqual(['uso_solo', 'carbono', 'ambiente'])
  })

  it('falls back to the default for anything that is not a list', () => {
    expect(sanitizeThemeOrder(undefined)).toEqual(DEFAULT_THEME_ORDER)
    expect(sanitizeThemeOrder({ carbono: 1 })).toEqual(DEFAULT_THEME_ORDER)
  })
})

describe('sanitizeSubthemeOrder', () => {
  it('sanitizes each theme and fills the ones not stored', () => {
    const out = sanitizeSubthemeOrder({ carbono: ['solo', 'estoques', 'nope'], territorio: ['limites'] })
    expect(out.carbono.slice(0, 3)).toEqual(['solo', 'estoques', 'reservatorios'])
    expect(out.carbono).toHaveLength(DEFAULT_SUBTHEME_ORDER.carbono.length)
    expect(out.uso_solo).toEqual(DEFAULT_SUBTHEME_ORDER.uso_solo)
    expect(out.territorio).toBeUndefined()
  })

  it('falls back to the default for anything that is not a record', () => {
    expect(sanitizeSubthemeOrder(['carbono'])).toEqual(DEFAULT_SUBTHEME_ORDER)
    expect(sanitizeSubthemeOrder(null)).toEqual(DEFAULT_SUBTHEME_ORDER)
  })
})

describe('orderThemes', () => {
  it('keeps Território first and orders the rest, subthemes included', () => {
    const out = orderThemes(THEMES, ['ambiente', 'carbono', 'uso_solo'], {
      ...DEFAULT_SUBTHEME_ORDER,
      ambiente: ['clima', 'vegetacao'],
    })
    expect(out.map((theme) => theme.id)).toEqual(['territorio', 'ambiente', 'carbono', 'uso_solo'])
    expect(out[1].subthemes.map((subtheme) => subtheme.id)).toEqual(['clima', 'vegetacao'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lib/layerOrder.test.ts`
Expected: FAIL, with the import of `@/lib/mapa/layerOrder` unresolved.

- [ ] **Step 3: Write the module**

Create `lib/mapa/layerOrder.ts`:

```ts
import appConfig from '@/config/mapa/layers.json'
import { THEMES, TERRITORY_THEME_ID, type ThemeInfo } from '@/config/mapa/groups'
import type { LayerConfig } from '@/types/mapa'

/**
 * Draw order of the map layers. The store's `layers` array IS the draw order
 * (layers[0] is drawn on top): the recortes first, in layers.json order, then
 * the rasters by the user's theme order, then subtheme order. Recortes have to
 * sit above the rasters: a click resolves to a recorte and measures the rasters
 * under it (`clickableRecortes`). Every thematic subtheme is exclusive, so
 * ordering subthemes orders the visible rasters.
 *
 * Every function returns the same array when nothing changes, so the store does
 * not notify, re-render or re-persist for a no-op.
 */

// layers.json order: the recortes' order, and the tie-break inside a subtheme.
const CATALOG = appConfig.layers as LayerConfig[]
// Território is always on top, so it is not part of the user's order.
const THEMATIC = THEMES.filter((theme) => theme.id !== TERRITORY_THEME_ID)

export const DEFAULT_THEME_ORDER: string[] = THEMATIC.map((theme) => theme.id)
export const DEFAULT_SUBTHEME_ORDER: Record<string, string[]> = Object.fromEntries(
  THEMATIC.map((theme) => [theme.id, theme.subthemes.map((subtheme) => subtheme.id)]),
)

/** Moves `id` in front of `beforeId`, or to the end with null. */
export function moveInList(list: string[], id: string, beforeId: string | null): string[] {
  if (!list.includes(id) || id === beforeId) return list
  const rest = list.filter((item) => item !== id)
  const at = beforeId === null ? rest.length : rest.indexOf(beforeId)
  if (at === -1) return list
  const out = [...rest.slice(0, at), id, ...rest.slice(at)]
  return out.every((item, index) => item === list[index]) ? list : out
}

// Position in an order; anything missing from it sorts after the known ones.
function rank(order: readonly string[] | undefined, id: string | undefined): number {
  const index = order && id !== undefined ? order.indexOf(id) : -1
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

/** The draw order: vectors in catalog order, then rasters by theme, subtheme and catalog. */
export function applyGroupOrder(
  layers: LayerConfig[],
  themeOrder: string[],
  subthemeOrder: Record<string, string[]>,
  catalog: readonly LayerConfig[] = CATALOG,
): LayerConfig[] {
  const catalogIndex = new Map(catalog.map((layer, index) => [layer.id, index]))
  const byCatalog = (layer: LayerConfig) => catalogIndex.get(layer.id) ?? catalog.length
  const vectors = layers.filter((layer) => layer.type === 'vector').sort((a, b) => byCatalog(a) - byCatalog(b))
  const rasters = layers.filter((layer) => layer.type === 'raster').sort((a, b) =>
    rank(themeOrder, a.theme) - rank(themeOrder, b.theme) ||
    rank(subthemeOrder[a.theme ?? ''], a.subtheme) - rank(subthemeOrder[b.theme ?? ''], b.subtheme) ||
    byCatalog(a) - byCatalog(b),
  )
  const out = [...vectors, ...rasters]
  return out.every((layer, index) => layer === layers[index]) ? layers : out
}

// A stored list checked against the known ids: unknown ids and duplicates go,
// ids added to groups.ts since are appended in their default order.
function sanitizeList(stored: unknown, defaults: string[]): string[] {
  if (!Array.isArray(stored)) return defaults
  const known = new Set(defaults)
  const kept = [...new Set(stored.filter((id): id is string => typeof id === 'string' && known.has(id)))]
  const out = [...kept, ...defaults.filter((id) => !kept.includes(id))]
  return out.every((id, index) => id === defaults[index]) ? defaults : out
}

export function sanitizeThemeOrder(stored: unknown): string[] {
  return sanitizeList(stored, DEFAULT_THEME_ORDER)
}

export function sanitizeSubthemeOrder(stored: unknown): Record<string, string[]> {
  const record = typeof stored === 'object' && stored !== null && !Array.isArray(stored)
    ? (stored as Record<string, unknown>)
    : {}
  return Object.fromEntries(
    Object.entries(DEFAULT_SUBTHEME_ORDER).map(([theme, defaults]) => [theme, sanitizeList(record[theme], defaults)]),
  )
}

/** The panel's themes: Território first, then the user's order, subthemes included. */
export function orderThemes(
  themes: ThemeInfo[],
  themeOrder: string[],
  subthemeOrder: Record<string, string[]>,
): ThemeInfo[] {
  const fixed = themes.filter((theme) => theme.id === TERRITORY_THEME_ID)
  const thematic = themes
    .filter((theme) => theme.id !== TERRITORY_THEME_ID)
    .sort((a, b) => rank(themeOrder, a.id) - rank(themeOrder, b.id))
    .map((theme) => ({
      ...theme,
      subthemes: [...theme.subthemes].sort((a, b) =>
        rank(subthemeOrder[theme.id], a.id) - rank(subthemeOrder[theme.id], b.id)),
    }))
  return [...fixed, ...thematic]
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/layerOrder.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Lint, typecheck and commit**

Run: `npx eslint lib/mapa/layerOrder.ts tests/lib/layerOrder.test.ts`
Expected: no output.

Run: `npx tsc --noEmit -p . 2>&1 | grep -c "error TS"`
Expected: `5`.

```bash
git add lib/mapa/layerOrder.ts tests/lib/layerOrder.test.ts
git commit -m "feat: add the draw order rules by theme and subtheme"
```

---

### Task 2: Store, where the group order drives `layers`

**Files:**
- Modify: `lib/mapa/store.ts`: imports; the interface (lines 109–116); the initial state (line 141); two new actions after `reorderLayer` (line 266).
- Test: `tests/lib/layerVisibility.test.ts` (append)

**Interfaces:**
- Consumes: `DEFAULT_THEME_ORDER`, `DEFAULT_SUBTHEME_ORDER`, `applyGroupOrder` and `moveInList` from Task 1.
- Produces:
  - store state `themeOrder: string[]` and `subthemeOrder: Record<string, string[]>`;
  - actions `moveTheme(id: string, beforeId: string | null)` and `moveSubtheme(themeId: string, id: string, beforeId: string | null)`, which Task 4's sidebar calls.

  `reorderLayer` stays until Task 4 removes it together with its last caller, so every commit compiles.

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/layerVisibility.test.ts`:

```ts
describe('draw order by theme and subtheme', () => {
  const initial = useStore.getState()
  afterEach(() => {
    useStore.setState(initial, true)
    vi.unstubAllGlobals()
  })
  const order = () => useStore.getState().layers.map((layer) => layer.id)
  const topOf = (theme: string) => {
    const o = order()
    return Math.min(...useStore.getState().layers.filter((l) => l.theme === theme).map((l) => o.indexOf(l.id)))
  }

  it('starts in the panel order: Carbono, then Uso do solo, then Ambiente', () => {
    expect(useStore.getState().themeOrder).toEqual(['carbono', 'uso_solo', 'ambiente'])
    expect(order().indexOf('lulc_mapbiomas')).toBeLessThan(order().indexOf('ndvi_modis'))
    expect(order().indexOf('biomassa_gedi')).toBeLessThan(order().indexOf('lulc_mapbiomas'))
  })

  it('draws a theme moved up above the themes it passed', () => {
    useStore.getState().moveTheme('uso_solo', 'carbono')

    expect(useStore.getState().themeOrder).toEqual(['uso_solo', 'carbono', 'ambiente'])
    expect(order().indexOf('lulc_mapbiomas')).toBeLessThan(topOf('carbono'))
  })

  it('draws a subtheme moved up above its sibling', () => {
    expect(order().indexOf('solo_carbono')).toBeLessThan(order().indexOf('biomassa_gedi'))

    useStore.getState().moveSubtheme('carbono', 'biomassa', 'solo')

    expect(order().indexOf('biomassa_gedi')).toBeLessThan(order().indexOf('solo_carbono'))
  })

  it('keeps the recortes above every raster whatever the order', () => {
    useStore.getState().moveTheme('ambiente', 'carbono')
    const { layers } = useStore.getState()
    const lastVector = layers.map((layer) => layer.type).lastIndexOf('vector')
    expect(layers.findIndex((layer) => layer.type === 'raster')).toBe(lastVector + 1)
  })

  it('leaves the state untouched for a move that changes nothing', () => {
    const before = useStore.getState()
    useStore.getState().moveTheme('carbono', 'uso_solo')
    useStore.getState().moveSubtheme('carbono', 'estoques', 'reservatorios')
    useStore.getState().moveSubtheme('nope', 'x', null)

    expect(useStore.getState().layers).toBe(before.layers)
    expect(useStore.getState().themeOrder).toBe(before.themeOrder)
    expect(useStore.getState().subthemeOrder).toBe(before.subthemeOrder)
  })

  it('does not move a raster the user switches on', () => {
    useStore.setState({ fetchedTileUrls: { biomassa_gedi: 'https://tiles.example/gedi' } })
    const before = order()

    useStore.getState().toggleLayer('biomassa_gedi')

    expect(order()).toEqual(before)
  })

  it.each([
    ['in catalog order', [0, 1]],
    ['in reverse order', [1, 0]],
  ])('keeps the order of GEE rasters restored on reload when their tiles arrive %s', async (_, arrival) => {
    // Mapa.tsx switches restored GEE rasters back on through activateDynamicLayer.
    const pending: Array<(res: Response) => void> = []
    vi.stubGlobal('fetch', () => new Promise<Response>((resolve) => { pending.push(resolve) }))
    const { layers, activateDynamicLayer } = useStore.getState()
    const find = (id: string) => layers.find((layer) => layer.id === id) as RasterLayerConfig
    const before = order()

    const activations = [activateDynamicLayer(find('biomassa_gedi')), activateDynamicLayer(find('lulc_mapbiomas'))]
    for (const i of arrival) {
      pending[i](new Response(JSON.stringify({ tileUrl: `https://tiles.example/${i}` })))
      await activations[i]
    }

    expect(order()).toEqual(before)
  })
})
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npx vitest run tests/lib/layerVisibility.test.ts`
Expected:
- FAIL: `starts in the panel order…` (`themeOrder` is undefined), `draws a theme moved up…` and `draws a subtheme moved up…` (`moveTheme` / `moveSubtheme` are not functions), `keeps the recortes above…` and `leaves the state untouched…` (same).
- PASS: `does not move a raster the user switches on` and both `keeps the order of GEE rasters…` cases. They guard behavior that must not regress.
- The existing cases still pass.

- [ ] **Step 3: Implement it in the store**

In `lib/mapa/store.ts`, add after the `groups` import:

```ts
import {
  DEFAULT_SUBTHEME_ORDER, DEFAULT_THEME_ORDER, applyGroupOrder, moveInList,
} from '@/lib/mapa/layerOrder'
```

In `interface MapaStore`, add after `layers: LayerConfig[]`:

```ts
  /** Thematic theme ids, top of the map first. Território is always above them. */
  themeOrder: string[]
  /** Subtheme ids per thematic theme, top of the map first. */
  subthemeOrder: Record<string, string[]>
```

and add after the line `reorderLayer:  (id: string, toIndex: number) => void`:

```ts
  /** Moves a thematic theme in front of `beforeId` (null = the end) and redraws. */
  moveTheme:     (id: string, beforeId: string | null) => void
  /** Moves a subtheme within its theme in front of `beforeId` (null = the end) and redraws. */
  moveSubtheme:  (themeId: string, id: string, beforeId: string | null) => void
```

Replace the initial `layers` line:

```ts
  // Initial layers come entirely from config/layers.json
  layers: restaurado?.layers ?? (appConfig.layers as LayerConfig[]),
```

with:

```ts
  // Initial layers come entirely from config/layers.json, in the draw order.
  layers: applyGroupOrder(restaurado?.layers ?? (appConfig.layers as LayerConfig[]), DEFAULT_THEME_ORDER, DEFAULT_SUBTHEME_ORDER),
  themeOrder: DEFAULT_THEME_ORDER,
  subthemeOrder: DEFAULT_SUBTHEME_ORDER,
```

Add right after the `reorderLayer: (id, toIndex) => … }),` action (it ends at line 266):

```ts

  moveTheme: (id, beforeId) =>
    set((s) => {
      const themeOrder = moveInList(s.themeOrder, id, beforeId)
      if (themeOrder === s.themeOrder) return s
      return { themeOrder, layers: applyGroupOrder(s.layers, themeOrder, s.subthemeOrder) }
    }),

  moveSubtheme: (themeId, id, beforeId) =>
    set((s) => {
      const current = s.subthemeOrder[themeId]
      if (!current) return s
      const next = moveInList(current, id, beforeId)
      if (next === current) return s
      const subthemeOrder = { ...s.subthemeOrder, [themeId]: next }
      return { subthemeOrder, layers: applyGroupOrder(s.layers, s.themeOrder, subthemeOrder) }
    }),
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/layerVisibility.test.ts tests/lib/layerOrder.test.ts`
Expected: PASS.

Run: `npm test`
Expected: every file passes.

- [ ] **Step 5: Lint, typecheck and commit**

Run: `npx eslint lib/mapa/store.ts tests/lib/layerVisibility.test.ts`
Expected: no output.

Run: `npx tsc --noEmit -p . 2>&1 | grep -c "error TS"`
Expected: `5`.

```bash
git add lib/mapa/store.ts tests/lib/layerVisibility.test.ts
git commit -m "feat: draw the rasters in theme and subtheme order"
```

---

### Task 3: Persist the theme and subtheme order

**Files:**
- Modify: `lib/mapa/persistState.ts`: imports, `PersistedState`, `LiveState`, `RestoredState`, `buildPersisted`, `sanitizePersisted`'s return.
- Modify: `lib/mapa/store.ts`: the initial order and the persistence subscription (lines 497–516).
- Test: `tests/lib/persistState.test.ts`: update the `round-trips a payload built from live state` case and add two cases.

**Interfaces:**
- Consumes: `sanitizeThemeOrder`, `sanitizeSubthemeOrder`, `DEFAULT_THEME_ORDER`, `DEFAULT_SUBTHEME_ORDER` from Task 1; the store's `themeOrder` / `subthemeOrder` from Task 2.
- Produces:
  - `LiveState` and `PersistedState` gain `themeOrder: string[]` and `subthemeOrder: Record<string, string[]>`;
  - `RestoredState` gains the same two fields, always sanitized, and the defaults when the payload has none.

  The store passes and reads them in this task.

- [ ] **Step 1: Write the failing tests**

In `tests/lib/persistState.test.ts`, add to the imports:

```ts
import { DEFAULT_SUBTHEME_ORDER, DEFAULT_THEME_ORDER } from '@/lib/mapa/layerOrder'
```

Replace the case `round-trips a payload built from live state`:

```ts
  it('round-trips a payload built from live state', () => {
    const payload = buildPersisted({
      layers: config,
      basemapId: 'esri-imagery',
      temporalDate: {},
      view: null,
      drawing: null,
    })

    const restored = sanitizePersisted(payload, config)

    expect(restored?.basemapId).toBe('esri-imagery')
    expect(restored?.layers.map((l) => l.id)).toEqual(['bioma', 'solo_carbono', 'fogo_frequencia'])
  })
```

with:

```ts
  it('round-trips a payload built from live state, theme and subtheme order included', () => {
    const subthemeOrder = { ...DEFAULT_SUBTHEME_ORDER, ambiente: ['clima', 'vegetacao'] }
    const payload = buildPersisted({
      layers: config,
      basemapId: 'esri-imagery',
      temporalDate: {},
      view: null,
      drawing: null,
      themeOrder: ['ambiente', 'carbono', 'uso_solo'],
      subthemeOrder,
    })

    const restored = sanitizePersisted(payload, config)

    expect(restored?.basemapId).toBe('esri-imagery')
    expect(restored?.layers.map((l) => l.id)).toEqual(['bioma', 'solo_carbono', 'fogo_frequencia'])
    expect(restored?.themeOrder).toEqual(['ambiente', 'carbono', 'uso_solo'])
    expect(restored?.subthemeOrder).toEqual(subthemeOrder)
  })

  it('gives a payload saved before the order existed the default order', () => {
    const restored = sanitizePersisted(
      { version: PERSIST_VERSION, layers: [], basemapId: 'carto-positron' },
      config,
    )

    expect(restored?.themeOrder).toEqual(DEFAULT_THEME_ORDER)
    expect(restored?.subthemeOrder).toEqual(DEFAULT_SUBTHEME_ORDER)
  })

  it('checks a stored order against groups.ts', () => {
    const restored = sanitizePersisted(
      {
        version: PERSIST_VERSION,
        layers: [],
        basemapId: 'carto-positron',
        themeOrder: ['territorio', 'uso_solo', 'gone'],
        subthemeOrder: { carbono: 'not a list' },
      },
      config,
    )

    expect(restored?.themeOrder).toEqual(['uso_solo', 'carbono', 'ambiente'])
    expect(restored?.subthemeOrder.carbono).toEqual(DEFAULT_SUBTHEME_ORDER.carbono)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lib/persistState.test.ts`
Expected: FAIL on the three cases, because `themeOrder` / `subthemeOrder` come back `undefined`. Every other case passes.

- [ ] **Step 3: Carry the orders through the payload**

In `lib/mapa/persistState.ts`, add to the imports:

```ts
import { sanitizeSubthemeOrder, sanitizeThemeOrder } from '@/lib/mapa/layerOrder'
```

Add the two fields at the end of `PersistedState`, `LiveState` and `RestoredState`:

```ts
  /** The user's draw order: thematic theme ids, then subtheme ids per theme. */
  themeOrder: string[]
  subthemeOrder: Record<string, string[]>
```

In `buildPersisted`, after `drawing: live.drawing,` add:

```ts
    themeOrder: live.themeOrder,
    subthemeOrder: live.subthemeOrder,
```

In `sanitizePersisted`'s returned object, after `drawing: restoreDrawing(raw.drawing),` add:

```ts
    // Optional in the payload: one saved before they existed gets the default.
    themeOrder: sanitizeThemeOrder(raw.themeOrder),
    subthemeOrder: sanitizeSubthemeOrder(raw.subthemeOrder),
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/persistState.test.ts`
Expected: PASS.

- [ ] **Step 5: The store starts from the stored order and saves it**

In `lib/mapa/store.ts`, after `export const camadasARestaurar …` (the block ending near line 34), add:

```ts
// The user's draw order, and `layers` sorted by it from the first render on.
const ordemTemas = restaurado?.themeOrder ?? DEFAULT_THEME_ORDER
const ordemSubtemas = restaurado?.subthemeOrder ?? DEFAULT_SUBTHEME_ORDER
```

Replace the three initial-state lines from Task 2:

```ts
  layers: applyGroupOrder(restaurado?.layers ?? (appConfig.layers as LayerConfig[]), DEFAULT_THEME_ORDER, DEFAULT_SUBTHEME_ORDER),
  themeOrder: DEFAULT_THEME_ORDER,
  subthemeOrder: DEFAULT_SUBTHEME_ORDER,
```

with:

```ts
  layers: applyGroupOrder(restaurado?.layers ?? (appConfig.layers as LayerConfig[]), ordemTemas, ordemSubtemas),
  themeOrder: ordemTemas,
  subthemeOrder: ordemSubtemas,
```

In the persistence subscription's `writePersisted({ … })`, add after `drawing: s.drawing,`:

```ts
        themeOrder: s.themeOrder,
        subthemeOrder: s.subthemeOrder,
```

- [ ] **Step 6: Test, lint, typecheck and commit**

Run: `npm test`
Expected: every file passes.

Run: `npx eslint lib/mapa/persistState.ts lib/mapa/store.ts tests/lib/persistState.test.ts`
Expected: no output.

Run: `npx tsc --noEmit -p . 2>&1 | grep -c "error TS"`
Expected: `5`.

```bash
git add lib/mapa/persistState.ts lib/mapa/store.ts tests/lib/persistState.test.ts
git commit -m "feat: persist the theme and subtheme order"
```

---

### Task 4: Drag themes and subtheme headers in the sidebar

**Files:**
- Create: `lib/mapa/dropSlot.ts`
- Test: `tests/lib/dropSlot.test.ts`
- Modify: `components/mapa/Sidebar.tsx`
- Modify: `lib/mapa/store.ts` (remove `reorderLayer`), `lib/mapa/analysisTargets.ts:9-11` and `components/mapa/MapView.tsx:828-830` (comments only)
- Modify: `config/mapa/groups.ts:20-21` (comment), `CLAUDE.md:47`

**Interfaces:**
- Consumes: `orderThemes` (Task 1); store `themeOrder`, `subthemeOrder`, `moveTheme`, `moveSubtheme` (Task 2).
- Produces: `slotBefore(y: number, anchors: { id: string; mid: number }[]): string | null`.

- [ ] **Step 1: Write the failing test for the slot rule**

Create `tests/lib/dropSlot.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { slotBefore } from '@/lib/mapa/dropSlot'

const anchors = [
  { id: 'carbono', mid: 100 },
  { id: 'uso_solo', mid: 200 },
  { id: 'ambiente', mid: 300 },
]

describe('slotBefore', () => {
  it('lands in front of the first section whose midpoint is below the pointer', () => {
    expect(slotBefore(150, anchors)).toBe('uso_solo')
    expect(slotBefore(299, anchors)).toBe('ambiente')
  })

  it('reads anything above the first midpoint as the first slot', () => {
    // The search box and Território sit above the first thematic card.
    expect(slotBefore(-40, anchors)).toBe('carbono')
  })

  it('reads anything below the last midpoint as the end', () => {
    expect(slotBefore(301, anchors)).toBeNull()
    expect(slotBefore(10, [])).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/dropSlot.test.ts`
Expected: FAIL, with `@/lib/mapa/dropSlot` unresolved.

- [ ] **Step 3: Write `lib/mapa/dropSlot.ts`**

```ts
/**
 * Where a dragged panel section lands: in front of the first section whose
 * midpoint is below the pointer, or at the end (null). Anything above the first
 * midpoint is the first slot, so overshooting past the top still drops there.
 */
export function slotBefore(y: number, anchors: { id: string; mid: number }[]): string | null {
  return anchors.find((anchor) => y < anchor.mid)?.id ?? null
}
```

Run: `npx vitest run tests/lib/dropSlot.test.ts`
Expected: PASS.

- [ ] **Step 4: Imports, order and theme drag state in `Sidebar`**

In `components/mapa/Sidebar.tsx`, add after `import { useStore } from '@/lib/mapa/store'`:

```ts
import { orderThemes } from '@/lib/mapa/layerOrder'
import { slotBefore } from '@/lib/mapa/dropSlot'
```

(`IcGrip` stays in the icon import: the new `Grip` uses it.)

In `Sidebar`, after `const layers = useStore((s) => s.layers)`, add:

```ts
  const themeOrder = useStore((s) => s.themeOrder)
  const subthemeOrder = useStore((s) => s.subthemeOrder)
  const moveTheme = useStore((s) => s.moveTheme)
  // The panel shows the user's order, which is also the map's draw order.
  const orderedThemes = orderThemes(THEMES, themeOrder, subthemeOrder)
```

Replace `const porTema = THEMES` with `const porTema = orderedThemes`. In `aoBuscar`, replace `const primeiro = THEMES.flatMap(` with `const primeiro = orderedThemes.flatMap(`.

After the line `const [abertoSubtemaKey, setAbertoSubtemaKey] = useState<string | null>(null)`, add:

```tsx
  // Grips only when the order changes something on the map, and not over a
  // filtered list, where reordering would be guesswork.
  const reorderable = thematicCount >= 2 && !normalizedQuery

  // The theme being dragged, and the slot its drop would use.
  const [themeDrag, setThemeDrag] = useState<string | null>(null)
  const [themeDrop, setThemeDrop] = useState<DropSlot>(null)
  const clearThemeDrag = () => {
    setThemeDrag(null)
    setThemeDrop(null)
  }

  const onThemeDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    // A subtheme drag, a file or a text selection: not a theme drop.
    if (!themeDrag) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setThemeDrop({ before: slotBefore(event.clientY, dropAnchors(event.currentTarget, 'data-theme-id', '[data-theme-card]')) })
  }

  // Past the zone's edge a release drops nothing, so the line goes too. A move
  // between two of its children also fires dragleave; the next dragover puts
  // the line back.
  const onThemeDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (themeDrag && !event.currentTarget.contains(event.relatedTarget as Node | null)) setThemeDrop(null)
  }

  const onThemeDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!themeDrag) return
    event.preventDefault()
    if (themeDrop) moveTheme(themeDrag, themeDrop.before)
    clearThemeDrag()
  }
```

- [ ] **Step 5: The hint in the strip**

Replace:

```tsx
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: c.text }}>
              {thematicCount === 1 ? '1 camada temática ligada' : `${thematicCount} camadas temáticas ligadas`}
            </span>
```

with:

```tsx
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>
                {thematicCount === 1 ? '1 camada temática ligada' : `${thematicCount} camadas temáticas ligadas`}
              </span>
              {/* The grips only show from the second raster on; this says what they do. */}
              {reorderable && (
                <span style={{ fontSize: 12, fontWeight: 500, color: c.textDim, lineHeight: 1.35 }}>
                  Arraste temas e subcategorias pela alça ⠿ para mudar a ordem no mapa
                </span>
              )}
            </span>
```

- [ ] **Step 6: The body is the themes' drop zone, and each theme a drag source**

Replace:

```tsx
        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
```

with:

```tsx
        {/* Body. Also the themes' drop zone, all of it: overshooting up past the
            first thematic card (into the search box or Território) reads as the
            first slot, and below the last as the end. */}
        <div
          onDragOver={onThemeDragOver}
          onDragLeave={onThemeDragLeave}
          onDrop={onThemeDrop}
          style={{ overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
```

Replace:

```tsx
            porTema.map(({ tema, subtemas }) => (
              <ThemeSection
                key={tema.id}
                theme={theme}
                tema={tema}
                subtemas={subtemas}
                infoId={infoId}
                onInfo={onInfo}
                open={abertoTemaId === tema.id}
                openSubthemeKey={abertoSubtemaKey}
                onToggle={() => setAbertoTemaId((atual) => (atual === tema.id ? null : tema.id))}
                onToggleSubtheme={(id) => setAbertoSubtemaKey((atual) => (atual === id ? null : id))}
              />
            ))
```

with:

```tsx
            porTema.map(({ tema, subtemas }, i) => {
              // Território is fixed on top: no grip and no slot of its own.
              const thematic = tema.id !== TERRITORY_THEME_ID
              return (
                <div
                  key={tema.id}
                  data-theme-id={thematic ? tema.id : undefined}
                  style={{ position: 'relative' }}
                  onDragStart={(event) => {
                    // Only this theme's grip: a subtheme grip's dragstart bubbles
                    // through here too, and so does a drag of selected text.
                    if (!(event.target as Element).closest?.('[data-grip="theme"]')) return
                    const card = event.currentTarget.querySelector<HTMLElement>('[data-theme-card]') ?? event.currentTarget
                    const box = card.getBoundingClientRect()
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData(THEME_DRAG_TYPE, tema.id)
                    event.dataTransfer.setDragImage(card, event.clientX - box.left, event.clientY - box.top)
                    setThemeDrag(tema.id)
                  }}
                  onDragEnd={clearThemeDrag}
                >
                  {thematic && themeDrop?.before === tema.id && <DropIndicator color={c.accent} gap={10} />}
                  <ThemeSection
                    theme={theme}
                    tema={tema}
                    subtemas={subtemas}
                    infoId={infoId}
                    onInfo={onInfo}
                    open={abertoTemaId === tema.id}
                    openSubthemeKey={abertoSubtemaKey}
                    onToggle={() => setAbertoTemaId((atual) => (atual === tema.id ? null : tema.id))}
                    onToggleSubtheme={(id) => setAbertoSubtemaKey((atual) => (atual === id ? null : id))}
                    reorderable={reorderable && thematic}
                  />
                  {i === porTema.length - 1 && themeDrop?.before === null && <DropIndicator color={c.accent} gap={10} bottom />}
                </div>
              )
            })
```

- [ ] **Step 7: Replace the section components**

Replace everything from the line `// Section (accordion)` up to, not including, the line `// Layer row (card)` with:

```tsx
// Section (accordion)

// Drag payload types. Custom, so a release over a text field pastes nothing.
const THEME_DRAG_TYPE = 'application/x-caativar-theme'
const SUBTHEME_DRAG_TYPE = 'application/x-caativar-subtheme'

/** The slot a drop would use: in front of the section with this id, or the end (null). */
type DropSlot = { before: string | null } | null

// Midpoint of each section a drop can land between, read from its header, so an
// open section's long list does not push its midpoint down.
function dropAnchors(container: HTMLElement, attr: 'data-theme-id' | 'data-subtheme-id', headerSelector: string) {
  return [...container.querySelectorAll<HTMLElement>(`[${attr}]`)].map((item) => {
    const box = (item.querySelector(headerSelector) ?? item).getBoundingClientRect()
    return { id: item.getAttribute(attr) ?? '', mid: box.top + box.height / 2 }
  })
}

function ThemeSection({
  theme, tema, subtemas, infoId, onInfo, open, openSubthemeKey, onToggle, onToggleSubtheme, reorderable,
}: {
  theme: PlatformTheme; tema: ThemeInfo
  subtemas: { subtema: SubthemeInfo; itens: LayerConfig[] }[]
  infoId: string | null; onInfo: (id: string) => void
  open: boolean; openSubthemeKey: string | null; onToggle: () => void; onToggleSubtheme: (id: string) => void
  /** Grips on this card and on its subthemes; always false for Território. */
  reorderable: boolean
}) {
  const layers = subtemas.flatMap(({ itens }) => itens)
  const c = theme.colors
  const ativas = layers.filter((layer) => layer.visible).length
  const moveSubtheme = useStore((s) => s.moveSubtheme)
  // The subtheme being dragged, and the slot its drop would use.
  const [subDrag, setSubDrag] = useState<string | null>(null)
  const [subDrop, setSubDrop] = useState<DropSlot>(null)
  const clearSubDrag = () => {
    setSubDrag(null)
    setSubDrop(null)
  }

  // The whole block, card and list, is the subthemes' drop zone: overshooting
  // up into the card reads as the first slot. A theme drag passes through to
  // the panel body, which handles it.
  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!subDrag) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setSubDrop({ before: slotBefore(event.clientY, dropAnchors(event.currentTarget, 'data-subtheme-id', '[data-subtheme-header]')) })
  }

  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (subDrag && !event.currentTarget.contains(event.relatedTarget as Node | null)) setSubDrop(null)
  }

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!subDrag) return
    event.preventDefault()
    if (subDrop) moveSubtheme(tema.id, subDrag, subDrop.before)
    clearSubDrag()
  }

  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <div data-theme-card style={{ position: 'relative' }}>
        {reorderable && <Grip kind="theme" color={c.textDim} />}
        <button
          onClick={onToggle}
          aria-expanded={open}
          style={{
            width: '100%', minHeight: 92, display: 'flex', alignItems: 'center', gap: 9,
            // Room for the grip over the left edge while it shows.
            padding: reorderable ? '10px 11px 10px 26px' : '10px 11px',
            cursor: 'pointer', textAlign: 'left', overflow: 'hidden',
            backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${c.bgCard} ${open ? '74%' : '66%'}, transparent) 0%, color-mix(in srgb, ${c.bgCard} ${open ? '52%' : '44%'}, transparent) 58%, ${tema.color}22 100%), url(${tema.image})`,
            backgroundPosition: 'center, center 62%', backgroundSize: 'cover, cover',
            border: `1px solid ${open ? `${tema.color}66` : c.border}`, borderRadius: 11,
            transition: 'border-color .16s, filter .16s',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800, color: c.text, letterSpacing: '.01em', flex: 1, minWidth: 0 }}>{tema.label}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: c.dim, background: c.mist, borderRadius: 999, padding: '1px 7px', flexShrink: 0 }}>{layers.length}</span>
          {ativas > 0 && <span style={{ fontSize: 11.5, fontWeight: 800, color: '#fff', flexShrink: 0, background: tema.color, borderRadius: 999, padding: '1px 7px' }}>{ativas} ativa{ativas === 1 ? '' : 's'}</span>}
          <span style={{ color: c.textDim, display: 'flex', flexShrink: 0 }}>{open ? <IcChevronUp size={14} /> : <IcChevronDown size={14} />}</span>
        </button>
      </div>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '4px 0 10px 9px', paddingLeft: 11, borderLeft: `2px solid ${tema.color}44` }}>
          {subtemas.map(({ subtema, itens }, i) => {
            const key = `${tema.id}:${subtema.id}`
            return (
              <div
                key={key}
                data-subtheme-id={subtema.id}
                style={{ position: 'relative' }}
                onDragStart={(event) => {
                  if (!(event.target as Element).closest?.('[data-grip="subtheme"]')) return
                  const header = event.currentTarget.querySelector<HTMLElement>('[data-subtheme-header]') ?? event.currentTarget
                  const box = header.getBoundingClientRect()
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData(SUBTHEME_DRAG_TYPE, subtema.id)
                  event.dataTransfer.setDragImage(header, event.clientX - box.left, event.clientY - box.top)
                  setSubDrag(subtema.id)
                }}
                onDragEnd={clearSubDrag}
              >
                {subDrop?.before === subtema.id && <DropIndicator color={c.accent} gap={4} />}
                <SubthemeSection
                  theme={theme}
                  subtheme={subtema}
                  layers={itens}
                  infoId={infoId}
                  onInfo={onInfo}
                  open={openSubthemeKey === key}
                  onToggle={() => onToggleSubtheme(key)}
                  grip={reorderable}
                />
                {i === subtemas.length - 1 && subDrop?.before === null && <DropIndicator color={c.accent} gap={4} bottom />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SubthemeSection({
  theme, subtheme, layers, infoId, onInfo, open, onToggle, grip,
}: {
  theme: PlatformTheme; subtheme: SubthemeInfo; layers: LayerConfig[]
  infoId: string | null; onInfo: (id: string) => void
  open: boolean; onToggle: () => void
  /** Shows the grip that drags this subtheme within its theme. */
  grip: boolean
}) {
  const c = theme.colors
  const ativas = layers.filter((l) => l.visible).length

  return (
    <div>
      <div data-subtheme-header style={{ position: 'relative' }}>
        {grip && <Grip kind="subtheme" color={c.caption} />}
        <button
          onClick={onToggle}
          aria-expanded={open}
          style={{
            width: '100%', minHeight: 34, display: 'flex', alignItems: 'center', gap: 7,
            padding: grip ? '6px 8px 6px 24px' : '6px 8px',
            cursor: 'pointer', textAlign: 'left', background: open ? c.mist : 'transparent',
            border: 'none', borderRadius: 7,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: c.text, flex: 1, minWidth: 0 }}>{subtheme.label}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: c.dim }}>{layers.length}</span>
          {ativas > 0 && <span style={{ fontSize: 11.5, fontWeight: 800, color: c.accentInk }}>{ativas} ativa{ativas === 1 ? '' : 's'}</span>}
          <span style={{ color: c.textDim, display: 'flex', flexShrink: 0 }}>{open ? <IcChevronUp size={13} /> : <IcChevronDown size={13} />}</span>
        </button>
      </div>
      {open && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            margin: '2px 0 10px 9px', paddingLeft: 11,
            borderLeft: `2px solid ${c.border}`,
          }}
        >
          {layers.map((layer) => (
            <LayerRow key={layer.id} theme={theme} layer={layer} infoOpen={infoId === layer.id} onInfo={onInfo} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Drag handle for a theme card or a subtheme header. It sits beside the button,
 * over its left edge, not inside it: a press on it must not toggle the section,
 * and Firefox does not start a drag from inside a button. It is the only
 * draggable element, so a drag never starts from anywhere else.
 */
function Grip({ kind, color }: { kind: 'theme' | 'subtheme'; color: string }) {
  return (
    <span
      draggable
      data-grip={kind}
      aria-hidden="true"
      title="Arraste para reordenar"
      style={{
        position: 'absolute', left: 3, top: '50%', transform: 'translateY(-50%)', zIndex: 1,
        color, display: 'flex', cursor: 'grab', padding: '6px 3px',
      }}
    >
      <IcGrip size={13} />
    </span>
  )
}

/** Where a dragged theme or subtheme would land: a line centred in the list's gap. */
function DropIndicator({ color, gap, bottom = false }: { color: string; gap: number; bottom?: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        [bottom ? 'bottom' : 'top']: -(gap / 2 + 1.5),
        left: 4,
        right: 4,
        height: 3,
        borderRadius: 99,
        background: color,
        zIndex: 2,
        pointerEvents: 'none',
      }}
    />
  )
}

```

- [ ] **Step 8: Drop the drag from `LayerRow`**

Replace the `LayerRow` signature:

```tsx
function LayerRow({
  theme, layer, infoOpen, onInfo, onDragStart, onDragEnd,
}: {
  theme: PlatformTheme
  layer: LayerConfig
  infoOpen: boolean
  onInfo: (id: string) => void
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}) {
```

with:

```tsx
function LayerRow({
  theme, layer, infoOpen, onInfo,
}: {
  theme: PlatformTheme
  layer: LayerConfig
  infoOpen: boolean
  onInfo: (id: string) => void
}) {
```

Replace the start of its root div:

```tsx
    <div
      // Not draggable itself: dragstart fires on the draggable element, never on
      // the child that was pressed, so a draggable card cannot tell a press on the
      // opacity slider or a button from one on the grip. The grip's dragstart
      // bubbles up to these handlers.
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      // Lighter visual weight than the card header: no border and a small radius,
```

with:

```tsx
    <div
      // Lighter visual weight than the card header: no border and a small radius,
```

Delete the grip span in its first row:

```tsx
        <span
          draggable
          aria-hidden="true"
          title="Arraste para reordenar"
          // Now the only place a drag can start, so the padding widens the hit
          // area and the negative margin keeps the icon where it was.
          style={{ color: c.caption, display: 'flex', flexShrink: 0, cursor: 'grab', padding: '4px 3px', margin: '-4px -3px' }}
        >
          <IcGrip size={13} />
        </span>
```

- [ ] **Step 9: Remove `reorderLayer`, now without a caller**

In `lib/mapa/store.ts`, delete the interface line:

```ts
  reorderLayer:  (id: string, toIndex: number) => void
```

and the whole action:

```ts
  reorderLayer: (id, toIndex) =>
    set((s) => {
      const fromIndex = s.layers.findIndex((l) => l.id === id)
      if (fromIndex < 0 || fromIndex === toIndex) return s
      const layers = [...s.layers]
      const [moved] = layers.splice(fromIndex, 1)
      // Removing the source before inserting shifts every index above it down
      // by one, so when dragging downward the target index must be adjusted or
      // the item lands one slot past the drop indicator.
      const adjusted = fromIndex < toIndex ? toIndex - 1 : toIndex
      layers.splice(adjusted, 0, moved)
      return { layers }
    }),
```

together with the blank line that followed it. In the persistence comment, replace `// toggleLayer, setOpacity, reorderLayer, setBasemap and setTemporalDate. Five` with `// toggleLayer, setOpacity, moveTheme, setBasemap and setTemporalDate. Five`.

In `lib/mapa/analysisTargets.ts`, replace:

```ts
 * With every recorte off the click lands on nothing at all; with no raster on,
 * or with the recorte dragged below the rasters by `reorderLayer`, it still
 * highlights and names the feature, but there is nothing under it to measure.
```

with:

```ts
 * With every recorte off the click lands on nothing at all; with no raster on,
 * it still highlights and names the feature, but there is nothing under it to
 * measure. A recorte below a raster would be the same, but `layerOrder.ts`
 * keeps every vector above the rasters, so that check is only a guard.
```

In `components/mapa/MapView.tsx`, replace:

```ts
        // moment a raster is switched on. With rasters on but this recorte
        // dragged below them by `reorderLayer`, the click never passed through
        // a raster at all -- rasters are not queryable, so the feature answers
```

with:

```ts
        // moment a raster is switched on. With rasters on but this recorte
        // below them (a guard: `layerOrder.ts` keeps vectors on top), the click
        // never passed through a raster at all -- rasters are not queryable, so the feature answers
```

- [ ] **Step 10: Check what is left of the old drag**

Run: `grep -rn -E "reorderLayer|data-layer-index|dropIndex|draggingId|text/plain" components lib tests`
Expected: no output.

- [ ] **Step 11: The groups.ts comment and `CLAUDE.md`**

In `config/mapa/groups.ts`, replace:

```ts
// The order of this structure defines the panel navigation. Layers declare only
// their theme and subtheme ids in layers.json.
```

with:

```ts
// The order of this structure is the default order of the panel and of the
// map's rasters (themes, then subthemes); the user can drag both in the panel
// (lib/mapa/layerOrder.ts). Layers declare only their theme and subtheme ids in
// layers.json.
```

In `CLAUDE.md`, bullet **Order matters**, replace the first sentence:

```
- **Order matters**: vectors sit above rasters, which is what lets a click on a feature compute statistics for the raster beneath it.
```

with:

```
- **Order matters**: vectors sit above rasters, which is what lets a click on a feature compute statistics for the raster beneath it. The store's `layers` is derived by `lib/mapa/layerOrder.ts`: vectors on top in `layers.json` order, then rasters by the user's theme order and subtheme order (`themeOrder` / `subthemeOrder`, dragged by grips in the sidebar and persisted). Every thematic subtheme is exclusive, so that fixes the order of the visible rasters.
```

Leave the rest of the bullet unchanged.

- [ ] **Step 12: Lint, typecheck, test and commit**

Run: `npx eslint components/mapa/Sidebar.tsx lib/mapa/dropSlot.ts tests/lib/dropSlot.test.ts config/mapa/groups.ts lib/mapa/store.ts lib/mapa/analysisTargets.ts`
Expected: no output.

Run: `npx tsc --noEmit -p . 2>&1 | grep -c "error TS"`
Expected: `5`, the pre-existing test errors.

Run: `npm test`
Expected: every file passes.

```bash
git add lib/mapa/dropSlot.ts tests/lib/dropSlot.test.ts components/mapa/Sidebar.tsx lib/mapa/store.ts lib/mapa/analysisTargets.ts components/mapa/MapView.tsx config/mapa/groups.ts CLAUDE.md
git commit -m "feat: drag themes and subthemes in the panel to set the map's draw order"
```

---

### Task 5: Verify the branch and hand it to the user

**Files:** none changed, unless a check fails.

- [ ] **Step 1: Full local checks**

Run: `npm test`, then `npm run build`, then `npm run lint`, separately.
Expected:
- `npm test`: every test passes;
- `npm run build`: `✓ Compiled successfully`;
- `npm run lint`: only the baseline, 3 errors in `FloatingSearchBar.tsx` and 2 warnings in `MapView.tsx`.

- [ ] **Step 2: Start the dev server**

Stop the old worktree's server on port 3001 (the `legend-raster-order` worktree) first. Copy `.env.local` from the main checkout into this worktree if it is missing, and run `npm ci` if `node_modules` is missing. Then run in the background: `npx next dev -p 3001`.
Expected: `✓ Ready`. The user's Chrome session cookie for `localhost` works on any port. If `/mapa` redirects to `/login`, ask the user to log in; never enter credentials.

- [ ] **Step 3: Scripted browser check (Review Focus 1–3)**

In a new tab of the MCP tab group on `http://localhost:3001/mapa`:
1. Open Carbono, switch on a Biomassa layer and Carbono do solo.
2. Open Uso do solo and switch on Uso e Cobertura da Terra.
3. Reopen Carbono, so its subthemes show.

Then run with `javascript_tool`:

```js
window.__sidebarCheck = async () => {
  const tick = (ms = 80) => new Promise((r) => setTimeout(r, ms))
  const themeIds = () => [...document.querySelectorAll('[data-theme-id]')].map((el) => el.dataset.themeId)
  const subIds = () => [...document.querySelectorAll('[data-theme-id="carbono"] [data-subtheme-id]')].map((el) => el.dataset.subthemeId)
  const lines = () => document.querySelectorAll('[data-theme-id] > div[style*="pointer-events: none"], [data-subtheme-id] > div[style*="pointer-events: none"]').length
  const fire = (el, type, dt, y, extra = {}) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: el.getBoundingClientRect().left + 20, clientY: y, ...extra }))
  const mid = (el) => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2
  const search = document.querySelector('input[aria-label="Buscar camadas"]')
  const body = search.closest('[style*="overflow-y: auto"]')
  const canvas = document.querySelector('canvas')
  const out = { themesBefore: themeIds(), subsBefore: subIds() }

  // 1. Theme: drag the last card up, cross an open subtheme block, overshoot into the search box, release there.
  let dt = new DataTransfer()
  let grip = document.querySelector(`[data-theme-id="${themeIds().at(-1)}"] [data-grip="theme"]`)
  fire(grip, 'dragstart', dt, mid(grip)); await tick()
  const subHeader = document.querySelector('[data-theme-id="carbono"] [data-subtheme-header]')
  fire(subHeader, 'dragover', dt, mid(subHeader)); await tick()
  out.themeLineOverSubtheme = lines()
  fire(search, 'dragover', dt, mid(search)); await tick()
  out.themeLineOverSearch = lines()
  fire(search, 'drop', dt, mid(search)); fire(grip, 'dragend', dt, 0); await tick(300)
  out.themesAfter = themeIds()

  // 2. Subtheme: drag Carbono's last subtheme up into the Carbono card, release there; then drag one out of the panel.
  dt = new DataTransfer()
  const lastSub = subIds().at(-1)
  grip = document.querySelector(`[data-subtheme-id="${lastSub}"] [data-grip="subtheme"]`)
  const card = document.querySelector('[data-theme-id="carbono"] [data-theme-card]')
  fire(grip, 'dragstart', dt, mid(grip)); await tick()
  fire(card, 'dragover', dt, mid(card)); await tick()
  out.subLineOverCard = lines()
  fire(card, 'drop', dt, mid(card)); fire(grip, 'dragend', dt, 0); await tick(300)
  out.subsAfter = subIds()
  dt = new DataTransfer()
  grip = document.querySelector(`[data-subtheme-id="${subIds().at(-1)}"] [data-grip="subtheme"]`)
  fire(grip, 'dragstart', dt, mid(grip)); await tick()
  fire(card, 'dragover', dt, mid(card)); await tick()
  // The subthemes' zone is the ThemeSection root: the wrapper's child that is not a drop line.
  const zone = [...document.querySelector('[data-theme-id="carbono"]').children].find((el) => !el.style.pointerEvents)
  zone.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true, dataTransfer: dt, relatedTarget: canvas }))
  await tick()
  out.subLineAfterLeaving = lines()
  fire(grip, 'dragend', dt, 0); await tick()

  // 3. A drag of selected text in a card starts no reorder.
  dt = new DataTransfer()
  const label = document.querySelector('[data-theme-id="carbono"] [data-theme-card] button span')
  fire(label, 'dragstart', dt, mid(label)); await tick()
  fire(search, 'dragover', dt, mid(search)); await tick()
  out.lineForTextDrag = lines()
  fire(label, 'dragend', dt, 0); await tick()

  // 4. Leaving the panel clears a theme line.
  dt = new DataTransfer()
  grip = document.querySelector(`[data-theme-id="${themeIds().at(-1)}"] [data-grip="theme"]`)
  fire(grip, 'dragstart', dt, mid(grip)); await tick()
  fire(search, 'dragover', dt, mid(search)); await tick()
  body.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true, dataTransfer: dt, relatedTarget: canvas }))
  await tick()
  out.themeLineAfterLeaving = lines()
  fire(grip, 'dragend', dt, 0); await tick()
  return out
}
JSON.stringify(await window.__sidebarCheck())
```

Expected:
- `themeLineOverSubtheme: 1` and `themeLineOverSearch: 1`;
- `themesAfter[0]` equals `themesBefore.at(-1)`;
- `subLineOverCard: 1`;
- `subsAfter[0]` equals `subsBefore.at(-1)`;
- `subLineAfterLeaving: 0`, `lineForTextDrag: 0` and `themeLineAfterLeaving: 0`.

The legend lists the rasters in the new order.

Then put the order back, so the user starts from the default. The check moved the last theme and the last Carbono subtheme to the top, so drag each back to the end:

```js
window.__sidebarRestore = async () => {
  const tick = (ms = 80) => new Promise((r) => setTimeout(r, ms))
  const fire = (el, type, dt, y) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: el.getBoundingClientRect().left + 20, clientY: y }))
  const toEnd = async (gripSelector, zone) => {
    const dt = new DataTransfer()
    const grip = document.querySelector(gripSelector)
    const y = zone.getBoundingClientRect().bottom - 2
    fire(grip, 'dragstart', dt, 0); await tick()
    fire(zone, 'dragover', dt, y); await tick()
    fire(zone, 'drop', dt, y); fire(grip, 'dragend', dt, 0); await tick(300)
  }
  const first = (attr, scope = document) => scope.querySelector(`[${attr}]`).getAttribute(attr)
  await toEnd(`[data-theme-id="${first('data-theme-id')}"] [data-grip="theme"]`, document.querySelector('input[aria-label="Buscar camadas"]').closest('[style*="overflow-y: auto"]'))
  const carbono = document.querySelector('[data-theme-id="carbono"]')
  await toEnd(`[data-subtheme-id="${first('data-subtheme-id', carbono)}"] [data-grip="subtheme"]`, carbono.querySelector('[data-subtheme-id]').parentElement)
  return {
    themes: [...document.querySelectorAll('[data-theme-id]')].map((el) => el.dataset.themeId),
    subs: [...carbono.querySelectorAll('[data-subtheme-id]')].map((el) => el.dataset.subthemeId),
  }
}
JSON.stringify(await window.__sidebarRestore())
```

Expected: `themes` equals `themesBefore`, and `subs` equals `subsBefore`.

- [ ] **Step 4: Manual check, with the user**

Ask the user to check on `http://localhost:3001/mapa`:

1. With one raster on: no grips, no hint.
2. With a Biomassa layer and Uso e cobertura da terra on: grips on the Carbono, Uso do solo and Ambiente cards and on the open theme's subtheme headers, plus the hint in the strip. Território has none.
3. Dragging Carbono above Uso do solo swaps the two rasters on the map and in the legend.
4. With Biomassa and Carbono do solo on, dragging Carbono do solo above Biomassa inside Carbono swaps them.
5. Clicking a card or header still opens and closes it; pressing or dragging its grip never does (Review Focus 4).
6. Typing in "Buscar camadas" hides the grips and the hint (Review Focus 5).
7. Reloading keeps the theme and subtheme order.
8. The opacity slider moves freely.

- [ ] **Step 5: Stop the server, then push and open the PR only when the user says so**

Push `feat/theme-draw-order` and open a PR against `main`, with the title and body in English. Cover the problem (the within-subtheme drag was a no-op on the map), the rule (theme → subtheme → catalog, recortes on top), the default order change (Uso do solo now above Ambiente), and the tests. No attribution trailer. Then ask whether to delete the local `feat/legend-raster-order` branch and its worktree.
