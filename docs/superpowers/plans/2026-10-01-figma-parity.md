# Figma Parity for the Marketing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the marketing pages (`/`, `/sobre/*`, `/comunicacao`, `/comunicacao/[slug]`) and their hover states match the Figma frames of page "Site/ portal" (file `QKUhlt36bGyTskbONscB3G`, node `2809:9655`), except for the deviations the code already documents with a reason.

**Architecture:** Task 1 lays a shared type foundation:
- it self-hosts Inter as `--font-ui` and Archivo SemiBold as `--font-archivo`;
- it declares Rubik up to weight 800;
- it fixes the h2 letter-spacing;
- it adds the `.text-ui-*` utilities and the `--primary-foreground` token.

 The later tasks are each scoped to one component group and touch only the files that group owns, so they can be reviewed one at a time. All the values come from the Figma nodes, which are cited in comments the way the codebase already does. Each task is verified on a 1436px-wide render (the width of the Figma frame) with the harness in Appendix A.

**Tech Stack:** Next.js 16 (App Router), React 19, strict TypeScript, CSS Modules, `next/font/local`, Vitest 4 (node environment).

**Spec:** The audit in this session, summarised in "Source audit" below. Figma working copy `QKUhlt36bGyTskbONscB3G`, never the original file, which is rate-limited. The second "A ferramenta central da plataforma" section (`19090:30287`, after Comunicação) is a duplicate in the design and is out of scope.

## Global Constraints

- Work in the worktree `/home/ezequias/oca/worktrees/figma-parity`, on branch `fix/figma-parity`, created from `origin/main`. Never switch the branch of the main checkout `/home/ezequias/oca/plataforma-carbono-mvp`.
- Run the tasks in document order: 1, H1–H7, S1, S2, S3, S5, C1–C3, M1–M4, F. There is no S4: the lake re-crop it was is kept on purpose. A rendered check's expected coordinates assume every earlier task has landed, unless the check says otherwise.
- Code, comments and docs in English. UI strings stay in Portuguese, verbatim. When a comment cites a UI label or a value, it quotes it verbatim.
- Every link that crosses a route group stays an `<a href>`, never `next/link` (CLAUDE.md).
- No new npm dependencies. The only new binaries are the two font files of Task 1 (with their OFL licenses) and the photo of Task S5.
- Keep every deviation the code already documents **with a reason**: content owner, AA contrast, issue #44, placeholder data, or "no matching token, so an existing one is reused". Each task's "Kept on purpose" list names the comment. Fix every deviation that is undocumented, whose comment gives no reason, or whose comment is stale.
- Keep the hovers that exist only in code ("Mapas", the hero primary button, the footer links, "Voltar"). **Remove** the Comunicação card photo zoom.
- Keep the labels `"Mapas"` (header) and `"Abrir os mapas"` (hero). The session button keeps `"Sair"`.
- Font metrics come from the `.text-*` / `.text-ui-*` utilities in `app/globals.css`. Module CSS sets colour, spacing and layout, plus one-off metrics only where no utility fits, with the Figma node cited.
- Every `:hover` rule keeps a `:focus-visible` twin.
- CI runs only `npm ci`, `npm run build` and `npm run contrast`, so run `npx vitest run` and `npm run lint` locally before each commit.
- Baselines on `origin/main` (6b0f790), which no task may worsen:
  - `npx tsc --noEmit -p .`: 5 errors, all in `tests/lib/{contentfulSpace,layerVisibility(2),reportService,zonalSeries}.test.ts`;
  - `npm run lint`: 5 problems (3 errors, 2 warnings), all in `components/mapa/`;
  - `npx vitest run`: 65 files passed, 1 skipped; 703 tests passed, 3 skipped.
- Commits use conventional prefixes, are in English, and carry **no `Co-Authored-By` or other attribution trailer**.

## Review Focus

These are the failure modes most likely to reach a visitor that no single task's own tests catch. Each line names where it is pinned.

1. **A module rule still declaring `font-family`, `font-weight` or `line-height` silently overrides a `.text-ui-*` utility.** Both are one class, and the module CSS loads later. The node tests only see class names. Every rendered check therefore asserts the computed family (`f=inter …`, `f=archivo …`), and Tasks M1–M3, C3, H1 and H4 delete the overriding declarations explicitly.
2. **The header between 1200px and 1300px wide.** The nav gets Bold and Inter labels and the session button changes width. The inline row must still fit beside the actions without the hamburger showing. Pinned in Task F, Step 3 (`frameAt('/', 1200)`). The breakpoint arithmetic in `SiteHeader.tsx` is rewritten in Task H1, Step 4.
3. **The new house photo publishing GPS coordinates.** The Figma original of `natureza-pessoas.webp` carries GPS EXIF of a community house. Pinned in Task S5 by a test that requires the simple `VP8 ` WebP format, which cannot hold EXIF.
4. **Phone widths.** The footer columns stack (H7), the law figures stack with their negative margins (C1), and the Sobre tab strip scrolls (S1). None may overflow sideways or collapse to zero height. Pinned in Task F, Step 3 at 390px.
5. **Assistive tech reading the PDF page counter.** Task M3 restructures the "/" and the count. Screen readers must still hear "de 32", and the 8px gap must hold while the count reads `--`. Pinned in Task M3, Steps 7–8.

---

### Task 1: Type foundation (Inter, Archivo, Rubik 800, h2 tracking, `.text-ui-*`, `--primary-foreground`)

**Files:**
- Create: `app/fonts/Inter-Variable-latin.woff2`, `app/fonts/OFL-Inter.txt`, `app/fonts/Archivo-SemiBold-latin.woff2`, `app/fonts/OFL-Archivo.txt`
- Modify: `app/fonts/marketing.ts` (whole file, 26 lines)
- Modify: `app/(marketing)/layout.tsx:8,37`
- Modify: `app/(territorios)/layout.tsx:4,37`
- Modify: `app/globals.css:45` (new token after it), `:136-148` (type scale header + `.text-h2`), insert after `:204` (new utilities)
- Test: `tests/lib/marketingType.test.ts` (new)

**Interfaces:**
- Consumes: nothing.
- Produces, used by every later task:
  - the CSS variable `--font-ui` (Inter) on the marketing `<body>` and the territorios `<html>`. Its computed `font-family` begins with `inter`.
  - `.text-ui-medium`: Inter 500 14/24, for button and nav labels;
  - `.text-ui-bold`: Inter 700 14/24, for the active nav item;
  - `.text-ui-tab`: Inter 500 14/20, for the Sobre tab items;
  - `.text-ui-badge`: Inter 600 12/16, for badges, chips and step tags;
  - every `.text-ui-*` declares `font-family: var(--font-ui, var(--font-fallback))`;
  - `.text-h2` letter-spacing becomes `-0.225px`;
  - Rubik renders weight 800, so `font-weight: 800` stops being synthesised or clamped;
  - the CSS variable `--font-archivo` (Archivo SemiBold 600, static) on the marketing `<body>` only, for the landing's Plataforma tabs (Task H4). Its computed `font-family` begins with `archivo`;
  - the colour token `--primary-foreground: #f8f7f8` in `:root`, the label colour of the filled green buttons (Tasks H1 and H5).

- [ ] **Step 1: Create the worktree**

```bash
cd /home/ezequias/oca/plataforma-carbono-mvp
git fetch -q origin
git worktree add -b fix/figma-parity /home/ezequias/oca/worktrees/figma-parity origin/main
cd /home/ezequias/oca/worktrees/figma-parity
npm ci
cp /home/ezequias/oca/plataforma-carbono-mvp/.env.local .
```

Expected: `git -C /home/ezequias/oca/worktrees/figma-parity log -1 --oneline` shows the `origin/main` head, and `ls .env.local` exists. `.env.local` is gitignored, so check with `git status --short` that it does not show up.

- [ ] **Step 1b: Commit this plan on the branch**

The plan was written into the main checkout, untracked. Move it to the branch, as the earlier plans were committed (e.g. d2b83c0):

```bash
mkdir -p docs/superpowers/plans
mv /home/ezequias/oca/plataforma-carbono-mvp/docs/superpowers/plans/2026-10-01-figma-parity.md docs/superpowers/plans/
git add docs/superpowers/plans/2026-10-01-figma-parity.md
git commit -m "docs: add the plan for matching the marketing pages to Figma"
```

- [ ] **Step 2: Write the failing test**

Create `tests/lib/marketingType.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Reads the type utilities straight out of the stylesheet, as
// marketingPalette.test.ts does for the colour tokens: the values are Figma
// text styles measured off the nodes, and this fails if one drifts.
function rule(selector: string): Record<string, string> {
  const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))
  if (!match) throw new Error(`no ${selector} rule in app/globals.css`)
  const props: Record<string, string> = {}
  for (const [, name, value] of match[1].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)) {
    props[name] = value.trim()
  }
  return props
}

describe('marketing type utilities', () => {
  // The Figma h2 style tracks at -0.75%, i.e. -0.225px at 30px; -0.75px was
  // the percentage read as pixels.
  it('tracks the h2 at -0.225px', () => {
    expect(rule('.text-h2')['letter-spacing']).toBe('-0.225px')
  })

  it.each([
    ['.text-ui-medium', '500', '14px', '24px'],
    ['.text-ui-bold', '700', '14px', '24px'],
    ['.text-ui-tab', '500', '14px', '20px'],
    ['.text-ui-badge', '600', '12px', '16px'],
  ])('sets %s in Inter %s %s/%s', (selector, weight, size, lineHeight) => {
    const props = rule(selector)
    expect(props['font-family']).toBe('var(--font-ui, var(--font-fallback))')
    expect(props['font-weight']).toBe(weight)
    expect(props['font-size']).toBe(size)
    expect(props['line-height']).toBe(lineHeight)
  })
})

describe('marketing fonts', () => {
  const source = readFileSync(path.join(process.cwd(), 'app/fonts/marketing.ts'), 'utf8')

  it('declares Rubik up to 800, the weight of the question tile numbers', () => {
    expect(source).toMatch(/Rubik-Variable-latin\.woff2',\s*weight: '400 800'/)
  })

  it('loads Inter as --font-ui', () => {
    expect(source).toMatch(/Inter-Variable-latin\.woff2',\s*weight: '400 700',\s*variable: '--font-ui'/)
  })

  it('loads Archivo SemiBold as --font-archivo', () => {
    expect(source).toMatch(/Archivo-SemiBold-latin\.woff2',\s*weight: '600',\s*variable: '--font-archivo'/)
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/lib/marketingType.test.ts`
Expected: FAIL, 8 failed. `.text-h2` reports `-0.75px`; the four `.text-ui-*` cases throw `no .text-ui-medium rule in app/globals.css` (and so on); the three font cases fail to match.

- [ ] **Step 4: Add the Inter files**

Google serves the Latin subset as one variable file. Take its URL from the CSS2 API rather than hard-coding the versioned path:

```bash
cd /home/ezequias/oca/worktrees/figma-parity
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
URL=$(curl -s -A "$UA" 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap' \
  | awk '/\/\* latin \*\//{f=1} f && /src: url/{match($0,/https:[^)]*/); print substr($0,RSTART,RLENGTH); exit}')
echo "$URL"
curl -sL -o app/fonts/Inter-Variable-latin.woff2 "$URL"
curl -sL -o app/fonts/OFL-Inter.txt https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt
head -c 4 app/fonts/Inter-Variable-latin.woff2; echo; head -1 app/fonts/OFL-Inter.txt; ls -l app/fonts/Inter-Variable-latin.woff2
```

Expected:
- `$URL` is `https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2` (on 2026-10-01; a newer `vNN` is fine);
- the magic bytes print `wOF2`;
- the license's first line is `Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)`;
- the file is about 48 KB (48256 bytes on 2026-10-01).

Archivo is needed at one weight only, the SemiBold 600 of the landing's tab labels (Figma `Archivo:SemiBold` 16 on I18862:8546;18846:7562), so take Google's static 600 file:

```bash
URL=$(curl -s -A "$UA" 'https://fonts.googleapis.com/css2?family=Archivo:wght@600&display=swap' \
  | awk '/\/\* latin \*\//{f=1} f && /src: url/{match($0,/https:[^)]*/); print substr($0,RSTART,RLENGTH); exit}')
echo "$URL"
curl -sL -o app/fonts/Archivo-SemiBold-latin.woff2 "$URL"
curl -sL -o app/fonts/OFL-Archivo.txt https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/OFL.txt
head -c 4 app/fonts/Archivo-SemiBold-latin.woff2; echo; head -1 app/fonts/OFL-Archivo.txt; ls -l app/fonts/Archivo-SemiBold-latin.woff2
```

Expected:
- `$URL` is `https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTT6jRZ9xdp.woff2` (on 2026-10-01);
- the magic bytes print `wOF2`;
- the license's first line is `Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)`;
- the file is about 14 KB (13820 bytes).

No new Rubik file is needed. `app/fonts/Rubik-Variable-latin.woff2` is byte-identical to Google's current whole variable file, with the full 300–900 axis (sha256 `691cd1d9…36890691`). Only the declared range changes.

- [ ] **Step 5: Declare the fonts**

Replace the whole of `app/fonts/marketing.ts` with:

```ts
import localFont from 'next/font/local'

// Typefaces of the marketing pages, served from the repo for the same reason as
// `./app.ts`: `next/font/google` fetched them on each build, and a flaky Google
// response failed the build. Latin subset as Google serves it; licenses in
// OFL-Rubik.txt, OFL-ArchivoNarrow.txt, OFL-Inter.txt and OFL-Archivo.txt.

// Body text. The file is Google's whole variable font (300-900); the declared
// range is the one the code uses, up to the ExtraBold 800 of the question tile
// numbers (Figma 18988:8889, QuestionTile.module.css).
export const rubik = localFont({
  src: './Rubik-Variable-latin.woff2',
  weight: '400 800',
  variable: '--font-sans',
  display: 'swap',
})

// UI labels. The design sets buttons, nav links, tabs, badges and chips in
// Inter, not Rubik (e.g. the nav items of Figma 18862:8515, the tab items
// I18988:8636;6:198, the step tags I18985:7168;135:1174); the .text-ui-*
// utilities in app/globals.css read it through --font-ui.
export const inter = localFont({
  src: './Inter-Variable-latin.woff2',
  weight: '400 700',
  variable: '--font-ui',
  display: 'swap',
})

// The landing's Plataforma tab labels, which the design sets in Archivo
// SemiBold 16 (I18862:8546;18846:7562 and siblings): a static 600 cut, the
// only weight in use. Loaded on the marketing <body> only; the territorios
// story has no such tabs.
export const archivo = localFont({
  src: './Archivo-SemiBold-latin.woff2',
  weight: '600',
  variable: '--font-archivo',
  display: 'swap',
})

// Named for its role (a display face for oversized headings) rather than the
// family, so a future face swap only touches this call, not Hero.module.css.
// Currently the only consumer is the hero h1 (Figma node 18862:8525), which has
// no bound Figma variable and reads weight 700 off that node.
export const archivoNarrow = localFont({
  src: './ArchivoNarrow-Bold-latin.woff2',
  weight: '700',
  variable: '--font-display',
  display: 'swap',
})
```

If a later task adds a second Archivo Narrow consumer (Task H6's card titles, Task H7's footer wordmark), that task updates the `archivoNarrow` comment's "only consumer" sentence.

- [ ] **Step 6: Put `--font-ui` on both roots that load globals.css**

In `app/(marketing)/layout.tsx`, line 8:

```tsx
import { archivoNarrow, rubik } from "../fonts/marketing";
```
becomes
```tsx
import { archivo, archivoNarrow, inter, rubik } from "../fonts/marketing";
```
and line 37:
```tsx
      <body className={`${rubik.variable} ${archivoNarrow.variable}`}>
```
becomes
```tsx
      <body className={`${rubik.variable} ${archivoNarrow.variable} ${inter.variable} ${archivo.variable}`}>
```

In `app/(territorios)/layout.tsx`, line 4:

```tsx
import { archivoNarrow, rubik } from '../fonts/marketing'
```
becomes
```tsx
import { archivoNarrow, inter, rubik } from '../fonts/marketing'
```
and line 37:
```tsx
    <html lang="pt-BR" className={`${rubik.variable} ${archivoNarrow.variable}`}>
```
becomes
```tsx
    <html lang="pt-BR" className={`${rubik.variable} ${archivoNarrow.variable} ${inter.variable}`}>
```

