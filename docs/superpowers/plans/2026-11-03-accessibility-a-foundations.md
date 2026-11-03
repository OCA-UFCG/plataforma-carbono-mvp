# Accessibility A: Foundations and Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every later workstream the shared accessibility pieces (an announcer, a focus helper, a hidden data table) and the guards that keep fixes from regressing: lint, an axe check in CI, and a screenshot comparison proving nothing visible changed.

**Architecture:** The three primitives are framework-light. `announce()` writes into two always-mounted, visually hidden live regions that each of the five root layouts renders. `focusFirst()` focuses the first candidate that is still connected and enabled. `HiddenDataTable` is a server-safe component. The guards live in `scripts/a11y/`: pure modules (`routes.ts`, `known.ts`, `judge.ts`, `imageDiff.ts`) carry the logic and are unit tested, and thin CLIs (`check.mts`, `screens.mts`, `session.mts`) drive headless Chrome through `puppeteer-core`.

**Tech Stack:** Next.js 16 / React 19, vitest (node environment, `renderToStaticMarkup`), ESLint 9 flat config with `eslint-plugin-jsx-a11y`, `axe-core` 4.12, `puppeteer-core` 25 with the system Chrome, `pngjs` 7, `firebase-admin` (already a dependency), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-03-accessibility-design.md`. This plan covers §6 A and the A item of §7. Workstreams B–F get their own plans.

## Global Constraints

- **No visual change** (decision 2): at the browser's default settings, a 1440 px screenshot before and after must match pixel for pixel. The only exception is UI that only keyboard use brings up (decision 2b). Nothing in this plan is visible.
- **No `app/layout.tsx`.** Anything site-wide is mounted in each of the five root layouts: `(auth)`, `(mapa)`, `(marketing)`, `(relatorio)`, `(territorios)`.
- **`(auth)` and `(relatorio)` do not load `globals.css`,** so the `.sr-only` class does not exist there. Components that must work in every layout carry their own visually hidden style (`VISUALLY_HIDDEN`, Task 2).
- **Language.** Code and comments in English. Announcements, hidden texts and UI strings in Portuguese.
- **Announce outcomes once** (anti-goal): never per slider tick, tile or map move.
- **CI scope.** CI gains `npm run lint` and the axe check. It still does not run `npm test`: `tests/lib/contentfulSpace.test.ts` queries the live space when credentials exist.
- **Commits, branch, PR, issues.**
  - Branch: `feat/a11y-foundations`, created in this worktree from the tip of `docs/accessibility-design`, so the PR carries the spec and this plan.
  - Commits and PR in English, with no co-author trailer.
  - The umbrella and task issues are in Portuguese. Edit them with `gh api -X PATCH`; `gh issue edit` fails here.
- **Environment.**
  - The worktree needs its own `npm ci`: the new devDependencies are not in the main checkout's `node_modules`. That is about 1.3 GB, against about 6.5 GB free.
  - Node is v20 locally and 22 in CI.
  - Dev servers run with `npx next dev --webpack -p <port>` (nested worktree). Pick a free port with `ss -ltnp`, and stop the server by its pid, never with `pkill -f`.
  - Copy `.env.local` from the main checkout for local runs. Delete it, `node_modules` and `.next` when the branch merges.
- **Concurrent work.** Another session is editing the `(marketing)`, `(mapa)` and `(territorios)` layouts for a site locale. Rebase on `main` before opening the PR, and keep `<Announcer />` as the last child of `<body>` through any conflict.

## Review Focus

1. **Two captures of the same build differ:** the carousel, a canvas, a lazy image or a font late to load. The guard must report 0 differences for identical code, or it is noise. Pinned by Task 6, Step 6.
2. **A CI route renders an error page:** a client crash from a missing env var, or a 404. The check must fail, not pass axe on the error page. Pinned by Task 5's `reports a route that failed to load` test and the status and `ready` checks in `openRoute`.
3. **The same text announced twice in a row,** such as two "Camada carregada": a screen reader must hear it twice. Pinned by Task 2's `repeats identical text` test.
4. **`announce()` with no regions,** such as during SSR, before hydration, or in a layout a future change forgot: no throw. Pinned by Task 2's `does nothing without the regions or without a document` test.
5. **A focus candidate that cannot take focus** (`hidden`, `inert`, `display: none`, so `focus()` silently does nothing): the helper must fall through to the next candidate. Pinned by Task 3's `falls through when focus does not land` test.

---

### Task 1: Lint with the jsx-a11y recommended set, in CI

**Files:**
- Modify: `eslint.config.mjs`
- Modify: `package.json`, `package-lock.json` (devDependency `eslint-plugin-jsx-a11y`)
- Modify: `components/mapa/panel/RecortePicker.tsx:165`, `components/mapa/panel/TerritorySearch.tsx:166`, `components/marketing/conteudo/PdfViewer.tsx:327`
- Modify: `.github/workflows/ci.yml`, `CLAUDE.md` (the CI sentence under Commands)

**Interfaces:**
- Produces: `npm run lint` fails on any jsx-a11y recommended rule. Later workstreams keep it at 0 errors.

- [ ] **Step 1: Make the plugin a direct devDependency**

Run: `npm install --save-dev eslint-plugin-jsx-a11y@^6.10.2`
Expected: `package.json` gains the entry. The lock only gains the root reference, because 6.10.2 is already installed through `eslint-config-next`.

- [ ] **Step 2: Turn the set on in `eslint.config.mjs`**

Add `import jsxA11y from "eslint-plugin-jsx-a11y";` and, after `...nextTs`, this object:

```js
  {
    // Spec §6 A.4: the plugin's recommended set as errors; eslint-config-next
    // turns on only six of its rules, as warnings.
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Safari drops list semantics under `list-style: none`, so the site
      // restores them on purpose with role="list" / role="listitem".
      "jsx-a11y/no-redundant-roles": [
        "error",
        { nav: ["navigation"], ul: ["list"], ol: ["list"], li: ["listitem"] },
      ],
      // eMAG 3.1 asks for access keys 1–4 (workstream B).
      "jsx-a11y/no-access-key": "off",
    },
  },
