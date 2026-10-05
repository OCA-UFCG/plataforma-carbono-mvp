import type { Metadata } from 'next'
import '../globals.css'
import '../territorios.css'
import { archivoNarrow, inter, rubik } from '../fonts/marketing'
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

// The session is checked by the page, not here. Layout and page render in
// parallel and the first redirect thrown wins: measured on 2026-09-16, a
// redirect from this layout always beat the page's and dropped recorte, feicao
// and etapa from the return address. Withholding the children instead turned
// the page's redirect into a 200 carrying it in the RSC payload. The group has
// a single page, and that page redirects before rendering anything.
export default function TerritoriosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${rubik.variable} ${archivoNarrow.variable} ${inter.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
