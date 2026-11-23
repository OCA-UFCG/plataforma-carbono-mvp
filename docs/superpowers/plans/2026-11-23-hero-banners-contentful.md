# Hero Banners in Contentful Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The landing's hero carousel reads its banners (photo, words, optional button, credit) from one Contentful entry per banner, of a new `bannerInicio` type, with the four shipped banners as the fallback.

**Architecture:** A publication type in `lib/content/site/provision.ts` (provisioned by the existing script), a read module `lib/content/banners.ts` modeled on `lib/content/eventos.ts`, and `components/marketing/Hero.tsx` rendering a `Banner[]` instead of the numbered `INICIO_HERO` copy, which is retired from code. The space is changed last, by the session, after the developer confirms.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, next-intl, Contentful GraphQL Content Delivery API and Content Management API, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-23-hero-banners-contentful-design.md`

## Global Constraints

- Work in the worktree `.claude/worktrees/hero-banners` on branch `feat/hero-banners`. Never touch the main checkout, which holds the developer's uncommitted work.
- Code, comments and docs in English (root `CLAUDE.md`); UI strings, Contentful display names and help texts in Portuguese.
- Content type id `bannerInicio`, name `Banner do início`, description exactly: `Um banner do carrossel do topo da página inicial. Para criar outro, adicione uma entrada deste tipo; para tirar um do ar, despublique a entrada.`
- Fields, in this order: `title` Título Symbol required localized; `text` Texto Text required localized; `buttonLabel` Texto do botão Symbol optional localized; `buttonLink` Link do botão Symbol optional not localized; `photo` Foto Link→Asset image required not localized; `credit` Crédito da foto Symbol optional not localized; `order` Ordem Integer required not localized. `displayField: 'title'`.
- A button link is a site path (`/`, `/sobre`…) or an `https://` URL; nothing else reaches an `href`.
- `lib/content/site/provision.ts` and everything it imports must not import `server-only` (the provision script runs it under plain `tsx`).
- `components/marketing/Hero.tsx` is a client component: it may only `import type` from `lib/content/banners.ts`.
- No change to the space before Task 4, and Task 4 only after the developer says go.
- Commit messages follow the repo's `feat:`/`fix:`/`docs:` style. No push.

## Review Focus

- A single published banner: the hero shows it with no dots, arrows or pause toggle (nothing to rotate). Test in Task 3.
- A link typed as `www.site.org`, `sobre`, `//host` or `javascript:…`: Contentful refuses it; if one still arrives, the banner renders without its button. Tests in Tasks 1 and 2.
- A button label without a link, or a link without a label: no button, banner kept. Test in Task 2.
- A banner whose photo asset is unpublished (Contentful answers `photo: null` with an `UNRESOLVABLE_LINK`): that banner is dropped, the rest shown; if all drop, the four shipped ones. Test in Task 2.
- Two banners using the same photo: both render (no key collision). Test in Task 3.

---

### Task 1: The `bannerInicio` content type, with link validation and editor help

**Files:**
- Create: `lib/content/bannerLink.ts`
- Modify: `lib/content/site/provision.ts` (`ProvisionedField`, `PUBLICATION_TYPES`, `toEditorControl`, `toCmaField`)
- Test: `tests/lib/bannerLink.test.ts` (create), `tests/scripts/contentfulProvision.test.ts`

