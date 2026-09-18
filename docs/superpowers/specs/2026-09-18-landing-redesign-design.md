# Landing page redesign — design

**Date:** 2026-09-18
**Figma:** `hzQi2FcgZuGSGSP6NaeLdY`, page "Site/ portal", frame `18862:8514` ("Home", 1436×2705)
**Status:** approved in conversation; blocks 2 and 3 of the design were folded into the
implementation plan at the user's request.

## 1. Goal

Replace the current landing page (`app/(marketing)/page.tsx`) with the institutional page
designed in Figma. The map module (`/mapa`) and the report module are out of scope and must
not be touched.

The current landing is a long editorial page with nine sections and heavily sourced
scientific copy. The Figma page is short and institutional: six sections, a tabbed "about"
block, and card-based highlights. This is a restructure, not a reskin.

## 2. Decisions

These were settled with the user before any code was written.

| # | Question | Decision |
|---|---|---|
| 1 | Is the Figma frame the whole landing, or just the top? | **The whole page.** Sections not in Figma are removed. |
| 2 | What happens to the removed copy? | **Parked**, not deleted: the data arrays move to `lib/content/` modules for the future internal pages. |
| 3 | Tokens and typography | **Adopt the Figma design system** — its token names and values, and Rubik in place of Raleway. |
| 4 | PT-BR / En switch in the header | **Not functional.** PT-BR only; the control is rendered per the design but inert. Internationalisation is its own project. |
| 5 | Where do the menu and "Ver mais" buttons point? | **In-page anchors.** "Mapas" goes to `/mapa`. The "Ver mais" buttons are dropped — there is nowhere for them to go. |
| 6 | Content for the three undesigned tabs | **Tab 1 only.** "A Caatinga", "Carbono e comunidades" and "Como funciona" render a discreet empty state until someone writes the copy. |
| 7 | Implementation structure | **One component per section with a co-located CSS Module.** `globals.css` shrinks to reset, tokens and typography. |

## 3. Architecture

### 3.1 Route isolation

`app/(marketing)/`, `app/(mapa)/` and `app/(auth)/` are sibling root layouts, each owning its
own `<html>`, `<body>` and global stylesheet. This work touches only the marketing group.
`app/mapa.css` and `app/relatorio.css` are not modified, and no `app/layout.tsx` is
introduced. Links that cross a route group stay `<a href>`, never `next/link`.

### 3.2 Token layer

`globals.css` keeps a single `:root` block, rewritten with the Figma system. Figma names map
to CSS custom properties by lowercasing and hyphenating the same words, so the correspondence
with the design file stays mechanical:

```
ROLE-MarcaAncora-Padrao       → --role-marca-ancora-padrao       #587c22
ROLE-MarcaAncora-Hover        → --role-marca-ancora-hover        #47651b
ROLE-MarcaAncora-Pressionado  → --role-marca-ancora-pressionado  #374d15
ROLE-MarcaAncora-TextoSobre   → --role-marca-ancora-texto-sobre  #ffffff
ROLE-Categorica1-Padrao       → --role-categorica1-padrao        #27725b
ROLE-Categorica2-Hover        → --role-categorica2-hover         #002430
ROLE-Neutro-Borda             → --role-neutro-borda              #526f78
ROLE-Neutro-TextoDesabilitado → --role-neutro-texto-desabilitado #94a6ac
ROLE-Primario-TextoSobre      → --role-primario-texto-sobre      #ffffff
ROLE-Terciario-TextoSobre     → --role-terciario-texto-sobre     #ffffff
CTX-Atencao-TextoSobre        → --ctx-atencao-texto-sobre        #ffffff
CTX-Positivo-TextoSobre       → --ctx-positivo-texto-sobre       #ffffff
BG-Fundo                      → --bg-fundo                       #fefefb
BG-FundoInverso               → --bg-fundo-inverso                #000f15
BG-TextoPrimario              → --bg-texto-primario               #001d27
BG-TextoSecundario            → --bg-texto-secundario             #002b39
BG-TextoSobreInverso          → --bg-texto-sobre-inverso          #fefefb
BG-Borda                      → --bg-borda                        #526f78
BG-Overlay                    → --bg-overlay                      #000f1580
AM100 / AM200 / AM400         → --am-100 #e6eaeb / --am-200 #bfcace / --am-400 #526f78
AR050                         → --ar-050                          #fefefb
CB400                         → --cb-400                          #72ae9b
```