The territorios story renders `SiteHeader` and loads `globals.css` (see that layout's comment), so its header labels need Inter too.

- [ ] **Step 7: Add the token, fix the h2 and add the utilities**

In `app/globals.css`, right after line 45 (`  --ctx-positivo-texto-sobre-container: #001d27;`), insert:

```css
  /* The label colour of the filled green buttons ("Mapas",
   * I18862:8515;16825:136055; "Explore os dados", I18862:8574;13:904), a
   * variable of the design's base collection rather than the ROLE set. */
  --primary-foreground: #f8f7f8;
```

Its contrast pairs are added by the tasks that use it (H1, H5) to `tests/lib/marketingPalette.test.ts`.

Then, still in `app/globals.css`, lines 136–148 (now 140–152 after the insertion above):

```css
/* Type scale (Figma design system, all Rubik). Section CSS Modules apply these
 * as utility classes instead of hard-coding font metrics, e.g.
 * `<h2 className={`${styles.title} text-h2`}>`; a class composes freely with a
 * module's own selector for color, margin and layout. The h1 is deliberately
 * absent: it has no bound Figma variable, and Task 4 reads its real value off
 * the hero node and defines it locally in Hero.module.css. */
.text-h2 {
  font-family: var(--font-sans, var(--font-fallback));
  font-weight: 600;
  font-size: 30px;
  line-height: 36px;
  letter-spacing: -0.75px;
}
```
becomes
```css
/* Type scale (Figma design system): Rubik for text, Inter (--font-ui) for the
 * UI labels the design sets in Inter, below. Section CSS Modules apply these
 * as utility classes instead of hard-coding font metrics, e.g.
 * `<h2 className={`${styles.title} text-h2`}>`; a class composes freely with a
 * module's own selector for color, margin and layout. The h1 is deliberately
 * absent: it has no bound Figma variable, and Task 4 reads its real value off
 * the hero node and defines it locally in Hero.module.css. */
.text-h2 {
  font-family: var(--font-sans, var(--font-fallback));
  font-weight: 600;
  font-size: 30px;
  line-height: 36px;
  /* The Figma style tracks at -0.75%, which is -0.225px at 30px. */
  letter-spacing: -0.225px;
}
```

Right after the `.text-subtle-semibold` rule (which ends at line 210 by now), insert:

```css

/* UI labels in Inter, measured off the Figma nodes (no bound text style):
 * button and nav labels (the nav items of 18862:8515, the hero buttons
 * 18862:8529/8530), the active nav item, which the design sets Bold, the Sobre
 * tab items (I18988:8636;6:198), and badges, chips and step tags
 * (I18985:7168;135:1174). */
.text-ui-medium {
  font-family: var(--font-ui, var(--font-fallback));
  font-weight: 500;
  font-size: 14px;
  line-height: 24px;
}

.text-ui-bold {
  font-family: var(--font-ui, var(--font-fallback));
  font-weight: 700;
  font-size: 14px;
  line-height: 24px;
}

.text-ui-tab {
  font-family: var(--font-ui, var(--font-fallback));
  font-weight: 500;
  font-size: 14px;
  line-height: 20px;
}

.text-ui-badge {
  font-family: var(--font-ui, var(--font-fallback));
  font-weight: 600;
  font-size: 12px;
  line-height: 16px;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run tests/lib/marketingType.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 9: Run the suite, lint and build**

Run: `npx vitest run && npm run lint && npm run build`
Expected:
- vitest: 66 files passed, 1 skipped; 711 tests passed, 3 skipped;
- lint: still 5 problems (3 errors, 2 warnings), all in `components/mapa/`;
- build: succeeds. `next/font/local` fails the build if a font file is missing or unreadable.

- [ ] **Step 10: Rendered check**

Serve the worktree and open the harness (Appendix A.1–A.3) on `/`. Then:

```js
await frameAt('/')
const d = F.contentDocument
;[getComputedStyle(d.body).getPropertyValue('--font-ui').trim().slice(0, 40),
  getComputedStyle(d.body).getPropertyValue('--font-archivo').trim().slice(0, 40),
  getComputedStyle(d.documentElement).getPropertyValue('--primary-foreground').trim(),
  d.fonts.check('500 14px inter'), d.fonts.check('600 16px archivo'), d.fonts.check('800 24px rubik'),
  probe('h2', 1)].join('\n')
```

Expected:
- the `--font-ui` value is non-empty and starts with `'inter'`, and `--font-archivo` with `'archivo'` (next/font's generated family names);
- `--primary-foreground` reads `#f8f7f8`;
- the three `d.fonts.check` calls return `true`;
- the first `h2` ("O que é a CaatiVAR?" in the Plataforma block) reports `ls=-0.225px`.

Repeat `getComputedStyle(F.contentDocument.documentElement).getPropertyValue('--font-ui')` after `await frameAt('/territorios')`. Expected: non-empty. No element uses `.text-ui-*` yet, so nothing else on the pages moves except the h2 letter-spacing.

- [ ] **Step 11: Commit**

```bash
git add app/fonts/Inter-Variable-latin.woff2 app/fonts/OFL-Inter.txt \
  app/fonts/Archivo-SemiBold-latin.woff2 app/fonts/OFL-Archivo.txt app/fonts/marketing.ts \
  "app/(marketing)/layout.tsx" "app/(territorios)/layout.tsx" app/globals.css tests/lib/marketingType.test.ts
git commit -m "feat: load Inter and Archivo for UI labels and fix the h2 letter-spacing

The design sets buttons, nav links, tabs, badges and chips in Inter and
the landing's Plataforma tabs in Archivo SemiBold, neither of which the
marketing pages loaded, and tracks its h2 style at -0.75% (-0.225px at
30px), which the type scale read as -0.75px. Rubik is now declared up to
800 for the question tile numbers; the file already carried the whole axis.
--primary-foreground is the filled green buttons' label colour."
```

---

## Home slice (Tasks H1–H7)

Scope: the landing page `/` (Figma frame 18862:8514, page "Site/ portal", file QKUhlt36bGyTskbONscB3G) — header, hero, Destaques, "Conheça a plataforma", Ferramenta, Comunicação block, footer, and the seven home "Hover" frames (18916:9717, 9741, 9730, 9438, 9764, 9468, 9437). The duplicate "A ferramenta central da plataforma" section (19090:30287) is out of scope.

Conventions for every H task:

- Work in `/home/ezequias/oca/worktrees/figma-parity` on branch `fix/figma-parity`. Paths below are relative to it.
- Text widths below were measured with HarfBuzz on the same font files (Inter v20 latin, Rubik and Archivo Narrow from `app/fonts/`, Archivo 600 latin) and match Figma's own widths to within 1px (e.g. "Entrar" button 96.35 vs Figma 97, "Ver mais" 113.99 vs 114). Accept ±0.5px on x/w from text measurement and ±0.5px on y.
- RENDERED CHECK steps use Appendix A's harness: `await frameAt('/')`, then `probe(selector, n, baseSelector)` (coordinates relative to `baseSelector` when one is given) and `hoverProbe(selector, innerSelector, i)`. Module classes are selected by suffix, e.g. `[class*="__navLink"]`. Expected values are written in probe's own format.
- Commits: conventional prefix, English, no `Co-Authored-By` or any other trailer.
- Lint gate: `npm run lint` must report no problems beyond the baseline in Global Constraints.

---

### Task H1: Header (SiteHeader)

Figma: "Menu-superior" 18862:8515; hover frames 18916:9717 (nav item) and 18916:9741 ("Entrar"). SiteHeader also renders in `app/(territorios)`; nothing here is landing-specific, so the territorios header changes identically (Task 1 puts the Inter class on the territorios `<html>`).

**Files:**
- Modify: `components/marketing/SiteHeader.tsx:12-22` (breakpoint comment), `:27-31` (session comment), `:81`, `:85` (language spans), `:164` (nav link class), `:172` (Mapas class), `:179`, `:221` (session button class)
- Modify: `components/marketing/SiteHeader.module.css:21-27` (`.bar`), `:55-145`
- Test: `tests/lib/marketingPalette.test.ts:21-91` (PAIRS)

**Interfaces:**
- Consumes (Task 1): `.text-ui-medium` (Inter 500 14/24), `.text-ui-bold` (Inter 700 14/24), `.text-ui-tab` (Inter 500 14/20, used here for the PT-BR/En switch — Figma `Inter:Medium` 14/20 on I18862:8515;16825:136008/136011), the `--font-ui` variable on `<body>`.
- Consumes (Task 1): `--primary-foreground: #f8f7f8` in `:root` of `app/globals.css`.
- Produces: nothing other tasks rely on.

- [ ] **Step 1: Add the header's new text/background pairs to the palette test**

In `tests/lib/marketingPalette.test.ts`, append inside `PAIRS`, after the `['--bg-texto-primario', '--am-200'],` line (currently line 90):

```ts
  // Figma parity (home): the Mapas button's label is bound to
  // --primary-foreground (#f8f7f8, I18862:8515;16825:136055), at rest on
  // -marca-ancora-hover and on the pressed fill it takes on hover. (An
  // inactive nav link keeps its --bg-texto-primario label on the --am-100
  // hover fill; that pair is already listed above.)
  ['--primary-foreground', '--role-marca-ancora-hover'],
  ['--primary-foreground', '--role-marca-ancora-pressionado'],
```

- [ ] **Step 2: Run the palette test**

Run: `npx vitest run tests/lib/marketingPalette.test.ts`
Expected: PASS (6.25:1 and 8.79:1). If it fails with `--primary-foreground missing`, Task 1 is not in the branch — stop and report.

- [ ] **Step 3: Switch the nav links, Mapas, language switch and session button to Inter**

`components/marketing/SiteHeader.tsx:164` — replace

```tsx
                className={`${styles.navLink} text-body${active ? ` ${styles.navLinkActive}` : ""}`}
```

with

```tsx
                className={`${styles.navLink} ${active ? `text-ui-bold ${styles.navLinkActive}` : "text-ui-medium"}`}
```

`:172` — replace

```tsx
          <a href={MAPA_LINK.href} className={`${styles.mapaButton} text-body`}>
```

with

```tsx
          <a href={MAPA_LINK.href} className={`${styles.mapaButton} text-ui-medium`}>
```

`:81` — replace

```tsx
      <span className={`${styles.languageOption} ${styles.languageOptionActive} text-subtle-semibold`}>
```

with

```tsx
      <span className={`${styles.languageOption} ${styles.languageOptionActive} text-ui-tab`}>
```

`:85` — replace

```tsx
        className={`${styles.languageOption} text-subtle-semibold`}
```

with

```tsx
        className={`${styles.languageOption} text-ui-tab`}
```

`:179` and `:221` — in both lines replace

```tsx
<SessionAction className={`${styles.sessionButton} text-subtle-semibold`} />
```

with

```tsx
<SessionAction className={`${styles.sessionButton} text-ui-medium`} />
```

- [ ] **Step 4: Fix the two stale comments in SiteHeader.tsx**

`:12-22` — replace the whole comment block

```tsx
// Below this width the inline nav/actions collapse into the hamburger panel.
// Measured, not inherited from the pre-redesign header: `.brand` + `.nav` +
// `.actions` are 153 + 466 + 247px with 16px gaps between them (898px),
// none of it allowed to shrink below content (`flex: none` on `.nav` and
// `.actions`, deliberately — only `.brand` may shrink), plus `--gutter` (80px, still 80 in this range — it only drops
// to 24 at <=768px) on both sides. 898 + 160 = 1058px is the narrowest
// viewport the inline header actually fits; 1200 clears it with margin. This
// is the only JS/CSS breakpoint pair on the branch — this value, the
// `max-width: 1199px` / `min-width: 1200px` pair in SiteHeader.module.css,
// and the `.toggle`/`.panel` rules they gate must all move together, or the
// hamburger and the inline nav can both render, or both vanish.
```

with

```tsx
// Below this width the inline nav/actions collapse into the hamburger panel.
// Measured, not inherited from the pre-redesign header: `.brand` + `.nav` +
// `.actions` are 153 + 478 + 189px with 16px gaps between them (852px),
// none of it allowed to shrink below content (`flex: none` on `.nav` and
// `.actions`, deliberately — only `.brand` may shrink), plus `--gutter` (80px,
// still 80 in this range — it only drops to 24 at <=768px) on both sides.
// 852 + 160 = 1012px is the narrowest viewport the inline header actually
// fits; 1200 clears it with margin. This is the only JS/CSS breakpoint pair on
// the branch — this value, the `max-width: 1199px` / `min-width: 1200px` pair
// in SiteHeader.module.css, and the `.toggle`/`.panel` rules they gate must
// all move together, or the hamburger and the inline nav can both render, or
// both vanish.
```

`:27-31` — replace

```tsx
// The session slot standing in for the Figma "Entrar" button (node 18862:8515,
// button I18862:8515;2810:3921). The marketing layout redirects unauthenticated
// visitors to /login (app/(marketing)/layout.tsx), so anyone who reaches this
// header is already signed in and "Entrar" could never be the right label —
// "Sair" is rendered instead, at the same 114x40 geometry.
```

with

```tsx
// The session slot standing in for the Figma "Entrar" button (node 18862:8515,
// button I18862:8515;2810:3921). The marketing layout redirects unauthenticated
// visitors to /login (app/(marketing)/layout.tsx), so anyone who reaches this
// header is already signed in and "Entrar" could never be the right label —
// "Sair" is rendered instead, in the same button: 1px border, 6px radius, 16px
// side padding, hugging its label. Figma's "people" icon is left out: it
// stands for signing in, not out.
```

- [ ] **Step 5: Rewrite the nav link, Mapas, language switch and session button rules**

`components/marketing/SiteHeader.module.css:21-27` — replace

```css
.bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
```

with

```css
/* Figma pads the 76px frame 18px top and bottom and draws the 2px border
 * inside it, over the bottom padding, so the row sits 1px below the centre of
 * the 74px above the border: the 2px here puts the 40px items at y=18 and the
 * logo at y=19, as in node 18862:8515. */
.bar {
  height: 100%;
  padding-top: 2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
```

`components/marketing/SiteHeader.module.css:55-91` — replace

```css
.navLink {
  padding: 8px 16px;
  color: var(--bg-texto-primario);
  border-bottom: var(--borda-largura) solid transparent;
  white-space: nowrap;
}

/* Hover fills the link with --am-100, Figma frame 18916:9717. The design
 * keeps the -padrao text on that fill, which is 4.01:1 and fails AA for this
 * 14px label; stepping to the role's -hover tone gives 5.51:1 with no visible
 * change of hue (tests/lib/marketingPalette.test.ts holds the pair). */
.navLink:hover,
.navLink:focus-visible {
  background: var(--am-100);
  color: var(--role-marca-ancora-hover);
}

.navLinkActive {
  color: var(--role-marca-ancora-padrao);
  border-bottom-color: var(--role-marca-ancora-padrao);
}

/* Figma renders the "Mapas" button at rest with the hover-role green
 * (I18862:8515;16825:136055); the darker pressed-role green is used here as
 * the interactive hover/focus step. */
.mapaButton {
  padding: 8px 16px;
  border-radius: var(--radius-interno);
  background: var(--role-marca-ancora-hover);
  color: var(--role-marca-ancora-texto-sobre);
  white-space: nowrap;
}
```

with

```css
/* 40px tall like every Figma nav item: 8 + 24 + 6 + the 2px bottom border,
 * which Figma draws inside the item (I18862:8515;2810:3916). Inactive items
 * carry the button's 6px radius; the active one is square under its
 * underline. */
.navLink {
  padding: 8px 16px 6px;
  border-radius: var(--radius-interno);
  color: var(--bg-texto-primario);
  border-bottom: var(--borda-largura) solid transparent;
  white-space: nowrap;
}

/* Hover fills the link with --am-100, Figma frame 18916:9717. */
.navLink:hover,
.navLink:focus-visible {
  background: var(--am-100);
}

.navLinkActive {
  border-radius: 0;
  color: var(--role-marca-ancora-padrao);
  border-bottom-color: var(--role-marca-ancora-padrao);
}

/* The design keeps the active item's -padrao text on the --am-100 hover fill
 * (18916:9717), which is 4.01:1 and fails AA for this 14px label; stepping to
 * the role's -hover tone gives 5.51:1 with no visible change of hue
 * (tests/lib/marketingPalette.test.ts holds the pair). */
.navLinkActive:hover,
.navLinkActive:focus-visible {
  color: var(--role-marca-ancora-hover);
}

/* Figma renders the "Mapas" button at rest with the hover-role green and a
 * --primary-foreground label (I18862:8515;16825:136055); the darker
 * pressed-role green is used here as the interactive hover/focus step. */
.mapaButton {
  padding: 8px 16px;
  border-radius: var(--radius-interno);
  background: var(--role-marca-ancora-hover);
  color: var(--primary-foreground);
  white-space: nowrap;
}
```

`:101-117` (after the replacement above the line numbers shift by +12; match on content) — replace

```css
.language {
  display: flex;
  align-items: center;
  background: var(--am-200);
  border-radius: var(--radius-interno);
  overflow: hidden;
}

.languageOption {
  padding: 6px 12px;
  color: var(--bg-texto-primario);
}

.languageOptionActive {
  background: var(--role-categorica1-padrao);
  color: var(--role-primario-texto-sobre);
}
```

with

```css
/* Figma I18862:8515;16825:136014: as tall as the "Entrar" button beside it
 * (40px), with a 4px radius on the track and on the active pill — the design
 * system has no token for 4px, so it is written out. */
.language {
  display: flex;
  align-items: center;
  height: 40px;
  background: var(--am-200);
  border-radius: 4px;
  overflow: hidden;
}

.languageOption {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 12px;
  color: var(--bg-texto-primario);
}

.languageOptionActive {
  border-radius: 4px;
  background: var(--role-categorica1-padrao);
  color: var(--role-primario-texto-sobre);
}
```

Then replace

```css
.sessionButton {
  width: 114px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  border: var(--borda-largura) solid var(--role-categorica1-padrao);
  background: var(--bg-fundo);
  color: var(--role-categorica1-padrao);
  cursor: pointer;
}
```

with

```css
/* Figma's "Entrar" button (I18862:8515;2810:3921, 97x40 around its label and
 * icon): a 1px border drawn inside the box, so 7 + 1 = 8px above and 15 + 1 =
 * 16px beside the 24px label line, 40px tall, hugging the label. */
.sessionButton {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7px 15px;
  border-radius: var(--radius-interno);
  border: 1px solid var(--role-categorica1-padrao);
  background: var(--bg-fundo);
  color: var(--role-categorica1-padrao);
  white-space: nowrap;
  cursor: pointer;
}
```

Leave `.sessionButton:hover, .sessionButton:focus-visible { background: var(--am-100); }` (Figma 18916:9741) and `.sessionButton:disabled` unchanged.

- [ ] **Step 6: Run the whole suite and lint**

Run: `npx vitest run` — Expected: PASS (all files; `tests/lib/marketingNav.test.ts` still finds the bare `<header>` wrapper).
Run: `npm run lint` — Expected: no problems beyond the baseline.

- [ ] **Step 7: RENDERED CHECK at 1436px**

```js
await frameAt('/')
probe('header [class*="__brandLogo"]', 1, 'header')
probe('header nav[aria-label="Navegação principal"] > a', 4, 'header')
probe('header [class*="__actions"] > [class*="__language"], header [class*="__actions"] [class*="__languageOption"]', 3, 'header')
probe('header [class*="__actions"] > [class*="__sessionButton"]', 1, 'header')
hoverProbe('header [class*="__navLink"]:not([class*="__navLinkActive"])')
hoverProbe('header [class*="__navLinkActive"]')
hoverProbe('header [class*="__mapaButton"]')
hoverProbe('header [class*="__actions"] > [class*="__sessionButton"]')
```

Expected (relative to `header`):

| element | expected |
|---|---|
| brandLogo | `@80,19 153x37.9` |
| "Início" | `@461.3,18 69.1x40 pad=8px 16px 6px 16px f=inter 700 14px/24px c=rgb(88, 124, 34) br=0px bd=0px rgb(88, 124, 34)/2px rgb(88, 124, 34)` |
| "Sobre a plataforma" | `@546.4,18 159.2x40 f=inter 500 14px/24px c=rgb(0, 29, 39) br=6px bd=0px rgb(0, 29, 39)/2px rgba(0, 0, 0, 0)` |
| "Comunicação" | `@721.6,18 124.3x40 f=inter 500 14px/24px br=6px` |
| "Mapas" | `@861.9,18 77x40 pad=8px 16px 8px 16px f=inter 500 14px/24px c=rgb(248, 247, 248) bg=rgb(71, 101, 27) br=6px` |
| language | `@1167.3,18 106.8x40 bg=rgb(191, 202, 206) br=4px` |
| "PT-BR" | `@1167.3,18 65.9x40 pad=0px 12px 0px 12px f=inter 500 14px/20px c=rgb(255, 255, 255) bg=rgb(39, 114, 91) br=4px` |
| "En" | `@1233.2,18 40.9x40 f=inter 500 14px/20px c=rgb(148, 166, 172)` |
| "Sair" | `@1298.1,18 57.9x40 pad=7px 15px 7px 15px f=inter 500 14px/24px c=rgb(39, 114, 91) bg=rgb(254, 254, 251) br=6px bd=1px rgb(39, 114, 91)/1px rgb(39, 114, 91)` |
| hover inactive link | `bg=rgb(230, 234, 235) c=rgb(0, 29, 39) br=6px` |
| hover "Início" | `bg=rgb(230, 234, 235) c=rgb(71, 101, 27) br=0px bd=0px rgb(71, 101, 27)/2px rgb(88, 124, 34)` |
| hover "Mapas" | `bg=rgb(55, 77, 21) c=rgb(248, 247, 248)` |
| hover "Sair" | `bg=rgb(230, 234, 235) bd=1px rgb(39, 114, 91)/1px rgb(39, 114, 91)` |

Header box stays `1436x76` with the 2px `rgb(82, 111, 120)` bottom border. Figma for reference: logo at y=19, nav items 40 tall at y=18, language 107x40, "Entrar" 97x40.

- [ ] **Step 8: Commit**

```bash
git add components/marketing/SiteHeader.tsx components/marketing/SiteHeader.module.css tests/lib/marketingPalette.test.ts
git commit -m "fix: match the site header to the Figma Menu-superior"
```

---
### Task H2: Hero

Figma: "Background" 18862:8516 (495 tall); eyebrow 18862:8523, copy container 18862:8524 (h1 + lead, gap 16), buttons 18862:8529/8530 in 18862:8528, dots 18862:8531, credit 18862:8536; hover frame 18916:9730 ("Ver materiais").

**Files:**
- Modify: `components/marketing/Hero.tsx:71-89` (eyebrow, copy wrapper, button classes), `:107-111` (credit)
- Modify: `components/marketing/Hero.module.css:11-31` (height comment), `:104-115` (`.content`, `.eyebrow`), `:165-169` (`.secondaryButton`), `:191-199` (`.dots`), `:216-252` (credit comment, `.creditRow`, `.credit`), `:254-266` (media query)

**Interfaces:**
- Consumes (Task 1): `.text-ui-medium` (Inter 500 14/24), `--font-ui` on `<body>`; existing `.text-subtle-medium` (Rubik 500 14/20).
- Produces: nothing other tasks rely on.

- [ ] **Step 1: Restructure the copy and switch the fonts in Hero.tsx**

`components/marketing/Hero.tsx:71-89` — replace

```tsx
          <p className={`${styles.eyebrow} text-subtle-semibold`}>
            Mercado de Carbono na Caatinga
          </p>
          <h1 className={styles.title}>
            Dados abertos e mapas para entender o carbono do bioma e decidir com
            mais segurança
          </h1>
          <p className={`${styles.lead} text-lead`}>
            Informação aberta para que comunidades e gestores avaliem projetos
            de carbono e negociem em condições mais justas.
          </p>
          <div className={styles.actions}>
            {/* MAPA_LINK crosses a route group: a full page load, not next/link. */}
            <a href={MAPA_LINK.href} className={`${styles.primaryButton} text-body`}>
              Abrir os mapas
            </a>
            <a href="#comunicacao" className={`${styles.secondaryButton} text-body`}>
              Ver materiais
            </a>
          </div>
```

with

```tsx
          <p className={`${styles.eyebrow} text-subtle-medium`}>
            Mercado de Carbono na Caatinga
          </p>
          {/* Figma groups the h1 and the lead in their own container
              (18862:8524) with a 16px gap, tighter than the column's 21. */}
          <div className={styles.copy}>
            <h1 className={styles.title}>
              Dados abertos e mapas para entender o carbono do bioma e decidir com
              mais segurança
            </h1>
            <p className={`${styles.lead} text-lead`}>
              Informação aberta para que comunidades e gestores avaliem projetos
              de carbono e negociem em condições mais justas.
            </p>
          </div>
          <div className={styles.actions}>
            {/* MAPA_LINK crosses a route group: a full page load, not next/link. */}
            <a href={MAPA_LINK.href} className={`${styles.primaryButton} text-ui-medium`}>
              Abrir os mapas
            </a>
            <a href="#comunicacao" className={`${styles.secondaryButton} text-ui-medium`}>
              Ver materiais
            </a>
          </div>
```

`:107-111` — replace

```tsx
      <div className={`container ${styles.creditRow}`}>
        {activePhoto.credit && (
          <p className={`${styles.credit} text-subtle`}>Foto: {activePhoto.credit}</p>
        )}
      </div>
```

with

```tsx
      {activePhoto.credit && <p className={styles.credit}>Foto: {activePhoto.credit}</p>}
```

- [ ] **Step 2: Replace the "503px" comment, which this task makes false**

`components/marketing/Hero.module.css:11-31` — replace

```css
/* This section renders 503px tall against the design's 495. The 8px is four
 * differences that nearly cancel, and it is left alone deliberately:
 *
 *   eyebrow line box    20 vs 14   +6
 *   gap h1 -> lead      21 vs 16   +5
 *   button row          52 vs 48   +4
 *   dot row block       35 vs 42   -7
 *                                 ----
 *                                  +8
 *
 * Two of the four would cost more than they are worth. The eyebrow needs a
 * line-height equal to its font size, which is a tenth type utility for a
 * design system that binds six styles; the h1/lead gap needs those two wrapped
 * in their own element so the column can carry two different gaps. Both exist
 * only because the design uses values it never tokenised — the same problem the
 * PR already raises with whoever maintains the Figma file.
 *
 * Do NOT close the 8px by tuning the dot row alone. That would make the total
 * land at this one viewport while all four causes stay wrong, and they only
 * cancel here by arithmetic accident — a different width or a different string
 * pulls them apart again. Fix the causes or leave it. */
```

with

```css
/* 495px tall, as the design, with nothing left to cancel out: the eyebrow's
 * line box is 14px (.eyebrow overrides the utility's 20), the h1 -> lead gap is
 * 16px (.copy), the button row is 8 + 40px (the secondary button's border is
 * 1px, so both buttons are 40 tall) and the dot row is 13px (.dots):
 *   82 + 14 + 21 + 226.6 + 21 + 48 + 40 + 13 + 29 = 494.6, under the 495 floor. */
```

- [ ] **Step 3: Eyebrow line box and the copy group**

`components/marketing/Hero.module.css:104-115` — replace

```css
.content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 21px;
  max-width: 568px;
}

.eyebrow {
  color: color-mix(in srgb, var(--role-terciario-texto-sobre) 72%, transparent);
  text-transform: uppercase;
}
```

with

```css
.content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 21px;
  max-width: 568px;
}

/* Rubik Medium 14px on a 14px line box (node 18862:8523); .text-subtle-medium
 * sets the face, size and weight, the line height is overridden here. */
.eyebrow {
  line-height: 14px;
  color: color-mix(in srgb, var(--role-terciario-texto-sobre) 72%, transparent);
  text-transform: uppercase;
}

.copy {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

- [ ] **Step 4: 1px border on the secondary button**

`components/marketing/Hero.module.css:165-169` — replace

```css
.secondaryButton {
  background: transparent;
  color: var(--role-terciario-texto-sobre);
  border: var(--borda-largura) solid var(--role-terciario-texto-sobre);
}
```

with

```css
/* 1px white border drawn inside the box, as Figma does (18862:8530): 7 + 1px
 * keeps the 40px height and 16px inset of the primary button beside it. */
.secondaryButton {
  padding: 7px 15px;
  background: transparent;
  color: var(--role-terciario-texto-sobre);
  border: 1px solid var(--role-terciario-texto-sobre);
}
```

- [ ] **Step 5: 13px dot row**

`components/marketing/Hero.module.css:191-199` — replace

```css
.dots {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding-bottom: 29px;
}
```

with

```css
/* 42 = the 13px row Figma centres the dots in (18862:8531, dots at y+3.5)
 * plus the 29px below it, with the global border-box sizing. */
.dots {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: 42px;
  padding-bottom: 29px;
}
```

- [ ] **Step 6: Credit pill pinned to the hero's corner, in Inter 11px**

`components/marketing/Hero.module.css:216-252` — replace

```css
/* Photo credit overlay, bottom-right (node 18862:8536). `.creditRow` is the
 * `container` utility stretched over the full hero (it is itself the
 * positioned ancestor, via `position: absolute`), out-of-flow so it isn't
 * subject to the `.dots`-style flex shrink-wrap bug above — its box already
 * sizes and centers to the 1276px column correctly.
 *
 * `.credit`'s offset is `right: var(--gutter)`, not `right: 0`. An
 * absolutely positioned descendant's containing block is its ancestor's
 * *padding box*, whose outer edge is the ancestor's border edge — with no
 * border on `.creditRow`, that is the same as its outer, un-padded visual
 * edge. `right: 0` therefore lands flush with `.creditRow`'s outer edge
 * (the container's max-width boundary), ignoring the `padding-inline:
 * var(--gutter)` `container` gives it entirely; `right: var(--gutter)`
 * insets by that padding explicitly, landing on the actual content column's
 * right edge — the same edge the h1 lands on from the left, and the mirror
 * of that fix. The old raw `right: 21.62px` was a sub-pixel Figma value
 * that only lined up at the 1436px Figma frame width. */
.creditRow {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

/* Only rendered when the active photo has a known credit (see Hero.tsx); its
 * pill background is the exact token the Figma node itself references. */
.credit {
  position: absolute;
  right: var(--gutter);
  bottom: 21px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--bg-overlay);
  color: var(--bg-texto-sobre-inverso);
  margin: 0;
  pointer-events: auto;
}
```

with

```css
/* Photo credit overlay, node 18862:8536: a pill 21px above the hero's bottom
 * edge and 21.62px in from its right edge — pinned to the photo's corner, not
 * to the content column. Inter Regular 11px on the 13px line box of the
 * Figma text node (18862:8537); with the 6px padding, the design's 25px pill. */
.credit {
  position: absolute;
  right: 21.62px;
  bottom: 21px;
  z-index: 1;
  margin: 0;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--bg-overlay);
  color: var(--bg-texto-sobre-inverso);
  font-family: var(--font-ui, var(--font-fallback));
  font-weight: 400;
  font-size: 11px;
  line-height: 13px;
}
```

- [ ] **Step 7: Keep the mobile dot row consistent**

In the `@media (max-width: 768px)` block at the end of `Hero.module.css`, replace

```css
  .dots {
    padding-bottom: 20px;
  }
```

with

```css
  .dots {
    height: 33px;
    padding-bottom: 20px;
  }
```

- [ ] **Step 8: Run the whole suite and lint**

Run: `npx vitest run` — Expected: PASS (the SECTION_IDS extractor still reads `<section id="inicio"` as Hero.tsx's first wrapper tag).
Run: `npm run lint` — Expected: no problems beyond the baseline.

- [ ] **Step 9: RENDERED CHECK at 1436px**

```js
await frameAt('/')
probe('#inicio', 1)
probe('#inicio [class*="__eyebrow"], #inicio [class*="__copy"], #inicio h1, #inicio [class*="__lead"]', 4, '#inicio')
probe('#inicio [class*="__primaryButton"], #inicio [class*="__secondaryButton"]', 2, '#inicio')
probe('#inicio [class*="__dot"]', 2, '#inicio')
probe('#inicio [class*="__credit"]', 1, '#inicio')
hoverProbe('#inicio [class*="__secondaryButton"]')
hoverProbe('#inicio [class*="__primaryButton"]')
```

Expected (relative to `#inicio`; the section itself at `@0,76 1436x495`):

| element | expected |
|---|---|
| eyebrow | `@80,82.4 256.1x14 f=rubik 500 14px/14px c=color(srgb 1 1 1 / 0.72)` uppercase |
| copy | `@80,117.4 568x226.6 gap=16px` |
| h1 | `@80,117.4 568x154.6 f=archivoNarrow 700 48px/51.5184px c=rgb(255, 255, 255)` |
| lead | `@80,288 568x56 f=rubik 400 20px/28px` |
| primary "Abrir os mapas" | `@80,373 133.2x40 pad=8px 16px 8px 16px f=inter 500 14px/24px c=rgb(255, 255, 255) bg=rgb(71, 101, 27) br=6px` |
| secondary "Ver materiais" | `@227.2,373 119.8x40 pad=7px 15px 7px 15px f=inter 500 14px/24px c=rgb(255, 255, 255) br=6px bd=1px rgb(255, 255, 255)/1px rgb(255, 255, 255)` |
| first dot | `@80,456.5 6x6 bg=color(srgb 1 1 1 / 0.45) br=999px` (the active one is 26x6 at `/ 0.9`; five dots, one per photo) |
| credit | `@1283.1,449 131.3x25 pad=6px 12px 6px 12px f=inter 400 11px/13px c=rgb(254, 254, 251) bg=rgba(0, 15, 21, 0.5) br=999px` "Foto: Artur Lourenço" |
| hover secondary | `bg=rgba(0, 15, 21, 0.5)` (Figma 18916:9730) |
| hover primary | `bg=rgb(55, 77, 21)` (code-only hover, kept) |

Figma for reference: eyebrow y=82, h1 y=117, lead y=288, buttons y=373 (169x40 and 120x40), dots y=456.5, credit 145x25 at x=1269.4, y=449.

- [ ] **Step 10: Commit**

```bash
git add components/marketing/Hero.tsx components/marketing/Hero.module.css
git commit -m "fix: match the hero's spacing, buttons and photo credit to Figma"
```

---
### Task H3: Destaques and IndicatorCard

