import localFont from 'next/font/local'

// Typeface of the maps module, the login and the report, served from the repo.
// `next/font/google` downloaded it from Google Fonts on each build, so a flaky
// Google response failed the CI and the Docker build with no code change.
//
// The file is the Latin subset Google serves (see `unicode-range` in its CSS),
// which covers Portuguese and is the only subset the old call preloaded: a
// variable font cut to the weights the code uses. The license travels next to
// it (OFL-LibreFranklin.txt). The marketing faces live in `./marketing.ts`, a
// separate module so that neither side's layout preloads the other's files.
export const libreFranklin = localFont({
  src: './LibreFranklin-Variable-latin.woff2',
  weight: '400 800',
  variable: '--font-app',
  display: 'swap',
})
