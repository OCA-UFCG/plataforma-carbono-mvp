# Sobre Platform Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/sobre` ("Conheça a plataforma") to its rebuilt Figma frame: the mission as a large quote, "Para quem é a plataforma?" as a grey band of audience chips, and "O que a plataforma não faz" as a photo beside a list of limits, in place of the two icon cards and the red photo band.

**Architecture:** Two new presentational components, `AudienceBand` and `LimitList`, plus a `large` size on `Quote` and a `wide` size and 8 px radius on `MediaText`. The page keeps reading `sobrePlataforma` from Contentful: one new list field (`publicoPerfis`) carries the chips, and the existing field ids stay so the entry keeps its copy. `IconCard`, `PhotoBand` and their assets are retired.

**Tech Stack:** Next.js 16 App Router (server components), CSS Modules, Contentful (copy types via `defineCopy`), next-intl, Vitest (node environment, `renderToStaticMarkup`).

**Spec:** Figma file `j4ow0a7jMv0MyP4oTOqkCx` ("Caativar (Copy)", linked 2026-11-05), page "Site/ portal" `2809:9655`, top-level frame **`19538:11039`** "Sobre" (content `19538:11069`): "Por que e missão" `19538:11410`, "Para quem (faixa)" `19538:11415`, "O que a plataforma não faz" `19538:11427`. The frame was rebuilt with new ids and sits outside the Sobre section; the old frame `18988:8611` no longer exists.

## What changed, and what this plan does about it

Pixel diff at 1436 px of every Sobre frame against the 2026-11-04 copy (`3mgmAeGIkxyrIql32UhptS`), which the last Sobre update (`2026-11-04-sobre-layout-update.md`) was built from:

| Frame | Diff | This plan |
|---|---|---|
| Conheça a Caatinga `18988:8667` | identical | nothing |
| Entenda essa relação `18988:8769` | identical (one anti-aliased pixel) | nothing |
| Como funciona `18988:8943` | identical | nothing |
| Conheça a plataforma → `19538:11039` | header, tabs, "Por que criar" text and footer identical; the photo's radius 12 → 8; everything below rebuilt | Tasks 1–5 |

| Block | Site today | Figma now |
|---|---|---|
| Missão | `IconCard` (target icon, green container) | h3 title, 16 px, then a quote: left rule 3 px `--bg-borda`, Rubik SemiBold 18/28, 940 px wide (`19538:11411`) |
| Para quem | `IconCard` (groups icon) | full-bleed band on `--am-050`, 40/80 padding, gap 16: h3 title, four chips, helper text (`19538:11415`) |
| O que não faz | `PhotoBand`: red gradient over a photo, white ✕ list | full-bleed white band, 48/80 padding: 464×200 photo (radius 8, `--am-200` border), 24 px, then a red h3 title and three items split by 1 px `--am-200` rules, each with a red 24 px ✕ (`19538:11427`) |
| Spacing | 40 px padding, 24 px between blocks | "Por que e missão": 40 px top, 48 px bottom, 48 px between the photo row and the mission |

## Decisions

