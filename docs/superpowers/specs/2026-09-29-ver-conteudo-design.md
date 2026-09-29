# "Ver conteúdo" publication page — design

**Date:** 2026-09-29
**Status:** approved in conversation, section by section, before any code was written.

## 1. Goal

The design update of September 2026 (Figma copy `QKUhlt36bGyTskbONscB3G`, frame "Ver conteúdo"
`19015:13056`) adds a page per publication: a "Voltar" button and the publication date, the
title and a description, an embedded PDF reader with its own toolbar, and a row of "Conteúdos
Relacionados".

Today no such page exists. A publication card, on the landing (`components/marketing/Comunicacao.tsx`)
and on `/comunicacao` (`components/marketing/PublicationCard.tsx`), opens the PDF itself in a new
tab, and a card without a PDF is not a control at all.

After this work every publication has a page at `/comunicacao/<slug>`, every card leads to it,
and the page reads the PDF in place when there is one.

**The PDFs do not exist yet.** The `pdf` field is empty on all five entries of the Contentful
space (checked 2026-09-29) and the repository ships none. The page must therefore be complete
without a PDF, and the reader must start working with no code change once one is uploaded.

## 2. Decisions

Settled with the user before any code was written.

| # | Question | Decision |
|---|---|---|
| 1 | Will the PDFs exist when the page ships? | **No.** The page has a no-PDF state: the cover where the first page would be, the toolbar reduced to the title. |
| 2 | Build the reader now, or when the PDFs arrive? | **Now**, tested with a sample PDF, behind the no-PDF fallback. |
| 3 | Where does "Publicado em" come from? | **A new optional Contentful field**, `publicationDate`. The line is hidden while it is empty. Contentful's own `sys.firstPublishedAt` was rejected: it dates the CMS entry (03/09/26), not the material. |
| 4 | How is the reader built? | **pdf.js's own `PDFViewer` component** driven by our toolbar (§5). `react-pdf` would render every page at once; a native `<iframe>` cannot be driven by the design's toolbar and does not render PDFs on Android Chrome or past page 1 on iOS Safari. |
| 5 | Port DataNordeste's reader (`data-nordeste-frontend/src/components/PdfViewer/`)? | **Use it as the UX reference, not as code.** Its hand-rolled canvas rendering lacks a text layer and links, and zooming loses the reading position. `PDFViewer` already provides both. Its open `/api/pdf-proxy?url=`, runtime worker from cdnjs and cross-origin `<a download>` are not reproduced. |
| 6 | Initial zoom? | **The whole page visible** (`page-fit`), with the resulting percentage in the field. The design's label says "75%" while its drawing shows the page filling the reading area (878×1127); at 75% an A4 page is ~595px wide. The drawing wins. |

### 2.1 Spike findings

A throwaway spike (branch `spike/pdf-viewer`, worktree `worktrees/spike-pdf-viewer`, never pushed)
ran `pdfjs-dist` 6.3.289's `PDFViewer` inside the marketing layout against a 20-page sample PDF,
in `next dev` and in `next build` + `next start`, driven by headless Chrome over CDP:

- **Worker:** `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` works under
  Turbopack in dev and in the production build, and is emitted as
  `/_next/static/media/pdf.worker.min.<hash>.mjs`, so it is served from our own origin and follows
  the installed version. No CDN, no copy script.
- **Library wiring:** `pdfjs-dist/web/pdf_viewer.mjs` reads the core library from
  `globalThis.pdfjsLib`, which must be set before that module is imported.
- **Rendering:** the document opened in ~0.2s. Pages render lazily: 1–2 canvases at first, more
  as the reader moves. The text layer and link annotations are present.
- **Toolbar control:** `currentPageNumber`, `currentScale`/`currentScaleValue` and the
  `pagechanging`/`scalechanging` events drive and follow the reader. Fullscreen on the frame works.
  Downloading from `getData()` as a Blob works.
