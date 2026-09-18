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
