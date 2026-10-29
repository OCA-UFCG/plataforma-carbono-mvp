# Platform Time Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the year control of the time-navigable layers as Figma's "Slider de tempo" card and move it out of the "Legendas" card into its own box above it.

**Architecture:** `TemporalSlider` keeps its behavior (it drives the first visible temporal layer, opens on the last year, waits 400 ms while the handle is dragged, and the arrows commit at once). It gets the Figma markup: a ‹ button, a native range styled as the design's 8px track with the year label riding beside the thumb, and a › button. `FloatingLegend` becomes a bottom-right column holding the slider over the legend card, so the ref MapView already measures for the recorte fit covers both. One pure function, `labelSide` in `lib/mapa/temporal.ts`, decides which side of the thumb the label sits on.

**Tech Stack:** React 19, CSS Modules, vitest 4 (node environment; components render with `renderToStaticMarkup` over a mocked store, as in `tests/components/floatingLegend.test.ts`).

**Spec:** Figma "Caativar (Copy)" `qeJHMMLnGiOl87LYkGsffW`, frame "Slider de tempo" `19481:12692` in the Plataforma section `19437:60649`. It is drawn standalone, and no full-screen frame (`19413:54279`, `19451:60959`) places it. Issue #136, question 2, kept the slider as an exception the design did not draw; this frame replaces that exception.

## Decisions to confirm (the frame leaves them open)

1. **Placement.** Figma draws the card on its own. The plan puts it in a bottom-right column, above the "Legendas" card, at the controls' 40px right inset, with 16px between the two. The reason: at 1436px the map is 672px wide and the legend holds 302px of its bottom-right corner, so 40 + 397 + 16 + 302 + 40 = 795 > 672 and the slider cannot sit beside the legend. With the ficha open the map is only 290px wide. *Alternative:* bottom left, beside the legend, falling back to the column when the map is narrow. Only Task 3 changes.
2. **Label text.** Figma's tooltip reads "2015 - 06", but all 23 temporal layers in `config/mapa/layers.json` are annual (their stops fall on January 1st). The plan shows the year alone ("2015"), through the existing `ano()`.
3. **Removals** (the frame draws none of these): the header with the layer name and the large year, the first and last years under the track, and the visible "carregando". The consequence: with two temporal layers on (one from Vegetação, one from Uso do solo), nothing on screen says which one the slider drives. The name stays only in the range's `aria-label`, and the legend entries carry no year. Loading is still announced, to screen readers only.
4. **Kept though undrawn:** the arrows' hover fill and their disabled look at the ends (as today), and the range's focus ring.

## Global Constraints

