# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page at `/` with the institutional page designed in Figma, rebuilt as one component per section with co-located CSS Modules.

**Architecture:** `app/(marketing)/page.tsx` becomes pure composition over seven section components under `components/marketing/`, each owning a `.module.css`. `app/globals.css` shrinks to reset, the Figma token layer and typography. Removed editorial copy is parked in `lib/content/` modules for the internal pages that do not exist yet.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, CSS Modules (new here), Rubik via `next/font/google`, Vitest (node environment).

**Spec:** `docs/superpowers/specs/2026-09-18-landing-redesign-design.md` — read it before Task 1. It records the seven decisions this plan implements and five items flagged for the content owner.

## Global Constraints

Every task's requirements implicitly include this section.

- **Branch:** all work goes on `feat/landing-redesign`, cut from `origin/main`. `feat/rename-to-caativar` is already merged, so nothing is stacked.
- **Language:** code, comments and documentation in **English**. User-facing UI strings in **Portuguese (pt-BR)** — the product is for a Brazilian audience. An English comment quoting a UI label keeps it verbatim (`"Área desenhada"`).
- **The platform name is Caativar**, feminine in Portuguese copy ("a Caativar").
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`). **Never append co-author or AI attribution trailers** — the repository has a single author.
- **Route isolation:** `app/(marketing)/`, `app/(mapa)/` and `app/(auth)/` are sibling root layouts. **Never create `app/layout.tsx`.** Do not modify `app/mapa.css`, `app/relatorio.css`, or anything under `app/(mapa)/`, `app/(auth)/`, `components/mapa/`, `components/relatorio/`.
- **Cross-route links use `<a href>`, never `next/link`** — crossing a route group is a full page load. Within the marketing group, `next/link` is correct.
- **Never delete `lib/phenology.ts` or `lib/ndfi-series.json`.** The map module depends on both (`components/mapa/{Header,Mapa,Welcome}.tsx`, `config/mapa/platforms.ts`, `lib/color.ts`, `lib/mapa/store.ts`). Only the landing's consumer goes away.
- **Figma:** file key `hzQi2FcgZuGSGSP6NaeLdY`, page "Site/ portal", frame `18862:8514`. Design context is pulled per node with the Figma MCP; **load the `figma-design-to-code` skill before calling `get_design_context`**, and pass `skillNames: "figma-design-to-code"`.
- **Figma output is a reference, never final code.** It returns React + Tailwind; this repository uses CSS Modules and plain CSS. Translate every value to the tokens defined in Task 2 — no raw hex in a section's CSS.
- **Icons and images come from exported assets.** Never hand-write `<svg>`/`<path>` for a Figma icon; you do not have the vector data. Asset URLs expire in about 7 days, so download and commit the bytes under `public/`.
- **Tokens only.** If a section needs a colour with no token, stop and raise it rather than inventing a hex value.
- **Verification commands:** `npm run build`, `npm run lint`, `npm test`. CI runs only `npm ci`, `npm run build` and `npm run contrast`, so **lint and tests must be run locally**.
- **No component test infrastructure exists** (`environment: 'node'`, `include: ['tests/**/*.test.ts']`, no jsdom, no Testing Library). Data and pure logic are unit-tested; the visual layer is verified by build, lint and a browser pass. Do not add testing infrastructure as a side effect of a section task.

## Task Graph

```
Task 1 (park content) ──┐
                        ├──> Task 2 (foundation, BLOCKING) ──> Tasks 3,4,5,6,7,8,9 (parallel) ──> Task 10
                        │
Task 1 must land before Task 2, because Task 2 deletes the page that holds the data.
Tasks 3–9 touch disjoint files and may be done by different people at the same time.
```

---

## Task 1: Park the removed landing content

Pure addition — creates modules and tests, deletes nothing. Must land before Task 2, which deletes the page these arrays currently live in.

**Files:**
- Create: `lib/content/dimensoes.ts`
- Create: `lib/content/ameacas.ts`
- Create: `lib/content/frentes.ts`
- Create: `tests/lib/parkedContent.test.ts`
- Read (do not modify): `app/(marketing)/page.tsx:30-192`

**Interfaces:**
- Consumes: nothing.
- Produces: `Dimensao`, `Ameaca`, `Frente` types and the `DIMENSOES`, `AMEACAS`, `FRENTES` constants. Nothing in this plan imports them — they exist for the internal pages the menu implies. Do not wire them into the landing.

- [ ] **Step 1: Read the source arrays**

Open `app/(marketing)/page.tsx` and read lines 30–192. Three arrays live there: `DIMENSOES` (7 entries), `AMEACAS`, `FRENTES` (6 entries). Copy them **verbatim** — the Portuguese copy and the `fonte` citations are authored scientific content and must not be paraphrased, reordered or re-typed by hand.

- [ ] **Step 2: Write the failing test**

Create `tests/lib/parkedContent.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DIMENSOES } from '@/lib/content/dimensoes'
import { AMEACAS } from '@/lib/content/ameacas'
import { FRENTES } from '@/lib/content/frentes'