- **Follow the frame.** Per the standing "siga o Figma" rule, what the frame doesn't draw goes: both icon cards (and `IconCard`, `target.svg`, `groups.svg`) and the photo band (`PhotoBand`, its type, `faixas/sobre.webp`).
- **Copy is Contentful's where only the words differ**, as on 2026-11-04: the "Por que criar" paragraphs, the mission ("Valorizar o bioma…" in the entry, "Ampliar o acesso…" in the frame) and "Caativar"/"CaatiVAR" stay as the entry has them.
- **TO CONFIRM — the "Para quem" text.** The chips now name the four audiences that the entry's `publicoTexto` lists ("A Caativar foi desenvolvida para comunidades, gestores públicos, pesquisadores, investidores e demais interessados…"), so keeping it repeats them under the chips. **Recommended:** replace it with the frame's text, "A plataforma também atende demais interessados no mercado de carbono na Caatinga. Cada público pode utilizar as informações de acordo com suas necessidades, seja para conhecer o tema, consultar dados ou apoiar decisões." (Tasks 2 and 4 assume this). If the answer is "keep", drop the `publicoTexto` default change and its entry edit.
- **Photo radius by frame.** The rebuilt frame rounds both its photos at 8 px; "Entenda essa relação" still draws 12 px (`18988:8817`), so `MediaText` keeps 12 by default and `/sobre` passes 8.
- **Field ids stay** (`missao*`, `publico*`, `faixa*`), so the entry keeps its copy and no orphan fields are left; only the display names change ("Cartão da missão" → "Missão", "Cartão do público" → "Para quem", "Faixa do rodapé" → "Limites"). `missaoTexto` changes kind from `text` to `paragraph` (both are `Text` in Contentful, so the content type is unaffected): the quote is a single `<p>`.
- **The new photo** is the same source as the Comunicação "caderno" card (`comunicacao/caderno.webp`), but gets its own file: that one is slated to go when the content model gains a card-photo field (IMAGENS.md).

## Before you start

- Base on `origin/main` (5f6ded1 or later; the 2026-11-04 Sobre stack is merged). Worktree `.claude/worktrees/sobre-platform-redesign`, branch `feat/sobre-platform-redesign`; the PR targets `main`. Move this plan into the worktree and make it the first commit (`docs: plan the Sobre platform page redesign`).
- The main checkout is on `feat/contentful-english-locale` with uncommitted work from another session: do not touch it.
- In the worktree: `npm ci`, copy `.env.local` from the main checkout, and run the dev server with `npx next dev --webpack -p <free port>` (a nested worktree needs webpack; check `ss -ltnp`). Never stop the user's server on :3000. Once merged, delete the worktree (disk is nearly full).
- Before the work begins, screenshot `/sobre`, `/sobre/caatinga`, `/sobre/carbono-e-comunidades` and `/sobre/como-funciona` at 1436 px from main (Task 5 compares against them).
- Run `git branch --show-current` before every test run and commit.

## Global Constraints

