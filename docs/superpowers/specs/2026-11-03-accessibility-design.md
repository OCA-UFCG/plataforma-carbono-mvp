# Accessibility — design

**Date:** 2026-11-03
**Status:** approved by the user on 2026-11-03. A builder check has been run, and its questions are settled in §3. After the check the user ruled out visual changes, except what only keyboard use brings up (decisions 2 and 2b). This version is written around that rule. Each workstream gets its own implementation plan in `docs/superpowers/plans/`, written when the one before it is under way; A's is `2026-11-03-accessibility-a-foundations.md`.

Built from a read of `main` at `82e17f5`/`6d5a3af` and an axe run on production (`carbono-caatinga.oca.ufcg.edu.br`, 11 public pages), before any code was written.

## 1. Why

People with disabilities should be able to use every part of carbono: the institutional pages, the Glossário, the Territórios story, signup and login, the map platform and the carbon report. The motive is humanitarian, in the user's words, "por uma questão humanitária". It is not a compliance deadline. Success is measured by whether a person can do the task, not by a checklist score.

**The site's look stays as it is** (decision 2). This plan fixes what can be fixed without changing what a sighted mouse user sees. Whatever needs a visible change is recorded as a known limitation, not made. The one exception is what appears only while someone uses the keyboard (decision 2b).

The other OCA sites went through this in October 2026:

- `SAP-frontend` #472 is the main pass: AA contrast, keyboard, charts and the map for screen readers, eMAG shortcuts, VLibras and an `/acessibilidade` page.
- `SAP-frontend` #481 makes the platform usable by keyboard alone.
- `SAP-frontend` #484 sets `pt-BR`, leaves a single footer landmark and removes a tutorial axe error.
- `data-nordeste-frontend` #364 and #369 add a skip link and VLibras, and fix contrast, carousels and the PDF viewer after axe.

Their PR bodies are the best reference for how each item was solved and verified. Unlike carbono, both changed visuals where needed, so not everything they did carries over.

### Where carbono stands

The component work is largely done well. Only the site-level pieces are missing, plus barriers that no automated checker sees.

- **axe on production** reports 3 nodes in total across 11 public pages, all of them the home hero's 6 px dots (`target-size`). `/glossario` was a 404 there because it is not deployed yet.
- **The full `eslint-plugin-jsx-a11y` recommended set** reports 32 hits:
  - 29 are `no-redundant-roles` on `<ul role="list">`, which is deliberate: Safari drops list semantics under `list-style: none`.
  - 3 are worth a look: `RecortePicker.tsx:165`, `TerritorySearch.tsx:166` and `PdfViewer.tsx:327`.
- **Already in place, keep it:**
  - `lang="pt-BR"` and a `<title>` per page on all five root layouts.
  - Named landmarks.
  - A global `:focus-visible` ring on links and buttons, with no `outline: none` on controls. Headings that take focus programmatically (`tabIndex={-1}` in Territórios) show no ring, so moving focus to a heading changes nothing on screen.
  - `alt` on every `<img>`, decorative ones empty.
  - WAI-ARIA tabs (Plataforma, Comunicação, Glossário).
  - Two full comboboxes: `TerritorySearch` and the Territórios search.
  - `RecortePicker` as a listbox.
  - Native range inputs with `aria-valuetext`.
  - `prefers-reduced-motion` honoured in almost every place.
  - Palette contrast covered by tests (`tests/lib/marketingPalette.test.ts`, `tests/config/territoriosPalette.test.ts`) and by `npm run contrast` in CI.
  - Territórios charts are `<figure>`s with readable captions and forced-colors support.
- **Missing at site level:**
  - the eMAG skip bar and access keys;
  - an accessibility statement page;
  - any lint or test that keeps accessibility from regressing.
- **Missing at behaviour level** (found by reading the code, §6):
  - pointer-only analysis on the map;
  - chart values only in tooltips;
  - results that arrive silently;
  - focus lost when the focused control unmounts;
  - motion without a pause;
  - layouts that clip at 200–400 % zoom;
  - information carried by colour alone.

## 2. What success looks like

Each of these must work end to end when the work is done:

