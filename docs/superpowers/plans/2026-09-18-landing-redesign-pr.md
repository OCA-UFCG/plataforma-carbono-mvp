# PR: Rebuild the landing page from the Figma design

**Branch:** `feat/landing-redesign` → `main`

## Title

Rebuild the landing page from the Figma design

## Body

### Summary

Rebuilds the marketing landing page (`app/(marketing)/page.tsx`) section by section
against the Figma handoff (file `hzQi2FcgZuGSGSP6NaeLdY`), replacing the old
`globals.css`-driven page with six sections in co-located CSS Modules under
`components/marketing/`: `SiteHeader`, `Hero`, `Destaques`, `Plataforma`,
`Ferramenta`, `Comunicacao`, `SiteFooter`. `app/globals.css` now holds only the
reset, the Figma design-system tokens, the shared type scale and the `.container`
utility — verified with `grep -oE '^\.[a-zA-Z0-9_-]+' app/globals.css`, which
returns exactly `.container .text-body .text-h2 .text-lead .text-p-ui .text-subtle
.text-subtle-semibold` and nothing else. Zero orphan section classes survived,
which is what justified CSS Modules over editing the old stylesheet in place.

Also sweeps `public/images/` for assets the new page no longer references (18
files, listed below) and updates `DOCUMENTACAO.md` (Portuguese, as the rest of
that file) with the new section structure, the CSS Modules rationale, and the
token-to-Figma mapping.

This PR does **not** implement internationalization, does not fabricate missing
content (contact e-mail, photo credits, three of four platform-tab bodies, the
map export), and does not touch anything under `app/(mapa)/`, `app/(auth)/`,
`app/(relatorio)/`, `components/mapa/`, `components/relatorio/`, `app/mapa.css`
or `app/relatorio.css`.

### Decisions the reviewer should confirm

1. **"Entrar" vs the auth gate.** The Figma header has an "Entrar" button, but
   `app/(marketing)/layout.tsx` redirects unauthenticated visitors to `/login`,
   so every viewer is already signed in. The slot ships as **"Sair"**,
   performing both steps of the established sign-out (`DELETE /api/session`,
   then `firebaseSignOut`) before redirecting.
2. The **PT-BR / En** language control is rendered but inert.
   Internationalisation is out of scope.
3. The landing **drops five sections**: `ameacas`, `frentes`, `formacao`,
   `caatinga`/`Sazonalidade`, `faixa-cta`. Their content is parked in
   `lib/content/{dimensoes,ameacas,frentes}.ts`, imported by nothing, for the
   internal pages the menu implies.
