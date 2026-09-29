# "Ver conteúdo" Publication Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every Comunicação publication its own page at `/comunicacao/<slug>` (Figma frame `19015:13056`): a header, an embedded pdf.js reader with the design's toolbar, a no-PDF state for today, and "Conteúdos Relacionados".

**Architecture:** Three Contentful fields (`slug`, `publicationDate`, cartilha `description`) extend the existing content module (`lib/content/comunicacao.ts`), which gains lookup helpers. A server page under `app/(marketing)/comunicacao/[slug]/` renders server components for the header, the no-PDF reader and the related row. The PDF reader is a client component that wraps pdf.js's own `PDFViewer` and loads through `next/dynamic` only when a PDF exists. The logic that can be wrong (zoom steps, page parsing, date formatting, the "Voltar" decision) lives in pure functions tested in Vitest's node environment.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, CSS Modules, `pdfjs-dist` 6.3.289, Vitest 4 (node environment, `react-dom/server` for markup tests), Contentful GraphQL.

**Spec:** `docs/superpowers/specs/2026-09-29-ver-conteudo-design.md`

## Global Constraints

- **Language:** code, comments and docs in English. UI strings stay in Portuguese, copied verbatim from the Figma ("Voltar", "Publicado em:", "Baixar PDF", "Conteúdos Relacionados"). The Portuguese docs (`DOCUMENTACAO.md`, `IMAGENS.md`) are edited in Portuguese.
- **Commits:** conventional (`feat:`, `test:`, `docs:`), no co-author trailers, one commit per task at least. Work on branch `feat/publication-page`.
- **Colors:** only tokens from `app/globals.css`, no hex in CSS. The design's untokened colors map as the spec's §6 table says: `#292829` → `--bg-texto-primario`, `#dcdbdc` → `--am-200`. Say so in a comment where it happens.
- **Contrast:** every new text/background pair goes into `tests/lib/marketingPalette.test.ts` at ≥ 4.5:1.
- **Motion and focus:** hover styles also apply on `:focus-visible`. Transitions are off under `prefers-reduced-motion: reduce`.
- **390px:** everything works at 390px with no horizontal page scroll. The mobile breakpoint is `@media (max-width: 767px)` (spec: "<768px").
- **Links:** within the marketing group use `next/link`, crossing route groups use `<a href>`. A PDF link is a plain `<a>`.
- **Images:** SVG icons render as `<img>` with `{/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}`, as `components/marketing/PhotoBand.tsx` does.
- **Wrapper ids:** components under `components/marketing/` must not put an `id` on their wrapper `<section|header|footer>`, because `tests/lib/marketingNav.test.ts` counts those as landing sections. Ids go on headings.
- **Hooks lint:** `react-hooks/set-state-in-effect` is on, so never call `setState` synchronously in an effect body; set state after an `await` or in an event handler.
- **Tests before provisioning:** until the user applies the new Contentful model (spec §8), the live-space test fails. Run the suite as `CONTENTFUL_SPACE_ID= npx vitest run`, which skips it (`@next/env` and `loadEnvLocal` never overwrite a defined variable, even an empty one). Task 7 runs the plain `npm test` and reports its result honestly.
- **Dev server for checks:** `CONTENTFUL_SPACE_ID= npx next dev -p 3013` (the shipped content, no CMS). Port 3009 belongs to the user's own server; do not stop it.

## Browser Checks

Every task's browser step works this way:

- **Server:** run `CONTENTFUL_SPACE_ID= npx next dev -p 3013` in the background, and stop it when the step is done.
- **Chrome extension, when connected:** open `http://localhost:3013/...`. The user's `session` cookie on `localhost` is shared across ports, so the marketing pages open signed in.
- **Otherwise, headless Chrome over CDP,** driven the way the spike was (`<scratchpad>/cdp-spike.mjs`, run with `node --experimental-websocket`, with its checks adapted to this page's DOM).
  - Headless Chrome has no session, so create two **uncommitted** files that serve the publication page outside the login gate. Delete both when done, and confirm with `git status`.
  - Headless checks load `http://localhost:3013/verify/<slug>`.

`app/(verify)/layout.tsx`:

```tsx
// THROWAWAY verification layout: the marketing CSS and fonts, no session gate.
import "../globals.css";
import { archivoNarrow, rubik } from "../fonts/marketing";

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${rubik.variable} ${archivoNarrow.variable}`}>{children}</body>
    </html>
  );
}
```

`app/(verify)/verify/[slug]/page.tsx`:

```tsx
// THROWAWAY: the publication page, outside the (marketing) login gate.
export { default, generateMetadata } from "@/app/(marketing)/comunicacao/[slug]/page";
```

## Review Focus

- **"Voltar" after the login redirect or an external link** must lead to `/comunicacao`, never out of the site. Pinned by the `shouldStepBack` tests in Task 4.
- **A Contentful outage, with CMS slugs different from the shipped ones,** would turn every shared link into a 404 while the fallback is live. The live-space test in Task 7 asserts the CMS carries every shipped slug.
- **The longest title** (the caderno, 103 characters) must truncate in the toolbar at 1440px and wrap in the `<h1>` at 390px, without horizontal scroll. Checked with the 390/1440 steps in Task 6.
- **A PDF that fails to load** (404, network) shows the cover, "Não foi possível exibir o PDF." and the "Abrir o arquivo em outra aba" link, with no uncaught exception. Checked with the error step in Task 6.
- **A page field typed out of range or non-numeric** ("999", "abc", then blur) restores the current page. Pinned by the `parsePageInput` tests in Task 3 and the page-field step in Task 6.

---

### Task 1: Publication fields in the content model

**Files:**
- Modify: `lib/content/comunicacao.ts`
- Modify: `scripts/contentful-provision.mjs`
- Modify: `components/marketing/Comunicacao.tsx` (only the `DESCRICAO_CARTILHA` move)
- Test: `tests/lib/comunicacaoContent.test.ts`, `tests/scripts/contentfulProvision.test.ts`

**Interfaces:**
- Produces:
  - `Cartilha` gains `slug?: string`, `description?: string`, `publicationDate?: string`, `pdfFileName?: string`.
  - `Caderno` gains `slug?: string`, `publicationDate?: string`, `pdfFileName?: string`.
  - `Publicacao` becomes `{ key: string; slug?: string; tipo: 'Caderno temático' | 'Cartilha'; title: string; description: string; publicationDate?: string; cover: string; pdf?: string; pdfFileName?: string }`.
  - `export const DESCRICAO_CARTILHA: string` (moved out of `Comunicacao.tsx`).
  - `export function toCmaField(field)` in the provisioning script.
  - Default slugs: `caderno-mercado-de-carbono-florestal-na-caatinga`, `cartilha-1-o-que-e-credito-de-carbono`, `cartilha-2-como-funciona-o-mercado-de-carbono`, `cartilha-3-a-caatinga-e-o-carbono`, `cartilha-4-desafios-e-caminhos`.

- [ ] **Step 1: Write the failing content tests**

In `tests/lib/comunicacaoContent.test.ts`, change the import to also bring `DESCRICAO_CARTILHA`:

```ts
import {
  DEFAULT_CADERNO,
  DEFAULT_CARTILHAS,
  DEFAULT_FOTOS_FORMACAO,
  DESCRICAO_CARTILHA,
  getComunicacaoContent,
  listPublicacoes,
} from '@/lib/content/comunicacao'
```

In the first test, replace the `cartilhas[0]` assertion:

```ts
    expect(content.cartilhas[0]).toEqual({
      slug: 'cartilha-1-o-que-e-credito-de-carbono',
      volume: 'Volume 1',
      title: 'O que é crédito de carbono?',
      cover: '/images/cartilhas/vol1.jpg',
    })
```

Append these blocks at the end of the file:

```ts
const WITH_PUBLICATION_FIELDS = {
  cartilhaCollection: {
    items: [
      {
        slug: 'cartilha-5-certificacao',
        volume: 'Volume 5',
        title: 'Certificação participativa',
        description: 'Uma cartilha sobre certificação.',
        publicationDate: '2025-05-14T00:00:00.000Z',
        cover: { url: 'https://images.ctfassets.net/vol5.jpg' },
        pdf: { url: 'https://assets.ctfassets.net/vol5.pdf', fileName: 'cartilha-5.pdf' },
      },
      {
        slug: null,
        volume: 'Volume 6',
        title: 'Sem endereço ainda',
        description: null,
        publicationDate: null,
        cover: { url: 'https://images.ctfassets.net/vol6.jpg' },
        pdf: null,
      },
    ],
  },
  cadernoCollection: {
    items: [
      {
        slug: 'caderno-2027',
        title: 'Caderno 2027',
        description: 'Segunda edição do caderno temático.',
        publicationDate: null,
        cover: { url: 'https://images.ctfassets.net/caderno2027.jpg' },
        pdf: null,
      },
    ],
  },
  fotoFormacaoCollection: PUBLISHED.fotoFormacaoCollection,
}

describe('publication fields', () => {
  it('maps the address, the date, the description and the file name', async () => {
    const content = await getComunicacaoContent(clientReturning(WITH_PUBLICATION_FIELDS))

    expect(content.cartilhas[0]).toEqual({
      slug: 'cartilha-5-certificacao',
      volume: 'Volume 5',
      title: 'Certificação participativa',
      description: 'Uma cartilha sobre certificação.',
      publicationDate: '2025-05-14T00:00:00.000Z',
      cover: 'https://images.ctfassets.net/vol5.jpg',
      pdf: 'https://assets.ctfassets.net/vol5.pdf',
      pdfFileName: 'cartilha-5.pdf',
    })
    expect(content.caderno.slug).toBe('caderno-2027')
    expect(content.caderno.publicationDate).toBeUndefined()
  })

  it('keeps an entry without an address listed, with no slug', async () => {
    const content = await getComunicacaoContent(clientReturning(WITH_PUBLICATION_FIELDS))

    expect(content.cartilhas.map((c) => c.volume)).toEqual(['Volume 5', 'Volume 6'])
    expect(content.cartilhas[1].slug).toBeUndefined()
  })

  it('selects the new fields in the query', async () => {
    const queries: string[] = []
    await getComunicacaoContent(clientReturning(WITH_PUBLICATION_FIELDS, queries))

    expect(queries[0]).toContain('slug')
    expect(queries[0]).toContain('publicationDate')
    expect(queries[0]).toContain('pdf { url fileName }')
  })
})