- Comments and docs in English; UI strings and copy in Portuguese; Contentful display names in Portuguese; IMAGENS.md in Portuguese, like the rest of that file.
- A field the code queries must exist in the space **before** the code that queries it deploys. Otherwise the whole page query fails and every section falls back to code.
- `mcp__contentful__update_content_type` replaces the whole field list: send all 9 fields.
- Desktop first: the frame is 1436 px. Below 640 px, rows stack (`MediaText`'s breakpoint); no other phone work.
- Colors come from `app/globals.css` tokens. The limits band's white is `--role-primario-texto-sobre` (#ffffff), the same white-as-fill the landing's indicator cards use.
- Commits carry no co-author or Claude attribution lines.

## Review Focus

- **Contentful unreachable, or `publicoPerfis` not yet in the space** → the page renders the code defaults, chips included. Pinned in Task 2's defaults test.
- **An editor leaves a blank line in the chips list, or empties it** → blank lines yield no empty chip (the `list` kind drops them); an empty list renders no `<ul>`. Pinned in Task 1's `AudienceBand` test.
- **An editor types a line break inside the mission** → it shows as a `<br>` inside the one quote paragraph, never a second `<p>` inside the first. Pinned in Task 1's `Quote` test.
- **The English page** → chips, helper text and the photo's alt text in English; the mission, title and limits from en-US. Checked in Task 5, Step 3.
- **A narrow window** → the chips wrap, the 940 px quote shrinks (max-width, not width), the limits photo stacks above its list at full width, and nothing scrolls sideways. Checked in Task 5, Step 4.

---

### Task 1: The new blocks: `AudienceBand`, `LimitList`, `Quote` large, `MediaText` wide

**Files:**
- Create: `components/marketing/sobre/AudienceBand.tsx`, `.module.css`
- Create: `components/marketing/sobre/LimitList.tsx`, `.module.css`
- Create: `public/icons/sobre/close-negativo-24.svg`
- Modify: `components/marketing/sobre/Quote.tsx`, `Quote.module.css`
- Modify: `components/marketing/sobre/MediaText.tsx`, `MediaText.module.css`
- Modify: `tests/lib/marketingPalette.test.ts`
- Test: `tests/components/sobrePlataforma.test.ts`

**Interfaces:**
- Produces:
  - `AudienceBand({ titulo, perfis, textos }: { titulo: string; perfis: string[]; textos: string[] })`, the default export: a full-bleed `<section aria-labelledby>` holding a `.container` with an `<h2>`, a `<ul role="list">` of chips (omitted when `perfis` is empty) and `<Paragrafos textos={textos} />`.
  - `LimitList({ titulo, itens }: { titulo: string; itens: string[] })`, the default export: a `<section aria-labelledby>` with an `<h2>` and a `<ul role="list">`; each `<li role="listitem">` holds `<img src="/icons/sobre/close-negativo-24.svg" alt="" width={24} height={24}>` and the text.
  - `Quote` gains `size?: "body" | "large"` (default `"body"`, today's look unchanged).
  - `MediaText` gains `imageSize: "wide"` (464×200, centred on the text) and `imageRadius?: 8 | 12` (default 12).

- [ ] **Step 1: Write the failing tests** in `tests/components/sobrePlataforma.test.ts` (`renderToStaticMarkup` + `createElement`, as `tests/components/sobreSection.test.ts`)

- `AudienceBand` `renders each audience as a chip in a list`: `perfis` = the four defaults → 4 `<li role="listitem"`, inside `<ul … role="list">`, each label verbatim.
- `AudienceBand` `labels the band by its heading`: the `aria-labelledby` value equals the `<h2>`'s `id`.
- `AudienceBand` `draws no list without audiences`: `perfis: []` → no `<ul`; `textos` still rendered as `<p>`.
- `LimitList` `lists each limit with a decorative ✕`: three items → 3 `<li role="listitem"`, 3 × `src="/icons/sobre/close-negativo-24.svg"`, each with `alt=""`.
- `Quote` `keeps the body size by default`: output contains `text-body`.
- `Quote` `sets the large size on request`: `size: "large"` → no `text-body`; with children `createElement(Linhas, { texto: "a\nb" })` → exactly one `<p`, one `<br/>`.
- `MediaText` `draws the wide photo at 464×200`: `imageSize: "wide"` → `width="464"` `height="200"`.
- `MediaText` `rounds at 8px on request`: `imageRadius: 8` → the 8 px class is present; omitted → absent.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/components/sobrePlataforma.test.ts`
Expected: FAIL, cannot resolve `@/components/marketing/sobre/AudienceBand`.

- [ ] **Step 3: Save the ✕ asset**

`get_design_context` of `19538:11069` (file `j4ow0a7jMv0MyP4oTOqkCx`) returns it as `imgClose`. Save it byte for byte to `public/icons/sobre/close-negativo-24.svg` (expected: root `width="24" height="24"`, one path filled `#B54C40`). It is the same glyph as `close-negativo.svg` at 24 px instead of 26; keep both files, since the red card still draws 26.

- [ ] **Step 4: Implement the four changes**

Metrics, from `19538:11069`:

| Part | Value |
|---|---|
| `AudienceBand` section | `background: var(--am-050)`, `padding-block: 40px`, full width; its `.container` is a column, gap 16 |
| Band title | `.text-h3`, `--role-marca-ancora-padrao`, margin 0 |
| Chip list | flex, `flex-wrap: wrap`, gap 8, no list style/margin/padding |
| Chip | `--bg-fundo` fill, 1 px `--am-200` border, `border-radius: 9999px`, padding 4px 16px, Rubik 500 14/24 (`.text-body` + `font-weight: 500`), `--role-categorica1-hover`, `white-space: nowrap` |
| `LimitList` | column, gap 8 |
| Limits title | `.text-h3`, `--ctx-negativo-padrao`, margin 0 |
| Limit item | flex, `align-items: center`, gap 4, `min-height: 50px`, `padding-block: 12px`, `.text-body`, `--bg-texto-primario`; `li + li { border-top: 1px solid var(--am-200) }` (Figma draws the rules as 1 px frames between items: 50 + 1 + 50 + 1 + 50 = 152) |
| `Quote` large | Rubik 600 18/28, letter-spacing 0, `max-width: 940px`; rule and padding as the body size (`--role-neutro-borda` = `--bg-borda` = #526f78) |
| `MediaText` wide | `width: min(464px, 40%)`, `aspect-ratio: 464 / 200`, `align-items: center` (as `small`) |
| `MediaText` radius 8 | `border-radius: var(--radius)` (8 px) instead of the 12 px default |

`AudienceBand`'s heading id comes from `useId`, as in `Section`. `LimitList`'s `<img>` is a plain `<img>` with the eslint comment, as in `CautionCard`. Update `Quote`'s and `MediaText`'s header comments to name `19538:11413`, `19538:11076` and `19551:11428`.

- [ ] **Step 5: Add the contrast pairs** in `tests/lib/marketingPalette.test.ts`, under a comment naming the rebuilt frame (`19538:11069`):
- `PAIRS`: `['--role-categorica1-hover', '--bg-fundo']` (chip), `['--ctx-negativo-padrao', '--role-primario-texto-sobre']` (limits title on white).
- `LARGE_TEXT_PAIRS`: `['--role-marca-ancora-padrao', '--am-050']` (band title, 24 px semibold; about 4.4:1, below AA for body text).
- Already covered: band text on `--am-050`, item text on white, the quote on `--bg-fundo`.

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run tests/components/sobrePlataforma.test.ts tests/components/sobreSection.test.ts tests/lib/marketingPalette.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/marketing/sobre public/icons/sobre/close-negativo-24.svg tests/components/sobrePlataforma.test.ts tests/lib/marketingPalette.test.ts
git commit -m "feat: add the Sobre audience band, limit list, large quote and wide photo"
```

---

### Task 2: Content definition and the limits photo

**Files:**
- Modify: `lib/content/sobre/plataforma.ts`
- Create: `public/images/sobre/casa-flamboyants.webp`
- Modify: `messages/pt.json`, `messages/en.json` (`Sobre.imageAlt.limites`)
- Modify: `IMAGENS.md` ("Páginas Sobre")
- Test: `tests/lib/sobreContent.test.ts`

**Interfaces:**
- Produces:
  - `SOBRE_PLATAFORMA` fields: `missaoTexto: string` (was `string[]`), new `publicoPerfis: string[]`, and the rest unchanged in type.
  - `SOBRE_LIMITES_IMAGEM = { src: '/images/sobre/casa-flamboyants.webp' }`, exported from `lib/content/sobre/plataforma.ts`.
  - `SOBRE_PLATAFORMA_ICONES` is removed.

- [ ] **Step 1: Rewrite the failing tests** in `describe('Conheça a plataforma (/sobre)')`

Replace "answers the two questions of the icon cards…" and "closes on what the platform does not do" with:
```ts
it('states the mission as one paragraph', () => {
  expect(p.missaoTitulo).toBe('Qual é a missão da Caativar?')
  expect(typeof p.missaoTexto).toBe('string')
})

it('names the four audiences of the chips, then who else it serves', () => {
  expect(p.publicoTitulo).toBe('Para quem é a plataforma?')
  expect(p.publicoPerfis).toEqual(['Comunidades', 'Gestores públicos', 'Pesquisadores', 'Investidores'])
  expect(p.publicoTexto[0]).toMatch(/^A plataforma também atende demais interessados/)
})

it('closes on what the platform does not do, beside its photo', () => {
  expect(inPublic(SOBRE_LIMITES_IMAGEM.src)).toBe(true)
  expect(p.faixaTitulo).toBe('O que a plataforma não faz')
  expect(p.faixaItens).toHaveLength(3)
})
```
In "the Sobre photos' descriptions", add `limites: SOBRE_LIMITES_IMAGEM` to `photos`. Drop the `SOBRE_PLATAFORMA_ICONES` and `SOBRE_FAIXA_IMAGEM` imports.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/lib/sobreContent.test.ts`
Expected: FAIL (`publicoPerfis` undefined, `SOBRE_LIMITES_IMAGEM` missing).

- [ ] **Step 3: Update `SOBRE_PLATAFORMA`**

- `missaoTitulo: line('Missão · Título', …)`; `missaoTexto: paragraph('Missão · Texto', <today's default, unchanged>)`
- `publicoTitulo: line('Para quem · Título', …)`
- new, between title and text: `publicoPerfis: list('Para quem · Públicos', ['Comunidades', 'Gestores públicos', 'Pesquisadores', 'Investidores'])`
- `publicoTexto: text('Para quem · Texto', 'A plataforma também atende demais interessados no mercado de carbono na Caatinga. Cada público pode utilizar as informações de acordo com suas necessidades, seja para conhecer o tema, consultar dados ou apoiar decisões.')` (see "TO CONFIRM")
- `faixaTitulo: line('Limites · Título', …)`, `faixaItens: list('Limites · Lista', …)`, values unchanged

Comments: the header names frame `19538:11039`; each block names its node (`19538:11411`, `19538:11415`, `19538:11427`); a line on `faixa*` explains the ids predate the redesign and are kept so the entry keeps its copy. Replace `SOBRE_PLATAFORMA_ICONES` with `SOBRE_LIMITES_IMAGEM`.

- [ ] **Step 4: Make the photo**

Source: `imgFoto` in `get_design_context` of `19551:11428` (960×1280 JPEG). Centre-crop to the frame's 464/200 ratio (960×414, rows 433–847, the window Figma's `object-cover` shows), resize to 928×400 (2×), and save as WebP quality 80 with `exif=b''` (Pillow). Expected: about 928×400 and under 120 KB.

- [ ] **Step 5: Describe it**

`messages/pt.json` `Sobre.imageAlt.limites`: "Casa de uma comunidade rural da Caatinga entre árvores de flores vermelhas, com terreiro de chão batido". `messages/en.json`: "A house in a rural Caatinga community among red-flowering trees, with a bare-earth yard".

In IMAGENS.md, under "Páginas Sobre", add a paragraph for `casa-flamboyants.webp`: node `19551:11428`, the same source as `comunicacao/caderno.webp`, the crop, the conversion that drops metadata, authorship unrecorded. Delete the "Faixas das páginas internas" section (`sobre.webp` was its last file; Task 3 deletes it), and end the new paragraph with one sentence saying the red band's photo left with the 2026-11-05 redesign.

- [ ] **Step 6: Run the content tests to see them pass**

Run: `npx vitest run tests/lib/sobreContent.test.ts tests/lib/siteCopy.test.ts tests/scripts/contentfulProvision.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/content/sobre/plataforma.ts public/images/sobre/casa-flamboyants.webp messages/pt.json messages/en.json IMAGENS.md tests/lib/sobreContent.test.ts
git commit -m "feat: define the Sobre audiences and limits photo, and the mission as one paragraph"
```

---

### Task 3: Lay out the page, and retire what it no longer draws

**Files:**
- Modify: `app/(marketing)/sobre/page.tsx`, `app/(marketing)/sobre/page.module.css`
- Modify: `app/(marketing)/sobre/layout.tsx` (comment only: `18988:8611` → `19538:11039`)
- Modify: `lib/content/paginas.ts` (drop `PhotoBandContent`, `SOBRE_FAIXA_IMAGEM`)
- Modify: `tests/lib/marketingPalette.test.ts`
- Delete: `components/marketing/sobre/IconCard.tsx`, `.module.css`; `components/marketing/PhotoBand.tsx`, `.module.css`; `public/icons/sobre/target.svg`, `public/icons/sobre/groups.svg`; `public/images/faixas/sobre.webp`

**Interfaces:**
- Consumes: `AudienceBand`, `LimitList`, `Quote size="large"`, `MediaText imageSize="wide" imageRadius={8}` (Task 1); `SOBRE_PLATAFORMA` fields and `SOBRE_LIMITES_IMAGEM` (Task 2).

- [ ] **Step 1: Rebuild the page**

Top to bottom, inside `.page` (`--bg-fundo`, no bottom padding now):
1. `.container.porQue` (padding 40px top, 48px bottom; column, gap 48): `MediaText` with the "Por que" `Section`, as today, plus `imageRadius={8}`; then the mission: a `<section aria-labelledby="missao-titulo">` (column, gap 16) with an `<h2 className="text-h3 …">` in `--role-marca-ancora-padrao` and `<Quote size="large"><Linhas texto={p.missaoTexto} /></Quote>`.
2. `<AudienceBand titulo={p.publicoTitulo} perfis={p.publicoPerfis} textos={p.publicoTexto} />`.
3. `.limites` (full width, `--role-primario-texto-sobre` fill, `padding-block: 48px`) holding a `.container` with `MediaText image={SOBRE_LIMITES_IMAGEM.src} imageAlt={t("imageAlt.limites")} imageSide="left" imageSize="wide" imageRadius={8}`, and in it `<LimitList titulo={p.faixaTitulo} itens={p.faixaItens} />`.

Update the page's header comment and the stylesheet's comments to the new node ids.

- [ ] **Step 2: Retire the unused parts**

Before deleting, confirm that `git grep -n -E "IconCard|PhotoBand|SOBRE_FAIXA_IMAGEM|icons/sobre/(target|groups)\.svg|faixas/sobre"` finds nothing outside the files above. In the palette test, delete the icon cards' two pairs (`['--role-categorica1-hover', '--role-categorica1-container']`, `['--bg-texto-primario', '--role-categorica1-container']`) and the photo band's `['--bg-texto-sobre-inverso', '--role-alerta-risco-hover']`, with their comment lines. Remove each pair only if `git grep` shows no other component setting that text on that fill.

- [ ] **Step 3: Run lint, types and the tests**

Run: `npm run lint && npx tsc --noEmit && npx vitest run tests/lib tests/components`
Expected: no errors; PASS.

- [ ] **Step 4: Check against frame `19538:11039`**

Screenshot `/sobre` at 1436 px from the worktree's dev server (`google-chrome --headless=new --hide-scrollbars --window-size=1436,2000 --screenshot=…`) beside `get_screenshot` of `19538:11039`, and measure boxes (CDP, or the iframe harness in Appendix A of `2026-10-01-figma-parity.md`). Until Task 4 the field is missing from the space, so the page shows the code defaults. Expected:
- photo 464×341, radius 8; the mission title 48 px below the photo row; the quote 16 px under its title, at most 940 px wide, 18/28 600;
- the grey band starting 48 px under the quote, 226 px tall with the defaults: title, chips 34 px tall and 8 px apart, text, each 16 px apart; chip label `rgb(32, 92, 73)`;
- the white band 296 px tall: photo 464×200 radius 8, list centred on it; the red title, then items 50 px tall, split by 1 px `rgb(191, 202, 206)` rules; the footer right below it.

- [ ] **Step 5: Commit**

```bash
git add -A app/\(marketing\)/sobre lib/content/paginas.ts tests/lib/marketingPalette.test.ts components/marketing public/icons/sobre public/images/faixas
git commit -m "feat: rebuild Conheça a plataforma on the new frame, retiring the icon cards and photo band"
```

---

### Task 4: Apply the model to the Contentful space

Writes to the shared space (beta reads drafts). Space `7nrpxk7di6ee`, env `master`, type `sobrePlataforma`, entry `4CJ6SQWMrpJmcJ9334OWz8`. Run this once Task 3 is done, right before opening the PR: the edited entry shows on beta as soon as it is saved, inside the old layout until the PR merges.

**Interfaces:**
- Consumes: `SOBRE_PLATAFORMA` (Task 2); `toProvisionedType`, `toCmaContentType` from `lib/content/site/provision.ts`.

- [ ] **Step 1: Generate the code's field list**

A throwaway `<scratchpad>/gen-plataforma-type.mts` prints `toCmaContentType(toProvisionedType(SOBRE_PLATAFORMA)).fields` (`npx tsx …`). Expected: 9 fields, `publicoPerfis` as `Text`, required, localized; the new display names.

- [ ] **Step 2: Check for orphans**

`get_content_type sobrePlataforma`. On 2026-11-05 the live type had exactly the 8 code fields and no orphans. If it now has a field the generated list lacks, append it unchanged; stop and ask if anything else differs.

- [ ] **Step 3: Update and publish the type**

`update_content_type` with the 9 fields, then `publish_content_type`. Expected: both succeed.

- [ ] **Step 4: Fill the entry as a draft**

Fetch the entry (current `sys.version`) and send its full `fields` with:

| Field | pt-BR | en-US (Claude's translation, pending review) |
|---|---|---|
| `publicoPerfis` | Comunidades⏎Gestores públicos⏎Pesquisadores⏎Investidores | Communities⏎Public officials⏎Researchers⏎Investors |
| `publicoTexto` | the frame's text (Task 2, Step 3) | The platform also serves anyone else interested in the carbon market in the Caatinga. Each audience can use the information as it needs, whether to learn about the subject, consult data or support decisions. |

(⏎ = a line break.) Leave it unpublished.

- [ ] **Step 5: Verify the space against the code**

Run: `npx vitest run tests/lib/contentfulSpace.test.ts`
Expected: PASS, with the `sobrePlataforma` query answering without errors.

No commit: nothing in the repo changes.

---

### Task 5: Whole-branch verification and hand-off

- [ ] **Step 1: Full suite, lint, build, contrast**

Run: `npm test && npm run lint && npm run build && npm run contrast`
Expected: all pass. CI runs only the build and the contrast check, so the tests and lint are checked here.

- [ ] **Step 2: The other Sobre pages did not move**

With the dev server on `CONTENTFUL_PREVIEW=true`, screenshot `/sobre/caatinga`, `/sobre/carbono-e-comunidades` and `/sobre/como-funciona` at 1436 px and diff them against the shots taken before the work began. Expected: identical. `/sobre` matches Task 3, Step 4, now with the entry's copy.

- [ ] **Step 3: English**

`curl -s -H 'Cookie: NEXT_LOCALE=en' localhost:<port>/sobre`, with the server on `CONTENTFUL_PREVIEW=true`. Expected: `Public officials`, `The platform also serves`, `What the platform does not do` and the English alt text each appear at least once; `Gestores públicos` appears 0 times.

- [ ] **Step 4: Narrow window**

Screenshot `/sobre` at `--window-size=390,3000`. Expected: the chips wrap, the quote fits the width, the limits photo sits above its list at full width, and nothing scrolls sideways.

- [ ] **Step 5: Push and open the PR**

PR in English, base `main`. It covers what changed and why only `/sobre` changed (the diff table), the decisions above, the Contentful changes already made (type published, entry as a draft), and the removed components and assets.

- [ ] **Step 6: Tell the user what to publish, and when**

Publish `sobrePlataforma` once the PR reaches production. Until then, production shows the old layout with the old copy. Beta shows the draft's "Para quem" text in the old card until the merge deploys.