Scalars: radius `8px` (`--radius`), inner radius `6px`, border width `2px`, base spacing unit
`8px`. Elevation `--shadow` is the Figma `shadow` effect: `0 1px 3px #0000001a, 0 1px 2px -1px
#0000001a`.

Typography, all Rubik:

```
h2      SemiBold 30 / 36, letter-spacing -0.75
lead    Regular  20 / 28
p-ui    Medium   16 / 24
body    Regular  14 / 24
subtle  Regular  14 / 20
subtle-semibold SemiBold 14 / 20
```

**The h1 is not in the Figma variable set** — the hero title has no bound variable. Its real
value is read from the hero node at implementation time.

**Three tokens are deliberately not imported.** `var(--card)` `#ffffff`, `var(--foreground)`
`#292829` and `var(--primary-foreground)` `#f8f7f8` are shadcn defaults left over in the Figma
component library; `#292829` is a warm grey that contradicts the otherwise cool scale
(`#001d27`, `#526f78`). They map to `--bg-fundo`, `--bg-texto-primario` and
`--bg-texto-sobre-inverso` respectively. The designer should decide whether to clean this up
at the source.

### 3.3 Component structure

```
app/(marketing)/
  layout.tsx          modified: Rubik replaces Raleway
  page.tsx            rewritten: composition only, ~40 lines
app/globals.css       rewritten: reset + tokens + typography, no section rules
components/marketing/
  SiteHeader.tsx      + SiteHeader.module.css      Figma "Menu-superior"   18862:8515
  Hero.tsx            + Hero.module.css            Figma hero background   18862:8516
  Destaques.tsx       + Destaques.module.css       Figma "Destaques"       18862:8538
  Plataforma.tsx      + Plataforma.module.css      Figma "Sobre" (tabs)    18862:8546
  Ferramenta.tsx      + Ferramenta.module.css      Figma map split         18862:8547
  Comunicacao.tsx     + Comunicacao.module.css     Figma "Comunicação"     18862:8575
  SiteFooter.tsx      + SiteFooter.module.css      Figma "Footer"          18862:8583
lib/marketing/nav.ts  nav link registry, shared by header and footer
```

Hover states are designed in `18916:9438` (buttons) and `18916:9437` (communication cards).

CSS Modules are new to this repository — everything today is global CSS with Portuguese BEM
class names. The pattern is confined to `components/marketing/`; `mapa.css` and
`relatorio.css` keep their current approach. The justification is specific to this task: the
landing is being rebuilt whole, which is the one moment when orphan CSS can be made
structurally impossible — deleting a section deletes its styles with it. Today's
`globals.css` is 1589 lines and nobody can say which rules are still live.

### 3.4 Parallel work contract

Several people will implement this at once, so exactly one task creates the shared files.
Task 1 writes `layout.tsx`, `globals.css` and `page.tsx`, and creates all seven section
components as stubs that render their own `<section id>` wrapper and nothing else. Every
later section task then touches only its own `.tsx` and `.module.css`, and no two tasks ever
edit the same file. Section tasks 4–10 can run in any order and in parallel.

## 4. Content

### 4.1 Parked modules

The removed sections' data moves to `lib/content/`, following the pattern already set by
`lib/content/comunicacao.ts`:

- `lib/content/dimensoes.ts` — the seven `DIMENSOES` cards (ecological functions and
  territorial uses), with their sources.
- `lib/content/ameacas.ts` — the `AMEACAS` entries.
- `lib/content/frentes.ts` — the six `FRENTES`.

These are unused until the internal pages exist. That is a deliberate, recorded cost.

### 4.2 Sections that disappear from the landing

`ameacas`, `frentes`, `formacao`, `caatinga` (with `Sazonalidade`) and `faixa-cta`. The
components `Sazonalidade.tsx` and `PhotoCarousel.tsx` become unused and are deleted;
`HeroBackground.tsx` is absorbed into the new `Hero`.

**`lib/phenology.ts` and `lib/ndfi-series.json` must not be deleted.** They are used by
`components/mapa/{Header,Mapa,Welcome}.tsx`, `config/mapa/platforms.ts`, `lib/color.ts` and
`lib/mapa/store.ts`. Only the landing's consumer goes away.

