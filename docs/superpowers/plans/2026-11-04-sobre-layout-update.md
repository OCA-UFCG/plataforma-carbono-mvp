# Sobre Layout Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/sobre/caatinga` and `/sobre/carbono-e-comunidades` to the updated Figma Sobre frames: a new figure card ("Cards sobre"), the climate and efficiency sections as text-beside-card rows, and the law figures, the two sections and the closing paragraph of "Entenda essa relação" back on the page.

**Architecture:** One new presentational component, `FigureCard` (with a `FigureList` row), replaces the `outlined` `IndicatorCard` on the Sobre pages. It takes the figure as editors type it in Contentful ("410 Mt CO₂eq") and splits number from unit with a pure helper, so no existing field changes shape. The restored sections reuse the fields still in the Contentful type (orphaned by commit 438ec35), and two new optional fields carry each progress bar's fill.

**Tech Stack:** Next.js 16 App Router (server components), CSS Modules, Contentful (copy types via `defineCopy`), next-intl, Vitest (node environment, `renderToStaticMarkup`).

**Spec:** Figma file `3mgmAeGIkxyrIql32UhptS` ("Caativar (Copy)", linked 2026-11-04), section Sobre `18988:10597`: frames `18988:8611` (Conheça a plataforma), `18988:8667` (Conheça a Caatinga), `18988:8769` (Entenda essa relação), `18988:8943` (Como funciona). Decisions below were made with the user on 2026-11-04.

## What changed, and what this plan does about it

Compared at 1436 px against the site served from the main checkout on 2026-11-04:

| Page | Figma now | Site today | This plan |
|---|---|---|---|
| Conheça a Caatinga | Climate and efficiency: text column (626) beside a figure card (626), vertically centred | Text, card at half width, text, stacked | Task 4 |
| Conheça a Caatinga | Figure card "Cards sobre" (`19406:47719`): cream, uppercase label, 64 px number + 20 px unit, description, progress bar with arrowhead on the two upper cards | `IndicatorCard` `outlined`: green header with map icon, 30 px figure | Tasks 1, 4 |
| Entenda essa relação | "mín. 50%" / "mín. 70%" figure cards (`19408:47967`) between the law text and its closing | Absent (removed 2026-10-06, 438ec35) | Tasks 2, 3, 5 |
| Entenda essa relação | "Quem decide sobre os projetos?", "Como os benefícios devem ser repartidos?", closing paragraph after the red card | Absent (same commit) | Tasks 2, 3, 5 |
| Conheça a plataforma, Como funciona | Same layout as the site | — | Nothing |

## Decisions (2026-11-04)