1. **A blind person using NVDA or Orca:**
   - signs up at `/cadastro` and hears that the confirmation email was sent;
   - logs in, then turns on a layer and hears that it loaded;
   - finds a municipality by search and hears its results arrive;
   - reads the yearly series as a table (hidden from view, read by the screen reader);
   - opens the carbon stock report in the results column (`StockReportView`);
   - on `/territorios`, picks a territory, steps through the tabs and hears each figure as it loads.
2. **A person who uses only the keyboard:**
   - skips the header with the first Tab, and never has the focused element hidden under the sticky header;
   - sees the focus ring on the maps, the Comunicação cards and the Plataforma tabs;
   - marks a point and draws a polygon by keyboard, at the centre of the map;
   - reorders and removes active layers;
   - opens and closes the ficha without losing their place.
3. **A person sensitive to motion:**
   - the hero carousel stops for good once they touch its arrows or dots, and holds while the pointer is over it;
   - a Glossário scene's automatic tour stops when they pick a step;
   - "Pausar" stops everything a scene animates.
4. **Anyone who hits a barrier** finds `/acessibilidade` and reads what works and what is known not to. There is no address to write to yet (decision 7).

These are out of reach under decision 2 and stay in §8:

- a deaf person reading in Libras (VLibras adds a floating button);
- a person who zooms to 200–400 % or enlarges the browser's font: the layouts would have to reflow or resize text, which decision 2b rules out;
- a colour-blind person telling the rain classes, the flux inks or the badge readings apart (they would need new colours or patterns);
- a visible pause button on the carousel and on every Glossário scene.

## 3. Decisions

| # | Question | Decision | Whose |
|---|---|---|---|
| 1 | Why do this? | Humanitarian: real use by people with disabilities, not a compliance score. | User |
| 2 | May accessibility change the visual design? | **No.** A sighted mouse user at the browser's default settings sees the site exactly as today: layout, colours, text, icons and the printed output. A fix that needs a visible change is not made; it goes to §8. Markup, ARIA, visually hidden text, behaviour and programmatic focus that draws no ring are all allowed. | User (2026-11-03, reversing an earlier "pode mudar o visual") |
| 2b | Does UI that shows only to keyboard or zoom users count as a visual change? | **Keyboard: allowed. Zoom and font size: not allowed.** These stay, marked **[keyboard]** in §6: the skip bar on the first Tab, focus rings shown where `overflow` clips them, the reticle and hint while drawing by keyboard, the hover label on a feature selected by keyboard. These go to §8: anything that changes the layout or the text size under zoom or a larger browser font, such as reflow at 400 %, `px` → `rem`, or the header menu scrolling at 200 %. | User |
| 3 | Point and polygon analysis without a mouse? | **Solve it if possible, otherwise record it.** | User |
| 4 | Which standard? | **WCAG 2.2 AA plus eMAG 3.1** as the yardstick for what to fix. Items decision 2 leaves unfixed are named in §8, so the site does not claim conformance it lacks. | Claude's call |
| 5 | Site-level package? | **What fits decision 2:** the skip bar (keyboard only, decision 2b), `/acessibilidade` as a new page, and the lint and axe guard. Out of scope: VLibras (a floating button) and the accessibility symbol and link in the footer, both visible changes to existing pages. | Claude's call |
| 6 | How does the keyboard get point and polygon analysis? | **Keyboard drawing at the map centre** (keyboard only, decision 2b). "Marcar ponto" and "Delimitar recorte" already exist. When either is armed by keyboard, focus moves to the map: arrows pan (MapLibre already does this), and Enter places the point or a vertex at the centre, marked by a reticle that shows only in this mode. The typed-coordinate form from `d5ddb8e` (removed in `61ee348`) would add visible controls, so it does not come back. | Claude's call |
| 7 | Where do barrier reports go? | **Nowhere for now: no contact channel.** `/acessibilidade` has no "how to report" section until a monitored address exists. Do not borrow SAP's `oca@lsd.ufcg.edu.br`, and do not invent one. The footer's empty "CONTATO" stays as it is. | User |
| 8 | High-contrast toggle, font-size buttons, an "accessibility toolbar" overlay? | **No.** They are visible, and the operating system's own settings already cover them. | Claude's call |
| 9 | Delivery | **A Portuguese umbrella issue, one task issue per workstream, and English PRs per workstream**, in the order of §7. | Claude's call |
| 10 | How much report work, given that `/relatorio` has had no entry point in the interface since #145 (only saved links and the login redirect reach it)? | **Fix what people can reach:** the stock report in the results column, the JPEG sheet and the CSV. `/relatorio` gets only what it inherits from shared components. Its own items wait until it has an entry point again. | Claude's call |
| 11 | Convert font sizes from `px` to `rem`? | **No.** The conversion changes text size for people who enlarge the browser font, which decision 2b rules out. It is listed in §8. | User, through 2b |
| 12 | Where does the `/acessibilidade` copy live? | **Prose in Contentful, lists in code.** Prod deploys from tags while Contentful publishes at once, so a list kept in Contentful would promise fixes prod does not have yet. | Claude's call |
| 13 | Who runs a real screen-reader pass? | **Not a merge gate.** On each PR, Claude runs axe, inspects the accessibility tree (names, roles, states, live regions, through Chrome DevTools Protocol) and walks the Tab order. A pass with NVDA or Orca by a person is recommended once per workstream, on beta, and does not block the stack. | Claude's call |
| 14 | Card links (Caminhos, Comunicação, Publicações) are named only by their title, while the card also shows a badge and a description. axe 4.14 flags this as `label-content-name-mismatch` (2.5.3). Change it? | **No, keep it.** The title is the card's visible label, so the name contains it and 2.5.3 holds. The description already reaches screen readers through `aria-describedby`, and a name that started with the badge would read worse. The axe check lists these cards in `scripts/a11y/known.ts` as accepted by this decision; they are not a limitation in §8. | User (2026-11-03) |