- Portuguese UI strings, verbatim: `"Ano anterior"`, `"Próximo ano"`, `` `Ano de ${camada.name}` ``, `"carregando"`.
- English code and comments; comments cite Figma node ids, like the neighbouring overlay files. New identifiers in English; existing Portuguese ones (`paradas`, `ano`, `camada`, `indice`) stay.
- Figma values (`19481:12692`):
  - card: 397×72, padding 16, border 1px `var(--bg-borda)` (#526f78), radius `var(--radius)` (8px), background `var(--bg-fundo)` (#fefefb), row gap 8px;
  - arrows: 32×40, radius `var(--radius-interno)` (6px), no border or fill; the 24px chevron is `/icons/mapa/keyboard-arrow-left.svg` (the same Material glyph, #587c22), mirrored for ›. The Figma instance exports a broken icon swap (pencil layers), so don't download its SVG;
  - track: 285×8 (it flexes), radius 4px; the rest of the track is #f1f5f9 (Figma "slate/100", no token) and the progress is `var(--cb-600)` (#27725b), up to the thumb's center;
  - thumb: 20px, white, with a 2px `var(--cb-600)` ring;
  - label: padding 4px 8px, radius 6px, background #f6f7f6 (Figma `cd-050`, no token), `filter: drop-shadow(0 2px 2px rgba(30,41,59,.25))`, `.text-ui-tab` (Inter 500 14/20), color #000. It is vertically centered on the track, with its right edge 5px left of the thumb's left edge.
- Desktop first: the phone gets no design work.
- CI runs neither tests nor lint: run `npm test` and `npm run lint` locally.
- Branch `feat/platform-time-slider` from `main` (`7700996`), in a worktree. Commits carry no co-author trailer.

## Review Focus

1. **Thumb on the first years:** the label must not cover the ‹ button. It flips to the right of the thumb (Task 1: `flips the label right of the thumb near the first year`).
2. **Ficha open (290px map, card ~234px, track ~122px):** the card shrinks inside the map instead of spilling over the ficha, and the label takes the roomier side (Task 1: `takes the roomier side when neither fits`; Task 4, step 3).
3. **Pressing the track where the label sits:** the label has `pointer-events: none`, so the press reaches the range (Task 2 CSS; Task 4, step 3).
4. **Folding the legend:** the slider stays, since it now lives outside `#legenda-conteudo` (Task 3: `stacks the year control above the card, outside what folding hides`).
5. **Selecting a recorte with a temporal layer on:** the fit clears the slider as well as the legend, because MapView measures the whole column (Task 4, step 3).

---

### Task 1: `labelSide` in `lib/mapa/temporal.ts`

**Files:**
- Modify: `lib/mapa/temporal.ts` (append)
- Create: `tests/lib/temporal.test.ts`

**Interfaces:**
- Produces: `labelSide(fraction: number, trackWidth: number, labelWidth: number): 'left' | 'right'`. Its constants `THUMB_PX = 20` and `LABEL_GAP_PX = 5` stay module-private: the CSS in Task 2 carries the same numbers as px, with a comment pointing here.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { labelSide } from '@/lib/mapa/temporal'

describe('labelSide', () => {
  it('keeps the label left of the thumb, as Figma draws it, when it fits', () => {
    expect(labelSide(0.5, 285, 52)).toBe('left')
    expect(labelSide(1, 285, 52)).toBe('left')
  })

  it('flips the label right of the thumb near the first year', () => {
    expect(labelSide(0, 285, 52)).toBe('right')
    expect(labelSide(0.21, 285, 52)).toBe('right') // 0.21 × 265 − 5 = 50.65 < 52
    expect(labelSide(0.22, 285, 52)).toBe('left')  // 0.22 × 265 − 5 = 53.3 ≥ 52
  })

  it('takes the roomier side when neither fits, on the narrowest track', () => {
    expect(labelSide(0.4, 122, 52)).toBe('right') // 35.8 on the left, 56.2 on the right
    expect(labelSide(0.5, 122, 52)).toBe('left')  // 46 on each side: a tie stays left
  })

  it('stays left before the track is measured', () => {
    expect(labelSide(0, 0, 0)).toBe('left')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/temporal.test.ts`
Expected: FAIL, `labelSide` is not exported.

- [ ] **Step 3: Implement `labelSide` in `lib/mapa/temporal.ts`**

The thumb's left edge sits at `x = fraction × (trackWidth − THUMB_PX)`. The room on the left is `x − LABEL_GAP_PX` and the room on the right is `trackWidth − x − THUMB_PX − LABEL_GAP_PX`. Return `'left'` when `trackWidth ≤ 0` (nothing measured yet, as in the server render) or when the left room fits the label. Otherwise return `'right'` when the right room fits, else the side with more room, with a tie staying left.

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/lib/temporal.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/mapa/temporal.ts tests/lib/temporal.test.ts
git commit -m "feat: pick the side of the year label beside the slider's thumb"
```

---

### Task 2: `TemporalSlider` as Figma's card

**Files:**
- Modify: `components/mapa/overlays/TemporalSlider.tsx` (markup, measurement and doc comment; the state, debounce and stepping logic stay)
- Modify: `components/mapa/overlays/TemporalSlider.module.css` (rewrite)
- Create: `tests/components/temporalSlider.test.ts`

**Interfaces:**
- Consumes: `labelSide`, `ano`, `paradas`, `layerTemporal` from `@/lib/mapa/temporal`.
- Produces: `export default function TemporalSlider()`, with no props and null when nothing is temporal (as today). Its root is `div.card`, `width: 397px; max-width: 100%; flex: none`.

Markup, in the design's order:

```
div.card
  button.step            aria-label="Ano anterior"  (img 24×24)
  div.track              style --f = indice / (anos.length − 1)
    input type="range"   the current attributes, unchanged
    span.label           data-side={side} aria-hidden="true"  {ano(anos[indice])}
  button.step.next       aria-label="Próximo ano"
  span.sr-only           aria-live="polite"  {carregando ? 'carregando' : ''}
```

- [ ] **Step 1: Write the failing test**

Mock the store as `tests/components/floatingLegend.test.ts` does, with the state `{ layers, temporalDate, loadingLayers, setTemporalDate }`. The layer is `estoque = { id: 'estoque_total', name: 'Estoque total', type: 'raster', visible: true, opacity: 100, gee: { temporal: { dateRange: ['1985-01-01', '2024-01-01'] } } }`, and the render is `renderToStaticMarkup(createElement(TemporalSlider))`. Cases:

```ts
it('stays out without a visible temporal layer', () => {
  state.layers = [{ ...estoque, visible: false }]
  expect(render()).toBe('')
})

it("draws Figma's card: ‹, the track, ›", () => {
  state.layers = [estoque]
  const m = render()
  expect(m.indexOf('aria-label="Ano anterior"')).toBeLessThan(m.indexOf('type="range"'))
  expect(m.indexOf('type="range"')).toBeLessThan(m.indexOf('aria-label="Próximo ano"'))
})

it('labels the thumb with the year alone, since every series is annual', () => {
  state.layers = [estoque]
  const m = render()
  expect(m).toMatch(/<span[^>]*data-side="left"[^>]*>2024<\/span>/)
  expect(m).not.toMatch(/\d{4} - \d{2}/)
})

it('follows the stored year', () => {
  state.layers = [estoque]
  state.temporalDate = { estoque_total: '2000-01-01' }
  const m = render()
  expect(m).toMatch(/>2000</)
  expect(m).toContain('value="15"')
  expect(m).toMatch(/--f:0\.3846/) // 15 / 39
})

it('disables › on the last year and leaves ‹ on', () => {
  state.layers = [estoque]
  const [prev, next] = render().match(/<button[^>]*>/g)!
  expect(next).toContain('disabled=""')
  expect(prev).not.toContain('disabled')
})

it('drops the header and the range ends the design does not draw', () => {
  state.layers = [estoque]
  const m = render()
  expect(m).not.toMatch(/>Estoque total</)
  expect(m).not.toMatch(/>1985</)
  expect(m).toContain('aria-label="Ano de Estoque total"')
})

it('announces the tile load to screen readers only', () => {
  state.layers = [estoque]
  state.loadingLayers = { estoque_total: true }
  expect(render()).toMatch(/<span class="sr-only"[^>]*>carregando<\/span>/)
})
```

Reset `layers`, `temporalDate` and `loadingLayers` in a `beforeEach`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/components/temporalSlider.test.ts`
Expected: FAIL on the label, `--f`, header and `sr-only` cases (the current markup still prints the name and the ends).

- [ ] **Step 3: Rewrite the markup and the CSS**

Measure the track's `clientWidth` and the label's `offsetWidth` with one `ResizeObserver` over both elements, set up in an effect keyed on whether the card is shown, into state `{ track: 0, label: 0 }`. Then `side = labelSide(fraction, track, label)`. Set `--f` inline the way `OpacityControl` sets `--fill` (`as CSSProperties`). The CSS takes the values in Global Constraints. The one formula the tests don't pin: `OpacityControl`'s `--fill: N%` only approximates the thumb, and the label has to meet it exactly. So `.track` defines

```css
--thumb: calc(10px + var(--f) * (100% - 20px)); /* the native thumb's center */
```

Use it as both gradient stops of the 8px track (`::-webkit-slider-runnable-track` and `::-moz-range-track`), and as the label's anchor: `left: calc(var(--thumb) - 15px); transform: translate(-100%, -50%)` for `[data-side='left']`, and `left: calc(var(--thumb) + 15px); transform: translateY(-50%)` for `'right'`. Add `top: 50%` and `pointer-events: none`. The WebKit thumb needs `margin-top: -6px`. Replace the doc comments of the component and the CSS file: they now cite `19481:12692`, not the #136 exception.

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/components/temporalSlider.test.ts tests/components/floatingLegend.test.ts`
Expected: PASS. The legend test still passes, because the slider is still inside the legend at this point.

- [ ] **Step 5: Commit**

```bash
git add components/mapa/overlays/TemporalSlider.tsx components/mapa/overlays/TemporalSlider.module.css tests/components/temporalSlider.test.ts
git commit -m "feat: restyle the year control as the platform's Figma time slider"
```

---

### Task 3: The slider leaves the legend for a column above it

**Files:**
- Modify: `components/mapa/overlays/FloatingLegend.tsx` (root becomes `div.stack`; `<TemporalSlider />` moves out of `#legenda-conteudo`; doc comment)
- Modify: `components/mapa/overlays/FloatingLegend.module.css`
- Modify: `components/mapa/MapView.tsx:1514-1515` (comment only)
- Modify: `tests/components/floatingLegend.test.ts`

**Interfaces:**
- Consumes: `TemporalSlider` (Task 2).
- Produces: unchanged `FloatingLegend` props (`theme`, `rightOffset`, `ref`). The `ref` now lands on the column, which MapView's `legendRef` already hands to `spotlightPadding(..., { legend })`, so MapView's code doesn't change.

- [ ] **Step 1: Change the test to expect the slider outside the card**

Replace `'carries the year control of a temporal layer at its top'` with:

```ts
it('stacks the year control above the card, outside what folding hides', () => {
  state.layers = [bioma, estoque]
  const m = render()
  expect(m).toMatch(/<input [^>]*type="range"[^>]*aria-label="Ano de Estoque total"/)
  expect(m.indexOf('type="range"')).toBeLessThan(m.indexOf('Legendas'))
  expect(m.indexOf('type="range"')).toBeLessThan(m.indexOf('id="legenda-conteudo"'))
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/components/floatingLegend.test.ts`
Expected: FAIL. The range still comes after the "Legendas" header.

- [ ] **Step 3: Implement the column**

The root is `<div ref className={styles.stack} style={{ right: rightOffset, maxWidth: `calc(100% - ${rightOffset + 16}px)` }}>`, holding `<TemporalSlider />` and then `div.legend` (header and content, as today). `.stack` takes `position: absolute; bottom: 24px; z-index: 10` from `.legend` and adds `display: flex; flex-direction: column; align-items: flex-end; gap: 16px; max-height: max(248px, calc(100% - 404px))`. The floor is the legend's old 160px plus the slider's 72px and the 16px gap, so the legend keeps the room it has today. `.legend` keeps its width, border, radius, background and `overflow: hidden`, and gains `min-height: 0` so its content scrolls inside the column. In `MapView.tsx`, the comment over `spotlightPadding` becomes: the year slider sits above the legend in the same corner column (FloatingLegend), so clearing that column clears both.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS, with no other test changed.

- [ ] **Step 5: Commit**

```bash
git add components/mapa/overlays/FloatingLegend.tsx components/mapa/overlays/FloatingLegend.module.css components/mapa/MapView.tsx tests/components/floatingLegend.test.ts
git commit -m "feat: float the time slider above the legend card"
```

---

### Task 4: Rendered check against the frame

**Files:** none, unless a check fails (fix it in the owning task's files, then commit).

- [ ] **Step 1: Static checks**

Run: `npm test && npm run lint && npm run build`
Expected: all pass, with no lint warning in the touched files.

- [ ] **Step 2: Render it**

In the worktree run `next dev --webpack` (nested worktrees need it), log in, and open `/mapa` at 1436×720. Turn on "Uso e Cobertura da Terra" (`lulc_mapbiomas`). Screenshot the card and set it beside `19481:12692` (397×72, label "2024" left of the thumb, › disabled).

- [ ] **Step 3: Walk the Review Focus**

Press ‹ down to 1985: the label flips right and ‹ disables. Press the track on the label: the year moves. Fold the legend: the slider stays. Open the ficha (map 290px): the card shrinks inside the map and doesn't cover the ficha. Select a municipality: the fit keeps it clear of the column.

Expected: each holds. Note any mismatch the frame doesn't settle instead of fixing it unasked.
