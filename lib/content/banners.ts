import 'server-only'

import { localeVariables, type ContentfulVariables } from '@/lib/contentful'
import type { SiteLocale } from '@/lib/locale'
import { MAPA_LINK, TERRITORIOS_LINK } from '@/lib/marketing/nav'
import { bannerLink } from './bannerLink'

// The landing's hero carousel (components/marketing/Hero.tsx): one banner per
// photo, each with its card. Editors publish them in Contentful as
// `bannerInicio` entries, one per banner, ordered by their `order` field
// (lib/content/site/provision.ts). Before 2026-11-23 the hero read a single
// `inicioHero` entry of twelve numbered fields, with the photos, the button
// targets and the count of four fixed in the component; editors found no way
// to "create a banner" there.
//
// Read by a query of its own, as the eventos are: the GraphQL API rejects a
// whole query naming a type the space lacks, and a space not yet provisioned
// with `bannerInicio` must only cost the hero its Contentful banners.

// A banner's one button. Where it leads is checked by bannerLink.
export type BannerAction = { href: string; label: string }

// `photo` is a URL the page loads as is. `credit` is shown as "Foto: <credit>"
// over the photo. `text` keeps its line breaks (components/marketing/Linhas).
export type Banner = {
  title: string
  text: string
  photo: string
  credit?: string
  action?: BannerAction
}

// The four banners the hero shipped with, and what it shows without
// Contentful, with nothing usable published, or through an outage: the h1 and
// lead set like Figma nodes 18862:8525 and 18862:8526, with the copy of the
// content doc's 2026-10-05 meeting (Portuguese only, as every fallback here).
//
// The photos are Artur Lourenço's (Figma node 18862:8516, "Background"; the
// design's own image fill is a single placeholder frame). Their credit is
// mandatory (IMAGENS.md, "Fotos de Artur Lourenço"); the Figma overlay text
// "Foto: [nome da equipe]" is placeholder copy. The file names keep their
// original numbering, so the order here is not theirs.
export const DEFAULT_BANNERS: Banner[] = [
  {
    title: 'Dados abertos e mapas para entender o carbono na Caatinga',
    text: 'Informação aberta para que comunidades e gestores avaliem projetos de carbono e negociem em condições mais justas',
    photo: '/images/hero/hero2.jpg',
    credit: 'Artur Lourenço',
    action: { href: '/sobre', label: 'Sobre a iniciativa' },
  },
  {
    // Spells out the name.
    title: 'Caativar: Caatinga, Valorização, Autonomia e Renda',
    text: 'Informação que valoriza a Caatinga e fortalece autonomia e renda dos territórios',
    photo: '/images/hero/hero3.jpg',
    credit: 'Artur Lourenço',
    action: { href: '/comunicacao', label: 'Acesse os materiais' },
  },
  {
    title: 'Uma forma simplificada de conhecer mais sobre diferentes territórios',
    text: 'Obtenha um panorama resumido com dados sobre carbono, pressões ambientais e clima para o território do seu interesse',
    photo: '/images/hero/hero1.jpg',
    credit: 'Artur Lourenço',
    action: { href: TERRITORIOS_LINK.href, label: 'Acesse o Recorte Territorial' },
  },
  {
    title: 'Em breve: Plataforma de dados ambientais',
    text: 'Uma plataforma que reúne dados de carbono, vegetação, solo e clima para diferentes áreas da Caatinga',
    photo: '/images/hero/hero4.jpg',
    credit: 'Artur Lourenço',
    action: { href: MAPA_LINK.href, label: 'Acesse a plataforma' },
  },
]

// PERF: asks Contentful's Images API for a photo sized for the hero, which
// spans the viewport (the shipped files are 1600×1200). An editor uploading a
// 4000×3000 phone photo would otherwise ship it raw, several MB, on the first
// thing the landing paints.
export const BANNER_PHOTO_PARAMS = 'w=1920&q=75&fm=webp'

// The item fields sit 8 spaces in, like EVENTOS_QUERY's:
// tests/scripts/contentfulProvision.test.ts reads them back at that depth to
// check them against the content type.
export const BANNERS_QUERY = `
  query($preview: Boolean, $locale: String) {
    bannerInicioCollection(order: order_ASC, limit: 20, preview: $preview, locale: $locale) {
      items {
        title
        text
        buttonLabel
        buttonLink
        photo { url }
        credit
      }
    }
  }
`

type GetContent = <T>(query: string, variables?: ContentfulVariables) => Promise<T>

type ContentfulBanners = {
  bannerInicioCollection?: {
    items: Array<{
      title?: string | null
      text?: string | null
      buttonLabel?: string | null
      buttonLink?: string | null
      photo?: { url?: string | null } | null
      credit?: string | null
    } | null>
  } | null
}

function sizedPhoto(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}${BANNER_PHOTO_PARAMS}`
}

// A half-filled button, or a link breaking the rule, costs the banner its
// button, never the banner.
function bannerAction(label?: string | null, link?: string | null): BannerAction | undefined {
  const text = label?.trim()
  const href = bannerLink(link)

  return text && href ? { href, label: text } : undefined
}

function mapBanners(entries: ContentfulBanners): Banner[] {
  return (entries.bannerInicioCollection?.items ?? []).flatMap((item) => {
    const photo = item?.photo?.url

    // An unpublished photo comes back as null (lib/contentful.ts lets the
    // UNRESOLVABLE_LINK through): the banner cannot show without it.
    if (!item?.title || !item.text || !photo) return []

    return [
      {
        title: item.title,
        text: item.text,
        photo: sizedPhoto(photo),
        credit: item.credit || undefined,
        action: bannerAction(item.buttonLabel, item.buttonLink),
      },
    ]
  })
}

// In English, every word of a banner reads in English where Contentful has
// it, and falls back to Portuguese field by field.
export async function getBanners(getContent: GetContent | null, locale: SiteLocale = 'pt'): Promise<Banner[]> {
  if (!getContent) return DEFAULT_BANNERS

  try {
    const banners = mapBanners(await getContent<ContentfulBanners>(BANNERS_QUERY, localeVariables(locale)))

    // A space with no banner published yet still shows the shipped four, as
    // the eventos fall back when none is published.
    return banners.length > 0 ? banners : DEFAULT_BANNERS
  } catch (error) {
    // A CMS outage cannot take the landing down: log it and render what the
    // page ships with.
    console.error('Failed to read the hero banners from Contentful:', error)

    return DEFAULT_BANNERS
  }
}
