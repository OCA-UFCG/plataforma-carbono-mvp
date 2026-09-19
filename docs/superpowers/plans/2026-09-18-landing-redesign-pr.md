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
4. **"Ver mais" buttons are omitted** throughout — there are no internal pages
   to link to yet.
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
8. The **hero photo credit** never renders, because no photo in the repo
   carries credit data. The Figma's "Foto: [nome da equipe]" is likewise
   placeholder.
9. The **communication cards show their titles twice** — the design mocked
   photographs, but the real content is cartilha and caderno cover art with
   the title already typeset into the image, and the 626×480 centre-crop clips
   it. Either supply photography, or drop the overlay title for items whose
   art carries it.
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

18. The **map image in the "Ferramenta" band is missing**. The Figma export
    could not be fetched (API quota), and the only repo candidate was rejected
    for carrying map-module UI chrome and stale branding. The band renders a
    neutral placeholder driven by a single nullable constant (`MAPA_IMAGEM`) in
    `Ferramenta.tsx`; swapping in the real export is a one-line change.
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
- [ ] Manual browser pass at 1440px / 768px / 390px — not done in this session
      (browser tooling unavailable); needs a separate pass before merge