## 4. Goals, non-goals, anti-goals

**Goals**

- Every success scenario in §2 works, within decision 2.
- No serious or critical axe violation on any page, public or logged in, except those §8 names and those decision 14 accepts.
- Every finding in §6 is either fixed or listed in §8.
- A guard in lint and CI keeps the fixes from regressing.

**Non-goals**

- Any change a sighted mouse user can see (decision 2).
- Making the raster maps equivalent for a blind person.
- Designing a phone layout.
- English. PR #76 and the Contentful `en-US` work are separate; this plan only makes sure that `lang` follows the locale.
- Fixing the content editors' work in Contentful.

**Anti-goals** (a failure even if it technically works)

- **A screenshot that differs.** At the default settings, before and after must match pixel for pixel, apart from what only keyboard use brings up (decision 2b).
- **An overlay widget** that claims to make the site accessible.
- **Chatty live regions:** announcing every slider tick, tile or map move. Announce outcomes, once.
- **Worse for mouse users:** rings flashing on click, or focus jumping away while the pointer works.
- **Promising on `/acessibilidade`** something the site does not do.

## 5. Constraints

- **Five sibling root layouts**, and no shared `app/layout.tsx`, which must not be added. Anything site-wide (the skip bar, the announcer) is mounted in each layout that needs it.
- **Visually hidden text** uses the existing `sr-only` utility (14 uses today). It must stay out of the printed output too, so print and screen look as they do now.
- **Retagging must keep the look.** When a `<p>` becomes an `<h2>`, or a button moves inside a heading, the CSS must reproduce today's rendering exactly. The global heading styles in `globals.css` must not leak onto it. Before/after screenshots at 1440 px verify this.
- **Copy lives in Contentful.** The `/acessibilidade` prose is a new `defineCopy` type (code, provisioning, entry). Interface labels and visually hidden texts stay in code, in Portuguese.
- **Glossário scenes** live in `lib/cenas/fonte/`. Read `lib/cenas/REGRAS_CENAS.md` first, and write comments in that folder in Portuguese. Behaviour changes go through the scenes' control API.
- **CI runs only `npm ci`, `npm run build` and `npm run contrast`.** Adding lint to CI is part of workstream A, after checking that `npm run lint` is clean on `main`.
- **Concurrent work:** a session is adding a site locale (`lib/locale.ts`, uncommitted on 2026-11-03). Coordinate `lang` handling with it.

## 6. Findings by workstream

Paths and lines are as of the audit and may have shifted by a few lines. Each finding ends in one of three outcomes:

- **Fix:** no visual change.
- **Fix [keyboard]:** visible only while someone uses the keyboard; allowed by decision 2b.
- **§8:** needs a visible change, so it is recorded instead of fixed.

### A. Foundations and guard

1. **The announcer.**
   - **Problem:** status regions are mounted together with their text, and many screen readers skip a live region that is already full when it appears:
     - `ThemeStep.tsx:68,72`
     - `TerritoriosApp.tsx:448,451`
     - `StoryMap.tsx:549`
     - `TerritoryChooser.tsx:453`
     - `StatsCards.tsx:30`
   - **Fix:**
     - one polite and one assertive visually hidden region per root layout, always mounted;
     - an `announce(text, politeness)` helper.
   - The visible notices stay exactly as they are; the announcer only speaks them.
2. **Focus that survives an unmount.** When the focused control unmounts or becomes `disabled`, focus falls to `<body>`.
   - **Fix:** a helper that moves focus to a stable target. That can be a control, which shows the ring a keyboard user already sees today, or a heading with `tabIndex={-1}`, which shows no ring.
   - Where a control must stay focused while it works, use `aria-disabled` plus `aria-busy`, and style `[aria-disabled]` exactly as `:disabled` is styled today.
3. **A visually hidden data table for charts.**
   - One component renders a chart's values as a `<table>` with `<caption>` and `<th scope>` inside `sr-only`.
   - There is no visible "Ver dados em tabela" button, and the table does not print.
   - Used by D and E.
4. **Lint.**
   - Turn on the `eslint-plugin-jsx-a11y` recommended set as errors. The plugin is already installed through `eslint-config-next`.
   - Configure `no-redundant-roles` to allow `ul`/`ol` with `role="list"`.
   - Turn off `no-access-key` for eMAG.
   - Settle the three remaining hits.
   - Add `npm run lint` to CI.
5. **An axe check.** It runs against a production build of the public routes and fails on serious or critical violations, except those §8 names. `axe-core` is already in `node_modules`.
6. **A visual guard.** A before/after screenshot comparison of the touched pages at 1440 px, at default settings, in every PR (decision 2). The mechanism is the builder's call; the axe harness can take the screenshots.

### B. Site-level package

1. **Skip bar [keyboard].**
   - **Content:** the eMAG shortcuts, hidden until focused, as in SAP's `SkipLinks`:
     - "Ir para o conteúdo [1]";
     - "Ir para o menu [2]";
     - "Ir para a busca [3]", on `/mapa` and `/territorios`;
     - "Ir para o rodapé [4]";
     - a link to `/acessibilidade`.
   - **Per layout:**
     - marketing and territorios: all;
     - auth: content;
     - mapa: content (the panel), menu and search;
     - relatorio: content.
   - A mouse user never sees it.
2. **`/acessibilidade`** in `(marketing)`, a new page built from the site's existing components and styles, with no new visual pattern:
   - commitment (WCAG 2.2 AA plus eMAG 3.1 as the target);
   - the shortcut table, generated from the skip-bar module;
   - available resources;
   - known limitations (§8), including those decision 2 creates.
   - The prose comes from Contentful; the lists and the table come from code (decision 12).
   - There is no reporting section (decision 7).
   - Existing pages do not link to it visibly: no footer link and no symbol. It is reached from the skip bar, from the site map and from search engines.
3. **§8:** VLibras (a floating button on every page), and the accessibility symbol and link in the footer.
4. **§8 (candidate for an exception):** Portuguese 404 and error pages. Next's English default shows wherever `notFound()` fires. Translating it changes visible text, so it waits for the user's word. Setting `lang="en"` on the default page is invisible and is done.

### C. Access flow (`app/(auth)`, `components/auth`)

**Fixes:**

- **Success is not announced and focus is lost** after a submit replaces the card:
  - `SignupForm.tsx:49-55`
  - `ForgotPasswordForm.tsx:41-47`
  - `SignupConfirmation.tsx:88-111`
  - `ResetPasswordForm.tsx:67-83`
  - Fix: focus the new card's heading (`tabIndex={-1}`, no ring), which reads the outcome.
