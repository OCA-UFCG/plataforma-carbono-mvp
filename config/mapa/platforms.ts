import type { PlatformTheme } from '@/types/mapa'
import { MONTHS } from '@/lib/phenology'
import { mix, readableOn, adjustContrast, luminance } from '@/lib/color'

/**
 * Theme = fixed "mata branca" neutrals (light or dark) plus an accent set.
 * The platform wears the site's brand green (`buildSiteTheme`), the report the
 * OCA olive (`buildReportTheme`).
 *
 * The accent set comes out computed from one base color (see lib/color.ts),
 * not written by hand. It was built for the month accent the platform wore
 * until the redesign, twelve colors in two modes, so the text ink passes
 * 4.5:1 against the card from April's olive green to October's light orange;
 * `npm run contrast` still checks every month, and the flux inks below are
 * still derived against the hardest of them.
 */

// Fixed neutrals, kept in sync with the CSS vars in mapa.css.
const lightNeutrals = {
  bg: '#f7f6f2', mist: '#eceae3', border: '#d8d5cb', bgCard: '#ffffff',
  text: '#26241d', body: '#57544a', textDim: '#6f6c63', dim: '#8a8776', caption: '#95927f',
  chip: '#f2f0e8', glassBg: 'rgba(252,252,247,.96)', glassBd: 'rgba(60,58,48,.14)',
  terracota: '#b5602f', acude: '#4a7fa5',
}
const darkNeutrals = {
  bg: '#16150f', mist: '#201e16', border: '#34322a', bgCard: '#211f18',
  text: '#f2f0e8', body: '#cfccc0', textDim: '#a8a49a', dim: '#9b9788', caption: '#8a8776',
  chip: '#2a281d', glassBg: 'rgba(28,26,18,.94)', glassBd: 'rgba(230,226,210,.12)',
  terracota: '#c8703c', acude: '#6ba3c9',
}

export interface AccentSet {
  accent: string
  accentBg: string
  accentInk: string
  accentBd: string
  accentGrad: string
  onAccent: string
}

/** Derives soft background, border, ink and color over the solid from the month color. */
export function buildAccent(base: string, dark: boolean): AccentSet {
  const card = dark ? darkNeutrals.bgCard : lightNeutrals.bgCard
  // In dark mode the accent itself has to lighten to survive over the card;
  // in light mode the month color already works as a fill and only the ink is adjusted.
  const accent = dark ? adjustContrast(base, card, '#ffffff', 4.5) : base
  const bgMix = dark ? darkNeutrals.bg : '#ffffff'

  return {
    accent,
    accentBg: mix(base, bgMix, dark ? 0.86 : 0.9),
    accentBd: mix(base, bgMix, dark ? 0.7 : 0.74),
    accentInk: dark
      ? mix(base, '#ffffff', 0.55)
      : adjustContrast(base, card, '#16150f', 4.5),
    accentGrad: `linear-gradient(135deg,${base},${mix(base, dark ? '#ffffff' : '#ffffff', 0.3)})`,
    onAccent: readableOn(accent),
  }
}

/**
 * Red for a net carbon source, green for a net sink. Fixed all year: the accent
 * rotates monthly, but the meaning of these two must not.
 *
 * The bases are the endpoints of the `gfw_netflux` palette, so the number in
 * the panel wears the same color as the extreme of the map it was read from.
 */
const FLUX_BASE = { emission: '#b2182b', removal: '#1b7837' }

/**
 * Worst card background of the year, per mode. These inks land on `accentBg`,
 * which is the month color diluted into the surface, so what binds is the
 * hardest of the twelve rather than the plain card: the lightest tint in dark
 * mode, where the ink is light, and the darkest in light mode, where it is
 * dark. Deriving against `bgCard` alone passes in light mode and fails in dark
 * mode for the pale month colors.
 */
function worstAccentBg(dark: boolean): string {
  return MONTHS.map((m) => buildAccent(m.color, dark).accentBg).reduce((worst, bg) =>
    (dark ? luminance(bg) > luminance(worst) : luminance(bg) < luminance(worst)) ? bg : worst,
  )
}

export interface FluxInkSet {
  emissionInk: string
  removalInk:  string
}

/** Derives the two flux inks to 4.5:1 over the worst surface they can land on. */
export function buildFluxInks(dark: boolean): FluxInkSet {
  const bg = worstAccentBg(dark)
  const target = dark ? '#ffffff' : '#16150f'
  return {
    emissionInk: adjustContrast(FLUX_BASE.emission, bg, target, 4.5),
    removalInk:  adjustContrast(FLUX_BASE.removal, bg, target, 4.5),
  }
}

/**
 * The site's brand green, ROLE-MarcaAncora-Padrao (`--role-marca-ancora-padrao`
 * in app/globals.css): the platform's accent since the redesign of Figma
 * section "Plataforma" (19437:60649), which draws the platform in the site's
 * fixed palette, light only, with no month accent.
 */
const SITE_GREEN = '#587c22'

export function buildSiteTheme(): PlatformTheme {
  return {
    id: 'carbono',
    name: 'Caativar',
    fullName: 'Observatório da Caatinga, OCA',
    footer: 'OCA / UFCG-INSA',
    colors: { ...lightNeutrals, ...buildAccent(SITE_GREEN, false), ...buildFluxInks(false) },
  }
}

/**
 * Brand green of the OCA logo, the accent of the printed document.
 *
 * The document does not wear the month accent on purpose: the same report for
 * the same municipality generated in March and in September has to be the same
 * document, not two differently colored pieces in someone's archive. And it is
 * always light mode, because the page is white paper.
 */
const OCA_OLIVE = '#5f7030'

export function buildReportTheme(): PlatformTheme {
  return {
    id: 'carbono-relatorio',
    name: 'Caativar',
    fullName: 'Observatório da Caatinga, OCA',
    footer: 'OCA / UFCG-INSA',
    colors: { ...lightNeutrals, ...buildAccent(OCA_OLIVE, false), ...buildFluxInks(false) },
  }
}