- **390px:** `page-width` fits and there is no horizontal page scroll.
- **Cost:** ~185 KB gzipped of JavaScript (core 135 + viewer 51) plus a ~375 KB gzipped worker,
  loaded only on a publication page that has a PDF.
- **CORS:** `images.ctfassets.net` and `assets.ctfassets.net` answer with
  `access-control-allow-origin: *`, so pdf.js reads the PDF straight from Contentful without a
  proxy of ours.
- **To tune:** `increaseScale()` steps 75% → 90%, so the toolbar uses its own steps (§5.1), and
  pdf.js's page margins leave spare room at 390px, so they are overridden (§5.3).

## 3. Content model and data

### 3.1 Route

- `app/(marketing)/comunicacao/[slug]/page.tsx`: a server component under `(marketing)`, so the
  layout's session check covers it like every other marketing page.
- **`proxy.ts`:** its matcher gains `/comunicacao/:path*`. Without it the post-login redirect of a
  shared publication link lands on `/` (`lib/marketing/requestPath.ts`).
- **Slugs and metadata:** an unknown slug calls `notFound()`. `generateMetadata` sets the
  publication's title, so the template renders "<title> | Caativar".
- **Nav:** `activeNavHref` already lights "Comunicação" on sub-paths, and `nav.ts` stays unchanged.

### 3.2 New Contentful fields

Added to `CONTENT_TYPES` in `scripts/contentful-provision.mjs`:

| Field id | Name (editor-facing) | `cartilha` | `caderno` | Type |
|---|---|---|---|---|
| `slug` | "Endereço" | new, required, unique | new, required, unique | Symbol |
| `publicationDate` | "Data de publicação" | new, optional | new, optional | Date |
| `description` | "Descrição" | new, optional | exists (required) | Text |

`COMUNICACAO_QUERY` selects the new fields, and `tests/scripts/contentfulProvision.test.ts` keeps
the query and the model in step, as it already does.

- **Slug field:** the slug is its own field rather than derived from the title, so fixing a typo
  in a title cannot break a link someone already shared.
- **Slug collisions:** Contentful enforces uniqueness per content type only. A cartilha and a
  caderno sharing a slug resolve to the first in list order (§3.3), with a `console.warn`, and the
  live-space test (§7.2) fails on it.
- **Entry without a slug:** it is still listed, but its card is not a link and it has no page,
  like a card without a PDF today.

### 3.3 `lib/content/comunicacao.ts`

- **`Publicacao` fields:** it gains `slug?: string`, `description: string`,
  `publicationDate?: string` and `pdfFileName?: string` (the asset's `fileName`, which the query
  now selects next to `pdf { url }`). `listPublicacoes` fills them, so the order stays the caderno
  first, then the cartilhas in their Contentful `order`.
- **Shipped content:** the default entries (`DEFAULT_CADERNO`, `DEFAULT_CARTILHAS`) get fixed,
  unique slugs.
- **Cartilha description fallback:** a cartilha with no `description` falls back to the series
  copy the landing already uses. `DESCRICAO_CARTILHA` moves from `Comunicacao.tsx` into this module,
  and both screens read it from there.
- **`findPublicacao(conteudo, slug)`:** returns the first `Publicacao` with that slug, or `null`.
  It warns when more than one matches.
- **`relatedPublicacoes(conteudo, slug)`:** returns every other publication, in list order, at most
  5. Today that is 4.
- **`formatPublicationDate(value)`:** returns `dd/MM/yy` (`14/05/25`), formatted **in UTC**. A
  date-only value is stored as midnight UTC, and formatting it in the Northeast's UTC−3 would print
  the previous day. Empty or unparseable input returns `null`, and the "Publicado em" line is then
  omitted.
- **CMS fallback:** unchanged. A Contentful failure still falls back per section to the shipped
  content.

### 3.4 Cards

- **Link target:** `PublicationCard` (the `/comunicacao` grid and the related row) and the
  landing's `ComunicacaoCard` link to `/comunicacao/<slug>` with `next/link`, since this is the same
  route group, instead of to the PDF.