Figma: band 18862:8538; label 18862:8540 (Rubik Bold 16, normal line height, 1.5px tracking, uppercase, #002b39); cards 18862:8542..8545 — white fill (`ROLE-Primario-TextoSobre`), 24x24 "Map" icon (the same artwork as the Sobre pages' icon), value in a 34px box (I18862:8542;18808:5950). IndicatorCard is also rendered by `/sobre/caatinga` (variant `outlined`), which must not change.

**Files:**
- Modify: `components/marketing/Destaques.tsx:13`
- Modify: `app/globals.css` (the `.text-subtle-medium` comment, Step 6)
- Modify: `components/marketing/Destaques.module.css:1-10` (header comment), `:21-32` (`.container`, `.label`)
- Modify: `components/marketing/IndicatorCard.tsx:11-14` (icon prop comment), `:33-35` (icon size/src), `:45` (img)
- Modify: `components/marketing/IndicatorCard.module.css:17-20` (`.raised`), `:38-65` (icon and outlined rules), `:86-88` (`.value`)
- Modify (assets, used only by these two components): `public/icons/indicator-card/map.svg` (replaced by the 24px artwork), `public/icons/destaques/{populacao,remocao,eficiencia,capacidade}.svg` (same)
- Delete: `public/icons/indicator-card/map-sobre.svg`
- Test: `tests/lib/marketingPalette.test.ts` (PAIRS)

**Interfaces:**
- Consumes (Task 1): `.text-h2` at letter-spacing -0.225px (the card value inherits it; nothing to change here); Rubik loaded at weight `400 800` (the label needs 700).
- Produces: `IndicatorCard` keeps its props (`label`, `value`, `unit?`, `description`, `icon?`, `variant?: "raised" | "outlined"`); the default icon path is now `/icons/indicator-card/map.svg` for both variants.

- [ ] **Step 1: Add the white card's pairs to the palette test**

In `tests/lib/marketingPalette.test.ts`, append inside `PAIRS` (after the lines added by Task H1):

```ts
  // The landing's indicator cards are white (ROLE-Primario-TextoSobre as a
  // fill, Figma 18862:8542..8545): their value, unit and description.
  ['--bg-texto-secundario', '--role-primario-texto-sobre'],
  ['--am-400', '--role-primario-texto-sobre'],
  ['--bg-texto-primario', '--role-primario-texto-sobre'],
```

- [ ] **Step 2: Run the palette test**

Run: `npx vitest run tests/lib/marketingPalette.test.ts`
Expected: PASS (14.95:1, 5.38:1, 17.43:1; all tokens already exist).

- [ ] **Step 3: Replace the 18px icon with the design's 24px artwork**

```bash
cp public/icons/indicator-card/map-sobre.svg public/icons/indicator-card/map.svg
git rm public/icons/indicator-card/map-sobre.svg
for f in populacao remocao eficiencia capacidade; do cp public/icons/indicator-card/map.svg public/icons/destaques/$f.svg; done
md5sum public/icons/indicator-card/map.svg public/icons/destaques/*.svg
```

Expected: five identical hashes, `9dab07f73751b7b9cc38255230f7df4d`. (The landing's Figma icon, asset of I18862:8542;18808:5943, is the same 24x24 path as the old `map-sobre.svg`: an 18px glyph inset 3px.)

- [ ] **Step 4: One icon size and one default in IndicatorCard.tsx**

`components/marketing/IndicatorCard.tsx:11-14` — replace

```tsx
  // Defaults to the component's own "Map" glyph, which differs by variant:
  // 18px on the landing, and a different, 24px glyph on the Sobre pages (Figma
  // I18988:8714;18808:5943).
  icon?: string;
```

with

```tsx
  // Defaults to the component's own 24px "Map" icon, the same artwork on the
  // landing (Figma I18862:8542;18808:5943) and the Sobre pages
  // (I18988:8714;18808:5943).
  icon?: string;
```

`:33-35` — replace

```tsx
  const iconSize = variant === "outlined" ? 24 : 18;
  const iconSrc =
    icon ?? (variant === "outlined" ? "/icons/indicator-card/map-sobre.svg" : "/icons/indicator-card/map.svg");
```

with

```tsx
  const iconSrc = icon ?? "/icons/indicator-card/map.svg";
```

`:45` — replace

```tsx
        <img src={iconSrc} alt="" width={iconSize} height={iconSize} className={styles.icon} />
```

with

```tsx
        <img src={iconSrc} alt="" width={24} height={24} className={styles.icon} />
```

- [ ] **Step 5: White fill, 24px icon and 34px value box for both variants**

`components/marketing/IndicatorCard.module.css:17-20` — replace

```css
.raised {
  background: var(--bg-fundo);
  box-shadow: var(--shadow);
}
```

with

```css
/* White, not the cream page background: Figma fills the landing card with
 * ROLE-Primario-TextoSobre (#ffffff, 18862:8542..8545). */
.raised {
  background: var(--role-primario-texto-sobre);
  box-shadow: var(--shadow);
}
```

`:38-65` — replace

```css
.icon {
  flex: none;
  width: 18px;
  height: 18px;
}

.outlined .icon {
  width: 24px;
  height: 24px;
}

/* The Sobre instances are 166px tall whatever their text (18988:8714,
 * 18988:8731), with the figure in a 34px box and the 1px stroke drawn inside
 * the card, as Figma draws strokes. A CSS border adds to the box instead, so
 * the bottom padding gives up those 2px. min-height rather than height, so a
 * description that wraps further at narrow widths grows the card instead of
 * being clipped. */
.outlined {
  min-height: 166px;
}

.outlined .body {
  padding-bottom: 22px;
}

.outlined .value {
  line-height: 34px;
}
```

with

```css
.icon {
  flex: none;
  width: 24px;
  height: 24px;
}

/* The Sobre instances are 166px tall whatever their text (18988:8714,
 * 18988:8731), with the 1px stroke drawn inside the card, as Figma draws
 * strokes. A CSS border adds to the box instead, so the bottom padding gives
 * up those 2px. min-height rather than height, so a description that wraps
 * further at narrow widths grows the card instead of being clipped. */
.outlined {
  min-height: 166px;
}

.outlined .body {
  padding-bottom: 22px;
}
```

`:86-88` (now a few lines higher; match on content) — replace

```css
.value {
  color: var(--bg-texto-secundario);
}
```

with

```css
/* Both variants set the figure in a 34px box with its 36px line centred in it
 * (I18862:8542;18808:5950); a 34px line height reproduces that. */
.value {
  line-height: 34px;
  color: var(--bg-texto-secundario);
}
```

- [ ] **Step 6: Destaques label in Rubik Bold with tracking**

`components/marketing/Destaques.tsx:13` — replace

```tsx
        <p className={`${styles.label} text-p-ui-semibold`}>Destaques</p>
```

with

```tsx
        <p className={styles.label}>Destaques</p>
```

`components/marketing/Destaques.module.css:1-10` — replace

```css
/* Destaques, Figma "Background+HorizontalBorder", node 18862:8538, four
 * indicator cards (component "Cards de indicadores em destaque", 8689:52527,
 * used at instances 18862:8542..18862:8545). The cards themselves are
 * IndicatorCard and styled in IndicatorCard.module.css; this file lays out the
 * band, its label and the grid. Font sizes/weights/line-heights come only from
 * the .text-* utility classes applied in Destaques.tsx (see app/globals.css).
 *
 * The section's own label ("Destaques") is set at 16px/Bold/uppercase in the
 * Figma node. It uses the .text-p-ui-semibold utility (app/globals.css) plus
 * an uppercase transform, which is layout, not a metric. */
```

with

```css
/* Destaques, Figma "Background+HorizontalBorder", node 18862:8538, four
 * indicator cards (component "Cards de indicadores em destaque", 8689:52527,
 * used at instances 18862:8542..18862:8545). The cards themselves are
 * IndicatorCard and styled in IndicatorCard.module.css; this file lays out the
 * band, its label and the grid.
 *
 * The section's own label ("Destaques", node 18862:8540) is Rubik Bold 16px on
 * a normal line height with 1.5px tracking, uppercase. No type utility carries
 * that style, so .label below sets it in full. */
```

`:21-32` — replace

```css
.container {
  padding-block: 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.label {
  color: var(--bg-texto-secundario);
  text-transform: uppercase;
  margin: 0;
}
```

with

```css
/* 310px tall against the design's 312: Figma's band is a fixed-height frame
 * that centres its 229px of content in 232; this one hugs its content
 * (1px border + 40 + 19 + 24 + 186 + 40). */
.container {
  padding-block: 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.label {
  font-family: var(--font-sans, var(--font-fallback));
  font-weight: 700;
  font-size: 16px;
  line-height: normal;
  letter-spacing: 1.5px;
  color: var(--bg-texto-secundario);
  text-transform: uppercase;
  margin: 0;
}
```

The `.text-subtle-medium` comment in `app/globals.css` now says something false: that Destaques renders its label with `.text-p-ui-semibold`. Match on content (Task 1 moved the lines) and replace

```css
 * there is no bound token for either, so both were measured off their nodes.
 * Destaques does not actually use 700/16: it deliberately renders its label
 * with `.text-p-ui-semibold` (600/16) instead — a documented substitution,
 * see the comment in Destaques.module.css. */
```

with

```css
 * there is no bound token for either, so both were measured off their nodes.
 * Destaques sets its 700/16 in Destaques.module.css, with the 1.5px tracking
 * no utility carries. */
```

- [ ] **Step 7: Run the whole suite and lint**

Run: `npx vitest run` — Expected: PASS (`tests/lib/destaquesContent.test.ts` is unaffected: copy and units are unchanged).
Run: `npm run lint` — Expected: no problems beyond the baseline.

- [ ] **Step 8: RENDERED CHECK at 1436px (landing and /sobre/caatinga)**

```js
await frameAt('/')
probe('#destaques', 1)
probe('#destaques [class*="__label"]', 1, '#destaques')
probe('#destaques li > div', 4, '#destaques')
probe('#destaques li:first-child [class*="__header"], #destaques li:first-child [class*="__icon"], #destaques li:first-child [class*="__header"] [class*="__label"]', 3, '#destaques')
probe('#destaques li:first-child [class*="__value"], #destaques li:first-child [class*="__unit"], #destaques li:first-child [class*="__description"]', 3, '#destaques')
await frameAt('/sobre/caatinga')
probe('[class*="__outlined"]', 2)
probe('[class*="__outlined"] [class*="__icon"], [class*="__outlined"] [class*="__value"]', 2)
```

Expected on `/` (relative to `#destaques`; the section at `@0,571 1436x310 bg=rgb(230, 234, 235) bd=1px rgb(191, 202, 206)/0px rgb(0, 29, 39)`):

| element | expected |
|---|---|
| "Destaques" label | `@80,41 109.7x19 f=rubik 700 16px/normal ls=1.5px c=rgb(0, 43, 57)` uppercase |
| cards | `@80,84`, `@405,84`, `@730,84`, `@1055,84`, each `301x186 bg=rgb(255, 255, 255) br=8px sh=rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px` |
| card 1 header | `@80,84 301x48 pad=12px 16px 12px 16px gap=16px bg=rgb(39, 114, 91)` |
| card 1 icon | `@96,96 24x24` |
| card 1 header label | `@136,98 137x20 f=rubik 600 14px/20px c=rgb(255, 255, 255)` "População do bioma" |
| card 1 value | `@96,144 37.7x34 f=rubik 600 30px/34px ls=-0.225px c=rgb(0, 43, 57)` "26" |
| card 1 unit | `@141.7,154 50.8x24 f=rubik 400 14px/24px c=rgb(82, 111, 120)` "milhões" |
| card 1 description | `@96,186 269x20 f=rubik 400 14px/20px c=rgb(0, 29, 39)` |

Expected on `/sobre/caatinga` (unchanged from before this task): outlined cards `bg=rgb(252, 248, 235) bd=1px rgb(82, 111, 120)/1px rgb(82, 111, 120)`, height ≥ 166, icon `24x24`, value `f=rubik 600 30px/34px` (letter-spacing -0.225px now comes from Task 1).

Figma for reference: label 109x19 at y=42, cards 301x186 at y=85, header 48 tall, icon 24x24 at card x+16.

- [ ] **Step 9: Commit**

```bash
git add components/marketing/Destaques.tsx components/marketing/Destaques.module.css components/marketing/IndicatorCard.tsx components/marketing/IndicatorCard.module.css public/icons/indicator-card public/icons/destaques tests/lib/marketingPalette.test.ts app/globals.css
git commit -m "fix: match the Destaques label and indicator cards to Figma"
```

---
### Task H4: "Conheça a plataforma" (Plataforma) and the "Ver mais" link (MoreLink)

Figma: section 18862:8546 and its tab variants 18916:9520 / 9585 / 9650; tab labels in **Archivo** SemiBold 16 (I18862:8546;18846:7562 and siblings; `pt-14 pb-16 px-2`, 3px active underline drawn inside a 47px button); text column I18862:8546;18846:7575 (`justify-center`, `self-stretch`, gap 24; paragraph + quote in I18862:8546;18846:7578 with gap 16); image frame I18862:8546;18846:7574 (radius 12); "Ver mais" I18862:8546;18846:7558 and 18862:8579 (Inter Medium 14/24, radius 6, `px-16 py-8`, gap 8, Material `keyboard_arrow_right` 16px); hovers 18916:9468 (tab) and 18916:9438 ("Ver mais"). MoreLink's only callers are Plataforma and the Comunicação block, both on the landing.

**Files:**
- Modify: `components/marketing/Plataforma.tsx:90` (tab class), `:140-148` (panel text)
- Modify: `components/marketing/Plataforma.module.css:1-22` (header comment), `:69-81` (`.tab`), `:116-132` (`.imagem`), `:134-139` (`.texto`)
- Modify: `components/marketing/MoreLink.tsx:2`, `:16-29`
- Modify: `components/marketing/MoreLink.module.css:1-16`

**Interfaces:**
- Consumes (Task 1): `.text-ui-medium` (Inter 500 14/24); `.text-h2` at -0.225px (the panel title inherits it).
- Consumes (Task 1): the `--font-archivo` variable (Archivo SemiBold 600) on the marketing `<body>`.
- Produces: `MoreLink({ href, contexto })` keeps its props; it now hugs its content (114x40 for "Ver mais") instead of a fixed 114x40 box.

- [ ] **Step 1: Tab labels in Archivo, with the design's padding**

`components/marketing/Plataforma.tsx:90` — replace

```tsx
                className={`${styles.tab} text-p-ui-semibold ${selected ? styles.tabActive : ""}`}
```

with

```tsx
                className={`${styles.tab}${selected ? ` ${styles.tabActive}` : ""}`}
```

`components/marketing/Plataforma.module.css:69-81` — replace

```css
.tab {
  flex: none;
  appearance: none;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  /* 10 + 24 (the .text-p-ui-semibold line box) + 10 + 3 = 47, plus the strip's
   * own 1px bottom border = 48, the height of the design's tab strip. */
  padding: 10px 2px;
  color: var(--am-400);
  white-space: nowrap;
}
```

with

```css
.tab {
  flex: none;
  appearance: none;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  /* Archivo SemiBold 16px, the face Figma sets every tab label in
   * (I18862:8546;18846:7562 and its siblings), on its 17px "normal" line box,
   * written out so the strip does not depend on the font's metrics:
   * 14 + 17 + 13 + 3 = 47, plus the strip's own 1px border = 48. Figma's
   * 16px bottom padding has the 3px underline drawn inside it. */
  font-family: var(--font-archivo, var(--font-sans, var(--font-fallback)));
  font-weight: 600;
  font-size: 16px;
  line-height: 17px;
  padding: 14px 2px 13px;
  color: var(--am-400);
  white-space: nowrap;
}
```

`:1-22` — replace the header comment's first paragraph and its "Open question" paragraph. Replace

```css
/* Plataforma, Figma node 18862:8546 ("Sobre"). Font sizes/weights/line-heights
 * come only from the .text-* utility classes applied in Plataforma.tsx (see
 * app/globals.css); this file handles color, spacing and layout only.
```

with

```css
/* Plataforma, Figma node 18862:8546 ("Sobre"). Font sizes/weights/line-heights
 * come from the .text-* utility classes applied in Plataforma.tsx (see
 * app/globals.css), except the tab labels, whose Archivo face no utility
 * carries (.tab below).
```

and delete these lines (the end of the same comment) — the question is settled by `.tab`:

```css
 *
 * Open question: `.tab` uses the bound `.text-p-ui-semibold` utility
 * (600/16px, Rubik). The Figma node's own tab label instances (18862:8546,
 * e.g. the "O que é a CaatiVAR?" text node I18862:8546;18846:7562 and its
 * inactive siblings 18846:7565/7568/7571) are all set in `Archivo SemiBold
 * 16px`, not Rubik — whether this tab label should actually render in
 * Archivo rather than Rubik is still open.
```

so the comment ends with `* --bg-texto-primario and is invisible from a resting colour that dark.` followed by ` */`.

- [ ] **Step 2: Centre the text column against the image, 24px under the title**

`components/marketing/Plataforma.tsx:140-148` — replace

```tsx
      <div className={styles.texto}>
        <h2 className={`${styles.titulo} text-h2`}>{conteudo.titulo}</h2>
        {conteudo.paragrafos.map((paragrafo) => (
          <p key={paragrafo} className={`${styles.paragrafo} text-body`}>
            {paragrafo}
          </p>
        ))}
        <Quote>{conteudo.destaque}</Quote>
      </div>
```

with

```tsx
      <div className={styles.texto}>
        <h2 className={`${styles.titulo} text-h2`}>{conteudo.titulo}</h2>
        <div className={styles.corpo}>
          {conteudo.paragrafos.map((paragrafo) => (
            <p key={paragrafo} className={`${styles.paragrafo} text-body`}>
              {paragrafo}
            </p>
          ))}
          <Quote>{conteudo.destaque}</Quote>
        </div>
      </div>
```

`components/marketing/Plataforma.module.css:134-139` — replace

```css
.texto {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
```

with

```css
/* Figma I18862:8546;18846:7575: the column takes the rest of the row, fills
 * its height (the 250px image) and centres its content there — 24px between
 * the title and the body, 16px between the paragraph and the quote (.corpo,
 * I18862:8546;18846:7578). */
.texto {
  flex: 1;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  min-width: 0;
}

.corpo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

- [ ] **Step 3: 12px corners on the image frame**

`components/marketing/Plataforma.module.css:116-132` — replace

```css
 * typeset near the top; this frame holds a landscape photograph of the biome,
 * pre-cropped to 1.36, so there is nothing to protect at any edge. */
.imagem {
  flex: none;
  width: 340px;
  height: 250px;
  border-radius: var(--radius);
  border: 1px solid var(--am-200);
  object-fit: cover;
}
```

with

```css
 * typeset near the top; this frame holds a landscape photograph of the biome,
 * pre-cropped to 1.36, so there is nothing to protect at any edge.
 *
 * The frame's corners are 12px (I18862:8546;18846:7574); the design system has
 * no radius token that size, so it is written out. */
.imagem {
  flex: none;
  width: 340px;
  height: 250px;
  border-radius: 12px;
  border: 1px solid var(--am-200);
  object-fit: cover;
}
```

- [ ] **Step 4: "Ver mais" in Inter, hugging its content, with Material's chevron**

`components/marketing/MoreLink.tsx:2` — replace

```tsx
import { FaAngleRight } from "react-icons/fa6";
```

with

```tsx
import { MdKeyboardArrowRight } from "react-icons/md";
```

`:16-29` — replace

```tsx
// The design's "Ver mais" control: a 114x40 link at the right end of a
// section's header row, in Figma both in "Conheça a plataforma" (node
// 18862:8546) and in "Comunicação" (node 18862:8578), opening that section's
// internal page. Its fill samples to #587c22 = --role-marca-ancora-padrao
// exactly — note that differs from the hero and map buttons, which the design
// binds to --role-marca-ancora-hover.
export default function MoreLink({ href, contexto }: MoreLinkProps) {
  return (
    <Link href={href} className={`${styles.moreLink} text-body`}>
      Ver mais
      <span className="sr-only"> {contexto}</span>
      <FaAngleRight aria-hidden className={styles.icon} />
    </Link>
  );
}
```

with

```tsx
// The design's "Ver mais" control: a 114x40 link at the right end of a
// section's header row, in Figma both in "Conheça a plataforma" (node
// 18862:8546) and in "Comunicação" (node 18862:8578), opening that section's
// internal page. Its fill samples to #587c22 = --role-marca-ancora-padrao
// exactly — note that differs from the hero and map buttons, which the design
// binds to --role-marca-ancora-hover. The chevron is Material's
// keyboard_arrow_right, the glyph the design uses (I18862:8579;13:2244).
export default function MoreLink({ href, contexto }: MoreLinkProps) {
  return (
    <Link href={href} className={`${styles.moreLink} text-ui-medium`}>
      Ver mais
      <span className="sr-only"> {contexto}</span>
      <MdKeyboardArrowRight aria-hidden className={styles.icon} />
    </Link>
  );
}
```

`components/marketing/MoreLink.module.css:1-16` — replace

```css
/* 114x40 in the design, with the label and a right chevron, Figma nodes
 * 18862:8546 ("Conheça a plataforma") and 18862:8578 ("Comunicação"). Font
 * metrics come from the .text-body utility applied in MoreLink.tsx; this
 * file handles color, spacing and layout only. */
.moreLink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 114px;
  height: 40px;
  flex: none;
  border-radius: var(--radius);
  background: var(--role-marca-ancora-padrao);
  color: var(--role-marca-ancora-texto-sobre);
}
```

with

```css
/* The label and a right chevron, Figma nodes 18862:8546 ("Conheça a
 * plataforma") and 18862:8578 ("Comunicação"). Like the design's auto-layout
 * button it hugs its content: 16 + "Ver mais" + 8 + 16px icon + 16 = 114x40.
 * Font metrics come from the .text-ui-medium utility applied in MoreLink.tsx;
 * this file handles color, spacing and layout only. */
.moreLink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  flex: none;
  border-radius: var(--radius-interno);
  background: var(--role-marca-ancora-padrao);
  color: var(--role-marca-ancora-texto-sobre);
}
```

Leave the hover rule (Figma 18916:9438, `--role-marca-ancora-hover`) and `.icon` (16x16) unchanged.

- [ ] **Step 5: Run the whole suite and lint**

Run: `npx vitest run` — Expected: PASS (`tests/lib/plataformaContent.test.ts` is unaffected; the SECTION_IDS extractor still reads `<section id="plataforma"`).
Run: `npm run lint` — Expected: no problems beyond the baseline.

- [ ] **Step 6: RENDERED CHECK at 1436px**

```js
await frameAt('/')
probe('#plataforma', 1)
probe('#plataforma [class*="__moreLink"], #plataforma [class*="__moreLink"] svg', 2, '#plataforma')
probe('#plataforma [role="tab"]', 4, '#plataforma')
probe('#plataforma [role="tabpanel"]:not([hidden]) [class*="__imagem"], #plataforma [role="tabpanel"]:not([hidden]) [class*="__texto"], #plataforma [role="tabpanel"]:not([hidden]) h2', 3, '#plataforma')
probe('#plataforma [role="tabpanel"]:not([hidden]) [class*="__paragrafo"], #plataforma [role="tabpanel"]:not([hidden]) [class*="__quote"]', 2, '#plataforma')
hoverProbe('#plataforma [role="tab"][aria-selected="false"]')
hoverProbe('#plataforma [class*="__moreLink"]')
```

Expected (relative to `#plataforma`; the section `1436x442`):