```

- [ ] **Step 3: Run lint and confirm exactly the three known hits**

Run: `npm run lint`
Expected: 3 errors, and nothing else at error level:
- `RecortePicker.tsx:165` and `TerritorySearch.tsx:166`, both `click-events-have-key-events`;
- `PdfViewer.tsx:327`, `no-noninteractive-tabindex`.

The two warnings in `MapView.tsx` stay. Any other error comes from code that landed after the audit. Settle it the same way only if the keyboard path already exists; otherwise stop and report it.

- [ ] **Step 4: Settle the three hits with reasons, not code changes**

The behaviour is already right in all three, so add an `eslint-disable-next-line` with a reason on the line above each element:

- **`RecortePicker.tsx` option `<li>`:**
  - rule: `jsx-a11y/click-events-have-key-events`;
  - reason: `-- keyboard selection lives on the listbox (onListKeyDown + aria-activedescendant)`.
- **`TerritorySearch.tsx` option `<li>`:**
  - rule: same;
  - reason: `-- keyboard selection lives on the combobox input (aria-activedescendant)`.
- **`PdfViewer.tsx` region `<div>`:**
  - rule: `jsx-a11y/no-noninteractive-tabindex`;
  - reason: `-- a scrollable region must take focus so the keyboard can scroll it (WCAG 2.1.1)`.

In JSX the comment goes inside braces: `{/* eslint-disable-next-line … */}`.

- [ ] **Step 5: Run lint clean**

Run: `npm run lint`
Expected: `0 errors`; the 2 existing warnings may remain.

- [ ] **Step 6: Add lint to CI and correct CLAUDE.md**

- **`ci.yml`:** add a step after "Install dependencies":
  ```yaml
        - name: Lint
          run: npm run lint
  ```
- **`CLAUDE.md`:** in the paragraph under Commands, the CI sentence becomes: "CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run lint`, `npm run build` and `npm run contrast` — it does **not** run `npm test`, so run that locally." Task 5 extends it again.

- [ ] **Step 7: Commit**

```bash
git add eslint.config.mjs package.json package-lock.json components/mapa/panel/RecortePicker.tsx components/mapa/panel/TerritorySearch.tsx components/marketing/conteudo/PdfViewer.tsx .github/workflows/ci.yml CLAUDE.md
git commit -m "build: lint with the jsx-a11y recommended set and run lint in CI"
```

---

### Task 2: The announcer

**Files:**
- Create: `lib/a11y/visuallyHidden.ts`, `lib/a11y/announce.ts`, `components/a11y/Announcer.tsx`
- Modify: the five `app/(*)/layout.tsx`
- Test: `tests/lib/announce.test.ts`, `tests/components/announcer.test.ts`, `tests/app/rootLayouts.test.ts`

**Interfaces:**
- **Produces, in `lib/a11y/visuallyHidden.ts`:**
  - `export const VISUALLY_HIDDEN: CSSProperties`.
  - It holds the declarations of `.sr-only` in `app/globals.css:298-308`, as a React style object.
- **Produces, in `lib/a11y/announce.ts`:**
  - `export type Politeness = 'polite' | 'assertive'`
  - `export const ANNOUNCER_IDS = { polite: 'announcer-polite', assertive: 'announcer-assertive' } as const`
  - `export const ANNOUNCE_DELAY_MS = 100`
  - `export function announce(text: string, politeness: Politeness = 'polite'): void`
- **Produces, in `components/a11y/Announcer.tsx`:**
  - `export function Announcer(): React.ReactElement`.
  - It is a server component with no props and no `'use client'`.
- **For later workstreams:**
  - Call `announce()` from event handlers or effects, once per outcome.
  - Use `'assertive'` only for errors that block the task.
  - The visible notices stay as they are; the announcer only speaks them.

- [ ] **Step 1: Write the failing tests for `announce()`**

`tests/lib/announce.test.ts` stubs `document` with two fake regions and uses fake timers:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ANNOUNCER_IDS, ANNOUNCE_DELAY_MS, announce } from '@/lib/a11y/announce'

let regions: Record<string, { textContent: string }>