- **Which cards are links:** any publication with a slug is a link, PDF or not.
- **"PDF" badge:** it still appears only when there is a file.
- **Landing CTA:** the landing card's "Ver material" CTA shows on every linked card.

## 4. Page and components

### 4.1 Structure

Top to bottom, as in frame `19015:13056`:

1. `SiteHeader`
2. **Content header:** "Voltar" on the left and "Publicado em: 14/05/25" on the right, then the
   title as an `<h1>` styled `text-h2` in `--role-marca-ancora-padrao` (the same pattern
   `PageIntro` uses), then the description.
3. **The reader** (§5), or its no-PDF state.
4. **"Conteúdos Relacionados":** a heading and a row of cards.
5. `SiteFooter`. This page has no `PhotoBand`.

### 4.2 Components

All in `components/marketing/conteudo/`:

- **`ConteudoHeader`** (server): the Voltar/date row, the `<h1>` and the description. Below 768px,
  and only when there is a PDF, it also holds the full-width "Baixar PDF" button (§5.4).
- **`BackButton`**: a `next/link` to `/comunicacao`, always. Changed after testing on 2026-09-29: the
  first version stepped back through history when the visitor came from within the site, and that
  walked a reader who had hopped along the related cards back through every publication they had
  opened. The browser's own back button still offers the step-by-step history.
- **`PdfViewerLoader`** (client): wraps `PdfViewer` in `next/dynamic` with `ssr: false`, which the
  App Router only allows in a client component. Its `loading` is the skeleton of §5.5.
- **`PdfViewer`** (client): the reader, §5.
- **`ConteudoSemPdf`** (server): the no-PDF state.
  - It keeps the reader's grey frame and a toolbar with the title only: no page field, zoom,
    fullscreen or download.
  - The reading area shows the cover, portrait and centred, where the first page would be.
  - pdf.js is never loaded.
- **`RelatedContent`** (server): the "Conteúdos Relacionados" heading and a
  `<ul role="list">` of `PublicationCard`.
  - It reuses the `auto-fill, minmax(200px, 1fr)` grid of `Publicacoes.module.css`: five 236px
    columns at the 1276px container, as in the design.
  - With 4 related publications the cards keep the design's width and the fifth slot stays empty.
  - Narrower, the columns reflow on their own, as on `/comunicacao`, down to one column at 390px.

### 4.3 At 390px (no mobile design)

- **Voltar/date row:** it fits on one line (≈253px of 342).
- **Title and description:** they wrap normally.
- **Reader:** it switches to its compact toolbar (§5.4).

## 5. The reader

### 5.1 Toolbar, desktop

In the design's order:

- **Title:** one line, ellipsis.
- **Page field:** an editable input "1", then "/ 20".
  - Enter or blur navigates to the page typed.
  - An invalid value is restored to the current page.
  - Scrolling updates it through `pagechanging`.
- **Zoom:** the zoom-in magnifier, the percentage, then the zoom-out magnifier, as in the Figma.
  - The steps are 50, 75, 100, 125, 150, 200 and 300%. A button moves to the next step above or
    below the current scale, including from an off-step value such as a `page-fit` 95%.
  - The buttons disable at the ends.
  - The percentage is a read-only `<output>`.
- **Fullscreen:** it requests fullscreen on the whole frame, with the page fit to the height, and
  restores the previous scale on exit.
  - It is rendered only when `document.fullscreenEnabled` is true. iPhone Safari has no element
    fullscreen.
- **"Baixar PDF":**
  - Until the document has loaded, it is a plain link to the file (`target="_blank"`).
  - Once loaded, it downloads from `pdfDocument.getData()` as a Blob through an object URL. The
    `download` attribute is ignored on a cross-origin URL, and the bytes are already in memory.
  - The file name is the Contentful asset's `fileName`, else `<slug>.pdf`.

### 5.2 Reading area

- **Size:** a scroll box of its own. Its height is the design's 1127px, capped at the viewport
  height minus the header and the toolbar, so the whole reader always fits on screen.
