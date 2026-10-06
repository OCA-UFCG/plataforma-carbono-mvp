import type { Metadata } from 'next'
import '../globals.css'
import '../territorios.css'
import { archivoNarrow, dDin, inter, rubik } from '../fonts/marketing'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { FAVICON } from '@/lib/favicon'

// Fifth sibling root layout. The story scrolls like the landing page and prints
// its summary, so it cannot share (mapa)'s locked viewport; being a sibling
// root, its CSS loads only here.
//
// globals.css comes first so the tokens, type classes and SiteHeader match the
// home by construction; territorios.css then overrides the few base rules the
// story needs otherwise (scroll behavior, body size, link underline).
//
// The font classes go on <html>, not <body> as in the marketing layout:
// territorios.css aliases --font-app and --font-raleway to --font-sans on
// :root, for the map components the story reuses, and a var() on :root only
// resolves if --font-sans is set on that same element.
export const metadata: Metadata = {
  title: 'Territórios | Caativar',
  robots: { index: false, follow: false },
  icons: FAVICON,
}

// Public, like the marketing pages: no session check. Its API routes and the
// story's tiles from /api/gee/tile answer without one (lib/territorios/storyTiles.ts).
export default function TerritoriosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${rubik.variable} ${archivoNarrow.variable} ${inter.variable} ${dDin.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
