# Hero Pause Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small pause/resume toggle to the right of the home hero's dots.

**Architecture:** A pure helper in `lib/marketing/heroRotation.ts` decides when the
timer may run. `Hero.tsx` derives the effective pause from the visitor's
explicit choice, or from reduced motion when there is none (`useSyncExternalStore`
on the media query). The existing per-photo `setTimeout` effect returns early on
that guard.

**Tech Stack:** Next.js / React 19 client component, CSS modules, next-intl,
vitest (node environment, `renderToStaticMarkup`).

**Spec:** `docs/superpowers/specs/2026-11-23-hero-pause-button-design.md`

## Global Constraints

- Comments in English; UI strings in Portuguese in `messages/pt.json`, with English in `messages/en.json`.
- Labels: pt `"Pausar a troca de fotos"` / `"Retomar a troca de fotos"`; en `"Pause the photo rotation"` / `"Resume the photo rotation"`.
- The accessible name says what the press will do. No `aria-pressed`.
- Toggle: a 24 px hit area. The glyph is small (about 10 px), `currentColor`, and uses the dots' white tint.
- Once paused, a dot or an arrow click does not resume.
- Reduced motion: the hero starts paused and shows ▶. Pressing ▶ opts in to rotation.
- No persistence (component state only).

## Review Focus

