import localFont from 'next/font/local'

// Typefaces of the marketing pages, served from the repo for the same reason as
// `./app.ts`: `next/font/google` fetched them on each build, and a flaky Google
// response failed the build. Latin subset as Google serves it; licenses in
// OFL-Rubik.txt, OFL-ArchivoNarrow.txt, OFL-Inter.txt and OFL-Archivo.txt.

// Body text. The file is Google's whole variable font (300-900); the declared
// range is the one the code uses, up to Bold 700.
export const rubik = localFont({
  src: './Rubik-Variable-latin.woff2',
  weight: '400 700',
  variable: '--font-sans',
  display: 'swap',
})

// UI labels. The design sets buttons, nav links, tabs, badges and chips in
// Inter, not Rubik (e.g. the nav items of Figma 18862:8515, the tab items
// I18988:8636;6:198, the step tags I18985:7168;135:1174); the .text-ui-*
// utilities in app/globals.css read it through --font-ui.
export const inter = localFont({
  src: './Inter-Variable-latin.woff2',
  weight: '400 700',
  variable: '--font-ui',
  display: 'swap',
})

// The landing's Plataforma tab labels, which the design sets in Archivo
// SemiBold 16 (I18862:8546;18846:7562 and siblings): a static 600 cut, the
// only weight in use. Declared on the marketing <body> only; the territorios
// story has no such tabs. Not preloaded: the layout would otherwise preload it
// on every marketing page, and only the landing draws it, below the fold.
export const archivo = localFont({
  src: './Archivo-SemiBold-latin.woff2',
  weight: '600',
  variable: '--font-archivo',
  display: 'swap',
  preload: false,
})

// Named for its role (a display face for oversized headings) rather than the
// family, so a future face swap only touches this call, not Hero.module.css.
// Its consumers are the hero h1 (Figma node 18862:8525), the landing's
// Comunicação card titles (18846:7821) and the footer wordmark (18862:8253),
// all Bold 700 read off those nodes, which have no bound Figma variable.
export const archivoNarrow = localFont({
  src: './ArchivoNarrow-Bold-latin.woff2',
  weight: '700',
  variable: '--font-display',
  display: 'swap',
})

// The big figures of the Territórios report (Figma 19254:37456, 19254:17340):
// D-DIN Bold, Datto's face under the OFL (OFL-D-DIN.txt). Shipped as Datto's
// own OTF, unconverted and unsubset: the license reserves the name "D-DIN" for
// unmodified files. Declared on the territorios <html> only.
export const dDin = localFont({
  src: './D-DIN-Bold.otf',
  weight: '700',
  variable: '--font-figures',
  display: 'swap',
})