- **Keyboard:** it is focusable (`tabindex="0"`, `aria-label="Documento PDF"`) so keyboard users
  can scroll it.
- **Text and links:** the text layer is on. PDF links open in a new tab with
  `noopener noreferrer` (`LinkTarget.BLANK`).
- **Hardening:**
  - forms, annotation editing and PDF scripting are off;
  - `getDocument` runs with `isEvalSupported: false`, the recommended hardening since the 2024
    pdf.js font-rendering code-execution flaw (CVE-2024-4367, fixed upstream in 4.2.67).
- **Initial scale:** `page-fit` on desktop, `page-width` below 768px (Decision 6).

### 5.3 Wiring

As validated in the spike (§2.1):

- **Order of setup:**
  1. import `pdfjs-dist`;
  2. set `GlobalWorkerOptions.workerSrc` from `new URL(..., import.meta.url)`;
  3. set `globalThis.pdfjsLib`;
  4. import `pdfjs-dist/web/pdf_viewer.mjs`;
  5. build the `EventBus`, `PDFLinkService` and `PDFViewer`.
- **Styles:** `pdfjs-dist/web/pdf_viewer.css` is imported by `PdfViewer`, so it ships with its
  chunk only. Page borders, shadows and margins are overridden in `PdfViewer.module.css` with
  tokens.
- **Teardown:** unmounting destroys the loading task/document.

### 5.4 Below 768px

- **Toolbar:** it drops the title, which is already the `<h1>` just above. Page field, zoom and
  fullscreen sit on one row (≈300px of 318).
- **"Baixar PDF":** it moves under the description as a full-width button, DataNordeste's pattern.
  It is a plain link to the file (`target="_blank"`), rendered by the server component: a phone
  browser hands a PDF to its own viewer or downloads it, so the Blob download of §5.1 is a
  desktop-toolbar behaviour only.
- **Reading area:** about 70% of the viewport height, opening at `page-width`.

### 5.5 States

- **Loading:** a skeleton with the reader's exact footprint, and "Carregando documento…" in an
  `aria-live="polite"` region.
- **Error:** the PDF fails to load (network, corrupt file). The page shows the cover, the message
  "Não foi possível exibir o PDF." and a link "Abrir o arquivo em outra aba".
- **No PDF:** `ConteudoSemPdf` (§4.2).

## 6. Styling and accessibility

- **Tokens:** colors come from `app/globals.css`. The design's values without a token map to the
  nearest one, and each mapping is commented where it is used:

| Design | Token |
|---|---|
| frame `#bfcace` | `--am-200` |
| toolbar `#f2f4f5` | `--am-050` |
| title `#587c22` | `--role-marca-ancora-padrao` |
| "Voltar" border and text `#27725b` | `--role-categorica1-padrao` |
| "Baixar PDF" `#587c22` / white | `--role-marca-ancora-padrao` / `--role-marca-ancora-texto-sobre` |
| date and "Conteúdos Relacionados" `#292829` (`--foreground`, no token) | `--bg-texto-primario` |
| field border `#dcdbdc` (`--input`, no token) | `--am-200` |
| icon-button border `#e6eaeb` | `--am-100` |
| field text `#526f78` | `--am-400` |

- **Type steps:** steps without a `.text-*` utility (the toolbar title at Rubik Medium 16, the
  related heading at Rubik SemiBold 24) are set in the module CSS, as
  `Publicacoes.module.css` does.
- **Palette test:** every new text/background pair joins `tests/lib/marketingPalette.test.ts` at
  ≥ 4.5:1.
- **Hover and motion:** hover states also apply on `:focus-visible`. Transitions are off under
  `prefers-reduced-motion: reduce`.
- **Icons:** the arrow-back, zoom-in, zoom-out, fullscreen and download icons are exported from
  the Figma (`get_design_context` / `download_assets`) into `public/icons/conteudo/`.
- **Labels:** icon buttons carry `aria-label`s: "Aumentar zoom", "Diminuir zoom", "Tela cheia" /
  "Sair da tela cheia". The page field is labelled "Página".

## 7. Testing