- Reduced-motion visitor: the first client render after hydration must flip the toggle to ▶ without a hydration-mismatch warning (server snapshot `false`).
- Keyboard user presses the toggle with Space/Enter: focus stays on the button (it must not be re-created between states, so the label swap happens on one element).
- Paused, then a dot click: the photo changes and the timer stays off (the effect's guard runs before the `clicks` bump matters).
- Phone width (≤768 px): the toggle stays on the dot row without growing the row's 33 px height.
- The photo-picker group (`role="group"`) still holds only the four dots, so its name stays "Selecionar foto de fundo" and does not cover the toggle.

---

### Task 1: Rotation guard helpers

**Files:**
- Modify: `lib/marketing/heroRotation.ts`
- Test: `tests/lib/heroRotation.test.ts`

**Interfaces:**
- Produces: `isPaused(choice: boolean | null, reducedMotion: boolean): boolean` (the choice when made, else reduced motion).
- Produces: `shouldRotate(count: number, focusHeld: boolean, paused: boolean): boolean` (true only when `count >= 2`, with no focus hold and no pause).

- [ ] **Step 1: Write the failing tests** in `tests/lib/heroRotation.test.ts`

```ts
describe('isPaused', () => {
  it('follows reduced motion until the visitor chooses', () => {
    expect(isPaused(null, false)).toBe(false)
    expect(isPaused(null, true)).toBe(true)
  })
  it('lets the visitor override reduced motion either way', () => {
    expect(isPaused(false, true)).toBe(false)
    expect(isPaused(true, false)).toBe(true)
  })
})

describe('shouldRotate', () => {
  it('rotates several photos with nothing holding them', () => {
    expect(shouldRotate(4, false, false)).toBe(true)
  })
  it('holds on keyboard focus, on pause, and with a single photo', () => {
    expect(shouldRotate(4, true, false)).toBe(false)
    expect(shouldRotate(4, false, true)).toBe(false)
    expect(shouldRotate(1, false, false)).toBe(false)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/lib/heroRotation.test.ts`
Expected: FAIL, `isPaused` / `shouldRotate` not exported.

- [ ] **Step 3: Implement both functions** in `lib/marketing/heroRotation.ts`, each with a one-line comment on why.

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run tests/lib/heroRotation.test.ts`
Expected: PASS (the existing `stepPhotoIndex` tests too).

- [ ] **Step 5: Commit**

```bash
git add lib/marketing/heroRotation.ts tests/lib/heroRotation.test.ts
git commit -m "feat: decide when the hero rotation may run in one helper"
```

### Task 2: The toggle in the hero

**Files:**
- Modify: `components/marketing/Hero.tsx`: the rotation effect (around lines 120-141) and the dots block (around lines 222-233).
- Modify: `components/marketing/Hero.module.css`: the `.dots` block, a new `.dotList`, a new `.pause`, and the 768 px query.
- Modify: `messages/pt.json`, `messages/en.json` (`Hero.pause`, `Hero.resume`)
- Test: `tests/components/hero.test.ts` (new)

**Interfaces:**
- Consumes: `isPaused`, `shouldRotate` from Task 1.

- [ ] **Step 1: Write the failing test** `tests/components/hero.test.ts`

Render `withIntl(createElement(Hero, { copy: copyDefaults(INICIO_HERO) }), locale)`
with `renderToStaticMarkup` (helpers: `@/tests/helpers/intl`; `copyDefaults`
from `@/lib/content/site/model`). Tests:

- `'offers a pause toggle after the dots'`: in pt, the markup contains a `<button` with `aria-label="Pausar a troca de fotos"`. It sits after the last `aria-label="Mostrar Foto 4 da Caatinga"` and has no `aria-pressed`.
- `'keeps the toggle out of the photo picker group'`: the substring from `role="group"` to its closing `</div>` contains exactly 4 `<button` and no `Pausar`.
- `'names the toggle in English'`: in en, the markup contains `aria-label="Pause the photo rotation"`.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/components/hero.test.ts`
Expected: FAIL, no toggle in the markup.

- [ ] **Step 3: Add the messages.** In `"Hero"`, pt: `"pause": "Pausar a troca de fotos"`, `"resume": "Retomar a troca de fotos"`; en: `"pause": "Pause the photo rotation"`, `"resume": "Resume the photo rotation"`.

- [ ] **Step 4: Wire the state in `Hero.tsx`**

- `const [pauseChoice, setPauseChoice] = useState<boolean | null>(null)` (the visitor's explicit choice; `null` until they press).
- `const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => matchMedia(QUERY).matches, () => false)`, with a module-level `subscribeReducedMotion(onChange)` that adds/removes a `change` listener on `window.matchMedia("(prefers-reduced-motion: reduce)")`.
- `const paused = isPaused(pauseChoice, reducedMotion)`.
- The effect: replace `PHOTOS.length < 2 || focusHeld` and the inline `matchMedia` check with `if (!shouldRotate(PHOTOS.length, focusHeld, paused)) return;`. Deps become `[index, clicks, focusHeld, paused]`.
- Update the comment above the component ("auto-advance every 10s unless…") to mention the toggle.

- [ ] **Step 5: Render the toggle in `Hero.tsx`**

The outer `<div className={`container ${styles.dots}`}>` keeps the row and loses
`role`/`aria-label`. An inner `<div className={styles.dotList} role="group" aria-label={t("photoPicker")}>`
holds the four dots. After it comes one `<button type="button" className={styles.pause}
aria-label={t(paused ? "resume" : "pause")} onClick={() => setPauseChoice(!paused)}>`.
Its child is an inline SVG (`aria-hidden`, `viewBox="0 0 10 10"`, `width={10} height={10}`,
`fill="currentColor"`): two 3×10 rects at x=1 and x=6 while playing, and a
triangle `M2 0 L10 5 L2 10 Z` while paused. The button element stays the same
across states, so keyboard focus survives the press.

- [ ] **Step 6: Style it in `Hero.module.css`**

- `.dots` keeps its box (42 px, `padding-bottom: 29px`, flex, centred). Its `gap` becomes the space between the dot list and the toggle: `7px`. With the button's 7 px of padding around the 10 px glyph, the glyph sits 14 px after the last dot.
- `.dotList`: `display: flex; align-items: center; gap: 9px` (the dots' current gap).
- `.pause`: a 24×24 flex-centred box with `padding: 0`, `border: none`, `background: transparent` and `cursor: pointer`. Its `color` is the active dot's tint, `color-mix(in srgb, var(--role-terciario-texto-sobre) 90%, transparent)`. Hover and focus-visible take the full `var(--role-terciario-texto-sobre)`. `flex: none`, so the 13 px content row neither grows nor shrinks it. It overflows into the padding, centred.
- A header comment cites the 2026-11-23 spec (no Figma node; the design does not draw it).

- [ ] **Step 7: Run the tests**

Run: `npx vitest run tests/components/hero.test.ts tests/lib/heroRotation.test.ts`
Expected: PASS.

- [ ] **Step 8: Full checks**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: all pass, with no new lint errors in the touched files.

- [ ] **Step 9: Rendered check** at 1440 px and 390 px on `/` with the dev server (`next dev --webpack` in this nested worktree). Check four things: the toggle sits right of the dots, and the row height is unchanged (screenshot); pressing it stops the rotation and swaps to ▶; a dot click while paused changes the photo and the rotation stays stopped; with emulated reduced motion it loads as ▶.

- [ ] **Step 10: Commit**

```bash
git add components/marketing/Hero.tsx components/marketing/Hero.module.css messages/pt.json messages/en.json tests/components/hero.test.ts
git commit -m "feat: let visitors pause the home hero's photo rotation"
```
