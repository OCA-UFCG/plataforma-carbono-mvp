# Map draw order by theme and subtheme — design

**Date:** 2026-09-30
**Status:** approved in conversation, section by section, before any code was written.

## 1. Goal

A user reported that moving a layer's opacity slider dragged the whole card along (fixed in
PR #78). Looking into it showed that the sidebar's drag-and-drop barely does anything:

> "o drag and drop atual não é muito util, visto que as camadas estao ordenadas dentro dos temas
> e os temas nao sao reordenaveis"

Each subtheme in the sidebar is its own drop zone, so a layer only moves among the layers of its
own subtheme. The map draws layers in the order of the store's `layers` array, so:

- every thematic subtheme (Carbono, Uso do solo, Ambiente: 13 of them) is `exclusive: true` in
  `config/mapa/groups.ts`. At most one of its layers is on, and reordering it changes nothing on
  the map;
- the Território subthemes hold only vectors, where order only decides which outline is on top;
- the case where order matters, two rasters from different subthemes on at once (e.g. Biomassa
  and Uso e cobertura da terra), is fixed by `layers.json`, and the user cannot change it.

After this work, the user sets the draw order by dragging **themes and subthemes** in the
sidebar. Because every thematic subtheme holds at most one visible raster, ordering subthemes
orders the visible rasters.

**Success:** with Uso e cobertura da terra drawn above a Biomassa layer, dragging the Carbono
card above Uso do solo swaps the two on the map and in the legend.

Out of scope: keyboard and touch reordering, `config/mapa/layers.json`, the GEE routes and the
report module.

### History

A first attempt, on the local branch `feat/legend-raster-order`, never pushed, moved reordering
into the floating legend: a grip on each visible raster. It worked, but in user testing the
gesture was not discoverable:

> "drag and drop pela legenda nao seja a melhor opcao, nao fica claro pro usuario"

Kept from it:
- the invariant (vectors always above rasters, in `layers.json` order);
- the lessons on native drag-and-drop:
  - only the grip is `draggable`;
  - the drop zone covers everywhere the indicator can show, and the indicator clears on leave;
  - a drag payload of a custom type;
  - accept a `dragstart` only from the grip.

## 2. Decisions

Settled with the user before any code was written.

| # | Question | Decision |
|---|---|---|
| 1 | Where does the user set the order? | **In the sidebar, by dragging themes and subthemes.** Not in the legend (§1, History), not by moving subthemes across themes (it would dismantle the catalog). |
| 2 | What can be dragged? | **The Carbono, Uso do solo and Ambiente cards**, and **the subtheme headers inside the open theme**. Território is fixed at the top and has no grip; layer rows have none either. |
| 3 | What does the order mean? | **Draw order.** Recortes on top in `layers.json` order, then rasters by theme order, then subtheme order, then catalog order within a subtheme. |
| 4 | When do grips show? | **Only with two or more thematic layers on**, when order changes something on the map, and not during a layer search. The "N camadas temáticas ligadas" strip then adds the hint *"Arraste temas e subcategorias pela alça ⠿ para mudar a ordem no mapa"*. |
| 5 | Where does a raster land when switched on? | **Where its theme and subtheme put it.** No "goes on top" rule, so a reload cannot scramble the order either. |
| 6 | The legend? | **Unchanged from `main`, read-only.** It already lists visible layers in `layers` order. |
| 7 | Branch | **`feat/theme-draw-order`, fresh from `origin/main`.** The legend attempt stays on its local branch. |

## 3. Architecture

### 3.1 The invariant and the derived order

The store's `layers` array stays the draw order (`layers[0]` on top). `MapView`'s z-order resync,
`analysisTargets.clickableRecortes`, `ResultsSidebar`, `analysisRunner`, `TemporalSlider` and the
legend keep reading it unchanged.

`layers` is always `applyGroupOrder(layers, themeOrder, subthemeOrder)`:
- **vectors first,** in `layers.json` order. A click resolves to a recorte and measures the
  rasters under it, so recortes must sit above them;
- **then the rasters,** sorted by the position of their theme in `themeOrder`, then of their
  subtheme in `subthemeOrder[theme]`, then of the layer in `layers.json`.