**Interfaces:**
- Produces: `BANNER_LINK_PATTERN: string`, `BANNER_LINK_MESSAGE: string`, `bannerLink(raw?: string | null): string | undefined` from `@/lib/content/bannerLink`; `ProvisionedField` gains `help?: string` and `pattern?: { pattern: string; message: string }`; `CONTENT_TYPES` contains `bannerInicio`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/bannerLink.test.ts`:

```ts
describe('bannerLink', () => {
  it('keeps a site path or an https address, trimmed', () => {
    for (const [raw, kept] of [['/', '/'], ['/sobre', '/sobre'], ['/comunicacao#eventos', '/comunicacao#eventos'],
      ['https://www.gov.br/sudene', 'https://www.gov.br/sudene'], ['  /sobre ', '/sobre']]) {
      expect(bannerLink(raw)).toBe(kept)
    }
  })
  it('drops anything else', () => {
    for (const raw of ['', null, undefined, 'sobre', 'www.site.org', 'http://site.org', '//evil.example',
      '/\\evil.example', 'javascript:alert(1)', 'mailto:a@b.org']) {
      expect(bannerLink(raw)).toBeUndefined()
    }
  })
  it('is the rule Contentful enforces', () => {
    expect(new RegExp(BANNER_LINK_PATTERN).test('/sobre')).toBe(true)
    expect(new RegExp(BANNER_LINK_PATTERN).test('//evil.example')).toBe(false)
  })
})
```

In `tests/scripts/contentfulProvision.test.ts`, add to `describe('the provisioned content model')`:

```ts
it('models a banner as the spec lists its fields', () => {
  const banner = CONTENT_TYPES.find((c) => c.id === 'bannerInicio')!
  expect(banner.name).toBe('Banner do início')
  expect(banner.displayField).toBe('title')
  expect(banner.fields.map((f) => [f.id, f.type, f.required])).toEqual([
    ['title', 'Symbol', true], ['text', 'Text', true], ['buttonLabel', 'Symbol', false],
    ['buttonLink', 'Symbol', false], ['photo', 'Link', true], ['credit', 'Symbol', false], ['order', 'Integer', true],
  ])
  expect(toCmaField(banner.fields.find((f) => f.id === 'photo')!).validations).toEqual([{ linkMimetypeGroup: ['image'] }])
})

it('accepts only a site path or an https address as the banner link', () => {
  const link = CONTENT_TYPES.find((c) => c.id === 'bannerInicio')!.fields.find((f) => f.id === 'buttonLink')!
  expect(toCmaField(link).validations).toEqual([{ regexp: { pattern: BANNER_LINK_PATTERN }, message: BANNER_LINK_MESSAGE }])
})

it('translates the words of a banner, and not its link, photo, credit or order', () => {
  const localized = CONTENT_TYPES.find((c) => c.id === 'bannerInicio')!.fields.filter((f) => toCmaField(f).localized)
  expect(localized.map((f) => f.id)).toEqual(['title', 'text', 'buttonLabel'])
})

it('explains every banner field in the editor', () => {
  const widgets = { Symbol: 'singleLine', Text: 'multipleLine', Integer: 'numberEditor', Link: 'assetLinkEditor' }
  for (const field of CONTENT_TYPES.find((c) => c.id === 'bannerInicio')!.fields) {
    const control = toEditorControl(field)
    expect(control?.widgetId, field.id).toBe(widgets[field.type as keyof typeof widgets])
    expect(control?.settings.helpText, field.id).toBeTruthy()
  }
})
```

The existing `'leaves the publication types to their default editors'` test stays as is (its four types get no `help`).

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/bannerLink.test.ts tests/scripts/contentfulProvision.test.ts`
Expected: FAIL — `bannerLink` module not found; no content type `bannerInicio`.

- [ ] **Step 3: Implement `lib/content/bannerLink.ts`**