beforeEach(() => {
  vi.useFakeTimers()
  regions = { [ANNOUNCER_IDS.polite]: { textContent: '' }, [ANNOUNCER_IDS.assertive]: { textContent: '' } }
  vi.stubGlobal('document', { getElementById: (id: string) => regions[id] ?? null })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('announce', () => {
  it('speaks in the polite region by default', () => {
    announce('Camada carregada')
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('Camada carregada')
    expect(regions[ANNOUNCER_IDS.assertive].textContent).toBe('')
  })

  it('speaks urgent text in the assertive region', () => {
    announce('Não foi possível carregar a camada.', 'assertive')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    expect(regions[ANNOUNCER_IDS.assertive].textContent).toBe('Não foi possível carregar a camada.')
  })

  it('repeats identical text', () => {
    regions[ANNOUNCER_IDS.polite].textContent = 'Camada carregada'
    announce('Camada carregada')
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('Camada carregada')
  })

  it('keeps only the latest of calls made within the delay', () => {
    announce('Carregando')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS / 2)
    announce('Camada carregada')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS / 2)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('Camada carregada')
  })

  it('ignores blank text', () => {
    regions[ANNOUNCER_IDS.polite].textContent = 'Camada carregada'
    announce('   ')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('Camada carregada')
  })

  it('does nothing without the regions or without a document', () => {
    vi.stubGlobal('document', { getElementById: () => null })
    expect(() => { announce('x'); vi.advanceTimersByTime(ANNOUNCE_DELAY_MS) }).not.toThrow()
    vi.stubGlobal('document', undefined)
    expect(() => { announce('x'); vi.advanceTimersByTime(ANNOUNCE_DELAY_MS) }).not.toThrow()
  })
})
```

- [ ] **Step 2: Write the failing markup tests**

**`tests/components/announcer.test.ts`:** call `renderToStaticMarkup(createElement(Announcer))` and assert:

- one element with `id="announcer-polite"`, `aria-live="polite"` and `aria-atomic="true"`;
- one with `id="announcer-assertive"`, `aria-live="assertive"` and `aria-atomic="true"`;
- both empty (`></div>`);
- both carrying `width:1px` and `overflow:hidden` in their `style`;
- no `role` attribute on either. Plain live regions are the most reliably spoken, and `role="alert"` adds an "alert" prefix.

**`tests/app/rootLayouts.test.ts`:** read the files with `node:fs`.

- `the root layouts on disk are the five known ones`:
  - list each `app/*` directory starting with `(` that holds a `layout.tsx`;
  - assert, sorted, that it equals `['(auth)', '(mapa)', '(marketing)', '(relatorio)', '(territorios)']`.
  - A sixth layout then fails here until it mounts the announcer.
- `%s mounts the announcer as the body's last child` (`it.each` over the five):
  - the source contains `from '@/components/a11y/Announcer'` (either quote style);
  - it matches `/<Announcer \/>\s*<\/body>/`.

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run tests/lib/announce.test.ts tests/components/announcer.test.ts tests/app/rootLayouts.test.ts`
Expected: FAIL, because the modules do not exist.

- [ ] **Step 4: Implement `VISUALLY_HIDDEN`, `announce()` and `<Announcer />`**

- **`announce()` behaviour:**
  - Trim `text` and return if it is empty.
  - Return if `typeof document === 'undefined'`, or if the region is missing.
  - Otherwise set the region's `textContent` to `''` at once.
  - Cancel the pending timer for that politeness: keep one module-level timer per politeness.
  - Schedule `textContent = text` after `ANNOUNCE_DELAY_MS`.
  - Look the region up again when the timer fires. A client navigation never remounts a root layout, but a lookup costs nothing.
- **`<Announcer />`:** a fragment of two empty `<div>`s with the ids, `aria-live`, `aria-atomic="true"` and `style={VISUALLY_HIDDEN}`.
- **Comments to keep:**
  - Why the regions are always mounted: many screen readers skip a live region that is already full when it appears (spec §6 A.1).
  - Why the clear-then-set pattern: it makes identical text speak again.

- [ ] **Step 5: Mount it in the five layouts**

In each `app/(*)/layout.tsx`, import `{ Announcer }` from `@/components/a11y/Announcer` and render `<Announcer />` as the last child of `<body>`, after `<Analytics />` or `<AuthAnalytics />` where present. It goes outside `<AuthProvider>`, because it needs no context.

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run tests/lib/announce.test.ts tests/components/announcer.test.ts tests/app/rootLayouts.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/a11y components/a11y app tests/lib/announce.test.ts tests/components/announcer.test.ts tests/app/rootLayouts.test.ts
git commit -m "feat: add an always-mounted announcer to every root layout"
```

---

### Task 3: The focus helper

**Files:**
- Create: `lib/a11y/focus.ts`
- Test: `tests/lib/focus.test.ts`

**Interfaces:**
- **Produces:** `export function focusFirst(candidates: ReadonlyArray<HTMLElement | null | undefined>, options?: FocusOptions): HTMLElement | null`.
  - It focuses the first candidate that is connected, does not match `:disabled`, and actually holds focus after `focus(options)` (`el.ownerDocument.activeElement === el`).
  - It returns that element, or `null`.
- **Conventions for later workstreams** (to quote in their plans):
  - **A heading target** carries `tabIndex={-1}` and, in its own stylesheet, `:focus { outline: none }`, as `.territorios-secao-titulo:focus` does (`app/territorios.css:167-169`). Moving focus to it then draws nothing.
  - **A control target** shows the ring a keyboard user already sees.
  - **A control that must stay focused while it works** uses `aria-disabled="true"` plus `aria-busy="true"`, not `disabled`. It ignores activation while `aria-disabled`, and its stylesheet gives `[aria-disabled='true']` exactly the declarations `:disabled` has today.
  - `focusFirst` never skips `aria-disabled` elements, on purpose.
  - The existing fallback at `components/territorios/TerritoryChooser.tsx:239-240` is the same rule. Workstream D may switch it to `focusFirst`; this task does not touch it.

- [ ] **Step 1: Write the failing tests**

Fake elements share a fake document:

```ts
import { describe, expect, it } from 'vitest'
import { focusFirst } from '@/lib/a11y/focus'

function fakeDoc() {
  return { activeElement: null as unknown }
}
function fakeEl(doc: { activeElement: unknown }, o: { connected?: boolean; disabled?: boolean; takesFocus?: boolean; ariaDisabled?: boolean } = {}) {
  const el = {
    isConnected: o.connected ?? true,
    ownerDocument: doc,
    calls: [] as unknown[],
    matches: (sel: string) => sel === ':disabled' && Boolean(o.disabled),
    getAttribute: (name: string) => (name === 'aria-disabled' && o.ariaDisabled ? 'true' : null),
    focus(options?: FocusOptions) {
      el.calls.push(options)
      if (o.takesFocus ?? true) doc.activeElement = el
    },
  }
  return el as unknown as HTMLElement & { calls: unknown[] }
}
```

The cases:

- `focuses the first connected, enabled candidate`
- `skips null, undefined and unmounted candidates`: `connected: false`
- `skips disabled candidates`
- `keeps aria-disabled candidates eligible`: `ariaDisabled: true` gets the focus
- `falls through when focus does not land`: `takesFocus: false`, then a good one; the second is returned
- `passes the focus options through`: `{ preventScroll: true }` appears in `calls`
- `returns null when no candidate takes focus`

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/lib/focus.test.ts`
Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement `focusFirst` in `lib/a11y/focus.ts`**

Write the doc comment around the conventions above. It explains why `aria-disabled` stays eligible and why the result is checked against `activeElement`: hidden, inert or `display: none` elements ignore `focus()` silently.

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run tests/lib/focus.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/a11y/focus.ts tests/lib/focus.test.ts
git commit -m "feat: add a helper that moves focus to the first target able to take it"
```

---

### Task 4: The hidden data table

**Files:**
- Create: `components/a11y/HiddenDataTable.tsx`
- Test: `tests/components/hiddenDataTable.test.ts`

**Interfaces:**
- Consumes: `VISUALLY_HIDDEN` (Task 2).
- **Produces:**
  - `export const MISSING_VALUE = 'sem dado'`
  - `export type HiddenDataRow = { label: string; values: ReadonlyArray<string | null | undefined> }`
  - `export type HiddenDataTableProps = { caption: string; rowHeader: string; columns: readonly string[]; rows: readonly HiddenDataRow[] }`
  - `export function HiddenDataTable(props: HiddenDataTableProps): React.ReactElement | null`
- **Behaviour:**
  - No hooks and no `'use client'`, so server and client components can both render it.
  - Values arrive already formatted: number, unit and pt-BR separators are the caller's job, through the formatters the chart already uses.
  - For workstreams D and E, a chart pairs it with `accessibilityLayer={false}` and `role="img"` plus a one-line `aria-label` on the chart wrapper (spec §6 E).

- [ ] **Step 1: Write the failing tests**

Render with `renderToStaticMarkup(createElement(HiddenDataTable, props))`, with `props` built like this:

```ts
{
  caption: 'Precipitação anual',
  rowHeader: 'Ano',
  columns: ['Chuva (mm)', 'Classe'],
  rows: [
    { label: '2019', values: ['812', 'normal'] },
    { label: '2020', values: ['540'] },
  ],
}
```

- `names the table and its columns`:
  - `<caption>Precipitação anual</caption>`;
  - the header row reads `<th scope="col">Ano</th><th scope="col">Chuva (mm)</th><th scope="col">Classe</th>`.
- `heads each row with its label`: `<th scope="row">2019</th>` and `<th scope="row">2020</th>`.
- `fills missing values with "sem dado"`: the 2020 row ends `<td>540</td><td>sem dado</td>`. It has one `td` per column, never fewer.
- `hides the table visually, not from assistive tech`:
  - the outer element's `style` contains `width:1px` and `overflow:hidden`;
  - the markup contains no `aria-hidden`.
- `renders nothing without rows`: `rows: []` gives `''`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/components/hiddenDataTable.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement it**

Put a `<div style={VISUALLY_HIDDEN}>` around the `<table>`. Some screen readers lose table navigation when the clip sits on the table itself. The clip keeps it off screen and off paper alike, so it never prints.

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run tests/components/hiddenDataTable.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/a11y/HiddenDataTable.tsx tests/components/hiddenDataTable.test.ts
git commit -m "feat: add a visually hidden data table for charts"
```

---

### Task 5: The axe check, in CI

**Files:**
- Create: `scripts/a11y/routes.ts`, `scripts/a11y/known.ts`, `scripts/a11y/judge.ts`, `scripts/a11y/browser.ts`, `scripts/a11y/check.mts`, `scripts/a11y/serve-standalone.sh`
- Modify: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`, `CLAUDE.md`
- Test: `tests/scripts/a11yJudge.test.ts`, `tests/scripts/a11yRoutes.test.ts`

**Interfaces:**
- **`routes.ts`:**
  - `export type A11yRoute = { path: string; ready: string; session?: true }`
  - `export const A11Y_ROUTES: readonly A11yRoute[]`
  - `export function routesToRun(paths: readonly string[], hasSession: boolean): A11yRoute[]`
  - `export function screenshotName(path: string): string`
- **`known.ts`:**
  - `export type KnownViolation = { path: string; rule: string; reason: string }`
  - `export const KNOWN_VIOLATIONS: readonly KnownViolation[]`
- **`judge.ts`:**
  - `export type Impact = 'minor' | 'moderate' | 'serious' | 'critical'`
  - `export type RouteViolation = { rule: string; impact: Impact | null; help: string; targets: string[] }`
  - `export type RouteOutcome = { path: string; error?: string; violations: RouteViolation[] }`
  - `export type Verdict = { errors: { path: string; error: string }[]; unexpected: (RouteViolation & { path: string })[]; stale: KnownViolation[] }`
  - `export function judge(outcomes: readonly RouteOutcome[], known: readonly KnownViolation[]): Verdict`
  - `export function passed(v: Verdict): boolean`
- **`browser.ts`:**
  - `export const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 }`
  - `export function launchBrowser(): Promise<Browser>`
  - `export function waitForServer(baseUrl: string, timeoutMs?: number): Promise<void>`
  - `export function openRoute(browser: Browser, baseUrl: string, route: A11yRoute, opts?: { session?: string; reducedMotion?: boolean }): Promise<Page>`
- **CLI:** `npm run a11y [-- <path> …]`.
  - Env: `A11Y_BASE_URL` (default `http://localhost:3000`), `A11Y_SESSION` (a `session` cookie value) and `CHROME_PATH` (default `/usr/bin/google-chrome`).
  - Exit 0 on pass, 1 otherwise.
- **For later workstreams:**
  - Each PR runs `npm run a11y -- <touched paths>`.
  - B adds `/acessibilidade` to `A11Y_ROUTES`.
  - F deletes the `target-size` entry from `KNOWN_VIOLATIONS`; the stale rule forces it.

- [ ] **Step 1: Add the dependencies and scripts**

- Run: `npm install --save-dev axe-core@^4.12.1 puppeteer-core@^25.16.0`.
  - `puppeteer-core` downloads no browser; the scripts use the system Chrome.
- Add to `package.json` scripts:
  - `"a11y": "tsx scripts/a11y/check.mts"`
  - `"a11y:screens": "tsx scripts/a11y/screens.mts"` (Task 6)

- [ ] **Step 2: Write the failing tests for `judge` and the routes**

**`tests/scripts/a11yJudge.test.ts`:**

- `passes minor and moderate violations`: a `region` violation with impact `moderate` gives an empty verdict, and `passed` is true.
- `flags serious and critical violations that are not known`
- `forgives a known rule only on its own path`:
  - known `{ path: '/', rule: 'target-size' }`;
  - `target-size` on `/` is forgiven;
  - `target-size` on `/sobre` is unexpected.
- `reports a known entry that no longer occurs as stale`: `/` checked without error and no `target-size` → `stale` holds that entry.
- `ignores known entries of paths not checked in this run`: a known `/mapa` entry with `/mapa` absent → not stale.
- `reports a route that failed to load`:
  - `{ path: '/territorios', error: 'status 500', violations: [] }` → in `errors`, and `passed` is false;
  - a known entry for that path is not stale.

**`tests/scripts/a11yRoutes.test.ts`:**

- `drops session routes without a session`: `routesToRun([], false)` has no `/mapa`.
- `keeps them with one`: `routesToRun([], true)` includes `/mapa`.
- `narrows to the given paths`: `routesToRun(['/login'], false)` is just `/login`.
- `rejects an unknown path`: `routesToRun(['/nada'], false)` throws an error naming `/nada`.
- `names screenshots after the path`:
  - `screenshotName('/')` is `home.png`;
  - `screenshotName('/sobre/carbono-e-comunidades')` is `sobre-carbono-e-comunidades.png`.

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run tests/scripts/a11yJudge.test.ts tests/scripts/a11yRoutes.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement `routes.ts`, `known.ts` and `judge.ts`**

`A11Y_ROUTES`, in this order. These are the 11 public pages of the production audit plus the platform:

| path | ready | |
|---|---|---|
| `/` | `main` | |
| `/sobre` | `main` | |
| `/sobre/caatinga` | `main` | |
| `/sobre/carbono-e-comunidades` | `main` | |
| `/sobre/como-funciona` | `main` | |
| `/comunicacao` | `main` | |
| `/glossario` | `main` | |
| `/territorios` | `main h1` | |
| `/login` | `h1` | |
| `/cadastro` | `h1` | (needs `PLATFORM_ACCESS_GUARD_ENABLED=true` on the server) |
| `/esqueci-senha` | `h1` | |
| `/mapa` | `.maplibregl-canvas` | `session: true` |

`KNOWN_VIOLATIONS` starts with one entry: `{ path: '/', rule: 'target-size', reason: 'The hero dots are 6 px; workstream F enlarges their hit area (spec §6 F).' }`.

`judge`, in short:

- an outcome with `error` goes to `errors`, and its violations are not judged;
- a `serious` or `critical` violation with no known entry for the same path and rule is `unexpected`;
- a known entry is `stale` when its path was checked without error and none of that path's violations, at any impact, has its rule.

- [ ] **Step 5: Run them to see them pass**

Run: `npx vitest run tests/scripts/a11yJudge.test.ts tests/scripts/a11yRoutes.test.ts`
Expected: PASS.

- [ ] **Step 6: Implement `browser.ts`, `check.mts` and `serve-standalone.sh`**

- **`launchBrowser`:**
  - `puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true, args })`;
  - `args` is `['--no-sandbox']` only when `process.env.CI` is set: Ubuntu 24.04 runners block Chrome's user-namespace sandbox.
- **`waitForServer`:** poll `baseUrl` until any response below 500, by default up to 120 s.
- **`openRoute`:**
  1. Open a new page and set `VIEWPORT`.
  2. With `session`, set a `session` cookie for `baseUrl`, using `browser.setCookie` or, if the installed version lacks it, `page.setCookie`.
  3. With `reducedMotion`, call `page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])`. This happens before navigating.
  4. `goto(baseUrl + path, { waitUntil: 'networkidle2' })`.
  5. Throw ``status ${n}`` unless the response is 200.
  6. `waitForSelector(route.ready, { timeout: 15000 })`.
- **`check.mts`:**
  1. Read the paths from argv and run `routesToRun`.
  2. `waitForServer`, then launch the browser.
  3. Per route:
     - run `openRoute`;
     - inject axe with `page.evaluate(axe.source)` (`import axe from 'axe-core'`);
     - run it with `page.evaluate((o) => window.axe.run(document, o), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations'] })`;
     - map to `RouteViolation`, keeping at most 3 targets;
     - a thrown error becomes `{ error: message }`.
  4. Print one line per route (`✓ /path`, or each violation with its impact and targets).
  5. Print the verdict, close the browser, and exit with `passed ? 0 : 1`.
  - **Keep in-page callbacks free of named bindings** such as `const f = () => …`. tsx compiles with esbuild's `keepNames`, which wraps them in `__name()`, and the page has no `__name`.
  - Type `window.axe` with `declare global { interface Window { axe: typeof import('axe-core') } }` in `check.mts`.
- **`serve-standalone.sh`:** it serves the build as the Dockerfile's runner stage does, and finds `server.js` wherever tracing put it. A nested worktree nests it under the inferred root.

```sh
#!/usr/bin/env sh
# Serves `next build`'s standalone output the way the Dockerfile's runner stage
# does. PORT defaults to 3000.
set -eu
# As in the Dockerfile: server.js binds to $HOSTNAME, and CI runners set it to
# the machine's name, which localhost does not reach.
export HOSTNAME=0.0.0.0
server=$(find .next/standalone -name server.js -not -path '*/node_modules/*' | head -n 1)
dir=$(dirname "$server")
cp -R public "$dir/"
mkdir -p "$dir/.next"
cp -R .next/static "$dir/.next/"
cd "$dir"
exec node server.js
```

- [ ] **Step 7: Run it locally against main's code and settle what it finds**

1. Start `npx next dev --webpack -p <port>`, with `.env.local` copied in.
2. Run `A11Y_BASE_URL=http://localhost:<port> npm run a11y`.
3. Expected: every public route loads, and `/mapa` is skipped (no session).
4. For each unexpected serious or critical violation:
   - if spec §6 already lists it as a "Fix" in another workstream, add a `KNOWN_VIOLATIONS` entry whose `reason` names that workstream;
   - if the spec does not list it, stop and report it to the user, since it is a gap in the spec.
5. Never add an entry to make a run green otherwise.
6. A `stale` entry means the violation is gone. Confirm on the page, then delete the entry.
7. Run it again. Expected: exit 0.

- [ ] **Step 8: Add the check to CI**

In `ci.yml`:

- **The build step's `env`:**
  ```yaml
          env:
            # The public pages mount AuthProvider, which throws without a
            # Firebase web config. Placeholders let the axe step render them;
            # nothing signs in.
            NEXT_PUBLIC_FIREBASE_API_KEY: ci-placeholder
            NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ci-placeholder.firebaseapp.com
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: ci-placeholder
            NEXT_PUBLIC_FIREBASE_APP_ID: ci-placeholder
  ```
- **A last step:**
  ```yaml
        - name: Check accessibility (axe)
          run: |
            PLATFORM_ACCESS_GUARD_ENABLED=true sh scripts/a11y/serve-standalone.sh &
            npm run a11y
  ```

Extend the `CLAUDE.md` CI sentence with "and the axe check (`npm run a11y`)". Add two lines to its Commands block:

```bash
npm run a11y             # axe on scripts/a11y/routes.ts (A11Y_BASE_URL, A11Y_SESSION); runs in CI
npm run a11y:screens -- capture <dir> | compare <before> <after> <diff>   # the no-visual-change guard
```

- [ ] **Step 9: Commit**

```bash
git add scripts/a11y package.json package-lock.json .github/workflows/ci.yml CLAUDE.md tests/scripts/a11yJudge.test.ts tests/scripts/a11yRoutes.test.ts
git commit -m "build: check the public pages with axe in CI"
```

---

### Task 6: The screenshot guard

**Files:**
- Create: `scripts/a11y/imageDiff.ts`, `scripts/a11y/screens.mts`
- Modify: `package.json`, `package-lock.json`
- Test: `tests/scripts/a11yImageDiff.test.ts`

**Interfaces:**
- Consumes: `A11Y_ROUTES`, `routesToRun` and `screenshotName` (`routes.ts`); `launchBrowser`, `waitForServer` and `openRoute` (`browser.ts`).
- **`imageDiff.ts`:**
  - `export type RgbaImage = { width: number; height: number; data: Uint8Array }`
  - `export type ImageDiff = { kind: 'size'; before: [number, number]; after: [number, number] } | { kind: 'pixels'; differing: number; diff: RgbaImage }`
  - `export function diffImages(before: RgbaImage, after: RgbaImage): ImageDiff`
- **CLI:**
  - `npm run a11y:screens -- capture <dir> [path …]`, with the same env as `npm run a11y`;
  - `npm run a11y:screens -- compare <beforeDir> <afterDir> <diffDir>`, which exits 1 on any difference or on a file missing from `afterDir`.
- **For every later PR,** the procedure goes in its PR body:
  1. Capture `before` from a dev server of the base branch.
  2. Capture `after` from the PR branch.
  3. Run `compare`. Expected: 0 differences.
  - Keyboard-only UI never shows, since nothing presses a key.

- [ ] **Step 1: Add `pngjs`**

Run: `npm install --save-dev pngjs@^7.0.0 @types/pngjs@^6.0.5`

- [ ] **Step 2: Write the failing tests for `diffImages`**

The helper `img(w, h, fill: [r, g, b, a])` builds an `RgbaImage`.

- `finds no difference between identical images`: `kind` is `'pixels'` and `differing` is 0.
- `counts and paints each differing pixel`: change pixel (1, 0) of a 2×2 → `differing` 1, and `diff.data` at index 4 is `[255, 0, 0, 255]`.
- `leaves unchanged pixels grey, never red`: the other pixels have equal r, g and b, and alpha 255.
- `counts an alpha-only change`
- `reports a size change instead of comparing`: 2×2 vs 2×3 → `{ kind: 'size', before: [2, 2], after: [2, 3] }`.

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run tests/scripts/a11yImageDiff.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement `diffImages`**

- A differing pixel, where any channel differs, becomes opaque red.
- An unchanged pixel becomes a light grey from the after image's luma (`v = 255 - round((255 - luma) * 0.25)`, alpha 255), so the red stands out against the page's shape.

- [ ] **Step 5: Implement `screens.mts`**

**`capture`**, per route:

1. `openRoute(…, { session, reducedMotion: true })`. Under reduced motion the hero does not rotate (`Hero.tsx:126`) and the scenes hold still. Both sides of the comparison use it.
2. Add a style tag:
   ```css
   canvas { visibility: hidden !important }
   nextjs-portal { display: none !important }
   * { caret-color: transparent !important }
   ```
   The canvases hold map tiles and scene frames that vary between runs. `nextjs-portal` is the dev overlay.
3. Scroll down one viewport at a time, pausing 100 ms per step, so lazy images load.
4. `waitForFunction(() => Array.from(document.images).every((i) => i.complete))`.
5. Scroll back to the top and await `document.fonts.ready`.
6. Wait 500 ms, then `page.screenshot({ path: join(dir, screenshotName(path)), fullPage: true })`.

**`compare`:**

- For each `.png` in `beforeDir`, read both with `PNG.sync.read` and run `diffImages`.
- On any difference, write the diff with `PNG.sync.write` to `diffDir`, under the same name.
- Print a table of route, result and differing pixel count.
- Files only in `afterDir` are listed as "new, not compared". They are not failures: B adds `/acessibilidade`.

- [ ] **Step 6: Prove the capture is stable**

1. Against one dev server, run `capture /tmp/…/a` and then `capture /tmp/…/b`. Use the scratchpad, not `/tmp`.
2. Run `compare a b d`. Expected: 0 differences on every route.
3. If a route differs, look at its diff image and find the moving part. Hide it in the capture's style tag, with a comment saying what it is. Never drop the route.
4. Then sanity-check the other way: add a temporary `body { padding-top: 1px }` to `app/globals.css`, capture `c`, and run `compare a c d2`. Expected: the marketing routes differ.
5. Revert the CSS.

- [ ] **Step 7: Commit**

```bash
git add scripts/a11y/imageDiff.ts scripts/a11y/screens.mts package.json package-lock.json tests/scripts/a11yImageDiff.test.ts
git commit -m "build: add a screenshot comparison that proves a change is invisible"
```

---

### Task 7: A session for local checks of the platform

**Files:**
- Create: `scripts/a11y/session.mts`

**Interfaces:**
- **Produces:** `npx tsx scripts/a11y/session.mts <email>` prints a `session` cookie value, valid for one hour, for that account. Use it as `A11Y_SESSION=$(npx tsx scripts/a11y/session.mts <email>) npm run a11y -- /mapa`.
- **Which account:** run it only with an account the user names. It signs that account in against the shared Firebase project.

- [ ] **Step 1: Implement it**

1. Load `.env.local` with the same `loadEnv()` as `scripts/contentful-provision.mts:28-37`.
2. Initialize `firebase-admin` with `cert({ projectId, clientEmail, privateKey })` read like `lib/firebase-admin.ts:7-25`. Do not import that module: its `import 'server-only'` throws outside Next. Say so in a comment.
3. `getUserByEmail(email)`, then `createCustomToken(uid)`.
4. POST `{ token, returnSecureToken: true }` to `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${NEXT_PUBLIC_FIREBASE_API_KEY}` to get the `idToken`.
5. `createSessionCookie(idToken, { expiresIn: 60 * 60 * 1000 })`, and write it to stdout with no newline.
6. On any failure, write the message to stderr and exit 1. Never print the token.

The account's `caativar` claim travels in the ID token, so the access gate (`verifySessionCookie`) treats the cookie as it would a login.

- [ ] **Step 2: Verify it**

Ask the user which account to use. Then run `A11Y_SESSION=$(npx tsx scripts/a11y/session.mts <email>) A11Y_BASE_URL=http://localhost:<port> npm run a11y -- /mapa`.

Expected: `/mapa` loads, so the `.maplibregl-canvas` is found, and axe runs. Settle any violation as in Task 5, Step 7. The platform items of §6 E are "Fix" items for workstream E.

- [ ] **Step 3: Commit**

```bash
git add scripts/a11y/session.mts
git commit -m "build: mint a short session cookie for local checks of the platform"
```

---

### Task 8: Verify the branch, open the issues, hand over

**Files:**
- Modify: `CLAUDE.md` (a pointer to the spec under Supporting documentation)

- [ ] **Step 1: Point CLAUDE.md at the rules**

Under "Supporting documentation", add: "`docs/superpowers/specs/2026-11-03-accessibility-design.md`: the accessibility rules. Nothing a mouse user sees may change (decision 2); UI only the keyboard brings up may (2b); the rest is a known limitation (§8). The shared pieces are `announce()` (`lib/a11y/announce.ts`), `focusFirst()` (`lib/a11y/focus.ts`) and `HiddenDataTable` (`components/a11y/`)."

Commit: `git commit -am "docs: point CLAUDE.md at the accessibility rules"`

- [ ] **Step 2: Run the full local suite**

Run: `npm run lint && npm test && npm run contrast`
Expected: lint has 0 errors, every test passes (`contentfulSpace` runs live with `.env.local`), and contrast passes.

- [ ] **Step 3: Run the screenshot guard on this branch against main**

1. **Set up the base.**
   - Add a second worktree: `git worktree add .claude/worktrees/a11y-base origin/main`.
   - It needs no install: nested under the main checkout, it resolves the main checkout's `node_modules`, which serves `main`'s code.
   - Copy `.env.local` into it.
   - Serve it with `npx next dev --webpack -p <port B>`.
2. **Capture both sides.** The scripts always run from this worktree, with `A11Y_BASE_URL` pointing at each server.
   - Capture `before` from port B.
   - Capture `after` from this branch's server.
   - Use the Task 7 session on both, so `/mapa` is included.
3. **Compare.** Run `compare`. Expected: 0 differences on all 12 routes. The announcer is the only markup this branch adds to pages, and it is invisible.
4. **Clean up.** Stop the base server by its pid, and remove the base worktree.

- [ ] **Step 4: Check the announcer in the accessibility tree**

1. Open `/login`, `/territorios` and `/mapa` on this branch's server.
2. On each, read `Accessibility.getFullAXTree` through CDP. A short scratchpad script with `puppeteer-core` and `page.createCDPSession()` will do.
3. Expected: two nodes with `live: polite` and `live: assertive`, empty at rest, with nothing visible on screen.

The speaking behaviour is pinned by Task 2's unit tests. Record the tree excerpt for the PR body.

- [ ] **Step 5: Open the issues (Portuguese)**

- **The umbrella issue:**
  - title: "Acessibilidade do site e da plataforma";
  - body:
    - the motive in one line;
    - decision 2 (nothing visible changes) and 2b in plain words;
    - a link to the spec;
    - a checklist of the seven workstreams in §7's order: A, B, C, E1, E2, D, F.
- **A's task issue:**
  - title: "Acessibilidade A: fundações e verificação";
  - body: what this plan delivers, linked to the umbrella.

- [ ] **Step 6: Push and open the PR (English)**

1. Fetch first and rebase on `origin/main`, re-running Step 2 if anything moved.
2. Push and open the PR with `gh pr create`.
3. **Body:**
   - what it adds;
   - SAP #472's use-case table, "who gains / what changed": the guards protect everyone downstream;
   - the axe output;
   - the screenshot result: 12 routes, 0 differing pixels;
   - the Tab walk is not applicable (no interaction changed);
   - `Closes #<A's issue>`, and a mention of the umbrella.

Then use superpowers:finishing-a-development-branch.