describe('parked landing content', () => {
  it('keeps the seven dimensoes in their published order', () => {
    // The first four describe ecological functions the biome performs by its own
    // process; the next three, uses society makes of its territory. The section
    // introduction depends on that split, so the order is part of the content.
    expect(DIMENSOES).toHaveLength(7)
    expect(DIMENSOES[0].num).toBe('48%')
    expect(DIMENSOES[0].titulo).toBe('Da remoção bruta de carbono do país')
    expect(DIMENSOES[0].fonte).toBe('DA COSTA et al. (2025); MENDES et al. (2023; 2025)')
  })

  it('carries a source citation on every dimensao', () => {
    for (const d of DIMENSOES) {
      expect(d.fonte.trim()).not.toBe('')
    }
  })

  it('keeps the six frentes', () => {
    expect(FRENTES).toHaveLength(6)
  })

  it('preserves all ten ameacas entries', () => {
    expect(AMEACAS).toHaveLength(10)
    expect(AMEACAS[0].num).toBe('8,6 mi ha')
    expect(AMEACAS[0].fonte).toBe('MAPBIOMAS, Coleção 9 (2025)')
  })

  it('names frentes icons as strings, keeping the data module free of React', () => {
    expect(FRENTES[0].icon).toBe('FaLayerGroup')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/lib/parkedContent.test.ts`
Expected: FAIL — cannot resolve `@/lib/content/dimensoes`.

- [ ] **Step 4: Create the three modules**

`lib/content/dimensoes.ts`, following the shape already used by `lib/content/comunicacao.ts`:

```ts
// Editorial content from the first landing page, parked here when the page was
// rebuilt to the Figma design in September 2026. The Figma home has no section
// for it; it is kept verbatim, citations included, for the internal pages the
// menu implies ("Conheça a plataforma"). Nothing imports this yet.
export type Dimensao = {
  cor: string
  num: string
  titulo: string
  texto: string
  fonte: string
}

export const DIMENSOES: Dimensao[] = [
  // ... the seven entries, copied verbatim from the old page.tsx:30-88
]
```

Give `lib/content/ameacas.ts` and `lib/content/frentes.ts` the same treatment, each with its
own type (`Ameaca`, `Frente`) matching the fields actually present in the source array, and the
same header comment adapted. `Ameaca` is `{ num: string; texto: string; fonte: string }`.

**One deliberate departure from copying verbatim.** `FRENTES` entries carry
`icon: FaLayerGroup` — a React component imported from `react-icons/fa6`. Store the icon as
its **name string** instead (`icon: 'FaLayerGroup'`), so `Frente` is
`{ icon: string; color: string; title: string; text: string }` and the module stays pure data,
like `lib/content/comunicacao.ts`. Whichever page renders these later maps the name back to a
component. Copying the reference verbatim would pull React and an icon library into a data
module for no gain.

The `cor` / `color` hex values in `DIMENSOES` and `FRENTES` belong to the old palette
(`#5f7030` and friends), which this redesign replaces. Keep them as they are — this is
archived content, and whoever builds the internal pages restyles it against the new tokens.
Note that in each module's header comment.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/lib/parkedContent.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/content/dimensoes.ts lib/content/ameacas.ts lib/content/frentes.ts tests/lib/parkedContent.test.ts
git commit -m "refactor: park the landing's editorial content in lib/content"
```

---

## Task 2: Foundation — tokens, typeface, page shell, nav registry

**BLOCKING.** This is the only task that touches the shared files. It creates every section component as a stub so that Tasks 3–9 each touch nothing but their own two files.

**Files:**
- Modify: `app/(marketing)/layout.tsx:6,10-14,38` (font)
- Rewrite: `app/globals.css`
- Rewrite: `app/(marketing)/page.tsx`
- Create: `lib/marketing/nav.ts`
- Create: `components/marketing/{SiteHeader,Hero,Destaques,Plataforma,Ferramenta,Comunicacao,SiteFooter}.tsx` (stubs)
- Create: `components/marketing/{SiteHeader,Hero,Destaques,Plataforma,Ferramenta,Comunicacao,SiteFooter}.module.css` (empty)
- Create: `tests/lib/marketingNav.test.ts`
- Create: `tests/lib/marketingPalette.test.ts`
- Delete: `components/SiteHeader.tsx`, `components/Sazonalidade.tsx`, `components/PhotoCarousel.tsx`

**Interfaces:**
- Consumes: `MAPA_URL` from `@/lib/config`; `contrast` from `@/lib/color`.
- Produces, and every section task depends on these exact names:
  - `lib/marketing/nav.ts`: `type NavLink = { href: string; label: string; external: boolean }`, `SECTION_IDS: readonly string[]`, `HEADER_LINKS: NavLink[]`, `FOOTER_LINKS: NavLink[]`, `MAPA_LINK: NavLink`.
  - The CSS custom properties listed in Step 3. **Section CSS must use only these.**
  - Each stub exports a default React component taking no props, except `Comunicacao`, whose signature is fixed in Task 8.

- [ ] **Step 1: Write the failing nav test**

Create `tests/lib/marketingNav.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { FOOTER_LINKS, HEADER_LINKS, SECTION_IDS } from '@/lib/marketing/nav'

describe('marketing nav registry', () => {
  // Five sections are being removed from the landing. This is the check that
  // catches a menu entry left pointing at a section that no longer renders.
  it('points every in-page anchor at a section the page renders', () => {
    for (const link of [...HEADER_LINKS, ...FOOTER_LINKS]) {
      if (link.external) continue
      expect(link.href.startsWith('#')).toBe(true)
      expect(SECTION_IDS).toContain(link.href.slice(1))
    }
  })

  it('sends external links away from the marketing route group', () => {
    for (const link of [...HEADER_LINKS, ...FOOTER_LINKS]) {
      if (!link.external) continue
      expect(link.href.startsWith('#')).toBe(false)
    }
  })

  it('labels the navigation in Portuguese', () => {
    expect(HEADER_LINKS.map((l) => l.label)).toEqual([
      'Início',
      'Conheça a plataforma',
      'Comunicação',
    ])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/marketingNav.test.ts`
Expected: FAIL — cannot resolve `@/lib/marketing/nav`.

- [ ] **Step 3: Write the nav registry**

Create `lib/marketing/nav.ts`:

```ts
import { MAPA_URL } from '@/lib/config'

// Navigation shared by the header and the footer. In-page anchors must match the
// section ids rendered by app/(marketing)/page.tsx; tests/lib/marketingNav.test.ts
// holds the two together. "Ver mais" buttons from the Figma design are omitted on
// purpose: the internal pages they point at do not exist yet.
export type NavLink = {
  href: string
  label: string
  external: boolean
}

// Section ids rendered on the landing, in document order.
export const SECTION_IDS = [
  'inicio',
  'destaques',
  'plataforma',
  'ferramenta',
  'comunicacao',
] as const

// The map lives in another route group, so it is a full page load, not a <Link>.
export const MAPA_LINK: NavLink = { href: MAPA_URL, label: 'Mapas', external: true }

export const HEADER_LINKS: NavLink[] = [
  { href: '#inicio', label: 'Início', external: false },
  { href: '#plataforma', label: 'Conheça a plataforma', external: false },
  { href: '#comunicacao', label: 'Comunicação', external: false },
]

export const FOOTER_LINKS: NavLink[] = [
  { href: '#inicio', label: 'Home', external: false },
  { href: '#plataforma', label: 'Sobre', external: false },
  { href: '#comunicacao', label: 'Comunicação', external: false },
  MAPA_LINK,
]
```

- [ ] **Step 4: Run the nav test to verify it passes**

Run: `npx vitest run tests/lib/marketingNav.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing palette test**

Create `tests/lib/marketingPalette.test.ts`. It reuses `contrast` from `lib/color.ts` rather than reimplementing WCAG maths:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrast } from '@/lib/color'

// Reads the tokens straight out of the stylesheet, so the test fails if someone
// edits a value in CSS without checking it. Mirrors what scripts/check-contrast.mts
// does for the map's monthly accents.
function tokens(): Record<string, string> {
  const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
  const root = css.match(/:root\s*\{([^}]*)\}/)
  if (!root) throw new Error('no :root block in app/globals.css')
  const found: Record<string, string> = {}
  for (const [, name, value] of root[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    found[name] = value.trim()
  }
  return found
}

// Text-on-background pairs the design actually uses, from the Figma home frame.
const PAIRS: [string, string][] = [
  ['--bg-texto-primario', '--bg-fundo'],
  ['--bg-texto-secundario', '--bg-fundo'],
  ['--bg-texto-sobre-inverso', '--bg-fundo-inverso'],
  ['--role-marca-ancora-texto-sobre', '--role-marca-ancora-padrao'],
  ['--role-primario-texto-sobre', '--role-categorica1-padrao'],
]

describe('landing palette', () => {
  it('defines every token the pairs reference', () => {
    const t = tokens()
    for (const [fg, bg] of PAIRS) {
      expect(t[fg], `${fg} missing`).toBeDefined()
      expect(t[bg], `${bg} missing`).toBeDefined()
    }
  })

  it('clears WCAG AA for normal text on every pair', () => {
    const t = tokens()
    for (const [fg, bg] of PAIRS) {
      expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run tests/lib/marketingPalette.test.ts`
Expected: FAIL — the tokens do not exist in `app/globals.css` yet.

- [ ] **Step 7: Rewrite the token layer in `app/globals.css`**

Replace the whole file. Keep the file-header comment explaining route isolation. The `:root` block:

```css
:root {
  /* Design tokens from the Figma design system (file hzQi2FcgZuGSGSP6NaeLdY).
   * Names mirror the Figma variables lowercased and hyphenated, so the mapping
   * back to the design file stays mechanical: ROLE-MarcaAncora-Padrao becomes
   * --role-marca-ancora-padrao. */
  --role-marca-ancora-padrao: #587c22;
  --role-marca-ancora-hover: #47651b;
  --role-marca-ancora-pressionado: #374d15;
  --role-marca-ancora-texto-sobre: #ffffff;
  --role-categorica1-padrao: #27725b;
  --role-categorica2-hover: #002430;
  --role-neutro-borda: #526f78;
  --role-neutro-texto-desabilitado: #94a6ac;
  --role-primario-texto-sobre: #ffffff;
  --role-terciario-texto-sobre: #ffffff;
  --ctx-atencao-texto-sobre: #ffffff;
  --ctx-positivo-texto-sobre: #ffffff;

  --bg-fundo: #fefefb;
  --bg-fundo-inverso: #000f15;
  --bg-texto-primario: #001d27;
  --bg-texto-secundario: #002b39;
  --bg-texto-sobre-inverso: #fefefb;
  --bg-borda: #526f78;
  --bg-overlay: #000f1580;

  --am-100: #e6eaeb;
  --am-200: #bfcace;
  --am-400: #526f78;
  --ar-050: #fefefb;
  --cb-400: #72ae9b;

  --radius: 8px;
  --radius-interno: 6px;
  --borda-largura: 2px;
  --espaco: 8px;
  --shadow: 0 1px 3px #0000001a, 0 1px 2px -1px #0000001a;

  --font-fallback: "Rubik", system-ui, sans-serif;
}
```

Then the reset and base typography (Rubik scale from the spec), and **nothing else**. Every
section rule from the old file goes; the sections own their styles from now on. The three
shadcn leftovers in the Figma library (`var(--card)`, `var(--foreground)`,
`var(--primary-foreground)`) are deliberately not imported — see spec §3.2.

- [ ] **Step 8: Swap Raleway for Rubik**

In `app/(marketing)/layout.tsx`, change the import and the font call, keeping the
`--font-sans` variable name the CSS already reads:

```ts
import { Rubik } from "next/font/google";

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});
```

and `<body className={rubik.variable}>`. Leave the auth redirect at line 36 untouched.

- [ ] **Step 9: Create the seven stubs**

Each stub renders its section wrapper with the id from `SECTION_IDS` and nothing inside, so
anchors resolve from the first commit. For example, `components/marketing/Destaques.tsx`:

```tsx
import styles from "./Destaques.module.css";

// Filled in by Task 5. The wrapper and its id ship now so the nav anchors resolve.
export default function Destaques() {
  return <section id="destaques" className={styles.destaques} aria-label="Destaques" />;
}
```

`SiteHeader` and `SiteFooter` render `<header>` and `<footer>` instead, with no id. `Hero`
uses `id="inicio"`, `Plataforma` `id="plataforma"`, `Ferramenta` `id="ferramenta"`,
`Comunicacao` `id="comunicacao"`. Create an empty `.module.css` beside each.

**The `Comunicacao` stub is the one exception: it must already take its prop**, because
`page.tsx` in step 10 passes `conteudo` and the build in step 12 would otherwise fail
type-checking. Give it the final signature now and ignore the value:

```tsx
import type { ComunicacaoContent } from "@/lib/content/comunicacao";
import styles from "./Comunicacao.module.css";

// Filled in by Task 8. The prop is declared now because page.tsx already passes it.
export default function Comunicacao({ conteudo }: { conteudo: ComunicacaoContent }) {
  void conteudo;
  return <section id="comunicacao" className={styles.comunicacao} aria-label="Comunicação" />;
}
```

- [ ] **Step 10: Rewrite `app/(marketing)/page.tsx` as composition**

```tsx
import SiteHeader from "@/components/marketing/SiteHeader";
import Hero from "@/components/marketing/Hero";
import Destaques from "@/components/marketing/Destaques";
import Plataforma from "@/components/marketing/Plataforma";
import Ferramenta from "@/components/marketing/Ferramenta";
import Comunicacao from "@/components/marketing/Comunicacao";
import SiteFooter from "@/components/marketing/SiteFooter";
import { getContentfulClient } from "@/lib/contentful";
import { getComunicacaoContent } from "@/lib/content/comunicacao";

export default async function LandingPage() {
  const conteudo = await getComunicacaoContent(getContentfulClient());

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Destaques />
        <Plataforma />
        <Ferramenta />
        <Comunicacao conteudo={conteudo} />
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 11: Delete the superseded components**

```bash
git rm components/SiteHeader.tsx components/Sazonalidade.tsx components/PhotoCarousel.tsx
```

Keep `components/HeroBackground.tsx` — Task 4 absorbs it and deletes it there. **Do not touch
`lib/phenology.ts` or `lib/ndfi-series.json`**, which `Sazonalidade` used but the map module
still needs.

- [ ] **Step 12: Verify**

```bash
npx vitest run tests/lib/marketingNav.test.ts tests/lib/marketingPalette.test.ts
npm run lint
npm run build
```
Expected: tests PASS; lint clean; build succeeds. The page renders header, five empty
sections and footer.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: rebuild the landing foundation on the Figma design system"
```

---

## Tasks 3–9: the sections

**These seven tasks are independent and may run in parallel.** Each touches only its own
`.tsx` and `.module.css` (plus, where stated, one content module and its test). None of them
edits `page.tsx`, `globals.css` or `nav.ts`.

Every section task follows the same five-step rhythm. It is written out in full for Task 3;
Tasks 4–9 give their own node ids, content and acceptance criteria, and repeat the rhythm.

---

## Task 3: SiteHeader

**Files:**
- Modify: `components/marketing/SiteHeader.tsx`, `components/marketing/SiteHeader.module.css`
- Create: assets under `public/logos/` as the design requires

**Interfaces:**
- Consumes: `HEADER_LINKS`, `MAPA_LINK` from `@/lib/marketing/nav`; tokens from Task 2.
- Produces: nothing other tasks import.

- [ ] **Step 1: Pull the design context**

Load the `figma-design-to-code` skill, then call `get_design_context` with
`fileKey: "hzQi2FcgZuGSGSP6NaeLdY"`, `nodeId: "18862:8515"`,
`skillNames: "figma-design-to-code"`. Hover states for the buttons are in node `18916:9438`.

- [ ] **Step 2: Download and commit the assets**

Call `download_assets` on the same node. Commit the logo and icon files under `public/logos/`
and reference them by that path — **never** by the `figma.com/api/mcp/asset/...` URL, which
expires in about a week.

- [ ] **Step 3: Implement**

The bar is 76px tall at 1436px wide and holds, left to right: the Caativar mark with the
"assinatura institucional" line; the nav from `HEADER_LINKS`; a "Mapas" button using
`MAPA_LINK`; the PT-BR / En control; and the session slot.

Two rules that are not in the design file:

1. **The PT-BR / En control is inert.** Render it as designed, with "PT-BR" active, and mark
   the English option `aria-disabled="true"` with `title="Disponível em breve"`. It changes
   nothing. Internationalisation is out of scope (spec §2, decision 4).
2. **The "Entrar" button is replaced by the session state.** The marketing layout redirects
   unauthenticated visitors to `/login`, so whoever sees this header is already signed in and
   "Entrar" could never be right. Render "Sair" in that slot instead, pointing at the existing
   logout route. Keep the Figma button geometry (114×40, radius `--radius`).

Links inside the marketing group use `next/link`; `MAPA_LINK` crosses a route group and must
be a plain `<a href>`.

Carry over the mobile behaviour the old header had. Task 2 deleted that file, so read it from
git history: `git show $(git log -1 --format=%H -- components/SiteHeader.tsx)^:components/SiteHeader.tsx`.
It gave: a hamburger below 901px, body scroll locked while open, Escape closes,
and the panel auto-closes when the viewport widens. The Figma "Menu expandido mobile"
component (`8702:48799`) shows the intended mobile treatment.

- [ ] **Step 4: Verify**

```bash
npm run lint && npm run build
```
Then open `http://localhost:3000` (`npm run dev`) and compare against the Figma frame at
**1440px** and **390px**. Check: keyboard tab order reaches every link and the session
button; the nav anchors scroll to their sections; no raw hex in `SiteHeader.module.css`.

- [ ] **Step 5: Commit**

```bash
git add components/marketing/SiteHeader.tsx components/marketing/SiteHeader.module.css public/logos
git commit -m "feat: build the landing header from the Figma design"
```

---

## Task 4: Hero

**Files:**
- Modify: `components/marketing/Hero.tsx`, `components/marketing/Hero.module.css`
- Delete: `components/HeroBackground.tsx`
- Assets: photos already live in `public/images/hero/hero1..5.jpg`

**Interfaces:**
- Consumes: `MAPA_LINK` from `@/lib/marketing/nav`; tokens from Task 2.
- Produces: nothing other tasks import.

- [ ] **Step 1: Pull the design context**

`nodeId: "18862:8516"` (495px tall, sits under the 76px header).

- [ ] **Step 2: Absorb `HeroBackground`**

`components/HeroBackground.tsx` (38 lines) already rotates a photo background and is used
nowhere else after Task 2. Move its logic into `Hero.tsx`, adapt it to the Figma composition,
then `git rm components/HeroBackground.tsx` in this task's commit.

- [ ] **Step 3: Implement**

Over the photo, a gradient (`Gradient`, node `18862:8520`) and a left-aligned content column
inset 80px:

- eyebrow, `subtle-semibold`: `"Mercado de Carbono na Caatinga"`
- h1: `"Dados abertos e mapas para entender o carbono do bioma e decidir com mais segurança"` — **the h1 has no bound Figma variable; read its real size, weight and line height off node `18862:8525`** and add the value to the typography scale in `Hero.module.css`.
- lead: `"Informação aberta para que comunidades e gestores avaliem projetos de carbono e negociem em condições mais justas."`
- two buttons: `"Abrir os mapas"` (primary, → `MAPA_LINK`, plain `<a href>`) and `"Ver materiais"` (secondary, → `#comunicacao`)
- carousel dots bottom-left (node `18862:8531`): the active dot is a 26×6 pill, the others 6×6 circles
- a photo credit overlay bottom-right (node `18862:8536`) reading `"Foto: [nome da equipe]"` — **this is placeholder copy in the design.** Drive it from the photo data instead of hardcoding it, and if no credit is known, do not render the overlay at all.

Dots must be real buttons with `aria-label`, as the old carousel had, not decorative divs.

- [ ] **Step 4: Verify**

`npm run lint && npm run build`, then the browser at 1440px and 390px. Check: the h1 does not
overflow at 390px; rotation pauses on `prefers-reduced-motion`; the dots are keyboard
reachable; text over the photo still clears 4.5:1 against the darkest frame of the gradient.

- [ ] **Step 5: Commit**

```bash
git add components/marketing/Hero.tsx components/marketing/Hero.module.css
git rm components/HeroBackground.tsx
git commit -m "feat: build the landing hero from the Figma design"
```

---

## Task 5: Destaques

**Files:**
- Modify: `components/marketing/Destaques.tsx`, `components/marketing/Destaques.module.css`
- Create: `lib/content/destaques.ts`, `tests/lib/destaquesContent.test.ts`

**Interfaces:**
- Consumes: tokens from Task 2.
- Produces: `type Destaque = { icone: string; rotulo: string; numero: string; unidade: string; texto: string }` and `DESTAQUES: Destaque[]` from `@/lib/content/destaques`. Nothing else imports them.

- [ ] **Step 1: Pull the design context**

`nodeId: "18862:8538"` for the band; the card component is `8689:52527` ("Cards de indicadores em destaque") on the Componentes page.

- [ ] **Step 2: Write the failing content test**

Create `tests/lib/destaquesContent.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DESTAQUES } from '@/lib/content/destaques'

describe('destaques content', () => {
  it('ships the four cards the design lays out', () => {
    expect(DESTAQUES).toHaveLength(4)
  })

  it('separates the figure from its unit, so the card can size them apart', () => {
    // The design sets the number at display size and the unit at body size.
    expect(DESTAQUES[0].numero).toBe('26')
    expect(DESTAQUES[0].unidade).toBe('milhões')
    expect(DESTAQUES[3].numero).toBe('1,5–5')
    expect(DESTAQUES[3].unidade).toBe('t CO₂/ha/ano')
  })

  it('writes figures in Brazilian Portuguese notation', () => {
    for (const d of DESTAQUES) {
      expect(d.numero).not.toMatch(/\d\.\d/) // a decimal point would be en-US
    }
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/lib/destaquesContent.test.ts`
Expected: FAIL — cannot resolve `@/lib/content/destaques`.

- [ ] **Step 4: Write the content module**

```ts
// The four highlight cards, copy taken from the Figma home frame (18862:8538).
// Numbers are kept apart from their units because the card renders them at
// different sizes.
export type Destaque = {
  icone: string
  rotulo: string
  numero: string
  unidade: string
  texto: string
}

export const DESTAQUES: Destaque[] = [
  {
    icone: '/icons/destaques/populacao.svg',
    rotulo: 'População do bioma',
    numero: '26',
    unidade: 'milhões',
    texto: 'de pessoas vivem no bioma.',
  },
  {
    icone: '/icons/destaques/remocao.svg',
    rotulo: 'Remoção de GEE',
    numero: '40',
    unidade: '%',
    texto:
      'das remoções de gases de efeito estufa do Brasil em 2022, mais do que qualquer outro bioma.',
  },
  {
    icone: '/icons/destaques/eficiencia.svg',
    rotulo: 'Eficiência de carbono',
    numero: '60',
    unidade: '%',
    texto: 'de eficiência no uso do carbono, uma das maiores do Brasil e do mundo.',
  },
  {
    icone: '/icons/destaques/capacidade.svg',
    rotulo: 'Capacidade de remoção',
    numero: '1,5–5',
    unidade: 't CO₂/ha/ano',
    texto: 'de capacidade de remoção de carbono.',
  },
]
```

Adjust the icon paths to the filenames `download_assets` actually produced.

> **Known discrepancy, do not silently resolve.** The 40% card says "das remoções de gases de
> efeito estufa do Brasil em 2022", while the old landing said **48%** "da remoção bruta de
> carbono do país" (now in `lib/content/dimensoes.ts`). Both may be correct — all greenhouse
> gases versus carbon alone — but the content owner has not confirmed. Ship the Figma copy and
> leave this note in the module as a comment.

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run tests/lib/destaquesContent.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Implement the band**

Section label `"Destaques"` in `subtle-semibold`, then a four-column grid, 301px cards with a
24px gutter, collapsing to two columns then one on narrow viewports. Each card: a dark green
header strip (`--role-marca-ancora-padrao`) carrying the icon and `rotulo` in
`--role-marca-ancora-texto-sobre`, then a white body with `numero` at display size beside
`unidade`, and `texto` in `body`. Card radius `--radius`, elevation `--shadow`.

- [ ] **Step 7: Verify**

`npm run lint && npm run build`, browser at 1440px and 390px. Check the grid reflows without
a horizontal scrollbar and the icons are the exported assets, not hand-written SVG.

- [ ] **Step 8: Commit**

```bash
git add components/marketing/Destaques.* lib/content/destaques.ts tests/lib/destaquesContent.test.ts public/icons
git commit -m "feat: build the landing highlights band from the Figma design"
```

---

## Task 6: Plataforma (tabbed section)

**Files:**
- Modify: `components/marketing/Plataforma.tsx`, `components/marketing/Plataforma.module.css`
- Create: `lib/content/plataforma.ts`, `tests/lib/plataformaContent.test.ts`

**Interfaces:**
- Consumes: tokens from Task 2.
- Produces: `type AbaPlataforma = { id: string; label: string; conteudo: ConteudoAba | null }` and `ABAS_PLATAFORMA: AbaPlataforma[]` from `@/lib/content/plataforma`.

- [ ] **Step 1: Pull the design context**

`nodeId: "18862:8546"`; the standalone component is `18846:7622` ("Sobre"). The tab component
is `8702:53232` ("tabs") with `8702:53247` ("tab item") on the Componentes page.

- [ ] **Step 2: Write the failing content test**

Create `tests/lib/plataformaContent.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ABAS_PLATAFORMA } from '@/lib/content/plataforma'

describe('plataforma tabs', () => {
  it('declares the four tabs the design shows', () => {
    expect(ABAS_PLATAFORMA.map((a) => a.label)).toEqual([
      'O que é a CaatiVAR?',
      'A Caatinga',
      'Carbono e comunidades',
      'Como funciona',
    ])
  })

  it('only the first tab has content; the other three are awaiting copy', () => {
    expect(ABAS_PLATAFORMA[0].conteudo).not.toBeNull()
    expect(ABAS_PLATAFORMA.slice(1).every((a) => a.conteudo === null)).toBe(true)
  })

  it('gives every tab a slug usable as an anchor and an aria id', () => {
    for (const aba of ABAS_PLATAFORMA) {
      expect(aba.id).toMatch(/^[a-z0-9-]+$/)
    }
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/lib/plataformaContent.test.ts`
Expected: FAIL — cannot resolve `@/lib/content/plataforma`.

- [ ] **Step 4: Write the content module**

Only the first tab is designed; the other three have no copy anywhere and **must not be
invented** (spec §2, decision 6).

```ts
export type ConteudoAba = {
  imagem: string
  imagemAlt: string
  titulo: string
  paragrafos: string[]
  destaque: string
}

export type AbaPlataforma = {
  id: string
  label: string
  // null means the copy has not been written yet: the section renders an empty
  // state for the tab rather than inventing scientific content.
  conteudo: ConteudoAba | null
}

export const ABAS_PLATAFORMA: AbaPlataforma[] = [
  {
    id: 'o-que-e',
    label: 'O que é a CaatiVAR?',
    conteudo: {
      imagem: '/images/plataforma/o-que-e.jpg',
      imagemAlt: 'Vista de um vale da Caatinga com vegetação e cidade ao fundo',
      titulo: 'O que é a CaatiVAR?',
      paragrafos: [
        'A CaatiVAR reúne, em um só lugar e de forma aberta, dados, mapas e conteúdos sobre o carbono da Caatinga. Foi feita para que quem vive no bioma e quem decide sobre ele conheça o que cada território guarda, avalie propostas de projetos de carbono e negocie com mais segurança.',
      ],
      destaque:
        'Informação aberta para que o mercado de carbono respeite o bioma e quem o conserva.',
    },
  },
  { id: 'a-caatinga', label: 'A Caatinga', conteudo: null },
  { id: 'carbono-e-comunidades', label: 'Carbono e comunidades', conteudo: null },
  { id: 'como-funciona', label: 'Como funciona', conteudo: null },
]
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run tests/lib/plataformaContent.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Implement the section**

A client component (`"use client"`) — the tabs hold selection state. Above the tab strip:
the label `"Conheça a plataforma"`. **The "Ver mais" button in the design is omitted**; there
is no page to link to (spec §2, decision 5).

Follow the WAI-ARIA tabs pattern, which the Figma file does not specify: `role="tablist"` on
the strip, `role="tab"` with `aria-selected` and `aria-controls` on each tab, `role="tabpanel"`
with `aria-labelledby` on the panel, arrow keys moving between tabs, and only the active tab
in the tab order. The active tab carries the underline and
`--role-marca-ancora-padrao`; the others use `--bg-texto-secundario`.

The panel for a tab whose `conteudo` is `null` renders a quiet empty state — one line reading
`"Conteúdo em preparação."` Do not hide the tab and do not disable it; the design shows four.

**Use `--bg-texto-secundario` for that line, not `--role-neutro-texto-desabilitado`.** The
disabled token measures 2.50:1 against `--bg-fundo`; WCAG exempts inactive controls from the
minimum, but this is informative text and would simply be unreadable. `--bg-texto-secundario`
measures 14.80:1. Reach for the disabled token only for the genuinely inert English option in
the header's language control.

For the filled tab: image left (about 200×130, radius `--radius`), text right, with the
`destaque` as a left-bordered pull-quote in `subtle-semibold`.

- [ ] **Step 7: Verify**

`npm run lint && npm run build`, then the browser. Check with the keyboard alone: arrow keys
move between tabs, the panel updates, and focus never lands on a hidden panel. Check at 390px
that the tab strip scrolls horizontally rather than wrapping into a broken grid.

- [ ] **Step 8: Commit**

```bash
git add components/marketing/Plataforma.* lib/content/plataforma.ts tests/lib/plataformaContent.test.ts public/images/plataforma
git commit -m "feat: build the landing platform tabs from the Figma design"
```

---

## Task 7: Ferramenta

**Files:**
- Modify: `components/marketing/Ferramenta.tsx`, `components/marketing/Ferramenta.module.css`

**Interfaces:**
- Consumes: `MAPA_LINK` from `@/lib/marketing/nav`; tokens from Task 2.
- Produces: nothing other tasks import.

- [ ] **Step 1: Pull the design context**

`nodeId: "18862:8547"` — a 560px band split into a map image (729px) and a dark panel (707px).

- [ ] **Step 2: Download the map image**

The left half is a rendered map of the Caatinga over Brazil. Export it via `download_assets`
on node `18862:8548` and commit it under `public/images/`. It is an image in the design, not
a live map — do not pull MapLibre into the landing.

- [ ] **Step 3: Implement**

The right panel sits on `--bg-fundo-inverso` with text in `--bg-texto-sobre-inverso`:

- eyebrow: `"A ferramenta central da plataforma"`
- h2: `"Explore os territórios da Caatinga em detalhes"`
- body: `"Consulte informações sobre diferentes áreas da Caatinga. Localize o território de interesse, combine dados no mapa, acompanhe as mudanças ao longo do tempo e gere um relatório com as informações selecionadas."`
- a four-item list, each with an 8×8 dot marker:
  - `"Dados sobre carbono, vegetação, clima e uso da terra"`
  - `"Consulta por municípios e outros territórios da Caatinga"`
  - `"Comparação entre dados e períodos"`
  - `"Geração de relatório com os dados do território escolhido"`
- a primary button `"Explore os dados"` → `MAPA_LINK`, as a plain `<a href>` (route group crossing)

Below 900px the split stacks: image above, panel below. Mark up the list as a real `<ul>`
with the dots drawn in CSS, not as text bullets.

- [ ] **Step 4: Verify**

`npm run lint && npm run build`, browser at 1440px and 390px. Check the stacked order at 390px
and that the map image has a meaningful `alt`, not an empty one — it carries information.

- [ ] **Step 5: Commit**

```bash
git add components/marketing/Ferramenta.* public/images
git commit -m "feat: build the landing map section from the Figma design"
```

---

## Task 8: Comunicação

**Files:**
- Modify: `components/marketing/Comunicacao.tsx`, `components/marketing/Comunicacao.module.css`
- Read (do not modify): `lib/content/comunicacao.ts`

**Interfaces:**
- Consumes: `ComunicacaoContent`, `Cartilha`, `Caderno` types from `@/lib/content/comunicacao`; tokens from Task 2.
- Produces: the component's props, fixed by Task 2's `page.tsx`:
  ```ts
  export default function Comunicacao({ conteudo }: { conteudo: ComunicacaoContent })
  ```
  Do not change this signature — `page.tsx` belongs to Task 2 and no section task edits it.

- [ ] **Step 1: Pull the design context**

`nodeId: "18862:8575"`; the card component is `18862:7951` ("Card comunicação") and its hover
state is `18916:9437`.

- [ ] **Step 2: Implement**

Heading `"Comunicação"` at h2 size in `--role-marca-ancora-padrao`. **The "Ver mais" button is
omitted** (spec §2, decision 5).

Two cards, 626×480 with a 24px gutter, each a photo with a dark gradient and, at the bottom,
a category label in `subtle-semibold` over a title. Render:

- the caderno from `conteudo.caderno`, labelled `"CADERNO TEMÁTICO"`;
- `conteudo.cartilhas[0]`, labelled `"CARTILHA"`.

`getComunicacaoContent` already merges Contentful with local defaults, so do not fetch
anything here — the data arrives as a prop from the server component.

> **Known discrepancy.** The Figma card reads "Mercado de carbono: o que isso tem a ver com a
> Caatinga?", which is not any of the four volumes in `DEFAULT_CARTILHAS` (the nearest is "A
> Caatinga e o carbono: qual a relação?"). Render whatever `cartilhas[0]` holds rather than
> hardcoding the Figma string, and leave the question to the content owner.

Below 900px the two cards stack. If a card has a PDF (`caderno.pdf`), the whole card is the
link; otherwise it is not interactive.

- [ ] **Step 3: Verify**

`npm run lint && npm run build`, and confirm `npx vitest run tests/lib/comunicacaoContent.test.ts`
still passes — the module is untouched, but the section now depends on its shape. Browser at
1440px and 390px; check the title clears 4.5:1 over the darkest part of each photo gradient.

- [ ] **Step 4: Commit**

```bash
git add components/marketing/Comunicacao.*
git commit -m "feat: build the landing communication section from the Figma design"
```

---

## Task 9: SiteFooter

**Files:**
- Modify: `components/marketing/SiteFooter.tsx`, `components/marketing/SiteFooter.module.css`
- Assets: partner logos under `public/logos/`

**Interfaces:**
- Consumes: `FOOTER_LINKS` from `@/lib/marketing/nav`; tokens from Task 2.
- Produces: nothing other tasks import.

- [ ] **Step 1: Pull the design context**

`nodeId: "18862:8583"`; the symbol is `16864:138883` ("Footer"), 1440×196.

- [ ] **Step 2: Download the partner logos**

Sudene, UFCG and OCA. Export via `download_assets` and commit under `public/logos/`. The OCA
logo already exists at `public/logos/logo_oca.png`; reuse it rather than committing a second
copy.

- [ ] **Step 3: Implement**

On `--bg-fundo-inverso`, three columns: the Caativar mark over the `FOOTER_LINKS` row;
`"Parceiros e apoio"` over the three logos; `"CONTATO"` over the e-mail line.

The design's e-mail reads `"E-mail (ex.: contato@Caativar.gov.br)"` — **that is placeholder
copy, not a real address.** Do not ship it as a `mailto:`. Use the project's real contact
address if you have it; otherwise render the label without a link and flag it in the PR
description.

Each partner logo is an `<img>` with the institution's name as `alt`, not an empty alt — they
are informative, not decorative.

- [ ] **Step 4: Verify**

`npm run lint && npm run build`, browser at 1440px and 390px. Check the columns stack at 390px
and that the logos do not blow up to their intrinsic size (both width and height set
explicitly, never `auto` alone).

- [ ] **Step 5: Commit**

```bash
git add components/marketing/SiteFooter.* public/logos
git commit -m "feat: build the landing footer from the Figma design"
```

---

## Task 10: Cleanup and full verification

Runs after Tasks 3–9 have all landed.

**Files:**
- Delete: whatever is left unreferenced under `public/images/` and `public/logos/`
- Modify: `DOCUMENTACAO.md` (Portuguese — this doc stays in Portuguese)

- [ ] **Step 1: Find dead assets and dead CSS**

```bash
# Images and logos no longer referenced anywhere in the source.
for f in $(find public/images public/logos -type f | sed 's|^public||'); do
  grep -rq "$f" app components lib config || echo "UNREFERENCED: public$f"
done
```

Review the list by hand before deleting — some files may be referenced from Contentful
defaults in `lib/content/comunicacao.ts` or from the parked modules created in Task 1. Delete
only what is genuinely unreachable; **`lib/phenology.ts` and `lib/ndfi-series.json` stay**
regardless of what this search says about the landing, because the map module imports them.

- [ ] **Step 2: Confirm no orphan rules survived in `globals.css`**

```bash
grep -oE '^\.[a-zA-Z0-9_-]+' app/globals.css | sort -u
```
Expected: nothing but the reset and typography helpers. Any section class name here is a
leftover from the old page — remove it. Section styles belong in the modules.

- [ ] **Step 3: Run the whole suite**

```bash
npm test
npm run lint
npm run build
npm run contrast
```
Expected: all pass. `npm run contrast` still covers the map's monthly accents and must not
have regressed — Task 2 did not touch `app/mapa.css`.

- [ ] **Step 4: Browser pass over the whole page**

With `npm run dev`, walk the page at **1440px**, **768px** and **390px**. Check against the
Figma frame: section order, no horizontal scrollbar at any width, every nav anchor lands on
its section, and the tab order runs top to bottom without trapping.

- [ ] **Step 5: Update the documentation**

`DOCUMENTACAO.md` is in Portuguese and stays that way. Record: the landing's new section
structure; that `components/marketing/` uses CSS Modules while the rest of the repository
uses global CSS, and why; the token layer and its mapping back to Figma; and the five open
items from spec §5 that need a decision from the content owner.

- [ ] **Step 6: Commit and open the PR**

```bash
git add -A
git commit -m "chore: remove dead assets and document the landing rebuild"
git push -u origin feat/landing-redesign
```

The PR title and body go in **English**. The body must list the five flagged items from spec
§5 — the "Entrar" button versus the auth gate, the 40%/48% discrepancy, the orange leaving the
palette, the lost seasonal-palette story, and the cartilha title mismatch — so the reviewer
decides on them explicitly rather than discovering them later.

---

## Self-Review

**Spec coverage.** Decisions 1–7 all map to tasks: 1 → Task 2 (page rewritten to the Figma
sections only); 2 → Task 1; 3 → Task 2 steps 7–8; 4 → Task 3 step 3; 5 → Tasks 2 (nav), 6 and
8 (the omitted "Ver mais"); 6 → Task 6; 7 → Task 2 step 9 and Tasks 3–9. Spec §4.2's warning
about `lib/phenology.ts` appears in the global constraints and again in Tasks 2 and 10. Spec
§5's five flagged items are carried into Tasks 3, 5, 8, 9 and the PR body in Task 10. Spec §6's
verification strategy is Tasks 1, 2, 5, 6 (unit tests) and 10 (full pass).

**Placeholders.** None. Where a value genuinely cannot be known before pulling it from Figma —
the h1 type scale, exported icon filenames — the plan says so explicitly and names the node to
read it from, rather than leaving a blank.

**Type consistency.** `NavLink`, `SECTION_IDS`, `HEADER_LINKS`, `FOOTER_LINKS` and `MAPA_LINK`
are defined in Task 2 and consumed under those exact names in Tasks 3, 7 and 9.
`ComunicacaoContent` comes from the existing `lib/content/comunicacao.ts` and fixes the
`Comunicacao` prop signature that Task 2's `page.tsx` already calls. `Destaque` and
`AbaPlataforma` are defined and consumed inside their own tasks. The section ids in
`SECTION_IDS` match the ids the Task 2 stubs render and that Tasks 4–8 keep.
