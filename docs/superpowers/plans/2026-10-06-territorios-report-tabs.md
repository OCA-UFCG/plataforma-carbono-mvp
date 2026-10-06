# Territórios Report Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Territórios story (`/territorios`) from one long scroll, with a scroll-spy rail and a sticky map, into the tabbed report of the Figma section "Resumo territorial". The report shows one tab at a time, has a title band carrying badges and actions, and puts summary cards on the last tab. The current copy and the current gallery of territory types stay.

**Architecture:** `TerritoriosApp` keeps every data concern it has today: the territory load, the theme scheduler with its two requests in flight, the history entries and the session banner. It swaps the scroll machinery for a `tab` state. Only the open tab's panel renders, beside one MapLibre instance that stays mounted. The summary stays in the DOM while hidden, so "Baixar" can print it from any tab. The new UI comes in small, separately tested components:
- `ReportBand`: the title band;
- `ReportActions`: its badges, "Baixar" and "Compartilhar";
- `ReportTabs`: the tab bar;
- `PanelNav`: the buttons at the foot of a panel;
- `StepIcon`: a tab's icon.

Colors move from "white text on a colored band" to "colored icon, title and figure", and summary badges are colored by whether a reading is good news.

**Tech Stack:** Next.js 16 (App Router), React 19, strict TypeScript, plain CSS files imported by components, `next/font/local`, Vitest 4 (node environment, components tested through `renderToStaticMarkup`).

**Spec:** The Figma section "Resumo territorial" `19254:37325` of the working copy `QP5obFCTTfjCSMVO8VgOc7` (page "Site/ portal" `2809:9655`). Its frames:
- "Resumo territorial" `19254:37326`: the type gallery, **out of scope**;
- "Escolha um município" `19254:37363`;
- "Território" `19254:37412`;
- "Resumo" `19254:37467`;
- hovers `19254:39149`;
- "Sobre os dados" open `19254:39200`;
- tab icons `19257:5752`.

The differences and the user's decisions are listed under **Decisions** below. Read the Figma working copy, never the designer's original (it is rate-limited).

## Decisions

The user decided these on 2026-10-06:

1. **Keep the current texts; follow the new structure.** Copy that exists today stays word for word: questions, answers, summary sentences, "Sobre os dados", chooser messages, the band's "Territórios" / "Que território você quer conhecer?". New controls with no current equivalent take the Figma label: "Recorte:", "Localização:", "escolher", "Baixar", "Ver relatório", the "Localização" tab, and "Recorte" on the back button.
2. **The first screen (gallery of types) stays as it is.** Do not build the Figma 3×2 card grid. It only loses the two "Em breve" types, "Propriedade Rural" and "Unidade de Conservação".
3. **Fire stays.** The Figma's "Degradação" tab, card and source are stale (the design predates 13deade). Fire takes the slot the design gave degradation: color `#7f765a` and position after "Uso da terra". Its icon is Material Symbols `local_fire_department`.
4. **The theme tabs that have no frame** (Estoque, Fluxo, Uso, Fogo, Chuva) follow the Território frame's template: text column 464 px, map beside it, buttons at the foot. They keep today's charts.
5. **Desktop first.** No phone design: the phone map sheet and the step rail's phone bar go. On narrow screens the map simply stacks under the text.
6. **"Baixar" calls `window.print()`**, which prints the summary as today. It first waits until every theme has an answer.
7. **The chooser keeps its behavior**, including the "É este território?" card. "Ver relatório" is a second way to confirm and is disabled until a territory is proposed.
8. **Bioma:** the location badge reads "Localização: **Caatinga**", is not a button, and the "Localização" tab is disabled.
9. **Summary badge color follows meaning, not direction.** A reading gets green (`--ctx-positivo-padrao`) when it is good news for the territory, red (`--ctx-negativo-padrao`) when it is bad news, and grey when it is "perto" (close to the Caatinga).
10. **Keep** the privacy note under "Usar minha localização" and the "Não achou? Escolha no mapa" link.

Defaults taken where the user gave no answer. Each is easy to reverse:
- **Tab count (question 7, unanswered).** Eight tabs on both screens: Localização, Território, Estoque, Fluxo, Uso da terra, Fogo, Chuva, Resumo. On the chooser only "Localização" is active; the rest are disabled.
- **Rain is neutral.** More or less rain than the Caatinga is neither good nor bad, so its badge stays grey.
- **The band's title takes the design's green** (`--role-categorica1-padrao`) on the chooser and the report only. The gallery keeps its olive (decision 2).
- **No placeholder** in the search field: "Digite o nome do município" would be new copy.
- **Task 9 adds new copy.** The two indicator cards of the Território tab ("0,8% da área da Caatinga", "40º maior entre os 1.210 municípios") come from Figma, since nothing says this today. It is the last task and independent: skip it if the user rejects that copy.

## Global Constraints