### 3.2 `lib/mapa/layerOrder.ts` (new, pure)

```ts
/** Thematic theme ids in groups.ts order; Território is not in it, it is always on top. */
export const DEFAULT_THEME_ORDER: string[]
/** Subtheme ids per thematic theme, in groups.ts order. */
export const DEFAULT_SUBTHEME_ORDER: Record<string, string[]>

/**
 * Moves `id` in front of `beforeId`, or to the end with null. Returns the same array when the
 * position does not change or an id is unknown.
 */
export function moveInList(list: string[], id: string, beforeId: string | null): string[]

/**
 * The draw order (§3.1). Returns the same array when it already holds. A theme or subtheme
 * missing from the orders sorts after the known ones.
 */
export function applyGroupOrder(
  layers: LayerConfig[], themeOrder: string[], subthemeOrder: Record<string, string[]>,
  catalog?: readonly LayerConfig[],
): LayerConfig[]

/**
 * A stored order checked against groups.ts. Unknown ids and duplicates are dropped, groups added
 * since are appended in groups.ts order, and Território is ignored. Anything malformed returns
 * the default.
 */
export function sanitizeThemeOrder(stored: unknown): string[]
export function sanitizeSubthemeOrder(stored: unknown): Record<string, string[]>
```

### 3.3 Store (`lib/mapa/store.ts`)

- **New state:** `themeOrder: string[]` and `subthemeOrder: Record<string, string[]>`, restored
  from storage or else the defaults. At init, `layers` is `applyGroupOrder` of the restored or
  config layers.
- **New actions:**
  - `moveTheme(id, beforeId)` and `moveSubtheme(themeId, id, beforeId)` call `moveInList`;
  - when the list is unchanged they return the state as is, so nothing notifies;
  - otherwise they store the new order and reapply `applyGroupOrder`.
- **Removed:** `reorderLayer`. Its only caller was the sidebar's layer-row drag.
- **`toggleLayer`:** unchanged. A raster switched on keeps the position its groups give it.

### 3.4 Persistence (`lib/mapa/persistState.ts`)

- **What is stored:** the payload gains `themeOrder` and `subthemeOrder`, and the store's
  persistence subscription passes them. `PERSIST_VERSION` stays 1: both are optional.
- **Restoring:** `sanitizePersisted` returns them through `sanitizeThemeOrder` /
  `sanitizeSubthemeOrder`.
- **Stored layer order:** still read, but no longer decides anything for rasters, since the
  store reapplies the group order at load. Orders saved by the old within-subtheme drag stop
  mattering.

### 3.5 Sidebar (`components/mapa/Sidebar.tsx`)

- **Order.** Território first, then the thematic themes in `themeOrder`. Within each, the
  subthemes in `subthemeOrder[theme]`, and the layers in `layers.json` order. The search's "open
  the first group with a result" follows the same order.
- **Layer rows lose their drag:** the grip, `draggable`, the drag state and props,
  `DropIndicator` for rows, and the `data-layer-index` wrapper.
- **When grips show:** `reorderable = thematicCount >= 2 && !normalizedQuery`. When reorderable,
  the "N camadas temáticas ligadas" strip shows the hint line.
- **Grip placement.** Theme cards and subtheme headers are `<button>`s, since a click toggles
  them. A draggable child of a button is unreliable in Firefox, and a drag must not toggle. So
  the grip sits outside the button, absolutely positioned over its left edge, and the button's
  left padding grows while grips show. `title="Arraste para reordenar"`, `aria-hidden`,
  `cursor: grab`, a widened hit area and `data-grip`.