- **Approvals.** `ApprovalsTable.tsx:94-95` swaps the buttons for "Aprovado".
  - Announce the decision and keep focus in the row.
  - Name the person in each button's accessible name, keeping the visible "Aprovar" and "Recusar" (`:99-104`).
- **Errors are not tied to their fields.** Today each form shows one `role="alert"` paragraph (`LoginForm.tsx:62`, `SignupForm.tsx:77`, …).
  - Link that same paragraph to the field with `aria-describedby`, add `aria-invalid`, and focus the field.
  - While submitting, keep the focused button focusable (`aria-disabled`, A.2), with the same look.
- **The password rule.** Give the field a visually hidden description with the rule ("pelo menos 8 caracteres"), so screen readers hear it up front. The visible text stays as it is (`PasswordFields.tsx:9,36-43`).
- **The e-mail hint**, now only a placeholder (`SignupForm.tsx:62`), becomes a visually hidden description too.
- **Help text inside the `<label>`** (`SignupForm.tsx:75`) moves out of the label and is linked by `aria-describedby`, with CSS that keeps today's rendering.
- **`<div aria-label="Caativar">`** on a generic element (`AuthCard.tsx:53`) gets `role="img"`, or loses the label.

**§8:**

- Field borders at 1.60:1 (`AuthCard.tsx:15,22`).
- The password rule visible to sighted users only after an error.

### D. Territórios (`components/territorios`)

No blockers; the task completes for keyboard and screen-reader users today.

**Fixes:**

- **Silent answers, summary cards and errors.** Use the A.1 announcer for:
  - `ThemeStep.tsx:67-103`
  - `StorySummary.tsx:118`
  - the notices listed in A.1
- **The map canvas is named "Mapa" on all six steps** (`storyScript.ts:60`). Name it per step (theme, territory, year) and add a visually hidden sentence that points to the legend.
- **Year values** exist only in `title` tooltips on `aria-hidden` spans (fire `YearBars.tsx:339`, rain `YearStrip.tsx:425`, 79 values). Add the A.3 hidden table, which also gives each rain year's class in words.
- **Focus sits on `<body>` while a territory loads** (`TerritoriosApp.tsx:183-188`). Focus the band heading at once, and "Tentar novamente" if the load fails.
- **"Não achou? Escolha no mapa"** (`TerritorySearch.tsx:203`, `TerritoryChooser.tsx:337`): add a visually hidden note that the search covers every territory.
- **Heading levels:** fix `ConfirmCard.tsx:260` (an `h2` under an `h3`), and make "Sobre os dados" (`StorySummary.tsx:150`) a heading. Both keep today's styles.
- **`document.title`** per screen.
- **`PanelNav` names:** "Voltar para Estoque", "Avançar para Território". The visible text is part of the name (2.5.3) (`PanelNav.tsx:174-187`).
- **The search's truncation:** add visually hidden "mostrando 40 de N" (`TerritorySearch.tsx:145,187`).
- **The nested region** (`TerritoryChooser.tsx:437`): drop the outer role.

**Fix [keyboard]:**

- **The story map's focus ring is clipped** by MapLibre's `overflow: hidden` (`territorios.css:50-53`). Use the inset ring `territorios-escolha.css:255` already uses.

**§8:**

- Colour-only information:
  - the rain strip: seco vs chuvoso 1.62:1, normal vs seco 1.94:1;
  - flux removal vs emission, at the same lightness;
  - the summary badges, green or red.
  - Screen-reader users get the words through the hidden tables and captions; sighted colour-blind users do not.
- The tab bar gives no sign of more tabs on narrow screens.
- The "Baixar" label opens the print dialog.
- The printout lacks the year values.

### E. Platform and report (`components/mapa`, `app/(mapa)`, `app/(relatorio)`)

Under decision 10, items that touch only `/relatorio` (`ReportDocument`, the layout of `ReportSection`, `ReportMapPreview`) wait until the page has an entry point again.

**Blocker:**