- Work in the worktree `/home/ezequias/oca/worktrees/territorios-tabs`, on branch `feat/territorios-report-tabs`, created from `origin/main` (see Setup). Never switch the branch of the main checkout `/home/ezequias/oca/plataforma-carbono-mvp`; the user's own dev server runs there on :3000.
- Run the tasks in order, 1 to 10. Later tasks consume names defined by earlier ones (see each task's **Interfaces**).
- Code, comments and docs in English. UI strings in Portuguese, verbatim. A comment that cites a UI label or a value quotes it verbatim and keeps the codebase's domain terms (`recorte`, `bioma`).
- Cite the Figma node a value comes from in a comment, as the codebase already does.
- Every `:hover` rule keeps a `:focus-visible` twin.
- No new npm dependencies. The only new binaries are `app/fonts/D-DIN-Bold.otf` with its license and the 17 SVG files of Appendix B.
- Do not convert, subset or edit the D-DIN font: the license reserves the name "D-DIN" for unmodified files. Do not edit a Figma SVG either. Only `fogo.svg` and `baixar.svg` are authored here, from Material Symbols (Apache 2.0).
- CI runs only `npm ci`, `npm run build` and `npm run contrast`, so run `npx vitest run` and `npm run lint` locally before each commit.
- Baselines on `origin/main` (d0c2d53), which no task may worsen:
  - `npx vitest run`: 71 files, 753 tests, all passing;
  - `npx tsc --noEmit -p .`: 5 errors, all in `tests/lib/{contentfulSpace,layerVisibility(2),reportService,zonalSeries}.test.ts`;
  - `npm run lint`: 5 problems (3 errors, 2 warnings), all in `components/mapa/`.
- Commits use conventional prefixes, are in English, and carry **no `Co-Authored-By` or other attribution trailer**.
- Rendered checks use the harness of `docs/superpowers/plans/2026-10-01-figma-parity.md`, Appendix A. Serve this worktree on port 3100 (`npx next dev -p 3100`). The `session` cookie is scoped to `localhost`, so the user's Chrome is already signed in. If a page redirects to `/login`, ask the user to sign in at `http://localhost:3100/login`; never type credentials.

## Review Focus

These are the failure modes most likely to reach a visitor that no single task's tests catch. Each line names where it is pinned.

1. **"Baixar" pressed on the Território tab right after a territory opens.** Most themes are still loading at that moment. The printed sheet must still hold all five cards, not only the first. Pinned in Task 6 (`readyToPrint` tests) and in Task 10, Step 4 (stubbed `window.print` counts the cards it would print).
2. **The map after the summary.** On the Resumo tab the map's column is hidden (`display: none`) and MapLibre sees a 0×0 container. Back on a theme tab, the map must fill its 340:250 frame again and show that tab's layer. The same must hold for an address that opens directly on `etapa=resumo`. Pinned in Task 10, Step 5.
3. **Old and edited addresses.** Before 13deade, links pointed at `etapa=degradacao`; an edited address can hold any `etapa`. Either must open the Território tab instead of breaking. Back and forward must walk the screens, and reload must reopen the tab. Pinned in Task 6 (`stepFromQuery` and `storyPath` tests) and Task 10, Step 6.
4. **The bioma report.** It has no chooser. "Localização" must be a disabled tab, the badge must read "Caatinga" and not be a button, and the Território tab must show no indicator cards. Pinned in Task 5 (`ReportTabs` and `ReportActions` tests), Task 9 (`territoryIndicators` test) and Task 10, Step 7.
5. **Keyboard focus across tabs.** A panel's "next" button unmounts with its panel. After it is pressed, the focus must land on the new panel's title, not fall back to `<body>`. Pinned in Task 10, Step 8.

---

## Setup

- [ ] **Step 1: Create the worktree**

```bash
cd /home/ezequias/oca/plataforma-carbono-mvp && git fetch origin
git worktree add -b feat/territorios-report-tabs /home/ezequias/oca/worktrees/territorios-tabs origin/main
cd /home/ezequias/oca/worktrees/territorios-tabs && npm ci
```

- [ ] **Step 2: Move this plan into the worktree and commit it**

```bash
mkdir -p /home/ezequias/oca/worktrees/territorios-tabs/docs/superpowers/plans
mv /home/ezequias/oca/plataforma-carbono-mvp/docs/superpowers/plans/2026-10-06-territorios-report-tabs.md \
   /home/ezequias/oca/worktrees/territorios-tabs/docs/superpowers/plans/
cd /home/ezequias/oca/worktrees/territorios-tabs
git add docs/superpowers/plans/2026-10-06-territorios-report-tabs.md
git commit -m "docs: add the plan for the Territórios report tabs"
```

- [ ] **Step 3: Confirm the baselines**

Run: `npx vitest run 2>&1 | tail -4; npx tsc --noEmit -p . 2>&1 | grep -c "error TS"; npm run lint 2>&1 | tail -2`
Expected: `Tests  753 passed (753)`, `5`, `✖ 5 problems (3 errors, 2 warnings)`.

All commands below run in `/home/ezequias/oca/worktrees/territorios-tabs`.

---

### Task 1: Drop the two "Em breve" types

**Files:**
- Modify: `types/territorios.ts:27-35`
- Modify: `config/territorios/story.ts:8-62`
- Modify: `config/territorios/chooserScript.ts:9-25`
- Modify: `components/territorios/TypeCards.tsx:46-73`
- Modify: `components/territorios/TerritoriosApp.tsx:88-91,123,135,137,429-432`
- Modify: `lib/territorios/themeService.ts:1-6,70-71`
- Modify: `app/territorios-galeria.css:78-100,166-171,290-293`
- Delete: `public/images/territorios/propriedade-rural.jpg`, `public/images/territorios/unidade-conservacao.jpg`
- Test: `tests/config/territoriosStory.test.ts`

**Interfaces:**
- Produces: `TerritoryTypeId` without `'propriedade_rural' | 'unidade_conservacao'`; `TerritoryType` without `enabled`, with `recorteId: string` (never null). `TERRITORY_TYPES` has six entries.

- [ ] **Step 1: Write the failing test**

In `tests/config/territoriosStory.test.ts`, add `existsSync` and `path` imports at the top:

```ts
import { existsSync } from 'node:fs'
import path from 'node:path'
```

Replace the whole `describe('TERRITORY_TYPES', ...)` block with:

```ts
describe('TERRITORY_TYPES', () => {
  it('points every type at a vector layer', () => {
    expect(TERRITORY_TYPES.map((t) => t.id)).toEqual([
      'bioma', 'estado', 'municipio', 'terra_indigena', 'territorio_quilombola', 'assentamento',
    ])
    for (const type of TERRITORY_TYPES) {
      expect(layers.find((l) => l.id === type.recorteId)?.type).toBe('vector')
    }
  })

  it('has a photo for every type', () => {
    for (const type of TERRITORY_TYPES) {
      expect(existsSync(path.join(process.cwd(), 'public', type.image)), type.id).toBe(true)
    }
  })
})
```

Replace the two `TERRITORY_TYPES.filter((t) => t.enabled && t.id !== 'bioma')` with `TERRITORY_TYPES.filter((t) => t.id !== 'bioma')`. One is in `STATE_LOCATIVE`, the other in `CHOOSER`. Also replace `listFeicoes(type.recorteId!)` with `listFeicoes(type.recorteId)`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/config/territoriosStory.test.ts`
Expected: FAIL in "points every type at a vector layer": the ids list has `'propriedade_rural'` and `'unidade_conservacao'` at the end.

- [ ] **Step 3: Remove the two types from the model**

In `types/territorios.ts`, replace the union with:

```ts
export type TerritoryTypeId =
  | 'bioma'
  | 'estado'
  | 'municipio'
  | 'terra_indigena'
  | 'territorio_quilombola'
  | 'assentamento'
```

In `config/territorios/story.ts`, replace the `TerritoryType` interface with:

```ts
export interface TerritoryType {
  id:        TerritoryTypeId
  /** Plural, capitalized as the layer names it. */
  label:     string
  /** Singular, for the type cards and the screen subtitle. */
  unitLabel: string
  /** Vector layer id in config/mapa/layers.json. */
  recorteId: string
  image:     string
  /** Lowercase plural for "{n} municípios com área na Caatinga"; null when there is no search. */
  plural:         string | null
  searchQuestion: string | null
}
```

In `TERRITORY_TYPES`, delete `enabled: true, ` from each of the six remaining entries. Then delete the `propriedade_rural` and `unidade_conservacao` entries, four lines each.

In `config/territorios/chooserScript.ts`, delete the line `  soonBadge: 'Em breve',` and these two lines of `descriptions`:

```ts
    propriedade_rural:     'Imóveis rurais do Cadastro Ambiental Rural.',
    unidade_conservacao:   'Unidades de conservação federais, estaduais e municipais.',
```

- [ ] **Step 4: Drop the "Em breve" branches**

In `components/territorios/TypeCards.tsx`, replace:

```tsx
                {type.enabled ? (
                  <button type="button" className="territorios-painel-botao" onClick={() => onSelect(type)}>
                    {INTRO.explore}
                  </button>
                ) : (
                  <p className="territorios-painel-embreve">{INTRO.soonBadge}</p>
                )}
```

with:

```tsx
                <button type="button" className="territorios-painel-botao" onClick={() => onSelect(type)}>
                  {INTRO.explore}
                </button>
```

and delete the line:

```tsx
                {!type.enabled && <span className="territorios-painel-rotulo-embreve">{INTRO.soonBadge}</span>}
```

In `components/territorios/TerritoriosApp.tsx`, replace:

```ts
function enabledType(recorteId: string): TerritoryType | null {
  const type = territoryTypeByRecorte(recorteId)
  return type?.enabled ? type : null
}
```

with:

```ts
function typeOf(recorteId: string): TerritoryType | null {
  return territoryTypeByRecorte(recorteId) ?? null
}
```

Then replace every other `enabledType(` in the file with `typeOf(`; there are three. In `chooseType`, delete the line `    if (!next.enabled || !next.recorteId) return`.

In `lib/territorios/themeService.ts`, change the header lines

```ts
// Only the recortes of enabled territory types are served, so this cannot be
// used to reduce a raster over any other vector layer.
```

to

```ts
// Only the recortes of the territory types are served, so this cannot be used
// to reduce a raster over any other vector layer.
```

and in `resolve` replace

```ts
  const enabled = TERRITORY_TYPES.some((t) => t.enabled && t.recorteId === recorteId)
  const layer = appConfig.layers.find((l) => l.id === recorteId && l.type === 'vector')
  if (!enabled || !layer) throw new TerritoryNotFoundError('Recorte not found.')
```

with

```ts
  const known = TERRITORY_TYPES.some((t) => t.recorteId === recorteId)
  const layer = appConfig.layers.find((l) => l.id === recorteId && l.type === 'vector')
  if (!known || !layer) throw new TerritoryNotFoundError('Recorte not found.')
```

- [ ] **Step 5: Drop the "Em breve" styles and photos**

In `app/territorios-galeria.css`:
1. Replace `.territorios-painel-rotulo,\n.territorios-painel-rotulo-embreve {\n  writing-mode: vertical-rl;` with `.territorios-painel-rotulo {\n  writing-mode: vertical-rl;`.
2. Delete the whole block `.territorios-painel-rotulo-embreve,\n.territorios-painel-embreve {` … `}` (font-size 12px, uppercase).
3. Delete the block `.territorios-painel-embreve {` … `}` (padding 8px 16px, white border).
4. Inside `@media (max-width: 767px)`, replace `  .territorios-painel-rotulo,\n  .territorios-painel-rotulo-embreve {` with `  .territorios-painel-rotulo {`.

Then:

```bash
git rm public/images/territorios/propriedade-rural.jpg public/images/territorios/unidade-conservacao.jpg
grep -rn "embreve\|soonBadge\|\.enabled\b\|propriedade_rural\|unidade_conservacao" app components config lib types tests scripts
```

Expected: the grep prints nothing.

- [ ] **Step 6: Run the tests and the type check**

Run: `npx vitest run tests/config/territoriosStory.test.ts tests/app/territoriosRoutes.test.ts && npx tsc --noEmit -p . 2>&1 | grep -c "error TS"`
Expected: PASS, then `5`.

- [ ] **Step 7: Commit**

```bash
git add -A types config components lib app tests public
git commit -m "feat: drop the two Territórios types that had no data"
```

---

### Task 2: Mark "Resumo territorial" in the header on /territorios

**Files:**
- Modify: `lib/marketing/nav.ts:28-36,64-74`
- Modify: `components/marketing/SiteHeader.tsx` (the desktop nav's `TERRITORIOS_LINK` anchor and its mobile twin)
- Test: `tests/lib/marketingNav.test.ts:148-160`

**Interfaces:**
- Produces: `activeNavHref('/territorios') === '/territorios'`.

- [ ] **Step 1: Write the failing test**

In `tests/lib/marketingNav.test.ts`, add to `describe('activeNavHref', ...)`:

```ts
  it('marks "Resumo territorial" on the story, which renders this header too', () => {
    expect(activeNavHref('/territorios')).toBe(TERRITORIOS_LINK.href)
    expect(activeNavHref('/territoriosx')).toBeNull()
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/marketingNav.test.ts -t "Resumo territorial"`
Expected: FAIL, `expected null to be '/territorios'`.

- [ ] **Step 3: Implement**

In `lib/marketing/nav.ts`, change the comment above `TERRITORIOS_LINK` to:

```ts
// The Territórios story, app/(territorios)/territorios: another route group too.
// A path, not the beta host's URL, so each deployment opens its own copy and
// keeps the visitor's session, whose cookie is scoped to the host. The story
// renders the site header, which marks this entry there (Figma 19254:37327).
```

and replace `activeNavHref` with:

```ts
// The header entry to mark active on `pathname`: the one whose route is the
// path itself or a parent of it, so every /sobre/* page lights "Sobre" and the
// story lights "Resumo territorial". "/" only owns itself, or it would own
// everything.
export function activeNavHref(pathname: string): string | null {
  for (const { href } of [...HEADER_LINKS, TERRITORIOS_LINK]) {
    if (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)) {
      return href
    }
  }
  return null
}
```

In `components/marketing/SiteHeader.tsx`, inside `SiteHeader` right after `const activeHref = activeNavHref(usePathname());`, add:

```tsx
  const territoriosActive = activeHref === TERRITORIOS_LINK.href;
```

Replace the desktop anchor and the comment above it:

```tsx
          {/* TERRITORIOS_LINK and MAPA_LINK cross a route group: a full page
              load, not next/link. Neither is ever active, as the header only
              renders inside the marketing group. */}
          <a href={TERRITORIOS_LINK.href} className={`${styles.navLink} text-ui-medium`}>
            {TERRITORIOS_LINK.label}
          </a>
```

with:

```tsx
          {/* TERRITORIOS_LINK and MAPA_LINK cross a route group: a full page
              load, not next/link. The story renders this header too and marks
              its own entry (Figma 19254:37327). */}
          <a
            href={TERRITORIOS_LINK.href}
            className={`${styles.navLink} ${territoriosActive ? `text-ui-bold ${styles.navLinkActive}` : "text-ui-medium"}`}
            aria-current={territoriosActive ? "page" : undefined}
          >
            {TERRITORIOS_LINK.label}
          </a>
```

In the mobile panel, add `aria-current={territoriosActive ? "page" : undefined}` to the `TERRITORIOS_LINK` anchor, after its `className`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/lib/marketingNav.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/marketing/nav.ts components/marketing/SiteHeader.tsx tests/lib/marketingNav.test.ts
git commit -m "feat: mark Resumo territorial in the header on the story"
```

---

### Task 3: Tab colors from the design

**Files:**
- Modify: `config/territorios/palette.ts:9-20,66-74`
- Modify: `config/territorios/story.ts` (`StoryTheme`, `STORY_THEMES`, the `STEP_COLORS` import)
- Modify: `components/territorios/ThemeStep.tsx:7,79`
- Modify: `components/territorios/StorySummary.tsx:7,138`
- Modify: `components/territorios/StepChart.tsx` (the compact land use `Bar`)
- Test: `tests/config/territoriosPalette.test.ts:131-138`, `tests/config/territoriosStory.test.ts`

**Interfaces:**
- Produces: `STEP_COLORS: Record<StepId, string>`, `resumo` included: territorio `#587c22`, estoque `#27725b`, fluxo `#27725b`, uso `#7f765a`, fogo `#7f765a`, chuva `#367483`, resumo `#587c22`. `FIGURE_COLORS` and `StoryTheme.color` no longer exist.

- [ ] **Step 1: Write the failing test**

In `tests/config/territoriosPalette.test.ts`, replace the test `'carries white text on each step color, and each reads on the surface, at 4.5:1'` with:

```ts
  it('takes the tab colors of the design, fire in the slot it gave degradation', () => {
    // Figma 19257:5752: carbon green, land brown, rain blue.
    expect(STEP_COLORS).toEqual({
      territorio: '#587c22',
      estoque:    '#27725b',
      fluxo:      '#27725b',
      uso:        '#7f765a',
      fogo:       '#7f765a',
      chuva:      '#367483',
      resumo:     '#587c22',
    })
  })

  it('reads each tab color at 3:1 on the page and on a summary card', () => {
    // Icons, 24 px titles, 40 px figures and chart bars: large text and
    // graphics, which WCAG holds to 3:1. --bg-superficie, the summary cards.
    const CARD_SURFACE = '#fefcf7'
    for (const [step, color] of Object.entries(STEP_COLORS)) {
      expect(contrast(color, SURFACE_COLOR), `${step} on the page`).toBeGreaterThanOrEqual(3)
      expect(contrast(color, CARD_SURFACE), `${step} on a card`).toBeGreaterThanOrEqual(3)
    }
  })
```

Delete `const WHITE = '#ffffff'` near the top of the file: only the replaced test used it.

In `tests/config/territoriosStory.test.ts`, delete:
- the import line `import { STEP_COLORS } from '@/config/territorios/palette'`;
- the import line `import { contrast } from '@/lib/color'`;
- the line `const MIN_CONTRAST = 4.5` and the blank line after it;
- the two tests `'carries white-legible colors'` and `'takes each color from the palette, so the band and the chart agree'`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/config/territoriosPalette.test.ts`
Expected: FAIL in "takes the tab colors of the design": `estoque` is `#47651b`.

- [ ] **Step 3: Implement the palette**

In `config/territorios/palette.ts`, replace the `STEP_COLORS` block (its comment included) with:

```ts
/**
 * Accent of each tab of the report: its icon and title, its big figures and
 * the bars of its charts (Figma 19257:5752, and the summary cards of
 * 19254:37507). Carbon reads green, land brown, rain blue; fire takes the slot
 * the design gave degradation, which it replaced (13deade). None carries text
 * under 24 px, so each needs 3:1 on the page and on a card, not 4.5:1
 * (tests/config/territoriosPalette.test.ts).
 */
export const STEP_COLORS: Record<StepId, string> = {
  // --role-marca-ancora-padrao
  territorio: '#587c22',
  // --role-categorica1-padrao
  estoque:    '#27725b',
  fluxo:      '#27725b',
  // --ar-800
  uso:        '#7f765a',
  fogo:       '#7f765a',
  // --role-categorica3-padrao
  chuva:      '#367483',
  resumo:     '#587c22',
}
```

Delete the `FIGURE_COLORS` block at the end of the file, with its comment.

In `config/territorios/story.ts`, delete the import line `import { STEP_COLORS } from '@/config/territorios/palette'`. Replace `StoryTheme` and `STORY_THEMES` with:

```ts
export interface StoryTheme {
  id:        ThemeId
  /** Raster layer id in config/mapa/layers.json. */
  layerId:   string
  railLabel: string
  /** Year of the map on this step; null for a static layer. */
  mapYear:   string | null
}

export const STORY_THEMES: StoryTheme[] = [
  { id: 'estoque',    layerId: 'estoque_carbono',  railLabel: 'Estoque',      mapYear: null },
  { id: 'fluxo',      layerId: 'gfw_netflux',      railLabel: 'Fluxo',        mapYear: null },
  { id: 'uso',        layerId: 'lulc_mapbiomas',   railLabel: 'Uso da terra', mapYear: '2024' },
  { id: 'fogo',       layerId: 'fogo_frequencia',  railLabel: 'Fogo',         mapYear: '2023' },
  { id: 'chuva',      layerId: 'chirps_precip',    railLabel: 'Chuva',        mapYear: '2024' },
]
```

- [ ] **Step 4: Point the figures and the summary bar at the tab colors**

In `components/territorios/ThemeStep.tsx`, change the import to `import { STEP_COLORS } from '@/config/territorios/palette'` and `color={FIGURE_COLORS[step]}` to `color={color}`.

In `components/territorios/StorySummary.tsx`, change the import to `import { STEP_COLORS } from '@/config/territorios/palette'` and `color={FIGURE_COLORS[row.theme]}` to `color={STEP_COLORS[row.theme]}`.

In `components/territorios/StepChart.tsx`, in the `compact` branch of `case 'uso'`, replace `color={LAND_USE_COLORS.nativa}` with `color={STEP_COLORS.uso}`, and add above that `<Bar` line:

```tsx
        // The summary's bar takes the tab's color, as its card does (Figma
        // 19254:37510); the dumbbell below keeps the map's native green.
```

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run tests/config tests/components && npx tsc --noEmit -p . 2>&1 | grep -c "error TS"`
Expected: PASS, then `5`.

- [ ] **Step 6: Commit**

```bash
git add config components tests
git commit -m "feat: take the Territórios tab colors from the design"
```

---

### Task 4: Summary readings carry a tone

**Files:**
- Modify: `types/territorios.ts` (`Reading`, `SummaryRow`)
- Modify: `lib/territorios/storyText.ts` (`stockRow`, `fluxRow`, `landUseRow`, `fireRow`, `rainRow`, `summaryRows`, new `readingTone`)
- Test: `tests/lib/territoriosStoryText.test.ts:379-419`

**Interfaces:**
- Produces: `type Tone = 'good' | 'bad' | 'neutral'`; `SummaryRow.tone: Tone | null` (null exactly when `reading` is null); `readingTone(reading: Reading | null, moreIsBetter: boolean | null): Tone | null`.

- [ ] **Step 1: Write the failing tests**

In `tests/lib/territoriosStoryText.test.ts`, add `readingTone` to the import from `@/lib/territorios/storyText`. In the Campina Grande expectation of `summaryRows`, add a `tone` after each `reading`:
- estoque: `tone: 'bad'`;
- fluxo: `tone: 'bad'`;
- uso: `tone: 'bad'`;
- fogo: `tone: 'good'`;
- chuva: `tone: 'neutral'`.

Append:

```ts
describe('readingTone', () => {
  it('colors a reading by whether it is good news for the territory', () => {
    expect(readingTone('acima', true)).toBe('good')
    expect(readingTone('abaixo', true)).toBe('bad')
    expect(readingTone('acima', false)).toBe('bad')
    expect(readingTone('abaixo', false)).toBe('good')
  })

  it('stays neutral close to the Caatinga and for a theme that judges nothing', () => {
    expect(readingTone('perto', true)).toBe('neutral')
    expect(readingTone('acima', null)).toBe('neutral')
  })

  it('has no tone without a reading', () => {
    expect(readingTone(null, true)).toBeNull()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/territoriosStoryText.test.ts`
Expected: FAIL. `readingTone is not a function`, and the rows have no `tone`.

- [ ] **Step 3: Add the type**

In `types/territorios.ts`, below `export type Reading = ...`, add:

```ts
/**
 * Whether a reading is good news for the territory: more carbon held, more
 * taken from the air, more native vegetation, less fire. The words of the
 * reading judge nothing; only the color of its badge does.
 */
export type Tone = 'good' | 'bad' | 'neutral'
```

and in `SummaryRow`, below `reading:  Reading | null`, add:

```ts
  /** Color of the reading's badge; null with no reading. */
  tone:     Tone | null
```

- [ ] **Step 4: Compute the tone**

In `lib/territorios/storyText.ts`, add `Tone` to the type import from `@/types/territorios`. Above `function stockRow`, add:

```ts
/**
 * Whether more than the Caatinga is good news, per theme; null where it is
 * neither, as with rain. Flux is left out: more per hectare is good news for a
 * removal and bad news for an emission, so its row passes its own direction.
 */
const MORE_IS_BETTER: Record<Exclude<ThemeId, 'fluxo'>, boolean | null> = {
  estoque: true,
  uso:     true,
  fogo:    false,
  chuva:   null,
}

/** The color of a reading's badge on the summary (Figma 19254:37508). */
export function readingTone(reading: Reading | null, moreIsBetter: boolean | null): Tone | null {
  if (reading === null) return null
  if (reading === 'perto' || moreIsBetter === null) return 'neutral'
  return (reading === 'acima') === moreIsBetter ? 'good' : 'bad'
}
```

Make each row return `tone`:
- In every early `return { headline: null, sentence: …, reading: null }` of the five row functions, add `, tone: null` after `reading: null`. There are six such returns, two of them in `fluxRow`.
- `stockRow`'s last return becomes:

```ts
  const reading = cmp?.reading ?? null
  return {
    headline: { value: formatNumber(here), unit: s.unit },
    sentence: joinSentences(s.total(formatTonnes(data.report.totalTc)), cmp && s.biome(formatNumber(cmp.reference))),
    reading,
    tone:     readingTone(reading, MORE_IS_BETTER.estoque),
  }
```

- In `fluxRow`, replace `    reading: cmp?.reading ?? null,` with:

```ts
    reading: cmp?.reading ?? null,
    tone:    readingTone(cmp?.reading ?? null, m.direction === 'removal'),
```

- In `landUseRow`, replace `    reading: ref ? readingOf(chart.here.to, ref.to) : null,` with:

```ts
    reading: ref ? readingOf(chart.here.to, ref.to) : null,
    tone:    readingTone(ref ? readingOf(chart.here.to, ref.to) : null, MORE_IS_BETTER.uso),
```

- In `fireRow`, replace `    reading:  cmp?.reading ?? null,` with:

```ts
    reading:  cmp?.reading ?? null,
    tone:     readingTone(cmp?.reading ?? null, MORE_IS_BETTER.fogo),
```

- In `rainRow`, replace `    reading: cmp?.reading ?? null,` with:

```ts
    reading: cmp?.reading ?? null,
    tone:    readingTone(cmp?.reading ?? null, MORE_IS_BETTER.chuva),
```

- In `summaryRows`, replace `if (!settled(id, response)) return { ...head, headline: null, sentence: '', reading: null }` with `if (!settled(id, response)) return { ...head, headline: null, sentence: '', reading: null, tone: null }`.

`Reading` must be in the type import of `storyText.ts`; add it if missing.

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run tests/lib/territoriosStoryText.test.ts && npx tsc --noEmit -p . 2>&1 | grep -c "error TS"`
Expected: PASS, then `5`.

- [ ] **Step 6: Commit**

```bash
git add types/territorios.ts lib/territorios/storyText.ts tests/lib/territoriosStoryText.test.ts
git commit -m "feat: give each summary reading a tone by whether it is good news"
```

---

### Task 5: The report's building blocks (band, badges, tabs, panel buttons, icons)

**Files:**
- Create: `public/images/territorios/icones/*.svg` (17 files, Appendix B)
- Create: `config/territorios/icons.ts`
- Modify: `config/territorios/chooserScript.ts` (new `REPORT`)
- Modify: `app/globals.css:37-60` (four tokens)
- Create: `app/territorios-relatorio.css`
- Create: `components/territorios/StepIcon.tsx`, `PanelNav.tsx`, `ReportBand.tsx`, `ReportActions.tsx`, `ReportTabs.tsx`
- Test: `tests/config/territoriosIcons.test.ts`, `tests/components/territoriosReport.test.ts`, `tests/lib/marketingPalette.test.ts`

**Interfaces:**
- Consumes: `STEP_COLORS` (Task 3); `STEPS`, `STEP_LABELS`, `TerritoryType` (`config/territorios/story.ts`); `INTRO.changeType`; and from `UI`: `changeTerritory`, `share`, `linkCopied`, `copyFailed`, `stepsLabel`.
- Produces:
  - `REPORT = { cut, location, locationPending, biomeLocation, download, seeReport }`;
  - `IconBox`, `STEP_ICONS: Record<StepId, IconBox>`, `UI_ICONS` (keys `edit`, `download`, `share`, `shareDisabled`, `locate`, `back`, `next`, `nextDisabled`, `open`, `close`);
  - components:
    - `StepIcon({ step })`;
    - `PanelNav({ onBack, next? })`;
    - `ReportBand({ eyebrow, title, headingRef, children? })`;
    - `ReportActions({ type, onChangeType, location?, shareTitle, onDownload, downloading })`, with `LocationBadge = { value: string; onEdit: (() => void) | null }`;
    - `ReportTabs({ current, stepsEnabled, onLocation, onSelect })`, with `ReportTab = StepId | 'localizacao'`;
  - CSS classes: `territorios-secao-faixa--acoes`, `territorios-selo`, `territorios-acao(--baixar|--compartilhar)`, `territorios-abas`, `territorios-aba`, `territorios-icone`, `territorios-painel-nav`, `territorios-navegar`;
  - tokens: `--bg-superficie`, `--ar-800`, `--ctx-positivo-padrao`, `--foreground`.

- [ ] **Step 1: Add the icon files**

Run the script of Appendix B from the worktree root, then verify:

```bash
cd public/images/territorios/icones && sha256sum -c - <<'EOF'
9ee2cd9a9de7ee4a9bd72649cbf8e989a06156150d411a287ed18dac14e1fa33  abrir.svg
cd46d4d42750a69db04ab28fb8a39d068e1bfda9d72641f21b75c54d6212334a  baixar.svg
048410eeac536f2f063cc9ef87f2601e737026cdb9a8e94e61f1adcf70189462  chuva.svg
c903d684cf038feb7f8ae6a1823cf357c40fc8e48f555ce4870b1160fc1a9c40  compartilhar-desabilitado.svg
91927e6d324c190abfc486248e17ebed98ff80eb8a683b17be63b402a35ef766  compartilhar.svg
496ed82f40e00265c270ebce73c5155171ae2177beb3581326093ef0aac55846  editar.svg
8ec9b541c763cbec361d84bc13baf0a61d74dd5c1f06f2f9f39168999625fa93  estoque.svg
92929627854e33c4208becb4f326e9bb8e53bce7a28512bce366f942abef5926  fechar.svg
d581b2e83fe04234c81d7f35585eae16f30a02c48da754c81447f717ddf8d394  fluxo.svg
f2bafe0e057ac7bf3bac816f7ab6c58c658240df9003e94505ef41f8e7f5c760  fogo.svg
0e081aff80f0dfe0b412eed09cd9c9afaf2a59b1a5f734d46ef9e7e0f7da0192  localizacao.svg
cf6a6b682508f8de882c184e28b54a0b4d708525e140ea2d3485483396d474e2  resumo.svg
dd46ff46528441edd9dfad294aafb5846930965b532f770fbf3dbe0d642673c2  seta-direita-desabilitada.svg
9708ff137921c4486ed9d90bf53d167e8592d25ad007892b024730b4f9e50b59  seta-direita.svg
0b9a2cf33de9a7b39940f743a7d0c6a8740c2995251abd671f04c3506827446c  seta-esquerda.svg
b48659dc37ebff0f5a3d72558360970b279d36950187e6327898ecc5e5bfdad9  territorio.svg
d96b0551e33ad5a1929d31761abdd42cce1ca8aa4e043f817213cf6a06117946  uso.svg
EOF
cd -
```

Expected: 17 lines ending in `OK`.

- [ ] **Step 2: Write the failing tests**

Create `tests/config/territoriosIcons.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { STEP_ICONS, UI_ICONS } from '@/config/territorios/icons'
import { STEP_COLORS } from '@/config/territorios/palette'
import type { StepId } from '@/types/territorios'

const read = (src: string) => readFileSync(path.join(process.cwd(), 'public', src), 'utf8')

/** The root <svg> element's own width and height attributes. */
function rootSize(svg: string): [number, number] {
  const root = svg.match(/<svg\b[^>]*>/)?.[0] ?? ''
  return [Number(root.match(/\swidth="([\d.]+)"/)?.[1]), Number(root.match(/\sheight="([\d.]+)"/)?.[1])]
}

describe('tab icons', () => {
  it('draws each file at its own size, inside the 24 px box at its inset', () => {
    for (const [step, icon] of Object.entries(STEP_ICONS)) {
      expect(rootSize(read(icon.src)), step).toEqual([icon.width, icon.height])
      expect(icon.left + icon.width, step).toBeLessThanOrEqual(24)
      expect(icon.top + icon.height, step).toBeLessThanOrEqual(24)
    }
  })

  it('paints each in its tab color, so icon and title agree', () => {
    for (const [step, icon] of Object.entries(STEP_ICONS)) {
      expect(read(icon.src).toLowerCase(), step).toContain(`fill="${STEP_COLORS[step as StepId]}"`)
    }
  })

  it('ships every interface icon', () => {
    for (const src of Object.values(UI_ICONS)) expect(read(src).startsWith('<svg'), src).toBe(true)
  })
})
```

Create `tests/components/territoriosReport.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PanelNav from '@/components/territorios/PanelNav'
import ReportActions, { type ReportActionsProps } from '@/components/territorios/ReportActions'
import ReportBand from '@/components/territorios/ReportBand'
import ReportTabs from '@/components/territorios/ReportTabs'
import StepIcon from '@/components/territorios/StepIcon'
import { TERRITORY_TYPES, type TerritoryType } from '@/config/territorios/story'
import type { TerritoryTypeId } from '@/types/territorios'

const html = <P extends object>(component: ComponentType<P>, props: P) =>
  renderToStaticMarkup(createElement(component, props))

const noop = () => {}
const typeOf = (id: TerritoryTypeId): TerritoryType => TERRITORY_TYPES.find((t) => t.id === id)!

/** Every <button> of a markup: its text without tags, and whether it is disabled. */
function buttons(markup: string): { text: string; disabled: boolean }[] {
  return [...markup.matchAll(/<button([^>]*)>(.*?)<\/button>/g)].map(([, attrs, inner]) => ({
    text: inner.replace(/<[^>]+>/g, '').trim(),
    disabled: /\sdisabled=""/.test(attrs),
  }))
}

describe('ReportTabs', () => {
  it('opens on "Localização" while a territory is chosen, every step disabled', () => {
    const markup = html(ReportTabs, { current: 'localizacao', stepsEnabled: false, onLocation: null, onSelect: noop })
    expect(buttons(markup)).toEqual([
      { text: 'Localização', disabled: false },
      { text: 'Território', disabled: true },
      { text: 'Estoque', disabled: true },
      { text: 'Fluxo', disabled: true },
      { text: 'Uso da terra', disabled: true },
      { text: 'Fogo', disabled: true },
      { text: 'Chuva', disabled: true },
      { text: 'Resumo', disabled: true },
    ])
    expect(markup).toMatch(/aria-current="step"[^>]*>Localização</)
  })

  it('marks the open step and leads back to the chooser', () => {
    const markup = html(ReportTabs, { current: 'fogo', stepsEnabled: true, onLocation: noop, onSelect: noop })
    expect(buttons(markup).every((b) => !b.disabled)).toBe(true)
    expect(markup).toMatch(/aria-current="step"[^>]*>Fogo</)
    expect(markup.match(/aria-current/g)).toHaveLength(1)
  })

  it('disables "Localização" for the bioma, which has nothing to choose', () => {
    const markup = html(ReportTabs, { current: 'territorio', stepsEnabled: true, onLocation: null, onSelect: noop })
    expect(buttons(markup)[0]).toEqual({ text: 'Localização', disabled: true })
  })
})

const ACTIONS: ReportActionsProps = {
  type: typeOf('municipio'), onChangeType: noop, location: null, shareTitle: null, onDownload: null, downloading: false,
}

describe('ReportActions', () => {
  it('asks for a location and disables both buttons before a territory is chosen', () => {
    const markup = html(ReportActions, ACTIONS)
    expect(markup).toContain('<p class="territorios-selo">Localização: escolher</p>')
    expect(buttons(markup)).toEqual([
      { text: 'Recorte: município. Trocar tipo', disabled: false },
      { text: 'Baixar', disabled: true },
      { text: 'Compartilhar', disabled: true },
    ])
    expect(markup).toContain('/images/territorios/icones/compartilhar-desabilitado.svg')
  })

  it('names the chosen territory and opens the chooser from its badge', () => {
    const markup = html(ReportActions, {
      ...ACTIONS, location: { value: 'Juazeiro (BA)', onEdit: noop }, shareTitle: 'Juazeiro (BA)', onDownload: noop,
    })
    expect(buttons(markup)).toEqual([
      { text: 'Recorte: município. Trocar tipo', disabled: false },
      { text: 'Localização: Juazeiro (BA). Trocar território', disabled: false },
      { text: 'Baixar', disabled: false },
      { text: 'Compartilhar', disabled: false },
    ])
    expect(markup).toContain('/images/territorios/icones/compartilhar.svg')
  })

  it('shows the bioma\'s location as a plain badge', () => {
    const markup = html(ReportActions, {
      ...ACTIONS, type: typeOf('bioma'), location: { value: 'Caatinga', onEdit: null }, shareTitle: 'Caatinga', onDownload: noop,
    })
    expect(markup).toContain('<p class="territorios-selo">Localização: <b>Caatinga</b></p>')
    expect(buttons(markup).map((b) => b.text)).toEqual(['Recorte: bioma. Trocar tipo', 'Baixar', 'Compartilhar'])
  })

  it('leaves the location out while the territory loads', () => {
    expect(html(ReportActions, { ...ACTIONS, location: undefined })).not.toContain('Localização')
  })

  it('marks "Baixar" busy while the summary waits for its themes', () => {
    expect(html(ReportActions, { ...ACTIONS, onDownload: noop, downloading: true })).toContain('aria-busy="true"')
  })
})

describe('ReportBand', () => {
  it('lays the actions beside the titles only when there are some', () => {
    const plain = html(ReportBand, { eyebrow: 'Territórios', title: 'Que território você quer conhecer?', headingRef: null })
    expect(plain).not.toContain('territorios-secao-faixa--acoes')
    expect(plain).toContain('<h2 id="territorios-secao-titulo" tabindex="-1" class="territorios-secao-titulo text-h2">')

    const withActions = html(ReportBand, {
      eyebrow: 'Territórios', title: 'Juazeiro (BA)', headingRef: null, children: createElement('span', null, 'ações'),
    })
    expect(withActions).toContain('territorios-secao-faixa--acoes')
  })
})

describe('PanelNav', () => {
  it('goes back to the types and on to the named tab', () => {
    expect(buttons(html(PanelNav, { onBack: noop, next: { label: 'Estoque', onClick: noop } }))).toEqual([
      { text: 'Recorte', disabled: false },
      { text: 'Estoque', disabled: false },
    ])
  })

  it('disables the way on until there is somewhere to go, with the grey arrow', () => {
    const markup = html(PanelNav, { onBack: noop, next: { label: 'Ver relatório', onClick: null } })
    expect(buttons(markup)[1]).toEqual({ text: 'Ver relatório', disabled: true })
    expect(markup).toContain('seta-direita-desabilitada.svg')
  })

  it('has only the way back on the summary', () => {
    expect(buttons(html(PanelNav, { onBack: noop }))).toEqual([{ text: 'Recorte', disabled: false }])
  })
})

describe('StepIcon', () => {
  it('places an inner glyph at its inset inside the 24 px box', () => {
    const markup = html(StepIcon, { step: 'fluxo' })
    expect(markup).toContain('src="/images/territorios/icones/fluxo.svg"')
    expect(markup).toContain('width="20" height="17" style="top:3px;left:2px"')
  })
})
```

In `tests/lib/marketingPalette.test.ts`, append to `PAIRS`, before its closing `]`:

```ts
  // Territórios report (Figma 19254:37467): the reading badges and the text of
  // a summary card on its --bg-superficie fill, and the figure's unit on the page.
  ['--ctx-positivo-padrao', '--bg-superficie'],
  ['--ctx-negativo-padrao', '--bg-superficie'],
  ['--bg-texto-primario', '--bg-superficie'],
  ['--foreground', '--bg-superficie'],
  ['--foreground', '--bg-fundo'],
```

and to `LARGE_TEXT_PAIRS`, after `['--ctx-negativo-padrao', '--ctx-negativo-container'],`:

```ts
  // The land use and fire figures, 40px D-DIN Bold, and their 24px titles
  // (Figma 19257:13575), on the page and on a summary card: 4.4:1.
  ['--ar-800', '--bg-fundo'],
  ['--ar-800', '--bg-superficie'],
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run tests/config/territoriosIcons.test.ts tests/components/territoriosReport.test.ts tests/lib/marketingPalette.test.ts`
Expected: FAIL. The icon and report tests cannot resolve `@/config/territorios/icons` and the new components; the palette test fails on `--bg-superficie missing`.

- [ ] **Step 4: Add the tokens**

In `app/globals.css`, inside `:root`:
- after `  --ctx-negativo-container: #efd7d2;` add `  --ctx-positivo-padrao: #587c22;`;
- after `  --bg-superficie-variante: #fcf8eb;` add:

```css
  /* The summary cards of the Territórios report (Figma 19254:37508). */
  --bg-superficie: #fefcf7;
  /* Body text of the report's answers and cards (19254:37457). */
  --foreground: #292829;
```

- after `  --ar-050: #fefefb;` add `  --ar-800: #7f765a;`.

- [ ] **Step 5: Add the strings and the icon map**

In `config/territorios/chooserScript.ts`, change the header comment's first sentence to cover the new screens:

```ts
// Every string of the screens around the Territórios story: the section's title
// band, its badges and tabs, the gallery of types, and the chooser where one
// territory of a type is picked on the map, by location or by name. The
// story's own strings live in storyScript.ts.
```

Append to the file:

```ts
/** Labels of the report's title band, tabs and panel buttons (Figma 19254:37412). */
export const REPORT = {
  /** The type badge, "Recorte: município", and the way back to the types. */
  cut:             'Recorte',
  location:        'Localização',
  /** The location badge before a territory is chosen (19254:37384). */
  locationPending: 'escolher',
  /** The bioma's location: there is nothing else to choose. */
  biomeLocation:   'Caatinga',
  download:        'Baixar',
  seeReport:       'Ver relatório',
}
```

Create `config/territorios/icons.ts`:

```ts
// Icons of the Territórios report, served from public/images/territorios/icones.
// The Figma exports are used as they come (Figma 19257:5752 for the tabs,
// 19254:37414 and 19254:37407 for the rest); fogo.svg and baixar.svg are
// Material Symbols "local_fire_department" and "download" (Apache 2.0),
// filled with the color they sit on: the fire tab's, and white on "Baixar".

import type { StepId } from '@/types/territorios'

const DIR = '/images/territorios/icones'

/** A glyph inside its 24 px box: its file, its own size, and where it sits. */
export interface IconBox {
  src:    string
  width:  number
  height: number
  top:    number
  left:   number
}

const full = (name: string): IconBox => ({ src: `${DIR}/${name}.svg`, width: 24, height: 24, top: 0, left: 0 })

/**
 * The "Air" and "Summarize" glyphs export as their inner group, which the
 * design places at an inset of its 24 px frame: 12.5% 8.33% 16.67% 8.33% and
 * 12.5% all round.
 */
export const STEP_ICONS: Record<StepId, IconBox> = {
  territorio: full('territorio'),
  estoque:    full('estoque'),
  fluxo:      { src: `${DIR}/fluxo.svg`, width: 20, height: 17, top: 3, left: 2 },
  uso:        full('uso'),
  fogo:       full('fogo'),
  chuva:      full('chuva'),
  resumo:     { src: `${DIR}/resumo.svg`, width: 18, height: 18, top: 3, left: 3 },
}

/** Each in the color of the control it sits in, one file per state. */
export const UI_ICONS = {
  edit:          `${DIR}/editar.svg`,
  download:      `${DIR}/baixar.svg`,
  share:         `${DIR}/compartilhar.svg`,
  shareDisabled: `${DIR}/compartilhar-desabilitado.svg`,
  locate:        `${DIR}/localizacao.svg`,
  back:          `${DIR}/seta-esquerda.svg`,
  next:          `${DIR}/seta-direita.svg`,
  nextDisabled:  `${DIR}/seta-direita-desabilitada.svg`,
  open:          `${DIR}/abrir.svg`,
  close:         `${DIR}/fechar.svg`,
} as const
```

- [ ] **Step 6: Add the stylesheet**

Create `app/territorios-relatorio.css`:

```css
/*
 * Building blocks of the Territórios report (Figma 19254:37412 and its
 * siblings): the actions of the title band, its badges, the tab bar, the tab
 * icons and the buttons at the foot of a panel. Imported by the components
 * that draw them; territorios.css holds the band itself and the panels.
 */

/* Titles and actions on one row, bottom-aligned (19254:37414). */
.territorios-secao-faixa--acoes .territorios-secao-faixa-conteudo {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px 24px;
  padding-block: 40px 16px;
}

.territorios-secao-faixa-titulos {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

/* The eyebrow sets solid, Rubik Medium 14/14 (19254:37416), so the band is
   the design's 110 px: 40 + 14 + 4 + 36 + 16. */
.territorios-secao-faixa--acoes .territorios-secao-sobretitulo {
  line-height: 14px;
}

/* The report's title takes the design's green (19254:37417), 4.75:1 on
   --am-100; the gallery keeps the section's olive. */
.territorios-secao-faixa--acoes .territorios-secao-titulo {
  color: var(--role-categorica1-padrao);
}

.territorios-acoes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

/* Badge (19254:37432): Rubik 16, the value bold, the edit icon after it.
   Figma draws its strokes inside the box, so each padding here is the
   design's less the 1 px border. */
.territorios-selo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 7px 9px;
  border: 1px solid var(--role-categorica1-padrao);
  border-radius: 9999px;
  background: none;
  font-family: var(--font-sans), sans-serif;
  font-size: 16px;
  line-height: 24px;
  color: var(--role-categorica1-padrao);
  white-space: nowrap;
}

.territorios-selo b {
  font-weight: 700;
}

.territorios-selo img {
  flex: none;
}

button.territorios-selo {
  cursor: pointer;
  transition: background-color 0.18s ease;
}

/* 19254:39194. */
button.territorios-selo:hover,
button.territorios-selo:focus-visible {
  background: var(--role-categorica1-container);
}

/* "Baixar" and "Compartilhar" (19254:37434, 19254:37435): Inter Medium 14. */
.territorios-acao {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 7px 15px;
  border: 1px solid var(--role-categorica1-padrao);
  border-radius: var(--radius-interno);
  font-family: var(--font-ui), sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 24px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.territorios-acao img {
  flex: none;
}

.territorios-acao--baixar {
  background: var(--role-categorica1-padrao);
  color: #ffffff;
}

/* 19254:39180. */
.territorios-acao--baixar:hover,
.territorios-acao--baixar:focus-visible {
  background: var(--role-categorica1-hover);
  border-color: var(--role-categorica1-hover);
}

.territorios-acao--compartilhar {
  background: none;
  color: var(--role-categorica1-padrao);
}

/* 19254:39174. */
.territorios-acao--compartilhar:hover,
.territorios-acao--compartilhar:focus-visible {
  background: var(--role-categorica1-container);
}

/* Before a territory is chosen (19254:37385, 19254:37386). */
.territorios-acao:disabled {
  cursor: default;
}

.territorios-acao--baixar:disabled {
  background: var(--role-neutro-texto-desabilitado);
  border-color: var(--role-neutro-texto-desabilitado);
}

.territorios-acao--compartilhar:disabled {
  background: none;
  border-color: var(--role-neutro-texto-desabilitado);
  color: var(--role-neutro-texto-desabilitado);
}

.territorios-acao[aria-busy='true'] {
  cursor: progress;
}

/* "Link copiado", under the buttons. */
.territorios-aviso-link {
  flex-basis: 100%;
  font-size: 14px;
  line-height: 20px;
  text-align: right;
  color: var(--bg-texto-primario);
}

.territorios-aviso-link:empty {
  display: none;
}

/* Tab bar (19254:37436): Inter Medium 14, the open tab olive and underlined. */
.territorios-abas {
  background: var(--bg-fundo);
  border-bottom: 1px solid var(--role-neutro-texto-desabilitado);
}

.territorios-abas-lista {
  display: flex;
  gap: 34px;
  padding-top: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  list-style: none;
}

.territorios-abas-lista li {
  flex: none;
}

.territorios-aba {
  display: block;
  padding: 16px 12px 14px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  font-family: var(--font-ui), sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: var(--bg-texto-primario);
  white-space: nowrap;
  cursor: pointer;
}

.territorios-aba:hover,
.territorios-aba:focus-visible {
  color: var(--role-marca-ancora-padrao);
}

/* The bar clips anything drawn outside it. */
.territorios-aba:focus-visible {
  outline-offset: -2px;
}

.territorios-aba[aria-current='step'] {
  color: var(--role-marca-ancora-padrao);
  border-bottom-color: var(--role-marca-ancora-padrao);
  box-shadow: var(--shadow-sm);
}

.territorios-aba:disabled {
  color: var(--role-neutro-texto-desabilitado);
  cursor: default;
}

/* A tab's icon in its 24 px box (19257:5752). */
.territorios-icone {
  position: relative;
  flex: none;
  width: 24px;
  height: 24px;
}

.territorios-icone img {
  position: absolute;
  display: block;
}

/* Buttons at the foot of a panel (19254:37462): two halves, or the way back
   alone at 220 px on the summary (19254:37515). */
.territorios-painel-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.territorios-painel-nav--voltar {
  grid-template-columns: minmax(0, 220px);
}

.territorios-navegar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 40px;
  padding: 7px 15px;
  border: 1px solid var(--role-marca-ancora-borda);
  border-radius: var(--radius-interno);
  background: none;
  font-family: var(--font-ui), sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 24px;
  color: var(--role-marca-ancora-padrao);
  cursor: pointer;
  transition: background-color 0.18s ease;
}

.territorios-navegar--voltar {
  background: var(--bg-fundo);
}

/* No hover in the design; the outline buttons' own (territorios.css). */
.territorios-navegar:hover,
.territorios-navegar:focus-visible {
  background: var(--am-100);
}

/* "Ver relatório" before a territory is proposed (19254:37409); #b3b3b3 is
   the design's disabled border, with no token of its own. */
.territorios-navegar:disabled {
  border-color: #b3b3b3;
  background: none;
  color: #b3b3b3;
  cursor: default;
}

.territorios-navegar img {
  flex: none;
}
```

- [ ] **Step 7: Add the components**

Create `components/territorios/StepIcon.tsx`:

```tsx
/* eslint-disable @next/next/no-img-element -- fixed-size icons exported from Figma */
import '@/app/territorios-relatorio.css'
import { STEP_ICONS } from '@/config/territorios/icons'
import type { StepId } from '@/types/territorios'

/** A tab's icon in its 24 px box (Figma 19257:5752). Decorative: the title beside it names the tab. */
export default function StepIcon({ step }: { step: StepId }) {
  const icon = STEP_ICONS[step]
  return (
    <span className="territorios-icone" aria-hidden="true">
      <img src={icon.src} alt="" width={icon.width} height={icon.height} style={{ top: icon.top, left: icon.left }} />
    </span>
  )
}
```

Create `components/territorios/PanelNav.tsx`:

```tsx
'use client'

/* eslint-disable @next/next/no-img-element -- fixed-size icons exported from Figma */
import '@/app/territorios-relatorio.css'
import { REPORT } from '@/config/territorios/chooserScript'
import { UI_ICONS } from '@/config/territorios/icons'

export interface PanelNavProps {
  /** "Recorte": back to the gallery of types. */
  onBack: () => void
  /** The way on, named by where it leads; disabled while onClick is null. Left out on the summary. */
  next?:  { label: string; onClick: (() => void) | null }
}

/**
 * The buttons at the foot of a panel (Figma 19254:37462, 19254:37407): back to
 * the types on the left, on to the next tab on the right; the summary has only
 * the first (19254:37515).
 */
export default function PanelNav({ onBack, next }: PanelNavProps) {
  return (
    <div className={next ? 'territorios-painel-nav territorios-no-print' : 'territorios-painel-nav territorios-painel-nav--voltar territorios-no-print'}>
      <button type="button" className="territorios-navegar territorios-navegar--voltar" onClick={onBack}>
        <img src={UI_ICONS.back} alt="" width={16} height={16} />
        {REPORT.cut}
      </button>
      {next && (
        <button
          type="button"
          className="territorios-navegar"
          disabled={next.onClick === null}
          onClick={next.onClick ?? undefined}
        >
          {next.label}
          <img src={next.onClick ? UI_ICONS.next : UI_ICONS.nextDisabled} alt="" width={16} height={16} />
        </button>
      )}
    </div>
  )
}
```

Create `components/territorios/ReportBand.tsx`:

```tsx
import type { ReactNode, Ref } from 'react'
import '@/app/territorios-relatorio.css'

export interface ReportBandProps {
  eyebrow:    string
  title:      string
  /** Takes the focus after a change of screen. */
  headingRef: Ref<HTMLHeadingElement>
  /** The badges and buttons on its right; none on the gallery. */
  children?:  ReactNode
}

/**
 * The section's title band (Figma 19254:37414), which stays while the body
 * below it changes. With actions, the titles and the actions share one row,
 * aligned on their bottom edge.
 */
export default function ReportBand({ eyebrow, title, headingRef, children }: ReportBandProps) {
  const className = children
    ? 'territorios-secao-faixa territorios-secao-faixa--acoes territorios-no-print'
    : 'territorios-secao-faixa territorios-no-print'
  return (
    <div className={className}>
      <div className="container territorios-secao-faixa-conteudo">
        <div className="territorios-secao-faixa-titulos">
          <p className="territorios-secao-sobretitulo text-subtle-medium">{eyebrow}</p>
          <h2 id="territorios-secao-titulo" ref={headingRef} tabIndex={-1} className="territorios-secao-titulo text-h2">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>
  )
}
```

Create `components/territorios/ReportActions.tsx`:

```tsx
'use client'

/* eslint-disable @next/next/no-img-element -- fixed-size icons exported from Figma */
import { useEffect, useState } from 'react'
import '@/app/territorios-relatorio.css'
import { INTRO, REPORT } from '@/config/territorios/chooserScript'
import { UI_ICONS } from '@/config/territorios/icons'
import type { TerritoryType } from '@/config/territorios/story'
import { UI } from '@/config/territorios/storyScript'

export interface LocationBadge {
  /** The territory as the band names it, or "Caatinga" for the bioma. */
  value:  string
  /** Back to the chooser; null for the bioma, which has nothing else to choose. */
  onEdit: (() => void) | null
}

export interface ReportActionsProps {
  type:         TerritoryType
  /** Back to the gallery of types. */
  onChangeType: () => void
  /** null while a territory is being chosen; left out while the chosen one loads. */
  location?:    LocationBadge | null
  /** Title the share sheet gives the link; null while there is no report to share. */
  shareTitle:   string | null
  /** Prints the summary; null while there is no report to print. */
  onDownload:   (() => void) | null
  /** Set while the summary waits for its last themes before printing. */
  downloading:  boolean
}

type ShareNotice = 'copied' | 'failed' | null

/**
 * The right side of the report's title band (Figma 19254:37431): the recorte
 * and the location as badges, each opening the screen that changes it, then
 * "Baixar" and "Compartilhar". Before a territory is chosen the location reads
 * "escolher" and both buttons are disabled (19254:37382).
 */
export default function ReportActions({
  type, onChangeType, location, shareTitle, onDownload, downloading,
}: ReportActionsProps) {
  const [notice, setNotice] = useState<ShareNotice>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  async function share(title: string) {
    const url = window.location.href
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
      } catch {
        // Closing the share sheet rejects too; there is nothing to report.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setNotice('copied')
    } catch {
      setNotice('failed')
    }
  }

  const unit = type.unitLabel.toLocaleLowerCase('pt-BR')

  return (
    <div className="territorios-acoes">
      <button type="button" className="territorios-selo" onClick={onChangeType}>
        <span>{REPORT.cut}: <b>{unit}</b></span>
        <span className="territorios-sr">. {INTRO.changeType}</span>
        <img src={UI_ICONS.edit} alt="" width={24} height={24} />
      </button>

      {location === null && (
        <p className="territorios-selo">{REPORT.location}: {REPORT.locationPending}</p>
      )}
      {location?.onEdit && (
        <button type="button" className="territorios-selo" onClick={location.onEdit}>
          <span>{REPORT.location}: <b>{location.value}</b></span>
          <span className="territorios-sr">. {UI.changeTerritory}</span>
          <img src={UI_ICONS.edit} alt="" width={24} height={24} />
        </button>
      )}
      {location && !location.onEdit && (
        <p className="territorios-selo">{REPORT.location}: <b>{location.value}</b></p>
      )}

      <button
        type="button"
        className="territorios-acao territorios-acao--baixar"
        disabled={!onDownload}
        aria-busy={downloading || undefined}
        onClick={onDownload ?? undefined}
      >
        {REPORT.download}
        <img src={UI_ICONS.download} alt="" width={16} height={16} />
      </button>
      <button
        type="button"
        className="territorios-acao territorios-acao--compartilhar"
        disabled={shareTitle === null}
        onClick={() => { if (shareTitle !== null) void share(shareTitle) }}
      >
        {UI.share}
        <img src={shareTitle === null ? UI_ICONS.shareDisabled : UI_ICONS.share} alt="" width={16} height={16} />
      </button>

      <p className="territorios-aviso-link" role="status">
        {notice === 'copied' ? UI.linkCopied : notice === 'failed' ? UI.copyFailed : ''}
      </p>
    </div>
  )
}
```

Create `components/territorios/ReportTabs.tsx`:

```tsx
'use client'

import '@/app/territorios-relatorio.css'
import { REPORT } from '@/config/territorios/chooserScript'
import { STEPS, STEP_LABELS } from '@/config/territorios/story'
import { UI } from '@/config/territorios/storyScript'
import type { StepId } from '@/types/territorios'

/** "Localização" is the chooser; every other tab is a step of the report. */
export type ReportTab = StepId | 'localizacao'

export interface ReportTabsProps {
  current:      ReportTab
  /** False until a territory is chosen and loaded: the steps have nothing to show. */
  stepsEnabled: boolean
  /** Back to the chooser; null where there is none (the bioma) or it is already open. */
  onLocation:   (() => void) | null
  onSelect:     (step: StepId) => void
}

/**
 * The report's tab bar (Figma 19254:37436). Buttons rather than ARIA tabs:
 * "Localização" leaves the report for the chooser, which no tab panel can be.
 * The open tab carries aria-current, as the step rail did.
 */
export default function ReportTabs({ current, stepsEnabled, onLocation, onSelect }: ReportTabsProps) {
  const onChooser = current === 'localizacao'
  return (
    <nav className="territorios-abas territorios-no-print" aria-label={UI.stepsLabel}>
      <ul className="container territorios-abas-lista">
        <li>
          <button
            type="button"
            className="territorios-aba"
            aria-current={onChooser ? 'step' : undefined}
            disabled={!onChooser && !onLocation}
            onClick={onChooser ? undefined : onLocation ?? undefined}
          >
            {REPORT.location}
          </button>
        </li>
        {STEPS.map((step) => (
          <li key={step}>
            <button
              type="button"
              className="territorios-aba"
              aria-current={step === current ? 'step' : undefined}
              disabled={!stepsEnabled}
              onClick={() => onSelect(step)}
            >
              {STEP_LABELS[step]}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run tests/config/territoriosIcons.test.ts tests/components/territoriosReport.test.ts tests/lib/marketingPalette.test.ts`
Expected: PASS.

- [ ] **Step 9: Lint, type check, full suite**

Run: `npx vitest run 2>&1 | tail -4; npx tsc --noEmit -p . 2>&1 | grep -c "error TS"; npm run lint 2>&1 | tail -2`
Expected: all passing, `5`, `✖ 5 problems (3 errors, 2 warnings)`.

- [ ] **Step 10: Commit**

```bash
git add public/images/territorios/icones config app components tests
git commit -m "feat: add the Territórios report's band, badges, tabs and panel buttons"
```

---

### Task 6: The report in tabs

**Files:**
- Rename: `lib/territorios/activeSection.ts` → `lib/territorios/storyTabs.ts` (rewritten)
- Rename: `tests/lib/territoriosActiveSection.test.ts` → `tests/lib/territoriosStoryTabs.test.ts` (rewritten)
- Rewrite: `components/territorios/TerritoriosApp.tsx`, `components/territorios/ThemeStep.tsx`, `components/territorios/StorySummary.tsx`, `app/territorios.css`
- Create: `app/territorios-resumo.css` (the summary's current rules, moved), `app/fonts/D-DIN-Bold.otf`, `app/fonts/OFL-D-DIN.txt`
- Modify: `app/fonts/marketing.ts`, `app/(territorios)/layout.tsx`, `app/territorios-graficos.css:114-143`, `app/territorios-galeria.css` (the type strip rules), `config/territorios/storyScript.ts` (`UI`), `config/territorios/chooserScript.ts` (`RAIL`)
- Delete: `components/territorios/useActiveSection.ts`, `components/territorios/StepRail.tsx`, `components/territorios/TypeStrip.tsx`
- Test: `tests/lib/territoriosStoryTabs.test.ts`, `tests/components/territoriosReport.test.ts`

**Interfaces:**
- Consumes: everything Task 5 produces; `STEP_COLORS` (Task 3).
- Produces:
  - `storyTabs.ts`:
    - `sectionId(step)`;
    - `isStep(value): value is StepId`;
    - `stepFromQuery(etapa: string): StepId`;
    - `nextStep(step): StepId | null`;
    - `wantedThemes(step): ThemeId[]`;
    - `storyPath(pathname, recorteId: string | null, featureId, step): string`;
    - `readyToPrint(printKey, territoryKey, expired, settled): boolean`;
  - `ThemeStep` props `{ step, territory, type, load, expired, onRetry, onBack, onNext(step), landUseYear? }`;
  - `StorySummary` props `{ hidden, territory, type, loads, expired, onRetry, onBack }`;
  - the font variable `--font-figures`.

- [ ] **Step 1: Write the failing tests**

```bash
git mv lib/territorios/activeSection.ts lib/territorios/storyTabs.ts
git mv tests/lib/territoriosActiveSection.test.ts tests/lib/territoriosStoryTabs.test.ts
```

Replace the whole of `tests/lib/territoriosStoryTabs.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import { nextStep, readyToPrint, stepFromQuery, storyPath, wantedThemes } from '@/lib/territorios/storyTabs'

describe('wantedThemes', () => {
  it('asks for the next theme from the territory tab, which has none of its own', () => {
    expect(wantedThemes('territorio')).toEqual(['estoque'])
  })

  it('asks for a theme tab and the one after it, in reading order', () => {
    expect(wantedThemes('uso')).toEqual(['uso', 'fogo'])
  })

  it('asks only for the rain theme before the summary', () => {
    expect(wantedThemes('chuva')).toEqual(['chuva'])
  })

  it('asks for every theme on the summary', () => {
    expect(wantedThemes('resumo')).toEqual(['estoque', 'fluxo', 'uso', 'fogo', 'chuva'])
  })
})

describe('nextStep', () => {
  it('walks the tabs in order and stops at the summary', () => {
    expect(nextStep('territorio')).toBe('estoque')
    expect(nextStep('chuva')).toBe('resumo')
    expect(nextStep('resumo')).toBeNull()
  })
})

describe('stepFromQuery', () => {
  it('opens the tab an address names, or the territory tab for anything else', () => {
    expect(stepFromQuery('resumo')).toBe('resumo')
    // Addresses from before 13deade named a degradation step.
    expect(stepFromQuery('degradacao')).toBe('territorio')
    expect(stepFromQuery('')).toBe('territorio')
  })
})

describe('storyPath', () => {
  it('holds the screen in the query, so the section works on any path', () => {
    expect(storyPath('/territorios', null, '', 'territorio')).toBe('/territorios')
    expect(storyPath('/territorios', 'municipios', '', 'territorio')).toBe('/territorios?recorte=municipios')
    expect(storyPath('/', 'municipios', 'juazeiro', 'fogo')).toBe('/?recorte=municipios&feicao=juazeiro&etapa=fogo')
  })
})

describe('readyToPrint', () => {
  const ALL = { estoque: 1, fluxo: 1, uso: 1, fogo: 1, chuva: 1 }

  it('waits for every theme of the territory "Baixar" was pressed on', () => {
    expect(readyToPrint('m|a', 'm|a', false, { estoque: 1 })).toBe(false)
    expect(readyToPrint('m|a', 'm|a', false, ALL)).toBe(true)
  })

  it('prints what it has once the session is gone, since nothing more will come', () => {
    expect(readyToPrint('m|a', 'm|a', true, {})).toBe(true)
  })

  it('never prints for another territory or without a request', () => {
    expect(readyToPrint('m|a', 'm|b', false, ALL)).toBe(false)
    expect(readyToPrint(null, 'm|a', false, ALL)).toBe(false)
  })
})
```

In `tests/components/territoriosReport.test.ts`, add the imports:

```ts
import ThemeStep from '@/components/territorios/ThemeStep'
import type { BiomeReference, TerritoryPayload } from '@/types/territorios'
```

and append:

```ts
const NO_BIOME: BiomeReference = {
  stockTotalTc: null, stockDensityTcHa: null, forestSharePct: null, fluxPerForestHaMg: null,
  nativeSharePct: null, fireBurnedSharePct: null, fireRecurrenceSharesPct: null,
  fireAnnualMeanSharePct: null, rainMeanMm: null,
}

/** Juazeiro (BA), the territory of the Figma frames; 6.720 km² as Figma 19254:37456 prints it. */
const JUAZEIRO: TerritoryPayload = {
  recorteId: 'municipios', recorteName: 'Municípios',
  featureId: 'juazeiro', featureName: 'Juazeiro', context: 'BA',
  areaHa: 672_000, biomaAreaHa: 86_000_000,
  bbox: [-40.9, -10.0, -39.9, -9.2], boundary: 'full',
  geometry: { type: 'Polygon', coordinates: [] },
  biome: NO_BIOME,
}

const STEP = {
  territory: JUAZEIRO, type: typeOf('municipio'), load: { kind: 'loading' } as const,
  expired: false, onRetry: noop, onBack: noop, onNext: noop,
}

describe('ThemeStep', () => {
  it('lays out the territory tab of Figma 19254:37447', () => {
    const markup = html(ThemeStep, { ...STEP, step: 'territorio' })
    expect(markup).toContain('<h3 id="etapa-territorio-titulo" class="territorios-etapa-titulo" style="color:#587c22" tabindex="-1">')
    expect(markup).toContain('/images/territorios/icones/territorio.svg')
    expect(markup).toContain('Onde fica e qual é o tamanho?')
    expect(markup).toContain('>6.720<')
    expect(markup).toContain('Área dentro da Caatinga, na Bahia.')
    expect(buttons(markup).map((b) => b.text)).toEqual(['Recorte', 'Estoque'])
  })

  it('names the summary on the last theme\'s button, and waits for its data', () => {
    const markup = html(ThemeStep, { ...STEP, step: 'chuva' })
    expect(buttons(markup).map((b) => b.text)).toEqual(['Recorte', 'Resumo'])
    expect(markup).toContain('Carregando os dados')
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/territoriosStoryTabs.test.ts tests/components/territoriosReport.test.ts`
Expected: FAIL. `nextStep`, `stepFromQuery`, `storyPath` and `readyToPrint` are not exported, and `ThemeStep` renders the old band.

- [ ] **Step 3: Write `storyTabs.ts`**

Replace the whole of `lib/territorios/storyTabs.ts` with:

```ts
// Which tab of the Territórios report is open, what it needs loaded, where it
// lives in the address, and when "Baixar" can print. Pure functions;
// components/territorios/TerritoriosApp.tsx holds the state.

import { STEPS, STORY_THEMES } from '@/config/territorios/story'
import type { StepId, ThemeId } from '@/types/territorios'

const THEME_IDS = STORY_THEMES.map((t) => t.id)

export function sectionId(step: StepId): string {
  return `etapa-${step}`
}

export function isStep(value: string): value is StepId {
  return (STEPS as string[]).includes(value)
}

/** The tab an address opens: the one it names, or the territory's own. */
export function stepFromQuery(etapa: string): StepId {
  return isStep(etapa) ? etapa : 'territorio'
}

/** The tab after `step`; null after the summary. */
export function nextStep(step: StepId): StepId | null {
  return STEPS[STEPS.indexOf(step) + 1] ?? null
}

function isTheme(step: StepId): step is ThemeId {
  return (THEME_IDS as string[]).includes(step)
}

/**
 * Themes to load while `step` is open: its own and the next tab's, so the next
 * one is usually ready when the visitor gets there; every theme on the summary.
 */
export function wantedThemes(step: StepId): ThemeId[] {
  if (step === 'resumo') return [...THEME_IDS]
  const next = nextStep(step)
  return [step, next].filter((s): s is ThemeId => s !== null && isTheme(s))
}

/**
 * Address of a screen of the section. The query, not the path, holds the state,
 * so the same links work wherever the section is placed: /territorios today, a
 * section of the home later.
 */
export function storyPath(pathname: string, recorteId: string | null, featureId: string, step: StepId): string {
  const params = new URLSearchParams()
  if (recorteId) params.set('recorte', recorteId)
  if (recorteId && featureId) {
    params.set('feicao', featureId)
    params.set('etapa', step)
  }
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

/**
 * Whether the summary "Baixar" asked for can print: every theme has an answer,
 * a failure included, or the session is gone and nothing more will come.
 */
export function readyToPrint(
  printKey:     string | null,
  territoryKey: string | null,
  expired:      boolean,
  settled:      Partial<Record<ThemeId, unknown>>,
): boolean {
  if (printKey === null || printKey !== territoryKey) return false
  return expired || THEME_IDS.every((theme) => settled[theme] !== undefined)
}
```

- [ ] **Step 4: Add the figures' font**

```bash
curl -sL https://www.fontsquirrel.com/fonts/download/d-din -o /tmp/d-din.zip
unzip -o -j /tmp/d-din.zip D-DIN-Bold.otf -d app/fonts
unzip -o -j /tmp/d-din.zip 'SIL Open Font License.txt' -d /tmp && mv '/tmp/SIL Open Font License.txt' app/fonts/OFL-D-DIN.txt
sha256sum app/fonts/D-DIN-Bold.otf app/fonts/OFL-D-DIN.txt
```

Expected:

```
b0f96a3730041605b139ca2d15e29a36c55e49058ba2b72ee4d09b5e4ca210c1  app/fonts/D-DIN-Bold.otf
945bb366b143a8c561daf86892bb838ee456c58585afc0868e2d3f2cf4f8b4f7  app/fonts/OFL-D-DIN.txt
```

Append to `app/fonts/marketing.ts`:

```ts
// The big figures of the Territórios report (Figma 19254:37456, 19254:17340):
// D-DIN Bold, Datto's face under the OFL (OFL-D-DIN.txt). Shipped as Datto's
// own OTF, unconverted and unsubset: the license reserves the name "D-DIN" for
// unmodified files. Declared on the territorios <html> only.
export const dDin = localFont({
  src: './D-DIN-Bold.otf',
  weight: '700',
  variable: '--font-figures',
  display: 'swap',
})
```

In `app/(territorios)/layout.tsx`, change the import to `import { archivoNarrow, dDin, inter, rubik } from '../fonts/marketing'` and the `<html>` class to `` className={`${rubik.variable} ${archivoNarrow.variable} ${inter.variable} ${dDin.variable}`} ``.

In `app/territorios-graficos.css`, replace the three rules `.tg-step-figure`, `.tg-step-figure-value` and `.tg-step-figure-unit`, and the `/* Answer figure */` comment above them, with:

```css
/* Answer figure: D-DIN Bold 40 (Figma 19254:37456), the unit beside it in the
   body face (19254:37457). */

.tg-step-figure {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 4px;
  margin: 0;
  color: var(--bg-texto-primario, #001d27);
}

.tg-step-figure-value {
  min-width: 0;
  font-family: var(--font-figures, var(--font-display, 'Archivo Narrow')), 'Arial Narrow', sans-serif;
  font-weight: 700;
  font-size: 40px;
  line-height: 40px;
  letter-spacing: -0.6px;
  /* Proportional figures at display size; the old layout sets tnum on body. */
  font-feature-settings: normal;
  font-variant-numeric: lining-nums proportional-nums;
  overflow-wrap: anywhere;
}

.tg-step-figure-unit {
  font-size: 14px;
  line-height: 24px;
  font-weight: 400;
  color: var(--foreground, #292829);
}
```

- [ ] **Step 5: Rewrite `ThemeStep.tsx`**

Replace the whole file with:

```tsx
'use client'

import { useLayoutEffect, useRef } from 'react'
import PanelNav from './PanelNav'
import StepChart from './StepChart'
import StepIcon from './StepIcon'
import type { LandUseYear } from './StoryMap'
import StepFigure from './charts/StepFigure'
import { STEP_COLORS } from '@/config/territorios/palette'
import { LAND_USE_YEARS, STEP_LABELS, type TerritoryType } from '@/config/territorios/story'
import { UI } from '@/config/territorios/storyScript'
import { nextStep, sectionId } from '@/lib/territorios/storyTabs'
import { stepAnswer } from '@/lib/territorios/storyText'
import type { StepId, TerritoryPayload, ThemeResponse } from '@/types/territorios'

/** Where one theme's request stands, as the report's panels read it. */
export type ThemeLoad =
  | { kind: 'loading' }
  | { kind: 'ready'; response: ThemeResponse }
  | { kind: 'failed'; rateLimited: boolean }

export interface ThemeStepProps {
  step:      Exclude<StepId, 'resumo'>
  territory: TerritoryPayload
  type:      TerritoryType
  /** Ignored on the territory step, which needs no theme request. */
  load:      ThemeLoad
  /** The session is gone: a retry would only fail again, and the banner says what to do. */
  expired:   boolean
  onRetry:   () => void
  /** "Recorte": back to the gallery of types. */
  onBack:    () => void
  /** Opens the tab this panel's second button names. */
  onNext:    (step: StepId) => void
  /** The land use map's year switch; the map beside the panel follows it. */
  landUseYear?: { year: LandUseYear; onChange: (year: LandUseYear) => void }
}

/**
 * One tab of the report, beside the map (Figma 19254:37447): the title with
 * its icon, the question, the answer and its chart; at the foot, the way back
 * to the types and on to the next tab.
 */
export default function ThemeStep({
  step, territory, type, load, expired, onRetry, onBack, onNext, landUseYear,
}: ThemeStepProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const color = STEP_COLORS[step]
  const theme = step === 'territorio' ? null : load
  const response = theme?.kind === 'ready' ? theme.response : undefined
  const answer = stepAnswer(step, { territory, type, response })
  const next = nextStep(step)

  // The chart that replaces "Carregando" pushes the buttons down, and a focused
  // one can leave the screen with its focus ring.
  useLayoutEffect(() => {
    const focused = document.activeElement
    if (!(focused instanceof HTMLElement) || !sectionRef.current?.contains(focused)) return
    const box = focused.getBoundingClientRect()
    if (box.bottom > window.innerHeight || box.top < 0) focused.scrollIntoView({ block: 'nearest' })
  }, [theme?.kind, response])

  let body: React.ReactNode
  if (theme?.kind === 'loading') {
    body = <p className="territorios-estado" role="status">{UI.loading}</p>
  } else if (theme && (theme.kind === 'failed' || theme.response.status === 'unavailable')) {
    const rateLimited = theme.kind === 'failed' && theme.rateLimited
    body = (
      <div className="territorios-estado" role="status">
        <p>{rateLimited ? UI.rateLimited : UI.unavailable}</p>
        {!expired && (
          <button type="button" className="territorios-btn territorios-btn--contorno" onClick={onRetry}>
            {UI.retry}
          </button>
        )}
      </div>
    )
  } else {
    body = (
      <>
        <div className="territorios-resposta">
          {answer.headline && <StepFigure value={answer.headline.value} unit={answer.headline.unit} color={color} />}
          {answer.sentence && <p className="territorios-resposta-frase">{answer.sentence}</p>}
        </div>
        {step !== 'territorio' && response && (
          <StepChart theme={step} response={response} territory={territory} type={type} />
        )}
      </>
    )
  }

  const id = sectionId(step)

  return (
    <section ref={sectionRef} id={id} data-step={step} className="territorios-etapa-painel" aria-labelledby={`${id}-titulo`}>
      <div className="territorios-etapa-corpo">
        <h3 id={`${id}-titulo`} className="territorios-etapa-titulo" style={{ color }} tabIndex={-1}>
          <StepIcon step={step} />
          {STEP_LABELS[step]}
        </h3>
        <h4 className="territorios-etapa-pergunta">{answer.question}</h4>
        <div className="territorios-passo-texto">{body}</div>
        {landUseYear && (
          <div className="territorios-passo-anos" role="group" aria-labelledby={`${id}-anos`}>
            <span id={`${id}-anos`}>{UI.mapYear}</span>
            {LAND_USE_YEARS.map((y) => (
              <button key={y} type="button" aria-pressed={y === landUseYear.year} onClick={() => landUseYear.onChange(y)}>
                {y}
              </button>
            ))}
          </div>
        )}
      </div>
      <PanelNav
        onBack={onBack}
        next={next ? { label: STEP_LABELS[next], onClick: () => onNext(next) } : undefined}
      />
    </section>
  )
}
```

- [ ] **Step 6: Rewrite `StorySummary.tsx` for the tab (cards come in Task 7)**

Replace the whole file with:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import '@/app/territorios-resumo.css'
import PanelNav from './PanelNav'
import StepChart from './StepChart'
import StepIcon from './StepIcon'
import StepFigure from './charts/StepFigure'
import { CHOOSER } from '@/config/territorios/chooserScript'
import { STEP_COLORS } from '@/config/territorios/palette'
import { STEP_LABELS, type TerritoryType } from '@/config/territorios/story'
import { ABOUT_SCRIPT, READING_LABELS, SUMMARY_ROW_SCRIPT, TERRITORY_SCRIPT, UI } from '@/config/territorios/storyScript'
import { sectionId } from '@/lib/territorios/storyTabs'
import { aboutItems, summaryRows } from '@/lib/territorios/storyText'
import { formatArea } from '@/lib/territorios/storyValues'
import type { ThemeLoad } from './ThemeStep'
import type { ThemeId, TerritoryPayload, ThemeResponse } from '@/types/territorios'

export interface StorySummaryProps {
  /** Another tab is open; the summary stays in the page so "Baixar" can print it. */
  hidden:    boolean
  territory: TerritoryPayload
  type:      TerritoryType
  loads:     Record<ThemeId, ThemeLoad>
  /** The session is gone: the retry buttons would only fail again. */
  expired:   boolean
  onRetry:   (theme: ThemeId) => void
  /** "Recorte": back to the gallery of types. */
  onBack:    () => void
}

// The summary tab: one row per theme, "Sobre os dados" folded, and the way
// back. Printing outputs this section alone (territorios.css), with the fold
// open, whichever tab is on screen.
export default function StorySummary({
  hidden, territory, type, loads, expired, onRetry, onBack,
}: StorySummaryProps) {
  const [generatedAt] = useState(() => new Date().toLocaleDateString('pt-BR'))
  const aboutRef = useRef<HTMLDetailsElement | null>(null)

  // A folded <details> prints folded; the sheet prints it open and folds it
  // back afterwards if the visitor had it closed.
  useEffect(() => {
    let reopen = false
    const before = () => {
      const details = aboutRef.current
      if (!details || details.open) return
      reopen = true
      details.open = true
    }
    const after = () => {
      if (reopen && aboutRef.current) aboutRef.current.open = false
      reopen = false
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  const responses: Partial<Record<ThemeId, ThemeResponse>> = {}
  for (const [theme, load] of Object.entries(loads) as [ThemeId, ThemeLoad][]) {
    if (load.kind === 'ready') responses[theme] = load.response
  }
  const input = { responses, territory, type }
  const rows = summaryRows(input)
  const about = aboutItems(input)
  const title = TERRITORY_SCRIPT.title(territory.featureName, type.id === 'estado' ? undefined : territory.context)
  const id = sectionId('resumo')

  return (
    <section id={id} data-step="resumo" className="territorios-resumo" aria-labelledby={`${id}-titulo`} hidden={hidden}>
      <h3 id={`${id}-titulo`} className="territorios-etapa-titulo" style={{ color: STEP_COLORS.resumo }} tabIndex={-1}>
        <StepIcon step="resumo" />
        {STEP_LABELS.resumo}
      </h3>

      <header className="territorios-ficha-cabecalho">
        <p className="territorios-ficha-nome">{title}</p>
        <p className="territorios-ficha-detalhe">
          {/* The title above already carries the state. */}
          {CHOOSER.confirmDetail(type.unitLabel, undefined, formatArea(territory.areaHa), type.id === 'bioma')}
        </p>
      </header>

      <ul className="territorios-ficha">
        {rows.map((row) => {
          const load = loads[row.theme]
          return (
            <li
              key={row.theme}
              // A print from another tab can come before this theme was ever requested.
              className={load.kind === 'loading' ? 'territorios-ficha-linha territorios-no-print' : 'territorios-ficha-linha'}
              style={{ '--tema-cor': STEP_COLORS[row.theme] } as React.CSSProperties}
            >
              <h5 className="territorios-ficha-titulo">{row.title}</h5>
              {load.kind === 'loading' ? (
                <p className="territorios-ficha-estado">{UI.loading}</p>
              ) : load.kind === 'failed' || load.response.status === 'unavailable' ? (
                <div className="territorios-ficha-estado">
                  <p>{UI.summaryUnavailable}</p>
                  {!expired && (
                    <button
                      type="button"
                      className="territorios-btn territorios-btn--contorno territorios-no-print"
                      onClick={() => onRetry(row.theme)}
                      aria-label={`${UI.retry}: ${STEP_LABELS[row.theme]}`}
                    >
                      {UI.retry}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="territorios-ficha-valor">
                    {row.headline && (
                      <StepFigure value={row.headline.value} unit={row.headline.unit} color={STEP_COLORS[row.theme]} />
                    )}
                    {row.reading && (
                      <p className="territorios-ficha-leitura">
                        {row.theme === 'fluxo' ? SUMMARY_ROW_SCRIPT.fluxo.readings[row.reading] : READING_LABELS[row.reading]}
                      </p>
                    )}
                  </div>
                  <p className="territorios-ficha-frase">{row.sentence}</p>
                  <div className="territorios-ficha-grafico">
                    <StepChart theme={row.theme} response={load.response} territory={territory} type={type} compact />
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>

      <details ref={aboutRef} className="territorios-sobre">
        <summary>{ABOUT_SCRIPT.title}</summary>
        <dl>
          {about.map((item) => (
            <div key={item.title}>
              <dt>{item.title}</dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
        <p className="territorios-sobre-data">{UI.generatedAt(generatedAt)}</p>
      </details>

      <PanelNav onBack={onBack} />
    </section>
  )
}
```

Create `app/territorios-resumo.css` with the summary's current rules, moved out of `territorios.css`. Task 7 rewrites this file.

```css
/*
 * The report's summary tab (Figma 19254:37467), imported by
 * components/territorios/StorySummary.tsx. It stays in the page, hidden, while
 * another tab is open, so "Baixar" can print it from any tab; only it prints.
 */

.territorios-resumo {
  display: grid;
  gap: 24px;
  align-content: start;
}

/* The attribute alone loses to the display above. */
.territorios-resumo[hidden] {
  display: none;
}

.territorios-ficha-cabecalho {
  display: grid;
  gap: 4px;
}

.territorios-ficha-nome {
  font-family: var(--font-titulo);
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 700;
  line-height: 1.08;
  color: var(--bg-texto-primario);
}

.territorios-ficha-detalhe {
  font-size: 14px;
  line-height: 20px;
  color: var(--am-400);
}

.territorios-ficha {
  display: grid;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--am-100);
}

/* One line per theme: figure and reading, the sentence, the bar. --tema-cor
   comes inline from STEP_COLORS. */
.territorios-ficha-linha {
  display: grid;
  grid-template-columns: minmax(0, 260px) minmax(0, 1fr) minmax(0, 300px);
  grid-template-areas:
    'titulo titulo titulo'
    'valor frase grafico';
  gap: 8px 32px;
  align-items: start;
  padding: 16px 0 24px 16px;
  border-bottom: 1px solid var(--am-100);
  border-left: 4px solid var(--tema-cor, var(--am-400));
  break-inside: avoid;
}

.territorios-ficha-titulo {
  grid-area: titulo;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: var(--am-400);
}

.territorios-ficha-valor {
  grid-area: valor;
  display: grid;
  gap: 4px;
}

.territorios-ficha-grafico {
  grid-area: grafico;
}

.territorios-ficha-leitura {
  justify-self: start;
  padding: 2px 8px;
  border: 1px solid var(--am-200);
  border-radius: var(--radius-interno);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: var(--bg-texto-primario);
}

.territorios-ficha-frase {
  grid-area: frase;
  font-size: 16px;
  line-height: 24px;
  color: var(--bg-texto-primario);
}

.territorios-ficha-estado {
  grid-column: 1 / -1;
  display: grid;
  gap: 12px;
  justify-items: start;
  font-size: 14px;
  line-height: 20px;
  color: var(--am-400);
}

.territorios-sobre {
  border-top: 1px solid var(--am-100);
  border-bottom: 1px solid var(--am-100);
}

.territorios-sobre summary {
  min-height: 44px;
  padding: 8px 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  cursor: pointer;
}

.territorios-sobre summary:focus-visible {
  outline: 2px solid var(--role-marca-ancora-foco);
  outline-offset: 2px;
}

.territorios-sobre dl {
  display: grid;
  gap: 12px;
  max-width: 72ch;
  padding-bottom: 12px;
  font-size: 14px;
  line-height: 20px;
}

.territorios-sobre dt {
  font-weight: 600;
  color: var(--bg-texto-primario);
}

.territorios-sobre dd {
  margin: 0;
  color: var(--am-400);
}

.territorios-sobre-data {
  padding-bottom: 16px;
  font-size: 14px;
  line-height: 20px;
  color: var(--am-400);
}

@media (max-width: 1023px) {
  .territorios-ficha-linha {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'titulo titulo'
      'valor frase'
      'grafico grafico';
  }
}

@media print {
  .territorios-resumo,
  .territorios-resumo[hidden] {
    display: grid !important;
  }

  .territorios-ficha-linha {
    grid-template-columns: 50mm minmax(0, 1fr) 55mm;
    grid-template-areas:
      'titulo titulo titulo'
      'valor frase grafico';
    gap: 4px 6mm;
    padding: 8px 0 10px 10px;
  }

  .territorios-ficha-valor .tg-step-figure-value {
    font-size: 30px;
    line-height: 30px;
  }

  .territorios-sobre summary {
    min-height: 0;
    list-style: none;
  }

  .territorios-sobre summary::-webkit-details-marker {
    display: none;
  }

  /* Browsers drop background colors and some borders by default when printing. */
  .territorios-ficha-linha,
  .tg-chart {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

- [ ] **Step 7: Rewrite `TerritoriosApp.tsx`**

Replace the whole file with:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReportActions, { type LocationBadge } from './ReportActions'
import ReportBand from './ReportBand'
import ReportTabs from './ReportTabs'
import StorySummary from './StorySummary'
import type { LandUseYear } from './StoryMap'
import ThemeStep, { type ThemeLoad } from './ThemeStep'
import TypeCards from './TypeCards'
import {
  BIOMA_FEATURE_ID,
  BIOMA_RECORTE_ID,
  LAND_USE_YEARS,
  STORY_THEMES,
  territoryTypeByRecorte,
  type TerritoryType,
} from '@/config/territorios/story'
import { CHOOSER, INTRO, REPORT } from '@/config/territorios/chooserScript'
import { TERRITORY_SCRIPT, UI } from '@/config/territorios/storyScript'
import { readyToPrint, sectionId, stepFromQuery, storyPath, wantedThemes } from '@/lib/territorios/storyTabs'
import type { StepId, TerritoryPayload, ThemeId, ThemeResponse } from '@/types/territorios'

// MapLibre needs WebGL and window.
const StoryMap = dynamic(() => import('./StoryMap'), {
  ssr: false,
  loading: () => <div className="territorios-mapa" />,
})

// The chooser draws every territory of the type on a MapLibre map as well.
const TerritoryChooser = dynamic(() => import('./TerritoryChooser'), {
  ssr: false,
  loading: () => <p className="territorios-contagem" role="status">{CHOOSER.loading}</p>,
})

export interface TerritoriosAppProps {
  initialRecorte: string
  initialFeicao:  string
  initialEtapa:   string
}

/**
 * Theme requests in flight at once. Two, for the reason ReportClient gives:
 * each one can be a live Earth Engine reduction, and the per-IP rate limiter is
 * shared with the tile requests of the same report.
 */
const CONCURRENCY = 2

type TerritoryLoad =
  | { key: string; kind: 'ready'; payload: TerritoryPayload }
  | { key: string; kind: 'failed'; rateLimited: boolean }

type SettledLoad = Exclude<ThemeLoad, { kind: 'loading' }>

interface ThemeLoads {
  key:      string | null
  entries:  Partial<Record<ThemeId, SettledLoad>>
  /** Themes whose retry button cleared the entry; requested whichever tab is open. */
  retrying: ThemeId[]
}

interface Scheduler {
  key:        string
  controller: AbortController
  queue:      ThemeId[]
  inFlight:   Set<ThemeId>
}

/** The steps the map draws; the summary has no map of its own. */
type MapStep = Exclude<StepId, 'resumo'>

const THEME_IDS = STORY_THEMES.map((t) => t.id)
const LOADING: ThemeLoad = { kind: 'loading' }
const NO_RETRIES: ThemeId[] = []

function typeOf(recorteId: string): TerritoryType | null {
  return territoryTypeByRecorte(recorteId) ?? null
}

function isTheme(step: StepId): step is ThemeId {
  return (THEME_IDS as string[]).includes(step)
}

/** Type and territory an address names; the bioma has a single feature. */
function stateFromQuery(params: URLSearchParams): { type: TerritoryType | null; featureId: string } {
  const type = typeOf(params.get('recorte') ?? '')
  if (type?.recorteId === BIOMA_RECORTE_ID) return { type, featureId: BIOMA_FEATURE_ID }
  return { type, featureId: type ? params.get('feicao') ?? '' : '' }
}

/**
 * The whole Territórios tool as one section of a page: its title band stays,
 * and the body below it changes, from the gallery of types to the chooser and
 * the report (Figma 19254:37325). Each change of screen is an entry in the
 * browser's history; a change of tab replaces the current one.
 */
export default function TerritoriosApp({ initialRecorte, initialFeicao, initialEtapa }: TerritoriosAppProps) {
  const pathname = usePathname()
  const [type, setType] = useState<TerritoryType | null>(() => typeOf(initialRecorte))
  const [featureId, setFeatureId] = useState(() => {
    const restored = typeOf(initialRecorte)
    if (restored?.recorteId === BIOMA_RECORTE_ID) return BIOMA_FEATURE_ID
    return restored ? initialFeicao : ''
  })
  const [tab, setTab] = useState<StepId>(() => stepFromQuery(initialEtapa))
  /**
   * The step the map draws: the open tab's, kept through the summary so the map
   * is where the visitor left it on the way back.
   */
  const [mapStep, setMapStep] = useState<MapStep>(() => {
    const step = stepFromQuery(initialEtapa)
    return step === 'resumo' ? 'territorio' : step
  })
  if (tab !== 'resumo' && tab !== mapStep) setMapStep(tab)
  const [expired, setExpired] = useState(false)
  const [landUseYear, setLandUseYear] = useState<LandUseYear>(LAND_USE_YEARS[LAND_USE_YEARS.length - 1])

  const [territoryLoad, setTerritoryLoad] = useState<TerritoryLoad | null>(null)
  const [territoryAttempt, setTerritoryAttempt] = useState(0)
  const [themeLoads, setThemeLoads] = useState<ThemeLoads>({ key: null, entries: {}, retrying: [] })
  /** The territory printed with the browser's own command, which then wants every theme. */
  const [printedKey, setPrintedKey] = useState<string | null>(null)
  /** The territory whose summary "Baixar" prints once its last theme settles. */
  const [printKey, setPrintKey] = useState<string | null>(null)
  /** Counts the prints "Baixar" set off; each one prints after its commit. */
  const [printRun, setPrintRun] = useState(0)

  const sectionRef = useRef<HTMLElement | null>(null)
  const bandHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const schedulerRef = useRef<Scheduler | null>(null)
  /** Set when the visitor changes screen, since the control they used unmounts with the old one. */
  const moveFocusRef = useRef(false)
  /** Set by a panel's own button, which unmounts with the panel. */
  const focusPanelRef = useRef(false)

  const recorteId = type?.recorteId ?? null
  const territoryKey = recorteId && featureId ? `${recorteId}|${featureId}` : null
  // Loads are keyed by territory rather than reset on a change, so a stale
  // answer from the previous territory can never show under the new name.
  const territory = territoryLoad?.key === territoryKey ? territoryLoad : null
  const payload = territory?.kind === 'ready' ? territory.payload : null
  const entries = useMemo(
    () => (themeLoads.key === territoryKey ? themeLoads.entries : {}),
    [themeLoads, territoryKey],
  )
  const retrying = themeLoads.key === territoryKey ? themeLoads.retrying : NO_RETRIES
  const screen = !type ? 'intro' : !featureId ? 'search' : 'story'

  // Derived during render, as mapStep is: the print itself waits for the
  // effect below, once the summary holds the last answer.
  if (readyToPrint(printKey, territoryKey, expired, entries)) {
    setPrintKey(null)
    setPrintRun((n) => n + 1)
  }

  useEffect(() => {
    if (printRun > 0) window.print()
  }, [printRun])

  const onUnauthorized = useCallback(() => setExpired(true), [])

  // Tabs replace the entry; screens push one (see goTo).
  useEffect(() => {
    window.history.replaceState(null, '', storyPath(pathname, recorteId, featureId, tab))
  }, [pathname, recorteId, featureId, tab])

  // After a change of screen the band's title takes the focus; the chooser
  // puts it on its own question, and the report waits for its territory.
  useEffect(() => {
    if (!moveFocusRef.current) return
    if (screen === 'search' || (screen === 'story' && !payload)) return
    moveFocusRef.current = false
    bandHeadingRef.current?.focus({ preventScroll: true })
  }, [screen, payload])

  // A panel's own buttons unmount with it; the new panel's title takes the focus.
  useEffect(() => {
    if (!focusPanelRef.current) return
    focusPanelRef.current = false
    document.getElementById(`${sectionId(tab)}-titulo`)?.focus({ preventScroll: true })
  }, [tab])

  useEffect(() => {
    if (!recorteId || !featureId) return
    const key = `${recorteId}|${featureId}`
    const controller = new AbortController()
    const params = new URLSearchParams({ recorte: recorteId, feicao: featureId })

    fetch(`/api/territorios/territorio?${params}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 401) setExpired(true)
        // A feature the server does not know came from a stale or edited
        // address: back to where a territory is chosen.
        if (res.status === 400 || res.status === 404) {
          setFeatureId('')
          if (recorteId === BIOMA_RECORTE_ID) setType(null)
          return
        }
        if (!res.ok) {
          setTerritoryLoad({ key, kind: 'failed', rateLimited: res.status === 429 })
          return
        }
        const body = await res.json() as TerritoryPayload
        if (!controller.signal.aborted) setTerritoryLoad({ key, kind: 'ready', payload: body })
      })
      .catch(() => {
        if (!controller.signal.aborted) setTerritoryLoad({ key, kind: 'failed', rateLimited: false })
      })

    return () => controller.abort()
  }, [recorteId, featureId, territoryAttempt])

  const requestThemes = useCallback((key: string, recorte: string, feicao: string, themes: ThemeId[]) => {
    let s = schedulerRef.current
    if (!s || s.key !== key || s.controller.signal.aborted) {
      if (themes.length === 0) return
      s?.controller.abort()
      s = { key, controller: new AbortController(), queue: [], inFlight: new Set() }
      schedulerRef.current = s
    }
    const scheduler = s

    const store = (theme: ThemeId, load: SettledLoad) => {
      if (scheduler.controller.signal.aborted) return
      setThemeLoads((prev) => {
        const same = prev.key === key
        return {
          key,
          entries:  { ...(same ? prev.entries : {}), [theme]: load },
          retrying: same ? prev.retrying.filter((t) => t !== theme) : [],
        }
      })
    }

    const load = async (theme: ThemeId) => {
      try {
        const params = new URLSearchParams({ recorte, feicao, tema: theme })
        const res = await fetch(`/api/territorios/tema?${params}`, { signal: scheduler.controller.signal })
        if (res.status === 401) {
          setExpired(true)
          scheduler.queue = []
        }
        if (!res.ok) {
          store(theme, { kind: 'failed', rateLimited: res.status === 429 })
          return
        }
        store(theme, { kind: 'ready', response: await res.json() as ThemeResponse })
      } catch {
        store(theme, { kind: 'failed', rateLimited: false })
      }
    }

    const pump = () => {
      while (scheduler.inFlight.size < CONCURRENCY && scheduler.queue.length > 0) {
        const theme = scheduler.queue.shift()!
        scheduler.inFlight.add(theme)
        void load(theme).finally(() => {
          scheduler.inFlight.delete(theme)
          if (!scheduler.controller.signal.aborted) pump()
        })
      }
    }

    // A theme queued for a tab the visitor has already left would hold back
    // the ones now wanted; the requests in flight finish.
    scheduler.queue = scheduler.queue.filter((theme) => themes.includes(theme))
    for (const theme of themes) {
      if (!scheduler.inFlight.has(theme) && !scheduler.queue.includes(theme)) scheduler.queue.push(theme)
    }
    pump()
  }, [])

  // The browser's own print command, from any tab, outputs the summary, whose
  // cards still loading stay off the sheet; every theme is then requested for
  // the next print.
  useEffect(() => {
    if (!territoryKey) return
    const onBeforePrint = () => setPrintedKey(territoryKey)
    window.addEventListener('beforeprint', onBeforePrint)
    return () => window.removeEventListener('beforeprint', onBeforePrint)
  }, [territoryKey])

  // Follows the open tab; "Baixar" and a print want every theme. Failures stay
  // until their retry button clears them.
  const missingThemes = useMemo(() => {
    if (!payload || expired) return []
    const everyTheme = territoryKey !== null && (printedKey === territoryKey || printKey === territoryKey)
    const tabThemes = everyTheme ? THEME_IDS : wantedThemes(tab)
    const wanted = new Set([...tabThemes, ...retrying])
    return [...wanted].filter((theme) => !entries[theme])
  }, [payload, expired, printedKey, printKey, territoryKey, tab, retrying, entries])

  // Called with an empty list too, which drops what is still queued.
  useEffect(() => {
    if (!recorteId || !featureId || !territoryKey) return
    requestThemes(territoryKey, recorteId, featureId, missingThemes)
  }, [missingThemes, recorteId, featureId, territoryKey, requestThemes])

  useEffect(() => () => schedulerRef.current?.controller.abort(), [territoryKey])

  const retryTheme = useCallback((theme: ThemeId) => {
    // With the session gone the request would only fail again; the banner
    // already says what to do.
    if (expired) return
    setThemeLoads((prev) => {
      if (!prev.entries[theme]) return prev
      const next = { ...prev.entries }
      delete next[theme]
      return { key: prev.key, entries: next, retrying: [...prev.retrying, theme] }
    })
  }, [expired])

  /** A new screen or tab starts at the top of the section, not where the previous one left the page. */
  const scrollToSection = useCallback(() => {
    const section = sectionRef.current
    if (section && section.getBoundingClientRect().top < 0) section.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [])

  /** Shows a screen of the section, without touching the history. */
  const show = useCallback((nextType: TerritoryType | null, nextFeature: string, step: StepId) => {
    moveFocusRef.current = true
    setType(nextType)
    setFeatureId(nextFeature)
    setTab(step)
    scrollToSection()
  }, [scrollToSection])

  function goTo(nextType: TerritoryType | null, nextFeature: string) {
    window.history.pushState(null, '', storyPath(pathname, nextType?.recorteId ?? null, nextFeature, 'territorio'))
    show(nextType, nextFeature, 'territorio')
  }

  // The browser's back and forward walk the same screens, and a report entry
  // reopens on the tab it was left at.
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search)
      const next = stateFromQuery(params)
      show(next.type, next.featureId, stepFromQuery(params.get('etapa') ?? ''))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [show])

  function chooseType(next: TerritoryType) {
    goTo(next, next.recorteId === BIOMA_RECORTE_ID ? BIOMA_FEATURE_ID : '')
  }

  const chooseTerritory = (id: string) => goTo(type, id)

  const changeType = () => goTo(null, '')

  // The bioma has no chooser, so another one means another type.
  const changeTerritory = () => (type?.recorteId === BIOMA_RECORTE_ID ? changeType() : goTo(type, ''))

  /** A panel's own "next" button, which unmounts with the panel. */
  function openTab(step: StepId) {
    focusPanelRef.current = true
    setTab(step)
    scrollToSection()
  }

  /** "Baixar": asks for every theme, and prints once they have all settled. */
  function download() {
    if (territoryKey) setPrintKey(territoryKey)
  }

  const loads = Object.fromEntries(
    THEME_IDS.map((theme) => [theme, entries[theme] ?? LOADING]),
  ) as Record<ThemeId, ThemeLoad>

  const isBioma = type?.recorteId === BIOMA_RECORTE_ID
  const territoryTitle = payload && type
    ? TERRITORY_SCRIPT.title(payload.featureName, type.id === 'estado' ? undefined : payload.context)
    : null
  // The report names its territory; the gallery and the chooser keep the section's question.
  const bandTitle = screen === 'story' && territoryTitle ? territoryTitle : INTRO.title
  const location: LocationBadge | null | undefined =
    screen === 'search' ? null
      : isBioma ? { value: REPORT.biomeLocation, onEdit: null }
        : territoryTitle ? { value: territoryTitle, onEdit: changeTerritory }
          : undefined

  return (
    <section ref={sectionRef} className="territorios-secao" aria-labelledby="territorios-secao-titulo">
      <ReportBand eyebrow={INTRO.eyebrow} title={bandTitle} headingRef={bandHeadingRef}>
        {screen !== 'intro' && type && (
          <ReportActions
            type={type}
            onChangeType={changeType}
            location={location}
            shareTitle={screen === 'story' ? territoryTitle : null}
            onDownload={screen === 'story' && payload ? download : null}
            downloading={printKey !== null && printKey === territoryKey}
          />
        )}
      </ReportBand>

      {screen !== 'intro' && (
        <ReportTabs
          current={screen === 'search' ? 'localizacao' : tab}
          stepsEnabled={payload !== null}
          onLocation={screen === 'story' && !isBioma ? changeTerritory : null}
          onSelect={setTab}
        />
      )}

      {expired && (
        <p className="territorios-aviso territorios-no-print" role="alert">
          {UI.sessionExpired}{' '}
          <a href={`/login?redirect=${encodeURIComponent(storyPath(pathname, recorteId, featureId, tab))}`}>{UI.signIn}</a>
        </p>
      )}

      <div className="container territorios">
        {screen === 'intro' && <TypeCards onSelect={chooseType} />}

        {screen === 'search' && type && (
          <TerritoryChooser
            key={type.id}
            type={type}
            onChoose={chooseTerritory}
            onUnauthorized={onUnauthorized}
          />
        )}

        {screen === 'story' && type && (
          <>
            {!territory && <p className="territorios-estado" role="status">{UI.loading}</p>}

            {territory?.kind === 'failed' && (
              <div className="territorios-estado" role="status">
                <p>{territory.rateLimited ? UI.rateLimited : UI.territoryUnavailable}</p>
                {!expired && (
                  <button
                    type="button"
                    className="territorios-btn territorios-btn--contorno"
                    onClick={() => { setTerritoryLoad(null); setTerritoryAttempt((n) => n + 1) }}
                  >
                    {UI.retry}
                  </button>
                )}
              </div>
            )}

            {payload && (
              <>
                <div className="territorios-relatorio" hidden={tab === 'resumo'}>
                  {tab !== 'resumo' && (
                    <ThemeStep
                      key={tab}
                      step={tab}
                      territory={payload}
                      type={type}
                      load={isTheme(tab) ? loads[tab] : LOADING}
                      expired={expired}
                      onRetry={() => { if (isTheme(tab)) retryTheme(tab) }}
                      onBack={changeType}
                      onNext={openTab}
                      landUseYear={tab === 'uso' ? { year: landUseYear, onChange: setLandUseYear } : undefined}
                    />
                  )}
                  {/* The one MapLibre instance of the report, kept mounted across
                      the tabs; on the summary its column is hidden. */}
                  <div className="territorios-relatorio-mapa territorios-no-print">
                    <StoryMap
                      territory={payload}
                      step={mapStep}
                      landUseYear={landUseYear}
                      onLandUseYear={setLandUseYear}
                      onUnauthorized={onUnauthorized}
                    />
                  </div>
                </div>

                <StorySummary
                  hidden={tab !== 'resumo'}
                  territory={payload}
                  type={type}
                  loads={loads}
                  expired={expired}
                  onRetry={retryTheme}
                  onBack={changeType}
                />
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 8: Rewrite `territorios.css`**

Replace the whole of `app/territorios.css` with:

```css
/*
 * Styles of the Territórios story. Sibling of mapa.css and relatorio.css: it
 * loads only under app/(territorios), so nothing here reaches the landing page,
 * the map or the report.
 *
 * The layout imports globals.css first, so every token (--role-*, --bg-*,
 * --am-*, --radius*, --shadow*) and type class (.text-*) is the home's own;
 * this file only adds the story's aliases, overrides the base rules it needs
 * otherwise, and lays out the band and the report's panels. The components
 * bring their own sheets: the gallery, the chooser, the report's building
 * blocks, the summary, the charts and the map.
 */

:root {
  /* The map components the story reuses read these two names. */
  --font-app: var(--font-sans);
  --font-raleway: var(--font-sans);
  --font-titulo: var(--font-display), var(--font-sans), sans-serif;

  /* What sticks over the top of the page above the section: the site header. */
  --topo-fixo: var(--header-height, 0px);
}

/* globals.css animates every scroll of the viewport. A change of screen or of
   tab brings the section back at once. */
html {
  scroll-behavior: auto;
}

/* Rubik and Archivo Narrow already draw lining figures; declared so a font
   swap cannot bring old-style ones back into the data. */
body {
  font-size: 16px;
  line-height: 24px;
  font-variant-numeric: lining-nums;
}

button,
input {
  font: inherit;
}

/* globals.css strips every underline; a link inside the story's prose keeps
   one, since color alone would not tell it apart. */
.territorios a:not([class]) {
  text-decoration: underline;
  text-underline-offset: 3px;
}

input:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--role-marca-ancora-padrao);
  outline-offset: 2px;
}

.territorios-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Section body, inside the home's .container. */
.territorios {
  padding-block: 32px 64px;
}

.territorios-aviso {
  padding: 12px 16px;
  background: var(--ctx-negativo-container);
  color: var(--bg-texto-primario);
  font-size: 14px;
  line-height: 20px;
  text-align: center;
}

.territorios-aviso a {
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}


.territorios-pergunta {
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
  letter-spacing: -0.144px;
  color: var(--bg-texto-primario);
}

/* Buttons */
.territorios-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  border: var(--borda-largura) solid transparent;
  border-radius: var(--radius-interno);
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.territorios-btn--primario {
  background: var(--role-marca-ancora-hover);
  color: var(--role-marca-ancora-texto-sobre);
}

.territorios-btn--primario:hover {
  background: var(--role-marca-ancora-pressionado);
}

.territorios-btn--contorno {
  background: var(--bg-fundo);
  border-color: var(--role-categorica1-padrao);
  color: var(--role-categorica1-padrao);
}

.territorios-btn--contorno:hover {
  background: var(--am-100);
  color: var(--role-categorica1-hover);
}

.territorios-btn:disabled,
.territorios-btn[aria-disabled='true'] {
  background: var(--am-050);
  border-color: var(--am-200);
  color: var(--role-neutro-texto-desabilitado);
  cursor: default;
}

/* The section's title band, which stays while the body below it changes. It
   imitates the home's PageIntro; components/territorios/ReportBand.tsx draws
   it, and territorios-relatorio.css lays out its actions. */
.territorios-secao-faixa {
  background: var(--am-100);
}

.territorios-secao-faixa-conteudo {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-block: 32px;
}

.territorios-secao-sobretitulo {
  color: var(--bg-texto-secundario);
  text-transform: uppercase;
}

/* 4.01:1 on --am-100, as PageIntro's title: large text only (30 px, 600). */
.territorios-secao-titulo {
  color: var(--role-marca-ancora-padrao);
}

.territorios-secao-titulo:focus {
  outline: none;
}

/* Search */
.territorios-campo {
  display: block;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: var(--bg-texto-primario);
}

.territorios-input {
  display: block;
  width: 100%;
  min-height: 48px;
  margin-top: 8px;
  padding: 8px 16px;
  /* 16px keeps mobile Safari from zooming into the field on focus. */
  font-size: 16px;
  line-height: 24px;
  color: var(--bg-texto-primario);
  background: var(--bg-fundo);
  border: 1px solid var(--bg-borda);
  border-radius: var(--radius-interno);
}

.territorios-input:focus-visible {
  border-color: var(--role-marca-ancora-padrao);
}

.territorios-contagem {
  margin-top: 12px;
  font-size: 14px;
  line-height: 20px;
  color: var(--am-400);
}

.territorios-resultados {
  margin-top: 8px;
  list-style: none;
  border-top: 1px solid var(--am-100);
}

.territorios-resultado {
  display: block;
  width: 100%;
  min-height: 44px;
  padding: 8px;
  text-align: left;
  font-size: 16px;
  line-height: 24px;
  color: var(--bg-texto-primario);
  background: none;
  border: 0;
  border-bottom: 1px solid var(--am-100);
  cursor: pointer;
}

.territorios-resultado:hover {
  color: var(--role-marca-ancora-hover);
  background: var(--am-050);
}

/* Report: the open tab's panel beside the map (Figma 19254:37446). The text
   column is 464 px; the map takes the rest at the design's 340:250. */
.territorios-relatorio {
  display: grid;
  grid-template-columns: 464px minmax(0, 1fr);
  gap: 24px;
  align-items: stretch;
}

/* Set on the summary's tab: the attribute alone loses to the display above. */
.territorios-relatorio[hidden] {
  display: none;
}

.territorios-relatorio-mapa {
  position: relative;
  align-self: start;
  min-width: 0;
  aspect-ratio: 340 / 250;
}

/* The map fills its frame and takes the design's border and corners
   (19254:37465); two classes, so territorios-mapa.css, which loads later,
   cannot undo it. */
.territorios-relatorio-mapa > .territorios-mapa {
  position: absolute;
  inset: 0;
  height: auto;
  border-color: #d1cec8;
  border-radius: 12px;
}

/* One tab (19254:37447): the answer at the top, the buttons at the foot. */
.territorios-etapa-painel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 32px;
  min-width: 0;
}

.territorios-etapa-corpo {
  display: grid;
  align-content: start;
  gap: 16px;
  min-width: 0;
}

/* The tab's title: its icon, and its color inline from STEP_COLORS (19257:5752). */
.territorios-etapa-titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
  letter-spacing: -0.144px;
}

/* Focused by a change of tab or of screen, not by the visitor. */
.territorios-etapa-titulo:focus {
  outline: none;
}

/* 19254:37454. */
.territorios-etapa-pergunta {
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: var(--bg-texto-primario);
}

.territorios-passo-texto {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.territorios-resposta {
  display: grid;
  gap: 16px;
}

/* 19254:37458. */
.territorios-resposta-frase {
  font-size: 14px;
  line-height: 24px;
  color: var(--foreground);
}

.territorios-graficos {
  display: grid;
  gap: 24px;
}

.territorios-estado {
  padding: 24px;
  border: 1px dashed var(--bg-borda);
  border-radius: var(--radius);
  font-size: 16px;
  line-height: 24px;
  color: var(--am-400);
}

.territorios-estado .territorios-btn {
  margin-top: 16px;
}

/* Land use map year, beside the map it switches. */
.territorios-passo-anos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  line-height: 20px;
  color: var(--am-400);
}

.territorios-passo-anos span {
  margin-right: 8px;
}

.territorios-passo-anos button {
  min-width: 64px;
  min-height: 44px;
  padding: 0 16px;
  border: var(--borda-largura) solid var(--role-categorica1-padrao);
  border-radius: var(--radius-interno);
  background: var(--bg-fundo);
  color: var(--role-categorica1-padrao);
  font-weight: 500;
  font-variant-numeric: lining-nums tabular-nums;
  cursor: pointer;
}

.territorios-passo-anos button[aria-pressed='true'] {
  background: var(--bg-texto-primario);
  border-color: var(--bg-texto-primario);
  color: var(--bg-fundo);
}

@media (min-width: 768px) and (max-width: 1023px) {
  .territorios-relatorio {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Narrow screens: the map under the panel. The site is built for computers
   for now; this only keeps the report readable. */
@media (max-width: 767px) {
  .territorios-relatorio {
    grid-template-columns: minmax(0, 1fr);
  }

  .territorios-secao-faixa-conteudo {
    padding-block: 24px;
  }
}

@media (min-width: 640px) {
  .territorios {
    padding-block: 40px 80px;
  }
}

@media (max-width: 519px) {
  .territorios-pergunta {
    font-size: 20px;
    line-height: 28px;
  }
}

/* MapLibre's zoom buttons are 29 px; on a touch screen they are the quickest
   way to zoom. */
@media (pointer: coarse) {
  .territorios-mapa .maplibregl-ctrl-group button {
    width: 44px;
    height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto !important;
  }

  *,
  *::before,
  *::after {
    transition: none !important;
    animation: none !important;
  }
}

@media print {
  @page {
    size: A4;
    margin: 14mm 15mm;
  }

  body {
    background: #ffffff;
  }

  /* Only the summary prints: the rest of the page, the section's band and
     tabs, and the open tab step aside while a report is open. */
  body:has(.territorios-resumo) > :not(main),
  main:has(.territorios-resumo) > :not(.territorios-secao) {
    display: none !important;
  }

  .territorios {
    max-width: none;
    padding: 0;
  }

  .territorios-relatorio,
  .territorios-no-print {
    display: none !important;
  }
}
```

- [ ] **Step 9: Remove what the tabs replace**

In `app/territorios-galeria.css`:
1. Delete everything from `/* The chosen type, folded into a band above the chooser and the story. */` through the end of the `.territorios-tipo-faixa-botao:focus-visible { … }` rule.
2. Inside `@media (max-width: 767px)`, delete the two rules `.territorios-tipo-faixa { min-height: 72px; … }` and `.territorios-tipo-faixa-nome { font-size: 20px; … }`.

In `config/territorios/chooserScript.ts`, delete the `RAIL` export with its comment (Task 5 already rewrote the header comment).

In `config/territorios/storyScript.ts`, delete these `UI` entries, which nothing uses any more:
- `pageTitle`;
- `next`;
- `showMap`;
- `closeMap`;
- `mapDialog`;
- `summaryTitle`;
- `print`.

Then:

```bash
git rm components/territorios/useActiveSection.ts components/territorios/StepRail.tsx components/territorios/TypeStrip.tsx
grep -rn "activeSection\|useActiveSection\|StepRail\|TypeStrip\|RAIL\b\|tipo-faixa\|UI\.\(pageTitle\|next\|showMap\|closeMap\|mapDialog\|summaryTitle\|print\)\b\|territorios-historia\|territorios-trilha\|territorios-faixa\b\|FIGURE_COLORS" app components config lib tests
```

Expected: the grep prints nothing.

- [ ] **Step 10: Run the tests, the type check and lint**

Run: `npx vitest run 2>&1 | tail -4; npx tsc --noEmit -p . 2>&1 | grep -c "error TS"; npm run lint 2>&1 | tail -2`
Expected: all passing, `5`, `✖ 5 problems (3 errors, 2 warnings)`. If lint reports a new problem in `TerritoriosApp.tsx`, fix it before going on. The set-during-render of `mapStep` and of the print counter is the pattern the file already used (`setMapMounted`); do not move it into an effect.

- [ ] **Step 11: Smoke-check the render**

Serve the worktree (`npx next dev -p 3100`, in the background) and set up the harness (Global Constraints). Then, one per call:

```js
await frameAt('/territorios?recorte=municipios&feicao=juazeiro&etapa=territorio')
```

```js
[probe('.territorios-secao-faixa', 1, '.territorios-secao'), probe('.territorios-abas', 1, '.territorios-secao'), probe('.territorios-etapa-titulo', 1, '.territorios-secao'), probe('.territorios-relatorio-mapa', 1, '.territorios-secao')].join('\n')
```

Expected (±2 px; Figma 19254:37412 minus its 76 px header):
- band `@0,0 1436x110`;
- tabs `@0,110 1436x61`;
- title `@80,211` 24 px Rubik, color `rgb(88, 124, 34)`;
- map frame `@568,211 788x579`.

Click "Estoque" in the tab bar and confirm the panel changes and the address ends in `etapa=estoque`:

```js
F.contentDocument.querySelectorAll('.territorios-aba')[2].click(); await new Promise(r => setTimeout(r, 500)); [F.contentWindow.location.search, F.contentDocument.querySelector('.territorios-etapa-titulo').innerText].join(' | ')
```

Expected: `?recorte=municipios&feicao=juazeiro&etapa=estoque | Estoque`.

- [ ] **Step 12: Commit**

```bash
git add -A app components config lib tests
git commit -m "feat: show the Territórios report one tab at a time"
```

---

### Task 7: The summary as cards

**Files:**
- Rewrite: `components/territorios/StorySummary.tsx`, `app/territorios-resumo.css`
- Modify: `app/territorios-graficos.css` (the `.tg-cmp--compact` rules)
- Test: `tests/components/territoriosReport.test.ts`

**Interfaces:**
- Consumes: `SummaryRow.tone` (Task 4), `UI_ICONS.open` and `UI_ICONS.close` (Task 5), `PanelNav` and `StepIcon` (Task 5).
- Produces: summary markup with `.territorios-fichas`, `.territorios-ficha[data-tom]` badges and the print-only `.territorios-so-impressao` header.

- [ ] **Step 1: Write the failing tests**

In `tests/components/territoriosReport.test.ts`, add `import StorySummary from '@/components/territorios/StorySummary'` and append:

```ts
const LOADING_ALL = {
  estoque: { kind: 'loading' }, fluxo: { kind: 'loading' }, uso: { kind: 'loading' },
  fogo: { kind: 'loading' }, chuva: { kind: 'loading' },
} as const

const SUMMARY = {
  territory: JUAZEIRO, type: typeOf('municipio'), loads: LOADING_ALL,
  expired: false, onRetry: noop, onBack: noop,
}

describe('StorySummary', () => {
  it('stays in the page, hidden, while another tab is open, for "Baixar"', () => {
    expect(html(StorySummary, { ...SUMMARY, hidden: true })).toMatch(/^<section id="etapa-resumo"[^>]* hidden=""/)
  })

  it('lays out a card per theme, the name for paper only, and the way back', () => {
    const markup = html(StorySummary, { ...SUMMARY, hidden: false })
    // Cards still loading stay off the printed sheet.
    expect(markup.match(/<li class="territorios-ficha territorios-no-print"/g)).toHaveLength(5)
    expect(markup).toContain('<header class="territorios-ficha-cabecalho territorios-so-impressao">')
    expect(markup).toContain('Juazeiro (BA)')
    expect(markup).toContain('/images/territorios/icones/abrir.svg')
    expect(buttons(markup).map((b) => b.text)).toEqual(['Recorte'])
  })

  it('offers a retry on a failed card, named for its theme', () => {
    const markup = html(StorySummary, {
      ...SUMMARY, hidden: false, loads: { ...LOADING_ALL, fogo: { kind: 'failed', rateLimited: false } },
    })
    expect(markup).toContain('aria-label="Tentar novamente: Fogo"')
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/components/territoriosReport.test.ts -t StorySummary`
Expected: FAIL. The rows are still `territorios-ficha-linha` and the header is not print-only.

- [ ] **Step 3: Rewrite `StorySummary.tsx`**

Replace the whole file with:

```tsx
'use client'

/* eslint-disable @next/next/no-img-element -- fixed-size icons exported from Figma */
import { useEffect, useRef, useState } from 'react'
import '@/app/territorios-resumo.css'
import PanelNav from './PanelNav'
import StepChart from './StepChart'
import StepIcon from './StepIcon'
import StepFigure from './charts/StepFigure'
import { CHOOSER } from '@/config/territorios/chooserScript'
import { UI_ICONS } from '@/config/territorios/icons'
import { STEP_COLORS } from '@/config/territorios/palette'
import { STEP_LABELS, type TerritoryType } from '@/config/territorios/story'
import { ABOUT_SCRIPT, READING_LABELS, SUMMARY_ROW_SCRIPT, TERRITORY_SCRIPT, UI } from '@/config/territorios/storyScript'
import { sectionId } from '@/lib/territorios/storyTabs'
import { aboutItems, summaryRows } from '@/lib/territorios/storyText'
import { formatArea } from '@/lib/territorios/storyValues'
import type { ThemeLoad } from './ThemeStep'
import type { ThemeId, TerritoryPayload, ThemeResponse } from '@/types/territorios'

export interface StorySummaryProps {
  /** Another tab is open; the summary stays in the page so "Baixar" can print it. */
  hidden:    boolean
  territory: TerritoryPayload
  type:      TerritoryType
  loads:     Record<ThemeId, ThemeLoad>
  /** The session is gone: the retry buttons would only fail again. */
  expired:   boolean
  onRetry:   (theme: ThemeId) => void
  /** "Recorte": back to the gallery of types. */
  onBack:    () => void
}

/**
 * The summary tab (Figma 19254:37467): a card per theme, its reading as a
 * badge colored by whether it is good news, "Sobre os dados" folded, and the
 * way back. Printing outputs this section alone, with the fold open, whichever
 * tab is on screen; the band that names the territory does not print, so the
 * name heads the sheet on paper only.
 */
export default function StorySummary({
  hidden, territory, type, loads, expired, onRetry, onBack,
}: StorySummaryProps) {
  const [generatedAt] = useState(() => new Date().toLocaleDateString('pt-BR'))
  const aboutRef = useRef<HTMLDetailsElement | null>(null)

  // A folded <details> prints folded; the sheet prints it open and folds it
  // back afterwards if the visitor had it closed.
  useEffect(() => {
    let reopen = false
    const before = () => {
      const details = aboutRef.current
      if (!details || details.open) return
      reopen = true
      details.open = true
    }
    const after = () => {
      if (reopen && aboutRef.current) aboutRef.current.open = false
      reopen = false
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  const responses: Partial<Record<ThemeId, ThemeResponse>> = {}
  for (const [theme, load] of Object.entries(loads) as [ThemeId, ThemeLoad][]) {
    if (load.kind === 'ready') responses[theme] = load.response
  }
  const input = { responses, territory, type }
  const rows = summaryRows(input)
  const about = aboutItems(input)
  const title = TERRITORY_SCRIPT.title(territory.featureName, type.id === 'estado' ? undefined : territory.context)
  const id = sectionId('resumo')

  return (
    <section id={id} data-step="resumo" className="territorios-resumo" aria-labelledby={`${id}-titulo`} hidden={hidden}>
      <h3 id={`${id}-titulo`} className="territorios-etapa-titulo" style={{ color: STEP_COLORS.resumo }} tabIndex={-1}>
        <StepIcon step="resumo" />
        {STEP_LABELS.resumo}
      </h3>

      <header className="territorios-ficha-cabecalho territorios-so-impressao">
        <p className="territorios-ficha-nome">{title}</p>
        <p className="territorios-ficha-detalhe">
          {/* The title above already carries the state. */}
          {CHOOSER.confirmDetail(type.unitLabel, undefined, formatArea(territory.areaHa), type.id === 'bioma')}
        </p>
      </header>

      <ul className="territorios-fichas">
        {rows.map((row) => {
          const load = loads[row.theme]
          const color = STEP_COLORS[row.theme]
          return (
            <li
              key={row.theme}
              // A print from another tab can come before this theme was ever requested.
              className={load.kind === 'loading' ? 'territorios-ficha territorios-no-print' : 'territorios-ficha'}
            >
              <div className="territorios-ficha-topo">
                {row.reading && row.tone && (
                  <p className="territorios-ficha-leitura" data-tom={row.tone}>
                    {row.theme === 'fluxo' ? SUMMARY_ROW_SCRIPT.fluxo.readings[row.reading] : READING_LABELS[row.reading]}
                  </p>
                )}
                <h4 className="territorios-ficha-titulo">{row.title}</h4>
              </div>
              {load.kind === 'loading' ? (
                <p className="territorios-ficha-estado">{UI.loading}</p>
              ) : load.kind === 'failed' || load.response.status === 'unavailable' ? (
                <div className="territorios-ficha-estado">
                  <p>{UI.summaryUnavailable}</p>
                  {!expired && (
                    <button
                      type="button"
                      className="territorios-btn territorios-btn--contorno territorios-no-print"
                      onClick={() => onRetry(row.theme)}
                      aria-label={`${UI.retry}: ${STEP_LABELS[row.theme]}`}
                    >
                      {UI.retry}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="territorios-ficha-valor">
                    {row.headline && <StepFigure value={row.headline.value} unit={row.headline.unit} color={color} />}
                    <p className="territorios-ficha-frase">{row.sentence}</p>
                  </div>
                  <div className="territorios-ficha-grafico">
                    <StepChart theme={row.theme} response={load.response} territory={territory} type={type} compact />
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>

      <details ref={aboutRef} className="territorios-sobre">
        <summary>
          {ABOUT_SCRIPT.title}
          <img className="territorios-sobre-abrir" src={UI_ICONS.open} alt="" width={24} height={24} />
          <img className="territorios-sobre-fechar" src={UI_ICONS.close} alt="" width={24} height={24} />
        </summary>
        <dl>
          {about.map((item) => (
            <div key={item.title}>
              <dt>{item.title}</dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
        <p className="territorios-sobre-data">{UI.generatedAt(generatedAt)}</p>
      </details>

      <PanelNav onBack={onBack} />
    </section>
  )
}
```

- [ ] **Step 4: Rewrite `territorios-resumo.css`**

Replace the whole file with:

```css
/*
 * The report's summary tab (Figma 19254:37467), imported by
 * components/territorios/StorySummary.tsx. It stays in the page, hidden, while
 * another tab is open, so "Baixar" can print it from any tab; only it prints.
 */

.territorios-resumo {
  display: grid;
  gap: 24px;
  align-content: start;
}

/* The attribute alone loses to the display above. */
.territorios-resumo[hidden] {
  display: none;
}

/* The band that names the territory does not print; on paper this does. */
.territorios-so-impressao {
  display: none;
}

.territorios-ficha-cabecalho {
  gap: 4px;
}

.territorios-ficha-nome {
  font-family: var(--font-titulo);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.08;
  color: var(--bg-texto-primario);
}

.territorios-ficha-detalhe {
  font-size: 14px;
  line-height: 20px;
  color: var(--am-400);
}

/* Three cards to a row (19254:37507); a row's bars line up at its foot. */
.territorios-fichas {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 19254:37508. */
.territorios-ficha {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 24px;
  background: var(--bg-superficie);
  border: 1px solid var(--bg-borda);
  border-radius: var(--radius);
  break-inside: avoid;
}

.territorios-ficha-topo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

/* The reading (19254:17370), colored by whether it is good news for the
   territory (readingTone in storyText.ts); grey when close, and for rain. */
.territorios-ficha-leitura {
  padding: 1px 9px;
  border: 1px solid var(--am-200);
  border-radius: 9999px;
  font-family: var(--font-ui), sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  color: var(--bg-texto-primario);
}

.territorios-ficha-leitura[data-tom='good'] {
  border-color: var(--ctx-positivo-padrao);
  color: var(--ctx-positivo-padrao);
}

.territorios-ficha-leitura[data-tom='bad'] {
  border-color: var(--ctx-negativo-padrao);
  color: var(--ctx-negativo-padrao);
}

.territorios-ficha-titulo {
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: var(--bg-texto-primario);
}

.territorios-ficha-valor {
  display: grid;
  gap: 8px;
}

.territorios-ficha-frase {
  font-size: 14px;
  line-height: 24px;
  color: var(--foreground);
}

.territorios-ficha-grafico {
  margin-top: auto;
}

.territorios-ficha-estado {
  display: grid;
  gap: 12px;
  justify-items: start;
  font-size: 14px;
  line-height: 20px;
  color: var(--am-400);
}

/* "Sobre os dados" (19254:39200): a grey bar that opens onto the sources. */
.territorios-sobre {
  overflow: hidden;
  background: var(--bg-fundo);
  border: 2px solid var(--am-100);
  border-radius: var(--radius);
}

.territorios-sobre summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  background: var(--am-100);
  list-style: none;
  font-family: var(--font-ui), sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 36px;
  letter-spacing: -0.15px;
  color: var(--bg-texto-primario);
  cursor: pointer;
}

.territorios-sobre summary::-webkit-details-marker {
  display: none;
}

.territorios-sobre summary:focus-visible {
  outline: 2px solid var(--role-marca-ancora-foco);
  outline-offset: -4px;
}

/* The chevron sits in the design's 48 px box, 12 px from the edge. */
.territorios-sobre summary img {
  flex: none;
  margin-right: 12px;
}

.territorios-sobre-fechar,
.territorios-sobre[open] .territorios-sobre-abrir {
  display: none;
}

.territorios-sobre[open] .territorios-sobre-fechar {
  display: block;
}

.territorios-sobre dl {
  display: grid;
  padding: 24px 24px 0;
  font-family: var(--font-ui), sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: var(--bg-texto-secundario);
}

.territorios-sobre dt {
  font-weight: 700;
}

.territorios-sobre dd {
  margin: 0;
}

.territorios-sobre-data {
  padding: 24px;
  font-family: var(--font-ui), sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: var(--bg-texto-secundario);
}

@media (min-width: 768px) and (max-width: 1023px) {
  .territorios-fichas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .territorios-fichas {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media print {
  .territorios-resumo,
  .territorios-resumo[hidden] {
    display: grid !important;
    gap: 6mm;
  }

  .territorios-so-impressao {
    display: grid;
  }

  .territorios-fichas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4mm;
  }

  .territorios-ficha {
    gap: 3mm;
    padding: 4mm;
  }

  .territorios-ficha .tg-step-figure-value {
    font-size: 30px;
    line-height: 30px;
  }

  .territorios-sobre summary img {
    display: none !important;
  }

  /* Browsers drop background colors and some borders by default when printing. */
  .territorios-ficha,
  .territorios-ficha-leitura,
  .territorios-sobre summary,
  .tg-chart {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

- [ ] **Step 5: Reshape the card's bar**

In `app/territorios-graficos.css`, replace:

```css
.tg-cmp--compact .tg-tag,
.tg-cmp--compact .tg-chart-title {
  font-size: 12px;
  line-height: 16px;
}

.tg-cmp--compact .tg-cmp-track {
  height: 8px;
  margin: 4px 0;
}

.tg-cmp--compact .tg-cmp-marker {
  top: -4px;
  bottom: -4px;
}
```

with:

```css
/* The summary card's bar (Figma 19254:17361): the value above an 11 px track,
   the Caatinga below it, in 12 px with the figure in medium. #d9d9d9 is the
   design's track, with no token of its own. */
.tg-cmp--compact .tg-tag,
.tg-cmp--compact .tg-chart-title {
  font-size: 12px;
  line-height: 20px;
}

.tg-cmp--compact .tg-tag b {
  font-weight: 500;
}

.tg-cmp--compact .tg-cmp-track {
  height: 11px;
  margin: 2px 0;
  background: #d9d9d9;
  border-radius: 4px;
}

.tg-cmp--compact .tg-cmp-fill {
  border-radius: 4px;
}

.tg-cmp--compact .tg-cmp-marker {
  top: -2px;
  bottom: -1px;
  width: 3px;
  left: clamp(0px, calc(var(--at) - 1.5px), calc(100% - 3px));
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/components 2>&1 | tail -4; npx tsc --noEmit -p . 2>&1 | grep -c "error TS"; npm run lint 2>&1 | tail -2`
Expected: PASS, `5`, `✖ 5 problems (3 errors, 2 warnings)`.

- [ ] **Step 7: Rendered check**

```js
await frameAt('/territorios?recorte=municipios&feicao=juazeiro&etapa=resumo')
```

Wait until every card has left "Carregando", re-running this until it prints `0`:

```js
F.contentDocument.querySelectorAll('.territorios-ficha.territorios-no-print').length
```

Then:

```js
probe('.territorios-ficha', 5, '.territorios-secao')
```

```js
[...F.contentDocument.querySelectorAll('.territorios-ficha')].map(c => { const b = c.querySelector('.territorios-ficha-leitura'); return `${c.querySelector('.territorios-ficha-titulo').innerText}: ${b ? b.dataset.tom + ' ' + F.contentWindow.getComputedStyle(b).color : '-'}` }).join('\n')
```

Expected (±2 px, Figma 19254:37467):
- the cards sit `@80,267`, `@513,267` and `@947,267`, each 409 px wide;
- the second row starts at x = 80 and 513;
- the background is `rgb(254, 252, 247)`, the border `1px rgb(82, 111, 120)`;
- each badge's color matches its tone: `good` `rgb(88, 124, 34)`, `bad` `rgb(181, 76, 64)`, `neutral` `rgb(0, 29, 39)`;
- "Chuva" is `neutral`; "Área que já queimou" is `good` when it reads "Abaixo".

Open "Sobre os dados" and probe its bar:

```js
F.contentDocument.querySelector('.territorios-sobre summary').click(); probe('.territorios-sobre summary', 1)
```

Expected: Inter 600 20px/36px, bg `rgb(230, 234, 235)`, the `fechar.svg` chevron shown.

- [ ] **Step 8: Commit**

```bash
git add components/territorios/StorySummary.tsx app/territorios-resumo.css app/territorios-graficos.css tests/components/territoriosReport.test.ts
git commit -m "feat: lay out the Territórios summary as cards"
```

---

### Task 8: The chooser in the report's frame

**Files:**
- Modify: `components/territorios/TerritoryChooser.tsx` (props, the locate button, the new footer)
- Modify: `components/territorios/TerritoriosApp.tsx` (pass `onBack`)
- Modify: `app/territorios-escolha.css` (header comment, `.territorios-escolha-localizar`, the `min-width: 768px` block, new scoped rules)
- Test: `tests/components/territoriosReport.test.ts`

**Interfaces:**
- Consumes: `PanelNav`, `REPORT.seeReport`, `UI_ICONS.locate` (Task 5).
- Produces: `TerritoryChooserProps.onBack: () => void`.

- [ ] **Step 1: Write the failing test**

In `tests/components/territoriosReport.test.ts`, add `import TerritoryChooser from '@/components/territorios/TerritoryChooser'` and append:

```ts
describe('TerritoryChooser', () => {
  it('ends its column with the way back and "Ver relatório", disabled until a territory is proposed', () => {
    const markup = html(TerritoryChooser, {
      type: typeOf('municipio'), onChoose: noop, onBack: noop, onUnauthorized: noop,
    })
    expect(markup).toContain('Qual município?')
    expect(buttons(markup).slice(-2)).toEqual([
      { text: 'Recorte', disabled: false },
      { text: 'Ver relatório', disabled: true },
    ])
    // The locate button carries the design's pin; the privacy note stays.
    expect(markup).toContain('/images/territorios/icones/localizacao.svg')
    expect(markup).toContain('Sua localização não é enviada nem guardada.')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/components/territoriosReport.test.ts -t TerritoryChooser`
Expected: FAIL: the last button is "Usar minha localização".

- [ ] **Step 3: Implement**

In `components/territorios/TerritoryChooser.tsx`:
1. Below `'use client'` add `/* eslint-disable @next/next/no-img-element -- fixed-size icon exported from Figma */`.
2. Add the imports `import PanelNav from './PanelNav'` and `import { UI_ICONS } from '@/config/territorios/icons'`. Change `import { CHOOSER } from '@/config/territorios/chooserScript'` to `import { CHOOSER, REPORT } from '@/config/territorios/chooserScript'`.
3. In `TerritoryChooserProps`, after `onChoose`, add:

```ts
  /** "Recorte": back to the gallery of types (Figma 19254:37408). */
  onBack:         () => void
```

4. Change the signature to `export default function TerritoryChooser({ type, onChoose, onBack }: TerritoryChooserProps) {`.
5. In the locate button, replace `{CHOOSER.locate}` with:

```tsx
              {CHOOSER.locate}
              <img src={UI_ICONS.locate} alt="" width={16} height={16} />
```

6. Right after the closing `</div>` of `territorios-escolha-caminhos`, still inside `territorios-escolha-painel`, add:

```tsx
        {/* "Ver relatório" confirms the proposed territory, as "Sim, conhecer" does (19254:37409). */}
        <PanelNav
          onBack={onBack}
          next={{ label: REPORT.seeReport, onClick: candidateEntry ? () => onChoose(candidateEntry.id) : null }}
        />
```

In `components/territorios/TerritoriosApp.tsx`, add `onBack={changeType}` to `<TerritoryChooser … />`, after `onChoose={chooseTerritory}`.

In `app/territorios-escolha.css`, change the header comment to:

```css
/*
 * The Territórios chooser: a 464 px column (question, search, location, and
 * at its foot the way back and "Ver relatório") beside the map of every
 * territory of a type at the report's 340:250 on a computer (Figma
 * 19254:37396); the same column above a map of 45svh on a phone, where the
 * confirmation rises as a sheet from the bottom edge. Imported by
 * components/territorios/TerritoryChooser.tsx and read with the tokens and
 * button classes of globals.css and territorios.css.
 */
```

Replace the `.territorios-escolha-localizar` rule with:

```css
/* 19254:37406: Inter Medium 14, 1 px green outline, the pin after the label. */
.territorios-escolha-localizar {
  width: 100%;
  min-height: 40px;
  border-width: 1px;
  font-family: var(--font-ui), sans-serif;
  font-size: 14px;
  white-space: normal;
}
```

Append after the `.territorios-escolha [hidden]` rule:

```css
/* 19254:37401: the question in the brand olive. */
.territorios-escolha .territorios-pergunta {
  color: var(--role-marca-ancora-padrao);
}

/* 19254:37402: label in Rubik Medium 16, the count right under the field. */
.territorios-escolha .territorios-campo {
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
}

.territorios-escolha .territorios-input {
  min-height: 40px;
  margin-top: 6px;
  padding: 7px 12px;
}

.territorios-escolha .territorios-contagem {
  margin-top: 6px;
  line-height: 24px;
  color: var(--bg-texto-primario);
}
```

Replace the whole `@media (min-width: 768px) { … }` block with:

```css
@media (min-width: 768px) {
  .territorios-escolha {
    grid-template-columns: 464px minmax(0, 1fr);
    grid-template-areas: 'painel mapa';
    align-items: stretch;
    gap: 24px;
  }

  /* The way back and on sits at the column's foot, level with the map's
     bottom edge (19254:37397). */
  .territorios-escolha-painel {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 0;
  }

  .territorios-escolha-painel > .territorios-painel-nav {
    margin-top: auto;
  }

  /* The report's 340:250 (19254:37410), its border and corners. */
  .territorios-escolha-mapa {
    align-self: start;
    height: auto;
    aspect-ratio: 340 / 250;
    border-color: #d1cec8;
    border-radius: 12px;
  }
}
```

- [ ] **Step 4: Run the tests, the type check and lint**

Run: `npx vitest run 2>&1 | tail -4; npx tsc --noEmit -p . 2>&1 | grep -c "error TS"; npm run lint 2>&1 | tail -2`
Expected: all passing, `5`, `✖ 5 problems (3 errors, 2 warnings)`.

- [ ] **Step 5: Rendered check**

```js
await frameAt('/territorios?recorte=municipios')
```

```js
[probe('.territorios-escolha .territorios-pergunta', 1, '.territorios-secao'), probe('.territorios-escolha .territorios-painel-nav', 1, '.territorios-secao'), probe('.territorios-escolha-mapa', 1, '.territorios-secao'), probe('.territorios-aba', 2)].join('\n')
```

Expected (±2 px, Figma 19254:37363 minus 76):
- question `@80,211`, color `rgb(88, 124, 34)`;
- the footer bottom-aligned with the map, at about `@80,750 464x40`;
- map `@568,211 788x579`;
- tab 1 "Localização" in olive with a 2 px underline, tab 2 "Território" disabled `rgb(148, 166, 172)`.

Pick a municipality in the search field and confirm "Ver relatório" is enabled; pressing it opens the report on Território.

- [ ] **Step 6: Commit**

```bash
git add components/territorios/TerritoryChooser.tsx components/territorios/TerritoriosApp.tsx app/territorios-escolha.css tests/components/territoriosReport.test.ts
git commit -m "feat: frame the Territórios chooser like the report"
```

---

### Task 9: The territory tab's indicator cards (new copy; skippable)

Skip this task if the user rejects the two new lines of copy (Decisions, last default). No later task depends on it.

**Files:**
- Modify: `types/territorios.ts` (`AreaRank`, `Indicator`, `TerritoryPayload.areaRank`)
- Create: `lib/territorios/areaRank.ts`
- Modify: `lib/territorios/themeService.ts` (`getTerritory`)
- Modify: `config/territorios/storyScript.ts` (`TERRITORY_SCRIPT`, `FEMININE_TYPES`)
- Modify: `lib/territorios/storyText.ts` (`territoryIndicators`)
- Modify: `components/territorios/ThemeStep.tsx`, `app/territorios-relatorio.css`
- Test: `tests/lib/territoriosAreaRank.test.ts` (new), `tests/lib/territoriosStoryText.test.ts`, `tests/lib/territoriosStoryValues.test.ts` (fixture), `tests/app/territoriosRoutes.test.ts`, `tests/components/territoriosReport.test.ts`

**Interfaces:**
- Produces:
  - `AreaRank { position: number; total: number }`;
  - `Indicator { value: string; text: string }`;
  - `rankByArea(areas: ReadonlyMap<string, number>, id: string): AreaRank | null`;
  - `TerritoryPayload.areaRank: AreaRank | null`;
  - `territoryIndicators({ territory, type }): Indicator[]`.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/territoriosAreaRank.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { rankByArea } from '@/lib/territorios/areaRank'

describe('rankByArea', () => {
  const AREAS = new Map([['a', 10], ['b', 30], ['c', 20], ['d', 20]])

  it('counts from the largest, ties sharing the better place', () => {
    expect(rankByArea(AREAS, 'b')).toEqual({ position: 1, total: 4 })
    expect(rankByArea(AREAS, 'c')).toEqual({ position: 2, total: 4 })
    expect(rankByArea(AREAS, 'd')).toEqual({ position: 2, total: 4 })
    expect(rankByArea(AREAS, 'a')).toEqual({ position: 4, total: 4 })
  })

  it('has no place for a feature it does not know', () => {
    expect(rankByArea(AREAS, 'x')).toBeNull()
  })
})
```

In `tests/lib/territoriosStoryText.test.ts`:
- add `areaRank: null,` to the defaults of `payload(over)`, before `...over`;
- add `territoryIndicators` to the import from `@/lib/territorios/storyText`;
- append:

```ts
describe('territoryIndicators', () => {
  const JUAZEIRO = payload({
    featureName: 'Juazeiro', context: 'BA', areaHa: 672_000, biomaAreaHa: 86_000_000,
    areaRank: { position: 40, total: 1210 },
  })

  it('gives a municipality its share of the biome and its rank by area (Figma 19254:37459)', () => {
    expect(territoryIndicators({ territory: JUAZEIRO, type: municipio })).toEqual([
      { value: '0,8%', text: 'da área da Caatinga' },
      { value: '40º', text: 'maior entre os 1.210 municípios' },
    ])
  })

  it('agrees the rank with a feminine type', () => {
    const ti = payload({ areaRank: { position: 3, total: 50 } })
    expect(territoryIndicators({ territory: ti, type: typeOf('terra_indigena') })[1])
      .toEqual({ value: '3ª', text: 'maior entre as 50 terras indígenas' })
  })

  it('gives the biome no card, and a territory without a rank only its share', () => {
    expect(territoryIndicators({ territory: CG, type: bioma })).toEqual([])
    expect(territoryIndicators({ territory: CG, type: municipio })).toHaveLength(1)
  })
})
```

In `tests/lib/territoriosStoryValues.test.ts`, add `areaRank: null,` to the `territory` fixture after `biome: NO_BIOME,`.

In `tests/app/territoriosRoutes.test.ts`, add `import { listFeicoes } from '@/lib/mapa/recorteRegistry'` after the other imports. In `'resolves the territory with the biome area and the precomputed biome references'`, add:

```ts
    // Its place by area among the municipalities, as the territory tab prints it.
    expect(body.areaRank.total).toBe(listFeicoes('municipios').length)
    expect(body.areaRank.position).toBeGreaterThanOrEqual(1)
    expect(body.areaRank.position).toBeLessThanOrEqual(body.areaRank.total)
```

In `tests/components/territoriosReport.test.ts`, give `JUAZEIRO` the field `areaRank: { position: 40, total: 1210 },` after `biome: NO_BIOME,`, and in `'lays out the territory tab of Figma 19254:37447'` add:

```ts
    expect(markup).toContain('<ul class="territorios-indicadores">')
    expect(markup).toContain('maior entre os 1.210 municípios')
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/territoriosAreaRank.test.ts tests/lib/territoriosStoryText.test.ts tests/app/territoriosRoutes.test.ts tests/components/territoriosReport.test.ts`
Expected: FAIL. `areaRank` and `territoryIndicators` do not exist, and the route body has no `areaRank`.

- [ ] **Step 3: Add the types and the rank**

In `types/territorios.ts`, above `TerritoryPayload`, add:

```ts
/** Where a territory stands among those of its type by area. */
export interface AreaRank {
  /** 1 for the largest; ties share the better place. */
  position: number
  total:    number
}

/** A card under the territory's area: a figure and the words after it. */
export interface Indicator {
  value: string
  text:  string
}
```

and in `TerritoryPayload`, after `biomaAreaHa: number`, add:

```ts
  /** Its place among the territories of its type by area; null for the biome. */
  areaRank:    AreaRank | null
```

Create `lib/territorios/areaRank.ts`:

```ts
// Where a territory stands among the others of its type by area, for the
// "maior entre os 1.210 municípios" card of the territory tab (Figma 19254:37461).

import type { AreaRank } from '@/types/territorios'

export function rankByArea(areas: ReadonlyMap<string, number>, id: string): AreaRank | null {
  const own = areas.get(id)
  if (own === undefined) return null
  let larger = 0
  for (const area of areas.values()) if (area > own) larger += 1
  return { position: larger + 1, total: areas.size }
}
```

In `lib/territorios/themeService.ts`:
- change the import to `import { getFeicao, listFeicoes, type FeicaoResolvida } from '@/lib/mapa/recorteRegistry'`;
- add `import { rankByArea } from '@/lib/territorios/areaRank'`;
- above `getTerritory`, add:

```ts
/** Area of every feature of a recorte, by id, measured as getTerritory measures one. */
const areasByRecorte = new Map<string, Map<string, number>>()

function recorteAreas(recorteId: string): Map<string, number> {
  const cached = areasByRecorte.get(recorteId)
  if (cached) return cached
  const areas = new Map<string, number>()
  for (const { id } of listFeicoes(recorteId)) {
    const feicao = getFeicao(recorteId, id)
    if (feicao) areas.set(id, ellipsoidAreaHa(feicao.geometry))
  }
  areasByRecorte.set(recorteId, areas)
  return areas
}
```

- in the object `getTerritory` returns, after `biomaAreaHa: biomeAreaHa,`, add:

```ts
    areaRank:    recorteId === BIOMA_RECORTE_ID ? null : rankByArea(recorteAreas(recorteId), feicao.id),
```

- [ ] **Step 4: Add the copy and the indicators**

In `config/territorios/storyScript.ts`, add `TerritoryTypeId` to the type import from `@/types/territorios`, and replace `TERRITORY_SCRIPT` with:

```ts
export const TERRITORY_SCRIPT = {
  /** `context` is the state; left out for a state, whose name already is one. */
  title: (name: string, context?: string) => (context ? `${displayName(name)} (${context})` : displayName(name)),
  /** The territory's share of the biome, under its area (Figma 19254:37460). */
  biomeShare: 'da área da Caatinga',
  /** Its place by area among the territories of its type (19254:37461). */
  rankValue: (position: number, feminine: boolean) => `${numero(position, 0)}${feminine ? 'ª' : 'º'}`,
  rankText:  (total: number, plural: string, feminine: boolean) =>
    `maior entre ${feminine ? 'as' : 'os'} ${numero(total, 0)} ${plural}`,
}

/** Types whose unit is feminine in Portuguese: "a 3ª maior terra indígena". */
export const FEMININE_TYPES: ReadonlySet<TerritoryTypeId> = new Set<TerritoryTypeId>(['terra_indigena'])
```

In `lib/territorios/storyText.ts`, add `FEMININE_TYPES` and `TERRITORY_SCRIPT` to the import from `@/config/territorios/storyScript`, and `Indicator` and `TerritoryPayload` to the type import, if missing. Then add, below `territoryAnswer`:

```ts
/**
 * The cards under the territory's area (Figma 19254:37459): its share of the
 * biome, and its rank by area among the territories of its type. None for the
 * biome, which is the whole.
 */
export function territoryIndicators({ territory, type }: { territory: TerritoryPayload; type: TerritoryType }): Indicator[] {
  if (isBioma(type)) return []
  const s = TERRITORY_SCRIPT
  const items: Indicator[] = [{ value: formatPercent(biomeAreaSharePct(territory)), text: s.biomeShare }]
  const rank = territory.areaRank
  if (rank && type.plural) {
    const feminine = FEMININE_TYPES.has(type.id)
    items.push({ value: s.rankValue(rank.position, feminine), text: s.rankText(rank.total, type.plural, feminine) })
  }
  return items
}
```

`formatPercent` and `biomeAreaSharePct` are already imported there for `territoryAnswer`; add whichever is missing.

In `components/territorios/ThemeStep.tsx`, change the storyText import to `import { stepAnswer, territoryIndicators } from '@/lib/territorios/storyText'`. In the `else` branch of `body`, right after the closing `</div>` of `territorios-resposta`, add:

```tsx
        {step === 'territorio' && (
          <ul className="territorios-indicadores">
            {territoryIndicators({ territory, type }).map((item) => (
              <li key={item.text} className="territorios-indicador">
                <p className="territorios-indicador-valor">{item.value}</p>
                <p className="territorios-indicador-texto">{item.text}</p>
              </li>
            ))}
          </ul>
        )}
```

Append to `app/territorios-relatorio.css`:

```css
/* The territory's cards (19254:37459): its share of the biome at 172 px, its
   rank in the rest; D-DIN Bold 24 over Rubik 14. The bioma has none, and its
   empty list takes no room. */
.territorios-indicadores {
  display: grid;
  grid-template-columns: 172px minmax(0, 1fr);
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.territorios-indicadores:empty {
  display: none;
}

.territorios-indicador {
  display: grid;
  align-content: center;
  gap: 8px;
  padding: 16px;
  background: var(--am-100);
  border-radius: var(--radius);
}

.territorios-indicador-valor {
  font-family: var(--font-figures, var(--font-display)), sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 36px;
  letter-spacing: -0.18px;
  color: var(--bg-texto-primario);
}

.territorios-indicador-texto {
  font-size: 14px;
  line-height: 24px;
  color: var(--bg-texto-secundario);
}
```

- [ ] **Step 5: Run the tests, the type check and lint**

Run: `npx vitest run 2>&1 | tail -4; npx tsc --noEmit -p . 2>&1 | grep -c "error TS"; npm run lint 2>&1 | tail -2`
Expected: all passing, `5`, `✖ 5 problems (3 errors, 2 warnings)`.

- [ ] **Step 6: Rendered check**

```js
await frameAt('/territorios?recorte=municipios&feicao=juazeiro&etapa=territorio')
```

```js
probe('.territorios-indicador', 2, '.territorios-secao')
```

Expected: two cards side by side, 172 px and 276 px wide (±2 px), bg `rgb(230, 234, 235)`, the first reading `0,8%` and the second `Nº`. Then open `?recorte=bioma` and confirm `.territorios-indicadores` has no visible box.

- [ ] **Step 7: Commit**

```bash
git add -A types lib config components app tests
git commit -m "feat: show the territory's share of the biome and its rank by area"
```

---

### Task 10: Verification against the design and the review focus

No new code unless a check fails; fix any failure in the task that owns the code and commit the fix there.

- [ ] **Step 1: Full suite, types, lint, build, contrast**

Run: `npx vitest run 2>&1 | tail -4; npx tsc --noEmit -p . 2>&1 | grep -c "error TS"; npm run lint 2>&1 | tail -2; npm run build 2>&1 | tail -5; npm run contrast 2>&1 | tail -2`
Expected: all tests passing, `5`, `✖ 5 problems (3 errors, 2 warnings)`, a successful build, the contrast check passing.

- [ ] **Step 2: The report against Figma 19254:37412**

```js
await frameAt('/territorios?recorte=municipios&feicao=juazeiro&etapa=territorio')
```

```js
[probe('.territorios-secao-titulo', 1, '.territorios-secao'), probe('.territorios-selo', 2, '.territorios-secao'), probe('.territorios-acao', 2, '.territorios-secao')].join('\n')
```

Expected (±2 px):
- title "Juazeiro (BA)" `@80,58` (band 40 + eyebrow 18), Rubik 600 30px/36px, color `rgb(39, 114, 91)`;
- badges and buttons on one row ending at x = 1356, their tops at y ≈ 54, 40 px tall;
- "Baixar" bg `rgb(39, 114, 91)`;
- "Compartilhar" border `1px rgb(39, 114, 91)`.

Then the hovers (Figma 19254:39149), each against its rest state:

```js
[hoverProbe('.territorios-acao--baixar'), hoverProbe('.territorios-acao--compartilhar'), hoverProbe('button.territorios-selo')].join('\n')
```

Expected:
- "Baixar" bg `rgb(32, 92, 73)`;
- "Compartilhar" bg `rgb(234, 243, 240)`;
- badge bg `rgb(234, 243, 240)`.

- [ ] **Step 3: Header**

```js
probe('header nav a[aria-current="page"]', 1)
```

Expected: `"Resumo territorial"` in Inter 700, olive, with its underline (Figma I19254:37327;19180:11638).

- [ ] **Step 4: Review Focus 1, "Baixar" from the first tab**

Load the report fresh, then stub the print and press "Baixar" at once:

```js
await frameAt('/territorios?recorte=municipios&feicao=campina-grande&etapa=territorio')
```

```js
const w = F.contentWindow; w.__printed = null; w.print = () => { w.__printed = w.document.querySelectorAll('.territorios-ficha:not(.territorios-no-print)').length }; w.document.querySelector('.territorios-acao--baixar').click(); 'clicked'
```

Re-run until it is not `null` (Earth Engine may take a minute):

```js
F.contentWindow.__printed
```

Expected: `5`. While waiting, `F.contentDocument.querySelector('.territorios-acao--baixar').getAttribute('aria-busy')` reads `"true"`. Then ask the user to press "Baixar" once with the real print dialog and confirm the preview holds the territory's name, five cards and "Sobre os dados" open.

- [ ] **Step 5: Review Focus 2, the map after the summary**

The tabs' indices: 0 Localização, 1 Território, 2 Estoque, 3 Fluxo, 4 Uso da terra, 5 Fogo, 6 Chuva, 7 Resumo.

```js
const d = F.contentDocument; d.querySelectorAll('.territorios-aba')[7].click(); await new Promise(r => setTimeout(r, 400)); d.querySelectorAll('.territorios-aba')[3].click(); await new Promise(r => setTimeout(r, 1500)); probe('.territorios-relatorio-mapa .maplibregl-canvas', 1)
```

Expected: the canvas measures about `786x577` (the 788×579 frame less its 1 px border), not `0x0`, and the Fluxo legend shows. Repeat on a fresh `frameAt('/territorios?recorte=municipios&feicao=juazeiro&etapa=resumo')`, then click "Estoque" (index 2): same size.

- [ ] **Step 6: Review Focus 3, addresses**

```js
await frameAt('/territorios?recorte=municipios&feicao=juazeiro&etapa=degradacao')
```

```js
[F.contentWindow.location.search, F.contentDocument.querySelector('.territorios-aba[aria-current]').innerText].join(' | ')
```

Expected: `?recorte=municipios&feicao=juazeiro&etapa=territorio | Território`. Then press the "Localização" badge, pick another municipality, use `F.contentWindow.history.back()` twice, and confirm the chooser and then Juazeiro's report come back on the tab they were left at.

- [ ] **Step 7: Review Focus 4, the bioma**

```js
await frameAt('/territorios?recorte=bioma')
```

```js
const d = F.contentDocument; [probe('.territorios-aba', 1), d.querySelector('.territorios-acoes').innerText.replace(/\s+/g, ' ').trim(), d.querySelector('p.territorios-selo b')?.innerText, String(d.querySelectorAll('.territorios-indicador').length)].join('\n')
```

Expected:
- the "Localização" tab disabled, color `rgb(148, 166, 172)`;
- the actions read "Recorte: bioma. Trocar tipo Localização: Caatinga Baixar Compartilhar" (the visually hidden ". Trocar tipo" counts in innerText);
- "Caatinga" inside a `<p>`, not a button;
- `0` indicator cards.

- [ ] **Step 8: Review Focus 5, focus after "next"**

```js
await frameAt('/territorios?recorte=municipios&feicao=juazeiro&etapa=territorio')
```

```js
const d = F.contentDocument; d.querySelector('.territorios-etapa-painel .territorios-navegar:last-child').click(); await new Promise(r => setTimeout(r, 300)); [d.activeElement.id, d.activeElement.innerText].join(' | ')
```

Expected: `etapa-estoque-titulo | Estoque`.

- [ ] **Step 9: Hand over**

Report each check's result to the user, failures included, then use superpowers:finishing-a-development-branch. The PR title and body are in English and the body lists the Decisions; remember the user's merge habits (fetch before describing the branch).

---

## Appendix B: icon files

Run from the worktree root. It writes the 17 SVGs byte for byte as the Figma MCP exported them (Figma 19257:5752, 19254:37414, 19254:37407, 19254:39200). The exceptions are `fogo.svg` and `baixar.svg`, which are Material Symbols paths filled for this report. Task 5, Step 1 checks their SHA-256.

```bash
DIR=public/images/territorios/icones
mkdir -p "$DIR"
cat > "$DIR/territorio.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Map" clip-path="url(#clip0_0_49)">
<g id="Vector">
</g>
<path id="Vector_2" d="M20.5 3L20.34 3.03L15 5.1L9 3L3.36 4.9C3.15 4.97 3 5.15 3 5.38V20.5C3 20.78 3.22 21 3.5 21L3.66 20.97L9 18.9L15 21L20.64 19.1C20.85 19.03 21 18.85 21 18.62V3.5C21 3.22 20.78 3 20.5 3ZM10 5.47L14 6.87V18.53L10 17.13V5.47ZM5 6.46L8 5.45V17.15L5 18.31V6.46ZM19 17.54L16 18.55V6.86L19 5.7V17.54Z" fill="#587C22"/>
</g>
<defs>
<clipPath id="clip0_0_49">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
SVG
cat > "$DIR/estoque.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Estoque">
<path id="Vector" d="M5 21L3 9H21L19 21H5ZM6.675 19H17.325L18.6 11H5.4L6.675 19ZM10 15H14C14.2833 15 14.5208 14.9042 14.7125 14.7125C14.9042 14.5208 15 14.2833 15 14C15 13.7167 14.9042 13.4792 14.7125 13.2875C14.5208 13.0958 14.2833 13 14 13H10C9.71667 13 9.47917 13.0958 9.2875 13.2875C9.09583 13.4792 9 13.7167 9 14C9 14.2833 9.09583 14.5208 9.2875 14.7125C9.47917 14.9042 9.71667 15 10 15ZM6 8C5.71667 8 5.47917 7.90417 5.2875 7.7125C5.09583 7.52083 5 7.28333 5 7C5 6.71667 5.09583 6.47917 5.2875 6.2875C5.47917 6.09583 5.71667 6 6 6H18C18.2833 6 18.5208 6.09583 18.7125 6.2875C18.9042 6.47917 19 6.71667 19 7C19 7.28333 18.9042 7.52083 18.7125 7.7125C18.5208 7.90417 18.2833 8 18 8H6ZM8 5C7.71667 5 7.47917 4.90417 7.2875 4.7125C7.09583 4.52083 7 4.28333 7 4C7 3.71667 7.09583 3.47917 7.2875 3.2875C7.47917 3.09583 7.71667 3 8 3H16C16.2833 3 16.5208 3.09583 16.7125 3.2875C16.9042 3.47917 17 3.71667 17 4C17 4.28333 16.9042 4.52083 16.7125 4.7125C16.5208 4.90417 16.2833 5 16 5H8Z" fill="#27725B"/>
</g>
</svg>
SVG
cat > "$DIR/fluxo.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="20" height="17" viewBox="0 0 20 17" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Group">
<path id="Vector" d="M12.5 14C12.5 15.65 11.15 17 9.5 17C7.85 17 6.5 15.65 6.5 14H8.5C8.5 14.55 8.95 15 9.5 15C10.05 15 10.5 14.55 10.5 14C10.5 13.45 10.05 13 9.5 13H0V11H9.5C11.15 11 12.5 12.35 12.5 14ZM17 3.5C17 1.57 15.43 0 13.5 0C11.57 0 10 1.57 10 3.5H12C12 2.67 12.67 2 13.5 2C14.33 2 15 2.67 15 3.5C15 4.33 14.33 5 13.5 5H0V7H13.5C15.43 7 17 5.43 17 3.5ZM16.5 8H0V10H16.5C17.33 10 18 10.67 18 11.5C18 12.33 17.33 13 16.5 13V15C18.43 15 20 13.43 20 11.5C20 9.57 18.43 8 16.5 8Z" fill="#27725B"/>
</g>
</svg>
SVG
cat > "$DIR/uso.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Uso da terra">
<path id="Vector" d="M12 22C10.6167 22 9.31667 21.7375 8.1 21.2125C6.88333 20.6875 5.825 19.975 4.925 19.075C4.025 18.175 3.3125 17.1167 2.7875 15.9C2.2625 14.6833 2 13.3833 2 12C2 10.6167 2.2625 9.31667 2.7875 8.1C3.3125 6.88333 4.025 5.825 4.925 4.925C5.825 4.025 6.88333 3.3125 8.1 2.7875C9.31667 2.2625 10.6167 2 12 2C13.2667 2 14.4667 2.22083 15.6 2.6625C16.7333 3.10417 17.7417 3.71667 18.625 4.5C19.5083 5.28333 20.2417 6.20833 20.825 7.275C21.4083 8.34167 21.775 9.5 21.925 10.75C21.5917 10.5667 21.2417 10.4167 20.875 10.3C20.5083 10.1833 20.1333 10.1 19.75 10.05C19.4333 8.8 18.8625 7.7 18.0375 6.75C17.2125 5.8 16.2 5.08333 15 4.6V5C15 5.55 14.8042 6.02083 14.4125 6.4125C14.0208 6.80417 13.55 7 13 7H11V9C11 9.28333 10.9042 9.52083 10.7125 9.7125C10.5208 9.90417 10.2833 10 10 10H8V12H14.5C14.0167 12.5333 13.6458 13.1333 13.3875 13.8C13.1292 14.4667 13 15.1667 13 15.9C13 17.2 13.2583 18.2083 13.775 18.925C14.2917 19.6417 14.9583 20.425 15.775 21.275C15.175 21.5083 14.5583 21.6875 13.925 21.8125C13.2917 21.9375 12.65 22 12 22ZM11 19.95V18C10.45 18 9.97917 17.8042 9.5875 17.4125C9.19583 17.0208 9 16.55 9 16V15L4.2 10.2C4.15 10.5 4.10417 10.8 4.0625 11.1C4.02083 11.4 4 11.7 4 12C4 14.0167 4.6625 15.7833 5.9875 17.3C7.3125 18.8167 8.98333 19.7 11 19.95ZM20.0625 17.0625C20.3542 16.7708 20.5 16.4167 20.5 16C20.5 15.5833 20.3583 15.2292 20.075 14.9375C19.7917 14.6458 19.4417 14.5 19.025 14.5C18.5917 14.5 18.2292 14.6458 17.9375 14.9375C17.6458 15.2292 17.5 15.5833 17.5 16C17.5 16.4167 17.6458 16.7708 17.9375 17.0625C18.2292 17.3542 18.5833 17.5 19 17.5C19.4167 17.5 19.7708 17.3542 20.0625 17.0625ZM19 22C18.95 22 18.8167 21.9083 18.6 21.725L18.5 21.55C18.1333 20.9167 17.6708 20.3542 17.1125 19.8625C16.5542 19.3708 16.075 18.8167 15.675 18.2C15.4417 17.8667 15.2708 17.5042 15.1625 17.1125C15.0542 16.7208 15 16.3167 15 15.9C15 14.8 15.3917 13.875 16.175 13.125C16.9583 12.375 17.9 12 19 12C20.1 12 21.0417 12.375 21.825 13.125C22.6083 13.875 23 14.8 23 15.9C23 16.3167 22.9458 16.7208 22.8375 17.1125C22.7292 17.5042 22.5583 17.8667 22.325 18.2C21.925 18.8167 21.4458 19.3708 20.8875 19.8625C20.3292 20.3542 19.8667 20.9167 19.5 21.55L19.4 21.725C19.3667 21.8083 19.3125 21.875 19.2375 21.925C19.1625 21.975 19.0833 22 19 22Z" fill="#7F765A"/>
</g>
</svg>
SVG
cat > "$DIR/fogo.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path d="M240-400q0 52 21 98.5t60 81.5q-1-5-1-9v-9q0-32 12-60t35-51l113-111 113 111q23 23 35 51t12 60v9q0 4-1 9 39-35 60-81.5t21-98.5q0-50-18.5-94.5T648-574q-20 13-42 19.5t-45 6.5q-62 0-107.5-41T401-690q-39 33-69 68.5t-50.5 72Q261-513 250.5-475T240-400Zm240 52-57 56q-11 11-17 25t-6 29q0 32 23.5 55t56.5 23q33 0 56.5-23t23.5-55q0-16-6-29.5T537-292l-57-56Zm0-492v132q0 34 23.5 57t57.5 23q18 0 33.5-7.5T622-658l18-22q74 42 117 117t43 163q0 134-93 227T480-80q-134 0-227-93t-93-227q0-129 86.5-245T480-840Z" fill="#7F765A"/></svg>
SVG
cat > "$DIR/chuva.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="rainy_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24 1">
<path id="Vector" d="M13.95 21.9C13.7 22.0333 13.4458 22.0542 13.1875 21.9625C12.9292 21.8708 12.7333 21.7 12.6 21.45L11.1 18.45C10.9667 18.2 10.9458 17.9458 11.0375 17.6875C11.1292 17.4292 11.3 17.2333 11.55 17.1C11.8 16.9667 12.0542 16.9458 12.3125 17.0375C12.5708 17.1292 12.7667 17.3 12.9 17.55L14.4 20.55C14.5333 20.8 14.5542 21.0542 14.4625 21.3125C14.3708 21.5708 14.2 21.7667 13.95 21.9ZM19.95 21.9C19.7 22.0333 19.4458 22.0542 19.1875 21.9625C18.9292 21.8708 18.7333 21.7 18.6 21.45L17.1 18.45C16.9667 18.2 16.9458 17.9458 17.0375 17.6875C17.1292 17.4292 17.3 17.2333 17.55 17.1C17.8 16.9667 18.0542 16.9458 18.3125 17.0375C18.5708 17.1292 18.7667 17.3 18.9 17.55L20.4 20.55C20.5333 20.8 20.5542 21.0542 20.4625 21.3125C20.3708 21.5708 20.2 21.7667 19.95 21.9ZM7.95 21.9C7.7 22.0333 7.44583 22.0542 7.1875 21.9625C6.92917 21.8708 6.73333 21.7 6.6 21.45L5.1 18.45C4.96667 18.2 4.94583 17.9458 5.0375 17.6875C5.12917 17.4292 5.3 17.2333 5.55 17.1C5.8 16.9667 6.05417 16.9458 6.3125 17.0375C6.57083 17.1292 6.76667 17.3 6.9 17.55L8.4 20.55C8.53333 20.8 8.55417 21.0542 8.4625 21.3125C8.37083 21.5708 8.2 21.7667 7.95 21.9ZM7.5 16C5.98333 16 4.6875 15.4625 3.6125 14.3875C2.5375 13.3125 2 12.0167 2 10.5C2 9.11667 2.45833 7.90833 3.375 6.875C4.29167 5.84167 5.425 5.23333 6.775 5.05C7.30833 4.1 8.0375 3.35417 8.9625 2.8125C9.8875 2.27083 10.9 2 12 2C13.5 2 14.8042 2.47917 15.9125 3.4375C17.0208 4.39583 17.6917 5.59167 17.925 7.025C19.075 7.125 20.0417 7.6 20.825 8.45C21.6083 9.3 22 10.3167 22 11.5C22 12.75 21.5625 13.8125 20.6875 14.6875C19.8125 15.5625 18.75 16 17.5 16H7.5ZM7.5 14H17.5C18.2 14 18.7917 13.7583 19.275 13.275C19.7583 12.7917 20 12.2 20 11.5C20 10.8 19.7583 10.2083 19.275 9.725C18.7917 9.24167 18.2 9 17.5 9H16V8C16 6.9 15.6083 5.95833 14.825 5.175C14.0417 4.39167 13.1 4 12 4C11.2 4 10.4708 4.21667 9.8125 4.65C9.15417 5.08333 8.65833 5.66667 8.325 6.4L8.075 7H7.45C6.5 7.03333 5.6875 7.3875 5.0125 8.0625C4.3375 8.7375 4 9.55 4 10.5C4 11.4667 4.34167 12.2917 5.025 12.975C5.70833 13.6583 6.53333 14 7.5 14Z" fill="#367483"/>
</g>
</svg>
SVG
cat > "$DIR/resumo.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Group">
<path id="Vector" d="M12 0H2C0.9 0 0.00999999 0.9 0.00999999 2L0 16C0 17.1 0.89 18 1.99 18H16C17.1 18 18 17.1 18 16V6L12 0ZM2 16V2H11V7H16V16H2ZM6 5C6 5.55 5.55 6 5 6C4.45 6 4 5.55 4 5C4 4.45 4.45 4 5 4C5.55 4 6 4.45 6 5ZM6 9C6 9.55 5.55 10 5 10C4.45 10 4 9.55 4 9C4 8.45 4.45 8 5 8C5.55 8 6 8.45 6 9ZM6 13C6 13.55 5.55 14 5 14C4.45 14 4 13.55 4 13C4 12.45 4.45 12 5 12C5.55 12 6 12.45 6 13Z" fill="#587C22"/>
</g>
</svg>
SVG
cat > "$DIR/editar.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Edit" clip-path="url(#clip0_0_75)">
<g id="Vector">
</g>
<path id="Vector_2" d="M14.06 9.02L14.98 9.94L5.92 19H5V18.08L14.06 9.02ZM17.66 3C17.41 3 17.15 3.1 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C18.17 3.09 17.92 3 17.66 3ZM14.06 6.19L3 17.25V21H6.75L17.81 9.94L14.06 6.19Z" fill="#27725B"/>
</g>
<defs>
<clipPath id="clip0_0_75">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
SVG
cat > "$DIR/baixar.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" fill="#FFFFFF"/></svg>
SVG
cat > "$DIR/compartilhar.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Share" clip-path="url(#clip0_0_59)">
<g id="Vector">
</g>
<path id="Vector_2" d="M12 1.77669C12.8618 1.77669 13.5566 2.47151 13.5566 3.33333C13.5566 4.19515 12.8618 4.88997 12 4.88997C11.5934 4.88997 11.2257 4.7313 10.9414 4.4681L10.7002 4.24544L10.417 4.41048L5.7168 7.15072L5.43848 7.31283L5.50684 7.62728C5.53806 7.77092 5.55664 7.88812 5.55664 8.00033C5.5566 8.11241 5.53802 8.22894 5.50684 8.3724L5.43848 8.68783L5.7168 8.84993L10.4707 11.6165L10.75 11.7796L10.9902 11.5618C11.2639 11.3145 11.6141 11.1634 12 11.1634C12.8284 11.1634 13.5028 11.838 13.5029 12.6663C13.5029 13.4948 12.8285 14.1702 12 14.1702C11.1715 14.1702 10.4971 13.4948 10.4971 12.6663C10.4971 12.5595 10.5115 12.4478 10.5381 12.3363L10.6143 12.016L10.3301 11.8509L5.58398 9.07747L5.2998 8.91146L5.05859 9.13509C4.77429 9.3982 4.40655 9.55697 4 9.55697C3.13829 9.55697 2.44353 8.862 2.44336 8.00033C2.44336 7.13851 3.13818 6.44368 4 6.44368C4.40669 6.44368 4.77425 6.60228 5.05859 6.86556L5.2998 7.08822L5.58301 6.92318L10.2832 4.18294L10.5615 4.02083L10.4932 3.7054C10.462 3.56195 10.4434 3.44543 10.4434 3.33333C10.4434 2.47151 11.1382 1.77669 12 1.77669ZM12 11.5697C11.3885 11.5697 10.8896 12.0685 10.8896 12.68C10.8897 13.2915 11.3885 13.7904 12 13.7904C12.6115 13.7904 13.1103 13.2915 13.1104 12.68C13.1104 12.0685 12.6115 11.5697 12 11.5697ZM4 6.88997C3.38849 6.88997 2.88965 7.38881 2.88965 8.00033C2.88983 8.61169 3.3886 9.1097 4 9.1097C4.6114 9.1097 5.11017 8.61169 5.11035 8.00033C5.11035 7.38881 4.61151 6.88997 4 6.88997ZM12 2.22298C11.3885 2.22298 10.8896 2.72182 10.8896 3.33333C10.8896 3.94485 11.3885 4.44368 12 4.44368C12.6115 4.44368 13.1104 3.94485 13.1104 3.33333C13.1104 2.72182 12.6115 2.22298 12 2.22298Z" stroke="#27725B" stroke-width="0.886667"/>
</g>
<defs>
<clipPath id="clip0_0_59">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>
SVG
cat > "$DIR/compartilhar-desabilitado.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Share" clip-path="url(#clip0_0_792)">
<g id="Vector">
</g>
<path id="Vector_2" d="M12 1.77669C12.8618 1.77669 13.5566 2.47151 13.5566 3.33333C13.5566 4.19515 12.8618 4.88997 12 4.88997C11.5934 4.88997 11.2257 4.7313 10.9414 4.4681L10.7002 4.24544L10.417 4.41048L5.7168 7.15072L5.43848 7.31283L5.50684 7.62728C5.53806 7.77092 5.55664 7.88812 5.55664 8.00033C5.5566 8.11241 5.53802 8.22894 5.50684 8.3724L5.43848 8.68783L5.7168 8.84993L10.4707 11.6165L10.75 11.7796L10.9902 11.5618C11.2639 11.3145 11.6141 11.1634 12 11.1634C12.8284 11.1634 13.5028 11.838 13.5029 12.6663C13.5029 13.4948 12.8285 14.1702 12 14.1702C11.1715 14.1702 10.4971 13.4948 10.4971 12.6663C10.4971 12.5595 10.5115 12.4478 10.5381 12.3363L10.6143 12.016L10.3301 11.8509L5.58398 9.07747L5.2998 8.91146L5.05859 9.13509C4.77429 9.3982 4.40655 9.55697 4 9.55697C3.13829 9.55697 2.44353 8.862 2.44336 8.00033C2.44336 7.13851 3.13818 6.44368 4 6.44368C4.40669 6.44368 4.77425 6.60228 5.05859 6.86556L5.2998 7.08822L5.58301 6.92318L10.2832 4.18294L10.5615 4.02083L10.4932 3.7054C10.462 3.56195 10.4434 3.44543 10.4434 3.33333C10.4434 2.47151 11.1382 1.77669 12 1.77669ZM12 11.5697C11.3885 11.5697 10.8896 12.0685 10.8896 12.68C10.8897 13.2915 11.3885 13.7904 12 13.7904C12.6115 13.7904 13.1103 13.2915 13.1104 12.68C13.1104 12.0685 12.6115 11.5697 12 11.5697ZM4 6.88997C3.38849 6.88997 2.88965 7.38881 2.88965 8.00033C2.88983 8.61169 3.3886 9.1097 4 9.1097C4.6114 9.1097 5.11017 8.61169 5.11035 8.00033C5.11035 7.38881 4.61151 6.88997 4 6.88997ZM12 2.22298C11.3885 2.22298 10.8896 2.72182 10.8896 3.33333C10.8896 3.94485 11.3885 4.44368 12 4.44368C12.6115 4.44368 13.1104 3.94485 13.1104 3.33333C13.1104 2.72182 12.6115 2.22298 12 2.22298Z" stroke="#94A6AC" stroke-width="0.886667"/>
</g>
<defs>
<clipPath id="clip0_0_792">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>
SVG
cat > "$DIR/localizacao.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Person pin circle" clip-path="url(#clip0_0_770)">
<g id="Vector">
</g>
<path id="Vector_2" d="M7.99967 1.77669C10.5686 1.77669 12.8903 3.73854 12.8903 6.80013C12.8903 7.78726 12.4924 8.90931 11.6325 10.1771C10.8213 11.373 9.6131 12.6715 7.99967 14.0775C6.3865 12.6717 5.17898 11.3729 4.36784 10.1771C3.50788 8.90931 3.11006 7.78726 3.11003 6.80013C3.11003 3.73867 5.43086 1.77686 7.99967 1.77669ZM7.99967 2.22298C5.51591 2.22315 3.55632 4.14118 3.55632 6.80013C3.55635 7.69924 3.92907 8.69093 4.61589 9.74837C5.30561 10.8102 6.33402 11.9723 7.70085 13.221L7.99967 13.4935L8.29948 13.221C9.66634 11.9723 10.6947 10.8103 11.3844 9.74837C12.0713 8.69093 12.443 7.69924 12.443 6.80013C12.443 4.14106 10.4836 2.22298 7.99967 2.22298ZM7.99967 7.77669C8.38742 7.77669 8.99811 7.87831 9.50065 8.07943C9.75152 8.17985 9.9477 8.29421 10.0739 8.41048C10.1616 8.4913 10.1997 8.55727 10.2145 8.6097C9.65228 9.19153 8.8683 9.55697 7.99967 9.55697C7.13101 9.55688 6.34702 9.19165 5.78483 8.6097C5.79963 8.55729 5.83786 8.49127 5.92546 8.41048C6.05159 8.29423 6.24792 8.17984 6.4987 8.07943C7.00115 7.8783 7.61185 7.77675 7.99967 7.77669ZM7.99967 4.44368C8.48816 4.44368 8.8903 4.84485 8.8903 5.33333C8.8903 5.82182 8.48816 6.22298 7.99967 6.22298C7.51133 6.2228 7.11003 5.82171 7.11003 5.33333C7.11003 4.84495 7.51133 4.44386 7.99967 4.44368Z" stroke="#27725B" stroke-width="0.886667"/>
</g>
<defs>
<clipPath id="clip0_0_770">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>
SVG
cat > "$DIR/seta-esquerda.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Keyboard arrow left" clip-path="url(#clip0_0_940)">
<g id="Vector">
</g>
<path id="Vector_2" d="M9.64583 4.93945L6.90658 7.68652L6.59408 8L6.90658 8.31348L9.64583 11.0596L9.33333 11.373L5.96029 8L9.33333 4.62695L9.64583 4.93945Z" fill="#292829" stroke="#587C22" stroke-width="0.886667"/>
</g>
<defs>
<clipPath id="clip0_0_940">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>
SVG
cat > "$DIR/seta-direita.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Keyboard arrow right" clip-path="url(#clip0_0_53)">
<g id="Vector">
</g>
<path id="Vector_2" d="M10.0401 8L6.6671 11.373L6.35264 11.0586L9.09385 8.31348L9.40635 8L9.09385 7.68652L6.35264 4.94043L6.6671 4.62695L10.0401 8Z" stroke="#587C22" stroke-width="0.886667"/>
</g>
<defs>
<clipPath id="clip0_0_53">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>
SVG
cat > "$DIR/seta-direita-desabilitada.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Keyboard arrow right" clip-path="url(#clip0_0_924)">
<g id="Vector">
</g>
<path id="Vector_2" d="M10.0401 8L6.6671 11.373L6.35264 11.0586L9.09385 8.31348L9.40635 8L9.09385 7.68652L6.35264 4.94043L6.6671 4.62695L10.0401 8Z" stroke="#B3B3B3" stroke-width="0.886667"/>
</g>
<defs>
<clipPath id="clip0_0_924">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>
SVG
cat > "$DIR/abrir.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Keyboard arrow down" clip-path="url(#clip0_0_107)">
<g id="Vector">
</g>
<path id="Vector_2" d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="#31312D"/>
</g>
<defs>
<clipPath id="clip0_0_107">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
SVG
cat > "$DIR/fechar.svg" <<'SVG'
<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Keyboard arrow up" clip-path="url(#clip0_0_18)">
<g id="Vector">
</g>
<path id="Vector_2" d="M7.41 15.41L12 10.83L16.59 15.41L18 14L12 8L6 14L7.41 15.41Z" fill="#001D27"/>
</g>
<defs>
<clipPath id="clip0_0_18">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
SVG
```