- **The removed blocks come back.** The user chose to follow the frame over the content team's 2026-10-06 request: the law figures, "Quem decide", "Como os benefícios" and the closing paragraph. Their Portuguese is still in the Contentful entry; the English is written here (Task 3) and is pending review like the rest of the locale work.
- **The bar shows the card's own percentage.** Figma draws both fills at the same ~39 %; the bar instead fills to a new optional field per card (38 for removal, 58 for efficiency in the entry). An empty field draws no bar.
- **The "ⓘ" markers stay out.** Figma still writes them into the law and benefits text with no glossary behind them (issue #44, question 3); the test "carries no glossary marker yet" keeps guarding that.
- **Copy is Contentful's.** Where the frames' words differ from the site (the intro's "INSTITUCIONAL" / "Sobre o Caativar", the vegetation quote, the longer closing paragraph, the Caatinga paragraphs), the entry wins and nothing here changes it.
- **Noted, not fixed** (only what the update asks changes): the tab strip's 1 px top border that Figma draws and the site doesn't (it predates this update and the strip is shared); the Figma footer, which is older than the site's; the Caatinga code defaults that lag the entry (`'60%'` vs `"Até 58%"`, `'410 Mt'` vs `"410 Mt CO₂eq"`).

## Before you start

- The Sobre pages and their `lib/content/sobre/*.ts` carry the **uncommitted** English-locale work on `feat/contentful-english-locale` (main checkout). Build on top of it: once that work is committed, create the worktree from its tip — branch `feat/sobre-layout-update`, worktree `.claude/worktrees/sobre-layout-update`. The PR targets `feat/contentful-english-locale` and is retargeted to `main` before merging (stacked PRs do not retarget on their own).
- In the worktree: `npm ci`, copy `.env.local` from the main checkout, run the dev server with `npx next dev --webpack -p <free port>` (a nested worktree needs webpack; check `ss -ltnp` for a free port; never stop the user's server on :3000). Delete `.env.local`, `node_modules` and `.next` when the branch is merged.
- Run `git branch --show-current` before every test run and commit: other sessions share this repo.

## Global Constraints

- Comments and docs in English; UI strings and copy in Portuguese; field display names in Contentful stay Portuguese, as their siblings.
- A Contentful field the code queries must exist in the space **before** the code that queries it is deployed: a missing field makes the whole page query fail, and every section silently falls back to code.
- `mcp__contentful__update_content_type` replaces the whole field list: always send every field, the orphans included, unchanged.
- Desktop first: the frames are 1436 px. Below 640 px rows and pairs stack; no other phone work.
- Accent and text colors come from the tokens in `app/globals.css`; the one raw value allowed is the bar track's `#d9d9d9` (Figma has no token for it).
- Commits carry no co-author or Claude attribution lines.

## Review Focus

- **An editor types a figure in a new shape** ("410 Mt CO2eq" with an ASCII 2, "≈ 400 Mt") → the number stays at display size and the unit beside it, never a digit stranded in the unit. Pinned in Task 1's `splitFigure` table.
- **An editor types the bar field loosely** ("58%", "58,5", "cinquenta", "150") → valid shares draw, anything else draws no bar rather than a wrong one. Pinned in Task 1's `barFill` table.
- **The English page** → the restored sections read in English, and the bars still draw (the en-US bar fields are empty and fall back to pt-BR). Checked in Task 6, step 3.
- **Contentful unreachable** → the code defaults render, and the out-of-date `'125tC/ha'` / `'1,5–5tCO₂/ha/ano'` still split into number and unit. Pinned in Task 1's table and Task 2's defaults test.
- **A narrow window** → rows and pairs stack, a long 64 px figure wraps inside its card, no horizontal scroll. Checked in Task 6, step 4.

---

### Task 1: FigureCard and its figure helpers

**Files:**
- Create: `lib/marketing/figure.ts`
- Create: `components/marketing/sobre/FigureCard.tsx`, `components/marketing/sobre/FigureCard.module.css`
- Create: `public/icons/sobre/barra-seta.svg` (Figma asset `Polygon 15`, see Step 5)
- Modify: `tests/lib/marketingPalette.test.ts` (pairs)
- Test: `tests/lib/marketingFigure.test.ts`, `tests/components/figureCard.test.ts`

**Interfaces:**
- Produces:
  - `splitFigure(valor: string): { value: string; unit?: string }` — `lib/marketing/figure.ts`
  - `barFill(raw: string): number | undefined` — same file; a share in 0–100
  - `FigureCard(props: FigureCardProps)` default export, with `FigureCardProps = { label: string; value: string; description?: string; bar?: number }` — `value` is the figure as typed; `bar` is a 0–100 share, absent = no bar
  - `FigureList({ children, className }: { children: React.ReactNode; className?: string })` named export — a `<ul role="list">` laying each child in its own `<li role="listitem">`, in a row 16 px apart

- [ ] **Step 1: Write the failing helper tests** in `tests/lib/marketingFigure.test.ts`

```ts
describe('splitFigure', () => {
  it.each([
    ['410 Mt CO₂eq', { value: '410', unit: 'Mt CO₂eq' }],
    ['Até 58%', { value: 'Até 58%' }],
    ['Up to 58%', { value: 'Up to 58%' }],
    ['125 tC/ha', { value: '125', unit: 'tC/ha' }],
    ['125tC/ha', { value: '125', unit: 'tC/ha' }],
    ['1,5 a 5 tCO₂/ha/ano', { value: '1,5 a 5', unit: 'tCO₂/ha/ano' }],
    ['1.5 to 5 tCO₂/ha/year', { value: '1.5 to 5', unit: 'tCO₂/ha/year' }],
    ['1,5–5tCO₂/ha/ano', { value: '1,5–5', unit: 'tCO₂/ha/ano' }],
    ['mín. 50%', { value: 'mín. 50%' }],
    ['410 Mt CO2eq', { value: '410', unit: 'Mt CO2eq' }],
    ['100 km²', { value: '100', unit: 'km²' }],
    ['—', { value: '—' }],
  ])('splits %j', (input, expected) => expect(splitFigure(input)).toEqual(expected))
})

describe('barFill', () => {
  it.each([
    ['38', 38], ['58%', 58], [' 58,5 ', 58.5], ['0', 0], ['100', 100],
    ['', undefined], ['cinquenta', undefined], ['150', undefined], ['-5', undefined],
  ])('reads %j', (input, expected) => expect(barFill(input)).toBe(expected))
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/lib/marketingFigure.test.ts`
Expected: FAIL, cannot resolve `@/lib/marketing/figure`.

- [ ] **Step 3: Implement both helpers in `lib/marketing/figure.ts`**

`splitFigure`: the figure runs to the end of its last number that starts a word (at the start, after whitespace or after a dash); what follows, trimmed, is the unit. Subscripts typed as Unicode (`₂`, `²`) are not digits, so they stay in the unit. Checked against every value above:

```ts
const FIGURE = /^(.*(?:^|[\s–-])\d[\d.,]*%?)\s*(.*)$/s
// no match → { value: valor.trim() }; empty remainder → no `unit` key
```

`barFill`: accept `/^\s*(\d{1,3}(?:[.,]\d+)?)\s*%?\s*$/`, read the comma as a decimal point, return the number when it is within 0–100, else `undefined`.

- [ ] **Step 4: Run the helper tests to see them pass**

Run: `npx vitest run tests/lib/marketingFigure.test.ts`
Expected: PASS (21 cases).

- [ ] **Step 5: Save the arrowhead asset**

Download Figma's `Polygon 15` (in `get_design_context` of node `18988:8707`, file `3mgmAeGIkxyrIql32UhptS`) to `public/icons/sobre/barra-seta.svg`, byte for byte. Expected content: one `<path>` filled `#587C22`, root `width="16.9963" height="15.25"`, a rounded triangle pointing up. Do not edit it; the card rotates it.

- [ ] **Step 6: Write the failing component tests** in `tests/components/figureCard.test.ts` (`renderToStaticMarkup` + `createElement`, as `tests/components/sobreSection.test.ts`)

- `sets the unit apart from the number`: `{ label: 'Remoção de GEE', value: '410 Mt CO₂eq', description: 'removidos em 2022' }` → output matches `/>410<\/span><span[^>]*>Mt CO₂eq<\/span>/`.
- `reads the figure as typed, with its description`: same props → contains `<span class="sr-only">410 Mt CO₂eq removidos em 2022</span>`.
- `draws no unit, description or bar it was not given`: `{ label: 'Créditos de remoção', value: 'mín. 50%' }` → exactly 2 `<span` (number + sr-only), exactly 2 `<p` (label + figure line), no `barra-seta.svg`.
- `fills the bar to the given share`: `{ label: 'Eficiência de carbono', value: 'Até 58%', bar: 58 }` → contains `--fill:0.58` and `/icons/sobre/barra-seta.svg`.
- `lists each card in its own item`: `FigureList` with two cards → 2 `<li role="listitem"`, inside `<ul … role="list">`.

- [ ] **Step 7: Run them to see them fail**

Run: `npx vitest run tests/components/figureCard.test.ts`
Expected: FAIL, cannot resolve `@/components/marketing/sobre/FigureCard`.

- [ ] **Step 8: Implement `FigureCard` and `FigureList`**

Markup, top to bottom: label `<p class="… text-p-ui">`; a figure line `<p aria-hidden="true">` with the number `<span>` and, when `splitFigure` returns one, the unit `<span class="… text-h4">`; the description `<p class="… text-body" aria-hidden="true">` when given; `<span class="sr-only">` with `[value, description]` joined by a space; the bar when `bar !== undefined`, `aria-hidden="true"` (the share is already in the words), its fill carrying `style={{ "--fill": bar / 100 }}`, followed by the arrowhead `<img src="/icons/sobre/barra-seta.svg" alt="">` (plain `<img>` with the eslint comment, as `IndicatorCard.tsx`).

Metrics, from `19406:47719` / `19407:47762` / `19408:47968`:

| Part | Value |
|---|---|
| Card | `--bg-superficie-variante`, `border-radius: var(--radius)`, padding 24, column, gap 16, `height: 100%`; no border, no shadow (Figma's inner shadow is clipped by the card) |
| Label | `.text-p-ui` (Rubik 500 16/24), `text-transform: uppercase`, `--bg-texto-primario` |
| Figure + description | column, gap 8 |
| Figure line | flex, `align-items: flex-end`, gap 8, `flex-wrap: wrap` |
| Number | Rubik 700, 64/64, letter-spacing −0.768px, `--role-categorica1-padrao`; may wrap (no `nowrap`) |
| Unit | `.text-h4`, `--role-marca-ancora-pressionado` |
| Description | `.text-body`, `--bg-texto-primario` |
| Bar track | height 11, radius 4, `#d9d9d9`, flex, `align-items: center` |
| Bar fill | height 11, radius 4, `--role-marca-ancora-padrao`, `width: calc((100% - 14px) * var(--fill))`, `flex: none` — the 14 px keeps the arrow's tip inside the track at 100 % |
| Arrowhead | 23 × 23 box, `margin-left: -9px`, `flex: none`, `rotate: 90deg`; the SVG at its own size, 2 px from the box top, centred across (Figma insets 8.7 % / 13.05 %) |
| `FigureList` | flex, gap 16, no list style/margin/padding; `> li { flex: 1; min-width: 0 }`; column at `max-width: 640px` |

- [ ] **Step 9: Add the contrast pairs** in `tests/lib/marketingPalette.test.ts`, under a comment naming `FigureCard`: `['--role-categorica1-padrao', '--bg-superficie-variante']` (number) and `['--role-marca-ancora-pressionado', '--bg-superficie-variante']` (unit). The label and description pair, `['--bg-texto-primario', '--bg-superficie-variante']`, is already there.

- [ ] **Step 10: Run the three test files**

Run: `npx vitest run tests/lib/marketingFigure.test.ts tests/components/figureCard.test.ts tests/lib/marketingPalette.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add lib/marketing/figure.ts components/marketing/sobre/FigureCard.tsx components/marketing/sobre/FigureCard.module.css public/icons/sobre/barra-seta.svg tests/lib/marketingFigure.test.ts tests/components/figureCard.test.ts tests/lib/marketingPalette.test.ts
git commit -m "feat: add the Sobre figure card, with its share bar"
```

---

### Task 2: Content definitions for the bars and the restored blocks

**Files:**
- Modify: `lib/content/sobre/caatinga.ts`, `lib/content/sobre/carbono-e-comunidades.ts`
- Test: `tests/lib/sobreContent.test.ts`

**Interfaces:**
- Consumes: `barFill` (Task 1).
- Produces (copy values, all `string` / `string[]` per their kind):
  - `CAATINGA`: `climaIndicadorBarra`, `eficienciaIndicadorBarra` (optional lines)
  - `CARBONO_E_COMUNIDADES`: `garantia1Valor`, `garantia1Rotulo`, `garantia2Valor`, `garantia2Rotulo`, `decisoesTitulo`, `decisoesTexto: string[]`, `beneficiosTitulo`, `beneficiosTexto: string[]`, `fechamento`

- [ ] **Step 1: Write the failing tests** in `tests/lib/sobreContent.test.ts`

In "Entenda essa relação":
```ts
it('brings back the law figures, the decisions, the benefits and the closing', () => {
  expect([c.garantia1Valor, c.garantia2Valor]).toEqual(['mín. 50%', 'mín. 70%'])
  expect([c.garantia1Rotulo, c.garantia2Rotulo]).toEqual(['créditos de remoção', 'redução do desmatamento'])
  expect([c.decisoesTitulo, c.beneficiosTitulo]).toEqual([
    'Quem decide sobre os projetos?',
    'Como os benefícios devem ser repartidos?',
  ])
  expect(c.decisoesTexto).toHaveLength(3)
  expect(c.beneficiosTexto).toHaveLength(3)
  expect(c.fechamento).toMatch(/^Compreender essas questões/)
})
```
In "Conheça a Caatinga":
```ts
it('fills each bar to the share its card states', () => {
  expect(c.climaIndicadorTexto).toContain(`cerca de ${c.climaIndicadorBarra}%`)
  expect(c.eficienciaIndicadorValor).toContain(`${c.eficienciaIndicadorBarra}%`)
  expect(barFill(c.climaIndicadorBarra)).toBe(38)
  expect(barFill(c.eficienciaIndicadorBarra)).toBe(60)
})
```
Keep "carries no glossary marker yet": it must still pass with the restored text.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/lib/sobreContent.test.ts`
Expected: FAIL on the two new cases (undefined fields).

- [ ] **Step 3: Add the bar fields to `CAATINGA`**, right after each card's `…IndicadorTexto`:
- `climaIndicadorBarra: optionalLine('Clima · Indicador · Barra (0 a 100)', '38')`
- `eficienciaIndicadorBarra: optionalLine('Eficiência · Indicador · Barra (0 a 100)', '60')` — `60` matches this file's `'60%'` default; the entry gets `58` (Task 3)

with a comment: the share the progress bar under the card fills (Figma `19406:47719`), digits only; empty draws no bar.

- [ ] **Step 4: Restore the blocks in `CARBONO_E_COMUNIDADES`** with the ids, display names and kinds the space still holds (so they reattach to the orphan fields), defaults copied from the entry's pt-BR:
- after `leiTexto`, under `// 19408:47967, the law figures`: `garantia1Valor: line('Lei · Garantia 1 · Valor', 'mín. 50%')`, `garantia1Rotulo: line('Lei · Garantia 1 · Rótulo', 'créditos de remoção')`, `garantia2Valor: line('Lei · Garantia 2 · Valor', 'mín. 70%')`, `garantia2Rotulo: line('Lei · Garantia 2 · Rótulo', 'redução do desmatamento')`
- after `leiFechamento`, under `// 18988:8842`: `decisoesTitulo: line('Decisões · Título', …)`, `decisoesTexto: text('Decisões · Texto', [3 paragraphs])`; under `// 18988:8847`: `beneficiosTitulo: line('Benefícios · Título', …)`, `beneficiosTexto: text('Benefícios · Texto', [3 paragraphs])` — the texts are those of `git show 438ec35^:lib/content/sobre/carbono-e-comunidades.ts`, lines 60–73, which equal the entry
- after `cuidadosFechamento`, under `// 18988:8941`: `fechamento: paragraph('Texto de encerramento', 'Compreender essas questões ajuda comunidades, gestores e demais interessados a avaliar se um projeto contribui para a conservação da Caatinga e para o bem-estar de quem vive em seus territórios.')` — the entry's shorter text, not the frame's

Update the file's header comment: the "ⓘ" note now covers the benefits text too ("adicionais", "permanência").

- [ ] **Step 5: Run the content tests to see them pass**

Run: `npx vitest run tests/lib/sobreContent.test.ts tests/lib/siteCopy.test.ts tests/scripts/contentfulProvision.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/content/sobre/caatinga.ts lib/content/sobre/carbono-e-comunidades.ts tests/lib/sobreContent.test.ts
git commit -m "feat: define the Sobre bar shares and bring back the law, decision and benefit copy"
```

---

### Task 3: Apply the model to the Contentful space

Writes to the shared space (beta reads its drafts). Entries stay **drafts**; publishing is the user's call (Task 6, Step 6).

**Files:**
- Create (scratchpad, not committed): `<scratchpad>/gen-sobre-types.mts`

**Interfaces:**
- Consumes: `CAATINGA`, `CARBONO_E_COMUNIDADES` (Task 2); `toProvisionedType`, `toCmaContentType` from `lib/content/site/provision.ts`.
- Produces: content types `sobreCaatinga` and `sobreCarbonoComunidades` (space `7nrpxk7di6ee`, env `master`) with every code field, localized, plus their remaining orphans.

- [ ] **Step 1: Generate the code's field lists**

A throwaway script prints `toCmaContentType(toProvisionedType(TYPE)).fields` for both types as JSON (`npx tsx <scratchpad>/gen-sobre-types.mts`). Expected: `climaIndicadorBarra` and `eficienciaIndicadorBarra` as `Symbol`, `required: false`, `localized: true`; the nine restored fields `localized: true`.

- [ ] **Step 2: Merge in the orphans**

`get_content_type` for each type; append every live field whose id the generated list lacks, unchanged. Expected orphans: 8 in `sobreCaatinga` (`pressao*`, `comparacao*`) and 10 in `sobreCarbonoComunidades` (`perguntas*`, `pergunta1`–`pergunta8`). Stop and ask if the counts differ.

- [ ] **Step 3: Update and publish both types**

`update_content_type` with the full merged list, then `publish_content_type`. Expected: both publish; the restored fields now show as localized in the web app.

- [ ] **Step 4: Fill the entries as drafts**

Fetch each entry (current `sys.version`), send its full `fields` with the changes applied:
- `sobreCaatinga` (`6e0LoPeztfWqDNEW6ByOk5`): `climaIndicadorBarra` `{ "pt-BR": "38" }`, `eficienciaIndicadorBarra` `{ "pt-BR": "58" }`; en-US left empty (falls back). On 2026-11-04 this entry already held an unpublished change (version 41, published 40) that is not ours: don't publish it.
- `sobreCarbonoComunidades` (`2a2menAmWF4crM0253EMTd`), en-US values (Claude's translation, pending review, in the terms the entry's English already uses):

| Field | en-US |
|---|---|
| `garantia1Valor` | min. 50% |
| `garantia1Rotulo` | removal credits |
| `garantia2Valor` | min. 70% |
| `garantia2Rotulo` | reduced deforestation |
| `decisoesTitulo` | Who decides on the projects? |
| `decisoesTexto` | Peoples and communities must take part from the start, before the main decisions are made. To do so, they need clear information on how the project works, how long it lasts, its expected results, its risks and the responsibilities taken on.<br><br>Participation must include enough time for discussion, independent technical and legal support, and the freedom to accept the project, propose changes to it or refuse it.<br><br>Taking part is not just being informed: it is being able to influence the decision. |
| `beneficiosTitulo` | How should the benefits be shared? |
| `beneficiosTexto` | Benefit sharing must be defined transparently and built together with the people involved. Agreements need to state who will receive the funds, how the amounts will be distributed and which responsibilities fall to each participant.<br><br>It is also necessary to consider who was already conserving the territory before the project. Market rules usually pay only for "additional" results, which can exclude or undervalue communities that have protected the vegetation for decades. Likewise, permanence requirements can shift onto families the responsibility for fires, droughts and other events beyond their control.<br><br>Fair sharing cannot be limited to one-off payments. It must recognize the work, the knowledge and the contribution of the people to the conservation of the territory. |
| `fechamento` | Understanding these issues helps communities, managers and other stakeholders assess whether a project contributes to the conservation of the Caatinga and to the well-being of those who live in its territories. |

(`<br><br>` = a blank line between paragraphs in the field.)

- [ ] **Step 5: Verify the space against the code**

Run: `npx vitest run tests/lib/contentfulSpace.test.ts` (needs `.env.local` in the worktree)
Expected: PASS, with every copy query, the two Sobre ones included, answering without errors.

No commit: nothing in the repo changes.

---

### Task 4: Conheça a Caatinga, and retire the outlined IndicatorCard

**Files:**
- Modify: `app/(marketing)/sobre/caatinga/page.tsx`, `app/(marketing)/sobre/caatinga/page.module.css`
- Modify: `components/marketing/IndicatorCard.tsx`, `components/marketing/IndicatorCard.module.css`
- Modify: `components/marketing/sobre/Section.tsx` (comment only)
- Modify: `tests/lib/marketingPalette.test.ts`
- Delete: `public/icons/indicator-card/map.svg`

**Interfaces:**
- Consumes: `FigureCard`, `FigureList` (Task 1); `barFill` (Task 1); the `CAATINGA` fields (Task 2).

- [ ] **Step 1: Rebuild the climate and efficiency sections as rows**

Each is a `<div className={styles.linha}>` holding a `Section` (title, then `Paragrafos textos={[c.climaAntes, c.climaDepois]}`) and a `FigureCard` (`label`, `value`, `description` from the `…Indicador…` fields, `bar={barFill(c.climaIndicadorBarra)}`); efficiency the same with its fields. `.linha`: grid, `repeat(2, minmax(0, 1fr))`, gap 24, `align-items: center`; one column at `max-width: 640px`.

- [ ] **Step 2: Put the storage pair in a `FigureList`**

Inside the storage `Section`, between its two texts: `FigureList` with two `FigureCard`s (no bar). Delete `.indicador` and `.indicadores` from the page stylesheet.

- [ ] **Step 3: Retire the outlined variant**

Nothing renders `variant="outlined"` any more. Remove the `variant` prop and the `.outlined` rules, fold `.raised` into `.card`, make `icon` required (only the Sobre cards used the default) and delete `public/icons/indicator-card/map.svg`. In `tests/lib/marketingPalette.test.ts`, delete the two pairs added for the outlined card's figure, `['--bg-texto-secundario', '--bg-superficie-variante']` and `['--am-400', '--bg-superficie-variante']`, and point the comment above `['--bg-texto-primario', '--bg-superficie-variante']` at `FigureCard`. In `Section.tsx`'s comment, "IndicatorCards" becomes "FigureCards".

- [ ] **Step 4: Run lint, types and the touched tests**

Run: `npm run lint && npx tsc --noEmit && npx vitest run tests/lib/marketingPalette.test.ts tests/lib/sobreContent.test.ts tests/components`
Expected: no errors; PASS.

- [ ] **Step 5: Check the page against frame `18988:8667`**

Screenshot `/sobre/caatinga` at 1436 px from the worktree's dev server (`google-chrome --headless=new --hide-scrollbars --window-size=1436,2400 --screenshot=…`), put it beside `get_screenshot` of `18988:8667`, and measure boxes (iframe harness, Appendix A of `docs/superpowers/plans/2026-10-01-figma-parity.md`, or CDP). Expected:
- each row: two 626 px columns 24 px apart; the text column centred on its card;
- upper cards 626 px wide, ~235 px tall with the entry's copy; number 64/64 Rubik 700 `rgb(39, 114, 91)`; unit 20/28 600 `rgb(55, 77, 21)`, its box bottom-aligned with the number's;
- track 578 × 11 px `rgb(217, 217, 217)`; fill ≈ 214 px on the removal card (38 %) and ≈ 327 px on the efficiency card (58 %); the arrowhead overlapping the fill's end by 9 px;
- storage cards 630 px, 16 px apart, ~184 px tall, 24 px from the text above and below;
- the "Um bioma de natureza e pessoas" block unchanged.

- [ ] **Step 6: Commit**

```bash
git add app/\(marketing\)/sobre/caatinga components/marketing/IndicatorCard.tsx components/marketing/IndicatorCard.module.css components/marketing/sobre/Section.tsx tests/lib/marketingPalette.test.ts public/icons/indicator-card/map.svg
git commit -m "feat: set the Caatinga figures beside their text, in the new figure cards"
```

---

### Task 5: Entenda essa relação

**Files:**
- Modify: `app/(marketing)/sobre/carbono-e-comunidades/page.tsx`, `app/(marketing)/sobre/carbono-e-comunidades/page.module.css`

**Interfaces:**
- Consumes: `FigureCard`, `FigureList` (Task 1); the restored `CARBONO_E_COMUNIDADES` fields (Task 2).

- [ ] **Step 1: Lay out the page in the frame's order**

`antes` (with its quote), `renda`, `terra` (photo), then:
- the law `Section`: `Paragrafos textos={c.leiTexto}`, a `FigureList className={styles.garantias}` with `FigureCard label={c.garantia1Rotulo} value={c.garantia1Valor}` and the second one (no description, no bar), `Paragrafos textos={[c.leiFechamento]}`;
- `Section` `decisoesTitulo` / `decisoesTexto`;
- `Section` `beneficiosTitulo` / `beneficiosTexto`;
- the `CautionCard`, unchanged;
- `Paragrafos textos={[c.fechamento]}`, a direct child of `.inner`.

`.garantias { margin: -8px 0; }` with the comment the pre-438ec35 file carried: Figma sets the figures 16 px from the text around them (`18988:8818`) and `Section`'s body puts 24 px between children; flex items' margins don't collapse, so the net is 16 px at every width.

- [ ] **Step 2: Run lint and types**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Check the page against frame `18988:8769`**

As in Task 4, Step 5. Expected: the law cards 630 px wide, 16 px apart, ~152 px tall, 16 px below the law text and 16 px above its closing; label uppercase; "mín. 50%" all at 64 px, no unit; then "Quem decide", "Como os benefícios", the red card and the closing paragraph, each 24 px apart; no "ⓘ" anywhere.

- [ ] **Step 4: Commit**

```bash
git add app/\(marketing\)/sobre/carbono-e-comunidades
git commit -m "feat: bring back the law figures, decisions, benefits and closing to Entenda essa relação"
```

---

### Task 6: Whole-branch verification and hand-off

- [ ] **Step 1: Full suite, lint, build, contrast**

Run: `npm test && npm run lint && npm run build && npm run contrast`
Expected: all pass (CI runs only the build and contrast, so the tests and lint are checked here).

- [ ] **Step 2: The other two Sobre pages did not move**

Screenshot `/sobre` and `/sobre/como-funciona` at 1436 px and compare with the screenshots taken from the main checkout before the work began. Expected: identical.

- [ ] **Step 3: English**

For each string, run `curl -s -H 'Cookie: NEXT_LOCALE=en' localhost:<port><path> | grep -c '<string>'`: on `/sobre/carbono-e-comunidades`, `Who decides on the projects?`, `How should the benefits be shared?` and `removal credits` (the uppercase is CSS); on `/sobre/caatinga`, `Up to 58%` and `--fill:0.58`.
Expected: each count ≥ 1 (the dev server reads drafts through the preview API), and `Quem decide` counts 0 on the English page.

- [ ] **Step 4: Narrow window**

Screenshot both pages at `--window-size=390,4000`. Expected: rows and pairs stacked, every figure inside its card, no horizontal scroll.

- [ ] **Step 5: Push and open the PR**

PR in English, base `feat/contentful-english-locale`: what changed per page, the decisions above (blocks back, bar = card's share, ⓘ still out), the Contentful changes already made as drafts, and the noted-not-fixed list. Retarget to `main` before merging.

- [ ] **Step 6: Tell the user what to publish, and when**

Publish `sobreCaatinga` and `sobreCarbonoComunidades` once the PR reaches production (the Caatinga entry also carries someone else's unpublished change from before 2026-11-04: review it first). Until then, production draws no bars (the published entry has no shares) and shows the restored sections in Portuguese on the English page.