Vitest runs in the node environment with no DOM, so the logic that can be wrong lives in pure
functions, and those are tested first.

### 7.1 Unit

- **`tests/lib/comunicacaoContent.test.ts`:**
  - `slug`, `publicationDate` and `description` are mapped;
  - an entry without a slug is listed but has no slug;
  - the default slugs are unique;
  - a cartilha without a description gets the series copy;
  - `findPublicacao` finds by slug, returns `null` for an unknown slug, and takes the first of
    duplicates with a warning;
  - `relatedPublicacoes` excludes the current publication, keeps the order and caps at 5.
- **Date:** `formatPublicationDate` maps `2025-05-14` and `2025-05-14T00:00:00.000Z` to `14/05/25`
  (never `13/05/25`). Empty or invalid input gives `null`.
- **`lib/marketing/pdfViewerControls.ts`:** the next step up and down, from on-step and off-step values, and
  the ends.
- **`parsePageInput`:** `"10"` of 20 gives 10; `"0"`, `"21"`, `"abc"` and `""` give `null`.
- **`tests/scripts/contentfulProvision.test.ts`:** the three new fields are provisioned and
  selected.
- **`tests/proxy.test.ts`:** the matcher covers a `/comunicacao/<slug>` URL.
- **`tests/lib/marketingPalette.test.ts`:** the new pairs.

### 7.2 Live space

`tests/lib/contentfulSpace.test.ts` requires a slug on every entry, unique across cartilha and
caderno. **It fails locally until the slugs are filled in (§8, step 2).** That is the intended
signal.

### 7.3 Browser

Through the Chrome extension, or headless Chrome over CDP as in the spike:

- **Sample PDF:** a local, uncommitted override points one shipped publication at the sample PDF,
  with the Contentful credentials unset, so the CMS is not touched.
- **1440px:** compared with frame `19015:13056` (header block, toolbar, reading area, related row).
- **390px:** no horizontal scroll, and the compact toolbar.
- **States:** loading, error (a missing PDF URL) and no-PDF (today's real case).
- **Keyboard:** Tab through the toolbar, Enter in the page field.
- **Actions:** fullscreen; download; "Voltar" arriving from the landing, from the listing and from
  a direct link.
- **Console:** no errors.

Before the PR: `npm test`, `npm run lint`, `npm run build`, `npm run contrast`.

## 8. Rollout

The new query names fields the space does not have yet, and the GraphQL API rejects such a query,
which would drop the whole Comunicação content to the shipped fallback. The order is therefore:

1. `CONTENTFUL_MANAGEMENT_TOKEN=... node scripts/contentful-provision.mjs --apply` (the user).
2. Fill `slug` on the five entries. The date and the cartilha descriptions are optional.
3. Merge.

## 9. Out of scope

- The new landing section `19090:30287`, still being worked on by the designer.
- The footer logo, the favicons and the Territórios step rail (PR #75 follow-ups).
- The caderno title wording: the design says "riscos" where the shipped cover art, the code and
  Contentful say "ameaças".
- Uploading the PDFs and writing the publication dates.

## 10. Files

**New**
- `app/(marketing)/comunicacao/[slug]/page.tsx`
- `components/marketing/conteudo/{ConteudoHeader,BackButton,PdfViewerLoader,PdfViewer,ConteudoSemPdf,RelatedContent}.tsx` and their `.module.css`
- `lib/marketing/pdfViewerControls.ts` (zoom steps and `parsePageInput`)
- `public/icons/conteudo/*.svg`

**Changed**
- `lib/content/comunicacao.ts`: fields, query, fallbacks, `findPublicacao`,
  `relatedPublicacoes`, `formatPublicationDate`, `DESCRICAO_CARTILHA`
- `scripts/contentful-provision.mjs`: three fields
- `components/marketing/PublicationCard.tsx`, `components/marketing/Comunicacao.tsx`: link to the
  page
- `proxy.ts`: matcher
- `package.json` / `package-lock.json`: `pdfjs-dist`
- Tests listed in §7