- **Drag.**
  - **Starting.** Only the grip is `draggable`. The section's `onDragStart` accepts an event
    only when `event.target` is inside `[data-grip]`, which keeps a text-selection drag from
    starting a reorder.
  - **Payload.** `dataTransfer` carries `application/x-caativar-theme` or
    `application/x-caativar-subtheme`, never `text/plain`, so a release over a text field pastes
    nothing.
  - **Drag image.** `setDragImage` shows the card or header at the grab point.
  - **Themes.** The drop zone is the whole scrolling body. The slot is picked by each thematic
    card's midpoint. Anything above the first card (the search box, Território) reads as the
    first slot below Território, and below the last as the end.
  - **Subthemes.** The drop zone is the open theme's block (card and subtheme list), and the
    slot is picked by each subtheme section's midpoint.
  - **Leaving.** `dragleave` with a `relatedTarget` outside the zone clears the indicator; the
    next `dragover` restores it.
  - **Nesting.** A zone ignores a drag of the other kind without `preventDefault`, so a theme
    drag over a subtheme block is handled by the body.
  - **Dropping.** A drop calls `moveTheme` / `moveSubtheme` with the id of the section below
    the indicator (null for the end). A drop on the dragged item's own slot changes nothing.
    `dragend` clears the state.

### 3.6 Knock-on effects

- **Default draw order.** Today Ambiente draws above Uso do solo, because of `layers.json` order.
  With the groups.ts default it becomes Carbono > Uso do solo > Ambiente, the order the panel
  shows. Inside Carbono nothing visible changes, since its subthemes are exclusive.
- **Comments.**
  - `ResultsSidebar.tsx:48` ("in panel order (topmost first)") and `TemporalSlider.tsx:34`
    ("in the order the panel lists them") are accurate again: the panel order is the draw order.
  - `config/mapa/groups.ts` ("The order of this structure defines the panel navigation"): the
    order is now the default, and users can reorder it.
  - `analysisTargets.ts:10` and `MapView.tsx:829` mention a recorte "dragged below the rasters
    by `reorderLayer`". `reorderLayer` is gone and vectors cannot go below rasters, so the check
    is kept only as a guard.
- **`CLAUDE.md`, bullet "Order matters".** The rasters' order comes from themes and subthemes,
  draggable in the sidebar, and `lib/mapa/layerOrder.ts` keeps vectors above them.
  `DOCUMENTACAO.md` stays as-is: its note on drag-and-drop not working on touch screens holds.

## 4. Testing

Vitest, node environment, as the rest of `tests/lib/`.

- **`tests/lib/layerOrder.test.ts` (new):**
  - `moveInList`: moves up, moves down, moves to the end, a no-op on its own slot, and an
    unknown id each return the right array, the same array for the no-ops;
  - `applyGroupOrder`:
    - vectors on top in catalog order;
    - rasters by theme, then subtheme, then catalog;
    - the same array when the order holds;
    - an unknown group at the end;
  - `sanitizeThemeOrder` / `sanitizeSubthemeOrder`:
    - unknown ids and duplicates are dropped;
    - missing ids are appended;
    - Território is ignored;
    - malformed input returns the default;
  - `config/mapa/layers.json` with the default orders satisfies the invariant.
- **`tests/lib/layerVisibility.test.ts`:**
  - `moveTheme('uso_solo', 'carbono')` puts `lulc_mapbiomas` above every Carbono raster;
  - `moveSubtheme('carbono', 'solo', 'biomassa')`;
  - a no-op move leaves `layers` as the same array;
  - switching a raster on does not move it;
  - GEE rasters restored through `activateDynamicLayer` keep their order in both tile arrival
    orders.
- **`tests/lib/persistState.test.ts`:** both orders round-trip; unknown ids, new groups and a
  stored `territorio` are handled; a payload without them gets the defaults.

Scripted browser check on the dev server (dispatched drag events, since there is no DOM in the
test environment): theme and subtheme drops land where the indicator was, overshooting past the
first card still drops there, and leaving the zone clears the line.

Manual check, which the user repeats:

1. With one raster on: no grips, no hint.
2. With a Biomassa layer and Uso e cobertura da terra on: grips on the three thematic cards and
   on the subtheme headers of the open theme, plus the hint in the strip.
3. Dragging Carbono above Uso do solo swaps the two rasters on the map and in the legend.
4. With Biomassa and Carbono do solo on, dragging Carbono do solo above Biomassa inside Carbono
   swaps them.
5. Clicking a card or header still opens and closes it; dragging by its grip never does.
6. Typing in "Buscar camadas" hides the grips.
7. Reloading keeps the theme and subtheme order.
8. The opacity slider moves freely.
