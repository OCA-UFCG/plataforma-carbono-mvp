# Hero banners editable in Contentful

Date: 2026-11-23. Status: approved in conversation.

## Intent

Editors find it unintuitive to make a banner for the landing's hero carousel in
Contentful. Today there is one `inicioHero` entry ("Início · Hero") with twelve
numbered fields (`foto1Titulo`, `foto2Botao`…), its description says "não crie
outra", and the photos, the button targets and the number of banners (four) are
fixed in `components/marketing/Hero.tsx`. On 2026-11-23 an editor tried the
natural thing, adding a new "Início · Hero" entry, and got an empty second
entry the site ignores.

Goal: a banner is an entry. Creating one is "Add entry → Banner do início",
with its own photo uploaded in Contentful; removing one is unpublishing it;
changing a photo needs no deploy.

## Goals

- One entry per banner, each with its photo, words, optional button and credit.
- Editors add, remove and reorder banners without a code change.
- The page keeps working with no Contentful credentials (the CI build) and
  through a Contentful outage.
- English keeps working as it does for every other localized type.

## Non-goals

- Changing the carousel's behavior or look (rotation, pause, dots, arrows,
  fade, credit line). Only where its data comes from changes.
- Making other sections' images editable.
- Deleting `inicioHero` or the empty entry created on 2026-11-23 (see
  Migration).

## Anti-goals

- A button link an editor can point at `javascript:` or a protocol-relative
  `//host` URL.
- English visitors seeing Portuguese hero copy in production because the new
  entries are not published yet.

## Approaches

1. **One entry per banner, new type (chosen).** Same shape as `evento`,
   `fotoFormacao` and `cartilha` already in `lib/content/site/provision.ts`,
   and as Data Nordeste's `mainBanner`, which the team knows.
2. Add four image fields to `inicioHero`. Smallest change, but keeps the
   numbered fields and the fixed four, which is the complaint.
3. A "Hero" entry holding a reference list of banner entries. Drag-to-reorder
   in Contentful, but every new banner takes two steps (create it, then add it
   to the list).

## Design

**Content type `bannerInicio`, "Banner do início"**, a publication type in
`PUBLICATION_TYPES`, provisioned by `npm run contentful:provision`. Description:
"Um banner do carrossel do topo da página inicial. Para criar outro, adicione
uma entrada deste tipo; para tirar um do ar, despublique a entrada."

| id | Name | Type | Required | Localized |
|---|---|---|---|---|
| `title` | Título | Symbol | yes | yes |
| `text` | Texto | Text | yes | yes |
| `buttonLabel` | Texto do botão | Symbol | no | yes |
| `buttonLink` | Link do botão | Symbol | no | no |
| `photo` | Foto | Link → Asset (image) | yes | no |
| `credit` | Crédito da foto | Symbol | no | no |
| `order` | Ordem | Integer | yes | no |

- `displayField` is `title`, so the entry list reads as the banners' titles.
- Each field gets a Portuguese help text in the editor (what it does, the
  photo's recommended shape, that `order` sorts ascending, that the button shows
  only when both its fields are filled). `ProvisionedField` gains an optional
  help text and `toEditorControl` emits it for publication fields too; `text`
  uses the multi-line widget, since the page keeps its line breaks (`Linhas`).
- `buttonLink` accepts a site path (`/sobre`) or an `https://` URL, enforced by
  a Contentful regexp validation and checked again in code; anything else drops
  the button, not the banner.

**Reading.** A new `lib/content/banners.ts`, modeled on `lib/content/eventos.ts`:
its own query (so a space without the type yet does not break other queries),
`bannerInicioCollection(order: order_ASC, …)` with the page's locale, mapping
that drops an entry missing a required value, and `DEFAULT_BANNERS`: the four
shipped photos with the current shipped copy, links and credit, used when
Contentful is unconfigured, fails, or has no banner published. The landing page
loads it next to the other content and passes the list to `Hero`.

**Hero.** Takes `banners` instead of `copy`; `PHOTOS` and `heroCards` go. An
internal path inside the marketing route group (`/`, `/sobre…`, `/glossario`,
`/comunicacao…`) renders with `next/link`; any other path or URL renders as
`<a href>` (route-group rule in `CLAUDE.md`). Contentful photos are requested
through the Images API at a width that covers the hero (the shipped files are
1600×1200), so an editor uploading a 4000×3000 phone photo does not ship it raw.

**Retired in code:** `INICIO_HERO` leaves `lib/content/inicio.ts` and
`SITE_COPY_TYPES`, so provisioning stops touching `inicioHero`. The type and its
entries stay in the space.

**Docs:** `lib/content/CLAUDE.md` (the hero is now the exception to "images,
links and the number of cards stay in the code") and `IMAGENS.md` (the hero
section, which is also stale: it still says five photos).

## Migration (changes to the shared space, done only after the developer confirms at that step)

1. Create and publish the `bannerInicio` content type.
2. Upload `hero2`, `hero3`, `hero1`, `hero4` as assets.
3. Create four `bannerInicio` entries, `order` 1–4 in that sequence, from the
   latest (draft) values of the existing `inicioHero` entry in `pt-BR` and
   `en-US`, links `/sobre`, `/comunicacao`, `/territorios`, `/mapa`, credit
   "Artur Lourenço". Left as drafts for the developer to review on beta (which
   reads the preview API) and publish.
4. Production deploy only after they are published, or English visitors fall
   back to the Portuguese shipped copy.
5. Removing `inicioHero` and its two entries is proposed separately, once the
   banners are live.

## Left to the builder

Exact help texts, the Images API parameters, the query limit, and the tests
(provision/query field parity in `tests/scripts/contentfulProvision.test.ts`,
mapping and fallback like `tests/lib/eventosContent.test.ts`, the live-space
smoke test, and `tests/components/hero.test.ts` against `DEFAULT_BANNERS`).