No `server-only` import. `BANNER_LINK_PATTERN = '^(/$|/[^/\\\\]|https://)'` (as a regex: `^(/$|/[^/\\]|https://)`, which refuses `//host` and `/\host` without needing lookahead, which Contentful's validator may not support). `BANNER_LINK_MESSAGE = 'Use um caminho do site começando com uma barra, como /sobre, ou um endereço completo começando com https://.'` `bannerLink` trims and returns the value only when it matches. Comment why the rule exists (an editor-typed `href`).

- [ ] **Step 4: Implement the model changes in `lib/content/site/provision.ts`**

- `ProvisionedField`: add `help?: string` (the editor's help under a publication field) and `pattern?: { pattern: string; message: string }`.
- `toCmaField`: a field with `pattern` pushes `{ regexp: { pattern }, message }`.
- `toEditorControl`: copy fields unchanged; otherwise a field with `help` returns `{ fieldId, widgetNamespace: 'builtin', widgetId, settings: { helpText: help } }` with widgetId by type `Symbol→singleLine, Text→multipleLine, Integer→numberEditor, Link→assetLinkEditor`; otherwise `null`.
- Append `bannerInicio` to `PUBLICATION_TYPES` per Global Constraints, with `buttonLink.pattern = { pattern: BANNER_LINK_PATTERN, message: BANNER_LINK_MESSAGE }`, `photo.image: true`, and these help texts:
  - title: `Uma linha, em destaque sobre a foto.`
  - text: `Um parágrafo curto abaixo do título. Uma quebra de linha aqui vira uma quebra de linha na página.`
  - buttonLabel: `Opcional. O botão só aparece com o texto e o link preenchidos.`
  - buttonLink: `Opcional. Um caminho do site, como /sobre ou /comunicacao, ou um endereço completo começando com https://.`
  - photo: `Foto em paisagem, com pelo menos 1920 px de largura. O texto fica sobre o lado esquerdo, escurecido por um degradê: evite o assunto principal ali.`
  - credit: `Opcional. Nome de quem fez a foto, exibido como "Foto: nome".`
  - order: `Os banners aparecem do menor número para o maior.`

- [ ] **Step 5: Run them to verify they pass**

Run: `npx vitest run tests/lib/bannerLink.test.ts tests/scripts/contentfulProvision.test.ts`
Expected: PASS.

- [ ] **Step 6: Check the dry run lists the type**

Run: `npm run contentful:provision -- --only bannerInicio`
Expected: prints `bannerInicio (Banner do início) -> title:Symbol, text:Text, buttonLabel?:Symbol, buttonLink?:Symbol, photo:Link, credit?:Symbol, order:Integer` and stops at the missing-token notice (no `.env.local` in the worktree).

- [ ] **Step 7: Commit**

```bash
git add lib/content/bannerLink.ts lib/content/site/provision.ts tests/lib/bannerLink.test.ts tests/scripts/contentfulProvision.test.ts docs/superpowers/specs/2026-11-23-hero-banners-contentful-design.md docs/superpowers/plans/2026-11-23-hero-banners-contentful.md
git commit -m "feat: model the landing's hero banners as a Contentful type"
```

---

### Task 2: Reading the banners, with the shipped four as the fallback

**Files:**
- Create: `lib/content/banners.ts`
- Test: `tests/lib/bannersContent.test.ts` (create), `tests/scripts/contentfulProvision.test.ts`, `tests/lib/contentfulSpace.test.ts`

**Interfaces:**
- Consumes: `bannerLink` (Task 1); `localeVariables`, `ContentfulVariables` from `@/lib/contentful`; `SiteLocale` from `@/lib/locale`; `MAPA_LINK`, `TERRITORIOS_LINK` from `@/lib/marketing/nav`.
- Produces, from `@/lib/content/banners`:
  ```ts
  export type BannerAction = { href: string; label: string }
  export type Banner = { title: string; text: string; photo: string; credit?: string; action?: BannerAction }
  export const DEFAULT_BANNERS: Banner[]
  export const BANNERS_QUERY: string
  export const BANNER_PHOTO_PARAMS = 'w=1920&q=75&fm=webp'
  export async function getBanners(getContent: GetContent | null, locale?: SiteLocale): Promise<Banner[]>
  ```

- [ ] **Step 1: Write the failing tests** in `tests/lib/bannersContent.test.ts`, with a `clientReturning(payload, calls)` fake like `tests/lib/eventosContent.test.ts`'s that also records the variables:

- `'serves the four shipped banners without Contentful'`: `getBanners(null)` is `DEFAULT_BANNERS`; photos are `['/images/hero/hero2.jpg', '/images/hero/hero3.jpg', '/images/hero/hero1.jpg', '/images/hero/hero4.jpg']`; hrefs are `['/sobre', '/comunicacao', TERRITORIOS_LINK.href, MAPA_LINK.href]`; every credit is `'Artur Lourenço'`; first title `'Dados abertos e mapas para entender o carbono na Caatinga'`.
- `'maps a published banner, sizing its photo'`: an item `{ title: 'T', text: 'X', buttonLabel: 'Ver', buttonLink: '/sobre', photo: { url: 'https://images.ctfassets.net/s/a/b/foto.jpg' }, credit: null }` maps to `{ title: 'T', text: 'X', photo: 'https://images.ctfassets.net/s/a/b/foto.jpg?w=1920&q=75&fm=webp', credit: undefined, action: { href: '/sobre', label: 'Ver' } }`; the query sent is `BANNERS_QUERY`, which contains `bannerInicioCollection(order: order_ASC`.
- `'shows a banner without a button when the button is half filled or its link is refused'`: label without link, link without label, and link `'www.site.org'` each map with `action` undefined.
- `'drops a banner missing its title, text or photo'`: each of `title`, `text`, `photo` set to `null`, plus a `null` item, leave only the complete one.
- `'falls back to the shipped four'`: when the collection is empty, absent, or every item is incomplete; and when `getContent` throws (spy on `console.error`, expect it called).
- `'asks Contentful for the page's language'`: variables are `undefined` for `'pt'` and `{ locale: 'en-US' }` for `'en'`.

In `tests/scripts/contentfulProvision.test.ts`: `'carries every field the banners query selects'` — `selectedFields(BANNERS_QUERY, 'bannerInicioCollection')` is non-empty and contained in `fieldIds('bannerInicio')`, and `fieldIds('bannerInicio')` contains `'order'`.

In `tests/lib/contentfulSpace.test.ts`, next to the eventos smoke test: `'serves the banners query'` — the response's `bannerInicioCollection?.items` is an array. (Skipped without credentials; passes against the space only after Task 4.)

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/bannersContent.test.ts tests/scripts/contentfulProvision.test.ts`
Expected: FAIL — `@/lib/content/banners` not found.

- [ ] **Step 3: Implement `lib/content/banners.ts`**

Same shape as `lib/content/eventos.ts` (`import 'server-only'`, own query, `GetContent` type, `mapBanners`, try/catch with `console.error('Failed to read the hero banners from Contentful:', error)`).
- `DEFAULT_BANNERS`: the four cards in today's order, words copied verbatim from the defaults of `INICIO_HERO` in `lib/content/inicio.ts` (`foto1…foto4` Titulo/Texto/Botao), photos and hrefs as in the test, credit `'Artur Lourenço'`. Move the provenance comments of `PHOTOS` and `heroCards` from `Hero.tsx` here (Figma nodes, the mandatory credit, why the order differs from the file names).
- `BANNERS_QUERY`: `bannerInicioCollection(order: order_ASC, limit: 20, preview: $preview, locale: $locale)` selecting `title text buttonLabel buttonLink photo { url } credit`. Indent the item fields 8 spaces exactly like `EVENTOS_QUERY`: the parity test's parser depends on it.
- Photo: append `BANNER_PHOTO_PARAMS` with `?` (or `&` when the URL already has a query). Only Contentful photos get it; the shipped paths stay as they are.
- `action` only when the trimmed label is non-empty and `bannerLink(buttonLink)` returns a value.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/lib/bannersContent.test.ts tests/scripts/contentfulProvision.test.ts tests/lib/contentfulSpace.test.ts`
Expected: PASS (the live-space file skipped).

- [ ] **Step 5: Commit**

```bash
git add lib/content/banners.ts tests/lib/bannersContent.test.ts tests/scripts/contentfulProvision.test.ts tests/lib/contentfulSpace.test.ts
git commit -m "feat: read the hero banners from Contentful, with the shipped four as fallback"
```

---

### Task 3: The hero renders the banners; `INICIO_HERO` retires

**Files:**
- Modify: `components/marketing/Hero.tsx`, `app/(marketing)/page.tsx`, `lib/marketing/nav.ts`, `lib/content/site/types.ts`, `lib/content/CLAUDE.md`, `IMAGENS.md`
- Delete: `lib/content/inicio.ts`
- Test: `tests/components/hero.test.ts`, `tests/lib/marketingNav.test.ts`, `tests/scripts/contentfulProvision.test.ts`

**Interfaces:**
- Consumes: `Banner`, `DEFAULT_BANNERS`, `getBanners` (Task 2).
- Produces: `isMarketingRoute(href: string): boolean` in `@/lib/marketing/nav`; `Hero({ banners }: { banners: Banner[] })`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/marketingNav.test.ts`, `'tells the marketing pages from the rest'`: true for `'/'`, `'/?x=1'`, `'/sobre'`, `'/sobre/caatinga'`, `'/glossario'`, `'/comunicacao#eventos'`; false for `'/territorios'`, `'/mapa'`, `'/login'`, `'/sobrexyz'`, `'https://www.gov.br'`.

`tests/components/hero.test.ts`: `render(banners = DEFAULT_BANNERS, locale = 'pt')` passes `{ banners }`; the three existing tests keep their assertions. Add:
- `'renders one card per banner, in order'`: the `<h1>` texts equal `DEFAULT_BANNERS.map((b) => b.title)`.
- `'leaves out the picker, the arrows and the pause toggle for a single banner'`: with `[DEFAULT_BANNERS[0]]`, the markup has no `role="group"`, no `Pausar a troca de fotos`, no `Foto anterior`, no `Próxima foto`.
- `'renders a banner without a button'`: with `[{ ...DEFAULT_BANNERS[0], action: undefined }, DEFAULT_BANNERS[1]]`, the markup lacks `DEFAULT_BANNERS[0].action!.label` and has `DEFAULT_BANNERS[1].action!.label`.
- `'credits the first photo when it has a credit'`: default render contains `Foto: Artur Lourenço`; with both banners' `credit` undefined it contains no `Foto:`.
- `'renders every photo even when two banners share one'`: two banners with the same `photo` give two `<img` in the background.

`tests/scripts/contentfulProvision.test.ts`: drop `'inicioHero'` from `'translates every copy type of the translated pages'`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/components/hero.test.ts tests/lib/marketingNav.test.ts`
Expected: FAIL — `isMarketingRoute` not exported; `Hero` reads `copy`.

- [ ] **Step 3: Implement `isMarketingRoute` in `lib/marketing/nav.ts`**

The path before any `?` or `#` is `/`, or equals or sits under a `HEADER_LINKS` href other than `/`. Comment: those are the routes of the `(marketing)` group, the only ones `next/link` may reach (root `CLAUDE.md`).

- [ ] **Step 4: Rework `components/marketing/Hero.tsx`**

`Hero({ banners }: { banners: Banner[] })` (`import type`). Remove `PHOTOS`, `HeroPhoto`, `HeroCard`, `HeroAction`, `heroCards` and the `INICIO_HERO`/`Copy` imports (their comments moved in Task 2). Every `PHOTOS` use reads `banners`; each card renders `banner.action` as its one button, `next/link` when `isMarketingRoute(href)`, `<a href>` otherwise, and no actions block when there is no action. Keys by index, not by photo. Render the dots group, the pause toggle and both arrows only when `banners.length >= 2`. Rotation, focus hold, pause, live region and credit logic unchanged.

- [ ] **Step 5: Wire the page and retire `INICIO_HERO`**

`app/(marketing)/page.tsx`: add `getBanners(getContentfulClient(), locale)` to the `Promise.all`, drop `hero` from `loadSiteCopy`, render `<Hero banners={banners} />`. Delete `lib/content/inicio.ts`; remove it from `lib/content/site/types.ts`.

- [ ] **Step 6: Update the docs**

- `lib/content/CLAUDE.md`: after "Images, their alt text… stay in the code, and so does the number of cards in each section", add that the hero is the exception: its banners are `bannerInicio` entries (`lib/content/banners.ts`), one per banner, photo included, ordered by `order`, falling back to `DEFAULT_BANNERS`; and that `inicioHero` is no longer read or provisioned but still exists in the space.
- `IMAGENS.md`: in "Fotos de Artur Lourenço" and the "Hero" section, say the hero photos now come from the `bannerInicio` entries in Contentful and `public/images/hero/hero1.jpg`–`hero4.jpg` are only the fallback (`DEFAULT_BANNERS`), and fix the stale "cinco fotos (`hero1-5`)" to four.

- [ ] **Step 7: Run the full checks**

Run: `npm test && npm run lint && npm run build`
Expected: all tests pass (1442 before this branch, plus the new ones), lint clean, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A components/marketing/Hero.tsx 'app/(marketing)/page.tsx' lib/marketing/nav.ts lib/content/site/types.ts lib/content/inicio.ts lib/content/CLAUDE.md IMAGENS.md tests/components/hero.test.ts tests/lib/marketingNav.test.ts tests/scripts/contentfulProvision.test.ts
git commit -m "feat: render the hero from the Contentful banners and retire inicioHero from the code"
```

---

### Task 4: Apply to the Contentful space (run by the session, not a subagent)

Changes the shared space `7nrpxk7di6ee`, environment `master`. **Stop and get the developer's explicit go-ahead before Step 2.**

- [ ] **Step 1: Ask for the go-ahead**, listing exactly what Steps 2–4 create, and whether they have a Content Management token for the script.

- [ ] **Step 2: Create and publish the type.** Copy the main checkout's `.env.local` into the worktree (gitignored by `.env*`). With a token: `CONTENTFUL_MANAGEMENT_TOKEN=… npm run contentful:provision -- --only bannerInicio --apply`. Without one: create it with the Contentful MCP from the output of `toCmaContentType` for `bannerInicio`, publish it, and set its editor interface from `toEditorControl` of its fields.
Expected: `get_content_type bannerInicio` shows the seven fields, published.

- [ ] **Step 3: Upload and publish the four photos** `public/images/hero/hero2.jpg`, `hero3.jpg`, `hero1.jpg`, `hero4.jpg` (MCP `create_upload_session`, `curl -X PUT --data-binary` the bytes, `upload_asset` with the handle, locale `pt-BR`, then publish), titled `Hero · Caatinga 1`…`4` with description `Foto: Artur Lourenço`.

- [ ] **Step 4: Create the four entries as drafts.** Read the latest version of `inicioHero` entry `1C1CnVMzktTISin2OFbHD7` (draft included). Banner N (1–4) takes `fotoNTitulo`, `fotoNTexto`, `fotoNBotao` in `pt-BR` and `en-US` as `title`, `text`, `buttonLabel`; `buttonLink` `/sobre`, `/comunicacao`, `/territorios`, `/mapa`; the Nth photo of Step 3; `credit` `Artur Lourenço`; `order` N. Do not publish them.

- [ ] **Step 5: Verify against the space.** Run `npx vitest run tests/lib/contentfulSpace.test.ts` (expected PASS, including `'serves the banners query'`). Run `CONTENTFUL_PREVIEW=true npm run dev` and `curl -s localhost:3000 | grep -o 'images.ctfassets.net[^"]*fm=webp' | sort -u | wc -l`; expected `4`.

- [ ] **Step 6: Hand over** to the developer: review and publish the four entries (beta reads drafts), deploy to production only after they are published, and decide separately on removing `inicioHero` and its two entries.