- **Point and polygon analysis need a pointer.** Map clicks are at `MapView.tsx:1165-1180`, drawing goes through mapbox-gl-draw, and the hint says "Clique no mapa…" (`overlays/DrawHint.tsx:8-11`).
- **Fix [keyboard]: keyboard drawing at the map centre** (decision 6). When "Marcar ponto" or "Delimitar recorte" is activated by keyboard (detected by `:focus-visible`/`detail === 0`):
  - focus moves to the map canvas, and arrows pan as they do today;
  - a reticle at the centre shows only in this mode;
  - Enter places the point, or a vertex;
  - Enter on the first vertex, or a second Enter with no move, closes the polygon;
  - Backspace removes the last vertex, and Esc cancels, as it does today;
  - each step is announced ("Vértice 3 adicionado", "Área desenhada").
- The geometry enters through the same `handleDrawCommit` as a drawn shape.
- The DrawHint text stays as is for mouse users. In keyboard mode it is replaced by a keyboard version.

**Fixes:**

- **Chart values exist only in pointer tooltips.** This affects:
  - `StatsChart.tsx:370-427`
  - `results/PointSeries.tsx:166-190`
  - `results/EmissionsCharts.tsx:46-69`
  - `StockReportView.tsx`
  - the year strips at `PointSeries.tsx:62-73`
  - **Fix:**
    - the A.3 hidden table;
    - `accessibilityLayer={false}` (Recharts 3 otherwise makes each chart an unnamed `role="application"`);
    - `role="img"` with a one-line summary.
- **Focus lost on unmount and disable (A.2):**
  - **Layer switch** (`Sidebar.tsx:242-255`): keep the `<button role="switch">` while loading, with `aria-busy`, rendering the same "…" it shows today.
  - **Closing the ficha** (`LayerInfoCard.tsx:92`, `Mapa.tsx:153`): focus returns to the "i" button.
  - **The results X** (`ResultsSidebar.tsx:319`; the panel unmounts at `:293`): focus moves to a stable target.
  - **Card remove buttons:**
    - `ActiveLayers.tsx:150`
    - `Territory.tsx:171`
    - `Territory.tsx:242`
  - **"Limpar" buttons turning disabled:** `ActiveLayers.tsx:49` and `Territory.tsx:129`.
  - **ArrowDown on a grip** (`useCardDrag.ts:55-59`): verify in a browser.
- **Results are never announced.**
  - A search pick (`TerritorySearch.tsx:103-108`), turning a layer on, or a year change fills the results column silently. Announce once per outcome, including "sem dados", which also addresses issue #35.
  - The search count sits in an `li role="presentation"` (`TerritorySearch.tsx:190-194`) and is never spoken. Send it to the announcer.
- **Reordering:** make the grip do something on Enter or Space, or give it a role other than button, and announce the new position (`ActiveLayers.tsx:108-119`, `Territory.tsx:218-229`).
- **The ficha:** on open, focus its heading; Escape closes it; closing returns focus to the "i" button.
- **Structure:**
  - **`<main>` and a hidden `h1`:** `/mapa` gets a `<main>` and a visually hidden `h1`.
  - **The panel** (`Sidebar.tsx:84`) becomes a named landmark.
  - **Headings:**
    - theme and subtheme names become headings with today's styles (`Sidebar.tsx:206`);
    - "Camadas ativas" gets the right level;
    - result-card titles move inside headings, with the button's look kept (`LayerResultCard.tsx:93-101`).
  - **The map's name:** `Map.Title` in MapLibre's locale becomes "Mapa" (`MapView.tsx:655-667`).
- **The basemap menu** (`MapControls.tsx:111-138`): complete the `menu` keyboard pattern (arrows, Escape, focus entry, focus return) or downgrade it to a radio group. Either way it looks the same.
- **Exclusive subthemes** (`Sidebar.tsx:245-254`): use radio semantics or a static name, and announce which layer was replaced.
- **Errors:** add `role="alert"` to layer-row errors (`Sidebar.tsx:276`). Announce a "Minha localização" failure (`MapControls.tsx:70`).
- **Hidden reasons and names:**
  - **Print button:** give it a hidden description of why it is disabled (today only in `title`).
  - **"Ocultar resultados"** (`Mapa.tsx:63-65`): the accessible name says what the button does.
  - **The licence link** (`LayerInfoCard.tsx:62`): add a hidden "(abre em nova aba)".

**Fix [keyboard]:**

