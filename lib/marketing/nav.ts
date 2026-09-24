import { MAPA_URL } from '@/lib/config'

// Navigation shared by the header and the footer of every marketing page. Both
// render on the internal pages too, so internal links are routes, never bare
// "#id" anchors (those only work on the landing). tests/lib/marketingNav.test.ts
// checks that every route has a page file and that SECTION_IDS matches the ids
// the landing's section components actually render.
export type NavLink = {
  href: string
  label: string
  external: boolean
}

// Section ids rendered on the landing, in document order. Typed as a plain
// readonly string[] (not the narrower `as const` tuple) so downstream code can
// call SECTION_IDS.includes(x) with an arbitrary string without a cast.
export const SECTION_IDS: readonly string[] = [
  'inicio',
  'destaques',
  'plataforma',
  'ferramenta',
  'comunicacao',
]

// The map lives in another route group, so it is a full page load, not a <Link>.
export const MAPA_LINK: NavLink = { href: MAPA_URL, label: 'Mapas', external: true }

// Header labels from Figma node 18988:8612. "Sobre a plataforma" replaces the
// landing-era "Conheça a plataforma" now that it opens a page of its own.
export const HEADER_LINKS: NavLink[] = [
  { href: '/', label: 'Início', external: false },
  { href: '/sobre', label: 'Sobre a plataforma', external: false },
  { href: '/comunicacao', label: 'Comunicação', external: false },
]

export const FOOTER_LINKS: NavLink[] = [
  { href: '/', label: 'Home', external: false },
  { href: '/sobre', label: 'Sobre', external: false },
  { href: '/comunicacao', label: 'Comunicação', external: false },
  MAPA_LINK,
]

// The four "Sobre" pages, in the order of their sub-navigation (Figma node
// 18988:8635). Each href must have a page under app/(marketing)/.
export type SobrePage = { slug: string; href: string; label: string }

export const SOBRE_PAGES: SobrePage[] = [
  { slug: 'plataforma', href: '/sobre', label: 'Conheça a plataforma' },
  { slug: 'caatinga', href: '/sobre/caatinga', label: 'Conheça a Caatinga' },
  { slug: 'carbono-e-comunidades', href: '/sobre/carbono-e-comunidades', label: 'Entenda essa relação' },
  { slug: 'como-funciona', href: '/sobre/como-funciona', label: 'Como funciona' },
]

// The header entry to mark active on `pathname`: the one whose route is the
// path itself or a parent of it, so every /sobre/* page lights "Sobre a
// plataforma". "/" only owns itself, or it would own everything.
export function activeNavHref(pathname: string): string | null {
  for (const { href } of HEADER_LINKS) {
    if (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)) {
      return href
    }
  }
  return null
}
