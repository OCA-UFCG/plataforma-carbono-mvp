import localFont from 'next/font/local'

// Typefaces of the marketing pages, served from the repo for the same reason as
// `./app.ts`: `next/font/google` fetched them on each build, and a flaky Google
// response failed the build. Latin subset as Google serves it; licenses in
// OFL-Rubik.txt and OFL-ArchivoNarrow.txt.

// Body text: a variable font cut to the weights the code uses.
export const rubik = localFont({
  src: './Rubik-Variable-latin.woff2',
  weight: '400 700',
  variable: '--font-sans',
  display: 'swap',
})

// Named for its role (a display face for oversized headings) rather than the
// family, so a future face swap only touches this call, not Hero.module.css.
// Currently the only consumer is the hero h1 (Figma node 18862:8525), which has
// no bound Figma variable and reads weight 700 off that node.
export const archivoNarrow = localFont({
  src: './ArchivoNarrow-Bold-latin.woff2',
  weight: '700',
  variable: '--font-display',
  display: 'swap',
})