- **The map's focus ring:** an inset ring on `.maplibregl-canvas:focus-visible`, shared with D.
- **The hover label** (`MapView.tsx:1127-1143`): also show it when a feature is selected by keyboard.

**§8:**

- **No reflow at 400 %** (decision 2b):
  - the control stack (364 px, `MapControls.module.css:4-11`) clips fullscreen, north and basemap;
  - the legend is 302 px wide in a slot of about 264 px;
  - the results drawer hides the legend and the slider.
- **Reordering needs dragging.** There is no single-pointer alternative (2.5.7); it would need visible buttons.
- Contrast:

  | Element | Location | Ratio |
  |---|---|---|
  | Switch track, off | `mapa.css:57` | 1.38:1 |
  | Opacity slider track | `OpacityControl.module.css:26,32` | 2.53:1 |
  | Time slider track | `TemporalSlider.module.css:73-83` | about 1.1:1 |
  | Drawing colours | `MapView.tsx:16-29` | 1.85:1 / 2.48:1 |
  | 11–11.5 px chart text | `StatsChart.tsx:164,215,259,273,287` | 3.62:1 / 3.14:1 |

- The search clear button is 22×22 and overlaps its input (`Sidebar.module.css:37-47`).
- Truncated layer names have no visible full text on keyboard focus. Screen readers get the full text, since the truncation is CSS.
- The results hint does not mention the search.

### F. Institutional pages, Glossário and shell

**Fixes:**

- **Hero carousel** (`Hero.tsx:100,124-133`):
  - pause while the pointer is over the hero;
  - stop auto-rotation for the rest of the visit once the user uses an arrow or a dot;
  - keep the holds that exist (focus inside, reduced motion).
- **Hero dots** (`Hero.module.css:228-236`): enlarge the hit area to 24 px with a transparent pseudo-element, so the dots look the same.
- **Glossário** (`CenaAnimada.tsx:183-185`, `lib/cenas/fonte/*`):
  - in `fluxos.js`, "Pausar" must stop the step tour too;
  - in every auto-stepping scene (`estoques.js`, `cue.js`, `degradacao.js`, `agroecologia.js`, and any newer scene that steps on its own), picking a step stops the automatic tour, and hovering the scene pauses it;
  - the builder inventories the scenes on current `main`.
- **Canvas text has no text equivalent** (`lib/glossario/termos.ts:44-125`, `CenaAnimada.tsx:213-216`): expose the current step's text in a visually hidden region from the start, without waiting for interaction.
- **Home headings:**
  - a visually hidden `h1` names the page, and the slide titles become `h2` with today's styles (`Hero.tsx:188`);
  - "Destaques" (`Destaques.tsx:15`) and "Conheça a plataforma" (`Plataforma.tsx:73`) become headings with today's styles.
- **The header menu's Escape** must return focus to the toggle (`SiteHeader.tsx:131-138`).
- **Focus under the sticky header** (2.4.11): set `:focus-visible { scroll-margin-top }` to the header's height (76 px plus the 19 px logo overhang), so that only keyboard focus scrolls differently. Avoid `html { scroll-padding-top }`: it would also move where in-page anchors land when clicked with the mouse.
- **`html { scroll-behavior: smooth }`** gets a reduced-motion guard (`globals.css:120`).
- **"Baixar PDF" new-tab warning:** add a hidden "(abre em nova aba)" (`ConteudoHeader.tsx:30`, `PdfViewer.tsx:317`).
- **The home card category** (`Comunicacao.tsx:118`): remove `aria-hidden`.
- **"Época do ano":** silence `aria-valuetext` while the slider plays.

**Fix [keyboard]:**

- **Clipped focus rings:**
  - Comunicação cards (`Comunicacao.module.css:50-56`);
  - the Plataforma tab strip (`Plataforma.module.css:55-60`), with the inset fix `TabStrip.module.css:72` already uses.

**§8:**

- **The collapsed header menu is cut off at 200 % zoom** (`SiteHeader.module.css:239-254`). The panel sits `position: absolute` in the sticky header, and scroll is locked (decision 2b).
- **Font sizes are in `px` across the site**, so the browser's font-size setting has no effect (eMAG 4.3, decision 2b). The count:
  - 44 declarations in `globals.css`, `components/marketing` and `components/glossario`;
  - about 57 in `components/mapa`;
  - 62 in `territorios*.css`;
  - 19 in `components/relatorio`;
  - 11 in `components/auth`.