### 4.3 Comunicação

`getComunicacaoContent(client)` already exists and already reads Contentful with local
defaults. The Figma section shows exactly two cards — one badged "CARTILHA" and one "CADERNO
TEMÁTICO" — while the module ships four cartilhas plus one caderno. The section renders the
caderno and `cartilhas[0]`, so the choice is deterministic.

## 5. Flagged for the user, not blocking

1. **"Entrar" vs. the auth gate.** The Figma header has an "Entrar" button, but
   `app/(marketing)/layout.tsx:36` redirects anyone without a session to `/login`. Whoever
   sees this header is already authenticated, so "Entrar" can never be correct. The slot is
   built to carry the session state ("Sair") instead. Making the landing public is a product
   and security decision, out of scope here.
2. **A numeric discrepancy.** The Figma highlight card reads **40%** "das remoções de gases de
   efeito estufa do Brasil em 2022"; `page.tsx:34` reads **48%** "da remoção bruta de carbono
   do país". Both may be right (all greenhouse gases vs. carbon alone), but the content owner
   should confirm before publication.
3. **The orange leaves the identity.** `--laranja #ce8b44` and its derivatives have no
   counterpart in Figma. Nothing is left orphaned, because the sections that used it are the
   ones being removed, but this is a real change of identity worth confirming.
4. **The seasonal palette story is lost from the landing.** `Sazonalidade` explained that the
   product's colour identity was measured from a 40-year NDFI series rather than chosen. The
   map module still derives its monthly accent from exactly that series, so after this change
   the platform uses a palette it no longer explains anywhere.
5. **The cartilha title does not match.** The Figma card reads "Mercado de carbono: o que isso
   tem a ver com a Caatinga?", which is not any of the four volumes in `DEFAULT_CARTILHAS`
   (the nearest is "A Caatinga e o carbono: qual a relação?"). Treated as new copy pending
   confirmation; the code renders whatever `cartilhas[0]` holds.

## 6. Verification

**There is no component test infrastructure in this repository.** `vitest.config.mts` sets
`environment: 'node'` and `include: ['tests/**/*.test.ts']` — `.ts` only, no jsdom, no
Testing Library. All 29 existing tests cover pure logic, data modules and route handlers.
Component-level TDD is therefore not available without inventing infrastructure, which is
outside this task's scope.

What is tested instead, in the repository's established style:

- the parked content modules, as `tests/lib/comunicacaoContent.test.ts` tests its own module;
- the nav registry, asserting that every in-page anchor matches a section id the page
  actually renders — this is what catches a dead link after five sections are removed;
- the token palette, asserting WCAG AA (4.5:1) for each text-on-background pair, mirroring
  the existing `npm run contrast` check for the map's monthly accents.

Measured with `contrast()` from `lib/color.ts` before writing the plan:

```
17.25:1  --bg-texto-primario            on --bg-fundo
14.80:1  --bg-texto-secundario          on --bg-fundo
19.26:1  --bg-texto-sobre-inverso       on --bg-fundo-inverso
 4.86:1  --role-marca-ancora-texto-sobre on --role-marca-ancora-padrao
 5.76:1  --role-primario-texto-sobre    on --role-categorica1-padrao
 2.50:1  --role-neutro-texto-desabilitado on --bg-fundo        ← excluded, see below
```

Two consequences. White on the anchor green clears AA by 0.36 and nothing more, so any future
lightening of `#587c22` breaks it — the palette test is what will catch that.
`--role-neutro-texto-desabilitado` is deliberately **not** in the asserted pairs: WCAG 1.4.3
exempts inactive controls, and it is only ever used for the inert English option in the header
language control. It must not be used for informative text, which at 2.50:1 would be
unreadable.

The visual layer is verified by `npm run build`, `npm run lint`, `npm test`, and a browser
pass against the Figma frame at 1440px and at 390px.

Note that CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run build` and `npm run
contrast` only — `npm test` and `npm run lint` must be run locally.

## 7. Out of scope

Internationalisation; the internal pages the menu implies; any change to `/mapa`,
`/relatorio` or `/login`; making the landing public; component test infrastructure.