describe('listPublicacoes publication fields', () => {
  it('gives a cartilha without a description the series copy', () => {
    const lista = listPublicacoes({
      caderno: { title: 'Caderno', description: 'Resumo', cover: '/c.jpg' },
      cartilhas: [{ volume: 'Volume 1', title: 'Um', cover: '/1.jpg' }],
      fotosFormacao: [],
    })

    expect(lista.map((p) => p.description)).toEqual(['Resumo', DESCRICAO_CARTILHA])
  })

  it('ships a unique address for every default publication', async () => {
    const lista = listPublicacoes(await getComunicacaoContent(null))
    const slugs = lista.map((p) => p.slug)

    expect(slugs.every(Boolean)).toBe(true)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
```

- [ ] **Step 2: Write the failing provisioning tests**

In `tests/scripts/contentfulProvision.test.ts`, change the first import line to:

```ts
import { CONTENT_TYPES, toCmaField } from '@/scripts/contentful-provision.mjs'
```

and append inside the `describe('the provisioned content model', …)` block:

```ts
  it('gives both publication types an address, a date and a description', () => {
    for (const contentTypeId of ['cartilha', 'caderno']) {
      expect(fieldIds(contentTypeId)).toEqual(
        expect.arrayContaining(['slug', 'publicationDate', 'description']),
      )
    }
  })

  it('makes the address required and unique', () => {
    for (const contentTypeId of ['cartilha', 'caderno']) {
      const slug = CONTENT_TYPES.find((c) => c.id === contentTypeId)?.fields.find((f) => f.id === 'slug')

      expect(slug).toMatchObject({ type: 'Symbol', required: true, unique: true })
      expect(toCmaField(slug).validations).toContainEqual({ unique: true })
    }
  })
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `CONTENTFUL_SPACE_ID= npx vitest run tests/lib/comunicacaoContent.test.ts tests/scripts/contentfulProvision.test.ts`
Expected: FAIL. `DESCRICAO_CARTILHA` and `toCmaField` are not exported, and the slug and field assertions fail.

- [ ] **Step 4: Extend the content module**

In `lib/content/comunicacao.ts`, replace the `Cartilha` and `Caderno` types:

```ts
// `slug` is the publication's address, /comunicacao/<slug>; an entry without
// one is listed but has no page. `publicationDate` is Contentful's ISO string
// for a Date field. `pdfFileName` is the asset's own file name, for the
// reader's download.
export type Cartilha = {
  slug?: string
  volume: string
  title: string
  description?: string
  publicationDate?: string
  cover: string
  pdf?: string
  pdfFileName?: string
}

export type Caderno = {
  slug?: string
  title: string
  description: string
  publicationDate?: string
  cover: string
  pdf?: string
  pdfFileName?: string
}
```

In `DEFAULT_CARTILHAS`, give each entry its `slug` as the first property, in this order: `'cartilha-1-o-que-e-credito-de-carbono'`, `'cartilha-2-como-funciona-o-mercado-de-carbono'`, `'cartilha-3-a-caatinga-e-o-carbono'`, `'cartilha-4-desafios-e-caminhos'`. Example for the first:

```ts
  {
    slug: 'cartilha-1-o-que-e-credito-de-carbono',
    volume: 'Volume 1',
    title: 'O que é crédito de carbono?',
    cover: '/images/cartilhas/vol1.jpg',
  },
```

In `DEFAULT_CADERNO`, add `slug: 'caderno-mercado-de-carbono-florestal-na-caatinga',` as its first property.

Right after `DEFAULT_CADERNO`, add:

```ts
// The cartilha series' own copy, from the landing card's hover state (Figma
// 18916:9437). A cartilha whose entry has no description of its own shows
// this; it describes the series rather than any one volume.
export const DESCRICAO_CARTILHA =
  'Uma cartilha introdutória, em linguagem simples, para comunidades e demais interessados em conhecer o tema.'
```

Replace `type ContentfulAsset` and the two publication collections in `ContentfulEntries`:

```ts
type ContentfulAsset = { url?: string | null; fileName?: string | null } | null

type ContentfulEntries = {
  cartilhaCollection?: {
    items: Array<{
      slug?: string | null
      volume?: string | null
      title?: string | null
      description?: string | null
      publicationDate?: string | null
      cover?: ContentfulAsset
      pdf?: ContentfulAsset
    } | null>
  } | null
  cadernoCollection?: {
    items: Array<{
      slug?: string | null
      title?: string | null
      description?: string | null
      publicationDate?: string | null
      cover?: ContentfulAsset
      pdf?: ContentfulAsset
    } | null>
  } | null
```

(leave `fotoFormacaoCollection` as it is).

Replace the two publication blocks of `COMUNICACAO_QUERY`. The fields keep the 8-space indent that `tests/scripts/contentfulProvision.test.ts` parses:

```ts
    cartilhaCollection(order: order_ASC, preview: $preview) {
      items {
        slug
        volume
        title
        description
        publicationDate
        cover { url }
        pdf { url fileName }
      }
    }
    cadernoCollection(limit: 1, preview: $preview) {
      items {
        slug
        title
        description
        publicationDate
        cover { url }
        pdf { url fileName }
      }
    }
```

After `assetUrl`, add:

```ts
// Contentful answers an unset field with null; the page types use undefined.
function optional(value?: string | null): string | undefined {
  return value || undefined
}
```

Replace the returns of `mapCartilhas` and `mapCaderno`:

```ts
    return [
      {
        slug: optional(item.slug),
        volume: item.volume,
        title: item.title,
        description: optional(item.description),
        publicationDate: optional(item.publicationDate),
        cover,
        pdf: assetUrl(item.pdf),
        pdfFileName: optional(item.pdf?.fileName),
      },
    ]
```

```ts
  return {
    slug: optional(item.slug),
    title: item.title,
    description: item.description,
    publicationDate: optional(item.publicationDate),
    cover,
    pdf: assetUrl(item.pdf),
    pdfFileName: optional(item.pdf?.fileName),
  }
```

Replace `Publicacao` and `listPublicacoes`:

```ts
// One publication, for the Comunicação page's grid (Figma 18978:2074), the
// landing's cards and the publication page (19015:13056).
export type Publicacao = {
  key: string
  slug?: string
  tipo: 'Caderno temático' | 'Cartilha'
  title: string
  description: string
  publicationDate?: string
  cover: string
  pdf?: string
  pdfFileName?: string
}

// Every publication, for the Comunicação page: the caderno first, as the
// landing's section shows it, then the cartilhas in the order the editor set
// in Contentful (COMUNICACAO_QUERY sorts by `order`). The design's own grid is
// five placeholder cards; the order is still an open question to the content
// owner (issue #44, question 4).
export function listPublicacoes(conteudo: ComunicacaoContent): Publicacao[] {
  const { caderno, cartilhas } = conteudo

  return [
    {
      key: 'caderno',
      slug: caderno.slug,
      tipo: 'Caderno temático',
      title: caderno.title,
      description: caderno.description,
      publicationDate: caderno.publicationDate,
      cover: caderno.cover,
      pdf: caderno.pdf,
      pdfFileName: caderno.pdfFileName,
    },
    ...cartilhas.map(
      (c, i): Publicacao => ({
        key: `cartilha-${i}`,
        slug: c.slug,
        tipo: 'Cartilha',
        title: c.title,
        description: c.description ?? DESCRICAO_CARTILHA,
        publicationDate: c.publicationDate,
        cover: c.cover,
        pdf: c.pdf,
        pdfFileName: c.pdfFileName,
      }),
    ),
  ]
}
```

- [ ] **Step 5: Move the series copy out of the landing component**

In `components/marketing/Comunicacao.tsx`, delete the local `DESCRICAO_CARTILHA` constant and the comment block above it (the one beginning "The hover state (Figma 18916:9437) reveals a description…"). Change the content-module import to:

```ts
import { DESCRICAO_CARTILHA, type ComunicacaoContent } from "@/lib/content/comunicacao";
```

and the cartilha card's description to:

```ts
            description: primeiraCartilha.description ?? DESCRICAO_CARTILHA,
```

- [ ] **Step 6: Provision the new fields**

In `scripts/contentful-provision.mjs`, give the `cartilha` content type these `fields` (the order is what the editor sees):

```js
    fields: [
      { id: 'volume', name: 'Volume', type: 'Symbol', required: true },
      { id: 'title', name: 'Título', type: 'Symbol', required: true },
      { id: 'slug', name: 'Endereço', type: 'Symbol', required: true, unique: true },
      { id: 'description', name: 'Descrição', type: 'Text', required: false },
      { id: 'publicationDate', name: 'Data de publicação', type: 'Date', required: false },
      { id: 'cover', name: 'Capa', type: 'Link', linkType: 'Asset', required: true, image: true },
      { id: 'pdf', name: 'PDF', type: 'Link', linkType: 'Asset', required: false, pdf: true },
      { id: 'order', name: 'Ordem', type: 'Integer', required: true },
    ],
```

and the `caderno` content type these:

```js
    fields: [
      { id: 'title', name: 'Título', type: 'Symbol', required: true },
      { id: 'slug', name: 'Endereço', type: 'Symbol', required: true, unique: true },
      { id: 'description', name: 'Descrição', type: 'Text', required: true },
      { id: 'publicationDate', name: 'Data de publicação', type: 'Date', required: false },
      { id: 'cover', name: 'Capa', type: 'Link', linkType: 'Asset', required: true, image: true },
      { id: 'pdf', name: 'PDF', type: 'Link', linkType: 'Asset', required: false, pdf: true },
    ],
```

Export `toCmaField` and add the unique validation:

```js
export function toCmaField(field) {
  const validations = []
  if (field.image) validations.push({ linkMimetypeGroup: ['image'] })
  if (field.pdf) validations.push({ linkMimetypeGroup: ['pdfdocument'] })
  // A publication's address is its URL. Contentful enforces this per content
  // type only, so a cartilha and the caderno can still clash
  // (lib/content/comunicacao.ts, findPublicacao).
  if (field.unique) validations.push({ unique: true })
```

(the rest of the function stays).

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `CONTENTFUL_SPACE_ID= npx vitest run`
Expected: PASS for the whole suite, with the live-space file skipped.

- [ ] **Step 8: Commit**

```bash
git add lib/content/comunicacao.ts scripts/contentful-provision.mjs components/marketing/Comunicacao.tsx tests/lib/comunicacaoContent.test.ts tests/scripts/contentfulProvision.test.ts
git commit -m "feat: give Comunicação publications an address, a date and a description"
```

---

### Task 2: Look up a publication, its related ones and its date

**Files:**
- Modify: `lib/content/comunicacao.ts`
- Test: `tests/lib/comunicacaoContent.test.ts`

**Interfaces:**
- Consumes: `Publicacao`, `listPublicacoes`, `ComunicacaoContent` (Task 1).
- Produces:
  - `findPublicacao(conteudo: ComunicacaoContent, slug: string): Publicacao | null`
  - `MAX_RELACIONADOS = 5`
  - `relatedPublicacoes(conteudo: ComunicacaoContent, slug: string): Publicacao[]`
  - `formatPublicationDate(value?: string | null): string | null`

- [ ] **Step 1: Write the failing tests**

Add `findPublicacao`, `formatPublicationDate` and `relatedPublicacoes` to the import from `@/lib/content/comunicacao` in `tests/lib/comunicacaoContent.test.ts`, then append:

```ts
describe('findPublicacao', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const conteudo = {
    caderno: { slug: 'caderno', title: 'Caderno', description: 'Resumo', cover: '/c.jpg' },
    cartilhas: [
      { slug: 'um', volume: 'Volume 1', title: 'Um', cover: '/1.jpg' },
      { slug: 'dois', volume: 'Volume 2', title: 'Dois', cover: '/2.jpg' },
    ],
    fotosFormacao: [],
  }

  it('finds a publication by its address', () => {
    expect(findPublicacao(conteudo, 'dois')?.title).toBe('Dois')
  })

  it('returns null for an unknown address', () => {
    expect(findPublicacao(conteudo, 'tres')).toBeNull()
  })

  it('takes the first of two publications sharing an address, and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const clash = { ...conteudo, cartilhas: [{ ...conteudo.cartilhas[0], slug: 'caderno' }] }

    expect(findPublicacao(clash, 'caderno')?.tipo).toBe('Caderno temático')
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('relatedPublicacoes', () => {
  const cartilhas = Array.from({ length: 6 }, (_, i) => ({
    slug: `c${i + 1}`,
    volume: `Volume ${i + 1}`,
    title: `Cartilha ${i + 1}`,
    cover: `/${i + 1}.jpg`,
  }))
  const conteudo = {
    caderno: { slug: 'caderno', title: 'Caderno', description: 'Resumo', cover: '/c.jpg' },
    cartilhas,
    fotosFormacao: [],
  }

  it('lists the other publications in list order', () => {
    const small = { ...conteudo, cartilhas: cartilhas.slice(0, 2) }
    expect(relatedPublicacoes(small, 'c1').map((p) => p.slug)).toEqual(['caderno', 'c2'])
  })

  it('stops at five', () => {
    expect(relatedPublicacoes(conteudo, 'caderno').map((p) => p.slug)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5'])
  })
})

describe('formatPublicationDate', () => {
  it('prints a date as the design does', () => {
    expect(formatPublicationDate('2025-05-14')).toBe('14/05/25')
  })

  it('keeps the calendar day of a midnight-UTC value', () => {
    expect(formatPublicationDate('2025-05-14T00:00:00.000Z')).toBe('14/05/25')
  })

  it('keeps the day an editor wrote with an offset', () => {
    expect(formatPublicationDate('2025-05-14T23:00:00-03:00')).toBe('14/05/25')
  })

  it('omits a missing or malformed value', () => {
    expect(formatPublicationDate(undefined)).toBeNull()
    expect(formatPublicationDate('')).toBeNull()
    expect(formatPublicationDate('banana')).toBeNull()
    expect(formatPublicationDate('2025-13-40')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `CONTENTFUL_SPACE_ID= npx vitest run tests/lib/comunicacaoContent.test.ts`
Expected: FAIL, because `findPublicacao`, `relatedPublicacoes` and `formatPublicationDate` are not exported.

- [ ] **Step 3: Implement**

Append to `lib/content/comunicacao.ts`:

```ts
// The publication a /comunicacao/<slug> page shows. Contentful keeps an
// address unique within one content type only, so a cartilha and the caderno
// could share one: the first in list order wins, and the clash is logged for
// the editor to fix (tests/lib/contentfulSpace.test.ts fails on it too).
export function findPublicacao(conteudo: ComunicacaoContent, slug: string): Publicacao | null {
  const matches = listPublicacoes(conteudo).filter((p) => p.slug === slug)

  if (matches.length > 1) {
    console.warn(
      JSON.stringify({ event: 'comunicacao_duplicate_slug', slug, keys: matches.map((p) => p.key) }),
    )
  }

  return matches[0] ?? null
}

// "Conteúdos Relacionados" (Figma 19015:13091) holds a row of five cards.
export const MAX_RELACIONADOS = 5

// Every other publication, in list order, up to the row's five.
export function relatedPublicacoes(conteudo: ComunicacaoContent, slug: string): Publicacao[] {
  const lista = listPublicacoes(conteudo)
  const atual = lista.find((p) => p.slug === slug)

  return lista.filter((p) => p !== atual).slice(0, MAX_RELACIONADOS)
}

// "Publicado em: 14/05/25" (Figma 19015:13064). Contentful answers a Date field
// as an ISO string, "2025-05-14T00:00:00.000Z" for a date with no time. The
// calendar date is read off the string rather than through Date: formatted in
// the Northeast's UTC-3, midnight UTC would print the day before (the spec's
// "formatted in UTC" guards the same thing), and a value written with its own
// offset keeps the day the editor chose.
export function formatPublicationDate(value?: string | null): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null

  const [, year, month, day] = match
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null

  return `${day}/${month}/${year.slice(2)}`
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `CONTENTFUL_SPACE_ID= npx vitest run tests/lib/comunicacaoContent.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/content/comunicacao.ts tests/lib/comunicacaoContent.test.ts
git commit -m "feat: look up a publication, its related ones and its date"
```

---

### Task 3: Reader controls logic

**Files:**
- Create: `lib/marketing/pdfViewerControls.ts`
- Test: `tests/lib/pdfViewerControls.test.ts`

**Interfaces:**
- Produces:
  - `ZOOM_STEPS: readonly number[]` = `[0.5, 0.75, 1, 1.25, 1.5, 2, 3]`
  - `nextZoomStep(current: number, direction: 1 | -1): number | null`
  - `parsePageInput(value: string, pageCount: number): number | null`
  - `formatZoom(scale: number): string`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/pdfViewerControls.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatZoom, nextZoomStep, parsePageInput } from '@/lib/marketing/pdfViewerControls'

describe('nextZoomStep', () => {
  it('moves one step up and down from a step', () => {
    expect(nextZoomStep(0.75, 1)).toBe(1)
    expect(nextZoomStep(0.75, -1)).toBe(0.5)
  })

  it('moves to the nearest step from an off-step fit', () => {
    expect(nextZoomStep(0.95, 1)).toBe(1)
    expect(nextZoomStep(0.95, -1)).toBe(0.75)
  })

  it('treats a float a hair off a step as that step', () => {
    expect(nextZoomStep(0.7500001, 1)).toBe(1)
    expect(nextZoomStep(0.7499999, -1)).toBe(0.5)
  })

  it('stops at the ends of the range', () => {
    expect(nextZoomStep(0.5, -1)).toBeNull()
    expect(nextZoomStep(3, 1)).toBeNull()
  })

  it('comes back into the range from outside it', () => {
    expect(nextZoomStep(0.3, 1)).toBe(0.5)
    expect(nextZoomStep(4, -1)).toBe(3)
  })
})

describe('parsePageInput', () => {
  it('accepts a page within the document', () => {
    expect(parsePageInput('10', 20)).toBe(10)
    expect(parsePageInput(' 3 ', 20)).toBe(3)
  })

  it('rejects anything else', () => {
    for (const value of ['0', '21', '999', 'abc', '', '2.5', '1e1', '-1']) {
      expect(parsePageInput(value, 20), value).toBeNull()
    }
  })
})

describe('formatZoom', () => {
  it('rounds to a whole percentage', () => {
    expect(formatZoom(0.9512)).toBe('95%')
    expect(formatZoom(0.75)).toBe('75%')
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `CONTENTFUL_SPACE_ID= npx vitest run tests/lib/pdfViewerControls.test.ts`
Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement**

Create `lib/marketing/pdfViewerControls.ts`:

```ts
// Pure logic behind the publication reader's toolbar (Figma 19015:13073),
// kept out of the client component so it can be tested without a DOM.

// The zoom steps. pdf.js's own increaseScale() moves 75% -> 90%, off the round
// percentages the toolbar's field shows.
export const ZOOM_STEPS: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

// Float scales that pdf.js computes land a hair off a step; within this, they
// count as on it.
const EPSILON = 1e-3

// The next step strictly above (1) or below (-1) `current`, or null at the end
// of the range. `current` may sit between steps: the reader opens at
// `page-fit`, around 0.95, and "+" from there goes to 1, not to 1.25.
export function nextZoomStep(current: number, direction: 1 | -1): number | null {
  if (direction === 1) return ZOOM_STEPS.find((step) => step > current + EPSILON) ?? null

  return [...ZOOM_STEPS].reverse().find((step) => step < current - EPSILON) ?? null
}

// The page field: a whole page number within the document, or null, in which
// case the field shows the current page again.
export function parsePageInput(value: string, pageCount: number): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null

  const page = Number(trimmed)
  return page >= 1 && page <= pageCount ? page : null
}

export function formatZoom(scale: number): string {
  return `${Math.round(scale * 100)}%`
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `CONTENTFUL_SPACE_ID= npx vitest run tests/lib/pdfViewerControls.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/marketing/pdfViewerControls.ts tests/lib/pdfViewerControls.test.ts
git commit -m "feat: add the zoom steps and page parsing of the publication reader"
```

---

### Task 4: The publication route, its header and the no-PDF reader

**Files:**
- Create: `lib/marketing/backNavigation.ts`
- Create: `components/marketing/conteudo/BackButton.tsx`
- Create: `components/marketing/conteudo/ConteudoHeader.tsx`, `components/marketing/conteudo/ConteudoHeader.module.css`
- Create: `components/marketing/conteudo/Leitor.module.css`
- Create: `components/marketing/conteudo/ConteudoSemPdf.tsx`
- Create: `app/(marketing)/comunicacao/[slug]/page.tsx`, `app/(marketing)/comunicacao/[slug]/page.module.css`
- Create: `public/icons/conteudo/arrow-back.svg`, `public/icons/conteudo/download.svg`
- Modify: `proxy.ts`
- Test: `tests/lib/backNavigation.test.ts`, `tests/components/conteudo.test.ts`, `tests/proxy.test.ts`, `tests/lib/marketingPalette.test.ts`

**Interfaces:**
- Consumes: `Publicacao`, `findPublicacao`, `formatPublicationDate`, `getComunicacaoContent` (Tasks 1–2), `getContentfulClient` (`lib/contentful.ts`).
- Produces:
  - `shouldStepBack(context: { initialUrl: string | null; currentUrl: string; referrer: string; historyLength: number }): boolean`
  - `<ConteudoHeader publicacao={Publicacao} />`
  - `<ConteudoSemPdf publicacao={Publicacao} />`
  - `Leitor.module.css` classes used again by Task 6: `frame`, `toolbar`, `titleOnly`, `title`, `area`, `still`, `cover`, `status`.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/backNavigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { shouldStepBack } from '@/lib/marketing/backNavigation'

const PAGE = 'https://caativar.test/comunicacao/cartilha-1-o-que-e-credito-de-carbono'

describe('shouldStepBack', () => {
  it('steps back after a navigation within the site', () => {
    expect(shouldStepBack({ initialUrl: 'https://caativar.test/', currentUrl: PAGE, referrer: '', historyLength: 3 })).toBe(true)
  })

  it('steps back to a page of this site that loaded this one', () => {
    expect(shouldStepBack({ initialUrl: PAGE, currentUrl: PAGE, referrer: 'https://caativar.test/mapa', historyLength: 2 })).toBe(true)
  })

  it('stays on the link for a direct visit', () => {
    expect(shouldStepBack({ initialUrl: PAGE, currentUrl: PAGE, referrer: '', historyLength: 1 })).toBe(false)
    expect(shouldStepBack({ initialUrl: PAGE, currentUrl: PAGE, referrer: '', historyLength: 4 })).toBe(false)
  })

  it('stays on the link when an external page sent the visitor', () => {
    expect(shouldStepBack({ initialUrl: PAGE, currentUrl: PAGE, referrer: 'https://www.google.com/', historyLength: 2 })).toBe(false)
  })

  it('stays on the link after the login redirect, which replaced its own entry', () => {
    expect(shouldStepBack({ initialUrl: PAGE, currentUrl: PAGE, referrer: 'https://caativar.test/login?next=%2F', historyLength: 2 })).toBe(false)
    expect(shouldStepBack({ initialUrl: 'https://caativar.test/login', currentUrl: PAGE, referrer: '', historyLength: 2 })).toBe(false)
  })

  it('stays on the link when the referrer cannot be read', () => {
    expect(shouldStepBack({ initialUrl: PAGE, currentUrl: PAGE, referrer: 'not a url', historyLength: 2 })).toBe(false)
  })
})
```

Create `tests/components/conteudo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ConteudoHeader from '@/components/marketing/conteudo/ConteudoHeader'
import ConteudoSemPdf from '@/components/marketing/conteudo/ConteudoSemPdf'
import type { Publicacao } from '@/lib/content/comunicacao'

const html = <P extends object>(component: ComponentType<P>, props: P) =>
  renderToStaticMarkup(createElement(component, props))

const PUBLICACAO: Publicacao = {
  key: 'cartilha-0',
  slug: 'cartilha-1-o-que-e-credito-de-carbono',
  tipo: 'Cartilha',
  title: 'O que é crédito de carbono?',
  description: 'Uma cartilha introdutória.',
  publicationDate: '2025-05-14T00:00:00.000Z',
  cover: '/images/cartilhas/vol1.jpg',
}

describe('ConteudoHeader', () => {
  it('renders the title as the page heading, the description and Voltar', () => {
    const markup = html(ConteudoHeader, { publicacao: PUBLICACAO })

    expect(markup).toMatch(/<h1[^>]*>O que é crédito de carbono\?<\/h1>/)
    expect(markup).toContain('Uma cartilha introdutória.')
    expect(markup).toMatch(/<a[^>]*href="\/comunicacao"[^>]*>.*Voltar<\/a>/)
  })

  it('shows the publication date only when there is one', () => {
    // Case-insensitive: whether React prints the attribute as dateTime or
    // datetime is its business, and HTML does not care.
    expect(html(ConteudoHeader, { publicacao: PUBLICACAO })).toMatch(
      /Publicado em: <time datetime="2025-05-14">14\/05\/25<\/time>/i,
    )
    expect(html(ConteudoHeader, { publicacao: { ...PUBLICACAO, publicationDate: undefined } })).not.toContain(
      'Publicado em',
    )
  })

  it('offers the mobile download only when there is a PDF', () => {
    expect(html(ConteudoHeader, { publicacao: PUBLICACAO })).not.toContain('Baixar PDF')
    expect(html(ConteudoHeader, { publicacao: { ...PUBLICACAO, pdf: 'https://assets.ctfassets.net/v1.pdf' } })).toMatch(
      /<a[^>]*href="https:\/\/assets\.ctfassets\.net\/v1\.pdf"[^>]*>.*Baixar PDF<\/a>/,
    )
  })
})

describe('ConteudoSemPdf', () => {
  it('shows the title and the cover, with nothing to download', () => {
    const markup = html(ConteudoSemPdf, { publicacao: PUBLICACAO })

    expect(markup).toContain('O que é crédito de carbono?')
    expect(markup).toContain('src="/images/cartilhas/vol1.jpg"')
    expect(markup).not.toContain('Baixar PDF')
  })
})
```

In `tests/proxy.test.ts`, extend the list in "runs on every marketing page":

```ts
    for (const url of ['/', '/comunicacao', '/comunicacao/cartilha-1-o-que-e-credito-de-carbono', ...SOBRE_PAGES.map((p) => p.href)]) {
```

In `tests/lib/marketingPalette.test.ts`, append to `PAIRS`, just before its closing `]`:

```ts
  // Publication page (Figma 19015:13056): "Voltar" on the page, the reader's
  // toolbar title and page count on --am-050, and its loading/error text on
  // the --am-200 frame.
  ['--role-categorica1-padrao', '--bg-fundo'],
  ['--bg-texto-primario', '--am-050'],
  ['--bg-texto-primario', '--am-200'],
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `CONTENTFUL_SPACE_ID= npx vitest run tests/lib/backNavigation.test.ts tests/components/conteudo.test.ts tests/proxy.test.ts tests/lib/marketingPalette.test.ts`
Expected: FAIL. The backNavigation and conteudo modules don't exist, and the proxy doesn't match `/comunicacao/<slug>`. The palette test already passes, since the three pairs measure 5.70, 15.80 and 10.42:1.

- [ ] **Step 3: Implement the "Voltar" decision**

Create `lib/marketing/backNavigation.ts`:

```ts
// Whether the publication page's "Voltar" should step back through history
// (returning the visitor where they were, with its scroll position) instead of
// following its link to /comunicacao. Pure, so it is tested without a browser;
// BackButton.tsx feeds it the live values.
export type ArrivalContext = {
  // The URL of the document the browser first loaded in this tab session
  // (performance's navigation entry), which soft navigations do not replace.
  initialUrl: string | null
  currentUrl: string
  referrer: string
  historyLength: number
}

const LOGIN_PATH = '/login'

function parse(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

export function shouldStepBack({ initialUrl, currentUrl, referrer, historyLength }: ArrivalContext): boolean {
  if (historyLength <= 1) return false

  const current = parse(currentUrl)
  if (!current) return false

  // A soft navigation (next/link) keeps the first document's entry, so its URL
  // differs from the page now shown and the entry before this one is ours.
  // The login page is the exception: it replaces its own entry on the way in.
  if (initialUrl && initialUrl !== currentUrl) {
    return parse(initialUrl)?.pathname !== LOGIN_PATH
  }

  // A full load: history.back() stays on the site only when this origin sent
  // the visitor, and not through the login redirect, whose entry is gone.
  const from = referrer ? parse(referrer) : null
  return from !== null && from.origin === current.origin && from.pathname !== LOGIN_PATH
}
```

- [ ] **Step 4: Add the two icons**

Create `public/icons/conteudo/arrow-back.svg`. This is the Figma "Arrow back" (node `19015:13062`) exported with `get_design_context`, with the Figma-only root attributes and layer ids stripped:

```svg
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_0_63)">
<g>
</g>
<g>
<mask id="path-1-inside-1_0_63" fill="white">
<path d="M13.3333 7.33333H5.22L8.94667 3.60667L8 2.66667L2.66667 8L8 13.3333L8.94 12.3933L5.22 8.66667H13.3333V7.33333Z"/>
</mask>
<path d="M13.3333 7.33333H5.22L8.94667 3.60667L8 2.66667L2.66667 8L8 13.3333L8.94 12.3933L5.22 8.66667H13.3333V7.33333Z" fill="#292829"/>
<path d="M13.3333 7.33333H16V4.66667H13.3333V7.33333ZM5.22 7.33333L3.33438 5.44772L-1.2179 10H5.22V7.33333ZM8.94667 3.60667L10.8323 5.49228L12.7246 3.59999L10.8256 1.7144L8.94667 3.60667ZM8 2.66667L9.87894 0.774397L7.99335 -1.09792L6.11438 0.781049L8 2.66667ZM2.66667 8L0.781049 6.11438L-1.10457 8L0.781049 9.88562L2.66667 8ZM8 13.3333L6.11438 15.219L8 17.1046L9.88562 15.219L8 13.3333ZM8.94 12.3933L10.8256 14.279L12.7095 12.395L10.8273 10.5094L8.94 12.3933ZM5.22 8.66667V6H-1.20976L3.33269 10.5506L5.22 8.66667ZM13.3333 8.66667V11.3333H16V8.66667H13.3333ZM13.3333 7.33333V4.66667H5.22V7.33333V10H13.3333V7.33333ZM5.22 7.33333L7.10562 9.21895L10.8323 5.49228L8.94667 3.60667L7.06105 1.72105L3.33438 5.44772L5.22 7.33333ZM8.94667 3.60667L10.8256 1.7144L9.87894 0.774397L8 2.66667L6.12106 4.55894L7.06772 5.49894L8.94667 3.60667ZM8 2.66667L6.11438 0.781049L0.781049 6.11438L2.66667 8L4.55228 9.88562L9.88562 4.55228L8 2.66667ZM2.66667 8L0.781049 9.88562L6.11438 15.219L8 13.3333L9.88562 11.4477L4.55228 6.11438L2.66667 8ZM8 13.3333L9.88562 15.219L10.8256 14.279L8.94 12.3933L7.05438 10.5077L6.11438 11.4477L8 13.3333ZM8.94 12.3933L10.8273 10.5094L7.10731 6.78274L5.22 8.66667L3.33269 10.5506L7.05269 14.2773L8.94 12.3933ZM5.22 8.66667V11.3333H13.3333V8.66667V6H5.22V8.66667ZM13.3333 8.66667H16V7.33333H13.3333H10.6667V8.66667H13.3333Z" fill="#27725B" mask="url(#path-1-inside-1_0_63)"/>
</g>
</g>
<defs>
<clipPath id="clip0_0_63">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>
```

Create `public/icons/conteudo/download.svg`. The "File download" icon sits inside "Baixar PDF" (node `19015:13089`), and `get_design_context` returns the component's default envelope for it instead of the instance's swapped icon. This file is therefore the icon's path from `download_assets` on the whole button as SVG, cropped with a viewBox to its 16×16 slot at (16, 12):

```svg
<svg width="16" height="16" viewBox="16 12 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M19.667 22.3336V24.3336H28.334V22.3336H29V23.9996C29 24.5489 28.5492 24.9996 28 24.9996H20C19.4509 24.9995 19 24.5488 19 23.9996V22.3336H19.667ZM24.334 14.9996V20.9156L24.9023 20.3492L26.3926 18.8639L26.8613 19.3326L24 22.1949L21.1377 19.3326L21.6064 18.8639L23.0986 20.3492L23.667 20.9156V14.9996H24.334Z" fill="#001D27" stroke="white" stroke-width="0.666667"/>
</svg>
```

- [ ] **Step 5: Implement the header**

Create `components/marketing/conteudo/BackButton.tsx`:

```tsx
"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { shouldStepBack } from "@/lib/marketing/backNavigation";
import styles from "./ConteudoHeader.module.css";

// "Voltar", Figma node 19015:13061. A link to the listing, so it works before
// hydration and without JavaScript. When the visitor came from another page of
// this site, the click steps back through history instead and returns them
// where they were; arriving from outside, or through the login redirect,
// history.back() would leave the site, so the link stands (shouldStepBack).
// window.history rather than useRouter(): router.back() does the same, and a
// hook would tie this to a mounted App Router, which the markup tests lack.
export default function BackButton() {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    // A modified click (new tab, new window) keeps the link's own behaviour.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const [entry] = performance.getEntriesByType("navigation");
    const stepBack = shouldStepBack({
      initialUrl: entry?.name ?? null,
      currentUrl: window.location.href,
      referrer: document.referrer,
      historyLength: window.history.length,
    });
    if (!stepBack) return;

    event.preventDefault();
    window.history.back();
  }

  return (
    <Link href="/comunicacao" className={`${styles.back} text-body`} onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
      <img src="/icons/conteudo/arrow-back.svg" alt="" width={16} height={16} />
      Voltar
    </Link>
  );
}
```

Create `components/marketing/conteudo/ConteudoHeader.tsx`:

```tsx
import { formatPublicationDate, type Publicacao } from "@/lib/content/comunicacao";
import BackButton from "./BackButton";
import styles from "./ConteudoHeader.module.css";

// The head of a publication page, Figma node 19015:13059: "Voltar" and the
// publication date on one row (19015:13060), the title (19015:13065) and the
// description (19015:13067). Below 768px it also carries "Baixar PDF", which
// the reader's toolbar drops at that width: a plain link to the file, since a
// phone browser hands a PDF to its own viewer or downloads it (spec §5.4).
// A <div>, not a <header>: tests/lib/marketingNav.test.ts reads wrapper
// elements under components/marketing as landing sections.
export default function ConteudoHeader({ publicacao }: { publicacao: Publicacao }) {
  const data = formatPublicationDate(publicacao.publicationDate);

  return (
    <div className={styles.header}>
      <div className={styles.topRow}>
        <BackButton />
        {data && publicacao.publicationDate && (
          <p className={`${styles.date} text-body`}>
            Publicado em: <time dateTime={publicacao.publicationDate.slice(0, 10)}>{data}</time>
          </p>
        )}
      </div>

      <h1 className={`${styles.title} text-h2`}>{publicacao.title}</h1>
      <p className={`${styles.description} text-body`}>{publicacao.description}</p>

      {publicacao.pdf && (
        <a href={publicacao.pdf} target="_blank" rel="noreferrer" className={`${styles.downloadMobile} text-body`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
          <img src="/icons/conteudo/download.svg" alt="" width={16} height={16} />
          Baixar PDF
        </a>
      )}
    </div>
  );
}
```

Create `components/marketing/conteudo/ConteudoHeader.module.css`:

```css
/* The head of a publication page, Figma node 19015:13059: the Voltar/date row
 * (19015:13060), the title and the description, 16px apart. */
.header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.topRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

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
}

.back:hover,
.back:focus-visible {
  background: var(--am-100);
}

/* The design colours the date --foreground (#292829), which has no token;
 * --bg-texto-primario is the nearest (PublicationCard.module.css makes the
 * same substitution for its titles). */
.date {
  margin: 0;
  color: var(--bg-texto-primario);
  white-space: nowrap;
}

/* 4.81:1 on --bg-fundo. */
.title {
  margin: 0;
  color: var(--role-marca-ancora-padrao);
}

.description {
  margin: 0;
  color: var(--bg-texto-primario);
}

/* Shown only below 768px, where the reader's toolbar drops its own button. */
.downloadMobile {
  display: none;
}

@media (max-width: 767px) {
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

  .downloadMobile:hover,
  .downloadMobile:focus-visible {
    background: var(--role-marca-ancora-hover);
  }
}

@media (prefers-reduced-motion: reduce) {
  .back {
    transition: none;
  }
}
```

- [ ] **Step 6: Implement the reader frame and the no-PDF state**

Create `components/marketing/conteudo/Leitor.module.css`:

```css
/* The reader, Figma node 19015:13068: an --am-200 frame (#bfcace) with the
 * toolbar (19015:13069) over the reading area. PdfViewer, its loading
 * skeleton (LeitorCarregando) and the no-PDF state (ConteudoSemPdf) all build
 * on it, so the three hold the same footprint and none reflows into another. */
.frame {
  display: flex;
  flex-direction: column;
  background: var(--am-200);
}

/* 72px: 16px of block padding around the 40px controls, on --am-050, the
 * bottom corners rounded 8px. The title takes the design's 351px at most, and
 * space-between puts the controls where the design places them. */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 72px;
  padding: 16px 24px;
  background: var(--am-050);
  border-radius: 0 0 8px 8px;
}

/* Rubik Medium 16/24 comes from .text-p-ui; 15.80:1 on --am-050. */
.title {
  flex: 0 1 351px;
  min-width: 0;
  margin: 0;
  color: var(--bg-texto-primario);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* The design's reading area is 1127px tall. Capped at the viewport minus the
 * site header and the toolbar, so the whole reader fits on screen once
 * scrolled to, and its own scroll never runs taller than the window. */
.area {
  position: relative;
  height: min(1127px, calc(100svh - var(--header-height) - 72px));
}

/* A still page: the cover at the area's full height, centred, where the first
 * page of the PDF would be. */
.still {
  display: flex;
  justify-content: center;
}

.cover {
  height: 100%;
  width: auto;
  max-width: 100%;
  object-fit: contain;
}

/* Loading and error messages over the area; 10.42:1 on --am-200. */
.status {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 24px;
  text-align: center;
  background: var(--am-200);
  color: var(--bg-texto-primario);
}

.frame:fullscreen {
  height: 100dvh;
}

.frame:fullscreen .area {
  flex: 1;
  height: auto;
}

@media (max-width: 767px) {
  /* The title is the h1 just above; the compact toolbar keeps the controls,
   * and wraps rather than overflowing if they ever outgrow 390px. */
  .toolbar {
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    padding: 16px 12px;
  }

  .title,
  .titleOnly {
    display: none;
  }

  .area {
    height: 70svh;
  }
}
```

Create `components/marketing/conteudo/ConteudoSemPdf.tsx`:

```tsx
import type { Publicacao } from "@/lib/content/comunicacao";
import leitor from "./Leitor.module.css";

// The reader with no PDF to read, which is every publication until the files
// are uploaded (spec §1): PdfViewer's frame, a toolbar reduced to the title,
// and the cover where the first page would be. pdf.js is never loaded for it.
// Below 768px the toolbar would hold nothing (the title is the h1 above), so
// `titleOnly` hides it there.
export default function ConteudoSemPdf({ publicacao }: { publicacao: Publicacao }) {
  return (
    <div className={leitor.frame}>
      <div className={`${leitor.toolbar} ${leitor.titleOnly}`}>
        <p className={`${leitor.title} text-p-ui`}>{publicacao.title}</p>
      </div>
      <div className={`${leitor.area} ${leitor.still}`}>
        {/* Empty alt: the cover art restates the title, which is the page's h1. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset or Contentful URL, as in PublicationCard */}
        <img src={publicacao.cover} alt="" className={leitor.cover} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Implement the route and the proxy matcher**

In `proxy.ts`, replace the matcher (`/comunicacao/:path*` also matches `/comunicacao` itself):

```ts
export const config = {
  matcher: ['/', '/sobre/:path*', '/comunicacao/:path*'],
}
```

Create `app/(marketing)/comunicacao/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/marketing/SiteHeader";
import SiteFooter from "@/components/marketing/SiteFooter";
import ConteudoHeader from "@/components/marketing/conteudo/ConteudoHeader";
import ConteudoSemPdf from "@/components/marketing/conteudo/ConteudoSemPdf";
import { findPublicacao, getComunicacaoContent } from "@/lib/content/comunicacao";
import { getContentfulClient } from "@/lib/contentful";
import styles from "./page.module.css";

type Props = { params: Promise<{ slug: string }> };

// One Contentful read per request, shared by generateMetadata and the page:
// the client POSTs, and fetch only dedupes GETs on its own.
const loadConteudo = cache(() => getComunicacaoContent(getContentfulClient()));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const publicacao = findPublicacao(await loadConteudo(), (await params).slug);

  return publicacao ? { title: publicacao.title } : {};
}

// "Ver conteúdo", Figma frame 19015:13056: one publication, its reader and the
// others beside it. Content comes from the same Contentful read as the
// Comunicação page, with the same fallback to the shipped content.
export default async function ConteudoPage({ params }: Props) {
  const { slug } = await params;
  const conteudo = await loadConteudo();
  const publicacao = findPublicacao(conteudo, slug);

  if (!publicacao) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <div className={`container ${styles.inner}`}>
          <ConteudoHeader publicacao={publicacao} />
          <ConteudoSemPdf publicacao={publicacao} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
```

Create `app/(marketing)/comunicacao/[slug]/page.module.css`:

```css
/* "Ver conteúdo", Figma node 19015:13058: 32px of block padding, the head and
 * the reader 16px apart. */
.inner {
  padding-block: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `CONTENTFUL_SPACE_ID= npx vitest run`
Expected: PASS for the whole suite.

- [ ] **Step 9: Check the page in the browser**

Run `CONTENTFUL_SPACE_ID= npx next dev -p 3013` in the background, and open `http://localhost:3013/comunicacao/cartilha-1-o-que-e-credito-de-carbono` as in "Browser Checks".
Expected:
- "Voltar" and the title show, and "Publicado em" is absent (the shipped content has no date).
- The grey reader frame holds the Volume 1 cover.
- `http://localhost:3013/comunicacao/nao-existe` answers 404.
- Stop the server afterwards.

- [ ] **Step 10: Lint and commit**

Run: `npx eslint lib/marketing/backNavigation.ts components/marketing/conteudo "app/(marketing)/comunicacao/[slug]" proxy.ts`
Expected: no errors.

```bash
git add lib/marketing/backNavigation.ts components/marketing/conteudo "app/(marketing)/comunicacao/[slug]" public/icons/conteudo proxy.ts tests/lib/backNavigation.test.ts tests/components/conteudo.test.ts tests/proxy.test.ts tests/lib/marketingPalette.test.ts
git commit -m "feat: add the publication page with its header and the no-PDF reader"
```

---

### Task 5: Cards lead to the publication page, and "Conteúdos Relacionados"

**Files:**
- Create: `components/marketing/conteudo/RelatedContent.tsx`, `components/marketing/conteudo/RelatedContent.module.css`
- Modify: `components/marketing/PublicationCard.tsx`
- Modify: `components/marketing/Comunicacao.tsx`
- Modify: `app/(marketing)/comunicacao/[slug]/page.tsx`
- Test: `tests/components/conteudo.test.ts`

**Interfaces:**
- Consumes: `Publicacao`, `relatedPublicacoes`, `listPublicacoes`, `DEFAULT_*` (Tasks 1–2).
- Produces: `<RelatedContent publicacoes={Publicacao[]} />`. `PublicationCard` links to `/comunicacao/<slug>`, and so does the landing's `ComunicacaoCard`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/conteudo.test.ts` (and add the imports at the top):

```ts
import PublicationCard from '@/components/marketing/PublicationCard'
import Comunicacao from '@/components/marketing/Comunicacao'
import RelatedContent from '@/components/marketing/conteudo/RelatedContent'
import { getComunicacaoContent } from '@/lib/content/comunicacao'
```

```ts
describe('PublicationCard', () => {
  it('leads to the publication page, in the same tab', () => {
    const markup = html(PublicationCard, { publicacao: { ...PUBLICACAO, pdf: 'https://x/v1.pdf' } })

    expect(markup).toContain('href="/comunicacao/cartilha-1-o-que-e-credito-de-carbono"')
    expect(markup).not.toContain('target="_blank"')
    expect(markup).not.toContain('https://x/v1.pdf')
  })

  it('is a link even without a PDF, and badges only a PDF', () => {
    const markup = html(PublicationCard, { publicacao: PUBLICACAO })

    expect(markup).toContain('href="/comunicacao/cartilha-1-o-que-e-credito-de-carbono"')
    expect(markup).not.toContain('>PDF<')
    expect(html(PublicationCard, { publicacao: { ...PUBLICACAO, pdf: 'https://x/v1.pdf' } })).toContain('>PDF<')
  })

  it('is not a link without an address', () => {
    expect(html(PublicationCard, { publicacao: { ...PUBLICACAO, slug: undefined } })).not.toContain('<a')
  })
})

describe('the landing Comunicação cards', () => {
  it('lead to the publication pages', async () => {
    const markup = html(Comunicacao, { conteudo: await getComunicacaoContent(null) })

    expect(markup).toContain('href="/comunicacao/caderno-mercado-de-carbono-florestal-na-caatinga"')
    expect(markup).toContain('href="/comunicacao/cartilha-1-o-que-e-credito-de-carbono"')
    expect(markup).toContain('Ver material')
  })
})

describe('RelatedContent', () => {
  it('lists one card per related publication under its heading', () => {
    const markup = html(RelatedContent, {
      publicacoes: [PUBLICACAO, { ...PUBLICACAO, key: 'cartilha-1', slug: 'dois', title: 'Dois' }],
    })

    expect(markup).toMatch(/<h2[^>]*>Conteúdos Relacionados<\/h2>/)
    expect(markup.match(/<li/g)).toHaveLength(2)
  })

  it('renders nothing when there is nothing related', () => {
    expect(html(RelatedContent, { publicacoes: [] })).toBe('')
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `CONTENTFUL_SPACE_ID= npx vitest run tests/components/conteudo.test.ts`
Expected: FAIL. `RelatedContent` does not exist, and the cards still link to the PDF.

- [ ] **Step 3: Point `PublicationCard` at the page**

In `components/marketing/PublicationCard.tsx`, add `import Link from "next/link";`, destructure `slug` along with the other fields, and replace everything from the "Named from the title alone…" comment to the end of the function:

```tsx
  // Every publication with an address has a page (app/(marketing)/comunicacao/
  // [slug]), which reads the PDF in place when there is one; the card leads
  // there, in the same tab. Named from the title alone, with the type (and the
  // PDF badge, when there is a file) as its description, so a screen reader
  // announces "<title>, link" rather than reading the badge first.
  if (slug) {
    return (
      <li className={styles.card} role="listitem">
        <Link
          href={`/comunicacao/${slug}`}
          className={styles.surface}
          aria-labelledby={titleId}
          aria-describedby={pdf ? `${tipoId} ${pdfId}` : tipoId}
        >
          {content}
        </Link>
      </li>
    );
  }

  // No address yet (spec §3.2): a cover with a caption, not a control.
  return (
    <li className={styles.card} role="listitem">
      <div className={styles.surface}>{content}</div>
    </li>
  );
}
```

The `a.surface:hover` / `a.surface:focus-visible` rules in `PublicationCard.module.css` still apply, since `next/link` renders an `<a>`.

- [ ] **Step 4: Point the landing cards at the page**

In `components/marketing/Comunicacao.tsx`:
- Add `import Link from "next/link";`.
- In `CardData`, replace `pdf?: string;` with `slug?: string;`.
- In both card objects, replace the `pdf:` line with `slug: conteudo.caderno.slug,` and `slug: primeiraCartilha.slug,`.
- In `ComunicacaoCard`, replace `const linked = Boolean(card.pdf);` with `const linked = Boolean(card.slug);`.
- In the linked branch, replace the `<a href={card.pdf} target="_blank" rel="noreferrer" …>` element with:

```tsx
        <Link
          href={`/comunicacao/${card.slug}`}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className={styles.surface}
        >
          {content}
        </Link>
```

- In the component's header comment, change "plus a "Ver material" button when there is a PDF to open" to "plus a "Ver material" button on a card that has a publication page".
- In the CTA comment, change "The card without a PDF is not a control" to "The card without a page is not a control".
- In the last comment, change "No PDF: the card is a photograph with a caption" to "No page: the card is a photograph with a caption".

- [ ] **Step 5: Implement "Conteúdos Relacionados"**

Create `components/marketing/conteudo/RelatedContent.tsx`:

```tsx
import type { Publicacao } from "@/lib/content/comunicacao";
import PublicationCard from "../PublicationCard";
import grid from "../Publicacoes.module.css";
import styles from "./RelatedContent.module.css";

// "Conteúdos Relacionados", Figma node 19015:13091: the heading, then the same
// cards on the same auto-fill grid as the Comunicação page (Publicacoes): five
// 236px tracks at the 1276px container. With four publications the cards keep
// the design's width and the fifth track stays empty, since the grid fills
// tracks rather than stretching cards; narrower, it reflows down to one column.
// The id sits on the heading, not the wrapper (tests/lib/marketingNav.test.ts).
export default function RelatedContent({ publicacoes }: { publicacoes: Publicacao[] }) {
  if (publicacoes.length === 0) return null;

  return (
    <section className={styles.related} aria-labelledby="relacionados-heading">
      <div className={`container ${styles.inner}`}>
        <h2 id="relacionados-heading" className={styles.heading}>
          Conteúdos Relacionados
        </h2>
        <ul className={grid.grid} role="list">
          {publicacoes.map((publicacao) => (
            <PublicationCard key={publicacao.key} publicacao={publicacao} />
          ))}
        </ul>
      </div>
    </section>
  );
}
```

Create `components/marketing/conteudo/RelatedContent.module.css`:

```css
/* Figma node 19015:13091: 32px of block padding, the heading 24px above the
 * row. */
.related {
  background: var(--bg-fundo);
}

.inner {
  padding-block: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

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

In `app/(marketing)/comunicacao/[slug]/page.tsx`:
- Import `RelatedContent` from `@/components/marketing/conteudo/RelatedContent`.
- Add `relatedPublicacoes` to the import from `@/lib/content/comunicacao`.
- Render the row inside `<main>`, after the container `<div>`:

```tsx
        <RelatedContent publicacoes={relatedPublicacoes(conteudo, slug)} />
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `CONTENTFUL_SPACE_ID= npx vitest run`
Expected: PASS for the whole suite.

- [ ] **Step 7: Check in the browser**

With `CONTENTFUL_SPACE_ID= npx next dev -p 3013`, check:
- On `/comunicacao`, each card leads to its page.
- On `/`, both Comunicação cards lead to their pages.
- On a publication page, the related row shows the four other publications at the design's card width, with the fifth track empty.
- "Voltar" returns to where you came from: the landing after arriving from it, the listing after arriving from it.

- [ ] **Step 8: Lint and commit**

Run: `npx eslint components/marketing "app/(marketing)/comunicacao"`
Expected: no errors.

```bash
git add components/marketing/PublicationCard.tsx components/marketing/Comunicacao.tsx components/marketing/conteudo/RelatedContent.tsx components/marketing/conteudo/RelatedContent.module.css "app/(marketing)/comunicacao/[slug]/page.tsx" tests/components/conteudo.test.ts
git commit -m "feat: lead the publication cards to their page and list related ones"
```

---

### Task 6: The PDF reader

**Files:**
- Modify: `package.json`, `package-lock.json` (`pdfjs-dist`)
- Create: `components/marketing/conteudo/PdfViewer.tsx`, `components/marketing/conteudo/PdfViewer.module.css`
- Create: `components/marketing/conteudo/PdfViewerLoader.tsx`, `components/marketing/conteudo/LeitorCarregando.tsx`
- Create: `public/icons/conteudo/zoom-in.svg`, `public/icons/conteudo/zoom-out.svg`, `public/icons/conteudo/fullscreen.svg`
- Modify: `app/(marketing)/comunicacao/[slug]/page.tsx`

**Interfaces:**
- Consumes:
  - `nextZoomStep`, `parsePageInput`, `formatZoom` (Task 3);
  - `Leitor.module.css` classes `frame`, `toolbar`, `title`, `area`, `status` (Task 4);
  - `Publicacao.pdf`, `pdfFileName`, `cover`, `title` (Task 1).
- Produces:
  - `type PdfViewerProps = { url: string; title: string; fileName: string; cover: string }`;
  - `<PdfViewerLoader {...PdfViewerProps} />`.

- [ ] **Step 1: Install pdf.js**

Run: `npm install --no-audit --no-fund pdfjs-dist@^6.3.289`
Expected: `package.json` lists `"pdfjs-dist": "^6.3.289"` under `dependencies`. The version the spike validated (§2.1) is 6.3.289.

- [ ] **Step 2: Add the three toolbar icons**

These are the Figma icons of nodes `I19015:13081;153:2556` (zoom in), `I19015:13085;153:2556` (zoom out) and `I19015:13088;153:2556` (fullscreen), from `get_design_context`, with the root attributes and layer ids stripped.

`public/icons/conteudo/zoom-in.svg`:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g>
<path d="M19.6 21L13.3 14.7C12.8 15.1 12.225 15.4167 11.575 15.65C10.925 15.8833 10.2333 16 9.5 16C7.68333 16 6.146 15.371 4.888 14.113C3.62933 12.8543 3 11.3167 3 9.5C3 7.68333 3.62933 6.14567 4.888 4.887C6.146 3.629 7.68333 3 9.5 3C11.3167 3 12.8543 3.629 14.113 4.887C15.371 6.14567 16 7.68333 16 9.5C16 10.2333 15.8833 10.925 15.65 11.575C15.4167 12.225 15.1 12.8 14.7 13.3L21 19.6L19.6 21ZM9.5 14C10.75 14 11.8127 13.5627 12.688 12.688C13.5627 11.8127 14 10.75 14 9.5C14 8.25 13.5627 7.18733 12.688 6.312C11.8127 5.43733 10.75 5 9.5 5C8.25 5 7.18733 5.43733 6.312 6.312C5.43733 7.18733 5 8.25 5 9.5C5 10.75 5.43733 11.8127 6.312 12.688C7.18733 13.5627 8.25 14 9.5 14ZM8.5 12.5V10.5H6.5V8.5H8.5V6.5H10.5V8.5H12.5V10.5H10.5V12.5H8.5Z" fill="#587C22"/>
</g>
</svg>
```

`public/icons/conteudo/zoom-out.svg`:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g>
<path d="M19.6 21L13.3 14.7C12.8 15.1 12.225 15.4167 11.575 15.65C10.925 15.8833 10.2333 16 9.5 16C7.68333 16 6.146 15.371 4.888 14.113C3.62933 12.8543 3 11.3167 3 9.5C3 7.68333 3.62933 6.14567 4.888 4.887C6.146 3.629 7.68333 3 9.5 3C11.3167 3 12.8543 3.629 14.113 4.887C15.371 6.14567 16 7.68333 16 9.5C16 10.2333 15.8833 10.925 15.65 11.575C15.4167 12.225 15.1 12.8 14.7 13.3L21 19.6L19.6 21ZM9.5 14C10.75 14 11.8127 13.5627 12.688 12.688C13.5627 11.8127 14 10.75 14 9.5C14 8.25 13.5627 7.18733 12.688 6.312C11.8127 5.43733 10.75 5 9.5 5C8.25 5 7.18733 5.43733 6.312 6.312C5.43733 7.18733 5 8.25 5 9.5C5 10.75 5.43733 11.8127 6.312 12.688C7.18733 13.5627 8.25 14 9.5 14ZM7 10.5V8.5H12V10.5H7Z" fill="#587C22"/>
</g>
</svg>
```

`public/icons/conteudo/fullscreen.svg`:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g>
<path d="M3 21V15H5V17.6L8.1 14.5L9.5 15.9L6.4 19H9V21H3ZM15 21V19H17.6L14.5 15.9L15.9 14.5L19 17.6V15H21V21H15ZM8.1 9.5L5 6.4V9H3V3H9V5H6.4L9.5 8.1L8.1 9.5ZM15.9 9.5L14.5 8.1L17.6 5H15V3H21V9H19V6.4L15.9 9.5Z" fill="#587C22"/>
</g>
</svg>
```

- [ ] **Step 3: Implement the reader**

Create `components/marketing/conteudo/PdfViewer.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PDFViewer } from "pdfjs-dist/web/pdf_viewer.mjs";
import "pdfjs-dist/web/pdf_viewer.css";
import { formatZoom, nextZoomStep, parsePageInput } from "@/lib/marketing/pdfViewerControls";
import leitor from "./Leitor.module.css";
import styles from "./PdfViewer.module.css";

export type PdfViewerProps = {
  url: string;
  title: string;
  fileName: string;
  cover: string;
};

type Status = "loading" | "ready" | "error";

// Below this width the reader opens fitted to the width; Leitor.module.css and
// PdfViewer.module.css switch the toolbar at the same width.
const MOBILE_QUERY = "(max-width: 767px)";

// The publication reader, Figma node 19015:13068: pdf.js's own PDFViewer
// (lazy page rendering, text layer, links) driven by the design's toolbar,
// built as the spike validated it (spec §2.1, §5). Loaded only through
// PdfViewerLoader, never on the server.
export default function PdfViewer({ url, title, fileName, cover }: PdfViewerProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerElementRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PDFViewer | null>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const scaleBeforeFullscreen = useRef<number | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageField, setPageField] = useState("1");
  const [scale, setScale] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // Client-only component (ssr: false), so `document` exists on first render.
  // iPhone Safari has no element fullscreen, and there the button is left out.
  const [canFullscreen] = useState(() => document.fullscreenEnabled);

  useEffect(() => {
    let cancelled = false;
    let destroyTask: (() => Promise<void>) | undefined;

    async function open() {
      const pdfjs = await import("pdfjs-dist");
      // A same-origin worker the bundler emits next to the chunks, versioned
      // with the installed package: no CDN, no copy step.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      // pdf_viewer.mjs reads the core library from this global when imported.
      (globalThis as unknown as { pdfjsLib?: typeof pdfjs }).pdfjsLib = pdfjs;
      const { EventBus, LinkTarget, PDFLinkService, PDFViewer: Viewer } = await import(
        "pdfjs-dist/web/pdf_viewer.mjs"
      );

      const container = containerRef.current;
      const viewerElement = viewerElementRef.current;
      if (cancelled || !container || !viewerElement) return;

      const eventBus = new EventBus();
      const linkService = new PDFLinkService({
        eventBus,
        externalLinkTarget: LinkTarget.BLANK,
        externalLinkRel: "noopener noreferrer",
      });
      const viewer = new Viewer({
        container,
        viewer: viewerElement,
        eventBus,
        linkService,
        // Pages flush with the frame, and page-width uses the full width
        // (without it pdf.js reserves a scrollbar's padding: spare room at 390px).
        removePageBorders: true,
        // Links, but no form fields and no annotation editing (spec §5.2).
        annotationMode: pdfjs.AnnotationMode.ENABLE,
        annotationEditorMode: pdfjs.AnnotationEditorType.DISABLE,
      });
      linkService.setViewer(viewer);
      viewerRef.current = viewer;

      eventBus.on("pagesinit", () => {
        viewer.currentScaleValue = window.matchMedia(MOBILE_QUERY).matches ? "page-width" : "page-fit";
      });
      eventBus.on("pagechanging", ({ pageNumber }: { pageNumber: number }) => {
        setPage(pageNumber);
        setPageField(String(pageNumber));
      });
      eventBus.on("scalechanging", ({ scale: next }: { scale: number }) => setScale(next));

      // isEvalSupported: false is the hardening advised after CVE-2024-4367
      // (code execution through a crafted font, fixed upstream in 4.2.67).
      const task = pdfjs.getDocument({ url, isEvalSupported: false });
      destroyTask = () => task.destroy();
      const pdfDocument = await task.promise;
      if (cancelled) return;

      documentRef.current = pdfDocument;
      viewer.setDocument(pdfDocument);
      linkService.setDocument(pdfDocument, null);
      setPageCount(pdfDocument.numPages);
      setStatus("ready");
    }

    open().catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
      viewerRef.current = null;
      documentRef.current = null;
      void destroyTask?.();
    };
  }, [url]);

  // Fullscreen fits the page to the new height; leaving restores the zoom the
  // reader had before.
  useEffect(() => {
    function onFullscreenChange() {
      const entered = document.fullscreenElement === frameRef.current;
      setFullscreen(entered);

      const viewer = viewerRef.current;
      if (!viewer) return;

      if (entered) {
        scaleBeforeFullscreen.current = viewer.currentScale;
        viewer.currentScaleValue = "page-fit";
      } else if (scaleBeforeFullscreen.current !== null) {
        viewer.currentScale = scaleBeforeFullscreen.current;
        scaleBeforeFullscreen.current = null;
      }
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function zoom(direction: 1 | -1) {
    const viewer = viewerRef.current;
    const next = viewer ? nextZoomStep(viewer.currentScale, direction) : null;
    if (viewer && next !== null) viewer.currentScale = next;
  }

  function goToTypedPage() {
    const target = parsePageInput(pageField, pageCount);

    if (target === null || !viewerRef.current) {
      setPageField(String(page));
      return;
    }

    viewerRef.current.currentPageNumber = target;
    setPageField(String(target));
  }

  function onPageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToTypedPage();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frameRef.current?.requestFullscreen();
  }

  // The `download` attribute is ignored on a cross-origin URL (the PDF lives on
  // Contentful's CDN), so once pdf.js holds the bytes they are saved from
  // memory. Until then the link itself opens the file in a new tab.
  function download(event: MouseEvent<HTMLAnchorElement>) {
    const pdfDocument = documentRef.current;
    if (!pdfDocument) return;

    event.preventDefault();
    void pdfDocument.getData().then((data) => {
      const href = URL.createObjectURL(new Blob([data as BlobPart], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = href;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      // The click has handed the Blob to the download; revoke it after.
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    });
  }

  const ready = status === "ready";
  const zoomInStep = scale === null ? null : nextZoomStep(scale, 1);
  const zoomOutStep = scale === null ? null : nextZoomStep(scale, -1);

  return (
    <div ref={frameRef} className={leitor.frame}>
      <div className={leitor.toolbar}>
        <p className={`${leitor.title} text-p-ui`} title={title}>
          {title}
        </p>

        <div className={styles.controls}>
          <form className={styles.pages} onSubmit={onPageSubmit}>
            <input
              className={`${styles.field} ${styles.pageField}`}
              aria-label="Página"
              inputMode="numeric"
              autoComplete="off"
              value={pageField}
              onChange={(event) => setPageField(event.target.value)}
              onBlur={goToTypedPage}
              disabled={!ready}
            />
            <span className={styles.total}>
              <span aria-hidden="true">/</span>
              <span className="sr-only">de</span> {ready ? pageCount : "--"}
            </span>
          </form>

          {/* Zoom in first, then the level, then zoom out: the Figma's order. */}
          <div className={styles.zoom}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => zoom(1)}
              disabled={!ready || zoomInStep === null}
              aria-label="Aumentar zoom"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
              <img src="/icons/conteudo/zoom-in.svg" alt="" width={24} height={24} />
            </button>
            <output className={`${styles.field} ${styles.zoomField}`} aria-label="Zoom">
              {scale === null ? "--" : formatZoom(scale)}
            </output>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => zoom(-1)}
              disabled={!ready || zoomOutStep === null}
              aria-label="Diminuir zoom"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
              <img src="/icons/conteudo/zoom-out.svg" alt="" width={24} height={24} />
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          {canFullscreen && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
              <img src="/icons/conteudo/fullscreen.svg" alt="" width={24} height={24} />
            </button>
          )}
          <a href={url} target="_blank" rel="noreferrer" className={`${styles.download} text-body`} onClick={download}>
            {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
            <img src="/icons/conteudo/download.svg" alt="" width={16} height={16} />
            Baixar PDF
          </a>
        </div>
      </div>

      <div className={leitor.area}>
        {/* A labelled, focusable region, so keyboard users can scroll it. */}
        <div ref={containerRef} className={styles.container} role="region" tabIndex={0} aria-label="Documento PDF">
          <div ref={viewerElementRef} className="pdfViewer" />
        </div>

        {status === "loading" && (
          <p className={leitor.status} role="status">
            Carregando documento…
          </p>
        )}

        {status === "error" && (
          <div className={`${leitor.status} ${styles.error}`} role="alert">
            {/* eslint-disable-next-line @next/next/no-img-element -- static asset or Contentful URL, as in PublicationCard */}
            <img src={cover} alt="" className={styles.errorCover} />
            <p className={styles.errorText}>Não foi possível exibir o PDF.</p>
            <a href={url} target="_blank" rel="noreferrer" className={styles.errorLink}>
              Abrir o arquivo em outra aba
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

Create `components/marketing/conteudo/PdfViewer.module.css`:

```css
/* Toolbar controls, Figma nodes 19015:13073 (the page field and the zoom
 * group, 24px apart) and 19015:13086 (fullscreen and "Baixar PDF", 16px). */
.controls {
  display: flex;
  align-items: center;
  gap: 24px;
}

.pages,
.zoom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* The page and zoom fields (19015:13076, 19015:13083): 40px tall, Rubik
 * 16/24 in --am-400 on --bg-fundo (5.32:1), 6px corners. Their border is the
 * design's --input (#dcdbdc), which has no token; --am-200 is the nearest. */
.field {
  box-sizing: border-box;
  height: 40px;
  padding: 8px 12px;
  border: 1px solid var(--am-200);
  border-radius: var(--radius-interno);
  background: var(--bg-fundo);
  font-family: var(--font-sans, var(--font-fallback));
  font-size: 16px;
  line-height: 24px;
  color: var(--am-400);
}

.pageField {
  width: calc(3ch + 26px);
  text-align: center;
}

.zoomField {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
}

.total {
  font-family: var(--font-sans, var(--font-fallback));
  font-size: 16px;
  line-height: 24px;
  color: var(--bg-texto-primario);
  white-space: nowrap;
}

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

.iconButton:hover:not(:disabled),
.iconButton:focus-visible {
  background: var(--am-100);
}

.iconButton:disabled {
  cursor: default;
  opacity: 0.4;
}

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

.download:hover,
.download:focus-visible {
  background: var(--role-marca-ancora-hover);
}

/* pdf.js's PDFViewer measures and scrolls its container itself, and requires
 * it to be absolutely positioned. */
.container {
  position: absolute;
  inset: 0;
  overflow: auto;
}

.container:focus-visible {
  outline: 2px solid var(--role-marca-ancora-foco);
  outline-offset: -2px;
}

.error {
  flex-direction: column;
  gap: 16px;
}

.errorCover {
  max-height: 50%;
  width: auto;
}

.errorText {
  margin: 0;
}

.errorLink {
  color: var(--bg-texto-primario);
  text-decoration: underline;
}

@media (max-width: 767px) {
  /* Page field, zoom and fullscreen on one row at 390px (≈310 of 318px); the
   * download moves under the description (ConteudoHeader). */
  .controls {
    gap: 12px;
  }

  .zoomField {
    min-width: 56px;
  }

  .download {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .iconButton,
  .download {
    transition: none;
  }
}
```

Create `components/marketing/conteudo/LeitorCarregando.tsx`:

```tsx
import leitor from "./Leitor.module.css";

// The reader while pdf.js's chunk downloads (PdfViewerLoader): the same frame,
// toolbar height and area, so the page does not jump when the reader mounts.
export default function LeitorCarregando() {
  return (
    <div className={leitor.frame}>
      <div className={leitor.toolbar} />
      <div className={leitor.area}>
        <p className={leitor.status} role="status">
          Carregando documento…
        </p>
      </div>
    </div>
  );
}
```

Create `components/marketing/conteudo/PdfViewerLoader.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import LeitorCarregando from "./LeitorCarregando";
import type { PdfViewerProps } from "./PdfViewer";

// pdf.js needs `window`, and is one of the heaviest client dependencies (spec
// §2.1: ~185 KB gzipped plus the worker). It loads in a chunk of its own, only
// on a page that has a PDF, while the skeleton holds the reader's footprint.
// `ssr: false` is only allowed inside a client component, hence this file.
const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => <LeitorCarregando />,
});

export default function PdfViewerLoader(props: PdfViewerProps) {
  return <PdfViewer {...props} />;
}
```

In `app/(marketing)/comunicacao/[slug]/page.tsx`, import `PdfViewerLoader` from `@/components/marketing/conteudo/PdfViewerLoader` and replace `<ConteudoSemPdf publicacao={publicacao} />` with:

```tsx
          {publicacao.pdf ? (
            <PdfViewerLoader
              url={publicacao.pdf}
              title={publicacao.title}
              fileName={publicacao.pdfFileName ?? `${slug}.pdf`}
              cover={publicacao.cover}
            />
          ) : (
            <ConteudoSemPdf publicacao={publicacao} />
          )}
```

- [ ] **Step 4: Type-check, lint and build**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v '^tests/' | head -20`
Expected: no errors outside `tests/`.

Run: `npx eslint components/marketing/conteudo "app/(marketing)/comunicacao/[slug]"`
Expected: no errors.

Run: `npm run build`
Expected: builds. `/comunicacao/[slug]` is listed as dynamic (ƒ), and `ls .next/static/media | grep pdf.worker` prints the emitted worker.

- [ ] **Step 5: Check the reader in the browser with a sample PDF (uncommitted override)**

- Generate the sample: 20 A4 pages, page 1 the caderno cover, page 7 landscape, a link on every text page. `<scratchpad>` is the session's scratchpad directory:

```bash
cp public/images/cartilhas/caderno.jpg <scratchpad>/caderno.jpg
python3 - <<'EOF'
pages = ['<section class="cover"><img src="caderno.jpg"></section>']
for i in range(2, 21):
    cls = ' class="landscape"' if i == 7 else ''
    pages.append(f'''<section{cls}><h1>Seção {i - 1}: página {i}</h1>
<p>Texto de exemplo para testar a camada de texto do visualizador.</p>
<p>{"Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 12}</p>
<p><a href="https://www.example.com/pagina-{i}">Link externo de teste (página {i})</a></p></section>''')
css = '''@page { size: A4; margin: 0 } @page landscape { size: A4 landscape }
body { margin: 0; font-family: sans-serif }
section { width: 210mm; height: 297mm; box-sizing: border-box; padding: 20mm; break-after: page }
section.landscape { page: landscape; width: 297mm; height: 210mm }
section.cover { padding: 0 } section.cover img { width: 100%; height: 100%; object-fit: cover; display: block }'''
open('<scratchpad>/sample.html', 'w').write(f'<!doctype html><meta charset="utf-8"><style>{css}</style>' + ''.join(pages))
EOF
google-chrome --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf=public/dev-sample.pdf file://<scratchpad>/sample.html
```
- Temporarily add `pdf: '/dev-sample.pdf',` to `DEFAULT_CARTILHAS[0]` in `lib/content/comunicacao.ts`. **Do not commit this or `public/dev-sample.pdf`.**
- Run `CONTENTFUL_SPACE_ID= npx next dev -p 3013` and open `/comunicacao/cartilha-1-o-que-e-credito-de-carbono`.

Check each of these, noting the result:
- **1440 wide:** the toolbar matches frame `19015:13056`: title (ellipsis), "1 / 20", zoom-in, percentage, zoom-out, fullscreen, "Baixar PDF". Page 1 opens whole (`page-fit`) at roughly 95%.
- **Zoom:** "+" goes to 100%, then 125%. "−" walks back down, and disables at 50%.
- **Page field:** typing "10" + Enter shows page 10. "999" or "abc", then Tab, restores the current page. Scrolling updates the field.
- **Landscape page:** page 7 fits the width without horizontal scroll at `page-fit`.
- **Text and links:** the text is selectable, and a link opens `example.com` in a new tab.
- **Fullscreen:** it fits the page to the screen height, and leaving restores the previous zoom.
- **Download:** "Baixar PDF" downloads `cartilha-1-o-que-e-credito-de-carbono.pdf` (no `pdfFileName` in the override).
- **390 wide:** no horizontal page scroll. The toolbar holds the page field, zoom and fullscreen on one row. "Baixar PDF" sits full-width under the description, and the page opens at `page-width`.
- **Error:** change the override to `'/nao-existe.pdf'`. The cover, "Não foi possível exibir o PDF." and "Abrir o arquivo em outra aba" show, with no uncaught exception in the console.
- **Console:** no errors in the normal flow.

Then remove the override and `public/dev-sample.pdf`, and run `git status` to confirm neither is left.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json components/marketing/conteudo/PdfViewer.tsx components/marketing/conteudo/PdfViewer.module.css components/marketing/conteudo/PdfViewerLoader.tsx components/marketing/conteudo/LeitorCarregando.tsx public/icons/conteudo/zoom-in.svg public/icons/conteudo/zoom-out.svg public/icons/conteudo/fullscreen.svg "app/(marketing)/comunicacao/[slug]/page.tsx"
git commit -m "feat: read the publication's PDF in place with pdf.js"
```

---

### Task 7: Live-space check, docs, full verification and cleanup

**Files:**
- Modify: `tests/lib/contentfulSpace.test.ts`
- Modify: `DOCUMENTACAO.md` (Portuguese)
- Modify: `IMAGENS.md` (Portuguese)

**Interfaces:**
- Consumes: `listPublicacoes`, `DEFAULT_CADERNO`, `DEFAULT_CARTILHAS` (Task 1).

- [ ] **Step 1: Require addresses in the live space**

In `tests/lib/contentfulSpace.test.ts`, extend the import from `@/lib/content/comunicacao` with `DEFAULT_CADERNO`, `DEFAULT_CARTILHAS` and `listPublicacoes`, and append inside the `describe.skipIf(...)` block:

```ts
  it('gives every publication an address, unique across cartilha and caderno', async () => {
    const lista = listPublicacoes(await getComunicacaoContent(getContentfulClient()))
    const semEndereco = lista.filter((p) => !p.slug).map((p) => p.title)

    expect(semEndereco, 'publications without an address').toEqual([])
    expect(new Set(lista.map((p) => p.slug)).size).toBe(lista.length)
  })

  // During a Contentful outage the pages fall back to the shipped content; a
  // link shared from the CMS's address must still resolve then.
  it('keeps the shipped addresses, so a link survives the fallback', async () => {
    const lista = listPublicacoes(await getComunicacaoContent(getContentfulClient()))
    const enderecos = new Set(lista.map((p) => p.slug))
    const shipped = [DEFAULT_CADERNO.slug, ...DEFAULT_CARTILHAS.map((c) => c.slug)]

    expect(shipped.filter((slug) => !enderecos.has(slug)), 'shipped addresses missing from the CMS').toEqual([])
  })
```

- [ ] **Step 2: Run the full suite as-is**

Run: `npm test`
Expected: everything passes except `tests/lib/contentfulSpace.test.ts`, **unless** the user has already applied the model and filled the addresses (spec §8). Record which: this result goes into the PR description. Do not skip or weaken the live test to make it green.

- [ ] **Step 3: Update the Portuguese docs**

In `DOCUMENTACAO.md`, section "Conteúdo editorial da landing", replace the `cartilha` and `caderno` rows of the model table:

```markdown
| `cartilha` | `volume`, `title`, `slug` (endereço, obrigatório e único), `description` (opcional), `publicationDate` (opcional), `cover` (imagem), `pdf` (opcional), `order` |
| `caderno` | `title`, `slug` (endereço, obrigatório e único), `description`, `publicationDate` (opcional), `cover` (imagem), `pdf` (opcional) |
```

Replace the paragraph after the table with:

```markdown
A ordem de exibição é do editor, pelo campo `order` (a query pede `order_ASC`), e não a data de criação da entry. Cada publicação tem uma página em `/comunicacao/<slug>`, com o leitor de PDF embutido (pdf.js) quando o `pdf` estiver publicado e a capa no lugar dele enquanto não estiver; os cartões da landing e de `/comunicacao` levam a essa página. O `slug` precisa ser único também entre cartilhas e caderno, que o Contentful só garante dentro de cada tipo, e deve repetir o do conteúdo embutido no código (`lib/content/comunicacao.ts`), para que um link compartilhado continue funcionando quando o site cai no conteúdo padrão. A `publicationDate` aparece como "Publicado em: dd/mm/aa" e some quando vazia; uma cartilha sem `description` usa o texto da série. `tests/scripts/contentfulProvision.test.ts` compara o modelo com a query e falha se um campo for renomeado em apenas um dos dois lados, e `tests/lib/contentfulSpace.test.ts` falha enquanto alguma publicação estiver sem endereço.
```

In `IMAGENS.md`, after the paragraph about `public/icons/sobre/`, add:

```markdown
Os ícones da página de publicação (`public/icons/conteudo/`) são os SVGs exportados do Figma (frame 19015:13056) sem alteração de desenho: a seta de "Voltar", as lupas de zoom, a tela cheia e o download. O download é a exceção de exportação: o `get_design_context` devolve para esse nó o ícone padrão do componente (um envelope), e não o trocado na instância, então o arquivo é o caminho do ícone tirado do SVG do botão inteiro, recortado por `viewBox` no quadro de 16 px que ele ocupa.
```

- [ ] **Step 4: Full verification pass**

Run: `npm run lint`, `npm run build`, `npm run contrast`.
Expected: no lint errors, a successful build, and the contrast check passing.

Browser checks with `CONTENTFUL_SPACE_ID= npx next dev -p 3013`:
- Use the Chrome extension if it is connected.
- Otherwise use headless Chrome, as described in "Browser Checks" at the top of this plan.

Check each of these, noting the result:
- **No-PDF state at 1440 and 390:** the title and the longest title (the caderno) truncate in the toolbar and wrap in the `<h1>`, with no horizontal scroll.
- **Keyboard:** Tab reaches "Voltar", the cards and every toolbar control, with a visible focus ring.
- **"Voltar":** arriving from `/`, it returns to `/`. From `/comunicacao`, it returns there. On a direct load (new tab), it goes to `/comunicacao`.
- **404:** an unknown slug answers 404.
- **Console:** no errors.

- [ ] **Step 5: Remove the spike**

```bash
git worktree remove /home/ezequias/oca/worktrees/spike-pdf-viewer --force
git branch -D spike/pdf-viewer
rm -f /home/ezequias/oca/worktrees/spike-pdf-viewer-dev.log /home/ezequias/oca/worktrees/spike-pdf-viewer-start.log
```

Expected: `git worktree list` no longer shows it.

- [ ] **Step 6: Commit**

```bash
git add tests/lib/contentfulSpace.test.ts DOCUMENTACAO.md IMAGENS.md
git commit -m "test: require publication addresses in the live Contentful space"
```

Before opening the PR, tell the user the rollout order of spec §8:
1. Apply the model: `CONTENTFUL_MANAGEMENT_TOKEN=... npm run contentful:provision -- --apply`.
2. Fill the five addresses **with the shipped slugs listed in Task 1**.
3. Merge only after that.