4. **"Ver mais" controls are rendered but inert.** They appear at the right of
   the "Conheça a plataforma" and "Comunicação" header rows, 114x40 as in the
   design, but they do not navigate: the internal pages they would open do not
   exist yet. They are `<span>`s carrying `aria-disabled` and a "Disponível em
   breve" title rather than disabled `<button>`s, matching how the header's
   PT-BR/En control handles the same problem — a disabled button announces as a
   broken control, a span announces as unavailable text. Shared as
   `components/marketing/MoreLink.tsx` so giving them a real `href` later is one
   change rather than two. (They were omitted entirely in an earlier revision;
   restored at the reviewer's request.)
5. **Three of the four "Conheça a plataforma" tabs ship empty**
   ("Conteúdo em preparação."). Only "O que é a CaatiVAR?" was designed; no
   copy exists anywhere for the other three and none was invented.

### Content the owner must resolve

6. **A numeric discrepancy:** the highlights card reads **40%** "das remoções
   de gases de efeito estufa do Brasil em 2022", while the previous landing
   said **48%** "da remoção bruta de carbono do país" (now in
   `lib/content/dimensoes.ts`). Both may be right — all greenhouse gases versus
   carbon alone — but nobody has confirmed.
7. **No contact e-mail exists.** The footer's "CONTATO" column ships with a
   label and nothing under it. The Figma's `contato@Caativar.gov.br` is
   placeholder text and `.gov.br` is not this project's domain, so nothing was
   fabricated. A real address is needed.
8. The **hero photo credit** is mandatory per `IMAGENS.md` ("Crédito na
   página: 'Fotos: Artur Lourenço'"). The redesign initially dropped it — no
   photo carried credit data, so the overlay never rendered — and it was
   restored in commit f2521ce, which added `credit: "Artur Lourenço"` to all
   five hero photos. The Figma's "Foto: [nome da equipe]" is still
   placeholder text, not the real copy.
9. ~~The communication cards show their titles twice.~~ **Resolved, but it
   leaves a content-model question open.** The cards were rendering each
   publication's `cover` — which in the content model means the publication's
   **cover art**: portrait, with the title already typeset into it. So every
   title printed twice, and a 0.75 portrait centre-cropped into a 1.30
   landscape card clipped the art.

   Figma nodes `18862:8581` and `18862:8582` turned out to carry real
   photographs as their image fills, so those were exported through Figma's
   REST API, cropped to the card ratio (top-anchored) and converted to WebP:
   940×720 at 206 KB and 960×736 at 132 KB, both within the range of the hero
   photos already in the repository. The caderno node uses `scaleMode: STRETCH`
   in the design, which distorts a portrait inside a landscape frame; cropping
   was used instead, which preserves proportions.

   **The open question:** the photographs live in the repository, in a `FOTOS`
   map in `Comunicacao.tsx`, because the content model has no field for a card
   photograph — only `cover`. That means an editor cannot change them without a
   deploy, and if the featured cartilha changes in Contentful its photograph
   will not follow. The durable fix is a `foto` field on the content type,
   falling back to `cover`; the map is written so it can be deleted when that
   exists.

   **Authorship of these two photographs is not documented** anywhere — not in
   `IMAGENS.md`, not in the Figma file. They were not attributed, to avoid
   crediting the wrong person. If they are Artur Lourenço's, like the five hero
   photos, they carry the same mandatory credit.

   Incidental: `IMAGENS.md` records that the caderno's cover art still reads
   "Boletim temático", the publication's former name. Since the card no longer
   renders that art, the stale label no longer appears on the landing.
10. The **orange leaves the palette**: `--laranja #ce8b44` and its derivatives
    have no counterpart in the new design system.
11. The **seasonal-palette story is gone from the landing**. `Sazonalidade`
    explained that the product's colour identity was measured from a 40-year
    NDFI series rather than chosen; the map module still derives its monthly
    accent from exactly that series, so the platform now uses a palette it no
    longer explains anywhere.

### Problems in the Figma file itself, for whoever maintains it

12. Three **shadcn defaults left in the library** — `var(--card)` #ffffff,
    `var(--foreground)` #292829, `var(--primary-foreground)` #f8f7f8. `#292829`
    is a warm grey contradicting the otherwise cool scale. Not imported; mapped
    to the real tokens instead.
13. The hero's primary button binds its **resting** fill to the role token
    named `ROLE-MarcaAncora-Hover` (node `18862:8529`), leaving no distinct
    token for the hover state. Implemented as designed, with a code comment so
    nobody "corrects" it.
14. The generic **"tab item" component** (node `8702:53247`) belongs to a
    different design system — `slate/*`, `Verde Sudene #018f39`, shadcn
    variables, and no typography variable at all.
15. The **four highlight-card icons are one byte-identical glyph**, faithfully
    mirroring the Figma source. Four different indicators sharing one icon
    differentiate nothing.
16. The **Caativar logo slot is an empty placeholder box**. The header
    currently reuses `logo_oca.png`.
17. A possible **third type family**: the tab labels measure as Archivo
    SemiBold 16px, which is neither Rubik (body) nor Archivo Narrow (display).
    Unresolved — the Figma API quota ran out before it could be confirmed.

### Known technical debt, deliberate and isolated

18. ~~The map image in the "Ferramenta" band is missing.~~ **Resolved.** The
    Figma MCP's plan quota was exhausted, so the export was fetched through
    Figma's REST API instead (node `18862:8548`, PNG at 2x), then converted to
    WebP with Pillow — the same tooling `IMAGENS.md` records for the other
    photos — taking it from 1048 KB to 65 KB with no real transparency to
    preserve. `MAPA_IMAGEM` in `Ferramenta.tsx` now points at
    `/images/ferramenta/mapa-caatinga.webp`; the placeholder branch is kept, as
    it shares the image's aspect ratio and is what renders if the constant is
    ever set back to `null`.

    Wiring the real image exposed a latent layout bug worth noting: an `<img>`
    with `height: 100%` against a parent of indefinite height falls back to
    `auto` and sizes itself from its own intrinsic ratio, which stretched the
    band from 560px to 743px. A `<div>` placeholder never did, having no
    intrinsic ratio. `.image` is now taken out of flow against `.media`'s
    existing `position: relative` (and reset to `static` below 900px, where the
    stacked layout wants the image to size itself), so the band's height stays
    driven by the panel's content.
19. **`.text-lead` (weight 400) is used for the communication card titles**
    because no bound token was reachable and inventing one was forbidden. A
    regular-weight 20px title reads as a caption; the type scale is probably
    missing a card-title token.
20. **CI does not run `npm test` or `npm run lint`** —
    `.github/workflows/ci.yml` runs only `npm ci`, `npm run build` and
    `npm run contrast`. Everything in this branch was verified locally.

### Assets removed

18 unreferenced files under `public/images/` (see the task report for the
full per-file review): the old hero-adjacent banners (`cta_caatinga.jpg`,
`sobre_caatinga.jpg`), the old mosaic gallery (`galeria/cg1-9.jpg`,
`importa/imp1-3.jpg`), the pre-rename preview screenshot
(`plataforma_preview.jpg`, still branded "Carbono Caatinga / OBSERVATÓRIO DA
CAATINGA, OCA"), the old cartilhas banner (`cartilhas/colecao_banner.jpg`) and
two orphaned map-card exports (`cards/produtividade-fluxos.png`,
`cards/biomassa-estrutura.png`). `lib/content/comunicacao.ts`'s
`DEFAULT_FOTOS_FORMACAO` photos under `public/images/formacao/`, and the
`lib/phenology.ts` / `lib/ndfi-series.json` series the map module depends on,
were left untouched.

### Test plan

- [x] `npm test` — 34 files, 329 tests, all passing
- [x] `npm run lint` — exactly the 5 pre-existing map-module problems
      (`components/mapa/MapView.tsx:1152,1154`, `Mapa.tsx:53`,
      `overlays/FloatingSearchBar.tsx:83,165`), out of scope
- [x] `npm run build` — succeeds
- [x] `npm run contrast` — 0 failures below 4.5:1
- [x] Browser verification at a 1905px layout width, in an authenticated
      session, measuring real element geometry rather than eyeballing:
      header, hero, highlights, tabs, map band, communication and footer all
      land their content on one x (314.5), content column exactly 1276.0px,
      no horizontal scroll; hero dots and photo credit align to that column;
      the tab keyboard model (arrows, Home/End with `preventDefault`, roving
      `tabindex`, all four panels mounted so every `aria-controls` resolves,
      no focusable element inside a hidden panel); list semantics on all four
      list-bearing sections; `"Foto: Artur Lourenço"` rendering
- [ ] **Responsive rendering below ~1900px — NOT verified.** Chrome runs under
      Wayland here, where the window cannot be resized programmatically, so
      the 1200px header breakpoint and the 900 / 768 / 640 / 520px section
      breakpoints were reasoned about but never observed. The footer's
      three-column row was cleared analytically (648px required against 741px
      available just above its breakpoint). Needs a manual pass at 1436 /
      1200 / 1024 / 900 / 768 / 640 / 390px before merge