| element | expected |
|---|---|
| "Ver mais" | `@1242,40 114x40 pad=8px 16px 8px 16px gap=8px f=inter 500 14px/24px c=rgb(255, 255, 255) bg=rgb(88, 124, 34) br=6px` |
| chevron svg | `@1324,52 16x16` |
| tab "O que é a CaatiVAR?" (active) | `@80,80 156.1x47 pad=14px 2px 13px 2px f=archivo 600 16px/17px c=rgb(88, 124, 34) bd=0px rgb(88, 124, 34)/3px rgb(88, 124, 34)` (family name as Task 1's `localFont` export names it) |
| tab "A Caatinga" | `@270.1,80 84.6x47 c=rgb(82, 111, 120) bd=0px rgb(82, 111, 120)/3px rgba(0, 0, 0, 0)` |
| tab "Carbono e comunidades" | `@388.8,80 183.8x47` |
| tab "Como funciona" | `@606.6,80 115.8x47` |
| image | `@80,152 340x250 br=12px bd=1px rgb(191, 202, 206)/1px rgb(191, 202, 206)` |
| text column | `@460,152 896x250 gap=24px` |
| h2 | `@460,181 896x36 f=rubik 600 30px/36px ls=-0.225px c=rgb(55, 77, 21)` |
| paragraph | `@460,241 896x72 f=rubik 400 14px/24px` |
| quote | `@460,329 896x44 f=rubik 700 14px/24px pad=10px 0px 10px 20px` (its 3px `rgb(82, 111, 120)` rule is on the left, outside probe's top/bottom border readout) |
| hover inactive tab | `c=rgb(0, 29, 39) bgi=linear-gradient(rgb(0, 29, 39), rgb(0, 29, 39))` (Figma 18916:9468) |
| hover "Ver mais" | `bg=rgb(71, 101, 27)` (Figma 18916:9438) |

Then click "A Caatinga" (`document.querySelector('#plataforma [role="tab"]:nth-child(2)').click()`) and re-run the panel probe: image `@80,152 340x250 br=12px`, h2 `@460,181 896x36` "A Caatinga", paragraph `@460,241 896x72` (all four tabs' paragraphs set in 3 lines at 896px, so every tab's title sits at y=181).

Figma for reference: tab buttons 157 / 85 / 184 / 116 wide, 47 tall at y=80; title at y≈180.7.

- [ ] **Step 7: Commit**

```bash
git add components/marketing/Plataforma.tsx components/marketing/Plataforma.module.css components/marketing/MoreLink.tsx components/marketing/MoreLink.module.css
git commit -m "fix: match the platform tabs, panel layout and Ver mais link to Figma"
```

---
### Task H5: Ferramenta

Figma: band 18862:8547 (fill `ROLE-Categorica2-Hover` #002430); panel 18862:8549 (`pl-40 pr-80 py-83`, gap 21); eyebrow 18862:8551 (Rubik Medium 14 on a 14px line, `AM200` #bfcace); title 18862:8553 (`CTX-Positivo-TextoSobre` #ffffff); list in the "Margin" frame 18862:8556 (`pt-4 pb-6`); button 18862:8574 (Inter Medium 14/24, label `--primary-foreground` #f8f7f8); hover 18916:9764.

**Files:**
- Modify: `components/marketing/Ferramenta.tsx:52`, `:75`
- Modify: `components/marketing/Ferramenta.module.css:13-18` (`.ferramenta`), `:52-81` (panel comment, `.panel`, `.eyebrow`, `.title`), `:91-98` (`.list`), `:118-131` (`.button`)
- Test: `tests/lib/marketingPalette.test.ts` (PAIRS)

**Interfaces:**
- Consumes (Task 1): `.text-ui-medium`; `.text-h2` at -0.225px (the title inherits it). Existing `.text-subtle-medium` (Rubik 500 14/20).
- Consumes (Task 1): `--primary-foreground`.
- Produces: nothing other tasks rely on.

- [ ] **Step 1: Add the band's pairs to the palette test**

In `tests/lib/marketingPalette.test.ts`, append inside `PAIRS` (after the lines added by Task H3):

```ts
  // Ferramenta's band (Figma 18862:8547) is -categorica2-hover: its eyebrow
  // (--am-200), title (-ctx-positivo-texto-sobre), body and list; its button
  // label is --primary-foreground at rest and on the hover fill (18916:9764).
  ['--am-200', '--role-categorica2-hover'],
  ['--ctx-positivo-texto-sobre', '--role-categorica2-hover'],
  ['--bg-texto-sobre-inverso', '--role-categorica2-hover'],
  ['--primary-foreground', '--role-categorica1-padrao'],
  ['--primary-foreground', '--role-categorica1-hover'],
```

- [ ] **Step 2: Run the palette test**

Run: `npx vitest run tests/lib/marketingPalette.test.ts`
Expected: PASS (9.69, 16.22, 16.05, 5.39 and 7.31:1).

- [ ] **Step 3: Eyebrow weight and button font in Ferramenta.tsx**

`components/marketing/Ferramenta.tsx:52` — replace

```tsx
        <p className={`${styles.eyebrow} text-subtle-semibold`}>
```

with

```tsx
        <p className={`${styles.eyebrow} text-subtle-medium`}>
```

`:75` — replace

```tsx
        <a href={MAPA_LINK.href} className={`${styles.button} text-body`}>
```

with

```tsx
        <a href={MAPA_LINK.href} className={`${styles.button} text-ui-medium`}>
```

- [ ] **Step 4: Band colour**

`components/marketing/Ferramenta.module.css:13-18` — replace

```css
.ferramenta {
  display: flex;
  align-items: stretch;
  min-height: 560px;
  background: var(--bg-fundo-inverso);
}
```

with

```css
/* The design fills the band with ROLE-Categorica2-Hover (#002430, node
 * 18862:8547), a dark teal, not the near-black inverse background. */
.ferramenta {
  display: flex;
  align-items: stretch;
  min-height: 560px;
  background: var(--role-categorica2-hover);
}
```

- [ ] **Step 5: Panel insets, eyebrow, title**

`components/marketing/Ferramenta.module.css:52-81` — replace

```css
/* Panel content is inset 40px from the panel's OWN left edge (Figma nodes
 * 18862:8551..8574), not aligned to the page's content column — the design
 * deliberately breaks that alignment here since the band is full-bleed. The
 * vertical rhythm below (padding-top 83px, then per-element margins) is read
 * directly off the node's y-positions: eyebrow y=83, h2 y=118, body y=211,
 * list y=304.5, button y=461.5, panel height 560. */
.panel {
  flex: 1 1 50%;
  display: flex;
  flex-direction: column;
  padding: 83px 40px 58px;
  color: var(--bg-texto-sobre-inverso);
  min-width: 0;
}

.eyebrow {
  margin: 0;
  color: color-mix(in srgb, var(--bg-texto-sobre-inverso) 72%, transparent);
  text-transform: uppercase;
}
```

with

```css
/* Panel content is inset 40px from the panel's OWN left edge and 80px from its
 * right (Figma node 18862:8549), not aligned to the page's content column —
 * the design deliberately breaks that alignment here since the band is
 * full-bleed. The vertical rhythm below (padding-top 83px, then per-element
 * margins) is read directly off the nodes' y-positions: eyebrow y=83 (14px
 * line box), h2 y=118, body y=211, list y=308.5 (its "Margin" frame at 304.5
 * plus 4px of top padding), button y=461.5, panel height 560. */
.panel {
  flex: 1 1 50%;
  display: flex;
  flex-direction: column;
  padding: 83px 80px 58px 40px;
  color: var(--bg-texto-sobre-inverso);
  min-width: 0;
}

/* AM200 on a 14px line box (node 18862:8551); .text-subtle-medium sets the
 * face, size and weight, the line height is overridden here. */
.eyebrow {
  margin: 0;
  line-height: 14px;
  color: var(--am-200);
  text-transform: uppercase;
}
```

Then, in the same file, replace

```css
.title {
  margin: 15px 0 0;
  max-width: 391px;
}
```

with

```css
.title {
  margin: 21px 0 0;
  max-width: 391px;
  color: var(--ctx-positivo-texto-sobre);
}
```

- [ ] **Step 6: List and button offsets, button label colour**

`components/marketing/Ferramenta.module.css:91-98` — in `.list`, replace

```css
  margin: 21px 0 0;
```

with

```css
  margin: 25px 0 0;
```

`:118-131` — replace

```css
.button {
  align-self: flex-start;
  margin-top: 31px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: var(--radius-interno);
  white-space: nowrap;
  /* Figma node 18862:8574 binds the categorica1 role, not the brand green
     the hero uses; the hover step is frame 18916:9764. */
  background: var(--role-categorica1-padrao);
  color: var(--role-primario-texto-sobre);
}
```

with

```css
/* 27 = the list's "Margin" frame's 6px bottom padding + the column's 21px gap. */
.button {
  align-self: flex-start;
  margin-top: 27px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: var(--radius-interno);
  white-space: nowrap;
  /* Figma node 18862:8574 binds the categorica1 role, not the brand green
     the hero uses, and a --primary-foreground label; the hover step is frame
     18916:9764. */
  background: var(--role-categorica1-padrao);
  color: var(--primary-foreground);
}
```

- [ ] **Step 7: Run the whole suite and lint**

Run: `npx vitest run` — Expected: PASS.
Run: `npm run lint` — Expected: no problems beyond the baseline.

- [ ] **Step 8: RENDERED CHECK at 1436px**

```js
await frameAt('/')
probe('#ferramenta, #ferramenta [class*="__panel"]', 2, '#ferramenta')
probe('#ferramenta [class*="__eyebrow"], #ferramenta h2, #ferramenta [class*="__body"]', 3, '#ferramenta')
probe('#ferramenta ul, #ferramenta [class*="__button"]', 2, '#ferramenta')
hoverProbe('#ferramenta [class*="__button"]')
```

Expected (relative to `#ferramenta`):

| element | expected |
|---|---|
| section | `@0,0 1436x560 bg=rgb(0, 36, 48)` |
| panel | `@729,0 707x560 pad=83px 80px 58px 40px` |
| eyebrow | `@769,83 587x14 f=rubik 500 14px/14px c=rgb(191, 202, 206)` uppercase |
| h2 | `@769,118 391x72 f=rubik 600 30px/36px ls=-0.225px c=rgb(255, 255, 255)` |
| body | `@769,211 587x72 f=rubik 400 14px/24px c=rgb(254, 254, 251)` |
| list | `@769,308 587x126 gap=10px` |
| button "Explore os dados" | `@769,461 147x40 pad=8px 16px 8px 16px f=inter 500 14px/24px c=rgb(248, 247, 248) bg=rgb(39, 114, 91) br=6px` |
| hover button | `bg=rgb(32, 92, 73) c=rgb(248, 247, 248)` (Figma 18916:9764) |

Figma for reference: eyebrow y=83, h2 y=118 (391x72), body y=211, list y=308.5, button 147x40 at y=461.5.

- [ ] **Step 9: Commit**

```bash
git add components/marketing/Ferramenta.tsx components/marketing/Ferramenta.module.css tests/lib/marketingPalette.test.ts
git commit -m "fix: match the Ferramenta band's colours and rhythm to Figma"
```

---
### Task H6: Comunicação block on the landing

Figma: block 18862:8575, cards 18862:8581 (Cartilha, left) and 18862:8582 (Caderno, right), card component 18862:7950/7992; hover state 18862:7956 in frame 18916:9437. Card: radius 16; text block `left-34 right-34 bottom-32`, gap 12 throughout; category label Rubik Medium 12/20, `rgba(255,255,255,0.7)`, uppercase; title Archivo Narrow Bold 30/34.5, white; on hover a Rubik 14/24 description and a full-width "Ver material" button (Inter Medium 14/24, `#587c22`, radius 6). No zoom on the photo in any state.

**Files:**
- Modify: `components/marketing/Comunicacao.tsx:33-43` (component comment), `:53-75` (card order), `:122`, `:125`, `:141` (classes)
- Test: `tests/components/conteudo.test.ts:85-93` (`describe('the landing Comunicação cards')`)
- Modify: `components/marketing/Comunicacao.module.css:1-13` (header comment), `:55-61` (`.card`), `:86-102` (`.photo` and the zoom rule), `:104-108` (gradient comment), `:129-135` (`.text`), `:157-168` (`.description`), `:208-219` (reduced motion), `:221-233` (`.label`, `.title`)

**Interfaces:**
- Consumes (Task 1): `.text-ui-medium`; `--font-display` (Archivo Narrow 700, already on `<body>`), `--font-sans` (Rubik).
- Consumes (Task H4): `MoreLink` (unchanged props).
- Produces: nothing other tasks rely on.

- [ ] **Step 0: Pin the card order in a failing test**

In `tests/components/conteudo.test.ts`, inside `describe('the landing Comunicação cards', …)`, after the closing `})` of `it('lead to the publication pages', …)` (line 92), insert:

```ts

  // Figma 18862:8580: the cartilha on the left, the caderno on the right.
  it('sets the cartilha before the caderno, as the design orders them', async () => {
    const markup = html(Comunicacao, { conteudo: await getComunicacaoContent(null) })

    expect(markup.indexOf('href="/comunicacao/cartilha-1-o-que-e-credito-de-carbono"')).toBeLessThan(
      markup.indexOf('href="/comunicacao/caderno-mercado-de-carbono-florestal-na-caatinga"'),
    )
  })
```

Run: `npx vitest run tests/components/conteudo.test.ts -t "cartilha before the caderno"`
Expected: FAIL, `AssertionError: expected <a larger index> to be less than <a smaller index>` (the caderno renders first today).

- [ ] **Step 1: Cartilha first, as the design orders the cards**

`components/marketing/Comunicacao.tsx:53-75` — replace

```tsx
  const cards: CardData[] = [
    {
      key: "caderno",
      label: "CADERNO TEMÁTICO",
      title: conteudo.caderno.title,
      description: conteudo.caderno.description,
      // Falls back to the publication's cover art if the photograph is ever removed.
      cover: FOTOS.caderno ?? conteudo.caderno.cover,
      slug: conteudo.caderno.slug,
    },
    ...(primeiraCartilha
      ? [
          {
            key: "cartilha",
            label: "CARTILHA",
            title: primeiraCartilha.title,
            description: primeiraCartilha.description ?? DESCRICAO_CARTILHA,
            cover: FOTOS.cartilha ?? primeiraCartilha.cover,
            slug: primeiraCartilha.slug,
          },
        ]
      : []),
  ];
```

with

```tsx
  const cards: CardData[] = [
    ...(primeiraCartilha
      ? [
          {
            key: "cartilha",
            label: "CARTILHA",
            title: primeiraCartilha.title,
            description: primeiraCartilha.description ?? DESCRICAO_CARTILHA,
            cover: FOTOS.cartilha ?? primeiraCartilha.cover,
            slug: primeiraCartilha.slug,
          },
        ]
      : []),
    {
      key: "caderno",
      label: "CADERNO TEMÁTICO",
      title: conteudo.caderno.title,
      description: conteudo.caderno.description,
      // Falls back to the publication's cover art if the photograph is ever removed.
      cover: FOTOS.caderno ?? conteudo.caderno.cover,
      slug: conteudo.caderno.slug,
    },
  ];
```

`:33-43` — in the component comment, replace

```tsx
// so the choice of which ones is fixed by the task brief rather than by this
// component: the caderno (labelled "CADERNO TEMÁTICO") and cartilhas[0]
// (labelled "CARTILHA"). The header row's "Ver mais" opens the Comunicação
// page, which lists every publication.
```

with

```tsx
// so the choice of which ones is fixed by the task brief rather than by this
// component: cartilhas[0] (labelled "CARTILHA") on the left and the caderno
// (labelled "CADERNO TEMÁTICO") on the right, the design's order (18862:8581,
// 18862:8582). The header row's "Ver mais" opens the Comunicação page, which
// lists every publication.
```

- [ ] **Step 2: Label, title and button classes**

`:122` — replace

```tsx
        <p className={`${styles.label} text-subtle-semibold`} aria-hidden="true">
```

with

```tsx
        <p className={styles.label} aria-hidden="true">
```

`:125` — replace

```tsx
        <h3 id={titleId} className={`${styles.title} text-lead`}>
```

with

```tsx
        <h3 id={titleId} className={styles.title}>
```

`:141` — replace

```tsx
              <span className={`${styles.cta} text-body`} aria-hidden="true">
```

with

```tsx
              <span className={`${styles.cta} text-ui-medium`} aria-hidden="true">
```

- [ ] **Step 3: Replace the stale header comment**

`components/marketing/Comunicacao.module.css:1-13` — replace

```css
/* Comunicação, Figma node 18862:8575 ("Comunicação"), 1436x624, card row
 * 18862:8580 (626x480 cards, 24px gutter). Font sizes/weights/line-heights
 * come only from the .text-* utility classes applied in Comunicacao.tsx (see
 * app/globals.css); this file handles color, spacing and layout only.
 *
 * The card title has no bound type-scale token in the design file itself
 * (the geometry pulled before the MCP quota ran out gives the card's box,
 * not its text style) — `.text-lead` was picked as the closest utility scale
 * for a card headline that sits a step below the section's own `.text-h2`,
 * the same reasoning Plataforma.tsx used for its panel `.titulo`. If the
 * design system later binds a dedicated variable for this card title, this
 * should switch to it.
 */
```

with

```css
/* Comunicação, Figma node 18862:8575 ("Comunicação"), 1436x624, card row
 * 18862:8580 (626x480 cards, 24px gutter). Font sizes/weights/line-heights
 * come from the .text-* utility classes applied in Comunicacao.tsx (see
 * app/globals.css), except the card's category label and title, whose styles
 * no utility carries: Rubik Medium 12/20 and Archivo Narrow Bold 30/34.5
 * (card component 18862:7950, nodes 18846:7819 and 18846:7821), set in
 * .label and .title below.
 */
```

- [ ] **Step 4: 16px card corners, and no photo zoom**

`:55-61` — in `.card`, replace

```css
  border-radius: var(--radius);
```

with

```css
  border-radius: 16px;
```

`:86-102` — replace

```css
.photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  transition: transform 0.2s ease;
}

/* Interactive cards get a small hover/focus lift on the photo; the
 * non-interactive card (no <a>, see Comunicacao.tsx) never receives
 * hover/focus in the first place, since nothing inside it is focusable. */
a.surface:hover .photo,
a.surface:focus-visible .photo {
  transform: scale(1.03);
}
```

with

```css
.photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}
```

`:208-219` — replace

```css
@media (prefers-reduced-motion: reduce) {
  .photo,
  .overlayExpanded,
  .extra {
    transition: none;
  }

  a.surface:hover .photo,
  a.surface:focus-visible .photo {
    transform: none;
  }
}
```

with

```css
@media (prefers-reduced-motion: reduce) {
  .overlayExpanded,
  .extra {
    transition: none;
  }
}
```

- [ ] **Step 5: Document the gradient colour substitution**

`:104-108` — replace

```css
/* Dark gradient the title sits on. Solid at the bottom (0%, opaque
 * --bg-fundo-inverso) fading to fully transparent by 65% up the card: the
 * text block below sits inside the solid portion, so its contrast against
 * the photo never depends on the photo itself — see the module's title rule
 * below for the actual contrast figure. */
```

with

```css
/* Dark gradient the title sits on. Solid at the bottom (0%, opaque
 * --bg-fundo-inverso) fading to fully transparent by 65% up the card: the
 * text block below sits inside the solid portion, so its contrast against
 * the photo never depends on the photo itself — see the module's title rule
 * below for the actual contrast figure. Figma's gradients (rest and hover,
 * 18862:7950 / 18862:7956) run to pure black, which has no token;
 * --bg-fundo-inverso (#000f15) is the nearest one. */
```

- [ ] **Step 6: The design's text block insets and 12px rhythm**

`:129-135` — replace

```css
.text {
  position: relative;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

with

```css
/* 34px in from the card's sides and 32px up from its bottom (Figma 18846:7817).
 * Every step of the block is 12px — label to title, title to description,
 * description to button — but the 12px above the description lives on the
 * description itself, so the collapsed .extra adds nothing under the title at
 * rest. */
.text {
  position: relative;
  padding: 24px 34px 32px;
  display: flex;
  flex-direction: column;
}
```

`:157-168` — in `.description`, replace

```css
  margin: 0;
```

with

```css
  margin: 12px 0 0;
```

- [ ] **Step 7: Label and title styles**

`:221-233` — replace

```css
.label {
  color: var(--bg-texto-sobre-inverso);
  text-transform: uppercase;
  margin: 0;
}

/* White on the gradient's solid stop (var(--bg-fundo-inverso), #000f15) is
 * 19.8:1 — the title never sits over bare photo pixels, only over that
 * opaque base, so the ratio holds regardless of what the photograph shows. */
.title {
  color: var(--role-terciario-texto-sobre);
  margin: 0;
}
```

with

```css
/* Rubik Medium 12/20 at 70% white, uppercase (Figma 18846:7819). */
.label {
  font-family: var(--font-sans, var(--font-fallback));
  font-weight: 500;
  font-size: 12px;
  line-height: 20px;
  color: color-mix(in srgb, var(--role-terciario-texto-sobre) 70%, transparent);
  text-transform: uppercase;
  margin: 0 0 12px;
}

/* Archivo Narrow Bold 30/34.5 (Figma 18846:7821), the hero h1's face. White on
 * the gradient's solid stop (var(--bg-fundo-inverso), #000f15) is 19.8:1. */
.title {
  font-family: var(--font-display, var(--font-sans, var(--font-fallback)));
  font-weight: 700;
  font-size: 30px;
  line-height: 34.5px;
  color: var(--role-terciario-texto-sobre);
  margin: 0;
}
```

- [ ] **Step 8: Run the whole suite and lint**

Run: `npx vitest run` — Expected: PASS (`tests/lib/comunicacaoContent.test.ts` tests the content module, not the card order).
Run: `npm run lint` — Expected: no problems beyond the baseline.

- [ ] **Step 9: RENDERED CHECK at 1436px**

```js
await frameAt('/')
probe('#comunicacao, #comunicacao h2, #comunicacao [class*="__moreLink"]', 3, '#comunicacao')
probe('#comunicacao li', 2, '#comunicacao')
probe('#comunicacao li:nth-child(1) [class*="__label"], #comunicacao li:nth-child(1) [class*="__title"]', 2, '#comunicacao li:nth-child(1)')
probe('#comunicacao li:nth-child(2) [class*="__label"], #comunicacao li:nth-child(2) [class*="__title"]', 2, '#comunicacao li:nth-child(2)')
hoverProbe('#comunicacao [class*="__surface"]', '[class*="__title"]', 0)
hoverProbe('#comunicacao [class*="__surface"]', '[class*="__description"]', 0)
hoverProbe('#comunicacao [class*="__surface"]', '[class*="__cta"]', 0)
hoverProbe('#comunicacao [class*="__surface"]', 'img', 0)
```

Expected (relative to `#comunicacao`, section `1436x624`):

| element | expected |
|---|---|
| h2 | `@80,42 197.4x36 f=rubik 600 30px/36px ls=-0.225px c=rgb(88, 124, 34)` |
| "Ver mais" | `@1242,40 114x40 br=6px` (Task H4) |
| card 1 | `@80,104 626x480 br=16px`, its link `href=/comunicacao/cartilha-1-o-que-e-credito-de-carbono` (the cartilha) |
| card 2 | `@730,104 626x480 br=16px`, the caderno |

At rest, relative to each card's own `li`:

| element | expected |
|---|---|
| card 1 label "CARTILHA" | `@34,381.5 59.3x20 f=rubik 500 12px/20px c=color(srgb 1 1 1 / 0.7)` |
| card 1 title (1 line, "O que é crédito de carbono?" or whatever cartilhas[0] holds) | `@34,413.5 558x34.5 f=archivoNarrow 700 30px/34.5px c=rgb(255, 255, 255)` — bottom at 448 (480 − 32) |
| card 2 label "CADERNO TEMÁTICO" | `@34,312.5 119x20` |
| card 2 title (3 lines) | `@34,344.5 558x103.5` |

Hovered card 1, in page coordinates (`hoverProbe` takes no base). With Tasks H2–H5 in, `#comunicacao` starts at y=1883 (76 + 495 + 310 + 442 + 560), so card 1 spans x=80..706, y=1987..2467. Values assume the cartilha's default description, `DESCRICAO_CARTILHA`, which sets in 2 lines at 558px; if Contentful supplies another, only the y values move and the relations hold — description top = title bottom + 12, button top = description bottom + 12, button bottom = card bottom − 32 (2435):

| element | expected |
|---|---|
| title | `@114,2288.5 558x34.5` |
| description | `@114,2335 558x48 f=rubik 400 14px/24px c=rgb(254, 254, 251)` |
| "Ver material" | `@114,2395 558x40 pad=8px 16px 8px 16px f=inter 500 14px/24px c=rgb(255, 255, 255) bg=rgb(88, 124, 34) br=6px` |
| img | `@80,1987 626x480 tf=none` (no zoom) |

Figma for reference: cards 626x480 radius 16 at x=80 / 730; text block 34px in, 32px up; "Mercado de carbono: o que isso tem a ver com / a Caatinga?" in 2 lines, the caderno title in 3.

- [ ] **Step 10: Commit**

```bash
git add components/marketing/Comunicacao.tsx components/marketing/Comunicacao.module.css tests/components/conteudo.test.ts
git commit -m "fix: match the landing's Comunicação cards to Figma and drop the photo zoom"
```

---
### Task H7: Footer

Figma: "Footer" 18862:8583 (symbol 16864:138883), 196 tall, `px-80 py-40`, three columns with gap 40 and `justify-center`: column 1 (16864:138729) and column 3 (16864:138755) are `flex-1` (350px each at 1436), column 2 (16864:138734) hugs its 496px logo row. Column 1: a 36x36 radius-8 mark slot + "CAATIVAR" in Archivo Narrow Bold 19, 0.38px tracking, white (18862:8253); 14px gap + 8px top margin (22) to the links row — Inter Regular 13, normal line height, gap 18 (18862:8259…8265). Column 2: "Parceiros e apoio" Rubik Medium 16/24 (16864:138736), 16px to the logos. Column 3: "CONTATO" Rubik Medium 16/24 (16864:138757), 10px gap to its (placeholder) e-mail line.

**Files:**
- Modify: `components/marketing/SiteFooter.tsx:39`, `:46-53`, `:68`, `:74`, `:84-85`, `:107-108`
- Modify: `components/marketing/SiteFooter.module.css:10-72` (`.inner` … `.heading`), `:96-101` (media query)

**Interfaces:**
- Consumes (Task 1): `--font-ui` (Inter) on `<body>`; existing `.text-p-ui` (Rubik 500 16/24) and `--font-display` (Archivo Narrow 700).
- Produces: nothing other tasks rely on.

- [ ] **Step 1: Column modifiers, mark size and type classes in SiteFooter.tsx**

`components/marketing/SiteFooter.tsx:39` — replace

```tsx
        <div className={styles.column}>
          <div className={styles.brand}>
```

with

```tsx
        <div className={`${styles.column} ${styles.columnBrand}`}>
          <div className={styles.brand}>
```

`:46-53` — replace

```tsx
            <Image
              src="/logos/logo_oca.png"
              alt=""
              width={32}
              height={32}
              className={styles.brandMark}
            />
            <span className={`${styles.brandName} text-p-ui`}>Caativar</span>
```

with

```tsx
            <Image
              src="/logos/logo_oca.png"
              alt=""
              width={36}
              height={36}
              className={styles.brandMark}
            />
            <span className={styles.brandName}>Caativar</span>
```

`:68` — replace

```tsx
                    <a href={link.href} className={`${styles.navLink} text-body`}>
```

with

```tsx
                    <a href={link.href} className={styles.navLink}>
```

`:74` — replace

```tsx
                    <Link href={link.href} className={`${styles.navLink} text-body`}>
```

with

```tsx
                    <Link href={link.href} className={styles.navLink}>
```

`:84-85` — replace

```tsx
        <div className={styles.column}>
          <h2 className={`${styles.heading} text-subtle-semibold`}>Parceiros e apoio</h2>
```

with

```tsx
        <div className={`${styles.column} ${styles.columnPartners}`}>
          <h2 className={`${styles.heading} text-p-ui`}>Parceiros e apoio</h2>
```

`:107-108` — replace

```tsx
        <div className={styles.column}>
          <h2 className={`${styles.heading} text-subtle-semibold`}>CONTATO</h2>
```

with

```tsx
        <div className={`${styles.column} ${styles.columnContact}`}>
          <h2 className={`${styles.heading} text-p-ui`}>CONTATO</h2>
```

- [ ] **Step 2: Column layout, mark slot, wordmark and links in the module**

`components/marketing/SiteFooter.module.css:10-61` — replace

```css
.inner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 40px;
  /* 40px, not 48: Figma node 18862:8583 is 196 tall around a 116-tall content
   * row (196 = 40 + 116 + 40). */
  padding-block: 40px;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

/* Column 1 is 350x74 in the design: the mark row (36) over the links row (16),
 * with the gap between them. */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brandMark {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-interno);
  object-fit: contain;
  flex: none;
}

.brandName {
  color: var(--bg-texto-sobre-inverso);
  text-transform: uppercase;
}

/* A ROW, not a column: Figma lays the four links out horizontally inside
 * column 1 (x=80, 135, 190, 292 within the 1436 frame). Stacking them made the
 * column 184px tall against the design's 74 and pushed the whole footer from
 * 196 to 280. Wraps rather than overflowing if the labels ever grow. */
.navList {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  list-style: none;
}

.navLink {
  color: color-mix(in srgb, var(--bg-texto-sobre-inverso) 80%, transparent);
}
```

with

```css
/* Figma centres three columns 40px apart: the outer two share what the
 * partner logos leave (350px each at 1436), so column 2 starts at x=470 and
 * column 3 at x=1006 (16864:138728). */
.inner {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 40px;
  /* 40px, not 48: Figma node 18862:8583 is 196 tall around a 116-tall content
   * row (196 = 40 + 116 + 40). */
  padding-block: 40px;
}

.column {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* Column 1 is 350x74 in the design: the mark row (36) over the links row (16),
 * 22px apart (a 14px gap plus the links' 8px top margin). */
.columnBrand {
  flex: 1 1 0;
  gap: 22px;
}

.columnPartners {
  flex: none;
  gap: 16px;
}

.columnContact {
  flex: 1 1 0;
  gap: 10px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* The design's 36x36, radius-8 mark slot (18862:8250), holding the OCA mark. */
.brandMark {
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  object-fit: contain;
  flex: none;
}

/* Archivo Narrow Bold 19px, 0.38px tracking, white (18862:8253). */
.brandName {
  font-family: var(--font-display, var(--font-sans, var(--font-fallback)));
  font-weight: 700;
  font-size: 19px;
  line-height: normal;
  letter-spacing: 0.38px;
  color: var(--role-terciario-texto-sobre);
  text-transform: uppercase;
}

/* A ROW, not a column: Figma lays the four links out horizontally inside
 * column 1 (x=80, 135, 190, 292 within the 1436 frame). Stacking them made the
 * column 184px tall against the design's 74 and pushed the whole footer from
 * 196 to 280. Wraps rather than overflowing if the labels ever grow. Inter
 * Regular 13px on its normal (16px) line box (18862:8259), set on the list so
 * each <li>'s line box takes it too. */
.navList {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  list-style: none;
  font-family: var(--font-ui, var(--font-fallback));
  font-weight: 400;
  font-size: 13px;
  line-height: normal;
}

/* Figma rests the links at full --bg-texto-sobre-inverso; they rest at 80%
 * here so the hover below — not in the design, kept on purpose — has a
 * brighter state to reach. */
.navLink {
  color: color-mix(in srgb, var(--bg-texto-sobre-inverso) 80%, transparent);
}
```

Further down the same file (line 68 before the replacement above; match on content) — replace the heading comment

```css
/* Columns 2 and 3 share the same small caption heading treatment. */
```

with

```css
/* Columns 2 and 3 share the same heading, Rubik Medium 16/24 (.text-p-ui,
 * Figma 16864:138736 and 16864:138757). */
```

- [ ] **Step 3: Keep the stacked layout from collapsing the flex columns**

`:96-101` — replace

```css
@media (max-width: 900px) {
  .inner {
    flex-direction: column;
    gap: 40px;
  }
}
```

with

```css
@media (max-width: 900px) {
  .inner {
    flex-direction: column;
    gap: 40px;
  }

  /* A 0 flex basis in a column of indefinite height would size the outer
   * columns from nothing; stacked, every column takes its content height. */
  .columnBrand,
  .columnContact {
    flex: none;
  }
}
```

- [ ] **Step 4: Run the whole suite and lint**

Run: `npx vitest run` — Expected: PASS (`tests/lib/marketingNav.test.ts` still finds the bare `<footer>` wrapper and FOOTER_LINKS are unchanged).
Run: `npm run lint` — Expected: no problems beyond the baseline.

- [ ] **Step 5: RENDERED CHECK at 1436px**

```js
await frameAt('/')
probe('footer, footer [class*="__column"]', 4, 'footer')
probe('footer [class*="__brandMark"], footer [class*="__brandName"], footer nav a', 6, 'footer')
probe('footer h2, footer [class*="__logos"] img', 5, 'footer')
hoverProbe('footer nav a')
```

Expected (relative to `footer`; the footer `1436x196 bg=rgb(0, 15, 21)`):

| element | expected |
|---|---|
| column 1 | `@80,40 350x74 gap=22px` |
| column 2 | `@470,40 496x116 gap=16px` |
| column 3 | `@1006,40 350x24 gap=10px` |
| mark | `@80,40 36x36 br=8px` |
| "Caativar" | `@128,45 81.2x26 f=archivoNarrow 700 19px/normal ls=0.38px c=rgb(255, 255, 255)` uppercase |
| links | "Home" `@80,98 36.4x16`, "Sobre" `@134.4,98 36.4x16`, "Comunicação" `@188.8,98 84.7x16`, "Mapas" `@291.5,98 41.3x16`, all `f=inter 400 13px/normal c=color(srgb 0.996078 0.996078 0.984314 / 0.8)` |
| "Parceiros e apoio" | `@470,40 131.9x24 f=rubik 500 16px/24px c=rgb(254, 254, 251)` |
| "CONTATO" | `@1006,40 72.4x24 f=rubik 500 16px/24px` |
| logos | Sudene `@470,80 149x60`, UFCG `@643,80 191x60`, OCA `@858,80 108x60` |
| hover link | `c=rgb(254, 254, 251)` (code-only hover, kept) |

Figma for reference: columns at x=80 / 470 / 1006; links at x=80, 135, 190, 292, y=98, 16 tall; logos at x=470 / 643 / 858.

- [ ] **Step 6: Commit**

```bash
git add components/marketing/SiteFooter.tsx components/marketing/SiteFooter.module.css
git commit -m "fix: match the footer's columns and type to Figma"
```

---
### Review Focus (Home)

The harness renders at 1436px only, so the first four are manual checks in the dev browser after H7. Each one names the task whose code it exercises.

- **Header between 1200 and 1300px wide (H1).** The inline nav must fit without touching the actions. After H1 the narrowest fit is 1012px, so at 1200px expect a gap of ≥ 150px between "Mapas" and the language switch, and no hamburger.
- **Comunicação cards on a touch screen (H6).** Under `@media (hover: none)` (DevTools device toolbar, touch) the expanded state is the resting one. Label→title, title→description and description→button should each be 12px apart; the card grows instead of clipping at 390px wide; no photo zoom.
- **Caderno card legibility at rest (H6).** Its 3-line title now starts 135px above the card bottom, where the kept resting gradient is about 57% opaque. Check the white title against the committed caderno photo, and against the cover-art fallback (temporarily blank `FOTOS.caderno`).
- **Footer stacked at ≤ 900px (H7).** The brand and contact columns must keep their content height, not collapse to 0 (the `flex: none` override). Links should wrap, not overflow, at 390px.
- **Archivo fails to load (H4).** `.tab` falls back to Rubik through `--font-sans`. The strip stays 48px tall because the line-height is fixed at 17px, but tab widths change. The rendered check's `f=archivo` line will flag this.

### Kept on purpose (Home)

These are deviations from Figma that a code comment documents with a reason, or that a user decision covers. No H task touches them. Line numbers are in the files as they are before H1–H7.

- **Destaques card 2 copy.** "Remoção de carbono / 48 % / da remoção bruta…" instead of Figma's "Remoção de GEE / 40 % / das remoções de gases de efeito estufa…": content owner's instruction, `lib/content/destaques.ts:12-25`.
- **Destaques band top border.** `--am-200` instead of Figma's untokenized #e2e0db, no matching token: `components/marketing/Destaques.module.css:12-15`.
- **Plataforma borders.** Tab-strip border (#d8d6d1) and image frame border (#d1cec8) both render as `--am-200`, no matching token: `components/marketing/Plataforma.module.css:5-9`.
- **Active nav item hover text.** `--role-marca-ancora-hover` instead of Figma's `-padrao` on the --am-100 fill, for AA (4.01:1 → 5.51:1): `components/marketing/SiteHeader.module.css:62-65`. H1 moves the comment onto `.navLinkActive:hover` without changing its reasoning.
- **"En" in the disabled colour** `--role-neutro-texto-desabilitado`: inert control, `components/marketing/SiteHeader.tsx:67-77`. Also user decision 4.
- **"Início" with its accent.** Figma's nav item reads "Inicio" in every frame, a typo of the design: `lib/marketing/nav.ts:31`.
- **Labels "Mapas", "Abrir os mapas", "Sair", and no "people" icon.** User decision 4. The "Sair" reason is at `components/marketing/SiteHeader.tsx:27-31` (rewritten by H1); "Mapas" at `lib/marketing/nav.ts:25-26`. "Abrir os mapas" (`components/marketing/Hero.tsx:85`) has no comment of its own.
- **Hero gradient.** A `--bg-fundo-inverso` tint at 100deg with 88/78/40% stops, instead of Figma's warm `rgba(40,38,35,.85→.38)`: no matching token, and the left edge is kept dark for 4.5:1, `components/marketing/Hero.module.css:58-64`.
- **Hero photos.** Five rotating photos and so five dots (Figma: one placeholder image, three dots), credited "Artur Lourenço": `components/marketing/Hero.tsx:7-15` and IMAGENS.md.
- **Code-only hovers.** Hero primary button → `--role-marca-ancora-pressionado` (no comment); Mapas → pressed green, `components/marketing/SiteHeader.module.css:77-79`; footer links 80% → 100% (H7 adds the comment explaining the 80% rest). All user decision 3.
- **Comunicação content.**
  - Which two publications show, and that cartilhas[0]'s Contentful title is rendered instead of Figma's "Mercado de carbono: o que isso tem a ver com a Caatinga?": `components/marketing/Comunicacao.tsx:38-43` and `:47-52`.
  - The committed photographs: `:15-27`.
- **Comunicação resting gradient.** Solid `--bg-fundo-inverso` at the bottom, transparent by 65% up (Figma: transparent until 39% from the top, black by 92%), for contrast: `components/marketing/Comunicacao.module.css:104-108`. H6 Step 5 adds the black → `--bg-fundo-inverso` substitution to that comment, for both gradients.
- **Comunicação description clamped to 3 lines**, to stay inside the gradient's solid band: `components/marketing/Comunicacao.module.css:157-159`.
- **Footer mark.** `logo_oca.png` in Figma's empty "logo" placeholder slot: `components/marketing/SiteFooter.tsx:41-45`. H7 gives it the slot's 36px and 8px radius.
- **Footer contact e-mail omitted.** Placeholder copy on a domain the project doesn't own: `components/marketing/SiteFooter.tsx:109-115`.
- **Quote width.** No `max-width` on the quote (Figma caps it at 560px, but its text is 605px on one line), not visible: `components/marketing/sobre/Quote.module.css:4-5`. Not in this slice's files.

---

## Sobre slice, part 1 (Tasks S1, S2, S3, S5): intro band, sub-navigation, /sobre, /sobre/caatinga, shared Sobre blocks

> Section of the figma-parity implementation plan. Tasks S1, S2, S3 and S5 (S4, a lake re-crop, was dropped: the current crop is documented in IMAGENS.md). Run from the worktree
> `/home/ezequias/oca/worktrees/figma-parity` (branch `fix/figma-parity`); every path below is
> relative to it. Task 1 (fonts and global type utilities) must be done first.

**Goal of this slice:** make the internal pages' shared frame (intro band, Sobre sub-navigation,
photo band) and the pages "Conheça a plataforma" and "Conheça a Caatinga" render like Figma frames
18988:8611 and 18988:8667 at 1436px.

**Figma file:** `QKUhlt36bGyTskbONscB3G` (the working copy). Every value below was read with
`get_design_context` on the node cited next to it.

### Sobre part 1: constraints

- Comments in English; UI strings in Portuguese, verbatim.
- Keep every deviation already documented in code with a reason (listed at the end under "Kept on purpose").
- No literal colours in CSS: a Figma colour with no variable maps to the nearest token, with a comment saying so (the file's existing convention).
- Commits: conventional prefix, English, no `Co-Authored-By` or any attribution trailer.
- Photos: never commit or publish the Figma originals. `pessoas-46b29.png` carries GPS coordinates of a community house in its EXIF.

### Review Focus (Sobre part 1)

1. **GPS leaking into the new house photo.** The original is a phone JPEG with GPS EXIF. A WebP that carries metadata would publish the location. Pinned in S5: the test requires the simple lossy format, a single `VP8 ` chunk with no room for EXIF.
2. **A Section whose Quote is not its last child, or that has no Quote.** Both must render exactly as they do today. Pinned in S2 by two tests.
3. **The PhotoBand fix landing on /comunicacao too**, the dark tone. Checked in S3's rendered check.
4. **The sub-navigation at phone width.** It keeps its horizontal scroll, and the 52px item height must not change the strip's scrolling. Checked in S1 at 390px.
5. **The carbono page.** It shares Section, so its first quote moves with S2. Checked in S2's rendered check.

---

### Task S1: Intro band eyebrow and Sobre sub-navigation (incl. hover)

Fixes:
- Eyebrow line height. Figma has 14px (18988:8615 "Institucional", 18978:2052 "Materiais"); the code has 20px from `.text-subtle-medium`. The band renders 212px; Figma has 206.52.
- Tab labels. Figma uses Inter Medium 14/20 (`tab item`, e.g. I18988:8636;6:198); the code uses Rubik.
- Tab height. A tab is 54px in code and 52px in Figma: Figma draws the 2px underline inside the box. The strip renders 63px; Figma has 61.
- Inactive tab colour. Three of the four Figma frames use `--ctx-positivo-textosobrecontainer` #001d27 (18988:8692, 18988:8794, 18988:8968). The code uses #002b39, the value of the odd frame out (18988:8637).
- Hover label colour. Figma 18988:10645 sets the hovered label in #002b39 (`--bg-textosecundario`); the code leaves the colour unchanged.

**Files:**
- Modify: `components/marketing/PageIntro.module.css:1-3` (header comment), then insert a rule after `:21-25` (`.eyebrow`)
- Modify: `components/marketing/SobreSubnav.tsx:25`
- Modify: `components/marketing/SobreSubnav.module.css:1-4, 19-26, 34-43`
- Create: `tests/components/sobreSubnav.test.ts`

**Interfaces:**
- Consumes (Task 1): global class `.text-ui-tab` = `font-family: var(--font-ui, var(--font-fallback)); font-weight: 500; font-size: 14px; line-height: 20px`, with `--font-ui` set on the marketing `<body>`.
- Consumes (Task 1): `.text-h2` letter-spacing `-0.225px`. The rendered check below expects it on the h1.
- Produces: nothing new. `SobreSubnav` and `PageIntro` keep their props.

**Colour pairs:** none new. The inactive label pair (`--ctx-positivo-texto-sobre-container` on `--bg-fundo`, Comunicação block) and the hovered pair (`--bg-texto-secundario` on `--am-050`, internal pages' block) are already in `PAIRS` in `tests/lib/marketingPalette.test.ts`. That file needs no change.

- [ ] **Step 1: Write the failing test**

Create `tests/components/sobreSubnav.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import SobreSubnav from '@/components/marketing/SobreSubnav'

// SobreSubnav marks the current page from the pathname; pin it to the
// second entry.
vi.mock('next/navigation', () => ({ usePathname: () => '/sobre/caatinga' }))

describe('SobreSubnav', () => {
  const markup = renderToStaticMarkup(createElement(SobreSubnav))
  const links = markup.match(/<a [^>]*>[^<]*<\/a>/g) ?? []

  it('sets every entry in the Inter tab style of the Figma "tab item"', () => {
    expect(links).toHaveLength(4)
    for (const link of links) expect(link).toMatch(/class="[^"]*\btext-ui-tab\b/)
    expect(markup).not.toContain('text-subtle-medium')
  })

  it('marks only the current page', () => {
    const current = links.filter((link) => link.includes('aria-current="page"'))
    expect(current).toHaveLength(1)
    expect(current[0]).toContain('Conheça a Caatinga')
  })
})
```

- [ ] **Step 2: Run it and watch the first case fail**

Run: `npx vitest run tests/components/sobreSubnav.test.ts`
Expected: 1 failed, 1 passed. The failure is `sets every entry in the Inter tab style…` with `AssertionError: expected '<a class="…_item_… text-subtle-me…' to match /class="[^"]*\btext-ui-tab\b/`. (This was checked against the current code.)

- [ ] **Step 3: Switch the tab labels to the Inter utility**

In `components/marketing/SobreSubnav.tsx:25`, replace

```tsx
              className={`${styles.item} text-subtle-medium${current ? ` ${styles.itemCurrent}` : ""}`}
```

with

```tsx
              className={`${styles.item} text-ui-tab${current ? ` ${styles.itemCurrent}` : ""}`}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run tests/components/sobreSubnav.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Set the tab box, the rest colour and the hover colour**

In `components/marketing/SobreSubnav.module.css`, replace lines 1-4

```css
/* SobreSubnav, Figma node 18988:8635: entries 12px apart horizontally inside
 * 16px/12px padding, 34px between them, over a 1px rule in the disabled-text
 * grey (#94a6ac, --role-neutro-texto-desabilitado: the same value as the
 * design's BG-TextoDesabilitado). */
```

with

```css
/* SobreSubnav, Figma node 18988:8635: entries 12px apart horizontally inside
 * 16px/12px padding, 34px between them, over a 1px rule in the disabled-text
 * grey (#94a6ac, --role-neutro-texto-desabilitado: the same value as the
 * design's BG-TextoDesabilitado). Labels are Inter 500 14/20, the global
 * .text-ui-tab applied in SobreSubnav.tsx. */
```

then replace lines 19-26

```css
.item {
  flex: none;
  padding: 16px 12px;
  /* Reserved so the current entry's 2px underline does not shift the row. */
  border-bottom: 2px solid transparent;
  color: var(--bg-texto-secundario);
  white-space: nowrap;
}
```

with

```css
/* 52px tall, like the design's "tab item" (18988:8636). Figma draws the
 * current entry's 2px underline inside that box, so the border reserved for
 * it here (and kept transparent at rest, so the row never shifts) comes out
 * of the bottom padding: 16px above the label, 14px + 2px below it.
 * At rest the label is #001d27, --ctx-positivo-texto-sobre-container, the
 * variable three of the four frames use (18988:8692, 18988:8794,
 * 18988:8968); the first frame's #002b39 (18988:8637) is the odd one out. */
.item {
  flex: none;
  padding: 16px 12px 14px;
  border-bottom: 2px solid transparent;
  color: var(--ctx-positivo-texto-sobre-container);
  white-space: nowrap;
}
```

then replace lines 34-43

```css
/* Hover, Figma frame 18988:10642: an --am-050 fill over a 1px underline in
 * the text colour, drawn as a background under the reserved 2px border so
 * nothing moves. */
.item:not(.itemCurrent):hover,
.item:not(.itemCurrent):focus-visible {
  background:
    linear-gradient(var(--bg-texto-secundario), var(--bg-texto-secundario)) bottom / 100% 1px
      no-repeat border-box,
    var(--am-050);
}
```

with

```css
/* Hover, Figma frame 18988:10642: an --am-050 fill, the label in
 * --bg-texto-secundario over a 1px underline of the same colour, drawn as a
 * background under the reserved 2px border so nothing moves. The frame draws
 * these states on the button row the design keeps hidden (18988:8617:
 * Archivo SemiBold 16, side padding 2px that widens to 8px on hover); only
 * the fill, the colour and the line carry over to these Inter tabs, whose
 * 12px side padding already frames the fill. */
.item:not(.itemCurrent):hover,
.item:not(.itemCurrent):focus-visible {
  color: var(--bg-texto-secundario);
  background:
    linear-gradient(var(--bg-texto-secundario), var(--bg-texto-secundario)) bottom / 100% 1px
      no-repeat border-box,
    var(--am-050);
}
```

Leave lines 5-17 (`.subnav`, `.list`) and 28-32 (`.itemCurrent`) as they are.

- [ ] **Step 6: Give the eyebrow its 14px line**

In `components/marketing/PageIntro.module.css`, replace lines 1-3

```css
/* PageIntro, Figma nodes 18988:8613 / 18978:2050: 40px of block padding, the
 * eyebrow and title stacked 4px apart, the paragraph 24px below. Font metrics
 * come from the .text-* utilities applied in PageIntro.tsx. */
```

with

```css
/* PageIntro, Figma nodes 18988:8613 / 18978:2050: 40px of block padding, the
 * eyebrow and title stacked 4px apart, the paragraph 24px below. Font metrics
 * come from the .text-* utilities applied in PageIntro.tsx, except the
 * eyebrow's line height (`.heading .eyebrow` below). */
```

and insert this rule right after the existing `.eyebrow { … }` block (after line 25, before the `/* 4.01:1 on --am-100 …` comment):

```css

/* The design sets the eyebrow's line box to its 14px font size (18988:8615,
 * 18978:2052), not the 20px of .text-subtle-medium. Two classes, so the
 * override wins whichever order the stylesheets load in (the same move as
 * `.outlined .value` in IndicatorCard.module.css). */
.heading .eyebrow {
  line-height: 14px;
}
```

- [ ] **Step 7: Run the whole suite**

Run: `npx vitest run`
Expected: every test passes, 2 more than the Task 1 baseline (the new file).

- [ ] **Step 8: Lint**

Run: `npm run lint`
Expected: the same problem count as the baseline Task 1 recorded, and none in the three touched files.

- [ ] **Step 9: Rendered check (1436px, Appendix A harness)**

At this point S2–S5 are not applied. Positions assume the header is still 76px tall and the footer 196px.

`await frameAt('/sobre')` → `/sobre 1436x1522 images=n/n` (was 1530: 6px less intro band, 2px less sub-navigation).

| call | expected (fields that must match) |
|---|---|
| `probe('[class*="__pageIntro"]', 1)` | `@0,76 1436x206` `bg=rgb(230, 234, 235)` |
| `probe('[class*="__eyebrow"]', 1)` | `"Institucional" @80,116 1276x14` `f=rubik 500 14px/14px` `c=rgb(0, 43, 57)` (uppercase via `tt=uppercase`) |
| `probe('main h1', 1)` | `"Sobre o Caativar" @80,134 1276x36` `f=rubik 600 30px/36px` `ls=-0.225px` `c=rgb(88, 124, 34)` |
| `probe('[class*="__intro"]', 1)` | `@80,194 1276x48` `f=rubik 400 14px/24px` `c=rgb(0, 29, 39)` |
| `probe('nav[aria-label="Páginas de Sobre"]', 1)` | `@0,282 1436x61` `bg=rgb(254, 254, 251)` `bd=0px …/1px rgb(148, 166, 172)` |
| `probe('nav[aria-label="Páginas de Sobre"] a', 4)` | four lines, all `y=290`, `h=52`, `pad=16px 12px 14px 12px`, `f=inter 500 14px/20px`. 1: `"Conheça a plataforma" @80,290 172x52` `c=rgb(88, 124, 34)` `bd=0px …/2px rgb(88, 124, 34)` `sh=rgba(0, 0, 0, 0.05) 0px 1px 2px 0px`. 2: `"Conheça a Caatinga" @286,290 159x52` `c=rgb(0, 29, 39)` `bd=0px …/2px rgba(0, 0, 0, 0)`. 3: `"Entenda essa relação" @479,290 ≈167x52` (Figma 171 includes a trailing space in its label; the code has none) `c=rgb(0, 29, 39)`. 4: `"Como funciona" @≈680,290 126x52` `c=rgb(0, 29, 39)`. Widths ±2px (Inter build vs Figma's); each x = previous x + width + 34. |
| `probe('[class$="__page"]', 1)` (the content band; `$=` so it skips `__pageIntro`) | `@0,343 1436x765` |

Hover:

| call | expected |
|---|---|
| `hoverProbe('nav[aria-label="Páginas de Sobre"] a', null, 1)` | `"Conheça a Caatinga" @286,290 159x52` (box unchanged) `c=rgb(0, 43, 57)` `bg=rgb(242, 244, 245)` `bgi=linear-gradient(rgb(0, 43, 57), rgb(0, 43, 57))` `bd=0px …/2px rgba(0, 0, 0, 0)` |
| `hoverProbe('nav[aria-label="Páginas de Sobre"] a', null, 0)` (the current entry) | identical to its rest line: `c=rgb(88, 124, 34)`, no `bgi` |

Other pages:
- `await frameAt('/sobre/caatinga')` → `/sobre/caatinga 1436x2641` (was 2649). `probe('nav[aria-label="Páginas de Sobre"] a', 2)` → line 2 is `"Conheça a Caatinga" @286,290 159x52 … c=rgb(88, 124, 34) … bd=0px …/2px rgb(88, 124, 34)`.
- `await frameAt('/comunicacao')` → 6px shorter than before S1. `probe('[class*="__pageIntro"]', 1)` → `@0,76 1436x206`. `probe('[class*="__pageIntro"] [class*="__eyebrow"]', 1)` → `"Materiais" @80,116 1276x14 f=rubik 500 14px/14px`.
- Phone width: resize the harness frame to 390px (or `frameAt` at 390 if the harness takes a width). Expected: `nav[aria-label="Páginas de Sobre"] [class*="__list"]` keeps a horizontal scroll (`scrollWidth` > `clientWidth`), its items are still 52px tall, and the page body has no horizontal scroll.

- [ ] **Step 10: Commit**

```bash
git add components/marketing/PageIntro.module.css components/marketing/SobreSubnav.tsx components/marketing/SobreSubnav.module.css tests/components/sobreSubnav.test.ts
git commit -m "fix: set the intro eyebrow and Sobre tabs to the Figma metrics"
```

---
### Task S2: A Section's closing Quote sits 8px under its text

Fixes:
- The quote gap on "Conheça a Caatinga". In Figma 18988:8700 the quote (VerticalBorder 18988:8705) is a sibling of the heading and the text in an 8px column, so it sits 8px under the text, at y=168 of a 212px block. The code puts it inside the body's 24px column (`Section.module.css:30-33` admits it without a reason), which gives 24px and a 228px block.
- The same gap on "Entenda essa relação" (18988:8799, quote 18988:8804, also at y=168 of 212), which shares `Section`.

The fix lives in `Section`, so both pages get it without touching their page files. `Section` sets a `Quote` given as its last child after the body, and the section's own 8px gap places it.

**Files:**
- Modify: `components/marketing/sobre/Section.tsx:1-26` (whole file)
- Modify: `components/marketing/sobre/Section.module.css:30-33` (comment only)
- Create: `tests/components/sobreSection.test.ts`

**Interfaces:**
- Consumes: `Quote` (default export of `components/marketing/sobre/Quote.tsx`, `({ children }: { children: React.ReactNode }) => <p className="…quote text-body">`). It is unchanged and only compared by identity.
- Produces: `Section` keeps the signature `({ title, children, tone }: SectionProps)`, `SectionProps` unchanged. New behaviour: when the last child is a `<Quote>`, it renders as a sibling after `<div class="…body">`, not inside it. Callers do not change.

**Colour pairs:** none.

- [ ] **Step 1: Write the failing test**

Create `tests/components/sobreSection.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Section from '@/components/marketing/sobre/Section'
import Quote from '@/components/marketing/sobre/Quote'

const p = (text: string) => createElement('p', { key: text }, text)
const quote = (text: string) => createElement(Quote, { key: text }, text)
const section = (children: React.ReactNode[]) =>
  renderToStaticMarkup(createElement(Section, { title: 'Título', children }))

describe('Section', () => {
  // Figma 18988:8700 and 18988:8799: the quote is a sibling of the heading
  // and the text in the 8px column, not one of the body's 24px blocks.
  it('sets a closing Quote after the body, in the heading column', () => {
    expect(section([p('Um'), p('Dois'), quote('Destaque')])).toMatch(
      /<div[^>]*><p>Um<\/p><p>Dois<\/p><\/div><p[^>]*>Destaque<\/p><\/section>$/,
    )
  })

  it('keeps every block in the body when nothing closes it', () => {
    expect(section([p('Um'), p('Dois')])).toMatch(/<div[^>]*><p>Um<\/p><p>Dois<\/p><\/div><\/section>$/)
  })

  it('leaves a Quote that does not close the section in the body', () => {
    expect(section([quote('Destaque'), p('Depois')])).toMatch(
      /<div[^>]*><p[^>]*>Destaque<\/p><p>Depois<\/p><\/div><\/section>$/,
    )
  })
})
```

- [ ] **Step 2: Run it and watch the first case fail**

Run: `npx vitest run tests/components/sobreSection.test.ts`
Expected: 1 failed, 2 passed. The failure is `sets a closing Quote after the body, in the heading column` with `AssertionError: expected '<section class="…_section_…" aria…' to match /<div[^>]*><p>Um<\/p><p>Dois<\/p><\/div><p[^>]*>Destaque…`. (This was checked against the current code.)

- [ ] **Step 3: Set the closing Quote outside the body**

Replace the whole of `components/marketing/sobre/Section.tsx` (currently 26 lines) with:

```tsx
import { Children, isValidElement, useId } from "react";
import Quote from "./Quote";
import styles from "./Section.module.css";

export type SectionProps = {
  title: string;
  children: React.ReactNode;
  // 'alert' sets the heading in red, as "Um bioma sob pressão" (18988:8744).
  tone?: "default" | "alert";
};

// A titled block of text on the Sobre pages, e.g. Figma 18988:8642 ("Por que
// criar uma plataforma para a Caatinga?"): an h2 over its body, which takes
// paragraphs, a Quote or IndicatorCards as children. Plain <p> children need
// no class; the body text style is the page default (app/globals.css).
// A Quote given last is not one of the body's blocks: the design sets it in
// the heading's 8px column, 8px under the text (18988:8700, 18988:8799), so
// it is rendered after the body. Anywhere else it stays in the body.
export default function Section({ title, children, tone = "default" }: SectionProps) {
  const titleId = useId();
  const blocks = Children.toArray(children);
  const last = blocks[blocks.length - 1];
  const quote = isValidElement(last) && last.type === Quote ? blocks.pop() : null;

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={`${styles.title} ${tone === "alert" ? styles.alert : ""}`}>
        {title}
      </h2>
      <div className={styles.body}>{blocks}</div>
      {quote}
    </section>
  );
}
```

`Children.toArray` flattens the `.map()` arrays the pages pass (e.g. `c.vegetacao.blocos.map(…)` followed by `<Quote>` in `sobre/caatinga/page.tsx:26-36`) and keys every child, so the last item really is the Quote and the body renders without key warnings. On the carbono page the children are `<Paragrafos … />` (one element that renders its own array) and `<Quote>`; that page works the same way.

- [ ] **Step 4: Update the stylesheet comment the change made stale**

In `components/marketing/sobre/Section.module.css`, replace lines 30-33

```css
/* 24px between blocks: the design separates paragraphs with one blank 24px
 * line (18988:8646) and sets the indicator cards 24px from the text around
 * them (18988:8712). One exception is not reproduced: in 18988:8700 the Quote
 * sits 8px under the paragraph above it. */
```

with

```css
/* 24px between blocks: the design separates paragraphs with one blank 24px
 * line (18988:8646) and sets the indicator cards 24px from the text around
 * them (18988:8712). A closing Quote is not one of these blocks: Section.tsx
 * renders it after .body, where the section's 8px gap places it (18988:8700,
 * 18988:8799). */
```

The rules themselves (`.section` gap 8px, `.body` gap 24px) stay as they are.

- [ ] **Step 5: Run the test and watch it pass**

Run: `npx vitest run tests/components/sobreSection.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Run the whole suite**

Run: `npx vitest run`
Expected: everything passes, 3 more tests than after S1.

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: the same problem count as the Task 1 baseline, and none in `Section.tsx`.

- [ ] **Step 8: Rendered check (1436px, Appendix A harness)**

S1 is applied; S3–S5 are not.

`await frameAt('/sobre/caatinga')` → `/sobre/caatinga 1436x2625` (2641 after S1; 16px less here). That matches Figma: footer at 2429.52 + 196.

| call | expected |
|---|---|
| `probe('[class*="__section"]', 2)` | 1: `@80,503 1276x212` (Figma 18988:8700: 212). 2: `@80,739 1276x302` |
| `probe('[class*="__quote"]', 1)` | `"A Caatinga muda com as estações, mas permanece viva e produtiva." @80,671 1276x44` `pad=10px 0px 10px 20px` `f=rubik 700 14px/24px` `c=rgb(0, 29, 39)` |
| `probe('[class*="__quote"]', 1, '[class*="__section"]')` | `@0,168 1276x44` (Figma 18988:8705: y=168, h=44) |
| `probe('[class*="__body"]', 1)` | `@80,543 1276x120` |

`await frameAt('/sobre/carbono-e-comunidades')` → `1436x3504` (3528 before S1; −8 from S1, −16 here; C1 later takes it to Figma's 3488).

| call | expected |
|---|---|
| `probe('[class*="__section"]', 1)` | `@80,383 1276x212` (Figma 18988:8799: 212) |
| `probe('[class*="__quote"]', 1, '[class*="__section"]')` | `"Quem conserva o território deve participar das decisões e dos benefícios." @0,168 1276x44` (Figma 18988:8804: y=168) |

`await frameAt('/sobre')` → still `1436x1522`: its Sections close on no Quote.
`await frameAt('/sobre/como-funciona')` → the same height as after S1: its only Section ("duvidas") has no Quote.

- [ ] **Step 9: Commit**

```bash
git add components/marketing/sobre/Section.tsx components/marketing/sobre/Section.module.css tests/components/sobreSection.test.ts
git commit -m "fix: set a Sobre section's closing quote 8px under its text"
```

---
### Task S3: The photo band's bottom rule

Fix: both photo bands end on a 1px #e4e4e4 bottom stroke in Figma: "O que a plataforma não faz" (18988:8651, `border-b border-[#e4e4e4]`) and "Esse espaço está crescendo" on Comunicação (18978:2080, the same stroke). The stroke is part of their 219px and 209px. The code draws no rule, so the bands render 218px and 208px and miss the hairline above the dark footer. The file has no variable for #e4e4e4; following the file's convention, the nearest token is `--am-100` (#e6eaeb), and a comment says so.

Title letter-spacing (-0.225px, 18988:8656 and 18978:2087) comes from Task 1's `.text-h2` change. This task does not touch it; the rendered check verifies it.

**Files:**
- Modify: `components/marketing/PhotoBand.module.css:6-10` (`.photoBand`)

**Interfaces:**
- Consumes (Task 1): `.text-h2` letter-spacing `-0.225px`.
- Produces: nothing new. `PhotoBand` props are unchanged; both tones get the rule.

**Colour pairs:** none. The rule is not text.

**Test:** a pure stylesheet change with no node-testable behaviour. The rendered check is the test.

- [ ] **Step 1: Add the rule**

In `components/marketing/PhotoBand.module.css`, replace lines 6-10

```css
.photoBand {
  position: relative;
  overflow: hidden;
  background: var(--bg-fundo-inverso);
}
```

with

```css
/* Both bands end on a 1px #e4e4e4 rule (18988:8651, 18978:2080), part of
 * their 219px and 209px. The file has no variable for that grey; --am-100
 * (#e6eaeb) is the nearest token. The photo (absolute, inset 0) fills the
 * padding box and stops above it. */
.photoBand {
  position: relative;
  overflow: hidden;
  background: var(--bg-fundo-inverso);
  border-bottom: 1px solid var(--am-100);
}
```

- [ ] **Step 2: Run the whole suite**

Run: `npx vitest run`
Expected: everything passes, the same count as after S2.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: the same problem count as the Task 1 baseline.

- [ ] **Step 4: Rendered check (1436px, Appendix A harness)**

S1 and S2 are applied.

`await frameAt('/sobre')` → `/sobre 1436x1523` (1522 + 1). That matches Figma 18988:8611: the footer at 1327.52 plus 196.

| call | expected |
|---|---|
| `probe('[class*="__photoBand"]', 1)` | `@0,1108 1436x219` `bg=rgb(0, 15, 21)` `bd=0px …/1px rgb(230, 234, 235)` |
| `probe('[class*="__overlay"]', 1)` | `@0,1108 1436x218` `bgi=linear-gradient(to right, rgb(143, 58, 50) 2%, rgba(0, 0, 0, 0) 116%)` (gradient kept, see "Kept on purpose") |
| `probe('[class*="__photoBand"] h2', 1)` | `"O que a plataforma não faz" @80,1148 1276x36` `f=rubik 600 30px/36px` `ls=-0.225px` `c=rgb(254, 254, 251)` |
| `probe('[class*="__photoBand"] li', 3)` | `"Não vende créditos de carbono" @80,1192 1276x26`, `"Não certifica nem aprova projetos" @80,1226 1276x26`, `"Não substitui reguladores e certificadoras" @80,1260 1276x26`, each `f=rubik 400 14px/24px` `c=rgb(254, 254, 251)` |
| `probe('footer', 1)` | `@0,1327 1436x196` |

`await frameAt('/comunicacao')` → 1px taller than after S1.

| call | expected |
|---|---|
| `probe('[class*="__photoBand"]', 1)` | `1436x209` (y depends on the Comunicação slice) `bd=0px …/1px rgb(230, 234, 235)` |
| `probe('[class*="__photoBand"] h2', 1)` | `"Estamos desenvolvendo mais cartilhas, cadernos temáticos e outros materiais sobre o carbono na Caatinga." 1276x72` `ls=-0.225px` `c=rgb(254, 254, 251)` |
| `probe('[class*="__photoBand"] [class*="__eyebrow"]', 1)` | `"Esse espaço está crescendo" 1276x20` `f=rubik 500 14px/20px` `tt=uppercase` `c=rgb(211, 224, 238)` |

The band's top padding stays 56px: the h2 sits 80px (56 + 20 eyebrow + 4 gap) below the band's top.

- [ ] **Step 5: Commit**

```bash
git add components/marketing/PhotoBand.module.css
git commit -m "fix: close the internal pages' photo band on its 1px rule"
```

---
### Task S5: Caatinga's house photo gets its own crop, and the comparison arrow its 114px

Fix: the photo beside "Um bioma de natureza e pessoas" (18988:8735, 298×219) zooms in on the house in Figma, but the code shows the landing's whole picture (`/images/plataforma/carbono-e-comunidades.webp`, 680×500): a lot of sky, the agaves in the foreground, the satellite dish whole.

What Figma does:
- The fill is asset `46b29`, a 4000×3000 phone photo with GPS EXIF. It is placed at `w 143.82% h 146.7% left -28.54% top -32.96%`.
- So the frame shows columns 794–3575 and rows 675–2719. That window has a 1.3606 ratio, the frame's own (298/219 = 1.3607), so Figma does not distort it here and the crop can be reproduced exactly.

The landing tab (`I18916:9585`, 340×250) still wants the centre crop it has, so `carbono-e-comunidades.webp` stays untouched. This page gets a new file, `public/images/sobre/natureza-pessoas.webp`, 596×438 (2× the frame).

Also fixes the arrow of "Conheça a Caatinga"'s comparison. The exported SVG is 115px wide, because its head overhangs the 114px vector box (18988:8758), so the 2020 card sits 1px right of Figma's position.

**Files:**
- Create: `public/images/sobre/natureza-pessoas.webp`
- Create: `tests/lib/sobrePhotos.test.ts`
- Modify: `lib/content/sobre/caatinga.ts:92-93`
- Modify: `components/marketing/sobre/Comparison.module.css:64-66`
- Modify: `IMAGENS.md:106-108`, plus a new paragraph before `:135`. This is a Portuguese doc: its facts are updated in Portuguese and nothing is translated.

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `CAATINGA.pessoas.imagem === '/images/sobre/natureza-pessoas.webp'`. Nothing else reads this field. `app/(marketing)/sobre/caatinga/page.tsx:69` passes it to `MediaText` unchanged; the alt text at `caatinga.ts:94` still describes the crop (house, beaten-earth yard, vegetation around) and stays.

**Source:** the Figma original, saved outside the repo at
`/tmp/claude-1002/-home-ezequias-oca-plataforma-carbono-mvp/35ddde11-7d4d-4713-ad31-bf4851f4923d/scratchpad/src/pessoas-46b29.png`.
It is a JPEG despite the extension, 4000×3000, sha256 `ff5b0c56392a4466f950fb33e2eac719a0f651ef6e4caaaaf6351532bedd9a50`. **It contains GPS coordinates: never copy it into the repo or publish it.**

- [ ] **Step 1: Write the failing test**

Create `tests/lib/sobrePhotos.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CAATINGA } from '@/lib/content/sobre/caatinga'

// The RIFF/WEBP signature, the first chunk and the size of a WebP photo in
// public/. A photo here must be a simple lossy file, one 'VP8 ' chunk: that
// format has no room for EXIF, so no phone metadata (GPS included) can ride
// along. Its frame header keeps the width and height in bytes 26-29, 14 bits
// each.
function webp(src: string): { format: string; width: number; height: number } {
  const buf = readFileSync(path.join(process.cwd(), 'public', src))
  return {
    format: `${buf.toString('ascii', 0, 4)}/${buf.toString('ascii', 8, 16)}`,
    width: buf.readUInt16LE(26) & 0x3fff,
    height: buf.readUInt16LE(28) & 0x3fff,
  }
}

describe('Sobre photos', () => {
  // The landing's house photo, cropped to the tighter window the design's
  // fill shows (18988:8735); its original carries GPS coordinates, which the
  // simple 'VP8 ' format cannot hold.
  it('gives "Um bioma de natureza e pessoas" its own crop at 2x its 298x219 frame, without metadata', () => {
    expect(CAATINGA.pessoas.imagem).toBe('/images/sobre/natureza-pessoas.webp')
    expect(webp(CAATINGA.pessoas.imagem)).toEqual({ format: 'RIFF/WEBPVP8 ', width: 596, height: 438 })
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/lib/sobrePhotos.test.ts`
Expected: 1 failed. The failure is `expected '/images/plataforma/carbono-e-comunidades.webp' to be '/images/sobre/natureza-pessoas.webp'`.

- [ ] **Step 3: Check the source**

Pillow is needed (10.2.0 was used when planning): `python3 -c "import PIL; print(PIL.__version__)"`.

```bash
SRC=/tmp/claude-1002/-home-ezequias-oca-plataforma-carbono-mvp/35ddde11-7d4d-4713-ad31-bf4851f4923d/scratchpad/src
sha256sum "$SRC/pessoas-46b29.png"
```

Expected: `ff5b0c56392a4466f950fb33e2eac719a0f651ef6e4caaaaf6351532bedd9a50`.

If the file is missing:
1. Call the Figma MCP `get_design_context` with fileKey `QKUhlt36bGyTskbONscB3G` and nodeId `18988:8735`.
2. Take the `imgBackgroundBorder` URL; it ends in `/46b29.png`.
3. Run `mkdir -p "$SRC" && curl -sL -o "$SRC/pessoas-46b29.png" "<that URL>"` and re-check the hash.

- [ ] **Step 4: Generate the WebP**

Run from the worktree root:

```bash
python3 - "$SRC/pessoas-46b29.png" public/images/sobre/natureza-pessoas.webp <<'EOF'
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
assert im.size == (4000, 3000), im.size
# The window Figma 18988:8735 shows (fill at 143.82% x 146.7% of the frame,
# offset -28.54% / -32.96%): columns 794-3575, rows 675-2719, the frame's
# 298/219 ratio, so nothing is distorted. exif=b'' keeps the original's GPS
# coordinates out of the file.
im.crop((794, 675, 3575, 2719)).resize((596, 438), Image.LANCZOS).save(
    out, 'WEBP', quality=80, method=6, exif=b'')
EOF
ls -l public/images/sobre/natureza-pessoas.webp
```

Expected: about 53 KB (53250 bytes with Pillow 10.2.0).

- [ ] **Step 5: Point the content at it**

In `lib/content/sobre/caatinga.ts`, replace lines 92-93

```ts
    // The same photo as the landing's "Carbono e comunidades" tab (IMAGENS.md).
    imagem: '/images/plataforma/carbono-e-comunidades.webp',
```

with

```ts
    // The landing's "Carbono e comunidades" photo, cropped tighter to the
    // window the design's fill shows here (18988:8735; IMAGENS.md).
    imagem: '/images/sobre/natureza-pessoas.webp',
```

- [ ] **Step 6: Run the photo test and watch it pass**

Run: `npx vitest run tests/lib/sobrePhotos.test.ts`
Expected: 1 passed.

- [ ] **Step 7: Let the arrow's box, not its drawing, set the spacing**

In `components/marketing/sobre/Comparison.module.css`, replace lines 64-66

```css
.seta {
  flex: none;
}
```

with

```css
/* The exported arrow is 115px wide because its head overhangs the 114px
 * vector box (Figma 18988:8758); the box, not the drawing, sets the spacing. */
.seta {
  flex: none;
  margin-right: -1px;
}
```

The phone rule further down (`margin: 22px 0 22px -6px` inside the media query) resets the right margin to 0 when the arrow turns, so the stacked layout does not change.

- [ ] **Step 8: Update IMAGENS.md**

The doc says the Caatinga page reuses the landing file because the framing is the same. After this task that is false. In `IMAGENS.md`, replace lines 106-108

```
`carbono-e-comunidades.webp` também aparece em "Conheça a Caatinga", ao lado de "Um bioma de
natureza e pessoas" (nó 18988:8735, 298×219): é o mesmo preenchimento no Figma (asset 46b29) e o
quadro tem a mesma proporção 1,36, então o arquivo é reaproveitado em vez de duplicado.
```

with

```
A mesma foto aparece em "Conheça a Caatinga", ao lado de "Um bioma de natureza e pessoas" (nó
18988:8735, 298×219), mas com outro enquadramento: lá o preenchimento (asset 46b29) amplia a foto
e mostra só a casa, então a página usa um arquivo próprio, `sobre/natureza-pessoas.webp` (ver
"Páginas Sobre").
```

and insert this paragraph before line 135, the one that starts `Os ícones das perguntas numeradas`, followed by a blank line:

```
`natureza-pessoas.webp` (596×438, cerca de 52 KB), ao lado de "Um bioma de natureza e pessoas" em
"Conheça a Caatinga" (nó 18988:8735): a foto da casa de `plataforma/carbono-e-comunidades.webp`
(original do Figma 4000×3000, asset 46b29, com GPS no EXIF), recortada exatamente na janela que o
preenchimento mostra, colunas 794 a 3575 e linhas 675 a 2719 (proporção 1,36, sem distorção), e
reduzida para 596×438. A conversão (Pillow, WebP qualidade 80, `exif=b''`) descarta todos os
metadados, inclusive o GPS; não publicar o original.
```

Fill in the real size from `ls -l` in Step 4, rounded to KB.

- [ ] **Step 9: Compare against Figma by eye**

Get the Figma render with `get_screenshot` (fileKey `QKUhlt36bGyTskbONscB3G`, nodeId `18988:8735`). View it next to `public/images/sobre/natureza-pessoas.webp`.

The two must show the same framing:
- The pink house with yellow window frames fills the right two-thirds.
- The satellite dish is cut off at the top-right corner, with only a sliver of sky above the roof.
- Trees and a wall are on the left, the beaten-earth yard and kerb stones are at the bottom.
- Only the tips of the agave show at the bottom-left.

- [ ] **Step 10: Run the whole suite**

Run: `npx vitest run`
Expected: everything passes, 1 more test than after S3. `tests/lib/sobreContent.test.ts` ("points its photo and arrow at files that exist") still passes on the new path.

- [ ] **Step 11: Lint**

Run: `npm run lint`
Expected: the same problem count as the Task 1 baseline.

- [ ] **Step 12: Rendered check (1436px, Appendix A harness)**

S1–S3 are applied.

`await frameAt('/sobre/caatinga')` → `/sobre/caatinga 1436x2625 images=n/n`.

| call | expected |
|---|---|
| `probe('[class*="__mediaText"]', 1)` | `@80,1789 1276x219` |
| `probe('[class*="__mediaText"] img', 1)` | `@80,1789 298x219` `br=12px` `bd=1px rgb(191, 202, 206)/1px rgb(191, 202, 206)` |
| `probe('[class*="__mediaText"] [class*="__text"]', 1)` | `@402,1807 954x184` |

The whole Caatinga page, as a final pass over S1–S5. Figma 18988:8696 is 2086 tall; the code's content band is `@0,343 1436x2086`.

| call | expected |
|---|---|
| `probe('[class$="__page"]', 1)` | `@0,343 1436x2086` |
| `probe('[class*="__section"]', 6)` | `@80,503 1276x212`, `@80,739 1276x302`, `@80,1065 1276x302`, `@80,1391 1276x374`, `@402,1807 954x184` (the one inside MediaText), `@80,2032 1276x357` |
| `probe('[class*="__indicador"] > div, [class*="__indicadores"] > li > div', 4)` | `@80,827 626x166`, `@80,1153 626x166`, `@80,1479 630x166`, `@726,1479 630x166`. Each has `br=8px`, `bg=rgb(252, 248, 235)`, `bd=1px rgb(82, 111, 120)/1px rgb(82, 111, 120)`. |
| `probe('[class*="__value"]', 4)` | `f=rubik 600 30px/34px` `ls=-0.225px` `c=rgb(0, 43, 57)` (Task 1), "410 Mt", "60%", "125tC/ha", "1,5–5tCO₂/ha/ano" |
| `probe('[class*="__medida"]', 2)` | `@80,2203 ≈165x114` `bg=rgb(234, 243, 240)` `br=16px`; the 2020 card 1px left of where it rendered before Step 7 (Figma 18988:8759 at x=287 inside the comparison), `≈177x114` `bg=rgb(239, 215, 210)` `br=16px` |
| `probe('[class*="__seta"]', 1)` | `115x15`, its right edge 1px inside the 2020 card's left edge minus the 24px gap |
| `probe('footer', 1)` | `@0,2429 1436x196` |

- [ ] **Step 13: Commit**

```bash
git add public/images/sobre/natureza-pessoas.webp lib/content/sobre/caatinga.ts tests/lib/sobrePhotos.test.ts \
  components/marketing/sobre/Comparison.module.css IMAGENS.md
git commit -m "fix: crop the Caatinga house photo to the window Figma shows

The comparison arrow also stops pushing the 2020 card 1px right: its
drawing overhangs the 114px box the design spaces it by."
```

---
### Kept on purpose (Sobre part 1)

Each item is a deviation documented in code with a reason. None is changed.

| Deviation | Justifying comment |
|---|---|
| Photo frame border: Figma #d1cec8 (18988:8647, 18988:8735, 18988:8817) → `--am-200` #bfcace, no matching token | `components/marketing/sobre/MediaText.module.css:21-22` |
| Warm band gradient start: Figma #80190d at 2.124% (18988:8651) → `--role-alerta-risco-hover` #8f3a32 at 2%, no matching token | `components/marketing/PhotoBand.module.css:25-28` (30-33 after S3) |
| Dark band gradient start: Figma pure black at 8.645% (18978:2080) → `--bg-fundo-inverso` at 9%, no matching token | `components/marketing/PhotoBand.module.css:37-38` (42-43 after S3) |
| The outlined IndicatorCard's faint inner drop shadow (Figma `I18988:8714;18808:5938`) left out: the border covers it at this size | `components/marketing/IndicatorCard.module.css:22-24` (not a SOBRE-1 file; it renders on /sobre/caatinga) |
| "…sobre quem os sustenta" with no final full stop: verbatim from the design, flagged to the content owner | `lib/content/sobre/caatinga.ts:84-85` |
| New in S1: the hover frame's label style (Archivo SemiBold 16, padding 2→8px, from the hidden row 18988:8617) is not applied to the Inter tabs | the new hover comment in `components/marketing/SobreSubnav.module.css` (S1, Step 5) |
| New in S3: the band's #e4e4e4 rule → `--am-100` #e6eaeb, no matching token | the new `.photoBand` comment in `components/marketing/PhotoBand.module.css` (S3, Step 1) |
| The lake photo's framing (`lago-serra.webp`, /sobre 18988:8647 and carbono 18988:8817): Figma's fill stretches the 3000×4000 original 1.78× horizontally, so no undistorted crop matches it; the file is the full width from row 900 | `IMAGENS.md:125-133` ("Páginas Sobre") |

Not deviations, so nothing to keep or fix:
- The bands' title colour. Figma prints `var(--bg-textosobreinverso, #f8f7f7)`, a stale fallback of the same variable the code maps to `--bg-texto-sobre-inverso` #fefefb.
- The Figma label "Entenda essa relação " ends in a space; the code's label does not.
- The Section heading's letter-spacing of -0.144px (`Section.module.css:4-8`): it is the value the text nodes carry, so it matches Figma.

---

## Sobre slice, part 2 (Tasks C1–C3): /sobre/carbono-e-comunidades and /sobre/como-funciona bodies

Covers the page bodies of Figma frames 18988:8769 ("Entenda essa relação", content node
18988:8798) and 18988:8943 ("Como funciona", content node 18988:8972). Header, intro band,
sub-navigation, footer, `Section.*`, `MediaText.*` and `Quote.*` belong to other slices.

**Working copy:** worktree `/home/ezequias/oca/worktrees/figma-parity`, branch `fix/figma-parity`.
All paths below are relative to it.

**Depends on:**
- Task 1 (foundation): `app/fonts/marketing.ts` loads Rubik with `weight: '400 800'` and an
  `inter` localFont on `--font-ui`; `app/globals.css` defines `.text-ui-badge`
  (`font-family: var(--font-ui, var(--font-fallback))`, 600, 12px/16px). C2 and C3 consume it.
- Task S2's quote-gap fix in `components/marketing/sobre/Section.*` (the 8px between the last
  paragraph and the quote, 18988:8799). It moves every block of the carbono page below the
  first section up by 16px. S2 runs before C1, so the first value of each y in the carbono
  RENDERED CHECK steps is the one to expect; the value in parentheses is what you would see
  without S2.

**Conventions in this section:**
- Rendered checks use Appendix A at 1436px. Positions are relative to the page body, selected
  as `main > nav + div` (the element right after the Sobre sub-navigation), so changes to the
  header, intro band or sub-navigation in other slices do not move them. That box starts at
  x=0, so relative x equals page x.
- No task here changes a colour, so `tests/lib/marketingPalette.test.ts` gets no new pairs.
- Each component touched has exactly one caller: `QuestionTile` and the carbono page,
  `StepCard` and the como-funciona page. No other page is affected.

**Not a task: the carbono photo.** Figma 18988:8817 (carbono) and 18988:8647 (/sobre) carry
the identical fill: asset `4cf5c`, `w 143.82% h 146.7% left -28.54% top -32.96%`, both in a
464×341 frame. The framing does not differ, so the carbono page keeps sharing
`public/images/sobre/lago-serra.webp` (`lib/content/sobre/carbono-e-comunidades.ts:56`) and
needs no file of its own, and its framing stays as `IMAGENS.md` documents it (kept on purpose,
see Task S5's slice).

---

### Task C1: Carbono spacing around the law figures, and the break in question 5

Figma 18988:8818 sets the two law figures 16px below the text and 16px above the closing
paragraph. The code puts 24px on each side, through Section's body gap. Figma 18988:8918
breaks question 5 as "Quem assumirá os custos e / os riscos?". In the 389px question column,
"Quem assumirá os custos e os" (347.1px in Rubik 600 24px) fits, so the browser breaks it as
"…custos e os / riscos?".

**Files:**
- Test: `tests/lib/sobreContent.test.ts` (insert after line 57, inside the
  `describe('Entenda essa relação (/sobre/carbono-e-comunidades)')` block)
- Modify: `lib/content/sobre/carbono-e-comunidades.ts:138-141`
- Modify: `app/(marketing)/sobre/carbono-e-comunidades/page.module.css:14-19`

**Interfaces:**
- Consumes: nothing from other tasks. Section's body stays a flex column with `gap: 24px`
  (`components/marketing/sobre/Section.module.css:34-38`); this task depends on that and does
  not edit it.
- Produces: `CARBONO_E_COMUNIDADES.perguntas.itens[4].pergunta ===
  'Quem assumirá os custos e os riscos?'`. `QuestionTile` uses the string as its React key
  and its text, unchanged.

- [ ] **Step 1: Write the failing test**

Insert after line 57 of `tests/lib/sobreContent.test.ts` (the closing `})` of
`it('asks the eight questions, each with an icon that exists', …)`):

```ts

  // Figma 18988:8918 breaks question 5 as "Quem assumirá os custos e / os
  // riscos?". A no-break space keeps "os riscos?" together, which gives that
  // break in the 389px question column and still wraps freely when narrower.
  it('keeps "os riscos?" together in question 5', () => {
    expect(c.perguntas.itens[4].pergunta).toBe('Quem assumirá os custos e os riscos?')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/sobreContent.test.ts -t "os riscos"`
Expected: FAIL. Expected `'Quem assumirá os custos e os riscos?'`, received
`'Quem assumirá os custos e os riscos?'` (the diff shows the space).

- [ ] **Step 3: Put the no-break space in the content**

In `lib/content/sobre/carbono-e-comunidades.ts`, replace lines 138-141:

```ts
      {
        pergunta: 'Quem assumirá os custos e os riscos?',
        icone: { src: `${ICONES}/insert-chart.svg` },
      },
```

with:

```ts
      {
        // A no-break space glues "os riscos?" so the line breaks after "e",
        // as Figma 18988:8918 sets it.
        pergunta: 'Quem assumirá os custos e os riscos?',
        icone: { src: `${ICONES}/insert-chart.svg` },
      },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/sobreContent.test.ts`
Expected: PASS, every case in the file.

- [ ] **Step 5: Pull the law figures 8px closer to their text**

In `app/(marketing)/sobre/carbono-e-comunidades/page.module.css`, replace lines 14-19:

```css
/* The two law figures side by side, 24px apart (18988:8824). */
.garantias {
  display: flex;
  gap: 24px;
  margin: 0;
}
```

with:

```css
/* The two law figures side by side, 24px apart (18988:8824). Figma sets them
 * 16px from the text above and below (18988:8818), while Section's body puts
 * 24px between its children; the -8px block margins take the difference back
 * without changing Section for every other page. Flex items' margins do not
 * collapse, so the net gap is 16px at every width, stacked or not. */
.garantias {
  display: flex;
  gap: 24px;
  margin: -8px 0;
}
```

The `@media (max-width: 640px)` rule further down (`.garantias { flex-direction: column; }`)
stays as it is.

- [ ] **Step 6: Run the whole suite and lint**

Run: `npx vitest run`
Expected: all tests pass.

Run: `npm run lint`
Expected: `✖ 5 problems (3 errors, 2 warnings)`, the same as the baseline, none in the files
of this task.

- [ ] **Step 7: RENDERED CHECK (Appendix A, 1436px)**

```js
await frameAt('/sobre/carbono-e-comunidades')
```
Expected: `/sobre/carbono-e-comunidades 1436x<h> images=n/n`, with every image loaded.

```js
probe('main > nav + div', 1)
```
Expected: `… 1436x2949 … bg=rgb(254, 254, 251)` (`1436x2965` without Sobre-1's fix). Before
this task it was `1436x2981`.

```js
probe('main > nav + div h2', 6, 'main > nav + div')
```
Expected: six lines, each `1276x32` (the third `788x32`),
`f=rubik 600 24px/32px ls=-0.144px c=rgb(88, 124, 34)`:
- `"Antes de participar de um projeto" @80,40`
- `"Como o carbono pode gerar renda?" @80,276` (`@80,292`)
- `"Por que o direito sobre a terra importa?" @80,508 788x32` (`@80,524`)
- `"O que a lei já garante?" @80,873` (`@80,889`)
- `"Quem decide sobre os projetos?" @80,1251` (`@80,1267`). Before this task: 1283.
- `"Como os benefícios devem ser repartidos?" @80,1459` (`@80,1475`). Before this task: 1491.

```js
probe('[class*="__garantias"], [class*="__garantias"] + p', 2, 'main > nav + div')
```
Expected:
- `dl.…__garantias @80,1049 1276x114` (`@80,1065`). Before this task: 1073.
- `p "Essas garantias são importantes, …" @80,1179 1276x48` (`@80,1195`). Before this task:
  1211.

The second value is 1049 + 114 + 16. The section's box ends at 1227 = 873 + 354, which is
Figma's height for 18988:8818.

```js
probe('[class*="__garantias"] > div', 2, 'main > nav + div')
```
Expected: `div.…__tile @80,1049 626x114 pad=24px 24px 24px 24px … bg=rgb(230, 234, 235) br=16px`
and `@730,1049 626x114`, with the same style (`@…,1065` without Sobre-1's fix).

```js
probe('section[class*="__card"], [class*="__perguntas"]', 2, 'main > nav + div')
```
Expected: `section.…__card @80,1715 1276x406 pad=24px 24px 24px 24px … bg=rgb(239, 215, 210)
br=16px` (`@80,1731`) and `ol.…__perguntas @80,2233 1276x604` (`@80,2249`).

Line break of question 5. Run, in the harness:

```js
(() => {
  // `p` in the selector: the <ol> is `…__perguntas`, which `[class*="__pergunta"]` also matches.
  const p = [...F.contentDocument.querySelectorAll('p[class*="__pergunta"]')][4]
  const r = F.contentDocument.createRange()
  r.selectNodeContents(p)
  return [p.textContent, [...r.getClientRects()].map((x) => Math.round(x.width * 10) / 10)]
})()
```
Expected: `['Quem assumirá os custos e os riscos?', [≈314.8, ≈116.4]]`, each width within
±1.5px. That is two lines: "Quem assumirá os custos e" and "os riscos?". Before this task it
was `[≈347.1, ≈84.1]`.

```js
probe('p[class*="__pergunta"]', 5, 'main > nav + div')
```
Expected: the fifth line reads `p.…__pergunta "Quem assumirá os custos e os riscos?"
@184,2582 389x64 f=rubik 600 24px/32px ls=-0.144px c=rgb(39, 114, 91)` (`@184,2598`). That is
the third row of tiles, at 2233 + 2 × (133 + 24) = 2547, plus 35 to centre the text. The
height stays 64, two lines.

- [ ] **Step 8: Commit**

```bash
git add tests/lib/sobreContent.test.ts lib/content/sobre/carbono-e-comunidades.ts "app/(marketing)/sobre/carbono-e-comunidades/page.module.css"
git commit -m "fix: set the law figures 16px from their text and break question 5 as designed"
```

---

### Task C2: Question numbers in Rubik ExtraBold (800)

Figma sets the numbers of the eight question tiles in Rubik ExtraBold, 800 48/48 (18988:8889
and its siblings). The Figma text boxes match the 800 advances: "1" is 26px wide and "4" is
35px. The code uses 700 (`components/marketing/sobre/QuestionTile.module.css:23`). Its comment
(lines 10-12) defers the change to PR #57, which merged on 2026-09-25 without it, so the
comment is stale. The repo's `app/fonts/Rubik-Variable-latin.woff2` covers wght 300–900, so
800 only needs the `weight` range of Task 1.

**Files:**
- Modify: `components/marketing/sobre/QuestionTile.module.css:10-23`

**Interfaces:**
- Consumes: Task 1. In `app/fonts/marketing.ts`, `rubik = localFont({ src:
  './Rubik-Variable-latin.woff2', weight: '400 800', variable: '--font-sans', … })`.
- Produces: nothing other tasks use.

This is a CSS-only change with no logic, and the test environment is node with no CSS
rendering, so no unit test can see it. The RENDERED CHECK in Step 4 is the test. It fails
before Step 2: it reads `f=rubik 700 …` and the glyph widths are those of 700.

- [ ] **Step 1: Confirm Task 1 has landed**

Run: `grep -n "weight: '400 800'" app/fonts/marketing.ts`
Expected: one match, inside the `rubik` call. If there is none, stop: this task depends on
Task 1.

- [ ] **Step 2: Set the weight and rewrite the stale comment**

In `components/marketing/sobre/QuestionTile.module.css`, replace lines 10-23:

```css
/* The design sets the number in Rubik ExtraBold (800), 48/48. The marketing
 * layout loads Rubik up to 700 only, and font loading is being reworked in
 * PR #57, so this is 700 until that lands. White on the fill is 5.76:1. */
.numero {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  padding-block: 24px;
  border-radius: 8px 0 0 8px;
  background: var(--role-categorica1-padrao);
  color: var(--ctx-informativo-texto-sobre);
  font-weight: 700;
```

with:

```css
/* The number is Rubik ExtraBold (800), 48/48, as the design sets it
 * (18988:8889). White on the fill is 5.76:1. */
.numero {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  padding-block: 24px;
  border-radius: 8px 0 0 8px;
  background: var(--role-categorica1-padrao);
  color: var(--ctx-informativo-texto-sobre);
  font-weight: 800;
```

Lines 24-27 (`font-size: 48px; line-height: 48px; letter-spacing: -0.576px;`) and the
`@media (max-width: 520px)` block stay as they are. The phone size, 36/36, keeps 800 too.

- [ ] **Step 3: Run the whole suite and lint**

Run: `npx vitest run`
Expected: all tests pass.

Run: `npm run lint`
Expected: `✖ 5 problems (3 errors, 2 warnings)`, the same as the baseline.

- [ ] **Step 4: RENDERED CHECK (Appendix A, 1436px)**

```js
await frameAt('/sobre/carbono-e-comunidades')
probe('span[class*="__numero"]', 2, 'main > nav + div')
```
Expected:
- `span.…__numero "1" @80,2233 80x133 pad=24px 0px 24px 0px … f=rubik 800 48px/48px
  ls=-0.576px c=rgb(255, 255, 255) bg=rgb(39, 114, 91) br=8px 0px 0px 8px`
- `span.…__numero "2" @730,2233 80x133 …`, with the same style.

y is 2249 without Sobre-1's fix, and 2265 if C1 has not landed either.

The browser really renders the 800 instance, and does not fall back to 700. Run, in the
harness:

```js
(() => [...F.contentDocument.querySelectorAll('span[class*="__numero"]')].map((s) => {
  const r = F.contentDocument.createRange()
  r.selectNodeContents(s)
  return s.textContent + ':' + Math.round(r.getBoundingClientRect().width * 10) / 10
}))()
```
Expected widths, each within ±0.5px:
`['1:24.7', '2:31.9', '3:32.3', '4:33.5', '5:31.5', '6:31.6', '7:28.2', '8:32.7']`.
At 700 they would be `['1:23.3', '2:30.6', '3:31.0', '4:32.2', '5:30.4', '6:30.7', '7:26.9',
'8:31.9']`.

- [ ] **Step 5: Commit**

```bash
git add components/marketing/sobre/QuestionTile.module.css
git commit -m "fix: set the question numbers in Rubik ExtraBold, as designed"
```

---

### Task C3: Como funciona step-2 labels in Inter

Figma sets the 15 labels of step 2 ("badge", 18985:7168 and its siblings in component variant
18985:7157) in **Inter** Semi Bold 12/16. The code does not set a `font-family` for them, so
they render in Rubik 600 12/16 (`components/marketing/sobre/StepCard.module.css:81-88`). Task 1
adds Inter and the `.text-ui-badge` utility; this task uses them and removes the local font
metrics.

The Figma badge widths, in variant order: 134, 67, 84, 118, 155, 110 / 266, 159, 105, 128 /
164, 133 / 81, 276, 51. Measured in Inter 600 12px, each matches text + 20 to within 1px, but
only when the trailing space that 10 of the Figma strings carry is counted ("limites da
Caatinga ", "terras indígenas ", …). That space is a copy artefact. HTML drops a trailing
space at the end of a line, and putting it back would mean `white-space: pre` on every label.
This task leaves it out and documents why, so those 10 badges render 3px narrower than in
Figma.

**Files:**
- Modify: `components/marketing/sobre/StepCard.tsx:28`
- Modify: `components/marketing/sobre/StepCard.module.css:76-88`
- Modify: `lib/content/sobre/como-funciona.ts:1-3` (comment only)

**Interfaces:**
- Consumes: Task 1. In `app/globals.css`, `.text-ui-badge { font-family: var(--font-ui,
  var(--font-fallback)); font-weight: 600; font-size: 12px; line-height: 16px; }`. In
  `app/fonts/marketing.ts`, `inter = localFont({ …, variable: '--font-ui' })`, applied on
  `<body>` by `app/(marketing)/layout.tsx`.
- Produces: nothing other tasks use.

This is a CSS and className change, which the node test environment cannot see. The RENDERED
CHECK in Step 6 is the test. Before Step 2 it reads `f=rubik 600 12px/16px`.

- [ ] **Step 1: Confirm Task 1 has landed**

Run: `grep -n -A5 "^\.text-ui-badge" app/globals.css; grep -n "font-ui" app/fonts/marketing.ts; grep -n "inter.variable" "app/(marketing)/layout.tsx"`
Expected:
- `app/globals.css` has a `.text-ui-badge` rule with
  `font-family: var(--font-ui, var(--font-fallback))`, `font-weight: 600`, `font-size: 12px`
  and `line-height: 16px`.
- `app/fonts/marketing.ts` has `variable: '--font-ui'`.
- The layout puts `inter.variable` on `<body>`.

If any of these is missing, stop: this task depends on Task 1.

- [ ] **Step 2: Give each label the utility**

In `components/marketing/sobre/StepCard.tsx`, replace line 28:

```tsx
                <li key={item} className={`${styles.etiqueta} ${styles[grupo.tom]}`} role="listitem">
```

with:

```tsx
                <li key={item} className={`${styles.etiqueta} ${styles[grupo.tom]} text-ui-badge`} role="listitem">
```

This follows the module-class-then-utility order of `SobreSubnav.tsx:25`.

- [ ] **Step 3: Drop the local font metrics and rewrite the comment**

In `components/marketing/sobre/StepCard.module.css`, replace lines 76-88:

```css
/* 12/16 semibold, which no .text-* utility covers, like the Comunicação
 * page's chips (PublicationCard.module.css). The design's badge is 2px/10px of
 * padding with its 1px stroke drawn INSIDE it, as Figma draws strokes: 20px
 * tall in all. A CSS border adds to the box instead, so the padding gives up
 * the border's 1px; `2px 10px` made each label 22px and step 2 8px too tall. */
.etiqueta {
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  padding: 1px 9px;
  border: 1px solid;
  border-radius: 9999px;
}
```

with:

```css
/* The type is .text-ui-badge, Inter SemiBold 12/16 as the design's badge
 * (18985:7168). The badge is 2px/10px of padding with its 1px stroke drawn
 * INSIDE it, as Figma draws strokes: 20px tall in all. A CSS border adds to
 * the box instead, so the padding gives up the border's 1px; `2px 10px` made
 * each label 22px and step 2 8px too tall. */
.etiqueta {
  padding: 1px 9px;
  border: 1px solid;
  border-radius: 9999px;
}
```

The tone classes below it (`.territorio`, `.carbono`, `.pressoes`, `.ambiente`), including the
deliberate `.carbono` text colour and its comment at lines 95-97, stay as they are.

- [ ] **Step 4: Document the dropped trailing spaces**

In `lib/content/sobre/como-funciona.ts`, replace lines 1-3:

```ts
// Content of "Como funciona" (/sobre/como-funciona), Figma frame 18988:8943,
// content node 18988:8972, copied verbatim. The steps are the six variants of
// the "Card Sobre" component (18985:7140 and siblings).
```

with:

```ts
// Content of "Como funciona" (/sobre/como-funciona), Figma frame 18988:8943,
// content node 18988:8972, copied verbatim. The steps are the six variants of
// the "Card Sobre" component (18985:7140 and siblings). Ten of step 2's labels
// end in a space in the design ("limites da Caatinga ", …), which makes those
// badges 3px wider there; the space is a copy artefact, which HTML would drop
// at the end of the line anyway, so it is left out.
```

- [ ] **Step 5: Run the whole suite and lint**

Run: `npx vitest run`
Expected: all tests pass. The 'groups the information in the four themes of the map' case
in `tests/lib/sobreContent.test.ts` is untouched.

Run: `npm run lint`
Expected: `✖ 5 problems (3 errors, 2 warnings)`, the same as the baseline.

- [ ] **Step 6: RENDERED CHECK (Appendix A, 1436px)**

The widths below are Inter 600 12px advances + 18 of padding + 2 of border. Each width should
be within ±1.5px, because Chrome applies kerning that the measurement did not. Later x values
accumulate that drift, so allow ±3px. The decisive values are `f=inter 600 12px/16px` and the
20px height.

```js
await frameAt('/sobre/como-funciona')
probe('[class*="__territorio"]', 6, 'main > nav + div')
```
Expected: each line `li.…__etiqueta …__territorio text-ui-badge "<text>" @<x>,382 <w>x20
pad=1px 9px 1px 9px f=inter 600 12px/16px c=rgb(39, 114, 91) br=9999px bd=1px rgb(39, 114,
91)/1px rgb(39, 114, 91)`, with:
- "limites da Caatinga" @176 130.2
- "estados" @314.2 66.3
- "municípios" @388.5 83.3
- "terras indígenas" @479.8 113.8
- "territórios quilombolas" @601.6 151.1
- "assentamentos" @760.7 109.0

Before this task: `f=rubik 600 12px/16px`, widths 132.3, 67, 84.1, 116.1, 154.8, 111.4.

```js
probe('[class*="__carbono"]', 4, 'main > nav + div')
```
Expected: y 444, `f=inter 600 12px/16px c=rgb(71, 101, 27)`, `bd=1px rgb(88, 124, 34)/1px
rgb(88, 124, 34)`:
- "estoque por reservatório (solo, biomassa)" @176 262.2
- "estrutura da vegetação" @446.2 154.6
- "produtividade" @608.8 100.6
- "fluxos de carbono" @717.4 124.7

```js
probe('[class*="__pressoes"], [class*="__ambiente"]', 5, 'main > nav + div')
```
Expected:
- `__pressoes` labels, y 506, `c=rgb(143, 58, 50)`, `bd=1px rgb(181, 76, 64)/…`:
  "uso e cobertura da terra" @176 159.5 and "ocorrência de fogo" @343.5 129.6.
- `__ambiente` labels, y 568, `c=rgb(54, 116, 131)`, `bd=1px rgb(54, 116, 131)/…`:
  "vegetação" @176 81.0, "mudanças da vegetação ao longo do tempo" @265.0 272.5 and
  "clima" @545.5 51.0.

All are `f=inter 600 12px/16px`, 20px tall.

The card geometry does not change. Every label still fits on one line in the 1156px column:

```js
probe('main > nav + div li[class*="__card"]', 6, 'main > nav + div')
```
Expected: six lines, `1276x186` @80,40; `1276x362` @80,250; `1276x162` @80,636;
`1276x114` @80,822; `1276x186` @80,960; `1276x114` @80,1170. Each has `pad=24px 24px 24px
24px gap=24px bg=rgb(242, 244, 245) br=16px`.

```js
probe('main > nav + div', 1)
```
Expected: `1436x1560`, equal to Figma 18988:8972.

- [ ] **Step 7: Commit**

```bash
git add components/marketing/sobre/StepCard.tsx components/marketing/sobre/StepCard.module.css lib/content/sobre/como-funciona.ts
git commit -m "fix: set the Como funciona step labels in Inter, as designed"
```

---

### Kept on purpose (Sobre part 2)

Each of these is a deviation already documented in the code, with a reason. None is changed.

- **"ⓘ" markers left out.** Figma has "informadaⓘ" (18988:8823), `"adicionais"ⓘ` and
  "permanênciaⓘ" (18988:8851). The design's glossary does not exist yet (issue #44).
  Justified at `lib/content/sobre/carbono-e-comunidades.ts:2-6` and pinned by
  `tests/lib/sobreContent.test.ts:66-70` (73-77 after C1).
- **Text colour of the "Carbono" labels.** The code uses `--role-marca-ancora-hover` #47651b,
  where Figma has `--role-marca-ancora-padrao` #587c22. The design's colour is 4.40:1 on the
  panel and fails AA at 12px; the -hover tone gives 6.05:1. Justified at
  `components/marketing/sobre/StepCard.module.css:95-97` (92-94 after C3), with the pair at
  `tests/lib/marketingPalette.test.ts:77-82`.
- **Photo border.** The code uses `--am-200` #bfcace for the design's untokenized #d1cec8.
  Justified at `components/marketing/sobre/MediaText.module.css:21-25`. That file belongs to
  Sobre-1.
- **No 560px cap on the quote.** Figma caps 18988:8804 at 560px. Nothing shows on this page,
  because the quote has no fill. Justified at `components/marketing/sobre/Quote.module.css:4-5`:
  a cap would wrap the landing's one-line quote. That file is not this slice's.
- **Trailing spaces in 10 step-2 labels.** A copy artefact, so those badges render 3px
  narrower than in Figma. Documented by C3 Step 4 at `lib/content/sobre/como-funciona.ts:1-6`.

### Review Focus (Sobre part 2)

- **Phone widths (≤640px).** The law figures stack. The -8px block margins must still leave
  16px of text-to-figure space, not overlap. Flex items' margins do not collapse, so they net
  16px. Check at 390px with `await frameAt('/sobre/carbono-e-comunidades', 390)`: the two tiles are stacked and the first sits 16px under the text.
- **Question 5 at ≤520px.** The type is 20/28 and the question column is about 175px. "os
  riscos?" is about 97px at 20px, so the glued pair never overflows the tile.
- **Inter fails to load.** `.text-ui-badge` falls back to `var(--font-fallback)` (Rubik), as
  today. The labels stay 20px tall and step 2 stays 362px, because the line height is
  explicit.
- **Rubik 800 at phone size.** The numbers shrink to 36/36 at ≤520px and keep 800. The 56px
  column fits "8" at 36px 800 (about 24.5px).

---

## Comunicação slice (Tasks M1–M4)

Scope: `/comunicacao` (Figma frame 18978:2048), the card hover (18988:10598) and the publication page "Ver conteúdo" (19015:13056), rendered at `/comunicacao/caderno-mercado-de-carbono-florestal-na-caatinga`.

Work in the worktree `/home/ezequias/oca/worktrees/figma-parity` on branch `fix/figma-parity`. Every path below is relative to that root.

**Consumes from Task 1 (do not re-plan):**
- `--font-ui`: the Inter local font, family name `inter`, on the marketing `<body>`.
- `.text-ui-medium`: Inter 500 14/24.
- `.text-ui-badge`: Inter 600 12/16.
- `.text-h2` letter-spacing -0.225px.

All of them come from `font-family: var(--font-ui, var(--font-fallback))`.

**Cascade rule every task here relies on:** a CSS-module rule beats a global `.text-*` utility on the same element. Both are one class, and the module CSS loads after `app/globals.css`; the current render proves it, since `.back { font-weight: 500 }` wins over `.text-body`'s 400. So when an element takes a `.text-ui-*` class, its module rule must stop declaring `font-family`/`font-size`/`font-weight`/`line-height`. Otherwise the utility is silently overridden.

### Review Focus (Comunicação)

- **A module rule still declaring `font-family` hides the Inter utility.** The node tests only see the class name, so every rendered check asserts the computed `font-family` is `inter`.
- **Page total while loading.** The count reads `--` until the PDF opens, and the 8px gap must hold for `--` as for `32`. Pinned in M3's rendered check: the count `<span>` exists in both states.
- **Screen readers must still hear "de 32" after the counter is restructured.** The "/" stays `aria-hidden`, and `sr-only` "de" plus the count must keep a space between them. Pinned in M3's rendered check: `.total` `textContent` is `/de 32`.
- **Icon buttons at their disabled opacity (0.4, before the PDF loads) must also render 24×24 icons.** Pinned in M3's rendered check, which measures the icons before and after load.
- **Mobile, under 768px:** "Baixar PDF" moves into the page head (`.downloadMobile`). It must take Inter too. Pinned in M2's node test and a 390px line in its rendered check.

---

### Task M1: Inter on the publication chips, and the cover note

**Files:**
- Modify: `components/marketing/PublicationCard.tsx:26` and `:31`
- Modify: `components/marketing/PublicationCard.module.css:1-5`, `:34-36`, `:45-54`
- Test: `tests/components/conteudo.test.ts` (new `describe` after the `PublicationCard` block, which ends at line 83)

**Interfaces:**
- Consumes: the `.text-ui-badge` global utility (Task 1).
- Produces: nothing new. `PublicationCard` keeps its props `{ publicacao: Publicacao }`.

- [ ] **Step 1: Write the failing test.** Append to `tests/components/conteudo.test.ts`, after the closing `})` of `describe('PublicationCard', …)`:

```ts
describe('PublicationCard type', () => {
  // Figma 18953:6454 ("PDF") and 18953:6457 (the type chip) set Inter Semi Bold
  // 12/16, which .text-ui-badge carries.
  it('sets the PDF badge and the type chip in the badge face', () => {
    const markup = html(PublicationCard, { publicacao: { ...PUBLICACAO, pdf: 'https://x/v1.pdf' } })

    expect(markup).toMatch(/<span id="publicacao-cartilha-0-pdf" class="[^"]*\btext-ui-badge\b[^"]*">PDF<\/span>/)
    expect(markup).toMatch(/<span id="publicacao-cartilha-0-tipo" class="[^"]*\btext-ui-badge\b[^"]*">Cartilha<\/span>/)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/components/conteudo.test.ts -t "badge face"`
Expected: FAIL. `AssertionError: expected '<li class="_card_…' to match /<span id="publicacao-cartilha-0-pdf" class="[^"]*\btext-ui-badge\b…/`

- [ ] **Step 3: Put the utility on the two chips.** In `components/marketing/PublicationCard.tsx`, replace line 26:

```tsx
          <span id={pdfId} className={styles.pdfBadge}>
```
with
```tsx
          <span id={pdfId} className={`${styles.pdfBadge} text-ui-badge`}>
```
and replace line 31:
```tsx
      <span id={tipoId} className={styles.tipo}>
```
with
```tsx
      <span id={tipoId} className={`${styles.tipo} text-ui-badge`}>
```

- [ ] **Step 4: Stop the module overriding the utility.** In `components/marketing/PublicationCard.module.css`, replace lines 45-54:

```css
.pdfBadge,
.tipo {
  font-family: var(--font-sans, var(--font-fallback));
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  padding: 2px 10px;
  border-radius: 9999px;
  white-space: nowrap;
}
```
with
```css
/* Inter Semi Bold 12/16 comes from .text-ui-badge (PublicationCard.tsx);
 * declaring any font property here would override it. */
.pdfBadge,
.tipo {
  padding: 2px 10px;
  border-radius: 9999px;
  white-space: nowrap;
}
```

- [ ] **Step 5: Fix the stale header comment.** In the same file, replace lines 1-5:

```css
/* PublicationCard, Figma 18978:2075–2079: the cover frame 236x318 (kept as a
 * ratio, so it scales with its column), then the type chip and the title,
 * 8px apart. Hover, 18988:10598: the frame's border darkens and it lifts on a
 * shadow. The two chips set 12/16 semibold, which no .text-* utility covers,
 * so their metrics are set here. */
```
with
```css
/* PublicationCard, Figma 18978:2075–2079: the cover frame 236x318 (kept as a
 * ratio, so it scales with its column), then the type chip and the title,
 * 8px apart. Hover, 18988:10598: the frame's border darkens and it lifts on a
 * shadow. The two chips take their Inter metrics from .text-ui-badge. */
```

- [ ] **Step 6: Record why the caderno cover is not stretched as in the design.** User decision 5. In the same file, replace lines 34-36:

```css
/* The covers are 0.707 wide for 1, the frame 0.742: `cover` trims about 2.5%
 * off the top and the bottom, which keeps the partner logos along the foot of
 * the cartilha covers in frame, as the design shows them. */
```
with
```css
/* The covers are 0.707 wide for 1, the frame 0.742: `cover` trims about 2.5%
 * off the top and the bottom, which keeps the partner logos along the foot of
 * the cartilha covers in frame, as the design shows them. The design's caderno
 * placeholder is instead stretched to 133.82% of the frame's height and
 * pinned to the top (18978:2076), which distorts the art and cuts its logo
 * strip; a real cover is never distorted here. */
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run tests/components/conteudo.test.ts`
Expected: PASS, every case in the file.

- [ ] **Step 8: Run the whole suite and lint**

Run: `npx vitest run && npm run lint`
Expected:
- vitest: all files pass, with one test more than the post-Task-1 count.
- lint: `✖ 5 problems (3 errors, 2 warnings)`, as the baseline.

- [ ] **Step 9: Rendered check (Appendix A).** Widths marked ~ may differ by ±0.5px (font metrics); everything else is exact. Coordinates are relative to the probe's base selector, so this check does not depend on the order Sobre-1's PageIntro change lands in.
  1. `await frameAt('/comunicacao')` → `/comunicacao 1436x<h> images=n/n` (n/n: every image loaded).
  2. `probe('ul[class*="__grid"] > li', 5, 'h2#publicacoes-heading')` → five lines, at `@0,43`, `@260,43`, `@520,43`, `@780,43`, `@1040,43`, each `236x450`. 450 is the caderno card's 318 + 8 + 20 + 8 + 96, as in Figma 18978:2076.
  3. `probe('div[class*="__cover"]', 1)` → `236x318`, `pad=20px …`, `br=12px`, `bd=1px rgb(148, 166, 172)/1px rgb(148, 166, 172)`, `sh=none`.
  4. `probe('span[class*="__pdfBadge"]', 1, 'div[class*="__cover"]')` → `"PDF" @21,21 ~44x20`, `f=inter 600 12px/16px`, `c=rgb(255, 255, 255)`, `bg=rgb(0, 43, 57)`, `br=9999px`. Figma: badge at 21/21, 44×20 (I18988:10626;18953:6464).
  5. `probe('span[class*="__tipo"]', 2, 'div[class*="__cover"]')` → two lines:
     - `"Caderno temático" @0,326 ~125x20`
     - `"Cartilha" @260,326 ~66x20`
     - both `pad=1px 9px 1px 9px`, `f=inter 600 12px/16px`, `c=rgb(0, 29, 39)`, `br=9999px`, `bd=1px rgb(82, 111, 120)/1px rgb(82, 111, 120)`.
     - Figma: 125×20 and 66×20 (I18988:10626;18953:6465, I18978:2075;18953:6457).
  6. `probe('li h3', 1, 'div[class*="__cover"]')` → `@0,354 236x96`, `f=rubik 700 16px/24px`, `c=rgb(0, 29, 39)` (unchanged).
  7. `hoverProbe('a[class*="__surface"]', 'div[class*="__cover"]', 0)` → `bd=1px rgb(82, 111, 120)/1px rgb(82, 111, 120)` and `sh=rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px` (Figma 18988:10598).
  8. `await frameAt('/comunicacao/caderno-mercado-de-carbono-florestal-na-caatinga')`, then `probe('section[aria-labelledby="relacionados-heading"] span[class*="__tipo"]', 1)` → `"Cartilha" ~66x20`, `f=inter 600 12px/16px`. The related cards share the component.

- [ ] **Step 10: Commit**

```bash
git add components/marketing/PublicationCard.tsx components/marketing/PublicationCard.module.css tests/components/conteudo.test.ts
git commit -m "fix: set the publication chips in Inter, as the design does"
```

---

### Task M2: "Voltar" and the mobile "Baixar PDF" in Inter, "Voltar" at 96px

**Files:**
- Modify: `components/marketing/conteudo/BackButton.tsx:11`
- Modify: `components/marketing/conteudo/ConteudoHeader.tsx:30`
- Modify: `components/marketing/conteudo/ConteudoHeader.module.css:16-30` and `:64-75`
- Test: `tests/components/conteudo.test.ts` (new `describe` after `describe('ConteudoHeader', …)`, which ends at line 51)

**Interfaces:**
- Consumes: the `.text-ui-medium` global utility (Task 1).
- Produces: nothing new. `ConteudoHeader` keeps `{ publicacao: Publicacao }`, and `BackButton` keeps no props.

- [ ] **Step 1: Write the failing test.** Append after the closing `})` of `describe('ConteudoHeader', …)`:

```ts
describe('ConteudoHeader type', () => {
  // Figma 19015:13063 ("Voltar") and I19015:13089;1:95 ("Baixar PDF") set
  // Inter Medium 14/24, which .text-ui-medium carries.
  it('sets Voltar and the mobile Baixar PDF in the UI face', () => {
    const markup = html(ConteudoHeader, { publicacao: { ...PUBLICACAO, pdf: 'https://x/v1.pdf' } })

    expect(markup).toMatch(/<a class="[^"]*\btext-ui-medium\b[^"]*" href="\/comunicacao">/)
    expect(markup).not.toMatch(/<a class="[^"]*\btext-body\b[^"]*" href="\/comunicacao">/)
    expect(markup).toMatch(/<a href="https:\/\/x\/v1\.pdf"[^>]*class="[^"]*\btext-ui-medium\b[^"]*">/)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/components/conteudo.test.ts -t "UI face"`
Expected: FAIL. `AssertionError: expected '<link rel="preload" …' to match /<a class="[^"]*\btext-ui-medium\b…/`

- [ ] **Step 3: Swap the utility on "Voltar".** In `components/marketing/conteudo/BackButton.tsx`, replace line 11:

```tsx
    <Link href="/comunicacao" className={`${styles.back} text-body`}>
```
with
```tsx
    <Link href="/comunicacao" className={`${styles.back} text-ui-medium`}>
```

- [ ] **Step 4: Swap it on the mobile download.** In `components/marketing/conteudo/ConteudoHeader.tsx`, replace line 30:

```tsx
        <a href={publicacao.pdf} target="_blank" rel="noreferrer" className={`${styles.downloadMobile} text-body`}>
```
with
```tsx
        <a href={publicacao.pdf} target="_blank" rel="noreferrer" className={`${styles.downloadMobile} text-ui-medium`}>
```

- [ ] **Step 5: Draw the outline inside the padding, and drop the overriding weight.** In `components/marketing/conteudo/ConteudoHeader.module.css`, replace lines 16-30:

```css
/* "Voltar" (19015:13061): 96x40, a 1px --role-categorica1-padrao outline with
 * the label and the arrow in the same colour (5.70:1 on --bg-fundo), 6px
 * corners. Its hover fills --am-100, like the header's session button. */
.back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 8px 16px;
  border: 1px solid var(--role-categorica1-padrao);
  border-radius: var(--radius-interno);
  color: var(--role-categorica1-padrao);
  font-weight: 500;
  white-space: nowrap;
  transition: background-color 0.2s ease;
```
with
```css
/* "Voltar" (19015:13061): 96x40, a 1px --role-categorica1-padrao outline with
 * the label and the arrow in the same colour (5.70:1 on --bg-fundo), 6px
 * corners, Inter Medium 14/24 from .text-ui-medium. The design draws the
 * outline inside its 8px/16px padding (the arrow sits 16px from the edge); a
 * CSS border adds to the box, so the padding gives up the border's 1px. Its
 * hover fills --am-100, like the header's session button. */
.back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 7px 15px;
  border: 1px solid var(--role-categorica1-padrao);
  border-radius: var(--radius-interno);
  color: var(--role-categorica1-padrao);
  white-space: nowrap;
  transition: background-color 0.2s ease;
```

- [ ] **Step 6: Drop the overriding weight from the mobile download.** In the same file, replace lines 64-75:

```css
  .downloadMobile {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 44px;
    padding: 8px 16px;
    border-radius: var(--radius-interno);
    background: var(--role-marca-ancora-padrao);
    color: var(--role-marca-ancora-texto-sobre);
    font-weight: 500;
  }
```
with
```css
  /* Inter Medium 14/24 from .text-ui-medium, as the toolbar's own button. */
  .downloadMobile {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 44px;
    padding: 8px 16px;
    border-radius: var(--radius-interno);
    background: var(--role-marca-ancora-padrao);
    color: var(--role-marca-ancora-texto-sobre);
  }
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run tests/components/conteudo.test.ts`
Expected: PASS, every case in the file, including the existing `/<a[^>]*href="\/comunicacao"[^>]*>.*Voltar<\/a>/`.

- [ ] **Step 8: Run the whole suite and lint**

Run: `npx vitest run && npm run lint`
Expected: all files pass; lint still `✖ 5 problems (3 errors, 2 warnings)`.

- [ ] **Step 9: Rendered check (Appendix A).** Widths marked ~ may differ by ±0.5px.
  1. `await frameAt('/comunicacao/caderno-mercado-de-carbono-florestal-na-caatinga')` → `… 1436x<h> images=n/n`.
  2. `probe('a[href="/comunicacao"][class*="__back"]', 1)` → `"Voltar" @80,108 ~96x40`, `pad=7px 15px 7px 15px`, `gap=8px`, `f=inter 500 14px/24px`, `c=rgb(39, 114, 91)`, `br=6px`, `bd=1px rgb(39, 114, 91)/1px rgb(39, 114, 91)`. It was 98.5 wide in Rubik; Figma 96×40 (19015:13061).
  3. `probe('a[href="/comunicacao"][class*="__back"] img', 1, 'a[href="/comunicacao"][class*="__back"]')` → `@16,12 16x16` (Figma arrow at 16/12; it was `@17,12`).
  4. `hoverProbe('a[href="/comunicacao"][class*="__back"]')` → `bg=rgb(230, 234, 235)`, a code-only hover kept by decision 3.
  5. `probe('h1[class*="__title"]', 1)` → `@80,164 1276x72`, `f=rubik 600 30px/36px`, `ls=-0.225px` (Task 1), `c=rgb(88, 124, 34)`. Still two lines.
  6. The mobile "Baixar PDF" (`a[class*="__downloadMobile"]`) is `display: none` at 1436px, and `frameAt` renders only that width. Its Inter class is pinned by Step 1's node test, and Step 6 removed the only declaration that could override it.

- [ ] **Step 10: Commit**

```bash
git add components/marketing/conteudo/BackButton.tsx components/marketing/conteudo/ConteudoHeader.tsx components/marketing/conteudo/ConteudoHeader.module.css tests/components/conteudo.test.ts
git commit -m "fix: match the Voltar button's Inter label and 96px width"
```

---

### Task M3: Reader toolbar (24px icons, the "/" in Inter 8px from the count, "Baixar PDF" in Inter)

**Files:**
- Modify: `components/marketing/conteudo/PdfViewer.tsx:271-274` and `:317`
- Modify: `components/marketing/conteudo/PdfViewer.module.css:38-45`, `:58-64`, `:66-80`, `:92-106`
- No node test: `PdfViewer` reads `document.fullscreenEnabled` in a `useState` initialiser (PdfViewer.tsx:58), and pdf.js needs a browser, so it cannot render under vitest's node environment. Every change here is either geometry or a class on an element only this component draws. The rendered check is the test.

**Interfaces:**
- Consumes: `.text-ui-medium` (Task 1); the `--font-ui` variable (Task 1).
- Produces: a new module class `styles.slash` (PdfViewer.module.css), used only in PdfViewer.tsx.

- [ ] **Step 1: Give the 24px icon its 24px.** The design draws the button's 1px stroke inside its 8px padding: the "Zoom in" instance sits at 8/8, 24×24 (I19015:13081;153:2556). With an 8px padding plus a 1px CSS border, the content box is 22px, and the 24px image renders 22×24. In `components/marketing/conteudo/PdfViewer.module.css`, replace lines 66-80:

```css
/* Icon buttons (19015:13081, 13085, 13088): 40x40 on --bg-fundo with an
 * --am-100 border and 4px corners (no token for 4px), the 24px icon inside. */
.iconButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 8px;
  border: 1px solid var(--am-100);
  border-radius: 4px;
  background: var(--bg-fundo);
  cursor: pointer;
  transition: background-color 0.2s ease;
}
```
with
```css
/* Icon buttons (19015:13081, 13085, 13088): 40x40 on --bg-fundo with an
 * --am-100 border and 4px corners (no token for 4px), the 24px icon 8px from
 * the edge. The design draws the border inside that 8px of padding; a CSS
 * border adds to the box, so the padding gives up the border's 1px, or the
 * icon would be squeezed to 22px wide. */
.iconButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 7px;
  border: 1px solid var(--am-100);
  border-radius: 4px;
  background: var(--bg-fundo);
  cursor: pointer;
  transition: background-color 0.2s ease;
}
```

- [ ] **Step 2: Split the slash from the count.** In `components/marketing/conteudo/PdfViewer.tsx`, replace lines 271-274:

```tsx
            <span className={styles.total}>
              <span aria-hidden="true">/</span>
              <span className="sr-only">de</span> {ready ? pageCount : "--"}
            </span>
```
with
```tsx
            <span className={styles.total}>
              <span className={styles.slash} aria-hidden="true">/</span>
              <span className="sr-only">de</span> <span>{ready ? pageCount : "--"}</span>
            </span>
```

The `" "` between the `sr-only` span and the count stays in the DOM, so assistive tech still reads "de 32". As a whitespace-only flex item it renders nothing. The `sr-only` span is absolutely positioned, so it takes no part in the flex layout or its gap.

- [ ] **Step 3: Space them 8px apart, and set the slash in Inter.** In `components/marketing/conteudo/PdfViewer.module.css`, replace lines 58-64:

```css
.total {
  font-family: var(--font-sans, var(--font-fallback));
  font-size: 16px;
  line-height: 24px;
  color: var(--bg-texto-primario);
  white-space: nowrap;
}
```
with
```css
/* "/" and the page count, 8px apart as the design spaces them (19015:13074).
 * The count is Rubik 16/24. */
.total {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-sans, var(--font-fallback));
  font-size: 16px;
  line-height: 24px;
  color: var(--bg-texto-primario);
  white-space: nowrap;
}

/* The design sets the slash in Inter Regular 16 at a 1.5 line height
 * (19015:13078), which is 16/24: no .text-* utility has it, so only the face
 * and the weight are set here and the size comes from .total. */
.slash {
  font-family: var(--font-ui, var(--font-fallback));
  font-weight: 400;
}
```
FLAG for Task 1: this is a local Inter spec (Inter 400 16/24), per the "another Inter spec → set it locally and flag it" rule.

- [ ] **Step 4: Record why the page field is centred.** Kept; this step only fills in the missing reason. In the same file, replace lines 38-45:

```css
/* As wide as the page count's digits (--page-digits, set by PdfViewer): one
 * digit gives the Figma's 33px; 1ch is 10.2px in Rubik 16. The 22px are the
 * 10px of padding on each side plus the border. */
.pageField {
  width: calc(var(--page-digits, 2) * 1ch + 22px);
  padding-inline: 10px;
  text-align: center;
}
```
with
```css
/* As wide as the page count's digits (--page-digits, set by PdfViewer): one
 * digit gives the Figma's 33px; 1ch is 10.2px in Rubik 16. The 22px are the
 * 10px of padding on each side plus the border. Centred rather than at the
 * design's 12px inset: for one digit in 33px the two land within 1px, and
 * once the field widens for more digits a left inset would leave it lopsided. */
.pageField {
  width: calc(var(--page-digits, 2) * 1ch + 22px);
  padding-inline: 10px;
  text-align: center;
}
```

- [ ] **Step 5: "Baixar PDF" in Inter.** In `components/marketing/conteudo/PdfViewer.tsx`, replace line 317:

```tsx
          <a href={url} target="_blank" rel="noreferrer" className={`${styles.download} text-body`} onClick={download}>
```
with
```tsx
          <a href={url} target="_blank" rel="noreferrer" className={`${styles.download} text-ui-medium`} onClick={download}>
```

Then in `components/marketing/conteudo/PdfViewer.module.css`, replace lines 92-106:

```css
/* "Baixar PDF" (19015:13089): white on --role-marca-ancora-padrao (4.86:1),
 * 4px corners, the 16px icon 8px before the label; hover steps to -hover. */
.download {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 8px 16px;
  border-radius: 4px;
  background: var(--role-marca-ancora-padrao);
  color: var(--role-marca-ancora-texto-sobre);
  font-weight: 500;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}
```
with
```css
/* "Baixar PDF" (19015:13089): white on --role-marca-ancora-padrao (4.86:1),
 * 4px corners, the 16px icon 8px before the label, Inter Medium 14/24 from
 * .text-ui-medium; hover steps to -hover, as the design's filled button does
 * (18916:9438). */
.download {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 8px 16px;
  border-radius: 4px;
  background: var(--role-marca-ancora-padrao);
  color: var(--role-marca-ancora-texto-sobre);
  white-space: nowrap;
  transition: background-color 0.2s ease;
}
```

- [ ] **Step 6: Run the whole suite and lint**

Run: `npx vitest run && npm run lint`
Expected:
- All files pass. `tests/lib/pdfViewerControls.test.ts` is untouched and still passes.
- lint still `✖ 5 problems (3 errors, 2 warnings)`.

- [ ] **Step 7: Pin the screen-reader spacing.** PdfViewer cannot render in node, so this one is a static check.

Run: `grep -c '<span className="sr-only">de</span> <span>{ready ? pageCount : "--"}</span>' components/marketing/conteudo/PdfViewer.tsx`
Expected: `1`. The space between the two spans is the text node that makes assistive tech read "de 32".

- [ ] **Step 8: Rendered check (Appendix A).** Widths marked ~ may differ by ±0.5px.
  1. **Loading state.** `await frameAt('/comunicacao/caderno-mercado-de-carbono-florestal-na-caatinga')`, then probe at once, before pdf.js finishes. If the count already reads `32`, the PDF beat the probe; skip to sub-step 2.
     - `probe('span[class*="__total"] > span', 3, 'input[class*="__pageField"]')` → `"/" @~50,8 ~6x24 f=inter 400 16px/24px c=rgb(0, 29, 39)`, then the 1×1 `sr-only` `"de"`, then `"--" @~64,8 … f=rubik 400 16px/24px`. The count sits 8px after the slash.
     - `probe('button[aria-label="Aumentar zoom"] img', 1, 'button[aria-label="Aumentar zoom"]')` → `@8,8 24x24` while disabled too.
  2. **Loaded state.** `await new Promise(r => setTimeout(r, 4000))`, then:
     - `probe('div[class*="__toolbar"]', 1)` → `@80,316 1276x72`, `pad=16px 24px 16px 24px`, `gap=24px`, `bg=rgb(242, 244, 245)`, `br=0px 0px 8px 8px` (unchanged).
     - `probe('div[class*="__toolbar"] > p', 1)` → `@104,340 351x24`, `f=rubik 500 16px/24px`, `c=rgb(0, 29, 39)` (unchanged).
     - `probe('button[class*="__iconButton"]', 3)` → three lines, each `40x40`, `pad=7px 7px 7px 7px`, `bg=rgb(254, 254, 251)`, `br=4px`, `bd=1px rgb(230, 234, 235)/1px rgb(230, 234, 235)`. The last ("Tela cheia") is at `@1147,332`.
     - For each of `"Aumentar zoom"`, `"Diminuir zoom"` and `"Tela cheia"`: `probe('button[aria-label="<label>"] img', 1, 'button[aria-label="<label>"]')` → `@8,8 24x24`. It was 22×24; Figma I19015:13081;153:2556 at 8/8, 24×24.
     - `probe('span[class*="__total"] > span', 3, 'input[class*="__pageField"]')` → `"/" @~50,8 ~6x24 f=inter 400 16px/24px`, `"de"` 1×1, `"32" @~64,8 ~19x24 f=rubik 400 16px/24px`. Figma: field, 8px, "/", 8px, "20" (19015:13074).
     - `probe('input[class*="__pageField"]', 1)` → `~42x40`, `pad=8px 10px 8px 10px`, `bd=1px rgb(191, 202, 206)/1px rgb(191, 202, 206)`, `br=6px` (kept: 2 digits for 32 pages).
     - `probe('[class*="__toolbar"] [class*="__actions"] > a', 1)` → `"Baixar PDF" @~1203,332 ~129x40`, `pad=8px 16px 8px 16px`, `gap=8px`, `f=inter 500 14px/24px`, `c=rgb(255, 255, 255)`, `bg=rgb(88, 124, 34)`, `br=4px`. Figma 129×40 (19015:13089).
     - `probe('[class*="__toolbar"] [class*="__actions"] > a img', 1, '[class*="__toolbar"] [class*="__actions"] > a')` → `@16,12 16x16`.
     - `probe('[class*="__toolbar"] [class*="__controls"]', 1)` → width W ≈ 263 and x = 801 − W/2 (±1). That centre is (title.right 455 + actions.left 1147) / 2, the same as the design's fixed 311px group.
     - `hoverProbe('[class*="__toolbar"] [class*="__actions"] > a')` → `bg=rgb(71, 101, 27)` (Figma 18916:9438).
     - `hoverProbe('button[aria-label="Aumentar zoom"]')` → `bg=rgb(230, 234, 235)` (code-only hover, kept).

- [ ] **Step 9: Commit**

```bash
git add components/marketing/conteudo/PdfViewer.tsx components/marketing/conteudo/PdfViewer.module.css
git commit -m "fix: keep the reader's icons 24px and space the page count as designed"
```

---

### Task M4: "Conteúdos Relacionados" heading tracking and height

**Files:**
- Modify: `components/marketing/conteudo/RelatedContent.module.css:14-25`
- No node test: the change is two CSS declarations on an element whose markup is already pinned by `describe('RelatedContent', …)` in `tests/components/conteudo.test.ts`. The rendered check measures them.

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Correct the tracking and the height, and the stale comment.**
  - Figma's h3 style gives -0.6 as a percentage. Its export is `tracking-[-0.144px]` at 24px (I19015:13093;21:1287).
  - The heading's frame is 34px tall (19015:13093: `h-[34px]` with 8px of bottom padding over a 32px line), which puts the cards 58px below its top.

  In `components/marketing/conteudo/RelatedContent.module.css`, replace lines 14-25:

```css
/* Rubik SemiBold 24/32, -0.6px (the design's h3), which no .text-* utility
 * has. The design colours it --foreground (#292829), which has no token;
 * --bg-texto-primario is the nearest. */
.heading {
  font-family: var(--font-sans, var(--font-fallback));
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
  letter-spacing: -0.6px;
  color: var(--bg-texto-primario);
  margin: 0;
}
```
with
```css
/* Rubik SemiBold 24/32 tracked -0.6% (-0.144px, the design's h3), which no
 * .text-* utility has. Its frame is 34px tall (19015:13093), 2px under the
 * line. The design colours it --foreground (#292829), which has no token;
 * --bg-texto-primario is the nearest. */
.heading {
  font-family: var(--font-sans, var(--font-fallback));
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
  letter-spacing: -0.144px;
  padding-bottom: 2px;
  color: var(--bg-texto-primario);
  margin: 0;
}
```

- [ ] **Step 2: Run the whole suite and lint**

Run: `npx vitest run && npm run lint`
Expected: all files pass; lint still `✖ 5 problems (3 errors, 2 warnings)`.

- [ ] **Step 3: Rendered check (Appendix A).**
  1. `await frameAt('/comunicacao/caderno-mercado-de-carbono-florestal-na-caatinga')`.
  2. `probe('#relacionados-heading', 1)` → `"Conteúdos Relacionados" …x34 pad=0px 0px 2px 0px f=rubik 600 24px/32px ls=-0.144px c=rgb(0, 29, 39)` (it was 32 tall, `ls=-0.6px`).
  3. `probe('section[aria-labelledby="relacionados-heading"] ul', 1, '#relacionados-heading')` → `@0,58` (it was `@0,56`). Figma: 32 + 34 + 24 = 90 from the section's top, against 32 of padding.
  4. `probe('section[aria-labelledby="relacionados-heading"]', 1)` → `pad=32px 80px 32px 80px`, 2px taller than before.

- [ ] **Step 4: Commit**

```bash
git add components/marketing/conteudo/RelatedContent.module.css
git commit -m "fix: match the related-content heading's tracking and height"
```

---

### Expected on these pages from other tasks (verify, don't re-plan)

- **Task 1 (`.text-h2` -0.225px):**
  - `/comunicacao` `h1.title` "Comunicação": `ls=-0.225px`, still 36px tall.
  - The band's `h2.title`: `ls=-0.225px`, still 2 lines / 72px at 1261px.
  - The publication `h1.title`: `ls=-0.225px`, still 2 lines / 72px.
- **Sobre-1 (PageIntro eyebrow, PhotoBand border), on `/comunicacao`:**
  - `p.eyebrow` "Materiais" 14px tall (line-height 14px); `div.heading` 54 tall (was 60); `p.intro` 6px higher.
  - `div.pageIntro` 206 tall, or 206.52 if Sobre-1 adds the design's 0.52px under the paragraph (18978:2070). Everything below moves up by the same amount.
  - `div.photoBand.dark` 209 tall with `bd=0px 0px 1px 0px rgb(228, 228, 228)`.

### Kept on purpose (Comunicação)

Each item is justified by an existing comment unless stated otherwise.

- **Card title colour #2c2a27 → `--bg-texto-primario`** (no token): PublicationCard.module.css:73-74 (the comment above `.title`).
- **Caderno cover `object-fit: cover`, not the design's stretched fill** (decision 5): PublicationCard.module.css:34-36. M1 Step 6 adds the explicit reason.
- **Cover border `--role-neutro-texto-desabilitado`:** the same value as the design's `--bg-textodesabilitado` #94a6ac. PublicationCard.module.css:18-20.
- **Type chip 1px/9px padding:** the stroke drawn inside the design's 2px/10px padding. PublicationCard.module.css:64-66.
- **"Publicado em" colour #292829 → `--bg-texto-primario`** (no token): ConteudoHeader.module.css:142-144 in the current file (it shifts down after M2's edits).
- **"Conteúdos Relacionados" colour #292829 → `--bg-texto-primario`** (no token): RelatedContent.module.css:15-16.
- **Field border `--input` #dcdbdc → `--am-200`** (no token): PdfViewer.module.css:24-26.
- **Page field width grows with the page count's digits:** 42.3px for 32 pages vs the design's 33px. PdfViewer.module.css:38-40, with centring reason added by M3 Step 4.
- **Zoom field 60px min-width vs the design's 50px** (fits "100%"–"300%" without shifting the zoom-out button): PdfViewer.module.css:47-49.
- **Reader area `min(1127px, calc(100svh - var(--header-height) - 72px))`** (decision 6; documented with a reason): Leitor.module.css:36-38. This keeps the whole reader on screen and its scroll no taller than the window. The design's 1127px holds only on windows ≥1275px tall.
- **Code-only hovers** (decision 3):
  - "Voltar" fills `--am-100`: ConteudoHeader.module.css:18 (rewritten in M2 Step 5, reason kept).
  - Icon buttons fill `--am-100`: PdfViewer.module.css:82-85.
- **Band gradient start #000f15 for the design's black:** PhotoBand.module.css:235-236. Sobre-1 owns the file; listed for completeness.
- **No change needed:**
  - Toolbar controls are not in a fixed 311px frame, but they centre on the same point as the design's group (M3 Step 7, last bullet).
  - The PDF badge's 21/21 inset: the earlier audit's "≤1px" note was wrong. Figma metadata puts the badge at x=21, y=21 inside the cover frame (I18988:10626;18953:6464), exactly where the code renders it.

### Data, not code (Comunicação)

Contentful; no code task.

- **"PDF" badge on every card:** today only the caderno and cartilha 1 have one. Upload the `pdf` asset on the cartilha entries for volumes 2–4.
- **"Publicado em: 14/05/25":** the caderno entry has no `publicationDate`, so the row shows only "Voltar". Fill `publicationDate` on the caderno and on each cartilha.
- **Publication description:** the design's "Material educativo para comunidades e outros públicos interessados em compreender o tema de forma simples e acessível." is placeholder copy. The page shows the caderno entry's `description` ("Reúne o que a ciência revela…"). Change the entry only if the content owner wants the design's wording.
- **Card titles and order:**
  - The design repeats placeholders: Cartilha "Mercado de carbono: o que isso tem a ver com a Caatinga?" / Caderno.
  - The page shows the caderno first, then the cartilhas by their `order` field (`listPublicacoes`, lib/content/comunicacao.ts:105).
  - The order question is open with the content owner (issue #44, question 4); nothing changes unless they decide.
- **Five related cards vs four:** with five publications in total, every page but one relates the other four. A sixth publication fills the row.
- **Page count "20" and zoom "75%":** these come from the document; the caderno PDF has 32 pages and fits at 72%.

---

## Final pass

### Task F: Whole-site check and branch finish

Every component task has run. This task checks the branch as a whole: the gates CI runs, the ones it does not, and every page's height against its Figma frame.

**Files:** none modified.

**Interfaces:**
- Consumes: every earlier task.
- Produces: the branch, ready for review.

- [ ] **Step 1: Run every gate**

```bash
cd /home/ezequias/oca/worktrees/figma-parity
npx vitest run
npm run lint
npx tsc --noEmit -p .
npm run build
npm run contrast
```

Expected:
- vitest: every file passes; the count is the Global Constraints baseline plus the tests the tasks added;
- lint: still 5 problems (3 errors, 2 warnings), all in `components/mapa/`;
- tsc: still the 5 baseline errors, all in `tests/lib/`;
- build: succeeds;
- contrast: passes. It checks the map's monthly accents, which this branch does not touch, but CI runs it.

- [ ] **Step 2: Page heights against the Figma frames**

With the Appendix A harness on the worktree's server, run `await frameAt(path)` for each path. The table also gives the height before the branch, measured on `origin/main` on 2026-10-01.

| path | before | expected | Figma frame |
|---|---|---|---|
| `/` | 1436x2714 | 1436x2703 | 18862:8514 is 3180.52, minus the out-of-scope duplicate 19090:30287 (475.52) = 2705; Destaques hugs its content at 310 vs the frame's fixed 312 (Task H3) |
| `/sobre` | 1436x1530 | 1436x1523 | 18988:8611, 1523.52 |
| `/sobre/caatinga` | 1436x2649 | 1436x2625 | 18988:8667, footer at 2429.52 + 196 |
| `/sobre/carbono-e-comunidades` | 1436x3528 | 1436x3488 | 18988:8769, footer at 3292.52 + 196 |
| `/sobre/como-funciona` | 1436x2107 | 1436x2099 | 18988:8943, 2099.52 |
| `/comunicacao` | 1436x1265 | 1436x1260 | 18978:2048, 1260.52 |
| `/comunicacao/caderno-mercado-de-carbono-florestal-na-caatinga` | 1436x2289 | 1436x2291 | 19015:13056, 2291 (that frame is 1440 wide) |

A height that is off means a task's change did not land or another moved something. Bisect with `sections()`:

```js
window.sections = () => [...F.contentDocument.querySelectorAll('body > header, main > *, body > footer')]
  .map(e => { const r = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}.${short(e.className).slice(0, 20)}@${Math.round(r.top * 100) / 100}+${Math.round(r.height * 100) / 100}` })
  .join(' | ')
```

It prints every top-level block's y and height. Compare them with the Figma frame's children (`get_metadata` on the frame id).

- [ ] **Step 3: Narrow viewports**

The tasks measured 1436px, so check the breakpoints the branch could have moved:
- `await frameAt('/', 1200)`:
  - `probe('header nav[aria-label="Navegação principal"]', 1)` and `probe('header [class*="__actions"]', 1)` both render;
  - the nav's right edge is at least 150px left of the actions' left edge;
  - `probe('header [class*="__toggle"]', 1)` reports `0x0`, because the hamburger stays hidden.
- `await frameAt('/', 390)`:
  - `F.contentDocument.documentElement.scrollWidth` is `390`, so nothing overflows sideways;
  - the footer columns stack, each with a non-zero height (Task H7, Step 3).
- `await frameAt('/sobre/carbono-e-comunidades', 390)`: the two law figures stack, the first 16px under its text (Task C1).
- `await frameAt('/sobre/caatinga', 390)`: `nav[aria-label="Páginas de Sobre"] [class*="__list"]` has `scrollWidth > clientWidth`, and its links are still 52px tall (Task S1).

- [ ] **Step 4: Visual pass against Figma**

For each frame below:
1. Take its Figma render with `get_screenshot` (fileKey `QKUhlt36bGyTskbONscB3G`).
2. Take the harness render of the same page: `computer` → `zoom` on the iframe region, or screenshots while scrolling.
3. Compare them section by section.

| page | Figma frame |
|---|---|
| `/` | 18862:8514 |
| `/sobre` | 18988:8611 |
| `/sobre/caatinga` | 18988:8667 |
| `/sobre/carbono-e-comunidades` | 18988:8769 |
| `/sobre/como-funciona` | 18988:8943 |
| `/comunicacao` | 18978:2048 |
| `/comunicacao/caderno-mercado-de-carbono-florestal-na-caatinga` | 19015:13056 |

The only differences left should be the "Kept on purpose" items and the "Data, not code" items. Anything else is a missed fix: note it, find the task that owns the file, and fix it there.

- [ ] **Step 5: Finish the branch**

Use superpowers:finishing-a-development-branch. If the user picks a PR:
- the title and body are in English, with no attribution lines;
- re-fetch `origin/main` before writing the body (the user merges quickly);
- the body lists:
  - what changed, per page;
  - the "Kept on purpose" deviations;
  - the Contentful "Data, not code" items, for the content owner.

---

## Appendix A: rendered check

Every task ends by measuring the real render at the width of the Figma frame. `frameAt()` returns `<path> 1436x<height> images=<loaded>/<total>`; a width other than 1436 or unloaded images mean the measurement is not valid yet. The browser is the user's Chrome, through the claude-in-chrome tools. The dev server is already logged in: the `session` cookie is scoped to `localhost`, not to a port, so a login on `localhost:3000` also covers `localhost:3100`. If a page redirects to `/login`, ask the user to sign in at `http://localhost:3100/login`. Never type credentials.

### A.1 Serve the worktree

```bash
cd /home/ezequias/oca/worktrees/figma-parity && npx next dev -p 3100
```

Run it in the background and wait for `Ready`. One server serves every task, and hot reload picks up the edits.

### A.2 Optional: dump receiver

The javascript tool truncates results at about 1,500 characters. `probe()` stays under that. For a whole-page dump, run this receiver in the session scratchpad, never in the repo, then use `send()`:

```bash
cat > "$SCRATCH/recv.py" <<'EOF'
import http.server, os, sys
OUT = sys.argv[1]
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0)); body = self.rfile.read(n)
        open(os.path.join(OUT, os.path.basename(self.path.strip('/')) + '.txt'), 'wb').write(body)
        self.send_response(204); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers()
    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in [('Access-Control-Allow-Origin', '*'), ('Access-Control-Allow-Headers', '*'), ('Access-Control-Allow-Private-Network', 'true')]:
            self.send_header(k, v)
        self.end_headers()
    def log_message(self, *a): pass
http.server.HTTPServer(('127.0.0.1', 8765), H).serve_forever()
EOF
# SCRATCH is the session scratchpad directory.
mkdir -p "$SCRATCH/dumps" && python3 "$SCRATCH/recv.py" "$SCRATCH/dumps"   # background
```

### A.3 The harness

Do this once per session:
1. Call `tabs_context_mcp`, then `tabs_create_mcp`.
2. Navigate the new tab to `http://localhost:3100/`.
3. Run this with `javascript_tool`:

```js
// Renders a path inside a 1436px iframe (the width of the Figma frames) whose
// height is grown to the page's, so the page itself never scrolls and its
// content column is exactly 1276px. All coordinates below are page coordinates.
document.open()
document.write('<!doctype html><body style="margin:0;background:#888"><iframe id="f" style="width:1436px;height:960px;border:0;display:block"></iframe></body>')
document.close()
window.F = document.getElementById('f')
window.frameAt = async (path, width = 1436) => {
  F.style.width = width + 'px'
  F.style.height = '960px'
  await new Promise(r => { F.onload = r; F.src = path })
  const d = F.contentDocument
  // No scrollbar ever: with one, the column narrows by its width, the text
  // rewraps taller, and the height never settles.
  d.documentElement.style.overflow = 'hidden'
  const grow = async () => {
    F.style.height = Math.ceil(d.body.getBoundingClientRect().height) + 'px'
    await new Promise(r => setTimeout(r, 300))
  }
  await grow()
  // Lazy images load by the top window's viewport, which shows a sliver of
  // this tall iframe: switch them to eager so every image is measured loaded.
  d.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager' })
  const settle = (p) => Promise.race([p, new Promise(r => setTimeout(r, 8000))])
  await settle(d.fonts.ready)
  await settle(Promise.all([...d.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))))
  await grow()
  // Force-hover support: every :hover rule is duplicated with :hover replaced
  // by .__hover, and transitions are switched off so styles read final values.
  const dup = (list, host) => {
    for (const rule of [...list]) {
      if (rule.cssRules && !rule.selectorText) dup(rule.cssRules, rule)
      else if (rule.selectorText?.includes(':hover')) {
        host.insertRule(`${rule.selectorText.replaceAll(':hover', '.__hover')}{${rule.style.cssText}}`, host.cssRules.length)
      }
    }
  }
  for (const s of [...d.styleSheets]) { try { dup(s.cssRules, s) } catch {} }
  const st = d.createElement('style')
  st.textContent = '*{transition:none!important;animation:none!important}'
  d.head.append(st)
  const loaded = [...d.images].filter(i => i.complete && i.naturalWidth).length
  return `${path} ${d.documentElement.clientWidth}x${Math.ceil(d.body.getBoundingClientRect().height)} images=${loaded}/${d.images.length}`
}
window.short = c => (c?.baseVal ?? c ?? '').toString().replace(/[A-Za-z]+-module__\w+__/g, '')
// One line for one element: box, padding, gap, then typography and colours.
window.line = (e, B = { left: 0, top: 0 }) => {
  const r = e.getBoundingClientRect(), cs = F.contentWindow.getComputedStyle(e)
  const txt = (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 24)
  const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' ')
  return `${e.tagName.toLowerCase()}.${short(e.className)} "${txt}" @${Math.round(r.left - B.left)},${Math.round(r.top - B.top)} ${+r.width.toFixed(1)}x${+r.height.toFixed(1)}` +
    ` pad=${pad}${cs.display.includes('flex') || cs.display.includes('grid') ? ' gap=' + cs.gap : ''}` +
    ` f=${cs.fontFamily.split(',')[0].replace(/['"]/g, '')} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ls=${cs.letterSpacing}` +
    ` c=${cs.color} bg=${cs.backgroundColor}${cs.backgroundImage !== 'none' ? ' bgi=' + cs.backgroundImage.slice(0, 90) : ''}` +
    ` br=${cs.borderRadius} bd=${cs.borderTopWidth} ${cs.borderTopColor}/${cs.borderBottomWidth} ${cs.borderBottomColor}` +
    `${cs.boxShadow !== 'none' ? ' sh=' + cs.boxShadow : ''}${cs.transform !== 'none' ? ' tf=' + cs.transform : ''}`
}
// Up to n matches of a selector; `base` is an optional selector whose box
// becomes the origin, to compare against the coordinates of a Figma frame.
window.probe = (sel, n = 4, base = null) => {
  const d = F.contentDocument
  const B = base ? d.querySelector(base).getBoundingClientRect() : undefined
  return [...d.querySelectorAll(sel)].slice(0, n).map(e => line(e, B)).join('\n') || `(no match for ${sel})`
}
// Hover: the i-th match of `sel`, with it and every ancestor marked :hover as
// a real pointer would, measured itself or through `inner` (a selector inside
// it, e.g. the photo of a hovered card); the marks are removed afterwards.
window.hoverProbe = (sel, inner = null, i = 0) => {
  const el = F.contentDocument.querySelectorAll(sel)[i]
  if (!el) return `(no match for ${sel})`
  const chain = []
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) { e.classList.add('__hover'); chain.push(e) }
  const target = inner ? el.querySelector(inner) : el
  const out = target ? line(target) : `(no ${inner} inside ${sel})`
  chain.forEach(e => e.classList.remove('__hover'))
  return out
}
// Whole-page dump to the A.2 receiver.
window.send = async (name, text) => (await fetch('http://127.0.0.1:8765/' + name, { method: 'POST', body: text }), `${name} ${text.length}`)
'harness ready'
```

The javascript tool returns only the value of the last expression, truncated at about 1,500 characters. When a check lists several `probe(...)` calls in one block, run them one per call, or join a few: `[probe(a, 1), probe(b, 2)].join('\n')`.

`frameAt(path, width)` takes an optional width (default 1436). Use it for the narrow-viewport checks, e.g. `await frameAt('/', 1200)` or `await frameAt('/sobre/carbono-e-comunidades', 390)`.

CSS Modules hash their class names, so select by suffix: `[class*="__navLink"]`, `[class*="__sessionButton"]`. `probe(sel, n, base)` takes an optional `base` selector whose box becomes the origin, which helps compare against the coordinates of a Figma frame. A hover check is `hoverProbe('[class*="__navLink"]')`; compare it against `probe(...)` of the same element at rest.

The force-hover reads the stylesheet rules, so it also exercises a `:hover` that never fires under a real pointer (for example one hidden by `pointer-events`). For a hover a task changes, also confirm once with the real pointer:
1. `computer` → `screenshot`;
2. `computer` → `hover` over the element;
3. `probe(...)`.

---

## Source audit

The audit compared the design with the code and with a logged-in 1436px render (computed styles, plus each hover forced on). Each difference it found maps to one task, or to a "Kept on purpose" or "Data, not code" list:

| Area | What differs | Task |
|---|---|---|
| Everywhere | Inter (buttons, nav, tabs, chips) never loaded; h2 tracked -0.75px instead of -0.225px; Rubik capped at 700 | 1 |
| Header | Nav weights and geometry, square hover corners, language switch 32px tall, session button 2px/8px/114px | H1 |
| Hero | 503px tall (eyebrow line box, gaps), secondary button 44px tall, credit pill size/position/font, dot row | H2 |
| Destaques | Label weight and tracking, 18px icon, value box, card fill | H3 |
| Conheça a plataforma | Tab face (Archivo), text column not centred, gap 16 vs 24, image radius 8 vs 12, "Ver mais" radius/chevron/face | H4 |
| Ferramenta | Band #000f15 vs #002430, eyebrow colour/weight, insets | H5 |
| Comunicação (landing) | Card order, title face and size, label, radius, text insets, photo zoom on hover | H6 |
| Footer | Column distribution, wordmark, links face/size/opacity, headings | H7 |
| Sobre frame | Eyebrow line box, tab face, height and rest colour, hover label colour | S1 |
| Sobre sections | Closing quote 24px under its text instead of 8px | S2 |
| Photo bands | Missing 1px bottom rule | S3 |
| Conheça a Caatinga | House photo framing; comparison arrow 1px | S5 |
| Entenda essa relação | Law figure spacing, question 5 line break | C1 |
| Entenda essa relação | Question numbers at 700 instead of 800 | C2 |
| Como funciona | Step-2 labels in Rubik instead of Inter | C3 |
| Comunicação list | Chips in Rubik | M1 |
| Ver conteúdo | "Voltar" face and width | M2 |
| Ver conteúdo | Reader icons squeezed to 22px, "/" face and spacing, "Baixar PDF" face | M3 |
| Ver conteúdo | "Conteúdos Relacionados" tracking and height | M4 |

Out of scope:
- the duplicate "A ferramenta central da plataforma" section (19090:30287);
- the deviations each slice lists as "Kept on purpose";
- the "Data, not code" items in the Comunicação slice;
- one pre-existing issue that is not a design difference: the Sobre tab strip's `overflow-x: auto` probably clips the bottom of the 2px focus ring.