- **No visible pause button** on the carousel or on any moving scene. 2.2.2 is met only through hover, interaction and reduced motion.
- The selected Glossário step shown at 1.21:1 (`BotaoEtapa.module.css:31-34`); screen readers get `aria-pressed`.
- The four Sobre pages share the visible `h1` "Sobre a Caativar".
- The footer's empty "CONTATO" heading (decision 7).

## 7. Delivery

The umbrella issue is in Portuguese, with one task issue per PR. PRs are in English and stacked when they depend on an unmerged one. The order puts the biggest barriers first, after the pieces they share:

1. **A. Foundations and guard:** announcer, focus helper, hidden data table, lint in CI, the axe check, the screenshot guard.
2. **B. Site-level package:** skip bar and `accesskey` targets, `/acessibilidade`.
3. **C. Access flow.**
4. **E1. Keyboard drawing.**
5. **E2. Platform**, the "Fixes" and "Fix [keyboard]" lists.
6. **D. Territórios.**
7. **F. Institutional pages, Glossário and shell.**

Each PR does the following:

- shows the before/after screenshot comparison at 1440 px with no differences (decision 2);
- moves what it fixes from limitations to resources on `/acessibilidade` once that page exists;
- follows SAP #472's PR shape: a use-case table of who gains and what changed.

## 8. Known limitations to publish on `/acessibilidade`

**Kept by decision 2 (the look stays as it is):**

- No Libras translation (VLibras would add a floating button).
- No visible pause button on the home carousel or on the Glossário scenes. Rotation pauses under the pointer, stops after the first interaction, and is off under reduced motion.
- Information carried by colour alone:
  - the rain classes;
  - removal vs emission on the flux map;
  - the good/bad badges in Territórios.
  - Screen readers get it in words.
- Contrast below 3:1 on some non-text elements:
  - auth field borders;
  - the off state of the platform's switches;
  - slider tracks;
  - drawing colours;
  - the selected Glossário step.
- Contrast below 4.5:1 on small text: chart labels in the platform.
- Reordering active layers needs dragging or the keyboard; there is no single-click alternative.
- The password rule shows only after an error (screen readers hear it up front).
- The search clear button on the platform is under 24 px.
- Error pages in English.
- **Zoom and text size (decision 2b):**
  - the layouts do not reflow at 400 % (320 CSS px): the platform's controls, legend and results drawer, and the Territórios tab bar;
  - text does not follow the browser's font-size setting, since sizes are in `px` (eMAG 4.3);
  - the collapsed header menu is cut off at 200 % zoom on a 1366×768 screen.
- **Blind users and custom areas:** a blind person cannot analyse a custom point or polygon. Keyboard drawing needs sight; typed coordinates would add visible controls. Predefined areas (municipalities, protected areas, territories) are reachable through the search.

**Kept for other reasons:**

- The spatial pattern of the raster maps needs the image. Values, series and reports are available as text.
- The alt text of images and the structure of PDFs published through Contentful depend on the editors.
- `/relatorio` has no entry point; its own items wait (decision 10).
- There is no channel to report a barrier yet (decision 7).

## 9. Verification

Each PR runs these:

- `npm run lint`, `npm test`, `npm run build` and `npm run contrast`;
- the axe check on the touched pages, before and after;
- **the screenshot comparison** at 1440 px, default settings, with no differences;
- a Tab walk of the touched flow, with the order recorded in the PR;
- an accessibility-tree check of the touched flow: names, roles, states, and what the live regions receive (decision 13);
- `prefers-reduced-motion` emulated where motion changed.

A real screen-reader pass once per workstream (NVDA on Windows, or Orca with Firefox on Linux) is recommended and does not block merges. Testing with people with disabilities is the step after this plan.

## 10. Left to the builder

- Component and helper names, APIs and file placement.
- The axe-check and screenshot-guard mechanisms, and whether logged-in routes join CI.
- The keys and announcements of keyboard drawing beyond what E specifies, and how the reticle looks.
- The order of work inside each workstream.
